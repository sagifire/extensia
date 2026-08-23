import type {
  ReadModelSynchronizationActor,
  ReadModelSynchronizationResult,
} from "./read-model-synchronization.js";
import type { ResolvedReadModelPollingConfig } from "./read-model-runtime.js";

export interface ReadModelPollingTimer {
  cancel(): void;
}

export interface ReadModelPollingScheduler {
  schedule(delayMs: number, task: () => void): ReadModelPollingTimer;
}

export interface ReadModelPollingController {
  start(): void;
  close(): void;
  drain(): Promise<void>;
}

function systemScheduler(): ReadModelPollingScheduler {
  return Object.freeze({
    schedule(delayMs: number, task: () => void): ReadModelPollingTimer {
      const timer = setTimeout(task, delayMs);
      return Object.freeze({ cancel: () => clearTimeout(timer) });
    },
  });
}

function randomIntegerInclusive(maximum: number, random: () => number): number {
  const unit = random();
  if (!Number.isFinite(unit) || unit < 0 || unit >= 1) {
    throw new TypeError("Polling random source must return [0, 1)");
  }
  return Math.floor(unit * (maximum + 1));
}

function nextDelay(
  config: ResolvedReadModelPollingConfig,
  result: ReadModelSynchronizationResult,
  random: () => number,
): number | null {
  if (result.ok) {
    return (
      config.intervalMs +
      randomIntegerInclusive(Math.floor(config.intervalMs / 4), random)
    );
  }
  if (result.code !== "READ_MODEL_REFRESH_EXHAUSTED") return null;
  const lower = Math.ceil(config.maxBackoffMs / 2);
  return (
    lower + randomIntegerInclusive(Math.floor(config.maxBackoffMs / 2), random)
  );
}

export function createReadModelPollingController(input: {
  readonly actor: ReadModelSynchronizationActor;
  readonly config: ResolvedReadModelPollingConfig;
  readonly random?: () => number;
  readonly scheduler?: ReadModelPollingScheduler;
}): ReadModelPollingController {
  const random = input.random ?? Math.random;
  const scheduler = input.scheduler ?? systemScheduler();
  let closed = false;
  let started = false;
  let timer: ReadModelPollingTimer | null = null;
  let active: Promise<void> | null = null;

  function request(): void {
    if (closed || active !== null) return;
    timer = null;
    const run = (async () => {
      const result = await input.actor.refresh();
      if (closed) return;
      const delay = nextDelay(input.config, result, random);
      if (delay !== null) timer = scheduler.schedule(delay, request);
    })();
    active = run.finally(() => {
      active = null;
    });
  }

  return Object.freeze({
    start(): void {
      if (started || closed) return;
      started = true;
      request();
    },
    close(): void {
      if (closed) return;
      closed = true;
      timer?.cancel();
      timer = null;
    },
    async drain(): Promise<void> {
      await active;
    },
  });
}
