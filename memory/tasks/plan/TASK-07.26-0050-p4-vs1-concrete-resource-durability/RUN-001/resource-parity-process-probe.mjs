import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../../../../../");
const moduleUrl = (path) => pathToFileURL(join(projectRoot, path)).href;

if (process.argv[2] === "seed") {
  await seed(process.argv[3]);
} else if (process.argv[2] === "restart") {
  await restart(process.argv[3], process.argv[4], process.argv[5]);
} else if (process.argv[2] === "cut") {
  await cut(process.argv[3], process.argv[4]);
} else {
  await parent();
}

async function runtime() {
  return import(moduleUrl("dist/composition/local-sqlite-runtime.js"));
}

async function driver() {
  return import(moduleUrl("dist/storage/local-sqlite-resource-driver.js"));
}

function storage(rootPath, extra = {}) {
  return {
    profile: "candidate-local-filesystem",
    reconciliationDelayMs: 1,
    rootPath,
    timeoutMs: 100,
    ...extra,
  };
}

function value(result) {
  if (!result.ok) throw new Error(`Operation failed: ${result.error.code}`);
  return result.value;
}

async function seed(rootPath) {
  const { createLocalSqliteExtensia } = await runtime();
  const extensia = createLocalSqliteExtensia({
    mode: "full",
    storage: storage(rootPath),
  });
  value(await extensia.start());
  const operationWallMs = {};
  const measured = async (name, action) => {
    const started = performance.now();
    const result = await action();
    operationWallMs[name] = Number((performance.now() - started).toFixed(3));
    return result;
  };
  const parentResource = value(
    await measured("resource.create.parent", () =>
      extensia.storage().createResource({ title: "process-parent" }),
    ),
  ).resource;
  const childResource = value(
    await measured("resource.create.child", () =>
      extensia.storage().createResource({ title: "process-child" }),
    ),
  ).resource;
  value(
    await measured("resource.move", () =>
      extensia.storage().moveResource(childResource.data.id, {
        order_index: 0,
        parent_id: parentResource.data.id,
      }),
    ),
  );
  value(
    await measured("resource.marks.set", () =>
      extensia
        .storage()
        .setMarks(childResource.data.id, [
          { name: "durable", type: "probe", value: 1 },
        ]),
    ),
  );
  value(
    await measured("resource.kv.set", () =>
      extensia
        .storage()
        .setKV(childResource.data.id, "probe", { state: "durable" }),
    ),
  );
  value(await extensia.stop());
  process.stdout.write(
    JSON.stringify({
      child: childResource.data.id,
      operation_wall_ms: operationWallMs,
      parent: parentResource.data.id,
    }),
  );
}

async function restart(rootPath, parentId, childId) {
  const { createLocalSqliteExtensia } = await runtime();
  const extensia = createLocalSqliteExtensia({
    mode: "full",
    storage: storage(rootPath),
  });
  value(await extensia.start());
  const tree = value(await extensia.query().getResourceTree(parentId));
  const child = value(await extensia.query().getResource(childId));
  value(
    await extensia.storage().updateResource(parentId, {
      title: "process-parent-restarted",
    }),
  );
  value(await extensia.stop());
  process.stdout.write(
    JSON.stringify({
      child: {
        kv: child.kv,
        marks: child.marks,
        order_index: child.data.order_index,
        parent_id: child.data.parent_id,
      },
      tree: tree.children,
    }),
  );
}

async function cut(rootPath, point) {
  const { createLocalSqliteExtensia } = await runtime();
  const extensia = createLocalSqliteExtensia({
    mode: "full",
    storage: storage(rootPath, {
      faults: {
        hit(current) {
          if (current === point) process.abort();
        },
      },
    }),
  });
  value(await extensia.start());
  await extensia.storage().createResource({ title: point });
  process.exit(70);
}

function child(args) {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(import.meta.url), ...args],
    {
      encoding: "utf8",
      timeout: 15_000,
    },
  );
  if (result.error) throw result.error;
  return result;
}

