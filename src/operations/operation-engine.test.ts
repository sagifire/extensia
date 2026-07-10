import { describe, expect, it } from "vitest";

import type { IDString } from "../domain/scalars.js";
import { AsyncLockQueue } from "./async-lock-queue.js";
import {
  createOperationEngine,
  type OperationScope,
} from "./operation-engine.js";
import type { ResourceOperationIdentitySource } from "./resource-operation-contracts.js";

const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
] as IDString[];

function identitySource(): ResourceOperationIdentitySource {
  let index = 0;
  return {
    create: () => ({
      operation_id: ids[index++] ?? ids[0],
      actor_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as IDString,
    }),
  };
}

const request = {
  type: "resource.update" as const,
  affected_resources: [ids[0]],
  lock_keys: ["resource:b", "resource:a", "resource:a"],
};

describe("Operation Engine", () => {
  it("provides an explicit scope and deterministic plan", async () => {
    const engine = createOperationEngine(identitySource());
    const result = await engine.execute(request, async (scope, plan) => {
      expect(scope.identity).toEqual({
        operation_id: ids[0],
        actor_id: expect.any(String),
      });
      expect(plan.lock_keys).toEqual(["resource:a", "resource:b"]);
      expect(scope.state).toBe("preparing");
      scope.transition("staging");
      scope.transition("committing");
      scope.commit("done");
      return "ignored";
    });
    expect(result).toEqual({
      ok: true,
      value: "done",
      committed: true,
      warnings: [],
      fail_closed: false,
    });
  });

  it("allows cancellation before staging and ignores it after staging", async () => {
    const engine = createOperationEngine(identitySource());
    const before = new AbortController();
    const canceled = await engine.execute(
      { ...request, signal: before.signal },
      async (scope) => {
        before.abort();
        scope.transition("staging");
        return "unreachable";
      },
    );
    expect(canceled).toEqual({
      ok: false,
      code: "OPERATION_CANCELED",
      committed: false,
    });

    const after = new AbortController();
    const committed = await engine.execute(
      { ...request, signal: after.signal },
      async (scope) => {
        scope.transition("staging");
        after.abort();
        scope.transition("committing");
        scope.commit("committed");
        return "ignored";
      },
    );
    expect(committed).toEqual({
      ok: true,
      value: "committed",
      committed: true,
      warnings: [],
      fail_closed: false,
    });
  });

  it("preserves committed success across a post-commit callback fault", async () => {
    const engine = createOperationEngine(identitySource());
    expect(
      await engine.execute(request, async (scope) => {
        scope.transition("staging");
        scope.transition("committing");
        scope.commit("committed");
        throw new Error("publication failed");
      }),
    ).toEqual({
      ok: true,
      value: "committed",
      committed: true,
      warnings: ["LOCAL_INDEX_PUBLICATION_FAILED"],
      fail_closed: true,
    });
  });

  it("closes intake and naturally drains admitted operations", async () => {
    const engine = createOperationEngine(identitySource());
    let finish!: () => void;
    const blocker = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const admitted = engine.execute(request, async () =>
      blocker.then(() => "done"),
    );
    const drain = engine.closeAndDrain();
    expect(await engine.execute(request, async () => "new")).toEqual({
      ok: false,
      code: "ENGINE_CLOSED",
      committed: false,
    });
    let drained = false;
    void drain.then(() => {
      drained = true;
    });
    await Promise.resolve();
    expect(drained).toBe(false);
    finish();
    expect(await admitted).toEqual({
      ok: true,
      value: "done",
      committed: false,
      warnings: [],
      fail_closed: false,
    });
    await drain;
    expect(drained).toBe(true);
    await engine.closeAndDrain();
  });

  it("always drains construction and lease cleanup failures", async () => {
    const throwingIdentities: ResourceOperationIdentitySource = {
      create: () => {
        throw new Error("identity failed");
      },
    };
    const constructionEngine = createOperationEngine(throwingIdentities);
    expect(
      await constructionEngine.execute(request, async () => "never"),
    ).toEqual({ ok: false, code: "OPERATION_FAILED", committed: false });
    await constructionEngine.closeAndDrain();

    class ThrowingReleaseQueue extends AsyncLockQueue {
      override async acquire(keys: readonly string[], signal?: AbortSignal) {
        const lease = await super.acquire(keys, signal);
        return Object.freeze({
          keys: lease.keys,
          release: () => {
            lease.release();
            throw new Error("release failed");
          },
        });
      }
    }
    const cleanupEngine = createOperationEngine(
      identitySource(),
      new ThrowingReleaseQueue(),
    );
    expect(await cleanupEngine.execute(request, async () => "value")).toEqual({
      ok: false,
      code: "OPERATION_FAILED",
      committed: false,
    });
    await cleanupEngine.closeAndDrain();
  });

  it("disposes explicit scope cleanups in reverse order", async () => {
    const engine = createOperationEngine(identitySource());
    const order: string[] = [];
    let captured!: OperationScope<string>;
    const result = await engine.execute(request, async (scope) => {
      captured = scope;
      scope.deferCleanup(() => order.push("first"));
      scope.deferCleanup(() => {
        order.push("second");
        throw new Error("cleanup failed");
      });
      scope.transition("staging");
      scope.transition("committing");
      scope.commit("committed");
      return "ignored";
    });
    expect(order).toEqual(["second", "first"]);
    expect(result).toEqual({
      ok: true,
      value: "committed",
      committed: true,
      warnings: ["POST_COMMIT_CLEANUP_FAILED"],
      fail_closed: true,
    });
    expect(() => captured.deferCleanup(() => undefined)).toThrow(
      "Operation scope has been disposed",
    );
    expect(await engine.execute(request, async () => "closed")).toEqual({
      ok: false,
      code: "ENGINE_CLOSED",
      committed: false,
    });
  });

  it("classifies cancellation-like faults after staging as failures", async () => {
    const engine = createOperationEngine(identitySource());
    const result = await engine.execute(request, async (scope) => {
      scope.transition("staging");
      throw new DOMException("aborted", "AbortError");
    });
    expect(result).toEqual({
      ok: false,
      code: "OPERATION_FAILED",
      committed: false,
    });
  });

  it("classifies any aborted preparation settlement as cancellation", async () => {
    const engine = createOperationEngine(identitySource());
    const rejecting = new AbortController();
    const rejected = await engine.execute(
      { ...request, signal: rejecting.signal },
      async () => {
        rejecting.abort();
        throw new DOMException("aborted", "AbortError");
      },
    );
    expect(rejected).toEqual({
      ok: false,
      code: "OPERATION_CANCELED",
      committed: false,
    });

    const returning = new AbortController();
    const returned = await engine.execute(
      { ...request, signal: returning.signal },
      async () => {
        returning.abort();
        return "must not succeed";
      },
    );
    expect(returned).toEqual({
      ok: false,
      code: "OPERATION_CANCELED",
      committed: false,
    });
  });
});
