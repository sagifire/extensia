import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../../../../../");
const moduleUrl = (path) => pathToFileURL(join(projectRoot, path)).href;
const ACTOR_ID = "20000000-0000-4000-8000-000000000001";
const OPERATION_ID = "30000000-0000-4000-8000-000000000001";
const RESOURCE_ID = "10000000-0000-4000-8000-000000000001";

if (process.argv[2] === "child") {
  await runChild(process.argv[3], process.argv[4]);
} else {
  await runParent();
}

async function loadRuntime() {
  const [driver, integrity, snapshots] = await Promise.all([
    import(moduleUrl("dist/storage/local-sqlite-resource-driver.js")),
    import(moduleUrl("dist/storage/resource-journal-integrity.js")),
    import(moduleUrl("dist/domain/snapshots.js")),
  ]);
  return { ...driver, ...integrity, ...snapshots };
}

function snapshot(buildResourceSnapshot) {
  return buildResourceSnapshot({
    assets: [],
    data: {
      created_at: 1,
      description: null,
      hidden: false,
      id: RESOURCE_ID,
      is_deleted: false,
      locked: false,
      order_index: 0,
      parent_id: null,
      title: "child-cut-point",
      updated_at: 1,
    },
    kv: {},
    marks: [],
  });
}

async function runChild(root, cutPoint) {
  const {
    buildResourceSnapshot,
    computeResourceWriteSetFingerprint,
    createLocalSqliteFullResourceDriver,
  } = await loadRuntime();
  const resource = snapshot(buildResourceSnapshot);
  const adapter = createLocalSqliteFullResourceDriver({
    faults: {
      hit(point) {
        if (point === cutPoint) {
          process.abort();
        }
      },
    },
    profile: "candidate-local-filesystem",
    rootPath: root,
  });
  await adapter.open();
  const session = await adapter.acquireStorageSession();
  const transaction = await session.begin(OPERATION_ID);
  await transaction.stageResource(resource);
  await transaction.commit({
    actor_id: ACTOR_ID,
    affected_resources: [RESOURCE_ID],
    changes: [{ kind: "resource.upsert", resource_id: RESOURCE_ID }],
    committed_at: 2,
    operation_id: OPERATION_ID,
    schema_version: 1,
    type: "resource.create",
    write_set_fingerprint: computeResourceWriteSetFingerprint([resource]),
  });
  process.exit(70);
}

async function inspect(root) {
  const { createLocalSqliteFullResourceDriver } = await loadRuntime();
  const adapter = createLocalSqliteFullResourceDriver({
    profile: "candidate-local-filesystem",
    rootPath: root,
  });
  await adapter.open();
  const session = await adapter.acquireStorageSession();
  const resource = await session.readResource(RESOURCE_ID);
  const journal = [];
  for await (const entry of session.readCommittedOperationsAfter(null)) {
    journal.push(entry);
  }
  const recovery = session.recovery;
  await session.release();
  await adapter.close();
  return { journal: journal.length, recovery: recovery.status, resource: resource !== null };
}

async function runParent() {
  const roots = [];
  try {
    const beforeRoot = mkdtempSync(join(tmpdir(), "extensia-sqlite-child-pre-"));
    roots.push(beforeRoot);
    const before = spawnSync(
      process.execPath,
      [fileURLToPath(import.meta.url), "child", beforeRoot, "transaction.after-journal-write"],
      { encoding: "utf8", timeout: 10_000 },
    );
    if (before.status === 0) throw new Error("pre-COMMIT child did not abort");
    const beforeState = await inspect(beforeRoot);
    if (beforeState.resource || beforeState.journal !== 0) {
      throw new Error("pre-COMMIT crash became visible");
    }

    const afterRoot = mkdtempSync(join(tmpdir(), "extensia-sqlite-child-post-"));
    roots.push(afterRoot);
    const after = spawnSync(
      process.execPath,
      [fileURLToPath(import.meta.url), "child", afterRoot, "transaction.after-commit"],
      { encoding: "utf8", timeout: 10_000 },
    );
    if (after.status === 0) throw new Error("post-COMMIT child did not abort");
    const afterState = await inspect(afterRoot);
    if (!afterState.resource || afterState.journal !== 1) {
      throw new Error("post-COMMIT crash was not durably visible");
    }

    console.log(
      JSON.stringify(
        {
          after_commit_before_receipt: afterState,
          before_commit_after_journal_write: beforeState,
          compiled_full_driver_path: true,
        },
        null,
        2,
      ),
    );
  } finally {
    for (const root of roots) rmSync(root, { force: true, recursive: true });
  }
}
