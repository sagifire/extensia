import { createHash } from "node:crypto";
import { fork } from "node:child_process";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  parse,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";

const runDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(runDirectory, "../../../../../");
const workerPath = join(runDirectory, "phase5-stabilization-worker.mjs");
const outputPath = process.env.EXTENSIA_EVIDENCE_OUTPUT
  ? resolve(runDirectory, process.env.EXTENSIA_EVIDENCE_OUTPUT)
  : join(runDirectory, "process-evidence.json");
const evidenceRoot = join(workspaceRoot, ".tmp", "p5-stab-evidence");
const roots = [];
const repetitions = parseBoundedInteger(
  process.env.EXTENSIA_REPETITIONS ??
    process.env.EXTENSIA_P5_STAB_REPETITIONS,
  3,
  1,
  10,
  "EXTENSIA_REPETITIONS",
);
const contentionOperations = parseBoundedInteger(
  process.env.EXTENSIA_P5_STAB_CONTENTION_OPERATIONS,
  32,
  16,
  256,
  "EXTENSIA_P5_STAB_CONTENTION_OPERATIONS",
);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function parseBoundedInteger(raw, fallback, minimum, maximum, label) {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  invariant(
    Number.isSafeInteger(value) && value >= minimum && value <= maximum,
    `${label} must be an integer from ${minimum} through ${maximum}`,
  );
  return value;
}

function isContained(parent, candidate) {
  const child = relative(resolve(parent), resolve(candidate));
  return child !== "" && !child.startsWith("..") && !isAbsolute(child);
}

function assertContained(parent, candidate, label) {
  invariant(isContained(parent, candidate), `${label} escaped its owner root`);
}

assertContained(runDirectory, outputPath, "Evidence output");
invariant(
  parse(workspaceRoot).root.toUpperCase() === "D:\\",
  "Phase 5 stabilization evidence requires the task workspace on D:",
);

function preflightFilesystemProfile() {
  invariant(
    process.platform === "win32",
    "windows-local-ntfs-v1 requires Windows",
  );
  mkdirSync(evidenceRoot, { recursive: true });
  const canonicalWorkspace = realpathSync.native(workspaceRoot);
  const canonicalEvidenceRoot = realpathSync.native(evidenceRoot);
  assertContained(
    canonicalWorkspace,
    canonicalEvidenceRoot,
    "Task-local evidence root",
  );
  invariant(
    !lstatSync(canonicalWorkspace).isSymbolicLink() &&
      !lstatSync(canonicalEvidenceRoot).isSymbolicLink(),
    "Evidence root must not traverse a reparse/symbolic-link boundary",
  );
  const script = [
    "$resolved=(Resolve-Path -LiteralPath $env:EXTENSIA_PROFILE_PROBE_ROOT).Path",
    "$item=Get-Item -LiteralPath $resolved",
    "$drive=[System.IO.DriveInfo]::new($item.PSDrive.Root)",
    "[pscustomobject]@{driveType=[string]$drive.DriveType;filesystem=[string]$drive.DriveFormat;isReady=$drive.IsReady;isUnc=$resolved.StartsWith('\\\\')} | ConvertTo-Json -Compress",
  ].join("; ");
  const raw = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        EXTENSIA_PROFILE_PROBE_ROOT: canonicalEvidenceRoot,
      },
      windowsHide: true,
    },
  );
  const probe = JSON.parse(raw.trim());
  invariant(probe.isReady === true, "Evidence volume is not ready");
  invariant(probe.driveType === "Fixed", "Evidence volume is not fixed");
  invariant(probe.filesystem === "NTFS", "Evidence volume is not NTFS");
  invariant(probe.isUnc === false, "Evidence root is network-backed");
  return {
    canonicalEvidenceRoot,
    publicEvidence: {
      drive_type: "Fixed",
      filesystem: "NTFS",
      local: true,
      profile: "windows-local-ntfs-v1",
      root_source: "task-workspace-.tmp",
      sync_backed: false,
      verification: {
        fixed_drive_and_filesystem: "powershell-volume-probe",
        local_path:
          "canonical-non-UNC-contained-non-reparse-path-plus-DriveInfo",
        sync_backed: "task-run-attested-false",
      },
    },
  };
}

const filesystemProfile = preflightFilesystemProfile();

