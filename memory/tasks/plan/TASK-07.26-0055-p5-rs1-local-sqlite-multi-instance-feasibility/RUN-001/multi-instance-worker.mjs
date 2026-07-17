import process from "node:process";
import { performance } from "node:perf_hooks";

import { createLocalSqliteExtensia } from "../../../../../dist/composition/local-sqlite-runtime.js";
import {
  createLocalSqliteFullResourceDriver,
  createLocalSqliteReadonlyResourceDriver,
} from "../../../../../dist/storage/local-sqlite-resource-driver.js";

const [role, rootPath, timeoutText] = process.argv.slice(2);
const timeoutMs = Number(timeoutText);

if ((role !== "full" && role !== "readonly") || !rootPath) {
  throw new Error("Expected role, rootPath and timeoutMs");
}

const storage = {
  profile: "candidate-local-filesystem",
  reconciliationDelayMs: 1,
  rootPath,
  timeoutMs,
};

let runtime = null;
let observer = null;
let heldSession = null;

function serializeError(error) {
  return {
    code:
      error !== null && typeof error === "object" && "code" in error
        ? String(error.code)
        : null,
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : typeof error,
  };
}

async function createRuntime() {
  runtime = createLocalSqliteExtensia({ mode: role, storage });
  const result = await runtime.start();
  if (!result.ok) {
    throw new Error(`Runtime start failed: ${result.error.code}`);
  }
}

async function createObserver() {
  observer =
    role === "full"
      ? createLocalSqliteFullResourceDriver(storage)
      : createLocalSqliteReadonlyResourceDriver(storage);
  await observer.open();
}

async function stopCurrent() {
  if (heldSession !== null) {
    await heldSession.release();
    heldSession = null;
  }
  if (observer !== null) {
    await observer.close();
    observer = null;
  }
  if (runtime !== null) {
    const result = await runtime.stop();
    runtime = null;
    if (!result.ok) throw new Error(`Runtime stop failed: ${result.error.code}`);
  }
}

async function collectFullState(cursor = null) {
  const started = performance.now();
  const session = await observer.acquireStorageSession();
  const acquiredMs = performance.now() - started;
  const resources = [];
  const journal = [];
  try {
    for await (const resource of session.listResources()) resources.push(resource);
    for await (const entry of session.readCommittedOperationsAfter(cursor)) {
      journal.push(entry);
    }
  } finally {
    await session.release();
  }
  return {
    acquired_ms: acquiredMs,
    cursor,
    journal,
    journal_supported: true,
    resources,
  };
}

async function collectReadonlyState() {
  const started = performance.now();
  const resources = [];
  for await (const resource of observer.listResources()) resources.push(resource);
  return {
    elapsed_ms: performance.now() - started,
    journal_supported:
      typeof observer.readCommittedOperationsAfter === "function",
    resources,
  };
}

async function execute(action, payload) {
  switch (action) {
    case "create":
      return runtime.storage().createResource({ title: payload.title });
    case "create-exit-without-receipt": {
      const result = await runtime.storage().createResource({ title: payload.title });
      process.exit(result.ok ? 77 : 78);
      return undefined;
    }
    case "get":
      return runtime.query().getResource(payload.id);
    case "state":
      return role === "full"
        ? collectFullState(payload?.cursor ?? null)
        : collectReadonlyState();
    case "acquire": {
      if (role !== "full") throw new Error("Readonly role cannot acquire a full session");
      if (heldSession !== null) throw new Error("A session is already held");
      const started = performance.now();
      try {
        const session = await observer.acquireStorageSession();
        const acquiredMs = performance.now() - started;
        if (payload?.hold === true) {
          heldSession = session;
        } else {
          await session.release();
        }
        return { acquired: true, acquired_ms: acquiredMs, held: payload?.hold === true };
      } catch (error) {
        return {
          acquired: false,
          elapsed_ms: performance.now() - started,
          error: serializeError(error),
        };
      }
    }
    case "release":
      if (heldSession === null) throw new Error("No held session");
      await heldSession.release();
      heldSession = null;
      return { released: true };
    case "restart":
      await stopCurrent();
      await createRuntime();
      await createObserver();
      return { restarted: true };
    case "stop":
      await stopCurrent();
      return { stopped: true };
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

let queue = Promise.resolve();
process.on("message", (message) => {
  queue = queue.then(async () => {
    const { action, id, payload } = message;
    try {
      const data = await execute(action, payload);
      if (process.connected) process.send({ data, id, ok: true });
    } catch (error) {
      if (process.connected) {
        process.send({ error: serializeError(error), id, ok: false });
      }
    }
  });
});

try {
  await createRuntime();
  await createObserver();
  process.send({
    data: { pid: process.pid, role, timeout_ms: timeoutMs },
    ok: true,
    type: "ready",
  });
} catch (error) {
  process.send({ error: serializeError(error), ok: false, type: "ready" });
  process.exitCode = 1;
}

