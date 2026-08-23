import { describe, expect, it, vi } from "vitest";

import { parseIDString, parseTimestamp } from "../domain/scalars.js";
import type { ResourceSnapshot } from "../domain/snapshots.js";
import { journalSequence } from "../storage/resource-journal-integrity.js";
import { ResourceRuntimeIntegrityError } from "../storage/resource-runtime-integrity.js";
import {
  ResourceStorageSessionTransientError,
  type FullResourceDriverAdapter,
} from "../storage/full-resource-driver-adapter.js";
import type { ResourceStorageSession } from "../storage/resource-write-protocol.js";
import type { CommittedChangeObservation } from "./read-model-observation.js";
import { createDeterministicReadModelSynchronizationRuntime } from "./deterministic-read-model-synchronization.js";
import { buildCompleteReadModelGeneration } from "./read-model-generation.js";
import { createReadModelPublicationCoordinator } from "./read-model-coordinator.js";
import { createFullCommittedChangeObservationPort } from "./read-model-storage-observation.js";
import {
  createReadModelSynchronizationActor,
  createReadModelSynchronizationAttempt,
  ReadModelSynchronizationTransientError,
  resolveReadModelSynchronizationRetryConfig,
  type ReadModelSynchronizationAttemptContext,
  type ReadModelSynchronizationAttemptResult,
  type ReadModelSynchronizationResult,
} from "./read-model-synchronization.js";
import {
  createRuntimeFaultSink,
  type RuntimeFault,
} from "./runtime-fault-sink.js";

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return Object.freeze({ promise, reject, resolve });
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function flushUntil(condition: () => boolean): Promise<void> {
  for (let index = 0; index < 50 && !condition(); index += 1) {
    await Promise.resolve();
  }
  expect(condition()).toBe(true);
}

function success(changed = false): ReadModelSynchronizationAttemptResult {
  return Object.freeze({ changed, ok: true });
}

function resource(index: number): ResourceSnapshot {
  const now = parseTimestamp(1_787_337_600_000);
  return {
    assets: [],
    data: {
      created_at: now,
      description: null,
      hidden: false,
      id: parseIDString(
        `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`,
      ),
      is_deleted: false,
      locked: false,
      order_index: 0,
      parent_id: null,
      title: `Resource ${index}`,
      updated_at: now,
    },
    kv: {},
    marks: [],
  };
}

function createFaultHarness(): {
  readonly faults: RuntimeFault[];
  readonly closed: { value: number };
  readonly cleaned: { value: number };
  readonly sink: ReturnType<typeof createRuntimeFaultSink>;
} {
  const faults: RuntimeFault[] = [];
  const closed = { value: 0 };
  const cleaned = { value: 0 };
  const sink = createRuntimeFaultSink({
    closeIntake: () => {
      closed.value += 1;
    },
    cleanup: (fault) => {
      faults.push(fault);
      cleaned.value += 1;
    },
  });
  return Object.freeze({ cleaned, closed, faults, sink });
}

async function expectCanceled(
  promise: Promise<ReadModelSynchronizationResult>,
): Promise<void> {
  await expect(promise).resolves.toEqual({
    code: "READ_MODEL_REFRESH_CANCELED",
    ok: false,
  });
}

