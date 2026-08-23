import { createHash } from "node:crypto";
import { once } from "node:events";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { createExtensia, defineFullResourceDriver } from "../index.js";
import type { IDString, Timestamp } from "../domain/scalars.js";
import {
  buildResourceSnapshot,
  type ResourceSnapshot,
} from "../domain/snapshots.js";
import {
  canonicalResourceStorageJson,
  computeResourceWriteSetFingerprint,
  ResourceStorageIntegrityError,
} from "./resource-journal-integrity.js";
import { scanRecoveryCleanResourceState } from "./resource-recovery-coordinator.js";
import {
  createLocalSqliteFullResourceDriver,
  createLocalSqliteReadonlyResourceDriver,
  inspectLocalSqliteProfile,
  type LocalSqliteFaultInjector,
} from "./local-sqlite-resource-driver.js";
import type { CommittedOperationDraft } from "./resource-write-protocol.js";
import { AssetStorageIntegrityError } from "./resource-runtime-integrity.js";
import { createReadonlyMetadataObservationPort } from "../core/read-model-storage-observation.js";
import { resolveSynchronizedObservationCapability } from "../core/read-model-observation.js";

const ACTOR_ID = "20000000-0000-4000-8000-000000000001" as IDString;
const OPERATION_ID = "30000000-0000-4000-8000-000000000001" as IDString;
const RESOURCE_ID = "10000000-0000-4000-8000-000000000001" as IDString;

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

function createRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "extensia-local-sqlite-test-"));
  roots.push(root);
  return root;
}

function resource(id = RESOURCE_ID, title = "One"): ResourceSnapshot {
  return buildResourceSnapshot({
    assets: [],
    data: {
      created_at: 1 as Timestamp,
      description: null,
      hidden: false,
      id,
      is_deleted: false,
      locked: false,
      order_index: 0,
      parent_id: null,
      title,
      updated_at: 1 as Timestamp,
    },
    kv: {},
    marks: [],
  });
}

function draft(
  snapshot: ResourceSnapshot,
  operationId = OPERATION_ID,
): CommittedOperationDraft {
  return {
    actor_id: ACTOR_ID,
    affected_resources: [snapshot.data.id],
    changes: [{ kind: "resource.upsert", resource_id: snapshot.data.id }],
    committed_at: 2 as Timestamp,
    operation_id: operationId,
    schema_version: 1,
    type: "resource.create",
    write_set_fingerprint: computeResourceWriteSetFingerprint([snapshot]),
  };
}

function driver(rootPath: string, faults?: LocalSqliteFaultInjector) {
  return createLocalSqliteFullResourceDriver({
    ...(faults === undefined ? {} : { faults }),
    profile: "candidate-local-filesystem",
    reconciliationDelayMs: 5,
    rootPath,
    timeoutMs: 100,
  });
}

async function commitOne(
  rootPath: string,
  faults?: LocalSqliteFaultInjector,
): Promise<ReturnType<typeof driver>> {
  const adapter = driver(rootPath, faults);
  await adapter.open();
  const session = await adapter.acquireStorageSession();
  const transaction = await session.begin(OPERATION_ID);
  const snapshot = resource();
  await transaction.stageResource(snapshot);
  await transaction.commit(draft(snapshot));
  await session.release();
  return adapter;
}

