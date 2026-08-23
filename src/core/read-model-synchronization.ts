import { isDeepStrictEqual } from "node:util";
import type { Token } from "@sagifire/ioc";

import { createExtensiaInternalNamespace } from "../composition/tokens.js";
import type { IDString } from "../domain/scalars.js";
import { parseJournalSequence } from "../storage/resource-journal-integrity.js";
import { ResourceRuntimeIntegrityError } from "../storage/resource-runtime-integrity.js";
import type { JournalSequence } from "../storage/resource-write-protocol.js";
import {
  applyCompleteReadModelDelta,
  buildCompleteReadModelGeneration,
  type ReadModelGeneration,
} from "./read-model-generation.js";
import type {
  CoreCommittedChangeObservationPort,
  CoreMetadataCompleteObservation,
} from "./read-model-observation.js";
import { CoreObservationTransientError } from "./read-model-observation.js";
import type {
  ReadModelCoordinatorState,
  ReadModelPublicationCoordinator,
} from "./read-model-coordinator.js";
import type { RuntimeFault, RuntimeFaultSink } from "./runtime-fault-sink.js";

export type ReadModelSynchronizationTransientCategory =
  "storage-lock" | "storage-unavailable" | "storage-read";

export type ReadModelSynchronizationRetryableCategory =
  ReadModelSynchronizationTransientCategory | "coordinator-conflict";

export interface ReadModelSynchronizationRetryConfig {
  readonly maxAttempts?: number;
  readonly deadlineMs?: number;
  readonly initialDelayMs?: number;
  readonly maxDelayMs?: number;
}

export interface ResolvedReadModelSynchronizationRetryConfig {
  readonly maxAttempts: number;
  readonly deadlineMs: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
}

export interface ReadModelSynchronizationAttemptContext {
  readonly phase: "read-observation";
  readonly attempt: number;
  readonly attempt_admission_deadline_monotonic_ms: number;
  readonly remaining_budget_ms: number;
  readonly signal: AbortSignal;
}

export type ReadModelSynchronizationAttemptResult =
  | {
      readonly ok: true;
      readonly changed: boolean;
    }
  | {
      readonly ok: false;
      readonly category:
        ReadModelSynchronizationRetryableCategory | "capability";
    };

export type ReadModelSynchronizationResult =
  | {
      readonly ok: true;
      readonly observed: true;
      readonly changed: boolean;
      readonly attempts: number;
    }
  | {
      readonly ok: false;
      readonly code: "MODULE_NOT_READY";
    }
  | {
      readonly ok: false;
      readonly code: "READ_MODEL_REFRESH_CANCELED";
    }
  | {
      readonly ok: false;
      readonly code: "READ_MODEL_REFRESH_EXHAUSTED";
      readonly reason: "attempts" | "deadline";
      readonly last_failure: ReadModelSynchronizationRetryableCategory | null;
      readonly attempts: number;
    }
  | {
      readonly ok: false;
      readonly code: "READ_MODEL_SYNCHRONIZATION_CAPABILITY_FAILED";
    }
  | {
      readonly ok: false;
      readonly code: "STORAGE_INTEGRITY_FAILED";
    }
  | {
      readonly ok: false;
      readonly code: "READ_MODEL_RUNTIME_FAILED";
    };

export type ReadModelSynchronizationActorState =
  | "idle"
  | "scheduled"
  | "refreshing"
  | "backoff"
  | "degraded"
  | "stopping"
  | "stopped"
  | "failed";

export interface ReadModelSynchronizationInspection {
  readonly state: ReadModelSynchronizationActorState;
  readonly intake_open: boolean;
  readonly attempt_in_flight: boolean;
  readonly active_epoch: boolean;
  readonly trailing_epoch: boolean;
  readonly admitted_waiters: number;
  readonly attempts_in_active_epoch: number;
  readonly last_failure: ReadModelSynchronizationRetryableCategory | null;
}

export interface ReadModelSynchronizationClock {
  now(): number;
}

export interface ReadModelSynchronizationRandom {
  next(): number;
}

export interface ReadModelSynchronizationScheduledTask {
  cancel(): void;
}

