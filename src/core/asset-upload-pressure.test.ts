import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getHeapStatistics } from "node:v8";

import { afterEach, expect, it } from "vitest";

import type { ExtensiaModule } from "../public/contracts.js";
import {
  createExtensia,
  resolveInternalAssetUploadPort,
} from "../public/extensia.js";
import { defineFullResourceDriver } from "../public/full-resource-driver.js";
import { createLocalSqliteFullResourceDriver } from "../storage/local-sqlite-resource-driver.js";
import {
  ASSET_UPLOAD_CHUNK_BYTES,
  ASSET_UPLOAD_MAX_BYTES,
  ASSET_UPLOAD_MAX_CHUNKS,
} from "../storage/asset-upload-capability.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

function fileBytes(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

async function createInitialUpload(module: ExtensiaModule) {
  const storage = module.storage()!;
  const resource = await storage.createResource({ title: "pressure" });
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
  if (!asset.ok || asset.value.asset === null) throw new Error("create failed");
  return {
    assetId: asset.value.asset.id,
    resourceId: resource.value.resource.data.id,
  };
}

it("measures the bounded SQLite upload transport envelope", async () => {
  const rootPath = mkdtempSync(join(tmpdir(), "extensia-upload-pressure-"));
  roots.push(rootPath);
  const databasePath = join(rootPath, "extensia.sqlite3");
  let rollbackProbeArmed = false;
  let finishRollbackProbeArmed = false;
  let finishRollbackJournalPeakBytes = 0;
  let stageRollbackJournalPeakBytes = 0;
  let stageMemoryBaseline = getHeapStatistics().external_memory;
  let observedExternalMemoryPeakDelta = 0;
  let measureStageMemory = true;
  const adapter = createLocalSqliteFullResourceDriver({
    faults: {
      hit(point) {
        if (point === "asset-upload.stage.after-write") {
          if (measureStageMemory) {
            observedExternalMemoryPeakDelta = Math.max(
              observedExternalMemoryPeakDelta,
              getHeapStatistics().external_memory - stageMemoryBaseline,
            );
          }
          if (rollbackProbeArmed) {
            stageRollbackJournalPeakBytes = fileBytes(
              `${databasePath}-journal`,
            );
            rollbackProbeArmed = false;
            throw new Error("rollback journal pressure probe");
          }
        }
        if (point === "transaction.before-commit" && finishRollbackProbeArmed) {
          finishRollbackJournalPeakBytes = fileBytes(`${databasePath}-journal`);
          finishRollbackProbeArmed = false;
          throw new Error("finish rollback journal pressure probe");
        }
      },
    },
    profile: "candidate-local-filesystem",
    reconciliationDelayMs: 1,
    rootPath,
    timeoutMs: 1_000,
  });
  const module = createExtensia({
    storage: { driver: defineFullResourceDriver(adapter) },
  });
  await expect(module.start()).resolves.toMatchObject({ ok: true });
  const port = resolveInternalAssetUploadPort(module);
  if (port === null) throw new Error("Asset upload port is missing");
  const ids = await createInitialUpload(module);
  const resolved = await port.resolve(ids.resourceId, ids.assetId);
  if (!resolved.ok) throw new Error(resolved.error.code);

  const boundaryBytes = new Uint8Array(ASSET_UPLOAD_CHUNK_BYTES + 1);
  await expect(
    port.stage(resolved.value, boundaryBytes),
  ).resolves.toMatchObject({
    ok: true,
    value: { byte_length: ASSET_UPLOAD_CHUNK_BYTES + 1 },
  });
  const boundaryDatabase = new DatabaseSync(databasePath, { readOnly: true });
  expect(
    boundaryDatabase
      .prepare(
        "SELECT count(*) AS count FROM payload_chunks WHERE payload_id = ?",
      )
      .get(resolved.value.upload_id),
  ).toEqual({ count: 2 });
  boundaryDatabase.close();

  stageMemoryBaseline = getHeapStatistics().external_memory;
  const payload = new Uint8Array(ASSET_UPLOAD_MAX_BYTES);
  for (let offset = 0; offset < payload.byteLength; offset += 4_096) {
    payload[offset] = (offset / 4_096) % 251;
  }
  const databaseBeforeBytes = fileBytes(databasePath);
  const timerStarted = performance.now();
  let eventLoopDelayMs = 0;
  const timer = new Promise<void>((resolve) => {
    setTimeout(() => {
      eventLoopDelayMs = performance.now() - timerStarted;
      resolve();
    }, 0);
  });
  const stageStarted = performance.now();
  await expect(port.stage(resolved.value, payload)).resolves.toMatchObject({
    ok: true,
    value: { byte_length: ASSET_UPLOAD_MAX_BYTES },
  });
  measureStageMemory = false;
  const maxDatabase = new DatabaseSync(databasePath, { readOnly: true });
  expect(
    maxDatabase
      .prepare(
        "SELECT count(*) AS count FROM payload_chunks WHERE payload_id = ?",
      )
      .get(resolved.value.upload_id),
  ).toEqual({ count: ASSET_UPLOAD_MAX_CHUNKS });
  maxDatabase.close();
  const stageDurationMs = performance.now() - stageStarted;
  await timer;
  const databaseAfterBytes = fileBytes(databasePath);
  const finishTimerStarted = performance.now();
  let finishEventLoopDelayMs = 0;
  const finishTimer = new Promise<void>((resolve) => {
    setTimeout(() => {
      finishEventLoopDelayMs = performance.now() - finishTimerStarted;
      resolve();
    }, 0);
  });
  const finishStarted = performance.now();
  await expect(port.finish(resolved.value)).resolves.toMatchObject({
    ok: true,
  });
  const finishDurationMs = performance.now() - finishStarted;
  await finishTimer;

  const replacement = await port.begin(ids.resourceId, ids.assetId);
  if (!replacement.ok) throw new Error(replacement.error.code);
  const replacementBytes = new Uint8Array(ASSET_UPLOAD_MAX_BYTES);
  replacementBytes.fill(173);
  rollbackProbeArmed = true;
  await expect(
    port.stage(replacement.value.handle, replacementBytes),
  ).resolves.toEqual({
    error: { code: "STORAGE_WRITE_FAILED" },
    ok: false,
  });
  const lastReady = await port.read(ids.resourceId, ids.assetId);
  expect(lastReady.ok).toBe(true);
  if (lastReady.ok) {
    expect(lastReady.value.bytes.byteLength).toBe(ASSET_UPLOAD_MAX_BYTES);
    expect(lastReady.value.bytes[4_096]).toBe(1);
  }
  await expect(
    port.stage(replacement.value.handle, replacementBytes),
  ).resolves.toMatchObject({ ok: true });
  const replacementDatabasePeakBytes = fileBytes(databasePath);
  finishRollbackProbeArmed = true;
  await expect(port.finish(replacement.value.handle)).resolves.toEqual({
    error: { code: "STORAGE_WRITE_FAILED" },
    ok: false,
  });
  const afterFailedFinish = await port.read(ids.resourceId, ids.assetId);
  expect(afterFailedFinish.ok && afterFailedFinish.value.bytes[4_096]).toBe(1);
  await expect(port.finish(replacement.value.handle)).resolves.toMatchObject({
    ok: true,
  });
  const replacementRead = await port.read(ids.resourceId, ids.assetId);
  expect(replacementRead.ok && replacementRead.value.bytes[4_096]).toBe(173);
  const settledDatabase = new DatabaseSync(databasePath, { readOnly: true });
  expect(
    settledDatabase
      .prepare(
        "SELECT type, count(*) AS count FROM journal WHERE type LIKE 'asset.upload.%' GROUP BY type ORDER BY type",
      )
      .all(),
  ).toEqual([
    { count: 1, type: "asset.upload.begin" },
    { count: 2, type: "asset.upload.finish" },
  ]);
  settledDatabase.close();

  const measurements = Object.freeze({
    chunk_bytes: ASSET_UPLOAD_CHUNK_BYTES,
    database_growth_bytes: databaseAfterBytes - databaseBeforeBytes,
    event_loop_delay_ms: Math.round(eventLoopDelayMs * 100) / 100,
    finish_event_loop_delay_ms: Math.round(finishEventLoopDelayMs * 100) / 100,
    finish_transaction_ms: Math.round(finishDurationMs * 100) / 100,
    max_chunks: ASSET_UPLOAD_MAX_CHUNKS,
    max_payload_bytes: ASSET_UPLOAD_MAX_BYTES,
    observed_external_memory_peak_delta_bytes: observedExternalMemoryPeakDelta,
    replacement_database_peak_bytes: replacementDatabasePeakBytes,
    finish_rollback_journal_peak_bytes: finishRollbackJournalPeakBytes,
    stage_rollback_journal_peak_bytes: stageRollbackJournalPeakBytes,
    stage_transaction_ms: Math.round(stageDurationMs * 100) / 100,
  });
  console.info("asset-upload-pressure", JSON.stringify(measurements));

  expect(measurements.max_chunks).toBe(256);
  expect(measurements.database_growth_bytes).toBeGreaterThanOrEqual(
    ASSET_UPLOAD_MAX_BYTES,
  );
  expect(measurements.database_growth_bytes).toBeLessThan(
    ASSET_UPLOAD_MAX_BYTES * 2,
  );
  expect(measurements.stage_rollback_journal_peak_bytes).toBeGreaterThan(0);
  expect(measurements.stage_rollback_journal_peak_bytes).toBeLessThan(
    ASSET_UPLOAD_MAX_BYTES,
  );
  expect(measurements.finish_rollback_journal_peak_bytes).toBeGreaterThan(
    ASSET_UPLOAD_MAX_BYTES,
  );
  expect(measurements.finish_rollback_journal_peak_bytes).toBeLessThan(
    ASSET_UPLOAD_MAX_BYTES * 2,
  );
  expect(measurements.observed_external_memory_peak_delta_bytes).toBeLessThan(
    ASSET_UPLOAD_MAX_BYTES * 6,
  );
  expect(measurements.stage_transaction_ms).toBeLessThan(30_000);
  expect(measurements.finish_transaction_ms).toBeLessThan(30_000);
  await module.stop();
}, 30_000);
