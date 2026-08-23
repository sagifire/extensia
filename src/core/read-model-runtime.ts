import type { Token } from "@sagifire/ioc";

import { createExtensiaInternalNamespace } from "../composition/tokens.js";
import type { Timestamp } from "../domain/scalars.js";
import type {
  ReadModelSynchronizationActor,
  ReadModelSynchronizationResult,
  ResolvedReadModelSynchronizationRetryConfig,
} from "./read-model-synchronization.js";

export type ReadModelLoadingMode = "greedy" | "lazy";
export type ReadModelSynchronizationMode = "manual" | "polling";

export interface ResolvedReadModelPollingConfig {
  readonly intervalMs: number;
  readonly maxBackoffMs: number;
}

export interface ResolvedReadModelRuntimeConfig {
  readonly loading: ReadModelLoadingMode;
  readonly synchronization: {
    readonly mode: ReadModelSynchronizationMode;
    readonly retry: ResolvedReadModelSynchronizationRetryConfig;
    readonly polling: ResolvedReadModelPollingConfig | null;
  };
}

export type ReadModelLifecycleInspection =
  "not-started" | "building" | "ready" | "stopping" | "failed" | "stopped";

export type SafeSynchronizationFailure =
  | "storage-lock"
  | "storage-unavailable"
  | "storage-read"
  | "coordinator-conflict"
  | "retry-exhausted"
  | "capability"
  | "integrity";

export interface ReadModelControlInspection {
  readonly loading: ReadModelLoadingMode;
  readonly lifecycle: ReadModelLifecycleInspection;
  readonly coverage: "none" | "selective" | "complete";
  readonly synchronization: {
    readonly mode: ReadModelSynchronizationMode;
    readonly state:
      | "not-started"
      | "starting"
      | "unsupported"
      | "idle"
      | "refreshing"
      | "backoff"
      | "degraded"
      | "stopping"
      | "stopped"
      | "failed";
    readonly freshness: "startup" | "observed" | "unknown" | "failed";
    readonly last_observed_at: Timestamp | null;
    readonly last_failure: SafeSynchronizationFailure | null;
  };
}

export interface ReadModelControlPort {
  readonly refreshSupported: boolean;
  refresh(signal?: AbortSignal): Promise<ReadModelSynchronizationResult>;
  inspect(): ReadModelControlInspection;
}

const tokens = createExtensiaInternalNamespace("core.read-model-runtime");

export const READ_MODEL_CONTROL_PORT: Token<ReadModelControlPort> =
  tokens.token("control-port");

export const DEFAULT_READ_MODEL_RUNTIME_CONFIG: ResolvedReadModelRuntimeConfig =
  Object.freeze({
    loading: "greedy",
    synchronization: Object.freeze({
      mode: "manual",
      polling: null,
      retry: Object.freeze({
        deadlineMs: 5_000,
        initialDelayMs: 25,
        maxAttempts: 3,
        maxDelayMs: 1_000,
      }),
    }),
  });

export function createReadModelControl(input: {
  readonly config: ResolvedReadModelRuntimeConfig;
  readonly actor: ReadModelSynchronizationActor | null;
  readonly coverage: () => "none" | "selective" | "complete";
  readonly cursorBehind: () => boolean;
  readonly fault: () => "integrity" | "fatal-runtime" | null;
}): ReadModelControlPort & {
  setLifecycle(state: ReadModelLifecycleInspection): void;
  markStartupObserved(): void;
  markStartupFailure(
    failure: "retry-exhausted" | "capability" | "integrity",
  ): void;
} {
  let lifecycle: ReadModelLifecycleInspection = "not-started";
  let lastObservedAt: Timestamp | null = null;
  let startupFailure: "retry-exhausted" | "capability" | "integrity" | null =
    null;

  function actorState(): ReadModelControlInspection["synchronization"]["state"] {
    if (lifecycle === "not-started") return "not-started";
    if (lifecycle === "building")
      return input.actor === null ? "unsupported" : "starting";
    if (lifecycle === "stopping") return "stopping";
    if (lifecycle === "stopped") return "stopped";
    if (lifecycle === "failed") return "failed";
    if (input.actor === null) return "unsupported";
    const state = input.actor.inspect().state;
    return state === "scheduled" ? "refreshing" : state;
  }

  function failure(): SafeSynchronizationFailure | null {
    if (startupFailure !== null) return startupFailure;
    const fault = input.fault();
    if (fault === "integrity") return "integrity";
    if (input.actor === null) return null;
    const inspection = input.actor.inspect();
    if (inspection.state === "degraded") return "retry-exhausted";
    return inspection.last_failure;
  }

  return Object.freeze({
    get refreshSupported(): boolean {
      return input.actor !== null;
    },
    async refresh(
      signal?: AbortSignal,
    ): Promise<ReadModelSynchronizationResult> {
      if (input.actor === null) {
        return Object.freeze({
          code: "READ_MODEL_SYNCHRONIZATION_CAPABILITY_FAILED" as const,
          ok: false as const,
        });
      }
      const result = await input.actor.refresh(signal);
      if (result.ok) lastObservedAt = Date.now() as Timestamp;
      return result;
    },
    inspect(): ReadModelControlInspection {
      const state = actorState();
      const lastFailure = failure();
      const stopped = lifecycle === "stopped";
      const synchronizationFailed =
        input.fault() !== null || input.actor?.inspect().state === "failed";
      const exactSynchronizationFailure =
        synchronizationFailed || startupFailure !== null;
      return Object.freeze({
        coverage: input.coverage(),
        lifecycle,
        loading: input.config.loading,
        synchronization: Object.freeze({
          freshness: exactSynchronizationFailure
            ? "failed"
            : stopped
              ? "unknown"
              : input.actor === null && lifecycle === "ready"
                ? "startup"
                : input.cursorBehind()
                  ? "unknown"
                  : lastObservedAt === null
                    ? "unknown"
                    : "observed",
          last_failure: stopped ? null : lastFailure,
          last_observed_at: stopped ? null : lastObservedAt,
          mode: input.config.synchronization.mode,
          state,
        }),
      });
    },
    markStartupObserved(): void {
      startupFailure = null;
      if (input.actor !== null) lastObservedAt = Date.now() as Timestamp;
    },
    markStartupFailure(
      failure: "retry-exhausted" | "capability" | "integrity",
    ): void {
      startupFailure = failure;
    },
    setLifecycle(state: ReadModelLifecycleInspection): void {
      lifecycle = state;
    },
  });
}