async function inspect(rootPath) {
  const { createLocalSqliteFullResourceDriver } = await driver();
  const adapter = createLocalSqliteFullResourceDriver(storage(rootPath));
  await adapter.open();
  const session = await adapter.acquireStorageSession();
  const resources = [];
  const journal = [];
  for await (const resource of session.listResources())
    resources.push(resource);
  for await (const entry of session.readCommittedOperationsAfter(null)) {
    journal.push(entry);
  }
  const recovery = session.recovery.status;
  await session.release();
  await adapter.close();
  return { journal, recovery, resources };
}

async function parent() {
  const roots = [];
  try {
    const restartRoot = mkdtempSync(join(tmpdir(), "extensia-vs1-restart-"));
    roots.push(restartRoot);
    const seeded = child(["seed", restartRoot]);
    if (seeded.status !== 0) throw new Error(seeded.stderr || "seed failed");
    const ids = JSON.parse(seeded.stdout);
    const restarted = child(["restart", restartRoot, ids.parent, ids.child]);
    if (restarted.status !== 0)
      throw new Error(restarted.stderr || "restart failed");
    const restartEvidence = JSON.parse(restarted.stdout);
    const measuredOperations = Object.values(ids.operation_wall_ms);
    if (
      restartEvidence.child.parent_id !== ids.parent ||
      restartEvidence.child.order_index !== 0 ||
      restartEvidence.child.marks[0]?.name !== "durable" ||
      restartEvidence.child.kv.probe?.state !== "durable" ||
      restartEvidence.tree[0]?.id !== ids.child
    ) {
      throw new Error("fresh-process read-back lost accepted Resource state");
    }
    if (
      measuredOperations.length !== 5 ||
      measuredOperations.some(
        (milliseconds) =>
          typeof milliseconds !== "number" ||
          !Number.isFinite(milliseconds) ||
          milliseconds < 0,
      )
    ) {
      throw new Error("operation wall-clock envelope was not measured");
    }
    const restartState = await inspect(restartRoot);
    if (
      restartState.journal.length !== 6 ||
      restartState.journal.some(
        (entry, index) => entry.sequence !== String(index + 1),
      )
    ) {
      throw new Error("fresh-process journal is not contiguous");
    }

    const beforeRoot = mkdtempSync(join(tmpdir(), "extensia-vs1-pre-commit-"));
    roots.push(beforeRoot);
    const before = child([
      "cut",
      beforeRoot,
      "transaction.after-journal-write",
    ]);
    if (before.status === 0) throw new Error("pre-COMMIT child did not abort");
    const beforeState = await inspect(beforeRoot);
    if (
      beforeState.resources.length !== 0 ||
      beforeState.journal.length !== 0
    ) {
      throw new Error("pre-COMMIT process crash became visible");
    }

    const afterRoot = mkdtempSync(join(tmpdir(), "extensia-vs1-post-commit-"));
    roots.push(afterRoot);
    const after = child(["cut", afterRoot, "transaction.after-commit"]);
    if (after.status === 0) throw new Error("post-COMMIT child did not abort");
    const afterState = await inspect(afterRoot);
    if (afterState.resources.length !== 1 || afterState.journal.length !== 1) {
      throw new Error("post-COMMIT process crash lost committed state");
    }

    console.log(
      JSON.stringify(
        {
          full_production_path: true,
          post_commit_before_receipt: {
            journal: afterState.journal.length,
            recovery: afterState.recovery,
            resources: afterState.resources.length,
          },
          pre_commit_after_journal_write: {
            journal: beforeState.journal.length,
            recovery: beforeState.recovery,
            resources: beforeState.resources.length,
          },
          restart: {
            journal: restartState.journal.length,
            max_operation_wall_ms: Math.max(...measuredOperations),
            operation_wall_ms: ids.operation_wall_ms,
            resources: restartState.resources.length,
            semantic_read_back: true,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    for (const root of roots) rmSync(root, { force: true, recursive: true });
  }
}
