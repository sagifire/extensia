import {
  existsSync,
  mkdtempSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { DatabaseSync } from "node:sqlite";

import {
  createLocalSqliteFullResourceDriver,
  inspectLocalSqliteProfile,
} from "../../../../../dist/storage/local-sqlite-resource-driver.js";

const root = mkdtempSync(join(tmpdir(), "extensia-p4-wp1-payload-probe-"));
try {
  const driver = createLocalSqliteFullResourceDriver({ rootPath: root });
  await driver.open();
  const session = await driver.acquireStorageSession();
  await session.release();
  await driver.close();

  const profile = inspectLocalSqliteProfile(root);
  const journalPath = `${profile.databasePath}-journal`;
  const before = process.memoryUsage();
  const databaseBytesBefore = profile.databaseBytes;
  const db = new DatabaseSync(profile.databasePath);
  const sqliteVersion = db.prepare("SELECT sqlite_version() AS version").get()
    .version;
  const chunk = new Uint8Array(64 * 1024);
  const chunkCount = 16;
  const started = performance.now();
  db.exec("PRAGMA journal_mode=DELETE; PRAGMA synchronous=EXTRA; BEGIN IMMEDIATE");
  db.prepare(
    "INSERT INTO payloads(payload_id, digest, byte_length) VALUES (?, ?, ?)",
  ).run("probe", "0".repeat(64), chunkCount * chunk.byteLength);
  const insert = db.prepare(
    "INSERT INTO payload_chunks(payload_id, chunk_index, bytes) VALUES (?, ?, ?)",
  );
  for (let index = 0; index < chunkCount; index += 1) {
    insert.run("probe", index, chunk);
  }
  const stagedBytes = db
    .prepare("SELECT sum(length(bytes)) AS bytes FROM payload_chunks")
    .get().bytes;
  const during = process.memoryUsage();
  const databaseBytesDuring = statSync(profile.databasePath).size;
  const rollbackJournalBytesDuring = existsSync(journalPath)
    ? statSync(journalPath).size
    : 0;
  db.exec("ROLLBACK");
  const elapsedMilliseconds = performance.now() - started;
  db.close();
  const after = process.memoryUsage();

  const reopened = createLocalSqliteFullResourceDriver({ rootPath: root });
  await reopened.open();
  const clean = await reopened.acquireStorageSession();
  await clean.release();
  await reopened.close();

  console.log(
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        sqlite_version: sqliteVersion,
        chunk_bytes: chunk.byteLength,
        chunk_count: chunkCount,
        staged_bytes: stagedBytes,
        transaction_milliseconds: Number(elapsedMilliseconds.toFixed(3)),
        database_bytes_before: databaseBytesBefore,
        database_bytes_during: databaseBytesDuring,
        database_bytes_after_rollback: statSync(profile.databasePath).size,
        rollback_journal_bytes_during: rollbackJournalBytesDuring,
        rollback_journal_present_after: existsSync(journalPath),
        memory_delta_during: {
          heap_used: during.heapUsed - before.heapUsed,
          external: during.external - before.external,
          array_buffers: during.arrayBuffers - before.arrayBuffers,
        },
        memory_delta_after: {
          heap_used: after.heapUsed - before.heapUsed,
          external: after.external - before.external,
          array_buffers: after.arrayBuffers - before.arrayBuffers,
        },
        reopen_validation: "ok",
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(root, { force: true, recursive: true });
}
