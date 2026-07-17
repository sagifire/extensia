import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import type { IDString } from "../domain/scalars.js";
import type { ExtensiaModule } from "../public/contracts.js";
import {
  createExtensia,
  resolveInternalAssetUploadPort,
} from "../public/extensia.js";
import { defineFullResourceDriver } from "../public/full-resource-driver.js";
import {
  createDeterministicFullDriverBacking,
  createDeterministicFullResourceDriver,
  type DeterministicFullDriverBacking,
  type DeterministicFullDriverFixture,
} from "../storage/deterministic-full-resource-driver.js";
import type { FullResourceDriverAdapter } from "../storage/full-resource-driver-adapter.js";
import {
  createLocalSqliteFullResourceDriver,
  inspectLocalSqliteProfile,
  type LocalSqliteFaultPoint,
} from "../storage/local-sqlite-resource-driver.js";
import { ASSET_UPLOAD_MAX_BYTES } from "../storage/asset-upload-capability.js";
import type { CoreAssetUploadPort } from "../system-extensions/default-api/asset-upload-port.js";

const roots: string[] = [];

async function waitForMarker(
  child: ChildProcess,
  markerPath: string,
): Promise<void> {
  let stderr = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk: string) => {
    stderr += chunk;
  });
  const deadline = Date.now() + 15_000;
  while (!existsSync(markerPath)) {
    if (child.exitCode !== null) {
      throw new Error(
        `Asset crash child exited before cut point (${child.exitCode}): ${stderr}`,
      );
    }
    if (Date.now() >= deadline) {
      child.kill();
      throw new Error(`Timed out waiting for Asset crash child: ${stderr}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

function moduleFor(adapter: FullResourceDriverAdapter): ExtensiaModule {
  return createExtensia({
    storage: { driver: defineFullResourceDriver(adapter) },
  });
}

async function start(module: ExtensiaModule): Promise<CoreAssetUploadPort> {
  await expect(module.start()).resolves.toEqual({
    ok: true,
    value: undefined,
  });
  const port = resolveInternalAssetUploadPort(module);
  if (port === null) throw new Error("Internal Asset upload port is missing");
  return port;
}

async function createInitialUpload(module: ExtensiaModule): Promise<{
  readonly resourceId: IDString;
  readonly assetId: IDString;
}> {
  const storage = module.storage()!;
  const resource = await storage.createResource({ title: "owner" });
  if (!resource.ok) throw new Error(resource.error.code);
  const asset = await storage.createAsset(resource.value.resource.data.id, {
    data: null,
    derived_from: null,
    extension: "bin",
    is_primary: false,
    kind: "internal",
    mime: "application/octet-stream",
    role: "original",
    type: "binary",
  });
  if (!asset.ok || asset.value.asset === null) {
    throw new Error(asset.ok ? "Asset is missing" : asset.error.code);
  }
  return {
    assetId: asset.value.asset.id,
    resourceId: resource.value.resource.data.id,
  };
}

interface Harness {
  create(): {
    readonly fixture: DeterministicFullDriverFixture | null;
    readonly module: ExtensiaModule;
  };
}

function deterministicHarness(): Harness {
  const backing: DeterministicFullDriverBacking =
    createDeterministicFullDriverBacking();
  return {
    create() {
      const fixture = createDeterministicFullResourceDriver(backing);
      return { fixture, module: moduleFor(fixture.adapter) };
    },
  };
}

function sqliteHarness(): Harness {
  const rootPath = mkdtempSync(join(tmpdir(), "extensia-upload-"));
  roots.push(rootPath);
  return {
    create() {
      return {
        fixture: null,
        module: moduleFor(
          createLocalSqliteFullResourceDriver({
            profile: "candidate-local-filesystem",
            reconciliationDelayMs: 1,
            rootPath,
            timeoutMs: 100,
          }),
        ),
      };
    },
  };
}

describe.each([
  ["deterministic", deterministicHarness],
  ["local-sqlite-v1", sqliteHarness],
] as const)("internal Asset upload lifecycle on %s", (_name, makeHarness) => {
  it("publishes initial bytes, preserves last-ready replacement and survives restart", async () => {
    const harness = makeHarness();
    let active = harness.create();
    let port = await start(active.module);
    const ids = await createInitialUpload(active.module);
    const resolved = await port.resolve(ids.resourceId, ids.assetId);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const initialHandle = resolved.value;
    expect(Object.keys(initialHandle)).toEqual([]);
    expect(JSON.stringify(initialHandle)).toBe("{}");

    await expect(port.read(ids.resourceId, ids.assetId)).resolves.toEqual({
      error: { code: "ASSET_FILE_NOT_READY" },
      ok: false,
    });
    await expect(port.finish(initialHandle)).resolves.toEqual({
      error: { code: "ASSET_UPLOAD_INCOMPLETE" },
      ok: false,
    });

    const initialBytes = new Uint8Array([1, 2, 3, 4]);
    const staged = await port.stage(initialHandle, initialBytes);
    expect(staged).toMatchObject({
      ok: true,
      value: { byte_length: 4, handle: initialHandle },
    });
    initialBytes[0] = 99;
    const finished = await port.finish(initialHandle);
    expect(finished).toMatchObject({
      ok: true,
      value: {
        asset: { is_on_uploading: false },
        warnings: [],
      },
    });
    const firstRead = await port.read(ids.resourceId, ids.assetId);
    expect(firstRead.ok && [...firstRead.value.bytes]).toEqual([1, 2, 3, 4]);
    if (firstRead.ok) firstRead.value.bytes[0] = 88;
    const detachedRead = await port.read(ids.resourceId, ids.assetId);
    expect(detachedRead.ok && [...detachedRead.value.bytes]).toEqual([
      1, 2, 3, 4,
    ]);

    const replacement = await port.begin(ids.resourceId, ids.assetId);
    expect(replacement.ok).toBe(true);
    if (!replacement.ok) return;
    const replacementHandle = replacement.value.handle;
    await expect(port.begin(ids.resourceId, ids.assetId)).resolves.toEqual({
      error: { code: "ASSET_UPLOAD_ALREADY_ACTIVE" },
      ok: false,
    });
    await expect(
      port.stage(replacementHandle, new Uint8Array([5, 6])),
    ).resolves.toMatchObject({
      ok: true,
      value: { byte_length: 2 },
    });
    const duringReplacement = await port.read(ids.resourceId, ids.assetId);
    expect(duringReplacement.ok && [...duringReplacement.value.bytes]).toEqual([
      1, 2, 3, 4,
    ]);
    await expect(port.abort(replacementHandle)).resolves.toMatchObject({
      ok: true,
      value: { asset: { is_on_uploading: false } },
    });
    await expect(port.abort(replacementHandle)).resolves.toEqual({
      error: { code: "ASSET_UPLOAD_NOT_ACTIVE" },
      ok: false,
    });
    const afterAbort = await port.read(ids.resourceId, ids.assetId);
    expect(afterAbort.ok && [...afterAbort.value.bytes]).toEqual([1, 2, 3, 4]);

    const replacementTwo = await port.begin(ids.resourceId, ids.assetId);
    if (!replacementTwo.ok) throw new Error(replacementTwo.error.code);
    await port.stage(replacementTwo.value.handle, new Uint8Array([7, 8, 9]));
    await expect(
      port.finish(replacementTwo.value.handle),
    ).resolves.toMatchObject({
      ok: true,
      value: { asset: { is_on_uploading: false } },
    });
    await expect(port.finish(replacementTwo.value.handle)).resolves.toEqual({
      error: { code: "ASSET_UPLOAD_NOT_ACTIVE" },
      ok: false,
    });
    await expect(
      port.stage(replacementTwo.value.handle, new Uint8Array([10])),
    ).resolves.toEqual({
      error: { code: "ASSET_UPLOAD_NOT_ACTIVE" },
      ok: false,
    });

    if (active.fixture !== null) {
      expect(
        active.fixture
          .inspect()
          .journal.slice(-5)
          .map((entry) => entry.type),
      ).toEqual([
        "asset.upload.finish",
        "asset.upload.begin",
        "asset.upload.abort",
        "asset.upload.begin",
        "asset.upload.finish",
      ]);
      expect(active.fixture.inspect().asset_payload_ids).toEqual([ids.assetId]);
    }
    await active.module.stop();

    active = harness.create();
    port = await start(active.module);
    const afterRestart = await port.read(ids.resourceId, ids.assetId);
    expect(afterRestart.ok && [...afterRestart.value.bytes]).toEqual([7, 8, 9]);
    await active.module.stop();
  });

  it("discards a staged initial generation without visible or durable residue", async () => {
    const harness = makeHarness();
    const active = harness.create();
    const port = await start(active.module);
    const ids = await createInitialUpload(active.module);
    const resolved = await port.resolve(ids.resourceId, ids.assetId);
    if (!resolved.ok) throw new Error(resolved.error.code);
    await port.stage(resolved.value, new Uint8Array([1, 2, 3]));
    await expect(port.abort(resolved.value)).resolves.toMatchObject({
      ok: true,
      value: { asset: null },
    });
    await expect(port.resolve(ids.resourceId, ids.assetId)).resolves.toEqual({
      error: { code: "ASSET_NOT_FOUND" },
      ok: false,
    });
    await expect(
      active.module.query()?.getResource(ids.resourceId),
    ).resolves.toMatchObject({
      ok: true,
      value: { assets: [] },
    });
    if (active.fixture !== null) {
      expect(active.fixture.inspect().asset_payload_ids).toEqual([]);
      expect(active.fixture.inspect().asset_payload_states).toEqual([]);
    }
    await active.module.stop();
  });
});

describe("deterministic upload crash recovery", () => {
  it("rolls back a crash before finish durability and permits a fresh retry", async () => {
    const backing = createDeterministicFullDriverBacking();
    const crashed = createDeterministicFullResourceDriver(backing);
    const first = moduleFor(crashed.adapter);
    const firstPort = await start(first);
    const ids = await createInitialUpload(first);
    const resolved = await firstPort.resolve(ids.resourceId, ids.assetId);
    if (!resolved.ok) throw new Error(resolved.error.code);
    await firstPort.stage(resolved.value, new Uint8Array([11, 12]));
    crashed.crashNext("transaction.commit.before");
    await expect(firstPort.finish(resolved.value)).resolves.toEqual({
      error: { code: "STORAGE_WRITE_FAILED" },
      ok: false,
    });

    const recovered = createDeterministicFullResourceDriver(backing);
    const second = moduleFor(recovered.adapter);
    const secondPort = await start(second);
    await expect(
      secondPort.stage(resolved.value, new Uint8Array([99])),
    ).resolves.toEqual({
      error: { code: "ASSET_UPLOAD_NOT_ACTIVE" },
      ok: false,
    });
    await expect(secondPort.finish(resolved.value)).resolves.toEqual({
      error: { code: "ASSET_UPLOAD_NOT_ACTIVE" },
      ok: false,
    });
    await expect(secondPort.abort(resolved.value)).resolves.toEqual({
      error: { code: "ASSET_UPLOAD_NOT_ACTIVE" },
      ok: false,
    });
    await expect(secondPort.read(ids.resourceId, ids.assetId)).resolves.toEqual(
      {
        error: { code: "ASSET_FILE_NOT_READY" },
        ok: false,
      },
    );
    const recoveredHandle = await secondPort.resolve(
      ids.resourceId,
      ids.assetId,
    );
    expect(recoveredHandle).toMatchObject({ ok: true });
    if (!recoveredHandle.ok) throw new Error(recoveredHandle.error.code);
    expect(recoveredHandle.value.upload_id).toBe(resolved.value.upload_id);
    await expect(
      secondPort.finish(recoveredHandle.value),
    ).resolves.toMatchObject({
      ok: true,
    });
    const read = await secondPort.read(ids.resourceId, ids.assetId);
    expect(read.ok && [...read.value.bytes]).toEqual([11, 12]);
    await second.stop();
  });

  it("reconciles a crash after finish durability without duplicate settlement", async () => {
    const backing = createDeterministicFullDriverBacking();
    const crashed = createDeterministicFullResourceDriver(backing);
    const first = moduleFor(crashed.adapter);
    const firstPort = await start(first);
    const ids = await createInitialUpload(first);
    const resolved = await firstPort.resolve(ids.resourceId, ids.assetId);
    if (!resolved.ok) throw new Error(resolved.error.code);
    await firstPort.stage(resolved.value, new Uint8Array([21, 22, 23]));
    crashed.crashNext("transaction.commit.after-durable");
    await expect(firstPort.finish(resolved.value)).resolves.toEqual({
      error: { code: "STORAGE_WRITE_FAILED" },
      ok: false,
    });

    const recovered = createDeterministicFullResourceDriver(backing);
    const second = moduleFor(recovered.adapter);
    const secondPort = await start(second);
    const read = await secondPort.read(ids.resourceId, ids.assetId);
    expect(read.ok && [...read.value.bytes]).toEqual([21, 22, 23]);
    expect(
      recovered
        .inspect()
        .journal.filter((entry) => entry.type === "asset.upload.finish"),
    ).toHaveLength(1);
    await expect(secondPort.finish(resolved.value)).resolves.toEqual({
      error: { code: "ASSET_UPLOAD_NOT_ACTIVE" },
      ok: false,
    });
    await second.stop();
  });

  it("reports post-commit cleanup failure without losing the settled payload", async () => {
    const backing = createDeterministicFullDriverBacking();
    const fixture = createDeterministicFullResourceDriver(backing);
    const first = moduleFor(fixture.adapter);
    const port = await start(first);
    const ids = await createInitialUpload(first);
    const resolved = await port.resolve(ids.resourceId, ids.assetId);
    if (!resolved.ok) throw new Error(resolved.error.code);
    await port.stage(resolved.value, new Uint8Array([31, 32]));
    fixture.failNext("session.release");
    await expect(port.finish(resolved.value)).resolves.toMatchObject({
      ok: true,
      value: { warnings: ["POST_COMMIT_CLEANUP_FAILED"] },
    });

    const recovered = createDeterministicFullResourceDriver(backing);
    const second = moduleFor(recovered.adapter);
    const secondPort = await start(second);
    const read = await secondPort.read(ids.resourceId, ids.assetId);
    expect(read.ok && [...read.value.bytes]).toEqual([31, 32]);
    await second.stop();
  });
});

describe("local SQLite upload failures and integrity", () => {
  function localWithFaults(faults: Set<LocalSqliteFaultPoint>): {
    readonly module: ExtensiaModule;
    readonly rootPath: string;
  } {
    const rootPath = mkdtempSync(join(tmpdir(), "extensia-upload-fault-"));
    roots.push(rootPath);
    return {
      module: moduleFor(
        createLocalSqliteFullResourceDriver({
          faults: {
            hit(point) {
              if (faults.delete(point)) throw new Error(`fault:${point}`);
            },
          },
          profile: "candidate-local-filesystem",
          reconciliationDelayMs: 1,
          rootPath,
          timeoutMs: 100,
        }),
      ),
      rootPath,
    };
  }

  async function killAtAssetAction(input: {
    readonly action: "delete" | "finish";
    readonly assetId: IDString;
    readonly markerLabel: string;
    readonly mode: "after" | "before";
    readonly resourceId: IDString;
    readonly rootPath: string;
  }): Promise<void> {
    const markerPath = join(
      input.rootPath,
      `crash-${input.markerLabel}-${input.mode}.marker`,
    );
    const child = spawn(
      process.execPath,
      [
        join(process.cwd(), "node_modules", "vitest", "vitest.mjs"),
        "run",
        "--coverage.enabled=false",
        "--pool=threads",
        "--maxWorkers=1",
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          EXTENSIA_ASSET_UPLOAD_ACTION: input.action,
          EXTENSIA_ASSET_UPLOAD_ASSET: input.assetId,
          EXTENSIA_ASSET_UPLOAD_CRASH_CHILD: "1",
          EXTENSIA_ASSET_UPLOAD_MARKER: markerPath,
          EXTENSIA_ASSET_UPLOAD_MODE: input.mode,
          EXTENSIA_ASSET_UPLOAD_RESOURCE: input.resourceId,
          EXTENSIA_ASSET_UPLOAD_ROOT: input.rootPath,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    await waitForMarker(child, markerPath);
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }

  it.each([
    "asset-upload.stage.before-write",
    "asset-upload.stage.after-write",
  ] as const)("rolls back invisible staging at %s", async (point) => {
    const active = localWithFaults(new Set([point]));
    const port = await start(active.module);
    const ids = await createInitialUpload(active.module);
    const resolved = await port.resolve(ids.resourceId, ids.assetId);
    if (!resolved.ok) throw new Error(resolved.error.code);
    await expect(
      port.stage(resolved.value, new Uint8Array([1])),
    ).resolves.toEqual({
      error: { code: "STORAGE_WRITE_FAILED" },
      ok: false,
    });
    await expect(port.finish(resolved.value)).resolves.toEqual({
      error: { code: "ASSET_UPLOAD_INCOMPLETE" },
      ok: false,
    });
    await expect(
      port.stage(resolved.value, new Uint8Array([2])),
    ).resolves.toMatchObject({
      ok: true,
    });
    await expect(port.finish(resolved.value)).resolves.toMatchObject({
      ok: true,
    });
    await active.module.stop();
  });

  it("keeps after-stage-COMMIT loss retry-safe and finishable", async () => {
    const active = localWithFaults(
      new Set(["asset-upload.stage.after-commit"]),
    );
    const port = await start(active.module);
    const ids = await createInitialUpload(active.module);
    const resolved = await port.resolve(ids.resourceId, ids.assetId);
    if (!resolved.ok) throw new Error(resolved.error.code);
    await expect(
      port.stage(resolved.value, new Uint8Array([3, 4])),
    ).resolves.toEqual({
      error: { code: "STORAGE_WRITE_FAILED" },
      ok: false,
    });
    await expect(port.finish(resolved.value)).resolves.toMatchObject({
      ok: true,
    });
    const read = await port.read(ids.resourceId, ids.assetId);
    expect(read.ok && [...read.value.bytes]).toEqual([3, 4]);
    await active.module.stop();
  });

  it("rolls back finish before COMMIT and preserves the active generation", async () => {
    const faults = new Set<LocalSqliteFaultPoint>();
    const active = localWithFaults(faults);
    const port = await start(active.module);
    const ids = await createInitialUpload(active.module);
    const resolved = await port.resolve(ids.resourceId, ids.assetId);
    if (!resolved.ok) throw new Error(resolved.error.code);
    await port.stage(resolved.value, new Uint8Array([5]));
    faults.add("transaction.before-commit");
    await expect(port.finish(resolved.value)).resolves.toEqual({
      error: { code: "STORAGE_WRITE_FAILED" },
      ok: false,
    });
    await expect(
      port.resolve(ids.resourceId, ids.assetId),
    ).resolves.toMatchObject({
      ok: true,
      value: { upload_id: resolved.value.upload_id },
    });
    await expect(port.finish(resolved.value)).resolves.toMatchObject({
      ok: true,
    });
    await active.module.stop();
  });

  describe.each([
    "initial-publish",
    "replacement-publish",
    "ready-delete",
    "replacement-delete",
  ] as const)("compound action cut-point matrix: %s", (scenario) => {
    it.each([
      {
        committed: false,
        point: "transaction.after-journal-write" as const,
      },
      { committed: true, point: "transaction.after-commit" as const },
    ])("restarts coherently at $point", async ({ committed, point }) => {
      const rootPath = mkdtempSync(join(tmpdir(), "extensia-upload-compound-"));
      roots.push(rootPath);
      let armed = false;
      const module = moduleFor(
        createLocalSqliteFullResourceDriver({
          faults: {
            hit(candidate) {
              if (candidate === point && armed) {
                armed = false;
                throw new Error(`compound fault:${scenario}:${point}`);
              }
            },
          },
          profile: "candidate-local-filesystem",
          reconciliationDelayMs: 1,
          rootPath,
          timeoutMs: 100,
        }),
      );
      const port = await start(module);
      const ids = await createInitialUpload(module);
      const initial = await port.resolve(ids.resourceId, ids.assetId);
      if (!initial.ok) throw new Error(initial.error.code);

      let action: () => Promise<{ readonly ok: boolean }>;
      if (scenario === "initial-publish") {
        await port.stage(initial.value, new Uint8Array([2]));
        action = () => port.finish(initial.value);
      } else {
        await port.stage(initial.value, new Uint8Array([1]));
        await expect(port.finish(initial.value)).resolves.toMatchObject({
          ok: true,
        });
        if (
          scenario === "replacement-publish" ||
          scenario === "replacement-delete"
        ) {
          const replacement = await port.begin(ids.resourceId, ids.assetId);
          if (!replacement.ok) throw new Error(replacement.error.code);
          await port.stage(replacement.value.handle, new Uint8Array([2]));
          action =
            scenario === "replacement-publish"
              ? () => port.finish(replacement.value.handle)
              : () =>
                  module.storage()!.deleteAsset(ids.resourceId, ids.assetId);
        } else {
          action = () =>
            module.storage()!.deleteAsset(ids.resourceId, ids.assetId);
        }
      }

      armed = true;
      const result = await action();
      expect(armed).toBe(false);
      expect(result.ok).toBe(committed);
      if (!committed) {
        expect(result).toMatchObject({
          error: { code: "STORAGE_WRITE_FAILED" },
          ok: false,
        });
      }
      await module.stop();

      const restarted = moduleFor(
        createLocalSqliteFullResourceDriver({
          profile: "candidate-local-filesystem",
          reconciliationDelayMs: 1,
          rootPath,
          timeoutMs: 100,
        }),
      );
      const restartedPort = await start(restarted);
      const owner = await restarted.query()!.getResource(ids.resourceId);
      if (!owner.ok) throw new Error(owner.error.code);
      const deleted = scenario.endsWith("delete") && committed;
      expect(owner.value.assets).toHaveLength(deleted ? 0 : 1);
      if (!deleted) {
        const expectedActive =
          !committed &&
          (scenario === "initial-publish" ||
            scenario === "replacement-publish" ||
            scenario === "replacement-delete");
        expect(owner.value.assets[0]?.is_on_uploading).toBe(expectedActive);
        const read = await restartedPort.read(ids.resourceId, ids.assetId);
        if (scenario === "initial-publish" && !committed) {
          expect(read).toEqual({
            error: { code: "ASSET_FILE_NOT_READY" },
            ok: false,
          });
        } else {
          expect(read.ok && [...read.value.bytes]).toEqual([
            scenario.includes("publish") && committed ? 2 : 1,
          ]);
        }
      }
      await restarted.stop();

      const db = new DatabaseSync(
        inspectLocalSqliteProfile(rootPath).databasePath,
        { readOnly: true },
      );
      const actionType = scenario.endsWith("delete")
        ? "asset.delete"
        : "asset.upload.finish";
      const baselineActionRows = scenario === "replacement-publish" ? 1 : 0;
      expect(
        db
          .prepare("SELECT count(*) AS count FROM journal WHERE type = ?")
          .get(actionType),
      ).toEqual({ count: baselineActionRows + (committed ? 1 : 0) });
      const expectedGenerations =
        committed || scenario === "ready-delete" ? 0 : 1;
      expect(
        db
          .prepare("SELECT count(*) AS count FROM asset_upload_generations")
          .get(),
      ).toEqual({ count: expectedGenerations });
      const expectedPayloads = committed
        ? scenario.endsWith("delete")
          ? 0
          : 1
        : scenario === "replacement-publish" ||
            scenario === "replacement-delete"
          ? 2
          : 1;
      expect(
        db.prepare("SELECT count(*) AS count FROM payloads").get(),
      ).toEqual({ count: expectedPayloads });
      db.close();
    });
  });

  it.each(["before", "after"] as const)(
    "recovers a real child-process crash %s generation.publish COMMIT",
    async (mode) => {
      const active = localWithFaults(new Set());
      const port = await start(active.module);
      const ids = await createInitialUpload(active.module);
      const resolved = await port.resolve(ids.resourceId, ids.assetId);
      if (!resolved.ok) throw new Error(resolved.error.code);
      await port.stage(resolved.value, new Uint8Array([61, 62, 63]));
      await active.module.stop();

      const markerPath = join(active.rootPath, `crash-${mode}.marker`);
      const child = spawn(
        process.execPath,
        [
          join(process.cwd(), "node_modules", "vitest", "vitest.mjs"),
          "run",
          "--coverage.enabled=false",
          "--pool=threads",
          "--maxWorkers=1",
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            EXTENSIA_ASSET_UPLOAD_ASSET: ids.assetId,
            EXTENSIA_ASSET_UPLOAD_CRASH_CHILD: "1",
            EXTENSIA_ASSET_UPLOAD_MARKER: markerPath,
            EXTENSIA_ASSET_UPLOAD_MODE: mode,
            EXTENSIA_ASSET_UPLOAD_RESOURCE: ids.resourceId,
            EXTENSIA_ASSET_UPLOAD_ROOT: active.rootPath,
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      await waitForMarker(child, markerPath);
      const exited = once(child, "exit");
      child.kill();
      await exited;

      const restarted = moduleFor(
        createLocalSqliteFullResourceDriver({
          profile: "candidate-local-filesystem",
          reconciliationDelayMs: 1,
          rootPath: active.rootPath,
          timeoutMs: 1_000,
        }),
      );
      const restartedPort = await start(restarted);
      if (mode === "before") {
        await expect(
          restartedPort.read(ids.resourceId, ids.assetId),
        ).resolves.toEqual({
          error: { code: "ASSET_FILE_NOT_READY" },
          ok: false,
        });
        const recoveredHandle = await restartedPort.resolve(
          ids.resourceId,
          ids.assetId,
        );
        if (!recoveredHandle.ok) {
          throw new Error(recoveredHandle.error.code);
        }
        await expect(
          restartedPort.finish(recoveredHandle.value),
        ).resolves.toMatchObject({ ok: true });
      } else {
        await expect(
          restartedPort.resolve(ids.resourceId, ids.assetId),
        ).resolves.toEqual({
          error: { code: "ASSET_UPLOAD_NOT_ACTIVE" },
          ok: false,
        });
      }
      const read = await restartedPort.read(ids.resourceId, ids.assetId);
      expect(read.ok && [...read.value.bytes]).toEqual([61, 62, 63]);
      await restarted.stop();

      const db = new DatabaseSync(
        inspectLocalSqliteProfile(active.rootPath).databasePath,
        { readOnly: true },
      );
      expect(
        db
          .prepare(
            "SELECT count(*) AS count FROM journal WHERE type = 'asset.upload.finish'",
          )
          .get(),
      ).toEqual({ count: 1 });
      db.close();
    },
    30_000,
  );

  describe.each([
    "replacement-publish",
    "ready-delete",
    "replacement-delete",
  ] as const)("real compound-action process crash: %s", (scenario) => {
    it.each(["before", "after"] as const)(
      "recovers coherently %s COMMIT",
      async (mode) => {
        const active = localWithFaults(new Set());
        const port = await start(active.module);
        const ids = await createInitialUpload(active.module);
        const initial = await port.resolve(ids.resourceId, ids.assetId);
        if (!initial.ok) throw new Error(initial.error.code);
        await port.stage(initial.value, new Uint8Array([51]));
        await expect(port.finish(initial.value)).resolves.toMatchObject({
          ok: true,
        });
        if (
          scenario === "replacement-publish" ||
          scenario === "replacement-delete"
        ) {
          const replacement = await port.begin(ids.resourceId, ids.assetId);
          if (!replacement.ok) throw new Error(replacement.error.code);
          await port.stage(replacement.value.handle, new Uint8Array([52]));
        }
        await active.module.stop();

        await killAtAssetAction({
          action: scenario.endsWith("delete") ? "delete" : "finish",
          assetId: ids.assetId,
          markerLabel: scenario,
          mode,
          resourceId: ids.resourceId,
          rootPath: active.rootPath,
        });

        const restarted = moduleFor(
          createLocalSqliteFullResourceDriver({
            profile: "candidate-local-filesystem",
            reconciliationDelayMs: 1,
            rootPath: active.rootPath,
            timeoutMs: 1_000,
          }),
        );
        const restartedPort = await start(restarted);
        const owner = await restarted.query()!.getResource(ids.resourceId);
        if (!owner.ok) throw new Error(owner.error.code);
        const committed = mode === "after";
        const deleted = scenario.endsWith("delete") && committed;
        expect(owner.value.assets).toHaveLength(deleted ? 0 : 1);
        if (!deleted) {
          expect(owner.value.assets[0]?.is_on_uploading).toBe(
            !committed && scenario !== "ready-delete",
          );
          const read = await restartedPort.read(ids.resourceId, ids.assetId);
          expect(read.ok && [...read.value.bytes]).toEqual([
            scenario === "replacement-publish" && committed ? 52 : 51,
          ]);
        }
        await restarted.stop();

        const db = new DatabaseSync(
          inspectLocalSqliteProfile(active.rootPath).databasePath,
          { readOnly: true },
        );
        const actionType = scenario.endsWith("delete")
          ? "asset.delete"
          : "asset.upload.finish";
        const baselineActionRows = scenario === "replacement-publish" ? 1 : 0;
        expect(
          db
            .prepare("SELECT count(*) AS count FROM journal WHERE type = ?")
            .get(actionType),
        ).toEqual({ count: baselineActionRows + (committed ? 1 : 0) });
        expect(
          db
            .prepare("SELECT count(*) AS count FROM asset_upload_generations")
            .get(),
        ).toEqual({
          count: !committed && scenario !== "ready-delete" ? 1 : 0,
        });
        expect(
          db.prepare("SELECT count(*) AS count FROM payloads").get(),
        ).toEqual({
          count: committed
            ? scenario === "replacement-publish"
              ? 1
              : 0
            : scenario === "ready-delete"
              ? 1
              : 2,
        });
        db.close();
      },
      30_000,
    );
  });

  it.each([
    ["BUSY", "transaction.before-write"],
    ["READONLY", "transaction.before-write"],
    ["FULL", "transaction.after-resource-write"],
    ["IOERR", "transaction.after-journal-write"],
  ] as const)(
    "preserves last-ready bytes when replacement finish hits SQLITE_%s",
    async (code, cutPoint) => {
      const rootPath = mkdtempSync(join(tmpdir(), "extensia-upload-matrix-"));
      roots.push(rootPath);
      let pending = false;
      const module = moduleFor(
        createLocalSqliteFullResourceDriver({
          faults: {
            hit(point) {
              if (point === cutPoint && pending) {
                pending = false;
                const error = new Error(`injected ${code}`) as Error & {
                  code: string;
                };
                error.code = `SQLITE_${code}`;
                throw error;
              }
            },
          },
          profile: "candidate-local-filesystem",
          reconciliationDelayMs: 1,
          rootPath,
          timeoutMs: 100,
        }),
      );
      const port = await start(module);
      const ids = await createInitialUpload(module);
      const initial = await port.resolve(ids.resourceId, ids.assetId);
      if (!initial.ok) throw new Error(initial.error.code);
      await port.stage(initial.value, new Uint8Array([41]));
      await port.finish(initial.value);
      const replacement = await port.begin(ids.resourceId, ids.assetId);
      if (!replacement.ok) throw new Error(replacement.error.code);
      await port.stage(replacement.value.handle, new Uint8Array([42]));
      pending = true;
      await expect(port.finish(replacement.value.handle)).resolves.toEqual({
        error: { code: "STORAGE_WRITE_FAILED" },
        ok: false,
      });
      const oldRead = await port.read(ids.resourceId, ids.assetId);
      expect(oldRead.ok && [...oldRead.value.bytes]).toEqual([41]);
      await expect(
        port.finish(replacement.value.handle),
      ).resolves.toMatchObject({
        ok: true,
      });
      const newRead = await port.read(ids.resourceId, ids.assetId);
      expect(newRead.ok && [...newRead.value.bytes]).toEqual([42]);
      await module.stop();
    },
  );

  it("enforces the payload limit before storage mutation", async () => {
    const active = localWithFaults(new Set());
    const port = await start(active.module);
    const ids = await createInitialUpload(active.module);
    const resolved = await port.resolve(ids.resourceId, ids.assetId);
    if (!resolved.ok) throw new Error(resolved.error.code);
    await expect(
      port.stage(resolved.value, new Uint8Array(ASSET_UPLOAD_MAX_BYTES + 1)),
    ).resolves.toEqual({
      error: { code: "STORAGE_WRITE_FAILED" },
      ok: false,
    });
    await expect(port.finish(resolved.value)).resolves.toEqual({
      error: { code: "ASSET_UPLOAD_INCOMPLETE" },
      ok: false,
    });
    await active.module.stop();
  });

  it("fails startup closed for corrupted staged payload bytes", async () => {
    const active = localWithFaults(new Set());
    const port = await start(active.module);
    const ids = await createInitialUpload(active.module);
    const resolved = await port.resolve(ids.resourceId, ids.assetId);
    if (!resolved.ok) throw new Error(resolved.error.code);
    await port.stage(resolved.value, new Uint8Array([6, 7, 8]));
    await active.module.stop();

    const db = new DatabaseSync(
      inspectLocalSqliteProfile(active.rootPath).databasePath,
    );
    db.prepare("UPDATE payloads SET digest = ? WHERE payload_id = ?").run(
      "0".repeat(64),
      resolved.value.upload_id,
    );
    db.close();

    const restarted = moduleFor(
      createLocalSqliteFullResourceDriver({
        profile: "candidate-local-filesystem",
        rootPath: active.rootPath,
      }),
    );
    await expect(restarted.start()).resolves.toEqual({
      error: { code: "START_FAILED", message: "Extensia failed to start" },
      ok: false,
    });
    await restarted.stop();
  });

  it("releases the concrete session after a finish integrity exception", async () => {
    const active = localWithFaults(new Set());
    const port = await start(active.module);
    const ids = await createInitialUpload(active.module);
    const resolved = await port.resolve(ids.resourceId, ids.assetId);
    if (!resolved.ok) throw new Error(resolved.error.code);
    await port.stage(resolved.value, new Uint8Array([51, 52]));

    const db = new DatabaseSync(
      inspectLocalSqliteProfile(active.rootPath).databasePath,
    );
    db.prepare("UPDATE payloads SET digest = ? WHERE payload_id = ?").run(
      "f".repeat(64),
      resolved.value.upload_id,
    );
    db.close();

    await expect(port.finish(resolved.value)).resolves.toEqual({
      error: { code: "STORAGE_INTEGRITY_FAILED" },
      ok: false,
    });
    await expect(active.module.stop()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
  });

  it("fails startup closed when an upload ID aliases any Asset ID", async () => {
    const active = localWithFaults(new Set());
    await start(active.module);
    const ids = await createInitialUpload(active.module);
    const second = await active.module.storage()!.createAsset(ids.resourceId, {
      data: null,
      derived_from: null,
      extension: "bin",
      is_primary: false,
      kind: "internal",
      mime: "application/octet-stream",
      role: "alias-target",
      type: "binary",
    });
    if (!second.ok || second.value.asset === null) {
      throw new Error(second.ok ? "Asset is missing" : second.error.code);
    }
    await active.module.stop();

    const db = new DatabaseSync(
      inspectLocalSqliteProfile(active.rootPath).databasePath,
    );
    db.prepare(
      "UPDATE asset_upload_generations SET upload_id = ? WHERE asset_id = ?",
    ).run(second.value.asset.id, ids.assetId);
    db.close();

    const restarted = moduleFor(
      createLocalSqliteFullResourceDriver({
        profile: "candidate-local-filesystem",
        rootPath: active.rootPath,
      }),
    );
    await expect(restarted.start()).resolves.toEqual({
      error: { code: "START_FAILED", message: "Extensia failed to start" },
      ok: false,
    });
    await restarted.stop();
  });
});
