import { createHash, randomUUID } from "node:crypto";
import { fork } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { arch, platform, release } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const runDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(runDirectory, "../../../../..");
const temporaryBase = join(repositoryRoot, ".tmp");
mkdirSync(temporaryBase, { recursive: true });

const rootPath = mkdtempSync(join(temporaryBase, "p5-rs1-"));
const workerPath = join(runDirectory, "multi-instance-worker.mjs");
const timeoutMs = 250;

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function snapshot(root) {
  const visit = (directory) =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return visit(path);
      const stat = statSync(path);
      return [
        {
          path: relative(root, path).replaceAll("\\", "/"),
          bytes: stat.size,
          mtime_ms: stat.mtimeMs,
          sha256: sha256(path),
        },
      ];
    });
  return visit(root).sort((left, right) => left.path.localeCompare(right.path));
}

function simplifyWrite(result) {
  if (!result.ok) return { ok: false, code: result.error.code };
  return {
    id: result.value.resource.data.id,
    ok: true,
    operation_id: result.value.operation_id,
    title: result.value.resource.data.title,
    warnings: result.value.warnings.map((warning) => warning.code),
  };
}

function simplifyRead(result) {
  return result.ok
    ? { id: result.value.data.id, ok: true, title: result.value.data.title }
    : { code: result.error.code, ok: false };
}

function simplifyState(state) {
  return {
    acquired_ms: state.acquired_ms ?? null,
    elapsed_ms: state.elapsed_ms ?? null,
    journal: (state.journal ?? []).map((entry) => ({
      actor_id: entry.actor_id,
      operation_id: entry.operation_id,
      sequence: entry.sequence,
      type: entry.type,
    })),
    journal_supported: state.journal_supported,
    resources: state.resources.map((resource) => ({
      id: resource.data.id,
      title: resource.data.title,
    })),
  };
}

function manifestState(state) {
  return {
    acquired_ms: state.acquired_ms ?? null,
    elapsed_ms: state.elapsed_ms ?? null,
    journal: state.journal.map((entry) => ({
      actor_id: entry.actor_id,
      operation_id: entry.operation_id,
      sequence: entry.sequence,
      type: entry.type,
    })),
    journal_supported: state.journal_supported,
    resource_count: state.resources.length,
    resource_titles: state.resources.map((resource) => resource.title).sort(),
  };
}

function snapshotManifest(value) {
  return {
    files: value,
    sha256: createHash("sha256")
      .update(JSON.stringify(value))
      .digest("hex"),
  };
}

class ResearchWorker {
  constructor(role, label) {
    this.role = role;
    this.label = label;
    this.nextId = 1;
    this.pending = new Map();
    this.child = fork(workerPath, [role, rootPath, String(timeoutMs)], {
      cwd: repositoryRoot,
      serialization: "advanced",
      silent: true,
    });
    this.stderr = "";
    this.stdout = "";
    this.child.stderr.on("data", (chunk) => (this.stderr += chunk));
    this.child.stdout.on("data", (chunk) => (this.stdout += chunk));
    this.ready = new Promise((resolveReady, rejectReady) => {
      this.resolveReady = resolveReady;
      this.rejectReady = rejectReady;
    });
    this.exited = new Promise((resolveExit) => {
      this.child.once("exit", (code, signal) => {
        const result = { code, signal, stderr: this.stderr, stdout: this.stdout };
        resolveExit(result);
        for (const { reject } of this.pending.values()) {
          reject(new Error(`${this.label} exited before response: ${JSON.stringify(result)}`));
        }
        this.pending.clear();
      });
    });
    this.child.on("message", (message) => this.onMessage(message));
    this.child.on("error", (error) => this.rejectReady(error));
  }

  onMessage(message) {
    if (message.type === "ready") {
      if (message.ok) this.resolveReady(message.data);
      else this.rejectReady(new Error(JSON.stringify(message.error)));
      return;
    }
    const pending = this.pending.get(message.id);
    if (pending === undefined) return;
    this.pending.delete(message.id);
    if (message.ok) pending.resolve(message.data);
    else pending.reject(new Error(JSON.stringify(message.error)));
  }

  request(action, payload = undefined) {
    const id = this.nextId++;
    return new Promise((resolveRequest, rejectRequest) => {
      this.pending.set(id, { reject: rejectRequest, resolve: resolveRequest });
      this.child.send({ action, id, payload });
    });
  }

  async stop() {
    if (this.child.exitCode !== null || this.child.signalCode !== null) {
      return this.exited;
    }
    await this.request("stop");
    this.child.disconnect();
    return this.exited;
  }

