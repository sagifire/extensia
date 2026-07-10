import type { IDString } from "../domain/scalars.js";
import type {
  ResourceOperationIdentity,
  ResourceOperationIdentitySource,
} from "./resource-operation-contracts.js";
import {
  AsyncLockQueue,
  LockAcquireCanceledError,
  type AsyncLockLease,
} from "./async-lock-queue.js";

export type OperationPipelineState =
  | "admitted"
  | "waiting-for-locks"
  | "preparing"
  | "staging"
  | "committing"
  | "committed"
  | "completed"
  | "failed"
  | "canceled";

export interface ResourceOperationPlan {
  readonly operation_id: IDString;
  readonly actor_id: IDString;
  readonly type: "resource.create" | "resource.update";
  readonly affected_resources: readonly IDString[];
  readonly lock_keys: readonly string[];
}

export type OperationCleanup = () => void | Promise<void>;
export type OperationPostCommitWarning =
  "LOCAL_INDEX_PUBLICATION_FAILED" | "POST_COMMIT_CLEANUP_FAILED";

export interface OperationScope<TValue> {
  readonly identity: ResourceOperationIdentity;
  readonly signal: AbortSignal | undefined;
  readonly state: OperationPipelineState;
  transition(next: "staging" | "committing"): void;
  commit(value: TValue): void;
  deferCleanup(cleanup: OperationCleanup): void;
}

export type OperationEngineResult<TValue> =
  | {
      readonly ok: true;
      readonly value: TValue;
      readonly committed: boolean;
      readonly warnings: readonly OperationPostCommitWarning[];
      readonly fail_closed: boolean;
    }
  | {
      readonly ok: false;
      readonly code:
        "ENGINE_CLOSED" | "OPERATION_CANCELED" | "OPERATION_FAILED";
      readonly committed: false;
    };

export interface OperationRequest {
  readonly type: ResourceOperationPlan["type"];
  readonly affected_resources: readonly IDString[];
  readonly lock_keys: readonly string[];
  readonly signal?: AbortSignal;
}

export interface OperationEngine {
  execute<TValue>(
    request: OperationRequest,
    callback: (
      scope: OperationScope<TValue>,
      plan: ResourceOperationPlan,
    ) => Promise<TValue>,
  ): Promise<OperationEngineResult<TValue>>;
  closeAndDrain(): Promise<void>;
}

const transitions: Readonly<
  Record<OperationPipelineState, readonly OperationPipelineState[]>
> = Object.freeze({
  admitted: ["waiting-for-locks", "failed"],
  "waiting-for-locks": ["preparing", "canceled", "failed"],
  preparing: ["staging", "completed", "canceled", "failed"],
  staging: ["committing", "failed"],
  committing: ["committed", "failed"],
  committed: ["completed", "failed"],
  completed: [],
  failed: [],
  canceled: [],
});