export interface ReadModelSynchronizationScheduler {
  schedule(task: () => void): ReadModelSynchronizationScheduledTask;
  sleep(delayMs: number, signal: AbortSignal): Promise<void>;
}

export interface ReadModelSynchronizationActor {
  readonly intakeOpen: boolean;
  openIntake(): void;
  refresh(signal?: AbortSignal): Promise<ReadModelSynchronizationResult>;
  requestBackground(): boolean;
  stop(): Promise<void>;
  inspect(): ReadModelSynchronizationInspection;
}

const readModelSynchronizationTokens = createExtensiaInternalNamespace(
  "core.read-model-synchronization",
);

export const READ_MODEL_SYNCHRONIZATION_ACTOR: Token<ReadModelSynchronizationActor> =
  readModelSynchronizationTokens.token("actor");

export class ReadModelSynchronizationTransientError extends CoreObservationTransientError {
  constructor(category: ReadModelSynchronizationTransientCategory) {
    super(category);
    this.name = "ReadModelSynchronizationTransientError";
  }
}

interface Waiter {
  settled: boolean;
  readonly signal: AbortSignal | undefined;
  readonly onAbort: (() => void) | undefined;
  readonly resolve: (result: ReadModelSynchronizationResult) => void;
}

interface Epoch {
  cohortClosed: boolean;
  started: boolean;
  attempts: number;
  readonly waiters: Set<Waiter>;
  scheduled: ReadModelSynchronizationScheduledTask | null;
  readonly done: Promise<void>;
  readonly resolveDone: () => void;
}

const CANCELED: ReadModelSynchronizationResult = Object.freeze({
  code: "READ_MODEL_REFRESH_CANCELED",
  ok: false,
});
const NOT_READY: ReadModelSynchronizationResult = Object.freeze({
  code: "MODULE_NOT_READY",
  ok: false,
});

function integerInRange(
  value: number,
  minimum: number,
  maximum: number,
): boolean {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

export function resolveReadModelSynchronizationRetryConfig(
  input: ReadModelSynchronizationRetryConfig = {},
): ResolvedReadModelSynchronizationRetryConfig {
  const maxAttempts = input.maxAttempts === undefined ? 3 : input.maxAttempts;
  const deadlineMs = input.deadlineMs === undefined ? 5_000 : input.deadlineMs;
  const initialDelayMs =
    input.initialDelayMs === undefined ? 25 : input.initialDelayMs;
  const maxDelayMs =
    input.maxDelayMs === undefined
      ? Math.min(1_000, deadlineMs)
      : input.maxDelayMs;
  if (
    !integerInRange(maxAttempts, 1, 10) ||
    !integerInRange(deadlineMs, 100, 60_000) ||
    !integerInRange(initialDelayMs, 1, 1_000) ||
    !integerInRange(maxDelayMs, 1, deadlineMs) ||
    initialDelayMs > maxDelayMs
  ) {
    throw new TypeError("Read-model synchronization retry config is invalid");
  }
  return Object.freeze({
    deadlineMs,
    initialDelayMs,
    maxAttempts,
    maxDelayMs,
  });
}

function createSystemScheduler(): ReadModelSynchronizationScheduler {
  return Object.freeze({
    schedule(task: () => void): ReadModelSynchronizationScheduledTask {
      let canceled = false;
      queueMicrotask(() => {
        if (!canceled) task();
      });
      return Object.freeze({
        cancel(): void {
          canceled = true;
        },
      });
    },
    sleep(delayMs: number, signal: AbortSignal): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          signal.removeEventListener("abort", onAbort);
          resolve();
        }, delayMs);
        const onAbort = (): void => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          signal.removeEventListener("abort", onAbort);
          reject(signal.reason);
        };
        signal.addEventListener("abort", onAbort, { once: true });
      });
    },
  });
}

function createEpoch(): Epoch {
  let resolveDone!: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  return {
    attempts: 0,
    cohortClosed: false,
    done,
    resolveDone,
    scheduled: null,
    started: false,
    waiters: new Set(),
  };
}