describe("read-model synchronization actor", () => {
  it("coalesces a pre-invocation cohort into one lifecycle-owned attempt", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime(10);
    const fault = createFaultHarness();
    const contexts: ReadModelSynchronizationAttemptContext[] = [];
    const actor = createReadModelSynchronizationActor({
      attempt: async (context) => {
        contexts.push(context);
        return success(true);
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });

    const first = actor.refresh();
    const second = actor.refresh();
    expect(actor.inspect()).toMatchObject({
      admitted_waiters: 2,
      state: "scheduled",
      trailing_epoch: false,
    });
    expect(runtime.runNextAdmission()).toBe(true);
    await flush();

    await expect(first).resolves.toMatchObject({
      attempts: 1,
      changed: true,
      ok: true,
    });
    await expect(second).resolves.toMatchObject({
      attempts: 1,
      changed: true,
      ok: true,
    });
    expect(contexts).toHaveLength(1);
    expect(contexts[0]).toMatchObject({
      attempt: 1,
      attempt_admission_deadline_monotonic_ms: 5_010,
      phase: "read-observation",
      remaining_budget_ms: 5_000,
    });
    expect(actor.inspect()).toMatchObject({
      active_epoch: false,
      admitted_waiters: 0,
      state: "idle",
    });
    await actor.stop();
  });

  it("serializes a post-invocation caller into one fresh trailing epoch", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime(0);
    const fault = createFaultHarness();
    const attempts = [
      deferred<ReadModelSynchronizationAttemptResult>(),
      deferred<ReadModelSynchronizationAttemptResult>(),
    ];
    const deadlines: number[] = [];
    let concurrent = 0;
    let maximumConcurrent = 0;
    const actor = createReadModelSynchronizationActor({
      attempt: async (context) => {
        deadlines.push(context.attempt_admission_deadline_monotonic_ms);
        concurrent += 1;
        maximumConcurrent = Math.max(maximumConcurrent, concurrent);
        try {
          return await attempts[context.attempt - 1 + (deadlines.length - 1)]!
            .promise;
        } finally {
          concurrent -= 1;
        }
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      retry: { deadlineMs: 100, maxAttempts: 1 },
      scheduler: runtime,
    });

    const first = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    const second = actor.refresh();
    for (let index = 0; index < 20; index += 1) actor.requestBackground();
    expect(actor.inspect().trailing_epoch).toBe(true);

    runtime.advanceBy(500);
    attempts[0]!.resolve(success());
    await flush();
    await expect(first).resolves.toMatchObject({ ok: true });
    expect(runtime.pendingAdmissions).toBe(1);
    let secondSettled = false;
    void second.then(() => {
      secondSettled = true;
    });
    await flush();
    expect(secondSettled).toBe(false);

    runtime.runNextAdmission();
    await flush();
    attempts[1]!.resolve(success(true));
    await flush();
    await expect(second).resolves.toMatchObject({ changed: true, ok: true });
    expect(deadlines).toEqual([100, 600]);
    expect(maximumConcurrent).toBe(1);
    await actor.stop();
  });

  it("keeps a late waiter in a fresh epoch after earlier exhaustion", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime(0);
    const fault = createFaultHarness();
    const firstAttempt = deferred<ReadModelSynchronizationAttemptResult>();
    const deadlines: number[] = [];
    let calls = 0;
    const actor = createReadModelSynchronizationActor({
      attempt: async (context) => {
        calls += 1;
        deadlines.push(context.attempt_admission_deadline_monotonic_ms);
        if (calls === 1) return firstAttempt.promise;
        return success();
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      retry: { deadlineMs: 100, maxAttempts: 1 },
      scheduler: runtime,
    });

    const first = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    const late = actor.refresh();
    runtime.advanceBy(20);
    firstAttempt.resolve(
      Object.freeze({ category: "storage-read", ok: false }),
    );
    await flush();
    await expect(first).resolves.toMatchObject({
      code: "READ_MODEL_REFRESH_EXHAUSTED",
      last_failure: "storage-read",
      reason: "attempts",
    });
    expect(runtime.pendingAdmissions).toBe(1);
    runtime.advanceBy(30);
    runtime.runNextAdmission();
    await flush();
    await expect(late).resolves.toMatchObject({ ok: true });
    expect(deadlines).toEqual([100, 150]);
    await actor.stop();
  });

  it("retries only explicit transient categories with capped equal jitter", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime(0);
    runtime.enqueueRandom(0, 0.999, 0);
    const fault = createFaultHarness();
    const categories = [
      "storage-lock",
      "storage-unavailable",
      "storage-read",
    ] as const;
    const contexts: ReadModelSynchronizationAttemptContext[] = [];
    const actor = createReadModelSynchronizationActor({
      attempt: async (context) => {
        contexts.push(context);
        const category = categories[context.attempt - 1];
        if (category !== undefined) {
          throw new ReadModelSynchronizationTransientError(category);
        }
        return success();
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      retry: {
        deadlineMs: 1_000,
        initialDelayMs: 10,
        maxAttempts: 4,
        maxDelayMs: 25,
      },
      scheduler: runtime,
    });

    const result = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    expect(runtime.sleepDelays).toEqual([5]);
    runtime.advanceBy(5);
    await flush();
    expect(runtime.sleepDelays).toEqual([5, 20]);
    runtime.advanceBy(20);
    await flush();
    expect(runtime.sleepDelays).toEqual([5, 20, 13]);
    runtime.advanceBy(13);
    await flush();

    await expect(result).resolves.toMatchObject({ attempts: 4, ok: true });
    expect(contexts.map((item) => item.attempt)).toEqual([1, 2, 3, 4]);
    expect(new Set(contexts.map((item) => item.signal)).size).toBe(1);
    expect(fault.sink.failed).toBe(false);
    await actor.stop();
  });

  it("uses deadline precedence on a simultaneous final-attempt cutoff", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime(0);
    const fault = createFaultHarness();
    const actor = createReadModelSynchronizationActor({
      attempt: async () => {
        runtime.advanceBy(100);
        throw new ReadModelSynchronizationTransientError("storage-lock");
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      retry: { deadlineMs: 100, maxAttempts: 1 },
      scheduler: runtime,
    });
    const result = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    await expect(result).resolves.toEqual({
      attempts: 1,
      code: "READ_MODEL_REFRESH_EXHAUSTED",
      last_failure: "storage-lock",
      ok: false,
      reason: "deadline",
    });
    expect(runtime.pendingSleeps).toBe(0);
    await actor.stop();
  });

  it("returns attempts before cutoff and schedules no delay after final attempt", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime(0);
    const fault = createFaultHarness();
    const actor = createReadModelSynchronizationActor({
      attempt: async () => {
        throw new ReadModelSynchronizationTransientError("storage-read");
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      retry: { deadlineMs: 100, maxAttempts: 1 },
      scheduler: runtime,
    });
    const result = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    await expect(result).resolves.toMatchObject({
      attempts: 1,
      last_failure: "storage-read",
      reason: "attempts",
    });
    expect(runtime.sleepDelays).toEqual([]);
    await actor.stop();
  });

  it("allows an admitted success to overshoot without claiming a hard timeout", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime(0);
    const fault = createFaultHarness();
    let calls = 0;
    const actor = createReadModelSynchronizationActor({
      attempt: async () => {
        calls += 1;
        runtime.advanceBy(250);
        return success(true);
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      retry: { deadlineMs: 100, maxAttempts: 3 },
      scheduler: runtime,
    });
    const result = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    await expect(result).resolves.toMatchObject({
      attempts: 1,
      changed: true,
      ok: true,
    });
    expect(calls).toBe(1);
    expect(runtime.pendingSleeps).toBe(0);
    await actor.stop();
  });

  it("does not admit a pre-aborted caller or register its listener", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    const controller = new AbortController();
    controller.abort("caller");
    const add = vi.spyOn(controller.signal, "addEventListener");
    const actor = createReadModelSynchronizationActor({
      attempt: async () => success(),
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });

    await expectCanceled(actor.refresh(controller.signal));
    expect(add).not.toHaveBeenCalled();
    expect(runtime.pendingAdmissions).toBe(0);
    expect(actor.inspect().admitted_waiters).toBe(0);
    await actor.stop();
  });

  it("detaches one or the sole caller without canceling shared work", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    const gate = deferred<ReadModelSynchronizationAttemptResult>();
    const firstController = new AbortController();
    const secondController = new AbortController();
    let lifecycleSignal: AbortSignal | null = null;
    const actor = createReadModelSynchronizationActor({
      attempt: async (context) => {
        lifecycleSignal = context.signal;
        return gate.promise;
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });

    const first = actor.refresh(firstController.signal);
    const second = actor.refresh(secondController.signal);
    runtime.runNextAdmission();
    await flush();
    firstController.abort("caller-only");
    await expectCanceled(first);
    expect(lifecycleSignal?.aborted).toBe(false);
    gate.resolve(success(true));
    await flush();
    await expect(second).resolves.toMatchObject({ changed: true, ok: true });

    const soleGate = deferred<ReadModelSynchronizationAttemptResult>();
    const soleController = new AbortController();
    const nextActor = createReadModelSynchronizationActor({
      attempt: async () => soleGate.promise,
      clock: runtime,
      faultSink: createFaultHarness().sink,
      random: runtime,
      scheduler: runtime,
    });
    const sole = nextActor.refresh(soleController.signal);
    runtime.runNextAdmission();
    await flush();
    soleController.abort();
    await expectCanceled(sole);
    expect(nextActor.inspect().active_epoch).toBe(true);
    soleGate.resolve(success());
    await flush();
    await flush();
    expect(nextActor.inspect().active_epoch).toBe(false);
    await actor.stop();
    await nextActor.stop();
  });

  it("removes a caller listener on every settlement and ignores late abort", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, "addEventListener");
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const actor = createReadModelSynchronizationActor({
      attempt: async () => success(),
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });
    const result = actor.refresh(controller.signal);
    runtime.runNextAdmission();
    await flush();
    await expect(result).resolves.toMatchObject({ ok: true });
    expect(add).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    controller.abort();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(actor.inspect().admitted_waiters).toBe(0);
    await actor.stop();
  });

  it("closes intake and cancels an epoch before its scheduled invocation", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    let calls = 0;
    const actor = createReadModelSynchronizationActor({
      attempt: async () => {
        calls += 1;
        return success();
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });
    const admitted = actor.refresh();
    const stopped = actor.stop();
    expect(actor.intakeOpen).toBe(false);
    await stopped;
    await expectCanceled(admitted);
    await expect(actor.refresh()).resolves.toEqual({
      code: "MODULE_NOT_READY",
      ok: false,
    });
    expect(runtime.pendingAdmissions).toBe(0);
    expect(calls).toBe(0);
  });

  it("cancels backoff and drains without a new attempt", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    let calls = 0;
    const actor = createReadModelSynchronizationActor({
      attempt: async () => {
        calls += 1;
        throw new ReadModelSynchronizationTransientError("storage-lock");
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });
    const admitted = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    expect(runtime.pendingSleeps).toBe(1);
    await actor.stop();
    await expectCanceled(admitted);
    expect(calls).toBe(1);
    expect(runtime.pendingSleeps).toBe(0);
    expect(runtime.sleepAbortListeners).toBe(0);
  });

  it("drains an in-flight adapter and suppresses post-stop CAS publication", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    const coordinator = createReadModelPublicationCoordinator();
    const initial = buildCompleteReadModelGeneration([]);
    coordinator.initializeSynchronized(initial, null);
    const observationGate = deferred<CommittedChangeObservation>();
    const attempt = createReadModelSynchronizationAttempt({
      coordinator,
      observation: Object.freeze({
        observeCommittedChanges: () => observationGate.promise,
      }),
    });
    const actor = createReadModelSynchronizationActor({
      attempt,
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });

    const admitted = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    const stopping = actor.stop();
    let stopSettled = false;
    void stopping.then(() => {
      stopSettled = true;
    });
    await flush();
    expect(stopSettled).toBe(false);
    observationGate.resolve(
      Object.freeze({
        kind: "at-head",
        observation_stamp: initial.observationStamp,
        observed_head: null,
      }),
    );
    await stopping;
    await expectCanceled(admitted);
    expect(coordinator.capture()).toMatchObject({ revision: 0 });
    expect(runtime.pendingSleeps).toBe(0);
    expect(actor.inspect()).toMatchObject({
      active_epoch: false,
      admitted_waiters: 0,
      state: "stopped",
    });
  });

  it("counts a coordinator conflict as a completed failed attempt", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    const coordinator = createReadModelPublicationCoordinator();
    const generation = buildCompleteReadModelGeneration([]);
    coordinator.initializeSynchronized(generation, null);
    const observationGate = deferred<CommittedChangeObservation>();
    const actor = createReadModelSynchronizationActor({
      attempt: createReadModelSynchronizationAttempt({
        coordinator,
        observation: Object.freeze({
          observeCommittedChanges: () => observationGate.promise,
        }),
      }),
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      retry: { deadlineMs: 100, maxAttempts: 1 },
      scheduler: runtime,
    });
    const result = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    expect(
      coordinator.publishCandidate(
        coordinator.candidate(generation, journalSequence(1n)),
      ),
    ).toBe(true);
    observationGate.resolve(
      Object.freeze({
        kind: "at-head",
        observation_stamp: generation.observationStamp,
        observed_head: null,
      }),
    );
    await flush();
    await expect(result).resolves.toEqual({
      attempts: 1,
      code: "READ_MODEL_REFRESH_EXHAUSTED",
      last_failure: "coordinator-conflict",
      ok: false,
      reason: "attempts",
    });
    await actor.stop();
  });

  it("publishes delta and rebuild observations through the production attempt", async () => {
    for (const kind of ["delta", "rebuild"] as const) {
      const runtime = createDeterministicReadModelSynchronizationRuntime();
      const fault = createFaultHarness();
      const coordinator = createReadModelPublicationCoordinator();
      coordinator.initializeSynchronized(
        buildCompleteReadModelGeneration([]),
        null,
      );
      const nextResource = resource(kind === "delta" ? 1 : 2);
      const completeGeneration = buildCompleteReadModelGeneration([
        nextResource,
      ]);
      const observation: CommittedChangeObservation =
        kind === "delta"
          ? Object.freeze({
              entries: Object.freeze([
                Object.freeze({
                  sequence: journalSequence(1n),
                }) as unknown as import("../storage/resource-write-protocol.js").CommittedOperationEntry,
              ]),
              kind,
              observation_stamp: completeGeneration.observationStamp,
              observed_head: journalSequence(1n),
              resources: Object.freeze([nextResource]),
            })
          : Object.freeze({
              complete: Object.freeze({
                asset_readiness: Object.freeze([]),
                kind: "storage-complete" as const,
                observation_stamp: completeGeneration.observationStamp,
                resources: Object.freeze([nextResource]),
              }),
              kind,
              observed_head: journalSequence(1n),
              validated_range: "all-after-cursor-through-head" as const,
            });
      const actor = createReadModelSynchronizationActor({
        attempt: createReadModelSynchronizationAttempt({
          coordinator,
          observation: Object.freeze({
            observeCommittedChanges: async () => observation,
          }),
        }),
        clock: runtime,
        faultSink: fault.sink,
        random: runtime,
        scheduler: runtime,
      });
      const result = actor.refresh();
      runtime.runNextAdmission();
      await flush();
      await expect(result).resolves.toMatchObject({
        attempts: 1,
        changed: true,
        ok: true,
      });
      expect(coordinator.capture()).toMatchObject({
        cursor: "1",
        revision: 1,
      });
      expect(
        coordinator.capture().generation.resourcesById.get(nextResource.data.id)
          ?.data.title,
      ).toBe(nextResource.data.title);
      await actor.stop();
    }
  });

  it("terminates a static coordinator as capability failure without observation", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    const coordinator = createReadModelPublicationCoordinator();
    coordinator.initializeStatic(buildCompleteReadModelGeneration([]));
    let observations = 0;
    const actor = createReadModelSynchronizationActor({
      attempt: createReadModelSynchronizationAttempt({
        coordinator,
        observation: Object.freeze({
          async observeCommittedChanges() {
            observations += 1;
            throw new Error("must not observe static coordinator");
          },
        }),
      }),
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });
    const result = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    await expect(result).resolves.toEqual({
      code: "READ_MODEL_SYNCHRONIZATION_CAPABILITY_FAILED",
      ok: false,
    });
    expect(observations).toBe(0);
    expect(runtime.pendingSleeps).toBe(0);
    expect(fault.sink.failed).toBe(false);
    await actor.stop();
  });

  it("routes integrity faults exactly and suppresses trailing work", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    const gate = deferred<ReadModelSynchronizationAttemptResult>();
    let calls = 0;
    const actor = createReadModelSynchronizationActor({
      attempt: async () => {
        calls += 1;
        if (calls === 1) return gate.promise;
        return success();
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });
    const first = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    const trailing = actor.refresh();
    gate.reject(
      new ResourceRuntimeIntegrityError(
        "RESOURCE_INDEX_INTEGRITY",
        "private detail",
      ),
    );
    await flush();
    await expect(first).resolves.toEqual({
      code: "STORAGE_INTEGRITY_FAILED",
      ok: false,
    });
    await expect(trailing).resolves.toEqual({
      code: "STORAGE_INTEGRITY_FAILED",
      ok: false,
    });
    await fault.sink.drain();
    expect(fault.sink.fault).toEqual({
      code: "RESOURCE_INDEX_INTEGRITY",
      kind: "integrity",
    });
    expect(fault.closed.value).toBe(1);
    expect(fault.cleaned.value).toBe(1);
    expect(calls).toBe(1);
    expect(runtime.pendingAdmissions).toBe(0);
    await actor.stop();
  });

  it("routes an unexpected error as fatal and never retries it", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    let calls = 0;
    const actor = createReadModelSynchronizationActor({
      attempt: async () => {
        calls += 1;
        throw new Error("private driver detail");
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });
    const result = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    await expect(result).resolves.toEqual({
      code: "READ_MODEL_RUNTIME_FAILED",
      ok: false,
    });
    expect(fault.sink.fault).toEqual({
      code: "READ_MODEL_RUNTIME_FAILED",
      kind: "fatal-runtime",
    });
    expect(calls).toBe(1);
    expect(runtime.pendingSleeps).toBe(0);
    await actor.stop();
    expect(actor.inspect().state).toBe("failed");
  });

  it("retries production-normalized session lock and read failures", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    const coordinator = createReadModelPublicationCoordinator();
    coordinator.initializeSynchronized(
      buildCompleteReadModelGeneration([]),
      null,
    );
    let acquisitions = 0;
    const driver: FullResourceDriverAdapter = Object.freeze({
      mode: "full" as const,
      async open() {},
      async close() {},
      async acquireStorageSession(): Promise<ResourceStorageSession> {
        acquisitions += 1;
        if (acquisitions === 1) {
          throw new ResourceStorageSessionTransientError("lock");
        }
        return {
          async *readCommittedOperationsAfter() {
            yield* [];
            if (acquisitions === 2) {
              throw new ResourceStorageSessionTransientError("read");
            }
          },
          async *listResources() {
            yield* [];
          },
          async release() {},
        } as unknown as ResourceStorageSession;
      },
    });
    const actor = createReadModelSynchronizationActor({
      attempt: createReadModelSynchronizationAttempt({
        coordinator,
        observation: createFullCommittedChangeObservationPort(driver),
      }),
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      retry: {
        deadlineMs: 100,
        initialDelayMs: 2,
        maxAttempts: 3,
        maxDelayMs: 2,
      },
      scheduler: runtime,
    });
    const result = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    expect(actor.inspect().last_failure).toBe("storage-lock");
    runtime.advanceBy(1);
    await flushUntil(() => runtime.pendingSleeps === 1);
    expect(actor.inspect().last_failure).toBe("storage-read");
    runtime.advanceBy(1);
    await flush();
    await expect(result).resolves.toMatchObject({ attempts: 3, ok: true });
    expect(actor.inspect().last_failure).toBeNull();
    expect(acquisitions).toBe(3);
    expect(fault.sink.failed).toBe(false);
    await actor.stop();
  });

  it("fail-closes a generic production iterator exception without retry", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    const coordinator = createReadModelPublicationCoordinator();
    coordinator.initializeSynchronized(
      buildCompleteReadModelGeneration([]),
      null,
    );
    let acquisitions = 0;
    const driver: FullResourceDriverAdapter = Object.freeze({
      mode: "full" as const,
      async open() {},
      async close() {},
      async acquireStorageSession(): Promise<ResourceStorageSession> {
        acquisitions += 1;
        return {
          async *readCommittedOperationsAfter() {
            yield* [];
            throw new Error("unexpected iterator failure");
          },
          async *listResources() {
            yield* [];
          },
          async release() {},
        } as unknown as ResourceStorageSession;
      },
    });
    const actor = createReadModelSynchronizationActor({
      attempt: createReadModelSynchronizationAttempt({
        coordinator,
        observation: createFullCommittedChangeObservationPort(driver),
      }),
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });
    const result = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    await expect(result).resolves.toEqual({
      code: "READ_MODEL_RUNTIME_FAILED",
      ok: false,
    });
    expect(acquisitions).toBe(1);
    expect(fault.sink.fault).toEqual({
      code: "READ_MODEL_RUNTIME_FAILED",
      kind: "fatal-runtime",
    });
    expect(runtime.pendingSleeps).toBe(0);
    await actor.stop();
  });

  it("lets a sink fault own cancellation of an admitted scheduled epoch", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const actorRef: {
      current?: ReturnType<typeof createReadModelSynchronizationActor>;
    } = {};
    const sink = createRuntimeFaultSink({
      closeIntake: () => undefined,
      cleanup: () => actorRef.current!.stop(),
    });
    const actor = createReadModelSynchronizationActor({
      attempt: async () => success(),
      clock: runtime,
      faultSink: sink,
      random: runtime,
      scheduler: runtime,
    });
    actorRef.current = actor;
    const waiter = actor.refresh();
    sink.report({
      code: "RESOURCE_INDEX_INTEGRITY",
      kind: "integrity",
    });
    await expect(waiter).resolves.toEqual({
      code: "STORAGE_INTEGRITY_FAILED",
      ok: false,
    });
    await sink.drain();
    expect(actor.inspect()).toMatchObject({
      admitted_waiters: 0,
      state: "failed",
    });
    expect(runtime.pendingAdmissions).toBe(0);
  });

  it("treats an AbortError-like exception as fatal unless lifecycle aborted", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    const actor = createReadModelSynchronizationActor({
      attempt: async () => {
        throw new DOMException("not actor-owned", "AbortError");
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });
    const result = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    await expect(result).resolves.toMatchObject({
      code: "READ_MODEL_RUNTIME_FAILED",
    });
    await actor.stop();
  });

  it("closes the cohort synchronously before invoking the first attempt", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    let calls = 0;
    let trailing!: Promise<ReadModelSynchronizationResult>;
    const actorRef: {
      current?: ReturnType<typeof createReadModelSynchronizationActor>;
    } = {};
    const actor = createReadModelSynchronizationActor({
      attempt: async () => {
        calls += 1;
        if (calls === 1) trailing = actorRef.current!.refresh();
        return success();
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });
    actorRef.current = actor;
    const first = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    await expect(first).resolves.toMatchObject({ ok: true });
    expect(runtime.pendingAdmissions).toBe(1);
    expect(calls).toBe(1);
    runtime.runNextAdmission();
    await flush();
    await expect(trailing).resolves.toMatchObject({ ok: true });
    expect(calls).toBe(2);
    await actor.stop();
  });

  it("keeps a canceled trailing epoch as lifecycle-owned work", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    const firstGate = deferred<ReadModelSynchronizationAttemptResult>();
    const caller = new AbortController();
    let calls = 0;
    const actor = createReadModelSynchronizationActor({
      attempt: async () => {
        calls += 1;
        return calls === 1 ? firstGate.promise : success(true);
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });
    const first = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    const late = actor.refresh(caller.signal);
    caller.abort();
    await expectCanceled(late);
    expect(actor.inspect().trailing_epoch).toBe(true);
    firstGate.resolve(success());
    await flush();
    await expect(first).resolves.toMatchObject({ ok: true });
    expect(runtime.pendingAdmissions).toBe(1);
    runtime.runNextAdmission();
    await flush();
    expect(calls).toBe(2);
    expect(actor.inspect().active_epoch).toBe(false);
    await actor.stop();
  });

  it("does not admit another attempt when backoff wakes at the cutoff", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    let calls = 0;
    const actor = createReadModelSynchronizationActor({
      attempt: async () => {
        calls += 1;
        throw new ReadModelSynchronizationTransientError("storage-unavailable");
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      retry: {
        deadlineMs: 100,
        initialDelayMs: 100,
        maxAttempts: 3,
        maxDelayMs: 100,
      },
      scheduler: runtime,
    });
    const result = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    expect(runtime.sleepDelays).toEqual([50]);
    runtime.advanceBy(100);
    await flush();
    await expect(result).resolves.toMatchObject({
      attempts: 1,
      last_failure: "storage-unavailable",
      reason: "deadline",
    });
    expect(calls).toBe(1);
    await actor.stop();
  });

  it("classifies an overshooting transient failure as deadline exhaustion", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    let calls = 0;
    const actor = createReadModelSynchronizationActor({
      attempt: async () => {
        calls += 1;
        runtime.advanceBy(101);
        throw new ReadModelSynchronizationTransientError("storage-read");
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      retry: { deadlineMs: 100, maxAttempts: 3 },
      scheduler: runtime,
    });
    const result = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    await expect(result).resolves.toMatchObject({
      attempts: 1,
      last_failure: "storage-read",
      reason: "deadline",
    });
    expect(calls).toBe(1);
    expect(runtime.pendingSleeps).toBe(0);
    await actor.stop();
  });

  it("suppresses active and trailing waiters only after active cleanup on stop", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    const fault = createFaultHarness();
    const gate = deferred<ReadModelSynchronizationAttemptResult>();
    const firstController = new AbortController();
    const trailingController = new AbortController();
    const firstRemove = vi.spyOn(firstController.signal, "removeEventListener");
    const trailingRemove = vi.spyOn(
      trailingController.signal,
      "removeEventListener",
    );
    const actor = createReadModelSynchronizationActor({
      attempt: async () => gate.promise,
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });
    const first = actor.refresh(firstController.signal);
    runtime.runNextAdmission();
    await flush();
    const late = actor.refresh(trailingController.signal);
    const stopping = actor.stop();
    let lateSettled = false;
    void late.then(() => {
      lateSettled = true;
    });
    await flush();
    expect(lateSettled).toBe(false);
    gate.resolve(success());
    await stopping;
    await expectCanceled(first);
    await expectCanceled(late);
    expect(firstRemove).toHaveBeenCalledTimes(1);
    expect(trailingRemove).toHaveBeenCalledTimes(1);
    expect(actor.inspect()).toMatchObject({
      active_epoch: false,
      admitted_waiters: 0,
      state: "stopped",
      trailing_epoch: false,
    });
    expect(runtime.pendingAdmissions).toBe(0);
    expect(runtime.pendingSleeps).toBe(0);
  });

  it("fail-closes on an invalid injected random source without stranding waiters", async () => {
    const runtime = createDeterministicReadModelSynchronizationRuntime();
    runtime.enqueueRandom(1);
    const fault = createFaultHarness();
    const actor = createReadModelSynchronizationActor({
      attempt: async () => {
        throw new ReadModelSynchronizationTransientError("storage-lock");
      },
      clock: runtime,
      faultSink: fault.sink,
      random: runtime,
      scheduler: runtime,
    });
    const result = actor.refresh();
    runtime.runNextAdmission();
    await flush();
    await expect(result).resolves.toEqual({
      code: "READ_MODEL_RUNTIME_FAILED",
      ok: false,
    });
    expect(fault.sink.fault).toEqual({
      code: "READ_MODEL_RUNTIME_FAILED",
      kind: "fatal-runtime",
    });
    expect(actor.inspect().admitted_waiters).toBe(0);
    await actor.stop();
  });

  it("validates bounded retry defaults and cross-field limits", () => {
    expect(resolveReadModelSynchronizationRetryConfig()).toEqual({
      deadlineMs: 5_000,
      initialDelayMs: 25,
      maxAttempts: 3,
      maxDelayMs: 1_000,
    });
    expect(
      resolveReadModelSynchronizationRetryConfig({ deadlineMs: 100 }),
    ).toMatchObject({ deadlineMs: 100, maxDelayMs: 100 });
    expect(() =>
      resolveReadModelSynchronizationRetryConfig({
        deadlineMs: 100,
        initialDelayMs: 75,
        maxDelayMs: 50,
      }),
    ).toThrow(TypeError);
    expect(() =>
      resolveReadModelSynchronizationRetryConfig({ maxAttempts: 0 }),
    ).toThrow(TypeError);
  });
});