function fileHash(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function seedObservationMatrix(
  rootPath: string,
  entryCount: number,
  resourceCount: number,
): Promise<void> {
  const adapter = driver(rootPath);
  await adapter.open();
  const session = await adapter.acquireStorageSession();
  await session.release();
  await adapter.close();
  const databasePath = inspectLocalSqliteProfile(rootPath).databasePath;
  const db = new DatabaseSync(databasePath, { timeout: 1_000 });
  db.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE;");
  try {
    const resources = Array.from({ length: resourceCount }, (_, index) =>
      buildResourceSnapshot({
        ...resource(
          `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}` as IDString,
          `R${index + 1}`,
        ),
        data: {
          ...resource().data,
          id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}` as IDString,
          order_index: index,
          title: `R${index + 1}`,
        },
      }),
    );
    const insertResource = db.prepare(
      "INSERT INTO resources(id, snapshot_json, tombstoned, revision) VALUES (?, ?, 0, 1)",
    );
    resources.forEach((snapshot) =>
      insertResource.run(
        snapshot.data.id,
        canonicalResourceStorageJson(snapshot),
      ),
    );
    const affected = resources.map((snapshot) => snapshot.data.id);
    const changes = affected.map((resourceId) => ({
      kind: "resource.upsert" as const,
      resource_id: resourceId,
    }));
    const fingerprint = computeResourceWriteSetFingerprint(resources);
    const insertJournal = db.prepare(
      `INSERT INTO journal(
         sequence_text, sequence_length, operation_id, actor_id, type,
         committed_at, write_set_fingerprint, entry_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (let index = 1; index <= entryCount; index += 1) {
      const sequence = String(index);
      const entry = {
        actor_id: ACTOR_ID,
        affected_resources: affected,
        changes,
        committed_at: (10 + index) as Timestamp,
        operation_id:
          `30000000-0000-4000-8000-${String(index).padStart(12, "0")}` as IDString,
        schema_version: 1 as const,
        sequence,
        type: "resource.update" as const,
        write_set_fingerprint: fingerprint,
      };
      insertJournal.run(
        sequence,
        sequence.length,
        entry.operation_id,
        entry.actor_id,
        entry.type,
        entry.committed_at,
        entry.write_set_fingerprint,
        canonicalResourceStorageJson(entry),
      );
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  } finally {
    db.close();
  }
}

describe("local SQLite Resource driver", () => {
  it("enforces the default Windows local-filesystem profile boundary", async () => {
    const root = createRoot();
    const adapter = createLocalSqliteFullResourceDriver({ rootPath: root });
    await expect(adapter.open()).rejects.toThrow("profile is unsupported");

    if (process.platform === "win32") {
      const verified = createLocalSqliteFullResourceDriver({
        rootPath: root,
        verifyFilesystemProfile(canonicalRootPath) {
          return {
            canonicalRootPath,
            driveType: "Fixed",
            filesystemName: "NTFS",
            networkBacked: false,
            syncBacked: false,
          };
        },
      });
      await verified.open();
      const session = await verified.acquireStorageSession();
      await session.release();
      await verified.close();
    }
  });

  it.each([
    {
      driveType: "Removable",
      filesystemName: "NTFS",
      networkBacked: false,
      syncBacked: false,
    },
    {
      driveType: "Fixed",
      filesystemName: "exFAT",
      networkBacked: false,
      syncBacked: false,
    },
    {
      driveType: "Fixed",
      filesystemName: "NTFS",
      networkBacked: true,
      syncBacked: false,
    },
    {
      driveType: "Fixed",
      filesystemName: "NTFS",
      networkBacked: false,
      syncBacked: true,
    },
  ])("rejects unsupported Windows profile evidence: %o", async (facts) => {
    if (process.platform !== "win32") return;
    const root = createRoot();
    const adapter = createLocalSqliteFullResourceDriver({
      rootPath: root,
      verifyFilesystemProfile(canonicalRootPath) {
        return { canonicalRootPath, ...facts } as never;
      },
    });
    await expect(adapter.open()).rejects.toThrow("profile is unsupported");
  });

  it("commits Resource state and exactly one journal row across reopen", async () => {
    const root = createRoot();
    const adapter = await commitOne(root);
    await adapter.close();

    const profile = inspectLocalSqliteProfile(root);
    expect(profile.databaseBytes).toBeGreaterThan(0);
    expect(profile.rollbackJournalPresent).toBe(false);

    const reopened = driver(root);
    await reopened.open();
    const state = await scanRecoveryCleanResourceState(reopened);
    expect(state.recovery.status).toBe("clean");
    expect(state.resources.map((item) => item.data.title)).toEqual(["One"]);
    expect(state.journal).toHaveLength(1);
    expect(state.journal_head).toBe("1");
    expect(state.journal[0]?.operation_id).toBe(OPERATION_ID);
    await reopened.close();
  });

  it("integrates through the existing opaque public driver boundary", async () => {
    const root = createRoot();
    const firstAdapter = driver(root);
    const first = createExtensia({
      storage: { driver: defineFullResourceDriver(firstAdapter) },
    });
    await expect(first.start()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    const created = await first.storage()!.createResource({ title: "Durable" });
    expect(created.ok).toBe(true);
    const resourceId = created.ok
      ? created.value.resource.data.id
      : RESOURCE_ID;
    await expect(first.stop()).resolves.toEqual({ ok: true, value: undefined });

    const secondAdapter = driver(root);
    const second = createExtensia({
      storage: { driver: defineFullResourceDriver(secondAdapter) },
    });
    await expect(second.start()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await expect(
      second.query()!.getResource(resourceId),
    ).resolves.toMatchObject({
      ok: true,
      value: { data: { title: "Durable" } },
    });
    await second.stop();
  });

  it("keeps staging private and provides exact idempotent operation retry", async () => {
    const root = createRoot();
    const adapter = driver(root);
    await adapter.open();
    const session = await adapter.acquireStorageSession();
    const snapshot = resource();
    const first = await session.begin(OPERATION_ID);
    await first.stageResource(snapshot);
    expect(await session.readResource(RESOURCE_ID)).toBeNull();
    expect((await first.commit(draft(snapshot))).sequence).toBe("1");

    const retry = await session.begin(OPERATION_ID);
    await retry.stageResource(snapshot);
    expect((await retry.commit(draft(snapshot))).sequence).toBe("1");

    const mismatchSnapshot = resource(RESOURCE_ID, "Mismatch");
    const mismatch = await session.begin(OPERATION_ID);
    await mismatch.stageResource(mismatchSnapshot);
    await expect(
      mismatch.commit(draft(mismatchSnapshot)),
    ).rejects.toBeInstanceOf(ResourceStorageIntegrityError);
    await mismatch.abort();

    const entries = [];
    for await (const entry of session.readCommittedOperationsAfter(null)) {
      entries.push(entry);
    }
    expect(entries).toHaveLength(1);
    await session.release();
    await adapter.close();
  });

  it("rolls back a proven pre-COMMIT failure without durable visibility", async () => {
    const root = createRoot();
    let fail = true;
    const adapter = driver(root, {
      hit(point) {
        if (point === "transaction.before-commit" && fail) {
          fail = false;
          throw new Error("injected before COMMIT");
        }
      },
    });
    await adapter.open();
    const session = await adapter.acquireStorageSession();
    const transaction = await session.begin(OPERATION_ID);
    const snapshot = resource();
    await transaction.stageResource(snapshot);
    await expect(transaction.commit(draft(snapshot))).rejects.toThrow(
      "injected before COMMIT",
    );
    expect(await session.readResource(RESOURCE_ID)).toBeNull();
    const entries = [];
    for await (const entry of session.readCommittedOperationsAfter(null)) {
      entries.push(entry);
    }
    expect(entries).toEqual([]);
    await session.release();
    await adapter.close();
  });

  it("reconciles a thrown after-COMMIT outcome as committed", async () => {
    const root = createRoot();
    let fail = true;
    const adapter = driver(root, {
      hit(point) {
        if (point === "transaction.after-commit" && fail) {
          fail = false;
          throw new Error("receipt lost after COMMIT");
        }
      },
    });
    await adapter.open();
    const session = await adapter.acquireStorageSession();
    const transaction = await session.begin(OPERATION_ID);
    const snapshot = resource();
    await transaction.stageResource(snapshot);
    const entry = await transaction.commit(draft(snapshot));
    expect(entry.sequence).toBe("1");
    expect((await session.readResource(RESOURCE_ID))?.data.title).toBe("One");
    await session.release();
    await adapter.close();
  });

  it("does not settle an unclassifiable COMMIT until durable access returns", async () => {
    const root = createRoot();
    let afterCommit = true;
    let unavailable = true;
    const adapter = driver(root, {
      hit(point) {
        if (point === "transaction.after-commit" && afterCommit) {
          afterCommit = false;
          throw new Error("connection outcome unknown");
        }
        if (point === "reconciliation.before-query" && unavailable) {
          throw new Error("storage unavailable");
        }
      },
    });
    await adapter.open();
    const session = await adapter.acquireStorageSession();
    const transaction = await session.begin(OPERATION_ID);
    const snapshot = resource();
    await transaction.stageResource(snapshot);
    let settled = false;
    const committed = transaction.commit(draft(snapshot)).finally(() => {
      settled = true;
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 30));
    expect(settled).toBe(false);
    unavailable = false;
    expect((await committed).sequence).toBe("1");
    await session.release();
    await adapter.close();
  });

  it("keeps release pending until suspended COMMIT reconciliation settles", async () => {
    const root = createRoot();
    let afterCommit = true;
    let unavailable = true;
    const adapter = driver(root, {
      hit(point) {
        if (point === "transaction.after-commit" && afterCommit) {
          afterCommit = false;
          throw new Error("connection outcome unknown");
        }
        if (point === "reconciliation.before-query" && unavailable) {
          throw new Error("storage unavailable");
        }
      },
    });
    await adapter.open();
    const session = await adapter.acquireStorageSession();
    const transaction = await session.begin(OPERATION_ID);
    const snapshot = resource();
    await transaction.stageResource(snapshot);
    let commitSettled = false;
    let releaseSettled = false;
    const committed = transaction.commit(draft(snapshot)).finally(() => {
      commitSettled = true;
    });
    const released = session.release().finally(() => {
      releaseSettled = true;
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 30));
    expect({ commitSettled, releaseSettled }).toEqual({
      commitSettled: false,
      releaseSettled: false,
    });
    unavailable = false;
    expect((await committed).sequence).toBe("1");
    await released;

    const next = await adapter.acquireStorageSession();
    expect((await next.readResource(RESOURCE_ID))?.data.title).toBe("One");
    await next.release();
    await adapter.close();
  });

  it("holds the exclusive SQLite lease against another process and releases it", async () => {
    const root = createRoot();
    const adapter = driver(root);
    await adapter.open();
    const held = await adapter.acquireStorageSession();
    const transaction = await held.begin(OPERATION_ID);
    const snapshot = resource();
    await transaction.stageResource(snapshot);
    await transaction.commit(draft(snapshot));
    const databasePath = inspectLocalSqliteProfile(root).databasePath;
    const childScript = `
      const { DatabaseSync } = require('node:sqlite');
      try {
        const db = new DatabaseSync(process.argv[1], { timeout: 50 });
        db.exec('PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE; COMMIT;');
        db.close();
        process.exit(0);
      } catch { process.exit(23); }
    `;
    const contended = spawnSync(
      process.execPath,
      ["-e", childScript, databasePath],
      {
        timeout: 5_000,
      },
    );
    expect(contended.status).toBe(23);
    await held.release();
    const released = spawnSync(
      process.execPath,
      ["-e", childScript, databasePath],
      { timeout: 5_000 },
    );
    expect(released.status).toBe(0);
    await adapter.close();
  });

  it("invalidates stale sessions, transactions and iterators after release", async () => {
    const root = createRoot();
    const adapter = driver(root);
    await adapter.open();
    const session = await adapter.acquireStorageSession();
    const first = await session.begin(OPERATION_ID);
    const firstResource = resource();
    await first.stageResource(firstResource);
    await first.commit(draft(firstResource));
    const staleTransaction = await session.begin(
      "30000000-0000-4000-8000-000000000002" as IDString,
    );
    const iterator = session.listResources()[Symbol.asyncIterator]();
    expect((await iterator.next()).done).toBe(false);
    await session.release();
    await expect(staleTransaction.stageResource(resource())).rejects.toThrow(
      "released",
    );
    await expect(iterator.next()).rejects.toThrow("released");
    await adapter.close();
  });

  it("rolls back an in-flight write after a real child-process crash", async () => {
    const root = createRoot();
    const adapter = await commitOne(root);
    await adapter.close();
    const databasePath = inspectLocalSqliteProfile(root).databasePath;
    const childScript = `
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(process.argv[1], { timeout: 1000 });
      db.exec('PRAGMA locking_mode=EXCLUSIVE; PRAGMA synchronous=EXTRA; BEGIN EXCLUSIVE;');
      db.prepare('UPDATE resources SET snapshot_json = ? WHERE id = ?')
        .run('{"corrupt":true}', process.argv[2]);
      process.stdout.write('WRITE-STAGED\\n');
      setInterval(() => {}, 1000);
    `;
    const child = spawn(
      process.execPath,
      ["-e", childScript, databasePath, RESOURCE_ID],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    await waitForOutput(child, "WRITE-STAGED");
    child.kill();
    await once(child, "exit");

    const recovered = driver(root);
    await recovered.open();
    const session = await recovered.acquireStorageSession();
    expect((await session.readResource(RESOURCE_ID))?.data.title).toBe("One");
    expect(["clean", "recovered"]).toContain(session.recovery.status);
    await session.release();
    await recovered.close();
  });

  it("reconciles a real child-process crash after COMMIT before receipt", async () => {
    const root = createRoot();
    const adapter = await commitOne(root);
    await adapter.close();
    const databasePath = inspectLocalSqliteProfile(root).databasePath;
    const operationId = "30000000-0000-4000-8000-000000000002";
    const childScript = `
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(process.argv[1], { timeout: 1000 });
      db.exec('PRAGMA locking_mode=EXCLUSIVE; PRAGMA synchronous=EXTRA; BEGIN EXCLUSIVE;');
      const prior = db.prepare('SELECT entry_json FROM journal WHERE sequence_text = ?').get('1');
      const entry = JSON.parse(prior.entry_json);
      entry.committed_at += 1;
      entry.operation_id = process.argv[2];
      entry.sequence = '2';
      db.prepare('UPDATE resources SET revision = revision + 1 WHERE id = ?')
        .run(entry.affected_resources[0]);
      const json = JSON.stringify(entry);
      db.prepare('INSERT INTO journal(sequence_text, sequence_length, operation_id, actor_id, type, committed_at, write_set_fingerprint, entry_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(entry.sequence, entry.sequence.length, entry.operation_id, entry.actor_id, entry.type, entry.committed_at, entry.write_set_fingerprint, json);
      db.exec('COMMIT');
      process.stdout.write('COMMITTED-NO-RECEIPT\\n');
      setInterval(() => {}, 1000);
    `;
    const child = spawn(
      process.execPath,
      ["-e", childScript, databasePath, operationId],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    await waitForOutput(child, "COMMITTED-NO-RECEIPT");
    child.kill();
    await once(child, "exit");

    const recovered = driver(root);
    await recovered.open();
    const state = await scanRecoveryCleanResourceState(recovered);
    expect(state.journal.map((entry) => entry.operation_id)).toEqual([
      OPERATION_ID,
      operationId,
    ]);
    expect(state.journal_head).toBe("2");
    await recovered.close();
  });

  it("opens readonly without changing durable bytes and lists committed rows", async () => {
    const root = createRoot();
    const adapter = await commitOne(root);
    await adapter.close();
    const databasePath = inspectLocalSqliteProfile(root).databasePath;
    const before = fileHash(databasePath);
    let interleavingBlocked = false;
    const readonly = createLocalSqliteReadonlyResourceDriver({
      faults: {
        hit(point) {
          if (point !== "readonly.snapshot.after-resources") return;
          const writer = new DatabaseSync(databasePath, { timeout: 0 });
          try {
            writer.exec("BEGIN IMMEDIATE");
            writer
              .prepare("UPDATE resources SET revision = revision + 1")
              .run();
            writer.exec("COMMIT");
          } catch {
            interleavingBlocked = true;
            try {
              writer.exec("ROLLBACK");
            } catch {
              // The expected busy result is the evidence under test.
            }
          } finally {
            writer.close();
          }
        },
      },
      profile: "candidate-local-filesystem",
      rootPath: root,
      timeoutMs: 100,
    });
    await readonly.open();
    const observation = await createReadonlyMetadataObservationPort(
      readonly,
    ).observeMetadata({ kind: "storage-complete" });
    expect(observation.kind).toBe("storage-complete");
    expect(observation.resources.map((item) => item.data.id)).toEqual([
      RESOURCE_ID,
    ]);
    expect(interleavingBlocked).toBe(true);
    await readonly.close();
    expect(fileHash(databasePath)).toBe(before);
  });

  it("observes coherent committed changes symmetrically without readonly mutation", async () => {
    const root = createRoot();
    const diagnostics: import("./local-sqlite-resource-driver.js").LocalSqliteObservationDiagnostic[] =
      [];
    const full = await commitOne(root);
    const fullObservation = resolveSynchronizedObservationCapability(full);
    expect(fullObservation).not.toBeNull();
    const fullStartup = await fullObservation!.observeStartup({
      attempt_admission_deadline_monotonic_ms: performance.now() + 1_000,
    });
    expect(fullStartup.observed_head).toBe("1");
    expect(fullStartup.complete.resources).toHaveLength(1);
    await expect(
      fullObservation!.observeCommittedChanges({
        after: fullStartup.observed_head,
        attempt_admission_deadline_monotonic_ms: performance.now() + 1_000,
        incremental_entry_limit: 256,
        incremental_resource_limit: 256,
      }),
    ).resolves.toMatchObject({ kind: "at-head", observed_head: "1" });
    await full.close();

    const readonly = createLocalSqliteReadonlyResourceDriver({
      onObservationDiagnostic: (sample) => diagnostics.push(sample),
      profile: "candidate-local-filesystem",
      rootPath: root,
      timeoutMs: 100,
    });
    await readonly.open();
    const readonlyObservation =
      resolveSynchronizedObservationCapability(readonly);
    expect(readonlyObservation).not.toBeNull();
    const readonlyStartup = await readonlyObservation!.observeStartup({
      attempt_admission_deadline_monotonic_ms: performance.now() + 1_000,
    });
    expect(readonlyStartup.observed_head).toBe("1");

    const writer = driver(root);
    await writer.open();
    const session = await writer.acquireStorageSession();
    const current = await session.readResource(RESOURCE_ID);
    expect(current).not.toBeNull();
    const updated = buildResourceSnapshot({
      ...current!,
      data: { ...current!.data, title: "Two", updated_at: 3 as Timestamp },
    });
    const operationId = "30000000-0000-4000-8000-000000000002" as IDString;
    const transaction = await session.begin(operationId);
    await transaction.stageResource(updated);
    await transaction.commit({
      ...draft(updated, operationId),
      type: "resource.update",
    });
    await session.release();
    await writer.close();

    const databasePath = inspectLocalSqliteProfile(root).databasePath;
    const beforeRefresh = fileHash(databasePath);
    const delta = await readonlyObservation!.observeCommittedChanges({
      after: readonlyStartup.observed_head,
      attempt_admission_deadline_monotonic_ms: performance.now() + 1_000,
      incremental_entry_limit: 256,
      incremental_resource_limit: 256,
    });
    expect(delta).toMatchObject({ kind: "delta", observed_head: "2" });
    if (delta.kind !== "delta") throw new Error("Expected delta observation");
    expect(delta.entries.map((entry) => entry.sequence)).toEqual(["2"]);
    expect(delta.resources.map((item) => item.data.title)).toEqual(["Two"]);
    expect(fileHash(databasePath)).toBe(beforeRefresh);
    expect(diagnostics).toEqual([
      expect.objectContaining({
        configured_timeout_ms: expect.any(Number),
        outcome: "success",
        phase: "startup",
        role: "readonly",
      }),
      expect.objectContaining({
        configured_timeout_ms: expect.any(Number),
        outcome: "success",
        phase: "refresh",
        role: "readonly",
      }),
    ]);
    expect(
      diagnostics.every((sample) => sample.configured_timeout_ms <= 100),
    ).toBe(true);
    await readonly.close();
  });

  it("uses exact 0/1/32/256/257 entry and distinct-Resource thresholds", async () => {
    const distanceRoot = createRoot();
    await seedObservationMatrix(distanceRoot, 257, 1);
    const distanceReader = createLocalSqliteReadonlyResourceDriver({
      profile: "candidate-local-filesystem",
      rootPath: distanceRoot,
    });
    await distanceReader.open();
    const distance = resolveSynchronizedObservationCapability(distanceReader)!;
    const request = (after: string | null) =>
      distance.observeCommittedChanges({
        after: after as
          import("./resource-write-protocol.js").JournalSequence | null,
        attempt_admission_deadline_monotonic_ms: performance.now() + 2_000,
        incremental_entry_limit: 256,
        incremental_resource_limit: 256,
      });
    await expect(request("257")).resolves.toMatchObject({ kind: "at-head" });
    await expect(request("256")).resolves.toMatchObject({
      entries: [{ sequence: "257" }],
      kind: "delta",
    });
    await expect(request("225")).resolves.toMatchObject({
      entries: expect.arrayContaining([
        expect.objectContaining({ sequence: "226" }),
        expect.objectContaining({ sequence: "257" }),
      ]),
      kind: "delta",
    });
    const boundary = await request("1");
    expect(boundary.kind).toBe("delta");
    if (boundary.kind === "delta") expect(boundary.entries).toHaveLength(256);
    await expect(request(null)).resolves.toMatchObject({ kind: "rebuild" });
    await distanceReader.close();

    const aggregateRoot = createRoot();
    await seedObservationMatrix(aggregateRoot, 1, 257);
    const aggregateReader = createLocalSqliteReadonlyResourceDriver({
      profile: "candidate-local-filesystem",
      rootPath: aggregateRoot,
    });
    await aggregateReader.open();
    const aggregate =
      resolveSynchronizedObservationCapability(aggregateReader)!;
    await expect(
      aggregate.observeCommittedChanges({
        after: null,
        attempt_admission_deadline_monotonic_ms: performance.now() + 2_000,
        incremental_entry_limit: 256,
        incremental_resource_limit: 256,
      }),
    ).resolves.toMatchObject({ kind: "rebuild" });
    await aggregateReader.close();
  });

  it("caps each SQLite busy wait by the remaining admission budget", async () => {
    const root = createRoot();
    const initialized = await commitOne(root);
    await initialized.close();
    const samples: import("./local-sqlite-resource-driver.js").LocalSqliteObservationDiagnostic[] =
      [];
    const readonly = createLocalSqliteReadonlyResourceDriver({
      onObservationDiagnostic: (sample) => samples.push(sample),
      profile: "candidate-local-filesystem",
      rootPath: root,
      timeoutMs: 1_000,
    });
    await readonly.open();
    const observation = resolveSynchronizedObservationCapability(readonly)!;
    const startup = await observation.observeStartup({
      attempt_admission_deadline_monotonic_ms: performance.now() + 1_000,
    });
    const databasePath = inspectLocalSqliteProfile(root).databasePath;
    const child = spawn(
      process.execPath,
      [
        "-e",
        `const { DatabaseSync } = require('node:sqlite');
         const db = new DatabaseSync(process.argv[1], { timeout: 1000 });
         db.exec('PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE;');
         process.stdout.write('LOCKED\\n');
         setInterval(() => {}, 1000);`,
        databasePath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    await waitForOutput(child, "LOCKED");
    await expect(
      observation.observeCommittedChanges({
        after: startup.observed_head,
        attempt_admission_deadline_monotonic_ms: performance.now() + 100,
        incremental_entry_limit: 256,
        incremental_resource_limit: 256,
      }),
    ).rejects.toMatchObject({ category: "storage-lock" });
    child.kill();
    await once(child, "exit");
    const sample = samples.at(-1)!;
    expect(sample).toMatchObject({
      outcome: "lock",
      phase: "refresh",
      role: "readonly",
    });
    expect(sample.configured_timeout_ms).toBeGreaterThan(0);
    expect(sample.configured_timeout_ms).toBeLessThanOrEqual(100);
    expect(sample.actual_wait_ms).toBeGreaterThanOrEqual(0);
    expect(sample.synchronous_overshoot_ms).toBeGreaterThanOrEqual(0);
    await readonly.close();
  });

  it("measures a successful cross-process read-lock wait before observation", async () => {
    const root = createRoot();
    const initialized = await commitOne(root);
    await initialized.close();
    const samples: import("./local-sqlite-resource-driver.js").LocalSqliteObservationDiagnostic[] =
      [];
    const readonly = createLocalSqliteReadonlyResourceDriver({
      onObservationDiagnostic: (sample) => samples.push(sample),
      profile: "candidate-local-filesystem",
      rootPath: root,
      timeoutMs: 1_000,
    });
    await readonly.open();
    const observation = resolveSynchronizedObservationCapability(readonly)!;
    const startup = await observation.observeStartup({
      attempt_admission_deadline_monotonic_ms: performance.now() + 1_000,
    });
    const databasePath = inspectLocalSqliteProfile(root).databasePath;
    const child = spawn(
      process.execPath,
      [
        "-e",
        `const { DatabaseSync } = require('node:sqlite');
         const db = new DatabaseSync(process.argv[1], { timeout: 1000 });
         db.exec('PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE;');
         process.stdout.write('LOCKED\\n');
         setTimeout(() => { db.exec('COMMIT'); db.close(); }, 180);`,
        databasePath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    await waitForOutput(child, "LOCKED");
    await expect(
      observation.observeCommittedChanges({
        after: startup.observed_head,
        attempt_admission_deadline_monotonic_ms: performance.now() + 750,
        incremental_entry_limit: 256,
        incremental_resource_limit: 256,
      }),
    ).resolves.toMatchObject({ kind: "at-head" });
    await once(child, "exit");
    const sample = samples.at(-1)!;
    expect(sample).toMatchObject({
      outcome: "success",
      phase: "refresh",
      role: "readonly",
    });
    expect(sample.actual_wait_ms).toBeGreaterThanOrEqual(100);
    expect(sample.session_duration_ms).toBeGreaterThanOrEqual(
      sample.actual_wait_ms,
    );
    await readonly.close();
  });

  it("fails readonly closed on a hot rollback journal without changing bytes", async () => {
    const root = createRoot();
    const adapter = await commitOne(root);
    await adapter.close();
    const databasePath = inspectLocalSqliteProfile(root).databasePath;
    const journalPath = `${databasePath}-journal`;
    const childScript = `
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(process.argv[1], { timeout: 1000 });
      db.exec('PRAGMA locking_mode=EXCLUSIVE; PRAGMA synchronous=EXTRA; BEGIN EXCLUSIVE;');
      db.prepare('UPDATE resources SET revision = revision + 1 WHERE id = ?')
        .run(process.argv[2]);
      process.stdout.write('HOT-JOURNAL\\n');
      setInterval(() => {}, 1000);
    `;
    const child = spawn(
      process.execPath,
      ["-e", childScript, databasePath, RESOURCE_ID],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    await waitForOutput(child, "HOT-JOURNAL");
    child.kill();
    await once(child, "exit");
    expect(existsSync(journalPath)).toBe(true);
    const before = {
      database: fileHash(databasePath),
      journal: fileHash(journalPath),
    };

    const readonly = createLocalSqliteReadonlyResourceDriver({
      profile: "candidate-local-filesystem",
      rootPath: root,
    });
    await expect(readonly.open()).rejects.toThrow("requires recovery");
    expect({
      database: fileHash(databasePath),
      journal: fileHash(journalPath),
    }).toEqual(before);

    const recovered = driver(root);
    await recovered.open();
    const session = await recovered.acquireStorageSession();
    expect((await session.readResource(RESOURCE_ID))?.data.title).toBe("One");
    await session.release();
    await recovered.close();
  });

  it("keeps the bounded opaque payload schema atomic and inactive", async () => {
    const root = createRoot();
    const adapter = driver(root);
    await adapter.open();
    const session = await adapter.acquireStorageSession();
    await session.release();
    await adapter.close();
    const databasePath = inspectLocalSqliteProfile(root).databasePath;
    const db = new DatabaseSync(databasePath);
    const chunk = new Uint8Array(64 * 1024);
    db.exec("BEGIN IMMEDIATE");
    db.prepare(
      "INSERT INTO payloads(payload_id, digest, byte_length) VALUES (?, ?, ?)",
    ).run("probe", "0".repeat(64), 16 * chunk.byteLength);
    const insert = db.prepare(
      "INSERT INTO payload_chunks(payload_id, chunk_index, bytes) VALUES (?, ?, ?)",
    );
    for (let index = 0; index < 16; index += 1) {
      insert.run("probe", index, chunk);
    }
    expect(
      db
        .prepare(
          "SELECT sum(length(bytes)) AS bytes FROM payload_chunks WHERE payload_id = ?",
        )
        .get("probe")?.["bytes"],
    ).toBe(1024 * 1024);
    db.exec("ROLLBACK");
    db.close();

    const reopened = driver(root);
    await reopened.open();
    const clean = await reopened.acquireStorageSession();
    await clean.release();
    await reopened.close();
  });

  it("fails closed for format, schema and canonical content corruption", async () => {
    const mutators: Array<(db: DatabaseSync) => void> = [
      (db) => db.exec("PRAGMA user_version = 3"),
      (db) => db.exec("CREATE TABLE unexpected(value TEXT) STRICT"),
      (db) => db.exec("CREATE INDEX unexpected_index ON resources(revision)"),
      (db) =>
        db.exec("CREATE VIEW unexpected_view AS SELECT id FROM resources"),
      (db) =>
        db.exec(
          "CREATE TRIGGER unexpected_trigger AFTER INSERT ON journal BEGIN DELETE FROM journal; END",
        ),
      (db) =>
        db
          .prepare("UPDATE resources SET snapshot_json = ? WHERE id = ?")
          .run('{"not":"a resource"}', RESOURCE_ID),
      (db) => {
        const row = db
          .prepare("SELECT entry_json FROM journal WHERE operation_id = ?")
          .get(OPERATION_ID);
        const entry = JSON.parse(String(row?.["entry_json"])) as Record<
          string,
          unknown
        >;
        entry["changes"] = [];
        db.prepare(
          "UPDATE journal SET entry_json = ? WHERE operation_id = ?",
        ).run(canonicalResourceStorageJson(entry), OPERATION_ID);
      },
      (db) => {
        const row = db
          .prepare("SELECT entry_json FROM journal WHERE operation_id = ?")
          .get(OPERATION_ID);
        const entry = JSON.parse(String(row?.["entry_json"])) as Record<
          string,
          unknown
        >;
        entry["affected_resources"] = [];
        entry["changes"] = [];
        db.prepare(
          "UPDATE journal SET entry_json = ? WHERE operation_id = ?",
        ).run(canonicalResourceStorageJson(entry), OPERATION_ID);
      },
    ];
    for (const mutate of mutators) {
      const root = createRoot();
      const adapter = await commitOne(root);
      await adapter.close();
      const databasePath = inspectLocalSqliteProfile(root).databasePath;
      const db = new DatabaseSync(databasePath);
      mutate(db);
      db.close();
      const corrupt = driver(root);
      await corrupt.open();
      await expect(corrupt.acquireStorageSession()).rejects.toBeInstanceOf(
        ResourceStorageIntegrityError,
      );
      await corrupt.close();
    }
  });

  it("migrates the accepted version-1 Resource schema without changing durable state", async () => {
    const root = createRoot();
    const adapter = await commitOne(root);
    await adapter.close();
    const databasePath = inspectLocalSqliteProfile(root).databasePath;
    const legacy = new DatabaseSync(databasePath);
    legacy.exec(`
      DROP TABLE asset_upload_generations;
      UPDATE storage_format SET version = 1 WHERE singleton = 1;
      PRAGMA user_version = 1;
    `);
    legacy.close();

    const legacyHash = fileHash(databasePath);
    const readonly = createLocalSqliteReadonlyResourceDriver({
      profile: "candidate-local-filesystem",
      rootPath: root,
      timeoutMs: 100,
    });
    await readonly.open();
    const readonlyResources = [];
    for await (const snapshot of readonly.listResources()) {
      readonlyResources.push(snapshot);
    }
    expect(readonlyResources).toHaveLength(1);
    await readonly.close();
    expect(fileHash(databasePath)).toBe(legacyHash);
    const stillLegacy = new DatabaseSync(databasePath, { readOnly: true });
    expect(stillLegacy.prepare("PRAGMA user_version").get()).toEqual({
      user_version: 1,
    });
    expect(
      stillLegacy
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'asset_upload_generations'",
        )
        .get(),
    ).toBeUndefined();
    stillLegacy.close();

    const migrated = driver(root);
    await migrated.open();
    const session = await migrated.acquireStorageSession();
    const resources = [];
    for await (const resource of session.listResources())
      resources.push(resource);
    const journal = [];
    for await (const entry of session.readCommittedOperationsAfter(null)) {
      journal.push(entry);
    }
    expect(resources).toHaveLength(1);
    expect(journal).toHaveLength(1);
    const payloadStates = [];
    for await (const state of session.listAssetPayloadStates!()) {
      payloadStates.push(state);
    }
    expect(payloadStates).toEqual([]);
    await session.release();
    await migrated.close();

    const verified = new DatabaseSync(databasePath, { readOnly: true });
    expect(verified.prepare("PRAGMA user_version").get()).toEqual({
      user_version: 2,
    });
    expect(
      verified
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'asset_upload_generations'",
        )
        .get(),
    ).toEqual({ name: "asset_upload_generations" });
    verified.close();
  });

  it("classifies malformed persisted Asset generation as ASSET_STORAGE_INTEGRITY", async () => {
    const root = createRoot();
    const adapter = driver(root);
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(adapter) },
    });
    await extensia.start();
    const owner = await extensia
      .storage()!
      .createResource({ title: "asset-corruption" });
    if (!owner.ok) throw new Error("Resource create failed");
    const asset = await extensia
      .storage()!
      .createAsset(owner.value.resource.data.id, {
        extension: "bin",
        kind: "internal",
        mime: "application/octet-stream",
        role: "source",
        type: "binary",
      });
    if (!asset.ok) throw new Error("Asset create failed");
    await extensia.stop();

    const databasePath = inspectLocalSqliteProfile(root).databasePath;
    const corrupt = new DatabaseSync(databasePath);
    corrupt
      .prepare("UPDATE asset_upload_generations SET upload_id = 'invalid'")
      .run();
    corrupt.close();

    const reopened = driver(root);
    await reopened.open();
    await expect(reopened.acquireStorageSession()).rejects.toBeInstanceOf(
      AssetStorageIntegrityError,
    );
    await reopened.close();
  });

  it.each([
    "transaction.after-resource-write",
    "transaction.after-journal-write",
  ] as const)("rolls back at the real %s cut point", async (cutPoint) => {
    const root = createRoot();
    let pending = true;
    const adapter = driver(root, {
      hit(point) {
        if (point === cutPoint && pending) {
          pending = false;
          throw new Error(`crash at ${cutPoint}`);
        }
      },
    });
    await adapter.open();
    const session = await adapter.acquireStorageSession();
    const transaction = await session.begin(OPERATION_ID);
    const snapshot = resource();
    await transaction.stageResource(snapshot);
    await expect(transaction.commit(draft(snapshot))).rejects.toThrow(
      `crash at ${cutPoint}`,
    );
    expect(await session.readResource(RESOURCE_ID)).toBeNull();
    const entries = [];
    for await (const entry of session.readCommittedOperationsAfter(null)) {
      entries.push(entry);
    }
    expect(entries).toHaveLength(0);
    await session.release();
    await adapter.close();
  });

  it("rejects a non-regular owned database target", async () => {
    const root = createRoot();
    mkdirSync(join(root, "extensia.sqlite3"));
    const adapter = driver(root);
    await expect(adapter.open()).rejects.toThrow("not a regular file");
  });

  it("closes the connection when session acquisition fails after locking", async () => {
    const root = createRoot();
    let fail = true;
    const failed = driver(root, {
      hit(point) {
        if (point === "session.after-lock" && fail) {
          fail = false;
          throw new Error("injected acquisition failure");
        }
      },
    });
    await failed.open();
    await expect(failed.acquireStorageSession()).rejects.toThrow(
      "injected acquisition failure",
    );
    await failed.close();

    const next = driver(root);
    await next.open();
    const session = await next.acquireStorageSession();
    await session.release();
    await next.close();
  });

  it("maps a non-SQLite database file to storage integrity failure", async () => {
    const root = createRoot();
    writeFileSync(join(root, "extensia.sqlite3"), "not a SQLite database");
    const adapter = driver(root);
    await adapter.open();
    await expect(adapter.acquireStorageSession()).rejects.toBeInstanceOf(
      ResourceStorageIntegrityError,
    );
    await adapter.close();
  });

  it("fails closed on a real Windows database write-permission denial", async () => {
    if (process.platform !== "win32") return;
    const root = createRoot();
    const seeded = await commitOne(root);
    await seeded.close();
    const databasePath = inspectLocalSqliteProfile(root).databasePath;
    const denied = spawnSync(
      "icacls.exe",
      [databasePath, "/deny", "*S-1-1-0:(W)"],
      { encoding: "utf8" },
    );
    expect(denied.status, denied.stderr).toBe(0);

    const restricted = driver(root);
    let session: Awaited<
      ReturnType<ReturnType<typeof driver>["acquireStorageSession"]>
    > | null = null;
    let permissionError: unknown;
    try {
      await restricted.open();
      session = await restricted.acquireStorageSession();
      const transaction = await session.begin(
        "30000000-0000-4000-8000-000000000002" as IDString,
      );
      const snapshot = resource(
        "10000000-0000-4000-8000-000000000002" as IDString,
      );
      await transaction.stageResource(snapshot);
      await transaction.commit(
        draft(snapshot, "30000000-0000-4000-8000-000000000002" as IDString),
      );
    } catch (error) {
      permissionError = error;
    } finally {
      const restored = spawnSync(
        "icacls.exe",
        [databasePath, "/remove:d", "*S-1-1-0"],
        { encoding: "utf8" },
      );
      expect(restored.status, restored.stderr).toBe(0);
      await session?.release();
      await restricted.close();
    }
    expect(permissionError).toBeInstanceOf(Error);

    const reopened = driver(root);
    await reopened.open();
    const clean = await reopened.acquireStorageSession();
    expect(
      await clean.readResource(
        "10000000-0000-4000-8000-000000000002" as IDString,
      ),
    ).toBeNull();
    await clean.release();
    await reopened.close();
  });

  it.each([
    ["BUSY", "transaction.before-write"],
    ["READONLY", "transaction.before-write"],
    ["FULL", "transaction.after-resource-write"],
    ["IOERR", "transaction.after-journal-write"],
  ] as const)(
    "rolls back controlled SQLite %s failure at %s",
    async (code, cutPoint) => {
      const root = createRoot();
      let pending = true;
      const adapter = driver(root, {
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
      });
      await adapter.open();
      const session = await adapter.acquireStorageSession();
      const transaction = await session.begin(OPERATION_ID);
      const snapshot = resource();
      await transaction.stageResource(snapshot);
      await expect(transaction.commit(draft(snapshot))).rejects.toThrow(
        `injected ${code}`,
      );
      expect(await session.readResource(RESOURCE_ID)).toBeNull();
      await session.release();
      await adapter.close();
    },
  );

  it("retries controlled SQLite CANTOPEN at the reconciliation reopen boundary", async () => {
    const root = createRoot();
    let afterCommit = true;
    let cantOpen = true;
    const adapter = driver(root, {
      hit(point) {
        if (point === "transaction.after-commit" && afterCommit) {
          afterCommit = false;
          throw new Error("receipt unavailable");
        }
        if (point === "reconciliation.before-query" && cantOpen) {
          const error = new Error("injected CANTOPEN") as Error & {
            code: string;
          };
          error.code = "SQLITE_CANTOPEN";
          throw error;
        }
        if (point === "reconciliation.before-reopen") cantOpen = false;
      },
    });
    await adapter.open();
    const session = await adapter.acquireStorageSession();
    const transaction = await session.begin(OPERATION_ID);
    const snapshot = resource();
    await transaction.stageResource(snapshot);
    await expect(transaction.commit(draft(snapshot))).resolves.toMatchObject({
      operation_id: OPERATION_ID,
      sequence: "1",
    });
    await session.release();
    await adapter.close();
  });

  it("rejects noncanonical and ahead journal cursors", async () => {
    const root = createRoot();
    const adapter = await commitOne(root);
    const session = await adapter.acquireStorageSession();
    await expect(async () => {
      for await (const _entry of session.readCommittedOperationsAfter(
        "01" as never,
      )) {
        void _entry;
      }
    }).rejects.toBeInstanceOf(ResourceStorageIntegrityError);
    await expect(async () => {
      for await (const _entry of session.readCommittedOperationsAfter(
        "2" as never,
      )) {
        void _entry;
      }
    }).rejects.toBeInstanceOf(ResourceStorageIntegrityError);
    await session.release();
    await adapter.close();
  });
});

async function waitForOutput(
  child: ReturnType<typeof spawn>,
  expected: string,
): Promise<void> {
  await new Promise<void>((resolveOutput, rejectOutput) => {
    const timeout = setTimeout(() => {
      rejectOutput(new Error(`Timed out waiting for ${expected}`));
    }, 5_000);
    child.stdout?.on("data", (chunk: Buffer) => {
      if (chunk.toString("utf8").includes(expected)) {
        clearTimeout(timeout);
        resolveOutput();
      }
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectOutput(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      rejectOutput(new Error(`Child exited before evidence: ${code}`));
    });
  });
}
