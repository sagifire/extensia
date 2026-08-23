import { createLocalSqliteExtensia } from "../../../../../dist/composition/local-sqlite-runtime.js";

const [rootPath, mode, synchronizationMode = "manual"] = process.argv.slice(2);
const diagnostics = [];
const module = createLocalSqliteExtensia({
  mode,
  readModel: {
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
    profile: "candidate-local-filesystem",
    rootPath,
    timeoutMs: 250,
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
    case "refresh-at":
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, message.atEpochMs - Date.now())),
      );
      return writeResult(await query.refresh());
    case "create":
      return writeResult(await storage.createResource(message.input));
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
        failures: outcomes.filter((item) => !item.ok).map((item) => item.error),
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
      return query.refresh();
    case "get":
      return query.getResource(message.resourceId);
    case "tree":
      return query.getResourceTree(message.resourceId);
    default:
      throw new Error(`Unknown worker action: ${message.action}`);
  }
}

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
