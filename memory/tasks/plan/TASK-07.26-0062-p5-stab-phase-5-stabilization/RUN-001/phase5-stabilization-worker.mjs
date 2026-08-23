import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [rootPath, mode, synchronizationMode = "manual", loadingMode = "greedy"] =
  process.argv.slice(2);

if (
  rootPath === undefined ||
  !["full", "readonly"].includes(mode) ||
  !["manual", "polling"].includes(synchronizationMode) ||
  !["greedy", "lazy"].includes(loadingMode)
) {
  throw new Error(
    "Expected <rootPath> <full|readonly> [manual|polling] [greedy|lazy]",
  );
}

const packageRoot = process.env.EXTENSIA_PACKAGE_ROOT;
const runtimePath =
  packageRoot === undefined || packageRoot.length === 0
    ? new URL(
        "../../../../../dist/composition/local-sqlite-runtime.js",
        import.meta.url,
      )
    : pathToFileURL(
        resolve(packageRoot, "dist/composition/local-sqlite-runtime.js"),
      );
const { createLocalSqliteExtensia } = await import(runtimePath.href);

const diagnostics = [];
const loopDelay = monitorEventLoopDelay({ resolution: 10 });
const rawLoopDelaySamplesMs = [];
let expectedLoopSampleAt = performance.now() + 10;
let samplingStopped = false;

loopDelay.enable();
const loopSampler = setInterval(() => {
  const now = performance.now();
  rawLoopDelaySamplesMs.push(Math.max(0, now - expectedLoopSampleAt));
  if (rawLoopDelaySamplesMs.length > 4_096) rawLoopDelaySamplesMs.shift();
  expectedLoopSampleAt = now + 10;
}, 10);
loopSampler.unref();

function stopSampling() {
  if (samplingStopped) return;
  samplingStopped = true;
  clearInterval(loopSampler);
  loopDelay.disable();
}

function finiteMilliseconds(value) {
  return Number.isFinite(value) ? value / 1e6 : null;
}

function runtimeMetrics() {
  const memory = process.memoryUsage();
  return {
    event_loop_delay_ms: {
      max: finiteMilliseconds(loopDelay.max),
      mean: finiteMilliseconds(loopDelay.mean),
      p50: finiteMilliseconds(loopDelay.percentile(50)),
      p95: finiteMilliseconds(loopDelay.percentile(95)),
      p99: finiteMilliseconds(loopDelay.percentile(99)),
      raw_samples: rawLoopDelaySamplesMs.slice(),
      resolution_ms: 10,
    },
    memory_bytes: {
      array_buffers: memory.arrayBuffers,
      external: memory.external,
      heap_total: memory.heapTotal,
      heap_used: memory.heapUsed,
      rss: memory.rss,
    },
    uptime_ms: process.uptime() * 1_000,
  };
}

const module = createLocalSqliteExtensia({
  mode,
  readModel: {
    loading: loadingMode,
    synchronization:
      synchronizationMode === "polling"
        ? {
            mode: "polling",
            polling: { intervalMs: 250, maxBackoffMs: 2_000 },
            retry: { deadlineMs: 500, maxAttempts: 2 },
          }
        : { mode: "manual", retry: { deadlineMs: 500, maxAttempts: 2 } },
  },
  storage: {
    onObservationDiagnostic: (sample) =>
      diagnostics.push({ ...sample, recorded_at_epoch_ms: Date.now() }),
    profile: "windows-local-ntfs-v1",
    rootPath,
    timeoutMs: 250,
    verifyFilesystemProfile(canonicalRootPath) {
      return {
        canonicalRootPath,
        driveType: "Fixed",
        filesystemName: "NTFS",
        networkBacked: false,
        syncBacked: false,
      };
    },
  },
});

function send(id, value) {
  process.send?.({ id, value });
}

function writeResult(result) {
  return result.ok
    ? { ok: true, value: result.value }
    : { error: result.error, ok: false };
}

