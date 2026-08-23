import { createHash } from "node:crypto";
import { fork } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { monitorEventLoopDelay } from "node:perf_hooks";

const runDirectory = dirname(fileURLToPath(import.meta.url));
const workerPath = join(runDirectory, "multi-instance-worker.mjs");
const outputPath = join(runDirectory, "process-evidence.json");
const roots = [];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function storageRoot() {
  const root = mkdtempSync(join(tmpdir(), "extensia-p5-vs2-"));
  roots.push(root);
  return root;
}

function storageSnapshot(root) {
  return readdirSync(root)
    .sort()
    .map((name) => {
      const path = join(root, name);
      const stat = statSync(path);
      return {
        bytes: stat.size,
        hash: createHash("sha256").update(readFileSync(path)).digest("hex"),
        mtime_ms: stat.mtimeMs,
        name,
      };
    });
}

function spawnWorker(root, mode, synchronization = "manual") {
  const child = fork(workerPath, [root, mode, synchronization], {
    serialization: "advanced",
    stdio: ["ignore", "ignore", "inherit", "ipc"],
  });
  let nextId = 1;
  const pending = new Map();
  child.on("message", (message) => {
    const waiter = pending.get(message.id);
    if (waiter === undefined) return;
    pending.delete(message.id);
    waiter.resolve(message.value);
  });
  child.on("exit", (code) => {
    for (const waiter of pending.values()) {
      waiter.reject(new Error(`Worker exited with code ${code}`));
    }
    pending.clear();
  });
  return {
    child,
    request(action, payload = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Worker timeout: ${action}`));
        }, 30_000);
        pending.set(id, {
          reject,
          resolve(value) {
            clearTimeout(timeout);
            resolve(value);
          },
        });
        child.send({ action, id, ...payload });
      });
    },
    async shutdown() {
      if (child.exitCode !== null) return;
      await this.request("stop").catch(() => undefined);
      child.disconnect();
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          child.kill();
          resolve();
        }, 2_000);
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    },
  };
}

function success(result, label) {
  invariant(
    result?.ok === true,
    `${label} did not succeed: ${JSON.stringify(result)}`,
  );
  return result.value;
}

async function exerciseReadonlyLockWait(root, reader, holdMs) {
  const before = (await reader.request("diagnostics")).length;
  const blocker = new DatabaseSync(join(root, "extensia.sqlite3"), {
    timeout: 1_000,
  });
  blocker.exec("PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE;");
  const startedAt = performance.now();
  const refresh = reader.request("refresh");
  await new Promise((resolve) => setTimeout(resolve, holdMs));
  blocker.exec("COMMIT;");
  blocker.close();
  success(await refresh, `readonly lock wait ${holdMs}`);
  return {
    elapsed_ms: performance.now() - startedAt,
    hold_ms: holdMs,
    samples: (await reader.request("diagnostics")).slice(before),
  };
}

async function refreshAndGet(observer, resourceId, title) {
  success(await observer.request("refresh"), "refresh");
  const value = success(
    await observer.request("get", { resourceId }),
    "observed Resource",
  );
  invariant(value.data.title === title, `Expected observed title ${title}`);
  return value;
}

async function fullFullScenario() {
  const root = storageRoot();
  const first = spawnWorker(root, "full");
  const second = spawnWorker(root, "full");
  try {
    success(await first.request("start"), "full/full first start");
    success(await second.request("start"), "full/full second start");
    const rootResource = success(
      await first.request("create", { input: { title: "root" } }),
      "first create",
    ).resource;
    success(
      await first.request("get", { resourceId: rootResource.data.id }),
      "local read-after-write",
    );
    await refreshAndGet(second, rootResource.data.id, "root");
    success(
      await second.request("update", {
        input: { title: "root-updated" },
        resourceId: rootResource.data.id,
      }),
      "second update",
    );
    await refreshAndGet(first, rootResource.data.id, "root-updated");

    const child = success(
      await first.request("create", {
        input: { title: "child" },
      }),
      "child create",
    ).resource;
    success(
      await first.request("move", {
        input: { order_index: 0, parent_id: rootResource.data.id },
        resourceId: child.data.id,
      }),
      "child placement",
    );
    const destination = success(
      await first.request("create", { input: { title: "destination" } }),
      "destination create",
    ).resource;
    success(await second.request("refresh"), "second structural refresh");
    success(
      await second.request("move", {
        input: { order_index: 0, parent_id: destination.data.id },
        resourceId: child.data.id,
      }),
      "external move",
    );
    success(await first.request("refresh"), "first move refresh");
    const tree = success(
      await first.request("tree", { resourceId: destination.data.id }),
      "moved tree",
    );
    invariant(tree.children[0]?.id === child.data.id, "Move was not visible");

    success(
      await first.request("marks", {
        marks: [{ name: "sync", type: "phase", value: 5 }],
        resourceId: rootResource.data.id,
      }),
      "Mark replacement",
    );
    success(
      await first.request("kv", {
        namespace: "sync",
        resourceId: rootResource.data.id,
        value: { source: "full-full" },
      }),
      "KV replacement",
    );
    success(await second.request("refresh"), "Mark refresh");
    const marked = success(
      await second.request("get", { resourceId: rootResource.data.id }),
      "marked Resource",
    );
    invariant(marked.marks[0]?.name === "sync", "Mark was not visible");
    invariant(marked.kv.sync?.source === "full-full", "KV was not visible");

    success(
      await second.request("asset", {
        resourceId: rootResource.data.id,
        url: "https://example.com/p5-vs2.jpg",
      }),
      "Asset create",
    );
    success(await first.request("refresh"), "Asset refresh");
    const withAsset = success(
      await first.request("get", { resourceId: rootResource.data.id }),
      "Asset owner",
    );
    invariant(withAsset.assets.length === 1, "Asset was not visible");

    success(
      await second.request("delete", { resourceId: child.data.id }),
      "leaf delete",
    );
    success(await first.request("refresh"), "delete refresh");
    const deleted = await first.request("get", { resourceId: child.data.id });
    invariant(
      deleted?.ok === false && deleted.error?.code === "RESOURCE_NOT_FOUND",
      "Delete was not visible",
    );

    const contention = [];
    for (let index = 0; index < 8; index += 1) {
      contention.push(
        await Promise.all([
          first.request("create", { input: { title: `left-${index}` } }),
          second.request("create", { input: { title: `right-${index}` } }),
        ]),
      );
    }
    const flat = contention.flat();
    invariant(
      flat.every(
        (item) =>
          item.ok === true || item.error?.code === "STORAGE_LOCK_FAILED",
      ),
      "Contention produced a hidden or unsupported outcome",
    );

    await second.shutdown();
    success(
      await first.request("update", {
        input: { title: "restart-visible" },
        resourceId: rootResource.data.id,
      }),
      "restart update",
    );
    const restarted = spawnWorker(root, "full");
    try {
      success(await restarted.request("start"), "restarted full start");
      const visible = success(
        await restarted.request("get", { resourceId: rootResource.data.id }),
        "restarted full read",
      );
      invariant(
        visible.data.title === "restart-visible",
        "Restart missed state",
      );
      return {
        contention: {
          lock_failures: flat.filter(
            (item) => item.error?.code === "STORAGE_LOCK_FAILED",
          ).length,
          successes: flat.filter((item) => item.ok === true).length,
        },
        diagnostics: {
          first: await first.request("diagnostics"),
          restarted: await restarted.request("diagnostics"),
        },
        operation_families: [
          "resource.create",
          "resource.update",
          "resource.move",
          "resource.delete",
          "resource.marks.set",
          "resource.kv.set",
          "asset.create",
        ],
        restart: true,
      };
    } finally {
      await restarted.shutdown();
    }
  } finally {
    await first.shutdown();
    await second.shutdown();
  }
}

async function fullReadonlyScenario() {
  const root = storageRoot();
  const writer = spawnWorker(root, "full");
  const reader = spawnWorker(root, "readonly");
  try {
    success(await writer.request("start"), "writer start");
    success(await reader.request("start"), "reader start");
    const target = success(
      await writer.request("create", { input: { title: "distance-base" } }),
      "distance base",
    ).resource;
    await refreshAndGet(reader, target.data.id, "distance-base");

    const distances = [];
    for (const count of [0, 1, 32, 256, 257]) {
      if (count > 0) {
        const updates = await writer.request("repeat-updates", {
          count,
          prefix: `distance-${count}`,
          resourceId: target.data.id,
        });
        invariant(
          updates.successes === count,
          `Distance ${count} write failed`,
        );
      }
      success(await reader.request("refresh"), `distance ${count} refresh`);
      const samples = await reader.request("diagnostics");
      distances.push({ count, sample: samples.at(-1) });
    }
    invariant(
      distances.map((item) => item.sample.strategy).join(",") ===
        "at-head,delta,delta,delta,rebuild",
      "Distance strategy matrix is incorrect",
    );

    const successfulLockWait = await exerciseReadonlyLockWait(
      root,
      reader,
      140,
    );
    invariant(
      successfulLockWait.samples.some(
        (sample) => sample.outcome === "success" && sample.actual_wait_ms >= 75,
      ),
      "Successful SQLite lock wait was not measured",
    );
    const retryRecovery = await exerciseReadonlyLockWait(root, reader, 400);
    invariant(
      retryRecovery.samples.some((sample) => sample.outcome === "lock") &&
        retryRecovery.samples.some((sample) => sample.outcome === "success"),
      `Readonly retry chain did not expose lock failure and recovery: ${JSON.stringify(retryRecovery.samples)}`,
    );

    const child = success(
      await writer.request("create", { input: { title: "readonly-child" } }),
      "readonly child create",
    ).resource;
    const destination = success(
      await writer.request("create", {
        input: { title: "readonly-destination" },
      }),
      "readonly destination create",
    ).resource;
    success(
      await writer.request("move", {
        input: { order_index: 0, parent_id: destination.data.id },
        resourceId: child.data.id,
      }),
      "readonly move source",
    );
    success(await reader.request("refresh"), "readonly move refresh");
    const movedTree = success(
      await reader.request("tree", { resourceId: destination.data.id }),
      "readonly moved tree",
    );
    invariant(
      movedTree.children[0]?.id === child.data.id,
      "Readonly move was not visible",
    );
    success(
      await writer.request("delete", { resourceId: child.data.id }),
      "readonly delete source",
    );

    success(
      await writer.request("marks", {
        marks: [{ name: "readonly", type: "sync", value: 1 }],
        resourceId: target.data.id,
      }),
      "readonly Mark source",
    );
    success(
      await writer.request("kv", {
        namespace: "sync",
        resourceId: target.data.id,
        value: { source: "full-readonly" },
      }),
      "readonly KV source",
    );
    success(
      await writer.request("asset", {
        resourceId: target.data.id,
        url: "https://example.com/readonly.jpg",
      }),
      "readonly Asset source",
    );
    success(await reader.request("refresh"), "readonly family refresh");
    const family = success(
      await reader.request("get", { resourceId: target.data.id }),
      "readonly family read",
    );
    invariant(
      family.marks.length === 1 &&
        family.assets.length === 1 &&
        family.kv.sync?.source === "full-readonly",
      "Readonly family observation is incomplete",
    );
    const deleted = await reader.request("get", { resourceId: child.data.id });
    invariant(
      deleted.ok === false && deleted.error?.code === "RESOURCE_NOT_FOUND",
      "Readonly delete was not visible",
    );
    const beforeReadonlyNoop = storageSnapshot(root);
    success(await reader.request("refresh"), "readonly zero-write refresh");
    const afterReadonlyNoop = storageSnapshot(root);
    invariant(
      JSON.stringify(beforeReadonlyNoop) === JSON.stringify(afterReadonlyNoop),
      "Readonly no-op refresh changed durable state",
    );

    await reader.shutdown();
    const poller = spawnWorker(root, "readonly", "polling");
    try {
      success(await poller.request("start"), "polling reader start");
      success(
        await writer.request("update", {
          input: { title: "poll-visible" },
          resourceId: target.data.id,
        }),
        "poll source update",
      );
      const admittedAt = performance.now();
      let visible = false;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const result = await poller.request("get", {
          resourceId: target.data.id,
        });
        if (result.ok && result.value.data.title === "poll-visible") {
          visible = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      invariant(visible, "Polling did not provide eventual visibility");
      const staleAgeMs = performance.now() - admittedAt;
      const pollingInspection = await poller.request("inspect");
      await poller.shutdown();
      success(
        await writer.request("update", {
          input: { title: "readonly-restart" },
          resourceId: target.data.id,
        }),
        "readonly restart update",
      );
      const restarted = spawnWorker(root, "readonly");
      try {
        success(await restarted.request("start"), "restarted readonly start");
        const restartedValue = success(
          await restarted.request("get", { resourceId: target.data.id }),
          "restarted readonly read",
        );
        invariant(
          restartedValue.data.title === "readonly-restart",
          "Readonly restart missed state",
        );
        return {
          distances,
          lock_wait: {
            retry_recovery: retryRecovery,
            successful: successfulLockWait,
          },
          polling: {
            inspection: pollingInspection.read_model.synchronization,
            stale_age_ms: staleAgeMs,
          },
          readonly_diagnostics: await restarted.request("diagnostics"),
          restart: true,
          zero_write_snapshot_equal: true,
        };
      } finally {
        await restarted.shutdown();
      }
    } finally {
      await poller.shutdown();
    }
  } finally {
    await writer.shutdown();
    await reader.shutdown();
  }
}

async function pollingHerdScenario() {
  const root = storageRoot();
  const first = spawnWorker(root, "full", "polling");
  const second = spawnWorker(root, "full", "polling");
  try {
    success(await first.request("start"), "herd first start");
    success(await second.request("start"), "herd second start");
    const baselineDiagnostics = await Promise.all([
      first.request("diagnostics"),
      second.request("diagnostics"),
    ]);
    const observationAtEpochMs = Date.now() + 250;
    const aligned = await Promise.all([
      first.request("refresh-at", { atEpochMs: observationAtEpochMs }),
      second.request("refresh-at", { atEpochMs: observationAtEpochMs }),
    ]);
    success(aligned[0], "aligned herd first refresh");
    success(aligned[1], "aligned herd second refresh");
    const alignedDiagnostics = await Promise.all([
      first.request("diagnostics"),
      second.request("diagnostics"),
    ]);
    const alignedRefreshTimes = alignedDiagnostics.map(
      (samples, index) =>
        samples.slice(baselineDiagnostics[index].length).at(-1)
          ?.recorded_at_epoch_ms,
    );
    invariant(
      alignedRefreshTimes.every(Number.isFinite),
      "Polling actors did not perform the injected aligned observation",
    );
    const alignedRefreshSpreadMs =
      Math.max(...alignedRefreshTimes) - Math.min(...alignedRefreshTimes);
    invariant(
      alignedRefreshSpreadMs <= 50,
      `Injected polling phase spread was ${alignedRefreshSpreadMs}ms`,
    );
    const resource = success(
      await first.request("create", { input: { title: "herd" } }),
      "herd source create",
    ).resource;
    let visible = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const result = await second.request("get", {
        resourceId: resource.data.id,
      });
      if (result.ok) {
        visible = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    invariant(visible, "Aligned full pollers did not converge");
    const outcomes = await Promise.all([
      first.request("create", { input: { title: "herd-left" } }),
      second.request("create", { input: { title: "herd-right" } }),
    ]);
    invariant(
      outcomes.every(
        (item) =>
          item.ok === true || item.error?.code === "STORAGE_LOCK_FAILED",
      ),
      "Herd contention produced an unsupported outcome",
    );
    return {
      diagnostics: {
        first: await first.request("diagnostics"),
        second: await second.request("diagnostics"),
      },
      eventual_visibility: true,
      phase_alignment: {
        barrier: "shared-observation-epoch-through-polling-actors",
        aligned_refresh_spread_ms: alignedRefreshSpreadMs,
        maximum_spread_ms: 50,
      },
      outcomes: outcomes.map((item) => (item.ok ? "success" : item.error.code)),
    };
  } finally {
    await first.shutdown();
    await second.shutdown();
  }
}

const loopDelay = monitorEventLoopDelay({ resolution: 10 });
loopDelay.enable();
try {
  const sqlite = new DatabaseSync(":memory:");
  const sqliteVersion = sqlite
    .prepare("SELECT sqlite_version() AS version")
    .get().version;
  sqlite.close();
  const fullFull = await fullFullScenario();
  const fullReadonly = await fullReadonlyScenario();
  const pollingHerd = await pollingHerdScenario();
  loopDelay.disable();
  const evidence = {
    environment: {
      arch: process.arch,
      filesystem: {
        certification: "not-claimed",
        root_source: "os-temp-directory",
      },
      node: process.version,
      platform: process.platform,
      storage_profile: "candidate-local-filesystem",
      sqlite: sqliteVersion,
    },
    full_full: fullFull,
    full_readonly: fullReadonly,
    polling_herd: pollingHerd,
    process_gate: "PASS",
    repetitions: {
      distance_matrix_runs: 1,
      full_full_contention_pairs: 8,
      harness_runs: 1,
      polling_herd_runs: 1,
    },
    support_claim: "UNCLAIMED_PENDING_P5_STAB_P5_AUD1_HUMAN_GATE",
    event_loop_delay_ms: {
      max: loopDelay.max / 1e6,
      mean: loopDelay.mean / 1e6,
    },
  };
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(
    `${JSON.stringify({ output: "process-evidence.json", status: "PASS" })}\n`,
  );
} finally {
  loopDelay.disable();
  for (const root of roots) rmSync(root, { force: true, recursive: true });
}