function faultResult(fault: RuntimeFault): ReadModelSynchronizationResult {
  return Object.freeze(
    fault.kind === "integrity"
      ? { code: "STORAGE_INTEGRITY_FAILED" as const, ok: false as const }
      : { code: "READ_MODEL_RUNTIME_FAILED" as const, ok: false as const },
  );
}

function equalJitter(
  cap: number,
  random: ReadModelSynchronizationRandom,
): number {
  const lower = Math.ceil(cap / 2);
  const width = Math.floor(cap / 2);
  const unit = random.next();
  if (!Number.isFinite(unit) || unit < 0 || unit >= 1) {
    throw new TypeError("Synchronization random source must return [0, 1)");
  }
  return lower + Math.floor(unit * (width + 1));
}

function settledSuccess(
  changed: boolean,
  attempts: number,
): ReadModelSynchronizationResult {
  return Object.freeze({ attempts, changed, observed: true, ok: true });
}

function exhausted(
  reason: "attempts" | "deadline",
  attempts: number,
  lastFailure: ReadModelSynchronizationRetryableCategory | null,
): ReadModelSynchronizationResult {
  return Object.freeze({
    attempts,
    code: "READ_MODEL_REFRESH_EXHAUSTED",
    last_failure: lastFailure,
    ok: false,
    reason,
  });
}

