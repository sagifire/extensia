import { mkdtempSync, openSync, closeSync, fsyncSync, fdatasyncSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";

const root = mkdtempSync(join(tmpdir(), "extensia-p4dg1-"));
const result = { node: process.version, platform: process.platform, arch: process.arch };
try {
  const source = join(root, "source");
  const target = join(root, "target");
  writeFileSync(source, "source");
  writeFileSync(target, "target");
  const file = openSync(source, "r+");
  fdatasyncSync(file); fsyncSync(file); closeSync(file);
  renameSync(source, target);
  result.file_sync_and_replace = "ok";
  try {
    const directory = openSync(root, "r");
    try { fsyncSync(directory); result.directory_sync = "ok"; }
    finally { closeSync(directory); }
  } catch (error) { result.directory_sync = error?.code ?? error?.name; }
  const fs = await import("node:fs");
  result.node_flock = typeof fs.flock;
  result.node_lockf = typeof fs.lockf;
  const db = new DatabaseSync(join(root, "probe.sqlite3"), { timeout: 50 });
  db.exec("PRAGMA journal_mode=DELETE; PRAGMA synchronous=EXTRA; PRAGMA locking_mode=EXCLUSIVE; CREATE TABLE evidence(id TEXT PRIMARY KEY); BEGIN IMMEDIATE; INSERT INTO evidence VALUES ('commit-1'); COMMIT;");
  result.sqlite_version = db.prepare("SELECT sqlite_version() AS version").get().version;
  result.sqlite_journal_mode = db.prepare("PRAGMA journal_mode").get().journal_mode;
  result.sqlite_synchronous = db.prepare("PRAGMA synchronous").get().synchronous;
  result.sqlite_locking_mode = db.prepare("PRAGMA locking_mode").get().locking_mode;
  result.sqlite_commit_visible = db.prepare("SELECT id FROM evidence").get().id;
  result.sqlite_is_transaction = db.isTransaction;
  const competitor = new DatabaseSync(join(root, "probe.sqlite3"), { timeout: 1 });
  try {
    competitor.prepare("SELECT id FROM evidence").get();
    result.sqlite_competitor_after_commit_while_owner_open = "unexpected-access";
  } catch (error) {
    result.sqlite_competitor_after_commit_while_owner_open = error?.code ?? error?.message;
  }
  db.close();
  result.sqlite_competitor_after_owner_release = competitor.prepare("SELECT id FROM evidence").get().id;
  competitor.close();
  console.log(JSON.stringify(result, null, 2));
} finally {
  rmSync(root, { recursive: true, force: true });
}
