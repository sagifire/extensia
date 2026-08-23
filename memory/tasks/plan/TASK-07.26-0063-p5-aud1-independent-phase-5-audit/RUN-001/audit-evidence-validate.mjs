import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const runDirectory = dirname(fileURLToPath(import.meta.url));
const stabilizationDirectory = resolve(
  runDirectory,
  "../../TASK-07.26-0062-p5-stab-phase-5-stabilization/RUN-001",
);

function readEvidence(name) {
  const bytes = readFileSync(resolve(stabilizationDirectory, name));
  return {
    document: JSON.parse(bytes.toString("utf8")),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function assertCleanup(document, label) {
  assert.equal(document.cleanup_gate.all_workers_clean_exit, true, label);
  assert.equal(document.cleanup_gate.forced_kills, 0, label);
  assert.equal(document.cleanup_gate.pending_requests_after_exit, 0, label);
  assert.equal(document.cleanup_gate.task_local_storage_roots_removed, true, label);
}

function operationFamilies(run) {
  return [...run.operation_families].sort();
}

function collectWaits(value, output = []) {
  if (value === null || typeof value !== "object") return output;
  if (typeof value.actual_wait_ms === "number") output.push(value.actual_wait_ms);
  for (const child of Object.values(value)) collectWaits(child, output);
  return output;
}

function validateProcess(document, expectedRepetitions, runtimeSource) {
  assert.equal(document.process_gate, "PASS");
  assert.equal(document.support_claim, "NONE_STABILIZATION_EVIDENCE_ONLY");
  assert.equal(document.environment.runtime_source, runtimeSource);
  assert.equal(document.environment.filesystem.profile, "windows-local-ntfs-v1");
  assert.equal(document.environment.filesystem.local, true);
  assert.equal(document.environment.filesystem.filesystem, "NTFS");
  assert.equal(document.topology_scope.cooperating_extensia_processes, 2);
  assert.deepEqual(document.topology_scope.topologies, [
    "full/full",
    "full/readonly",
  ]);
  assert.equal(document.full_full.length, expectedRepetitions);
  assert.equal(document.full_readonly.length, expectedRepetitions);
  assert.equal(document.long_contention.length, expectedRepetitions);
  assert.equal(document.polling_herd.length, expectedRepetitions);
  assert.equal(document.repetitions.strategy_matrix_runs, expectedRepetitions);
  assertCleanup(document, `${runtimeSource} cleanup`);

  const expectedFamilies = [
    "asset.create",
    "resource.create",
    "resource.delete",
    "resource.kv.set",
    "resource.marks.set",
    "resource.move",
    "resource.update",
  ];
  for (const run of [...document.full_full, ...document.full_readonly]) {
    assert.deepEqual(operationFamilies(run), expectedFamilies);
    assert.equal(run.restart, true);
  }
  for (const run of document.full_full) {
    assert.equal(run.local_read_after_write, true);
    assert.equal(run.contention.successes + run.contention.lock_failures, 16);
  }
  for (const run of document.full_readonly) {
    assert.equal(run.zero_write.snapshot_equal, true);
    assert.equal(run.polling.eventual_visibility, true);
    assert.equal(
      run.mode_matrix.pre_aborted_public_refresh,
      "READ_MODEL_REFRESH_CANCELED",
    );
    assert.deepEqual(
      run.distances.map((distance) => distance.count),
      [0, 1, 32, 256, 257],
    );
    assert.deepEqual(
      run.distances.map((distance) => distance.sample.strategy),
      ["at-head", "delta", "delta", "delta", "rebuild"],
    );
    assert.equal(
      run.lock_wait.exhaustion.outcome,
      "READ_MODEL_REFRESH_EXHAUSTED",
    );
    assert.deepEqual(
      run.lock_wait.retry_recovery.samples.map((sample) => sample.outcome),
      ["lock", "success"],
    );
  }
  for (const run of document.long_contention) {
    assert.equal(run.starvation_observed, false);
    assert.equal(run.operations_per_actor, 32);
    for (const actor of Object.values(run.actors)) assert.ok(actor.successes > 0);
  }
  for (const run of document.polling_herd) {
    assert.equal(run.eventual_visibility, true);
    assert.equal(run.phase_alignment.characterization_only, true);
  }
  assert.equal(document.failed_startup.durable_mutation, false);
  assert.equal(document.stop_during_refresh.refresh_outcome, "success");
  assert.equal(
    document.stop_during_refresh.stop_during_refresh.synchronous_call_hard_cancel_claimed,
    false,
  );
  assert.deepEqual(document.published_data_policy, {
    raw_errors: false,
    resource_ids: false,
    root_paths: false,
    secrets: false,
  });

  const waits = collectWaits(document);
  return {
    full_full_lock_failures: document.full_full.reduce(
      (sum, run) => sum + run.contention.lock_failures,
      0,
    ),
    full_full_successes: document.full_full.reduce(
      (sum, run) => sum + run.contention.successes,
      0,
    ),
    max_actual_wait_ms: Math.max(...waits),
    repetitions: expectedRepetitions,
    runtime_source: runtimeSource,
  };
}

const processEvidence = readEvidence("process-evidence.json");
const packedProcessEvidence = readEvidence("packed-process-evidence.json");
const packageEvidence = readEvidence("package-evidence.json");

assert.equal(
  processEvidence.sha256,
  "9d8f441512c88a35c18d605c25888dd35d0c67541fe1244295b6246b937501ab",
);
assert.equal(
  packedProcessEvidence.sha256,
  "9907e307cedc0d9b1e643be30a02c32395f03e8900329f18417c62e7cf0b3d01",
);
assert.equal(
  packageEvidence.sha256,
  "da8af60c0e56cab24b1e6a81343a38354de9100d4b2badb0269e03875ecdf0b3",
);

const workspace = validateProcess(
  processEvidence.document,
  3,
  "workspace-dist",
);
const packed = validateProcess(
  packedProcessEvidence.document,
  1,
  "installed-package-dist",
);

const packageDocument = packageEvidence.document;
assert.equal(packageDocument.status, "PASS");
assert.deepEqual(packageDocument.comparison, {
  archive_byte_equal: true,
  archive_sha256_equal: true,
  content_equal: true,
  npm_manifest_equal: true,
});
assert.equal(packageDocument.archives.length, 2);
assert.equal(packageDocument.archives[0].content_manifest.length, 206);
assert.equal(packageDocument.archives[1].content_manifest.length, 206);
assert.equal(
  packageDocument.archives[0].archive_sha256,
  packageDocument.archives[1].archive_sha256,
);
assert.equal(
  packageDocument.packed_process_matrix.evidence_sha256,
  packedProcessEvidence.sha256,
);
assert.equal(packageDocument.consumer_install.status, "PASS");
assert.equal(packageDocument.public_root_probe.status, "PASS");
assert.deepEqual(packageDocument.public_root_probe.exports, [
  "createExtensia",
  "defineFullResourceDriver",
]);
assert.equal(packageDocument.public_root_probe.internal_subpath, "rejected");

process.stdout.write(
  `${JSON.stringify(
    {
      package: {
        archive_bytes: packageDocument.archives[0].archive_bytes,
        archive_entries: packageDocument.archives[0].content_manifest.length,
        archive_sha256: packageDocument.archives[0].archive_sha256,
        deterministic: packageDocument.comparison,
        evidence_sha256: packageEvidence.sha256,
      },
      packed: { ...packed, evidence_sha256: packedProcessEvidence.sha256 },
      status: "PASS",
      workspace: { ...workspace, evidence_sha256: processEvidence.sha256 },
    },
    null,
    2,
  )}\n`,
);