export function createReadModelSynchronizationActor(input: {
  readonly attempt: (
    context: ReadModelSynchronizationAttemptContext,
  ) => Promise<ReadModelSynchronizationAttemptResult>;
  readonly faultSink: RuntimeFaultSink;
  readonly retry?: ReadModelSynchronizationRetryConfig;
  readonly clock?: ReadModelSynchronizationClock;
  readonly random?: ReadModelSynchronizationRandom;
  readonly scheduler?: ReadModelSynchronizationScheduler;
  readonly initiallyOpen?: boolean;
}): ReadModelSynchronizationActor {
  const retry = resolveReadModelSynchronizationRetryConfig(input.retry);
  const clock = input.clock ?? Object.freeze({ now: () => performance.now() });
  const random = input.random ?? Object.freeze({ next: () => Math.random() });
  const scheduler = input.scheduler ?? createSystemScheduler();
  const lifecycle = new AbortController();
  let intakeOpen = input.initiallyOpen ?? true;
  let state: ReadModelSynchronizationActorState = "idle";
  let active: Epoch | null = null;
  let trailing: Epoch | null = null;
  let lastFailure: ReadModelSynchronizationRetryableCategory | null = null;
  let attemptInFlight = false;
  let stopPromise: Promise<void> | null = null;
  let terminalFault: ReadModelSynchronizationResult | null = null;
  let unsubscribeFault: (() => void) | null = null;

  function waiterCount(): number {
    return (active?.waiters.size ?? 0) + (trailing?.waiters.size ?? 0);
  }

  function settleWaiter(
    epoch: Epoch,
    waiter: Waiter,
    result: ReadModelSynchronizationResult,
  ): void {
    if (waiter.settled) return;
    waiter.settled = true;
    if (waiter.signal !== undefined && waiter.onAbort !== undefined) {
      waiter.signal.removeEventListener("abort", waiter.onAbort);
    }
    epoch.waiters.delete(waiter);
    waiter.resolve(result);
  }

  function settleEpoch(
    epoch: Epoch,
    result: ReadModelSynchronizationResult,
  ): void {
    for (const waiter of [...epoch.waiters]) {
      settleWaiter(epoch, waiter, result);
    }
  }

  function terminalResult(): ReadModelSynchronizationResult {
    return terminalFault ?? CANCELED;
  }

  function cancelUnstartedEpoch(epoch: Epoch): void {
    epoch.scheduled?.cancel();
    epoch.scheduled = null;
    settleEpoch(epoch, terminalResult());
    epoch.resolveDone();
  }

  function failClose(result: ReadModelSynchronizationResult): void {
    terminalFault = result;
    intakeOpen = false;
    state = "failed";
    lifecycle.abort();
    if (trailing !== null) {
      settleEpoch(trailing, result);
      trailing.resolveDone();
      trailing = null;
    }
    if (active !== null && !active.started) {
      const canceled = active;
      active = null;
      cancelUnstartedEpoch(canceled);
    }
  }

  unsubscribeFault = input.faultSink.subscribe((fault) => {
    failClose(faultResult(fault));
  });

  function reportFault(fault: RuntimeFault): ReadModelSynchronizationResult {
    input.faultSink.report(fault);
    const result = faultResult(fault);
    if (terminalFault === null) failClose(result);
    return result;
  }

  function exhaustionAfter(
    epoch: Epoch,
    deadline: number,
  ): ReadModelSynchronizationResult | null {
    if (clock.now() >= deadline) {
      return exhausted("deadline", epoch.attempts, lastFailure);
    }
    if (epoch.attempts >= retry.maxAttempts) {
      return exhausted("attempts", epoch.attempts, lastFailure);
    }
    return null;
  }

  async function executeEpoch(
    epoch: Epoch,
  ): Promise<ReadModelSynchronizationResult> {
    const deadline = clock.now() + retry.deadlineMs;
    epoch.attempts = 0;
    lastFailure = null;
    while (true) {
      if (lifecycle.signal.aborted) return terminalResult();
      if (clock.now() >= deadline) {
        return exhausted("deadline", epoch.attempts, lastFailure);
      }

      epoch.attempts += 1;
      epoch.cohortClosed = true;
      state = "refreshing";
      attemptInFlight = true;
      let outcome: ReadModelSynchronizationAttemptResult;
      try {
        outcome = await input.attempt(
          Object.freeze({
            attempt: epoch.attempts,
            attempt_admission_deadline_monotonic_ms: deadline,
            phase: "read-observation" as const,
            remaining_budget_ms: Math.max(0, Math.ceil(deadline - clock.now())),
            signal: lifecycle.signal,
          }),
        );
      } catch (error) {
        attemptInFlight = false;
        if (lifecycle.signal.aborted) return terminalResult();
        if (error instanceof CoreObservationTransientError) {
          outcome = Object.freeze({ category: error.category, ok: false });
        } else if (error instanceof ResourceRuntimeIntegrityError) {
          return reportFault(
            Object.freeze({ code: error.code, kind: "integrity" }),
          );
        } else {
          return reportFault(
            Object.freeze({
              code: "READ_MODEL_RUNTIME_FAILED",
              kind: "fatal-runtime",
            }),
          );
        }
      } finally {
        attemptInFlight = false;
      }

      if (lifecycle.signal.aborted) return terminalResult();
      if (outcome.ok) {
        lastFailure = null;
        return settledSuccess(outcome.changed, epoch.attempts);
      }
      if (outcome.category === "capability") {
        return Object.freeze({
          code: "READ_MODEL_SYNCHRONIZATION_CAPABILITY_FAILED",
          ok: false,
        });
      }
      lastFailure = outcome.category;
      const terminal = exhaustionAfter(epoch, deadline);
      if (terminal !== null) return terminal;

      const remaining = Math.max(0, deadline - clock.now());
      const exponential = retry.initialDelayMs * 2 ** (epoch.attempts - 1);
      const cap = Math.min(retry.maxDelayMs, exponential, remaining);
      let delay: number;
      try {
        delay = equalJitter(cap, random);
      } catch {
        return reportFault(
          Object.freeze({
            code: "READ_MODEL_RUNTIME_FAILED",
            kind: "fatal-runtime",
          }),
        );
      }
      state = "backoff";
      try {
        await scheduler.sleep(delay, lifecycle.signal);
      } catch {
        if (lifecycle.signal.aborted) return terminalResult();
        return reportFault(
          Object.freeze({
            code: "READ_MODEL_RUNTIME_FAILED",
            kind: "fatal-runtime",
          }),
        );
      }
      if (lifecycle.signal.aborted) return terminalResult();
      const afterBackoff = exhaustionAfter(epoch, deadline);
      if (afterBackoff !== null) return afterBackoff;
    }
  }

  function scheduleEpoch(epoch: Epoch): void {
    state = "scheduled";
    epoch.scheduled = scheduler.schedule(() => {
      epoch.scheduled = null;
      epoch.started = true;
      void executeEpoch(epoch)
        .catch(() =>
          reportFault(
            Object.freeze({
              code: "READ_MODEL_RUNTIME_FAILED",
              kind: "fatal-runtime",
            }),
          ),
        )
        .then((result) => {
          settleEpoch(epoch, result);
          if (
            !result.ok &&
            result.code === "READ_MODEL_REFRESH_EXHAUSTED" &&
            intakeOpen
          ) {
            state = "degraded";
          }
        })
        .finally(() => {
          epoch.resolveDone();
          if (active === epoch) active = null;
          if (!intakeOpen || lifecycle.signal.aborted) {
            if (trailing !== null) {
              settleEpoch(trailing, terminalResult());
              trailing.resolveDone();
              trailing = null;
            }
            if (state !== "failed" && state !== "stopping") state = "stopped";
            return;
          }
          if (trailing !== null) {
            const next = trailing;
            trailing = null;
            active = next;
            scheduleEpoch(next);
          } else if (state !== "degraded") {
            state = "idle";
          }
        });
    });
  }

  function admitEpoch(): Epoch | null {
    if (!intakeOpen) return null;
    if (active === null) {
      active = createEpoch();
      scheduleEpoch(active);
      return active;
    }
    if (!active.cohortClosed) return active;
    if (trailing === null) trailing = createEpoch();
    return trailing;
  }

  function admitWaiter(
    epoch: Epoch,
    signal: AbortSignal | undefined,
  ): Promise<ReadModelSynchronizationResult> {
    return new Promise<ReadModelSynchronizationResult>((resolve) => {
      const waiter: Waiter = {
        onAbort:
          signal === undefined
            ? undefined
            : (): void => settleWaiter(epoch, waiter, CANCELED),
        resolve,
        settled: false,
        signal,
      };
      epoch.waiters.add(waiter);
      if (signal !== undefined && waiter.onAbort !== undefined) {
        signal.addEventListener("abort", waiter.onAbort, { once: true });
        if (signal.aborted) waiter.onAbort();
      }
    });
  }

  return Object.freeze({
    get intakeOpen(): boolean {
      return intakeOpen;
    },
    openIntake(): void {
      if (lifecycle.signal.aborted || terminalFault !== null) {
        throw new Error("Read-model synchronization actor cannot reopen");
      }
      intakeOpen = true;
      if (state === "stopped") state = "idle";
    },
    refresh(signal?: AbortSignal): Promise<ReadModelSynchronizationResult> {
      if (!intakeOpen) return Promise.resolve(NOT_READY);
      if (signal?.aborted === true) return Promise.resolve(CANCELED);
      const epoch = admitEpoch();
      return epoch === null
        ? Promise.resolve(NOT_READY)
        : admitWaiter(epoch, signal);
    },
    requestBackground(): boolean {
      return admitEpoch() !== null;
    },
    async stop(): Promise<void> {
      if (stopPromise !== null) return stopPromise;
      stopPromise = (async () => {
        intakeOpen = false;
        if (state !== "failed") state = "stopping";
        lifecycle.abort();
        const suppressedTrailing = trailing;
        trailing = null;
        const draining = active;
        if (draining !== null && !draining.started) {
          active = null;
          cancelUnstartedEpoch(draining);
        } else if (draining !== null) {
          await draining.done;
        }
        if (suppressedTrailing !== null) {
          settleEpoch(suppressedTrailing, terminalResult());
          suppressedTrailing.resolveDone();
        }
        unsubscribeFault?.();
        unsubscribeFault = null;
        state = terminalFault === null ? "stopped" : "failed";
      })();
      return stopPromise;
    },
    inspect(): ReadModelSynchronizationInspection {
      return Object.freeze({
        active_epoch: active !== null,
        admitted_waiters: waiterCount(),
        attempt_in_flight: attemptInFlight,
        attempts_in_active_epoch: active?.attempts ?? 0,
        intake_open: intakeOpen,
        last_failure: lastFailure,
        state,
        trailing_epoch: trailing !== null,
      });
    },
  });
}

