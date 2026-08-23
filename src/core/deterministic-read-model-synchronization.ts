import type {
  ReadModelSynchronizationClock,
  ReadModelSynchronizationRandom,
  ReadModelSynchronizationScheduledTask,
  ReadModelSynchronizationScheduler,
} from "./read-model-synchronization.js";

interface PendingAdmission {
  canceled: boolean;
  readonly task: () => void;
}

interface PendingSleep {
  settled: boolean;
  readonly dueAt: number;
  readonly signal: AbortSignal;
  readonly onAbort: () => void;
  readonly resolve: () => void;
  readonly reject: (reason: unknown) => void;
}

export interface DeterministicReadModelSynchronizationRuntime
  extends
    ReadModelSynchronizationClock,
    ReadModelSynchronizationRandom,
    ReadModelSynchronizationScheduler {
  readonly pendingAdmissions: number;
  readonly pendingSleeps: number;
  readonly sleepAbortListeners: number;
  readonly sleepDelays: readonly number[];
  runNextAdmission(): boolean;
  advanceBy(milliseconds: number): void;
  enqueueRandom(...values: readonly number[]): void;
}

export function createDeterministicReadModelSynchronizationRuntime(
  initialNow = 0,
): DeterministicReadModelSynchronizationRuntime {
  let now = initialNow;
  const admissions: PendingAdmission[] = [];
  const sleeps = new Set<PendingSleep>();
  const randomValues: number[] = [];
  const sleepDelays: number[] = [];
  let sleepAbortListeners = 0;

  function settleSleep(sleep: PendingSleep, aborted: boolean): void {
    if (sleep.settled) return;
    sleep.settled = true;
    sleeps.delete(sleep);
    sleep.signal.removeEventListener("abort", sleep.onAbort);
    sleepAbortListeners -= 1;
    if (aborted) sleep.reject(sleep.signal.reason);
    else sleep.resolve();
  }

  return Object.freeze({
    now(): number {
      return now;
    },
    next(): number {
      return randomValues.shift() ?? 0;
    },
    schedule(task: () => void): ReadModelSynchronizationScheduledTask {
      const pending: PendingAdmission = { canceled: false, task };
      admissions.push(pending);
      return Object.freeze({
        cancel(): void {
          if (pending.canceled) return;
          pending.canceled = true;
          const index = admissions.indexOf(pending);
          if (index >= 0) admissions.splice(index, 1);
        },
      });
    },
    sleep(delayMs: number, signal: AbortSignal): Promise<void> {
      sleepDelays.push(delayMs);
      return new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        const pending: PendingSleep = {
          dueAt: now + delayMs,
          onAbort: () => settleSleep(pending, true),
          reject,
          resolve,
          settled: false,
          signal,
        };
        sleeps.add(pending);
        sleepAbortListeners += 1;
        signal.addEventListener("abort", pending.onAbort, { once: true });
      });
    },
    get pendingAdmissions(): number {
      return admissions.filter((item) => !item.canceled).length;
    },
    get pendingSleeps(): number {
      return sleeps.size;
    },
    get sleepAbortListeners(): number {
      return sleepAbortListeners;
    },
    get sleepDelays(): readonly number[] {
      return Object.freeze([...sleepDelays]);
    },
    runNextAdmission(): boolean {
      while (admissions.length > 0) {
        const next = admissions.shift()!;
        if (next.canceled) continue;
        next.task();
        return true;
      }
      return false;
    },
    advanceBy(milliseconds: number): void {
      if (!Number.isFinite(milliseconds) || milliseconds < 0) {
        throw new TypeError("Deterministic time advance must be non-negative");
      }
      now += milliseconds;
      for (const sleep of [...sleeps]) {
        if (sleep.dueAt <= now) settleSleep(sleep, false);
      }
    },
    enqueueRandom(...values: readonly number[]): void {
      randomValues.push(...values);
    },
  });
}
