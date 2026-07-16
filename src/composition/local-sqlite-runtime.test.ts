import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import type {
  ExtensiaModule,
  ResourceSnapshot,
  ResourceWriteSuccess,
} from "../public/contracts.js";
import { createExtensia } from "../public/extensia.js";
import { defineFullResourceDriver } from "../public/full-resource-driver.js";
import {
  createDeterministicFullResourceDriver,
  type DeterministicFullDriverFixture,
} from "../storage/deterministic-full-resource-driver.js";
import {
  createLocalSqliteFullResourceDriver,
  inspectLocalSqliteProfile,
  type LocalSqliteDriverOptions,
} from "../storage/local-sqlite-resource-driver.js";
import type { CommittedOperationEntry } from "../storage/resource-write-protocol.js";
import { createLocalSqliteExtensia } from "./local-sqlite-runtime.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

function createRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "extensia-parity-"));
  roots.push(root);
  return root;
}

function sqliteOptions(
  rootPath: string,
  overrides: Partial<LocalSqliteDriverOptions> = {},
): LocalSqliteDriverOptions {
  return {
    profile: "candidate-local-filesystem",
    reconciliationDelayMs: 1,
    rootPath,
    timeoutMs: 100,
    ...overrides,
  };
}

function mustWrite(
  result:
    | { readonly ok: true; readonly value: ResourceWriteSuccess }
    | { readonly ok: false; readonly error: { readonly code: string } },
): ResourceWriteSuccess {
  if (!result.ok)
    throw new Error(`Resource write failed: ${result.error.code}`);
  expect(result.value.committed).toBe(true);
  expect(result.value.warnings).toEqual([]);
  return result.value;
}

interface ScenarioIds {
  readonly parent: string;
  readonly first: string;
  readonly second: string;
}

async function runAcceptedResourceScenario(
  extensia: ExtensiaModule,
): Promise<ScenarioIds> {
  await expect(extensia.start()).resolves.toEqual({
    ok: true,
    value: undefined,
  });
  const storage = extensia.storage()!;
  const parent = mustWrite(
    await storage.createResource({ title: "parent", description: "initial" }),
  );
  const first = mustWrite(await storage.createResource({ title: "first" }));
  const second = mustWrite(await storage.createResource({ title: "second" }));
  const ids: ScenarioIds = {
    first: first.resource.data.id,
    parent: parent.resource.data.id,
    second: second.resource.data.id,
  };

  mustWrite(
    await storage.updateResource(ids.parent, {
      description: "updated",
      title: "parent-updated",
    }),
  );
  mustWrite(
    await storage.moveResource(ids.first, {
      order_index: 0,
      parent_id: ids.parent,
    }),
  );
  mustWrite(
    await storage.moveResource(ids.second, {
      order_index: 0,
      parent_id: ids.parent,
    }),
  );
  mustWrite(
    await storage.setMarks(ids.first, [
      { name: "alpha", type: "kind", value: 1 },
      { name: "beta", type: "kind", value: 2 },
    ]),
  );
  mustWrite(
    await storage.setMarks(ids.first, [
      { name: "beta", type: "kind", value: 3 },
    ]),
  );
  mustWrite(await storage.setKV(ids.first, "app", { a: "1", b: "old" }));
  mustWrite(await storage.setKV(ids.first, "app", { b: "new" }));
  const deleted = mustWrite(await storage.deleteResource(ids.second));
  expect(deleted.resource.data).toMatchObject({
    is_deleted: true,
    order_index: 0,
    parent_id: ids.parent,
  });

  await expect(
    extensia.query()!.getResourceTree(ids.parent),
  ).resolves.toMatchObject({
    ok: true,
    value: {
      children: [{ id: ids.first, order_index: 0 }],
      resource: {
        data: { description: "updated", title: "parent-updated" },
      },
    },
  });
  await expect(
    extensia.query()!.getResource(ids.second),
  ).resolves.toMatchObject({
    error: { code: "RESOURCE_NOT_FOUND" },
    ok: false,
  });
  await expect(extensia.stop()).resolves.toEqual({
    ok: true,
    value: undefined,
  });
  return ids;
}