function readinessMap(
  complete: CoreMetadataCompleteObservation,
): ReadonlyMap<IDString, boolean> {
  return new Map<IDString, boolean>(
    complete.asset_readiness.map((item) => [
      item.asset_id,
      item.has_committed_representation,
    ]),
  );
}

function generationChanged(
  current: ReadModelGeneration,
  next: ReadModelGeneration,
): boolean {
  if (current.resourcesById.size !== next.resourcesById.size) return true;
  for (const [id, resource] of current.resourcesById) {
    if (!isDeepStrictEqual(resource, next.resourcesById.get(id))) return true;
  }
  return false;
}

function assertAtHead(
  cursor: JournalSequence | null,
  observedHead: JournalSequence | null,
): void {
  if (cursor !== observedHead) {
    throw new ResourceRuntimeIntegrityError(
      "RESOURCE_STORAGE_INTEGRITY",
      "At-head observation disagrees with captured cursor",
    );
  }
}

function assertDeltaRange(
  cursor: JournalSequence | null,
  observedHead: JournalSequence,
  entries: readonly { readonly sequence: JournalSequence }[],
): void {
  if (entries.length === 0) {
    throw new ResourceRuntimeIntegrityError(
      "RESOURCE_STORAGE_INTEGRITY",
      "Delta observation contains no committed entries",
    );
  }
  let expected = cursor === null ? 1n : parseJournalSequence(cursor) + 1n;
  for (const entry of entries) {
    if (parseJournalSequence(entry.sequence) !== expected) {
      throw new ResourceRuntimeIntegrityError(
        "RESOURCE_STORAGE_INTEGRITY",
        "Delta observation is not contiguous after captured cursor",
      );
    }
    expected += 1n;
  }
  if (entries.at(-1)?.sequence !== observedHead) {
    throw new ResourceRuntimeIntegrityError(
      "RESOURCE_STORAGE_INTEGRITY",
      "Delta observation head disagrees with its committed range",
    );
  }
}