export function createOperationEngine(
  identities: ResourceOperationIdentitySource,
  locks: AsyncLockQueue = new AsyncLockQueue(),
): OperationEngine {
  let open = true;
  let admitted = 0;
  const drainWaiters = new Set<() => void>();

  function finish(): void {
    admitted -= 1;
    if (!open && admitted === 0) {
      drainWaiters.forEach((resolve) => resolve());
      drainWaiters.clear();
    }
  }

  function closeIntake(): void {
    open = false;
  }

  return Object.freeze({
    async execute<TValue>(
      request: OperationRequest,
      callback: (
        scope: OperationScope<TValue>,
        plan: ResourceOperationPlan,
      ) => Promise<TValue>,
    ): Promise<OperationEngineResult<TValue>> {
      if (!open) {
        return Object.freeze({
          ok: false,
          code: "ENGINE_CLOSED",
          committed: false,
        });
      }

      admitted += 1;
      const lifecycle: { state: OperationPipelineState; disposed: boolean } = {
        state: "admitted",
        disposed: false,
      };
      const cleanups: OperationCleanup[] = [];
      const warnings: OperationPostCommitWarning[] = [];
      let lease: AsyncLockLease | undefined;
      let committedValue: TValue | undefined;
      let hasCommittedValue = false;
      let value: TValue | undefined;
      let failure: "OPERATION_CANCELED" | "OPERATION_FAILED" | undefined;

      const move = (next: OperationPipelineState): void => {
        if (!transitions[lifecycle.state].includes(next)) {
          throw new Error("Invalid operation pipeline transition");
        }
        lifecycle.state = next;
      };
      const assertLive = (): void => {
        if (lifecycle.disposed)
          throw new Error("Operation scope has been disposed");
      };
      const requestAborted = (): boolean => request.signal?.aborted === true;

      try {
        const identity = Object.freeze(identities.create());
        const plan: ResourceOperationPlan = Object.freeze({
          ...identity,
          type: request.type,
          affected_resources: Object.freeze([...request.affected_resources]),
          lock_keys: Object.freeze(
            [...new Set(request.lock_keys.map((key) => key.trim()))].sort(),
          ),
        });
        const scope: OperationScope<TValue> = Object.freeze({
          identity,
          signal: request.signal,
          get state(): OperationPipelineState {
            return lifecycle.state;
          },
          transition(next: "staging" | "committing"): void {
            assertLive();
            if (
              requestAborted() &&
              lifecycle.state === "preparing" &&
              next === "staging"
            ) {
              move("canceled");
              throw new LockAcquireCanceledError();
            }
            move(next);
          },
          commit(nextValue: TValue): void {
            assertLive();
            move("committed");
            committedValue = nextValue;
            hasCommittedValue = true;
          },
          deferCleanup(cleanup: OperationCleanup): void {
            assertLive();
            if (typeof cleanup !== "function") {
              throw new TypeError("Operation cleanup must be a function");
            }
            cleanups.push(cleanup);
          },
        });

        move("waiting-for-locks");
        lease = await locks.acquire(plan.lock_keys, request.signal);
        move("preparing");
        if (requestAborted()) {
          throw new LockAcquireCanceledError();
        }
        value = await callback(scope, plan);
        if (lifecycle.state === "preparing" && requestAborted()) {
          throw new LockAcquireCanceledError();
        }
        if (lifecycle.state === "preparing") move("completed");
        if (lifecycle.state === "committed") move("completed");
        if (lifecycle.state !== "completed") {
          throw new Error(
            "Operation callback ended in an incomplete pipeline state",
          );
        }
      } catch (error) {
        if (hasCommittedValue) {
          warnings.push("LOCAL_INDEX_PUBLICATION_FAILED");
          closeIntake();
          if (lifecycle.state === "committed") move("failed");
        } else {
          const canceled =
            (lifecycle.state === "waiting-for-locks" ||
              lifecycle.state === "preparing" ||
              lifecycle.state === "canceled") &&
            (error instanceof LockAcquireCanceledError || requestAborted());
          if (lifecycle.state !== "canceled" && lifecycle.state !== "failed") {
            move(canceled ? "canceled" : "failed");
          }
          failure = canceled ? "OPERATION_CANCELED" : "OPERATION_FAILED";
        }
      } finally {
        lifecycle.disposed = true;
        let cleanupFailed = false;
        for (const cleanup of cleanups.reverse()) {
          try {
            await cleanup();
          } catch {
            cleanupFailed = true;
          }
        }
        try {
          lease?.release();
        } catch {
          cleanupFailed = true;
        } finally {
          finish();
        }
        if (cleanupFailed) {
          if (hasCommittedValue) {
            warnings.push("POST_COMMIT_CLEANUP_FAILED");
            closeIntake();
          } else {
            failure = "OPERATION_FAILED";
          }
        }
      }

      if (hasCommittedValue) {
        return Object.freeze({
          ok: true,
          value: committedValue as TValue,
          committed: true,
          warnings: Object.freeze([...warnings]),
          fail_closed: warnings.length > 0,
        });
      }
      if (failure !== undefined) {
        return Object.freeze({ ok: false, code: failure, committed: false });
      }
      return Object.freeze({
        ok: true,
        value: value as TValue,
        committed: false,
        warnings: Object.freeze([]),
        fail_closed: false,
      });
    },
    closeAndDrain(): Promise<void> {
      closeIntake();
      if (admitted === 0) return Promise.resolve();
      return new Promise((resolve) => drainWaiters.add(resolve));
    },
  });
}