interface DurableState {
  readonly resources: readonly ResourceSnapshot[];
  readonly journal: readonly CommittedOperationEntry[];
}

async function inspectSqlite(rootPath: string): Promise<DurableState> {
  const adapter = createLocalSqliteFullResourceDriver(sqliteOptions(rootPath));
  await adapter.open();
  const session = await adapter.acquireStorageSession();
  const resources: ResourceSnapshot[] = [];
  const journal: CommittedOperationEntry[] = [];
  for await (const resource of session.listResources())
    resources.push(resource);
  for await (const entry of session.readCommittedOperationsAfter(null)) {
    journal.push(entry);
  }
  await session.release();
  await adapter.close();
  return { journal, resources };
}

function normalizeState(state: DurableState, ids: ScenarioIds): unknown {
  const labelById = new Map<string, keyof ScenarioIds>(
    Object.entries(ids).map(([label, id]) => [id, label as keyof ScenarioIds]),
  );
  return {
    journal: state.journal.map((entry) => ({
      affected: entry.affected_resources.map((id) => labelById.get(id)).sort(),
      changes: entry.changes
        .map((change) => labelById.get(change.resource_id))
        .sort(),
      sequence: entry.sequence,
      type: entry.type,
    })),
    resources: state.resources
      .map((resource) => ({
        assets: resource.assets,
        description: resource.data.description,
        hidden: resource.data.hidden,
        is_deleted: resource.data.is_deleted,
        kv: resource.kv,
        label: labelById.get(resource.data.id),
        locked: resource.data.locked,
        marks: resource.marks,
        order_index: resource.data.order_index,
        parent:
          resource.data.parent_id === null
            ? null
            : labelById.get(resource.data.parent_id),
        title: resource.data.title,
      }))
      .sort((left, right) =>
        String(left.label).localeCompare(String(right.label)),
      ),
  };
}

function filesystemDigest(rootPath: string): string {
  const hash = createHash("sha256");
  for (const name of readdirSync(rootPath).sort()) {
    const path = join(rootPath, name);
    const stats = statSync(path);
    hash.update(name);
    hash.update(String(stats.size));
    if (stats.isFile()) hash.update(readFileSync(path));
  }
  return hash.digest("hex");
}