  async kill() {
    if (this.child.exitCode === null && this.child.signalCode === null) {
      this.child.kill("SIGKILL");
    }
    return this.exited;
  }
}

async function start(role, label) {
  const worker = new ResearchWorker(role, label);
  const ready = await worker.ready;
  return { ready, worker };
}

const sqliteProbe = new DatabaseSync(":memory:");
const sqliteVersion = sqliteProbe.prepare("select sqlite_version() version").get().version;
sqliteProbe.close();

const evidence = {
  environment: {
    architecture: arch(),
    node: process.version,
    os_platform: platform(),
    os_release: release(),
    sqlite: sqliteVersion,
    storage_root: rootPath,
    timeout_ms: timeoutMs,
  },
  source: {
    git_baseline: "9968a32b0951e44e706d385744a5f25fe961dfbe",
    files: Object.fromEntries(
      [
        "package-lock.json",
        "src/composition/local-sqlite-runtime.ts",
        "src/storage/local-sqlite-resource-driver.ts",
        "src/storage/resource-write-protocol.ts",
      ].map((path) => [path, sha256(join(repositoryRoot, path))]),
    ),
    profile: "embedded-transactional/local-sqlite-v1",
  },
  full_full: {},
  full_readonly: {},
  crash_restart: {},
};

let fullA;
let fullB;
let writer;
let readonly;
let replacement;
let restartedReadonly;