function longestRun(values, expected) {
  let current = 0;
  let longest = 0;
  for (const value of values) {
    current = value === expected ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

async function dispatch(message) {
  const storage = module.storage();
  const query = module.query();
  switch (message.action) {
    case "start":
      return module.start();
    case "stop":
      return module.stop();
    case "inspect":
      return module.inspect();
    case "diagnostics":
      return diagnostics.slice();
    case "active-resources":
      return typeof process.getActiveResourcesInfo === "function"
        ? process.getActiveResourcesInfo().toSorted()
        : [];
    case "runtime-metrics":
      return runtimeMetrics();
    case "abort-refresh": {
      const controller = new AbortController();
      controller.abort();
      return writeResult(await query.refresh({ signal: controller.signal }));
    }
    case "refresh-at":
      await new Promise((resolvePromise) =>
        setTimeout(resolvePromise, Math.max(0, message.atEpochMs - Date.now())),
      );
      return writeResult(await query.refresh());
    case "create":
      return writeResult(await storage.createResource(message.input));
    case "repeat-creates": {
      const outcomes = [];
      const durationsMs = [];
      for (let index = 0; index < message.count; index += 1) {
        const startedAt = performance.now();
        const outcome = writeResult(
          await storage.createResource({
            title: `${message.prefix}-${index}`,
          }),
        );
        durationsMs.push(performance.now() - startedAt);
        outcomes.push(
          outcome.ok ? "success" : (outcome.error?.code ?? "unexpected"),
        );
      }
      return {
        durations_ms: durationsMs,
        first_success_index: outcomes.indexOf("success"),
        last_success_index: outcomes.lastIndexOf("success"),
        lock_failures: outcomes.filter(
          (outcome) => outcome === "STORAGE_LOCK_FAILED",
        ).length,
        longest_lock_failure_run: longestRun(outcomes, "STORAGE_LOCK_FAILED"),
        outcomes,
        successes: outcomes.filter((outcome) => outcome === "success").length,
      };
    }
    case "update":
      return writeResult(
        await storage.updateResource(message.resourceId, message.input),
      );
    case "repeat-updates": {
      const outcomes = [];
      for (let index = 0; index < message.count; index += 1) {
        outcomes.push(
          writeResult(
            await storage.updateResource(message.resourceId, {
              title: `${message.prefix}-${index}`,
            }),
          ),
        );
      }
      return {
        failures: outcomes
          .filter((item) => !item.ok)
          .map((item) => item.error?.code ?? "unexpected"),
        successes: outcomes.filter((item) => item.ok).length,
      };
    }
    case "move":
      return writeResult(
        await storage.moveResource(message.resourceId, message.input),
      );
    case "delete":
      return writeResult(await storage.deleteResource(message.resourceId));
    case "marks":
      return writeResult(
        await storage.setMarks(message.resourceId, message.marks),
      );
    case "kv":
      return writeResult(
        await storage.setKV(
          message.resourceId,
          message.namespace,
          message.value,
        ),
      );
    case "asset":
      return writeResult(
        await storage.createAsset(message.resourceId, {
          extension: "jpg",
          kind: "external",
          mime: "image/jpeg",
          role: "original",
          type: "image",
          url: message.url,
        }),
      );
    case "refresh":
      return writeResult(await query.refresh());
    case "get":
      return query.getResource(message.resourceId);
    case "tree":
      return query.getResourceTree(message.resourceId);
    default:
      throw new Error(`Unknown worker action: ${message.action}`);
  }
}

process.on("disconnect", stopSampling);
process.on("beforeExit", stopSampling);
process.on("message", (message) => {
  void dispatch(message)
    .then((value) => send(message.id, value))
    .catch((error) =>
      send(message.id, {
        thrown: true,
        name: error instanceof Error ? error.name : "UnknownError",
      }),
    );
});