describe("internal local SQLite production composition", () => {
  it("matches the accepted fake oracle for the complete Resource lifecycle", async () => {
    const fake: DeterministicFullDriverFixture =
      createDeterministicFullResourceDriver();
    const fakeModule = createExtensia({
      storage: { driver: defineFullResourceDriver(fake.adapter) },
    });
    const fakeIds = await runAcceptedResourceScenario(fakeModule);
    const fakeState = fake.inspect();

    const root = createRoot();
    const sqliteModule = createLocalSqliteExtensia({
      mode: "full",
      storage: sqliteOptions(root),
    });
    const sqliteIds = await runAcceptedResourceScenario(sqliteModule);
    const sqliteState = await inspectSqlite(root);

    expect(normalizeState(sqliteState, sqliteIds)).toEqual(
      normalizeState(fakeState, fakeIds),
    );
    expect(sqliteState.journal.map((entry) => entry.sequence)).toEqual(
      Array.from({ length: 11 }, (_, index) => String(index + 1)),
    );
    expect(sqliteState.journal.map((entry) => entry.type)).toEqual([
      "resource.create",
      "resource.create",
      "resource.create",
      "resource.update",
      "resource.move",
      "resource.move",
      "resource.marks.set",
      "resource.marks.set",
      "resource.kv.set",
      "resource.kv.set",
      "resource.delete",
    ]);
  });

  it("reopens readonly without inspecting writes or changing filesystem state", async () => {
    const root = createRoot();
    const full = createLocalSqliteExtensia({
      mode: "full",
      storage: sqliteOptions(root),
    });
    await full.start();
    const created = mustWrite(
      await full.storage()!.createResource({ title: "readonly-durable" }),
    );
    await full.stop();
    const before = filesystemDigest(root);

    const readonly = createLocalSqliteExtensia({
      mode: "readonly",
      storage: sqliteOptions(root),
    });
    await expect(readonly.start()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await expect(
      readonly.query()!.getResource(created.resource.data.id),
    ).resolves.toMatchObject({
      ok: true,
      value: { data: { title: "readonly-durable" } },
    });
    const hostile = new Proxy(
      {},
      {
        get() {
          throw new Error("readonly input was inspected");
        },
        ownKeys() {
          throw new Error("readonly input was inspected");
        },
      },
    );
    await expect(
      readonly.storage()!.createResource(hostile as { title: string }),
    ).resolves.toMatchObject({
      error: { code: "STORAGE_READONLY" },
      ok: false,
    });
    await readonly.stop();
    expect(filesystemDigest(root)).toBe(before);
  });

  it("reconciles an after-COMMIT receipt fault through the shared Core path", async () => {
    const root = createRoot();
    let pending = true;
    const extensia = createLocalSqliteExtensia({
      mode: "full",
      storage: sqliteOptions(root, {
        faults: {
          hit(point) {
            if (point === "transaction.after-commit" && pending) {
              pending = false;
              throw new Error("receipt unavailable");
            }
          },
        },
      }),
    });
    await extensia.start();
    const created = mustWrite(
      await extensia.storage()!.createResource({ title: "reconciled" }),
    );
    await expect(
      extensia.query()!.getResource(created.resource.data.id),
    ).resolves.toMatchObject({
      ok: true,
      value: { data: { title: "reconciled" } },
    });
    await extensia.stop();
    const state = await inspectSqlite(root);
    expect(state.journal).toHaveLength(1);
    expect(state.resources).toHaveLength(1);
  });

  it("proves a pre-COMMIT cut-point absent without partial index publication", async () => {
    const root = createRoot();
    let pending = true;
    const extensia = createLocalSqliteExtensia({
      mode: "full",
      storage: sqliteOptions(root, {
        faults: {
          hit(point) {
            if (point === "transaction.after-journal-write" && pending) {
              pending = false;
              throw new Error("pre-commit cut point");
            }
          },
        },
      }),
    });
    await extensia.start();
    await expect(
      extensia.storage()!.createResource({ title: "not-committed" }),
    ).resolves.toMatchObject({
      error: { code: "STORAGE_WRITE_FAILED" },
      ok: false,
    });
    expect(extensia.inspect()).toMatchObject({ ready: true, state: "started" });
    await extensia.stop();
    const state = await inspectSqlite(root);
    expect(state.journal).toEqual([]);
    expect(state.resources).toEqual([]);
  });

  it("fails the ready runtime closed on concrete Resource/journal corruption", async () => {
    const root = createRoot();
    const extensia = createLocalSqliteExtensia({
      mode: "full",
      storage: sqliteOptions(root),
    });
    await extensia.start();
    const created = mustWrite(
      await extensia.storage()!.createResource({ title: "integrity-target" }),
    );
    const before = await inspectSqlite(root);

    const db = new DatabaseSync(inspectLocalSqliteProfile(root).databasePath);
    db.prepare("DELETE FROM resources WHERE id = ?").run(
      created.resource.data.id,
    );
    db.close();

    await expect(
      extensia
        .storage()!
        .updateResource(created.resource.data.id, { title: "must-not-write" }),
    ).resolves.toMatchObject({
      error: { code: "STORAGE_INTEGRITY_FAILED" },
      ok: false,
    });
    expect(extensia.getState()).toBe("failed");
    expect(extensia.query()).toBeNull();
    expect(extensia.storage()).toBeNull();
    const raw = new DatabaseSync(inspectLocalSqliteProfile(root).databasePath, {
      readOnly: true,
    });
    expect(raw.prepare("SELECT count(*) AS count FROM journal").get()).toEqual({
      count: before.journal.length,
    });
    expect(
      raw
        .prepare("SELECT count(*) AS count FROM resources WHERE id = ?")
        .get(created.resource.data.id),
    ).toEqual({ count: 0 });
    raw.close();
    await extensia.stop();
  });
});