try {
  ({ worker: fullA, ready: evidence.full_full.process_a } = await start("full", "full-a"));
  ({ worker: fullB, ready: evidence.full_full.process_b } = await start("full", "full-b"));

  const alternating = [];
  let cursor = null;
  for (let index = 0; index < 6; index += 1) {
    const owner = index % 2 === 0 ? fullA : fullB;
    const observer = index % 2 === 0 ? fullB : fullA;
    const ownerLabel = index % 2 === 0 ? "A" : "B";
    const observerLabel = index % 2 === 0 ? "B" : "A";
    const created = simplifyWrite(
      await owner.request("create", { title: `ff-alternating-${index + 1}` }),
    );
    const runtimeRead = simplifyRead(await observer.request("get", { id: created.id }));
    const observed = simplifyState(await observer.request("state", { cursor }));
    const newCursor = observed.journal.at(-1)?.sequence ?? cursor;
    alternating.push({
      committed_by: ownerLabel,
      created,
      observed_by: observerLabel,
      observer_runtime_read: runtimeRead,
      observer_storage_after_cursor: observed,
      prior_cursor: cursor,
    });
    cursor = newCursor;
  }
  evidence.full_full.alternating = alternating;
  evidence.full_full.final_a = simplifyState(await fullA.request("state"));
  evidence.full_full.final_b = simplifyState(await fullB.request("state"));
  evidence.full_full.replay_after_2 = simplifyState(
    await fullA.request("state", { cursor: "2" }),
  );
  evidence.full_full.replay_at_head = simplifyState(
    await fullB.request("state", { cursor }),
  );

  const timeoutHold = await fullA.request("acquire", { hold: true });
  const timeoutAttempt = await fullB.request("acquire", { hold: false });
  await fullA.request("release");
  evidence.full_full.timeout = { hold: timeoutHold, contender: timeoutAttempt };

  const releaseWaits = [];
  for (let index = 0; index < 10; index += 1) {
    const holder = index % 2 === 0 ? fullA : fullB;
    const contender = index % 2 === 0 ? fullB : fullA;
    const held = await holder.request("acquire", { hold: true });
    const waiting = contender.request("acquire", { hold: false });
    await delay(40);
    await holder.request("release");
    releaseWaits.push({ held, result: await waiting });
  }
  evidence.full_full.release_waits = releaseWaits;

  const concurrent = [];
  for (let index = 0; index < 5; index += 1) {
    const [left, right] = await Promise.all([
      fullA.request("create", { title: `ff-concurrent-a-${index + 1}` }),
      fullB.request("create", { title: `ff-concurrent-b-${index + 1}` }),
    ]);
    concurrent.push({ a: simplifyWrite(left), b: simplifyWrite(right) });
  }
  evidence.full_full.concurrent = concurrent;
  evidence.full_full.after_concurrent = simplifyState(await fullA.request("state"));

  await fullA.stop();
  await fullB.stop();
  fullA = null;
  fullB = null;

  ({ worker: writer, ready: evidence.full_readonly.writer } = await start("full", "writer"));
  const beforeReadonlyStart = snapshot(rootPath);
  ({ worker: readonly, ready: evidence.full_readonly.readonly } = await start("readonly", "readonly"));
  const afterReadonlyStart = snapshot(rootPath);
  const initialReadonly = simplifyState(await readonly.request("state"));
  const afterReadonlyInitialRead = snapshot(rootPath);

  const createdForReadonly = simplifyWrite(
    await writer.request("create", { title: "fr-external-commit" }),
  );
  const staleRuntimeRead = simplifyRead(
    await readonly.request("get", { id: createdForReadonly.id }),
  );
  const beforeReadonlyObserve = snapshot(rootPath);
  const readonlyObserved = simplifyState(await readonly.request("state"));
  const afterReadonlyObserve = snapshot(rootPath);
  await readonly.request("restart");
  const refreshedRuntimeRead = simplifyRead(
    await readonly.request("get", { id: createdForReadonly.id }),
  );
  const beforeReadonlyContention = snapshot(rootPath);
  const writerHeld = await writer.request("acquire", { hold: true });
  const readonlyDuringWriterLease = await readonly.request("state").then(
    (value) => ({ ok: true, value: simplifyState(value) }),
    (error) => ({ message: error.message, ok: false }),
  );
  await writer.request("release");
  const readonlyAfterRelease = simplifyState(await readonly.request("state"));
  const afterReadonlyContention = snapshot(rootPath);
  evidence.full_readonly.matrix = {
    after_readonly_initial_read_snapshot: afterReadonlyInitialRead,
    after_readonly_observe_snapshot: afterReadonlyObserve,
    after_readonly_start_snapshot: afterReadonlyStart,
    after_writer_contention_snapshot: afterReadonlyContention,
    before_readonly_contention_snapshot: beforeReadonlyContention,
    before_readonly_observe_snapshot: beforeReadonlyObserve,
    before_readonly_start_snapshot: beforeReadonlyStart,
    created_for_readonly: createdForReadonly,
    initial_readonly: initialReadonly,
    readonly_after_release: readonlyAfterRelease,
    readonly_during_writer_lease: readonlyDuringWriterLease,
    refreshed_runtime_read: refreshedRuntimeRead,
    stale_runtime_read: staleRuntimeRead,
    writer_held: writerHeld,
  };

  const beforeCrashState = simplifyState(await writer.request("state"));
  const heldBeforeCrash = await writer.request("acquire", { hold: true });
  const killedWriter = await writer.kill();
  writer = null;
  ({ worker: replacement, ready: evidence.crash_restart.replacement_after_lock_crash } = await start(
    "full",
    "replacement",
  ));
  const afterLockCrashState = simplifyState(await replacement.request("state"));
  evidence.crash_restart.lock_owner_crash = {
    after: afterLockCrashState,
    before: beforeCrashState,
    held: heldBeforeCrash,
    process_exit: killedWriter,
  };

  const lostReceiptTitle = `lost-receipt-${randomUUID()}`;
  const beforeLostReceipt = simplifyState(await replacement.request("state"));
  const lostReceiptExit = replacement.request("create-exit-without-receipt", {
    title: lostReceiptTitle,
  }).then(
    () => ({ unexpected_response: true }),
    async () => replacement.exited,
  );
  const replacementExit = await lostReceiptExit;
  replacement = null;
  const readonlyAfterLostReceipt = simplifyState(await readonly.request("state"));
  ({ worker: replacement, ready: evidence.crash_restart.replacement_after_lost_receipt } = await start(
    "full",
    "replacement-2",
  ));
  const afterLostReceipt = simplifyState(await replacement.request("state", {
    cursor: beforeLostReceipt.journal.at(-1)?.sequence ?? null,
  }));
  const lostReceiptResource = readonlyAfterLostReceipt.resources.find(
    (resource) => resource.title === lostReceiptTitle,
  );
  evidence.crash_restart.lost_receipt = {
    after_cursor: afterLostReceipt,
    observer_resource: lostReceiptResource ?? null,
    process_exit: replacementExit,
    title: lostReceiptTitle,
  };

  const readonlyKilled = await readonly.kill();
  readonly = null;
  ({ worker: restartedReadonly, ready: evidence.crash_restart.readonly_restart } = await start(
    "readonly",
    "readonly-restarted",
  ));
  const restartedReadonlyState = simplifyState(await restartedReadonly.request("state"));
  const restartedRuntimeRead = lostReceiptResource
    ? simplifyRead(await restartedReadonly.request("get", { id: lostReceiptResource.id }))
    : null;
  evidence.crash_restart.readonly_observer_crash = {
    process_exit: readonlyKilled,
    restarted_runtime_read: restartedRuntimeRead,
    restarted_storage_state: restartedReadonlyState,
  };

  await replacement.stop();
  await restartedReadonly.stop();
  replacement = null;
  restartedReadonly = null;

  evidence.final_snapshot = snapshot(rootPath);
  const readonlyMatrix = evidence.full_readonly.matrix;
  const rawManifest = {
    environment: evidence.environment,
    source: evidence.source,
    full_full: {
      alternating: evidence.full_full.alternating.map((step) => ({
        committed_by: step.committed_by,
        created: step.created,
        observed_by: step.observed_by,
        observer_runtime_read: step.observer_runtime_read,
        observer_storage_after_cursor: manifestState(
          step.observer_storage_after_cursor,
        ),
        prior_cursor: step.prior_cursor,
      })),
      after_concurrent: manifestState(evidence.full_full.after_concurrent),
      concurrent: evidence.full_full.concurrent,
      final_a: manifestState(evidence.full_full.final_a),
      final_b: manifestState(evidence.full_full.final_b),
      process_a: evidence.full_full.process_a,
      process_b: evidence.full_full.process_b,
      release_waits: evidence.full_full.release_waits,
      replay_after_2: manifestState(evidence.full_full.replay_after_2),
      replay_at_head: manifestState(evidence.full_full.replay_at_head),
      timeout: evidence.full_full.timeout,
    },
    full_readonly: {
      created_for_readonly: readonlyMatrix.created_for_readonly,
      initial_readonly: manifestState(readonlyMatrix.initial_readonly),
      readonly_observed_before_restart: manifestState(readonlyObserved),
      readonly_after_release: manifestState(readonlyMatrix.readonly_after_release),
      readonly_during_writer_lease: readonlyMatrix.readonly_during_writer_lease,
      refreshed_runtime_read: readonlyMatrix.refreshed_runtime_read,
      snapshots: {
        after_initial_read: snapshotManifest(
          readonlyMatrix.after_readonly_initial_read_snapshot,
        ),
        after_observe: snapshotManifest(
          readonlyMatrix.after_readonly_observe_snapshot,
        ),
        after_start: snapshotManifest(
          readonlyMatrix.after_readonly_start_snapshot,
        ),
        after_writer_contention: snapshotManifest(
          readonlyMatrix.after_writer_contention_snapshot,
        ),
        before_observe: snapshotManifest(
          readonlyMatrix.before_readonly_observe_snapshot,
        ),
        before_start: snapshotManifest(
          readonlyMatrix.before_readonly_start_snapshot,
        ),
        before_writer_contention: snapshotManifest(
          readonlyMatrix.before_readonly_contention_snapshot,
        ),
      },
      stale_runtime_read: readonlyMatrix.stale_runtime_read,
      writer_held: readonlyMatrix.writer_held,
    },
    crash_restart: {
      lock_owner_crash: {
        after: manifestState(evidence.crash_restart.lock_owner_crash.after),
        before: manifestState(evidence.crash_restart.lock_owner_crash.before),
        held: evidence.crash_restart.lock_owner_crash.held,
        process_exit: evidence.crash_restart.lock_owner_crash.process_exit,
      },
      lost_receipt: {
        after_cursor: manifestState(
          evidence.crash_restart.lost_receipt.after_cursor,
        ),
        observer_resource:
          evidence.crash_restart.lost_receipt.observer_resource,
        process_exit: evidence.crash_restart.lost_receipt.process_exit,
        title: evidence.crash_restart.lost_receipt.title,
      },
      readonly_observer_crash: {
        process_exit:
          evidence.crash_restart.readonly_observer_crash.process_exit,
        restarted_runtime_read:
          evidence.crash_restart.readonly_observer_crash
            .restarted_runtime_read,
        restarted_storage_state: manifestState(
          evidence.crash_restart.readonly_observer_crash
            .restarted_storage_state,
        ),
      },
      readonly_restart: evidence.crash_restart.readonly_restart,
      replacement_after_lock_crash:
        evidence.crash_restart.replacement_after_lock_crash,
      replacement_after_lost_receipt:
        evidence.crash_restart.replacement_after_lost_receipt,
    },
    final_snapshot: snapshotManifest(evidence.final_snapshot),
    root_retained_for_audit: rootPath,
  };

  process.stdout.write(`${JSON.stringify(rawManifest)}\n`);
} finally {
  await Promise.allSettled(
    [fullA, fullB, writer, readonly, replacement, restartedReadonly]
      .filter(Boolean)
      .map((worker) => worker.kill()),
  );
}
