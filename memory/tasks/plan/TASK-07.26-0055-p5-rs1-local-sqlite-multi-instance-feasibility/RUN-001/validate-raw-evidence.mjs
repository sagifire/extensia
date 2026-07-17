import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const runDirectory = dirname(fileURLToPath(import.meta.url));
const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : [1, 2, 3].map((run) => join(runDirectory, `raw-evidence-R${run}.json`));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sequences(state) {
  return state.journal.map((entry) => entry.sequence);
}

function expectedSequences(count, start = 1) {
  return Array.from({ length: count }, (_, index) => String(index + start));
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const summaries = [];

for (const file of files) {
  const evidence = JSON.parse(readFileSync(file, "utf8"));
  const label = file.split(/[\\/]/).at(-1);
  const full = evidence.full_full;
  const readonly = evidence.full_readonly;
  const crash = evidence.crash_restart;

  assert(full.alternating.length === 6, `${label}: alternating count`);
  assert(
    same(
      full.alternating.flatMap((step) => sequences(step.observer_storage_after_cursor)),
      expectedSequences(6),
    ),
    `${label}: alternating sequence`,
  );
  assert(
    full.alternating.every(
      (step) =>
        !step.observer_runtime_read.ok &&
        step.observer_runtime_read.code === "RESOURCE_NOT_FOUND",
    ),
    `${label}: runtime stale observation`,
  );
  assert(same(sequences(full.final_a), expectedSequences(6)), `${label}: final A journal`);
  assert(same(sequences(full.final_b), expectedSequences(6)), `${label}: final B journal`);
  assert(full.final_a.resource_count === 6, `${label}: final A resources`);
  assert(full.final_b.resource_count === 6, `${label}: final B resources`);
  assert(
    same(sequences(full.replay_after_2), expectedSequences(4, 3)),
    `${label}: cursor replay after 2`,
  );
  assert(full.replay_at_head.journal.length === 0, `${label}: cursor at head`);
  assert(!full.timeout.contender.acquired, `${label}: timeout contender unexpectedly acquired`);
  assert(
    full.timeout.contender.error?.message === "database is locked",
    `${label}: timeout error`,
  );
  assert(full.release_waits.length === 10, `${label}: release wait count`);
  assert(
    full.release_waits.every((item) => item.result.acquired),
    `${label}: release waiter failed`,
  );

  const concurrent = full.concurrent.flatMap((pair) => [pair.a, pair.b]);
  const concurrentSuccess = concurrent.filter((result) => result.ok).length;
  const concurrentFailures = concurrent.filter((result) => !result.ok);
  assert(concurrent.length === 10, `${label}: concurrent attempt count`);
  assert(concurrentSuccess > 0, `${label}: no concurrent success`);
  assert(
    concurrentFailures.every((result) => result.code === "STORAGE_LOCK_FAILED"),
    `${label}: concurrent failure normalization`,
  );
  assert(
    same(sequences(full.after_concurrent), expectedSequences(6 + concurrentSuccess)),
    `${label}: concurrent journal continuity`,
  );
  assert(
    full.after_concurrent.resource_count === 6 + concurrentSuccess,
    `${label}: concurrent resource cardinality`,
  );

  assert(!readonly.initial_readonly.journal_supported, `${label}: readonly journal seam`);
  assert(
    readonly.readonly_observed_before_restart.resource_titles.includes(
      readonly.created_for_readonly.title,
    ),
    `${label}: long-lived readonly storage missed external commit`,
  );
  assert(
    !readonly.stale_runtime_read.ok &&
      readonly.stale_runtime_read.code === "RESOURCE_NOT_FOUND",
    `${label}: readonly runtime should be stale`,
  );
  assert(readonly.refreshed_runtime_read.ok, `${label}: readonly restart visibility`);
  assert(!readonly.readonly_during_writer_lease.ok, `${label}: readonly lock contention`);
  assert(
    readonly.readonly_during_writer_lease.message.includes("database is locked"),
    `${label}: readonly lock error`,
  );
  const snapshots = readonly.snapshots;
  assert(
    snapshots.before_start.sha256 === snapshots.after_start.sha256 &&
      snapshots.after_start.sha256 === snapshots.after_initial_read.sha256,
    `${label}: readonly start/read wrote storage`,
  );
  assert(
    snapshots.before_observe.sha256 === snapshots.after_observe.sha256,
    `${label}: readonly observation wrote storage`,
  );
  assert(
    snapshots.after_observe.sha256 ===
      snapshots.before_writer_contention.sha256,
    `${label}: readonly restart/runtime read wrote storage`,
  );
  assert(
    snapshots.before_writer_contention.sha256 ===
      snapshots.after_writer_contention.sha256,
    `${label}: readonly contention wrote storage`,
  );

  assert(
    same(
      sequences(crash.lock_owner_crash.before),
      sequences(crash.lock_owner_crash.after),
    ),
    `${label}: clean lock-owner crash changed journal`,
  );
  assert(
    crash.lock_owner_crash.before.resource_count ===
      crash.lock_owner_crash.after.resource_count,
    `${label}: clean lock-owner crash changed resources`,
  );
  assert(
    crash.lock_owner_crash.process_exit.signal === "SIGKILL",
    `${label}: lock-owner crash signal`,
  );
  assert(crash.lost_receipt.process_exit.code === 77, `${label}: lost receipt exit`);
  assert(crash.lost_receipt.observer_resource !== null, `${label}: lost receipt visibility`);
  assert(
    crash.lost_receipt.after_cursor.journal.length === 1,
    `${label}: lost receipt cursor cardinality`,
  );
  assert(
    Number(crash.lost_receipt.after_cursor.journal[0].sequence) ===
      crash.lock_owner_crash.after.journal.length + 1,
    `${label}: lost receipt sequence`,
  );
  assert(
    crash.readonly_observer_crash.restarted_runtime_read.ok,
    `${label}: readonly crash/restart runtime visibility`,
  );

  const waits = full.release_waits.map((item) => item.result.acquired_ms);
  summaries.push({
    concurrent_attempts: concurrent.length,
    concurrent_lock_failures: concurrentFailures.length,
    concurrent_successes: concurrentSuccess,
    configured_timeout_ms: evidence.environment.timeout_ms,
    file: label,
    final_sequence: crash.lost_receipt.after_cursor.journal[0].sequence,
    release_wait_max_ms: Math.max(...waits),
    release_wait_min_ms: Math.min(...waits),
    timeout_observed_ms: full.timeout.contender.elapsed_ms,
  });
}

process.stdout.write(
  `${JSON.stringify({ runs: summaries.length, status: "PASS", summaries }, null, 2)}\n`,
);