export function createReadModelSynchronizationAttempt(input: {
  readonly coordinator: ReadModelPublicationCoordinator;
  readonly observation: CoreCommittedChangeObservationPort;
}): (
  context: ReadModelSynchronizationAttemptContext,
) => Promise<ReadModelSynchronizationAttemptResult> {
  return async (
    context: ReadModelSynchronizationAttemptContext,
  ): Promise<ReadModelSynchronizationAttemptResult> => {
    const base: ReadModelCoordinatorState = input.coordinator.capture();
    if (base.kind !== "synchronized") {
      return Object.freeze({ category: "capability", ok: false });
    }
    const observation = await input.observation.observeCommittedChanges({
      after: base.cursor,
      attempt_admission_deadline_monotonic_ms:
        context.attempt_admission_deadline_monotonic_ms,
      incremental_entry_limit: 256,
      incremental_resource_limit: 256,
      signal: context.signal,
    });
    if (context.signal.aborted) throw context.signal.reason;
    let nextGeneration: ReadModelGeneration;
    let nextCursor: JournalSequence | null;
    if (observation.kind === "at-head") {
      assertAtHead(base.cursor, observation.observed_head);
      nextGeneration = base.generation;
      nextCursor = observation.observed_head;
    } else if (observation.kind === "delta") {
      assertDeltaRange(
        base.cursor,
        observation.observed_head,
        observation.entries,
      );
      nextGeneration = applyCompleteReadModelDelta(
        base.generation,
        observation.resources,
      );
      nextCursor = observation.observed_head;
    } else {
      nextGeneration = buildCompleteReadModelGeneration(
        observation.complete.resources,
        { assetReadiness: readinessMap(observation.complete) },
      );
      nextCursor = observation.observed_head;
    }
    const changed = generationChanged(base.generation, nextGeneration);
    if (context.signal.aborted) throw context.signal.reason;
    const published = input.coordinator.publishCandidate(
      Object.freeze({
        base_cursor: base.cursor,
        base_revision: base.revision,
        cursor: nextCursor,
        generation: nextGeneration,
      }),
    );
    return published
      ? Object.freeze({ changed, ok: true })
      : Object.freeze({ category: "coordinator-conflict", ok: false });
  };
}