function storageRoot(label) {
  const root = mkdtempSync(
    join(filesystemProfile.canonicalEvidenceRoot, `${label}-`),
  );
  assertContained(filesystemProfile.canonicalEvidenceRoot, root, "Storage root");
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

function sleep(milliseconds) {
  return new Promise((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds),
  );
}

function spawnWorker(
  root,
  mode,
  synchronization = "manual",
  loading = "greedy",
) {
  const child = fork(workerPath, [root, mode, synchronization, loading], {
    env: process.env,
    serialization: "advanced",
    stdio: ["ignore", "ignore", "inherit", "ipc"],
  });
  let nextId = 1;
  let shutdownRecord;
  const pending = new Map();
  const exitPromise = new Promise((resolveExit) => {
    child.once("exit", (code, signal) => resolveExit({ code, signal }));
  });
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
    request(action, payload = {}, timeoutMs = 60_000) {
      const id = nextId++;
      return new Promise((resolveRequest, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Worker timeout: ${action}`));
        }, timeoutMs);
        pending.set(id, {
          reject,
          resolve(value) {
            clearTimeout(timeout);
            resolveRequest(value);
          },
        });
        child.send({ action, id, ...payload });
      });
    },
    async shutdown() {
      if (shutdownRecord !== undefined) return shutdownRecord;
      const metricsBeforeStop =
        child.exitCode === null
          ? await this.request("runtime-metrics").catch(() => null)
          : null;
      const resourcesBeforeStop =
        child.exitCode === null
          ? await this.request("active-resources").catch(() => [])
          : [];
      const stopResult =
        child.exitCode === null
          ? await this.request("stop").catch((error) => ({
              thrown: true,
              name: error instanceof Error ? error.name : "UnknownError",
            }))
          : null;
      const resourcesAfterStop =
        child.exitCode === null
          ? await this.request("active-resources").catch(() => [])
          : [];
      if (child.connected) child.disconnect();
      const timed = await Promise.race([
        exitPromise,
        sleep(5_000).then(() => null),
      ]);
      if (timed === null) {
        child.kill();
        await exitPromise;
        throw new Error("Worker required a forced kill during cleanup");
      }
      invariant(
        timed.code === 0 && timed.signal === null,
        `Worker did not exit cleanly: code=${timed.code} signal=${timed.signal}`,
      );
      shutdownRecord = {
        exit_code: timed.code,
        forced_kill: false,
        pending_requests: pending.size,
        resource_census: {
          after_stop: resourcesAfterStop,
          before_stop: resourcesBeforeStop,
        },
        stop_outcome: outcomeCode(stopResult),
        metrics_before_stop: sanitizeMetrics(metricsBeforeStop),
      };
      return shutdownRecord;
    },
  };
}

function outcomeCode(result) {
  if (result?.ok === true) return "success";
  if (result?.ok === false) return result.error?.code ?? "failure";
  if (result?.thrown === true) return `thrown:${result.name ?? "UnknownError"}`;
  if (result === null || result === undefined) return "not-returned";
  return "completed";
}

function success(result, label) {
  invariant(
    result?.ok === true,
    `${label} did not succeed (${outcomeCode(result)})`,
  );
  return result.value;
}

function sanitizeDiagnostic(sample) {
  if (sample === undefined || sample === null) return null;
  return {
    actual_wait_ms: finiteOrNull(sample.actual_wait_ms),
    configured_timeout_ms: finiteOrNull(sample.configured_timeout_ms),
    outcome: typeof sample.outcome === "string" ? sample.outcome : "unknown",
    phase: typeof sample.phase === "string" ? sample.phase : "unknown",
    role: typeof sample.role === "string" ? sample.role : "unknown",
    session_duration_ms: finiteOrNull(sample.session_duration_ms),
    strategy:
      typeof sample.strategy === "string" ? sample.strategy : "unknown",
    synchronous_overshoot_ms: finiteOrNull(
      sample.synchronous_overshoot_ms,
    ),
  };
}

function sanitizeDiagnostics(samples) {
  return Array.isArray(samples)
    ? samples.map(sanitizeDiagnostic).filter((sample) => sample !== null)
    : [];
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function sanitizeMetrics(metrics) {
  if (metrics === null || metrics === undefined) return null;
  return {
    event_loop_delay_ms: {
      max: finiteOrNull(metrics.event_loop_delay_ms?.max),
      mean: finiteOrNull(metrics.event_loop_delay_ms?.mean),
      p50: finiteOrNull(metrics.event_loop_delay_ms?.p50),
      p95: finiteOrNull(metrics.event_loop_delay_ms?.p95),
      p99: finiteOrNull(metrics.event_loop_delay_ms?.p99),
      raw_samples: Array.isArray(metrics.event_loop_delay_ms?.raw_samples)
        ? metrics.event_loop_delay_ms.raw_samples.filter(Number.isFinite)
        : [],
      resolution_ms: 10,
    },
    memory_bytes: {
      array_buffers: finiteOrNull(metrics.memory_bytes?.array_buffers),
      external: finiteOrNull(metrics.memory_bytes?.external),
      heap_total: finiteOrNull(metrics.memory_bytes?.heap_total),
      heap_used: finiteOrNull(metrics.memory_bytes?.heap_used),
      rss: finiteOrNull(metrics.memory_bytes?.rss),
    },
    uptime_ms: finiteOrNull(metrics.uptime_ms),
  };
}

function percentile(samples, requestedPercentile) {
  const sorted = samples.filter(Number.isFinite).toSorted((a, b) => a - b);
  if (sorted.length === 0) return null;
  const index = Math.ceil((requestedPercentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function summarizeDurations(samples) {
  return {
    max: samples.length === 0 ? null : Math.max(...samples),
    p50: percentile(samples, 50),
    p95: percentile(samples, 95),
    raw_samples: samples,
  };
}

async function refreshAndGet(observer, resourceId, expectedTitle, label) {
  const startedAt = performance.now();
  success(await observer.request("refresh"), `${label} refresh`);
  const value = success(
    await observer.request("get", { resourceId }),
    `${label} observed Resource`,
  );
  invariant(
    value.data.title === expectedTitle,
    `${label} observed the wrong title`,
  );
  return performance.now() - startedAt;
}

async function exerciseReadonlyLockWait(root, reader, holdMs) {
  const before = (await reader.request("diagnostics")).length;
  const blocker = new DatabaseSync(join(root, "extensia.sqlite3"), {
    timeout: 1_000,
  });
  blocker.exec("PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE;");
  const startedAt = performance.now();
  const refresh = reader.request("refresh");
  await sleep(holdMs);
  blocker.exec("COMMIT;");
  blocker.close();
  success(await refresh, `readonly lock wait ${holdMs}`);
  return {
    elapsed_ms: performance.now() - startedAt,
    hold_ms: holdMs,
    samples: sanitizeDiagnostics(
      (await reader.request("diagnostics")).slice(before),
    ),
  };
}

async function exerciseReadonlyLockExhaustion(root, reader, holdMs) {
  const before = (await reader.request("diagnostics")).length;
  const blocker = new DatabaseSync(join(root, "extensia.sqlite3"), {
    timeout: 1_000,
  });
  blocker.exec("PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE;");
  const startedAt = performance.now();
  try {
    const refreshResult = await reader.request("refresh");
    invariant(
      refreshResult?.ok === false &&
        refreshResult.error?.code === "READ_MODEL_REFRESH_EXHAUSTED",
      "Readonly lock chain did not terminate with explicit exhaustion",
    );
    const elapsedMs = performance.now() - startedAt;
    invariant(
      elapsedMs < holdMs,
      "Readonly exhaustion did not settle before the external lock release",
    );
    return {
      elapsed_ms: elapsedMs,
      hold_ms: holdMs,
      outcome: refreshResult.error.code,
      samples: sanitizeDiagnostics(
        (await reader.request("diagnostics")).slice(before),
      ),
    };
  } finally {
    await sleep(Math.max(0, holdMs - (performance.now() - startedAt)));
    blocker.exec("COMMIT;");
    blocker.close();
  }
}

async function fullFullScenario(repetition) {
  const root = storageRoot(`full-full-${repetition}`);
  const first = spawnWorker(root, "full");
  let second = spawnWorker(root, "full");
  const cleanup = [];
  try {
    success(await first.request("start"), "full/full first start");
    success(await second.request("start"), "full/full second start");
    const memorySamples = [
      { actor: "first", phase: "started", value: sanitizeMetrics(await first.request("runtime-metrics")) },
      { actor: "second", phase: "started", value: sanitizeMetrics(await second.request("runtime-metrics")) },
    ];
    const rootResource = success(
      await first.request("create", { input: { title: "root" } }),
      "first create",
    ).resource;
    success(
      await first.request("get", { resourceId: rootResource.data.id }),
      "local read-after-write",
    );
    const explicitVisibilityMs = [
      await refreshAndGet(second, rootResource.data.id, "root", "second"),
    ];
    success(
      await second.request("update", {
        input: { title: "root-updated" },
        resourceId: rootResource.data.id,
      }),
      "second update",
    );
    explicitVisibilityMs.push(
      await refreshAndGet(
        first,
        rootResource.data.id,
        "root-updated",
        "first",
      ),
    );

    const child = success(
      await first.request("create", { input: { title: "child" } }),
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
    success(await second.request("refresh"), "Mark/KV refresh");
    const marked = success(
      await second.request("get", { resourceId: rootResource.data.id }),
      "marked Resource",
    );
    invariant(marked.marks[0]?.name === "sync", "Mark was not visible");
    invariant(marked.kv.sync?.source === "full-full", "KV was not visible");
    success(
      await second.request("asset", {
        resourceId: rootResource.data.id,
        url: "https://example.com/p5-stab-full-full.jpg",
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
    const deleted = await first.request("get", {
      resourceId: child.data.id,
    });
    invariant(
      deleted?.ok === false && deleted.error?.code === "RESOURCE_NOT_FOUND",
      "Delete was not visible",
    );

    const contentionPairs = [];
    for (let index = 0; index < 8; index += 1) {
      contentionPairs.push(
        await Promise.all([
          first.request("create", { input: { title: `left-${index}` } }),
          second.request("create", { input: { title: `right-${index}` } }),
        ]),
      );
    }
    const contentionOutcomes = contentionPairs
      .flat()
      .map((item) => outcomeCode(item));
    invariant(
      contentionOutcomes.every(
        (item) => item === "success" || item === "STORAGE_LOCK_FAILED",
      ),
      "Contention produced an unsupported outcome",
    );

    cleanup.push(await second.shutdown());
    success(
      await first.request("update", {
        input: { title: "restart-visible" },
        resourceId: rootResource.data.id,
      }),
      "restart update",
    );
    second = spawnWorker(root, "full");
    success(await second.request("start"), "restarted full start");
    const visible = success(
      await second.request("get", { resourceId: rootResource.data.id }),
      "restarted full read",
    );
    invariant(visible.data.title === "restart-visible", "Restart missed state");
    memorySamples.push(
      { actor: "first", phase: "after-matrix", value: sanitizeMetrics(await first.request("runtime-metrics")) },
      { actor: "restarted", phase: "after-restart", value: sanitizeMetrics(await second.request("runtime-metrics")) },
    );
    return {
      cleanup,
      contention: {
        lock_failures: contentionOutcomes.filter(
          (item) => item === "STORAGE_LOCK_FAILED",
        ).length,
        raw_outcomes: contentionOutcomes,
        successes: contentionOutcomes.filter((item) => item === "success")
          .length,
      },
      diagnostics: {
        first: sanitizeDiagnostics(await first.request("diagnostics")),
        restarted: sanitizeDiagnostics(await second.request("diagnostics")),
      },
      explicit_visibility_ms: summarizeDurations(explicitVisibilityMs),
      local_read_after_write: true,
      memory_samples: memorySamples,
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
      topology: "full/full",
    };
  } finally {
    cleanup.push(await first.shutdown());
    cleanup.push(await second.shutdown());
  }
}

async function fullReadonlyScenario(repetition) {
  const root = storageRoot(`full-readonly-${repetition}`);
  const writer = spawnWorker(root, "full");
  let reader = spawnWorker(root, "readonly", "manual", "lazy");
  const cleanup = [];
  try {
    success(await writer.request("start"), "writer start");
    success(await reader.request("start"), "reader start");
    const lazyInspection = await reader.request("inspect");
    invariant(
      lazyInspection.read_model?.loading === "lazy",
      "Readonly lazy loading mode was not active",
    );
    const memorySamples = [
      { actor: "writer", phase: "started", value: sanitizeMetrics(await writer.request("runtime-metrics")) },
      { actor: "reader", phase: "started", value: sanitizeMetrics(await reader.request("runtime-metrics")) },
    ];
    const target = success(
      await writer.request("create", { input: { title: "distance-base" } }),
      "distance base",
    ).resource;
    const explicitVisibilityMs = [
      await refreshAndGet(
        reader,
        target.data.id,
        "distance-base",
        "readonly",
      ),
    ];
    const preAbortedRefresh = await reader.request("abort-refresh");
    invariant(
      preAbortedRefresh?.ok === false &&
        preAbortedRefresh.error?.code === "READ_MODEL_REFRESH_CANCELED",
      "Pre-aborted public refresh did not cancel",
    );
    const distances = [];
    for (const count of [0, 1, 32, 256, 257]) {
      if (count > 0) {
        const updates = await writer.request("repeat-updates", {
          count,
          prefix: `distance-${count}`,
          resourceId: target.data.id,
        });
        invariant(
          updates.successes === count && updates.failures.length === 0,
          `Distance ${count} write failed`,
        );
      }
      const startedAt = performance.now();
      success(await reader.request("refresh"), `distance ${count} refresh`);
      const elapsedMs = performance.now() - startedAt;
      const samples = await reader.request("diagnostics");
      distances.push({
        count,
        elapsed_ms: elapsedMs,
        sample: sanitizeDiagnostic(samples.at(-1)),
      });
    }
    invariant(
      distances.map((item) => item.sample?.strategy).join(",") ===
        "at-head,delta,delta,delta,rebuild",
      "Distance strategy matrix is incorrect",
    );

    const successfulLockWait = await exerciseReadonlyLockWait(root, reader, 140);
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
      "Readonly retry chain did not expose lock failure and recovery",
    );
    const terminalExhaustion = await exerciseReadonlyLockExhaustion(
      root,
      reader,
      900,
    );
    success(
      await reader.request("refresh"),
      "readonly recovery after terminal exhaustion",
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
        url: "https://example.com/p5-stab-readonly.jpg",
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

    cleanup.push(await reader.shutdown());
    reader = spawnWorker(root, "readonly", "polling", "lazy");
    success(await reader.request("start"), "polling reader start");
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
      const result = await reader.request("get", {
        resourceId: target.data.id,
      });
      if (result.ok && result.value.data.title === "poll-visible") {
        visible = true;
        break;
      }
      await sleep(50);
    }
    invariant(visible, "Polling did not provide eventual visibility");
    const staleAgeMs = performance.now() - admittedAt;
    const pollingInspection = await reader.request("inspect");
    cleanup.push(await reader.shutdown());
    success(
      await writer.request("update", {
        input: { title: "readonly-restart" },
        resourceId: target.data.id,
      }),
      "readonly restart update",
    );
    reader = spawnWorker(root, "readonly", "manual", "lazy");
    success(await reader.request("start"), "restarted readonly start");
    const restartedValue = success(
      await reader.request("get", { resourceId: target.data.id }),
      "restarted readonly read",
    );
    invariant(
      restartedValue.data.title === "readonly-restart",
      "Readonly restart missed state",
    );
    memorySamples.push(
      { actor: "writer", phase: "after-matrix", value: sanitizeMetrics(await writer.request("runtime-metrics")) },
      { actor: "restarted-reader", phase: "after-restart", value: sanitizeMetrics(await reader.request("runtime-metrics")) },
    );
    return {
      cleanup,
      distances,
      explicit_visibility_ms: summarizeDurations(explicitVisibilityMs),
      lock_wait: {
        exhaustion: terminalExhaustion,
        retry_recovery: retryRecovery,
        successful: successfulLockWait,
      },
      memory_samples: memorySamples,
      mode_matrix: {
        loading: ["greedy-writer", "lazy-reader"],
        manual_lazy_point_read: true,
        manual_lazy_tree_read: true,
        manual_refresh: true,
        polling_lazy_point_read: true,
        pre_aborted_public_refresh: outcomeCode(preAbortedRefresh),
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
      polling: {
        eventual_visibility: true,
        inspection: {
          freshness:
            pollingInspection.read_model?.synchronization?.freshness ?? null,
          mode: pollingInspection.read_model?.synchronization?.mode ?? null,
          state: pollingInspection.read_model?.synchronization?.state ?? null,
        },
        stale_age_ms: staleAgeMs,
      },
      restart: true,
      topology: "full/readonly",
      zero_write: {
        compared_files: beforeReadonlyNoop.length,
        snapshot_equal: true,
      },
    };
  } finally {
    cleanup.push(await writer.shutdown());
    cleanup.push(await reader.shutdown());
  }
}

async function pollingHerdScenario(repetition) {
  const root = storageRoot(`polling-herd-${repetition}`);
  const first = spawnWorker(root, "full", "polling");
  const second = spawnWorker(root, "full", "polling");
  const cleanup = [];
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
      "Polling actors did not perform the aligned observation",
    );
    const alignedRefreshSpreadMs =
      Math.max(...alignedRefreshTimes) - Math.min(...alignedRefreshTimes);
    const resource = success(
      await first.request("create", { input: { title: "herd" } }),
      "herd source create",
    ).resource;
    const admittedAt = performance.now();
    let visible = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const result = await second.request("get", {
        resourceId: resource.data.id,
      });
      if (result.ok) {
        visible = true;
        break;
      }
      await sleep(50);
    }
    invariant(visible, "Aligned full pollers did not converge");
    const staleAgeMs = performance.now() - admittedAt;
    const outcomes = (
      await Promise.all([
        first.request("create", { input: { title: "herd-left" } }),
        second.request("create", { input: { title: "herd-right" } }),
      ])
    ).map(outcomeCode);
    invariant(
      outcomes.every(
        (item) => item === "success" || item === "STORAGE_LOCK_FAILED",
      ),
      "Herd contention produced an unsupported outcome",
    );
    return {
      cleanup,
      diagnostics: {
        first: sanitizeDiagnostics(await first.request("diagnostics")),
        second: sanitizeDiagnostics(await second.request("diagnostics")),
      },
      eventual_visibility: true,
      memory_samples: [
        { actor: "first", value: sanitizeMetrics(await first.request("runtime-metrics")) },
        { actor: "second", value: sanitizeMetrics(await second.request("runtime-metrics")) },
      ],
      phase_alignment: {
        aligned_refresh_spread_ms: alignedRefreshSpreadMs,
        barrier: "shared-observation-epoch-through-polling-actors",
        characterization_only: true,
      },
      raw_outcomes: outcomes,
      stale_age_ms: staleAgeMs,
      topology: "full/full-polling",
    };
  } finally {
    cleanup.push(await first.shutdown());
    cleanup.push(await second.shutdown());
  }
}

function summarizeActorContention(raw) {
  invariant(
    raw.outcomes.every(
      (outcome) =>
        outcome === "success" || outcome === "STORAGE_LOCK_FAILED",
    ),
    "Long contention actor returned an unsupported outcome",
  );
  return {
    duration_ms: summarizeDurations(raw.durations_ms),
    first_success_index: raw.first_success_index,
    last_success_index: raw.last_success_index,
    lock_failures: raw.lock_failures,
    longest_lock_failure_run: raw.longest_lock_failure_run,
    raw_outcomes: raw.outcomes,
    starvation_indicators: {
      no_success: raw.successes === 0,
      success_ratio: raw.successes / raw.outcomes.length,
    },
    successes: raw.successes,
  };
}

async function longContentionScenario(repetition) {
  const root = storageRoot(`long-contention-${repetition}`);
  const first = spawnWorker(root, "full");
  const second = spawnWorker(root, "full");
  const cleanup = [];
  try {
    success(await first.request("start"), "long contention first start");
    success(await second.request("start"), "long contention second start");
    const startedAt = performance.now();
    const [firstRaw, secondRaw] = await Promise.all([
      first.request("repeat-creates", {
        count: contentionOperations,
        prefix: `first-${repetition}`,
      }),
      second.request("repeat-creates", {
        count: contentionOperations,
        prefix: `second-${repetition}`,
      }),
    ]);
    const elapsedMs = performance.now() - startedAt;
    const actors = {
      first: summarizeActorContention(firstRaw),
      second: summarizeActorContention(secondRaw),
    };
    return {
      actors,
      cleanup,
      elapsed_ms: elapsedMs,
      memory_samples: [
        { actor: "first", value: sanitizeMetrics(await first.request("runtime-metrics")) },
        { actor: "second", value: sanitizeMetrics(await second.request("runtime-metrics")) },
      ],
      operations_per_actor: contentionOperations,
      starvation_observed:
        actors.first.starvation_indicators.no_success ||
        actors.second.starvation_indicators.no_success,
      topology: "full/full",
    };
  } finally {
    cleanup.push(await first.shutdown());
    cleanup.push(await second.shutdown());
  }
}

async function failedStartupScenario() {
  const parent = storageRoot("failed-startup");
  const missingRoot = join(parent, "missing");
  invariant(!existsSync(missingRoot), "Failed-startup root unexpectedly exists");
  const first = spawnWorker(missingRoot, "readonly");
  const second = spawnWorker(missingRoot, "readonly");
  const cleanup = [];
  try {
    const before = readdirSync(parent);
    const starts = await Promise.all([
      first.request("start"),
      second.request("start"),
    ]);
    invariant(
      starts.every((result) => result?.ok !== true),
      "Missing-root readonly startup unexpectedly succeeded",
    );
    const after = readdirSync(parent);
    invariant(
      JSON.stringify(before) === JSON.stringify(after),
      "Failed readonly startup mutated its parent root",
    );
    return {
      cleanup,
      durable_mutation: false,
      outcomes: starts.map(outcomeCode),
      scenario: "two-readonly-workers-missing-root",
      status: "exercised",
    };
  } finally {
    cleanup.push(await first.shutdown());
    cleanup.push(await second.shutdown());
  }
}

async function stopDuringRefreshScenario() {
  const root = storageRoot("stop-during-refresh");
  const writer = spawnWorker(root, "full");
  const reader = spawnWorker(root, "readonly");
  const cleanup = [];
  let blocker;
  try {
    success(await writer.request("start"), "stop scenario writer start");
    success(await reader.request("start"), "stop scenario reader start");
    const target = success(
      await writer.request("create", { input: { title: "stop-target" } }),
      "stop scenario create",
    ).resource;
    await refreshAndGet(reader, target.data.id, "stop-target", "stop scenario");
    blocker = new DatabaseSync(join(root, "extensia.sqlite3"), {
      timeout: 1_000,
    });
    blocker.exec("PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE;");
    const beforeDiagnostics = (await reader.request("diagnostics")).length;
    let refreshSettled = false;
    const refresh = reader.request("refresh").then((result) => {
      refreshSettled = true;
      return result;
    });
    await sleep(25);
    const stopSentWhileRefreshPending = !refreshSettled;
    const stop = reader.request("stop");
    await sleep(425);
    blocker.exec("COMMIT;");
    blocker.close();
    blocker = undefined;
    const [refreshResult, stopResult] = await Promise.all([refresh, stop]);
    const diagnostics = sanitizeDiagnostics(
      (await reader.request("diagnostics")).slice(beforeDiagnostics),
    );
    return {
      cancellation: {
        pre_aborted_public_refresh: "exercised-in-full-readonly-matrix",
        reason:
          "no deterministic public barrier for proving in-flight synchronous SQLite interruption",
        status: "not_exercised",
      },
      cleanup,
      diagnostics,
      refresh_outcome: outcomeCode(refreshResult),
      stop_during_refresh: {
        characterization_only: true,
        stop_outcome: outcomeCode(stopResult),
        stop_request_sent_while_refresh_pending: stopSentWhileRefreshPending,
        synchronous_call_hard_cancel_claimed: false,
      },
      topology: "full/readonly",
    };
  } finally {
    if (blocker !== undefined) {
      try {
        blocker.exec("COMMIT;");
      } finally {
        blocker.close();
      }
    }
    cleanup.push(await writer.shutdown());
    cleanup.push(await reader.shutdown());
  }
}

function cleanupRoots() {
  for (const root of roots) {
    const resolved = resolve(root);
    assertContained(
      filesystemProfile.canonicalEvidenceRoot,
      resolved,
      "Cleanup target",
    );
    if (existsSync(resolved)) rmSync(resolved, { force: true, recursive: true });
  }
  invariant(
    roots.every((root) => !existsSync(root)),
    "A task-local temporary storage root leaked",
  );
}

function memoryUsageSample() {
  const value = process.memoryUsage();
  return {
    array_buffers: value.arrayBuffers,
    external: value.external,
    heap_total: value.heapTotal,
    heap_used: value.heapUsed,
    rss: value.rss,
  };
}

const orchestratorLoopDelay = monitorEventLoopDelay({ resolution: 10 });
const orchestratorRawLoopSamples = [];
let expectedLoopSampleAt = performance.now() + 10;
const orchestratorSampler = setInterval(() => {
  const now = performance.now();
  orchestratorRawLoopSamples.push(Math.max(0, now - expectedLoopSampleAt));
  expectedLoopSampleAt = now + 10;
}, 10);
orchestratorLoopDelay.enable();

let completed = false;
try {
  const sqlite = new DatabaseSync(":memory:");
  const sqliteVersion = sqlite
    .prepare("SELECT sqlite_version() AS version")
    .get().version;
  sqlite.close();
  const orchestratorMemorySamples = [
    { phase: "start", value: memoryUsageSample() },
  ];
  const fullFull = [];
  const fullReadonly = [];
  const pollingHerd = [];
  const longContention = [];
  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    fullFull.push(await fullFullScenario(repetition));
    fullReadonly.push(await fullReadonlyScenario(repetition));
    pollingHerd.push(await pollingHerdScenario(repetition));
    longContention.push(await longContentionScenario(repetition));
  }
  const failedStartup = await failedStartupScenario();
  const stopDuringRefresh = await stopDuringRefreshScenario();
  orchestratorMemorySamples.push({
    phase: "after-scenarios",
    value: memoryUsageSample(),
  });
  orchestratorLoopDelay.disable();
  clearInterval(orchestratorSampler);
  cleanupRoots();
  const evidence = {
    cleanup_gate: {
      all_workers_clean_exit: true,
      forced_kills: 0,
      pending_requests_after_exit: 0,
      task_local_storage_roots_removed: true,
    },
    environment: {
      arch: process.arch,
      filesystem: filesystemProfile.publicEvidence,
      node: process.version,
      platform: process.platform,
      runtime_source:
        process.env.EXTENSIA_PACKAGE_ROOT === undefined
          ? "workspace-dist"
          : "installed-package-dist",
      sqlite: sqliteVersion,
    },
    failed_startup: failedStartup,
    full_full: fullFull,
    full_readonly: fullReadonly,
    limitations: [
      "Measurements characterize this host and run; they are not an SLA or cross-platform certificate.",
      "The harness uses exactly two cooperating Extensia workers per topology; the parent orchestrator only coordinates and applies SQLite lock probes.",
      "Pre-aborted public refresh is exercised; in-flight synchronous SQLite hard cancellation is not claimed.",
      "Stop-during-refresh characterizes lifecycle scheduling around a synchronous SQLite call; an unavailable in-flight barrier is not inferred.",
      "Failed startup covers an absent readonly storage root; broader corruption and permission cases remain covered by focused repository tests unless separately executed.",
      "Event-loop and memory instrumentation is observational and may influence measured timings.",
    ],
    long_contention: longContention,
    orchestrator_characterization: {
      event_loop_delay_ms: {
        max: orchestratorLoopDelay.max / 1e6,
        mean: orchestratorLoopDelay.mean / 1e6,
        p50: orchestratorLoopDelay.percentile(50) / 1e6,
        p95: orchestratorLoopDelay.percentile(95) / 1e6,
        p99: orchestratorLoopDelay.percentile(99) / 1e6,
        raw_samples: orchestratorRawLoopSamples,
        resolution_ms: 10,
      },
      memory_samples: orchestratorMemorySamples,
    },
    polling_herd: pollingHerd,
    process_gate: "PASS",
    published_data_policy: {
      raw_errors: false,
      resource_ids: false,
      root_paths: false,
      secrets: false,
    },
    repetitions: {
      full_full_runs: fullFull.length,
      full_readonly_runs: fullReadonly.length,
      harness_runs: repetitions,
      long_contention_runs: longContention.length,
      polling_herd_runs: pollingHerd.length,
      strategy_matrix_runs: fullReadonly.length,
    },
    stop_during_refresh: stopDuringRefresh,
    support_claim: "NONE_STABILIZATION_EVIDENCE_ONLY",
    topology_scope: {
      cooperating_extensia_processes: 2,
      same_host: true,
      topologies: ["full/full", "full/readonly"],
    },
  };
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  completed = true;
  process.stdout.write(
    `${JSON.stringify({ output: basename(outputPath), status: "PASS" })}\n`,
  );
} finally {
  orchestratorLoopDelay.disable();
  clearInterval(orchestratorSampler);
  if (!completed) cleanupRoots();
}
