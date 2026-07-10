import { defineModule } from "@sagifire/ioc";
import { describe, expect, it } from "vitest";

import { createExtensiaInternalNamespace } from "../composition/tokens.js";
import {
  composeRuntimeHost,
  LIFECYCLE_CONTRIBUTIONS,
  lifecycleContribution,
  type LifecycleContribution,
  type RuntimeHostCompositionResult,
  type RuntimeLifecycleHost,
} from "./lifecycle.js";

const SECRET_SENTINEL = "secret-runtime-error-must-not-leak";
const UNSAFE_ID_SENTINEL = `Unsafe/${SECRET_SENTINEL}`;
const probeTokens = createExtensiaInternalNamespace("runtime.lifecycle.probes");
const GRAPH_RESOURCE = probeTokens.token<{ readonly composed: true }>(
  "graph-resource",
);

function assertHost(
  result: RuntimeHostCompositionResult,
): asserts result is Extract<
  RuntimeHostCompositionResult,
  { readonly ok: true }
> {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(
      `Expected runtime composition success: ${result.failure.code}`,
    );
  }
}

function createLifecycleModule(
  id: string,
  contributions: readonly LifecycleContribution[],
  dispose?: () => Promise<void>,
): ReturnType<typeof defineModule> {
  return defineModule({
    id,
    provides: [
      {
        token: LIFECYCLE_CONTRIBUTIONS,
        kind: "admin-contribution",
        cardinality: "multi",
      },
    ],
    setup(context) {
      for (const contribution of contributions) {
        context.add(LIFECYCLE_CONTRIBUTIONS).toValue(contribution);
      }

      if (dispose !== undefined) {
        context
          .bind(GRAPH_RESOURCE)
          .toAsyncResource(async () => ({
            value: { composed: true as const },
            dispose,
          }))
          .singleton()
          .eager();
      }
    },
  });
}

interface ReadonlyStorageLifecycleFixture {
  readonly kind: "readonly-storage-shaped-fixture";
  readonly contribution: LifecycleContribution;
  readonly snapshot: Readonly<{ readonly resources: readonly string[] }>;
}

function createReadonlyStorageLifecycleFixture(
  events: string[],
): ReadonlyStorageLifecycleFixture {
  const snapshot = Object.freeze({ resources: Object.freeze(["resource-a"]) });

  return Object.freeze({
    kind: "readonly-storage-shaped-fixture" as const,
    snapshot,
    contribution: lifecycleContribution({
      id: "storage.readonly-fixture",
      order: 20,
      async start(): Promise<void> {
        events.push("start:storage");
      },
      async stop(): Promise<void> {
        events.push("stop:storage");
      },
    }),
  });
}

function eventContribution(
  id: string,
  order: number,
  events: string[],
  options: Readonly<{
    start?: () => Promise<void>;
    stop?: () => Promise<void>;
  }> = {},
): LifecycleContribution {
  return lifecycleContribution({
    id,
    order,
    async start(): Promise<void> {
      events.push(`start:${id}`);
      await options.start?.();
    },
    async stop(): Promise<void> {
      events.push(`stop:${id}`);
      await options.stop?.();
    },
  });
}

function deferred(): Readonly<{
  readonly promise: Promise<void>;
  readonly resolve: () => void;
}> {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  return Object.freeze({
    promise,
    resolve(): void {
      resolvePromise?.();
    },
  });
}

describe("internal runtime lifecycle host", () => {
  it("constructs without starting and uses deterministic startup/reverse cleanup", async () => {
    const events: string[] = [];
    const storage = createReadonlyStorageLifecycleFixture(events);
    const alpha = eventContribution("alpha", 10, events);
    const beta = eventContribution("beta", 10, events);
    const mutableDescriptor = {
      id: "snapshot",
      order: 15,
      async start(): Promise<void> {
        events.push("start:snapshot");
      },
      async stop(): Promise<void> {
        events.push("stop:snapshot");
      },
    };
    const result = await composeRuntimeHost({
      register(registry) {
        registry.use(
          createLifecycleModule(
            "probe.deterministic",
            [storage.contribution, mutableDescriptor, beta, alpha],
            async () => {
              events.push("dispose:graph");
            },
          ),
        );
      },
    });
    assertHost(result);
    mutableDescriptor.id = UNSAFE_ID_SENTINEL;
    mutableDescriptor.order = Number.NaN;

    expect(result.host.state).toBe("created");
    expect(result.host.inspect()).toEqual({
      state: "created",
      ready: false,
      diagnostics: [],
    });
    expect(events).toEqual([]);
    expect(Object.isFrozen(storage)).toBe(true);
    expect(Object.isFrozen(storage.contribution)).toBe(true);
    expect(Object.isFrozen(storage.snapshot.resources)).toBe(true);

    await expect(result.host.start()).resolves.toEqual({
      ok: true,
      state: "started",
    });
    expect(result.host.inspect().ready).toBe(true);
    expect(events).toEqual([
      "start:alpha",
      "start:beta",
      "start:snapshot",
      "start:storage",
    ]);

    await expect(result.host.start()).resolves.toEqual({
      ok: true,
      state: "started",
    });
    await expect(result.host.stop()).resolves.toEqual({
      ok: true,
      state: "stopped",
    });
    await expect(result.host.stop()).resolves.toEqual({
      ok: true,
      state: "stopped",
    });
    expect(events).toEqual([
      "start:alpha",
      "start:beta",
      "start:snapshot",
      "start:storage",
      "stop:storage",
      "stop:snapshot",
      "stop:beta",
      "stop:alpha",
      "dispose:graph",
    ]);
  });

  it("validates every descriptor before start and safely aggregates disposal failure", async () => {
    const events: string[] = [];
    let disposalAttempts = 0;
    const contributions = [
      eventContribution(UNSAFE_ID_SENTINEL, 0, events),
      eventContribution("safe.invalid-order", Number.NaN, events),
      eventContribution("duplicate", 1, events),
      eventContribution("duplicate", 2, events),
    ];
    const result = await composeRuntimeHost({
      register(registry) {
        registry.use(
          createLifecycleModule("probe.validation", contributions, async () => {
            disposalAttempts += 1;
            throw new Error(SECRET_SENTINEL);
          }),
        );
      },
    });
    assertHost(result);

    const startResult = await result.host.start();
    expect(startResult).toEqual({
      ok: false,
      state: "failed",
      failures: [
        { code: "LIFECYCLE_VALIDATION_FAILED", stage: "validation" },
        {
          code: "LIFECYCLE_VALIDATION_FAILED",
          stage: "validation",
          contributionId: "safe.invalid-order",
        },
        {
          code: "LIFECYCLE_VALIDATION_FAILED",
          stage: "validation",
          contributionId: "duplicate",
        },
        { code: "RUNTIME_DISPOSE_FAILED", stage: "dispose" },
      ],
    });
    expect(events).toEqual([]);
    expect(disposalAttempts).toBe(1);
    expect(JSON.stringify(startResult)).not.toContain(SECRET_SENTINEL);
    expect(JSON.stringify(startResult)).not.toContain(UNSAFE_ID_SENTINEL);

    const inspection = result.host.inspect();
    expect(inspection.ready).toBe(false);
    expect(Object.isFrozen(inspection)).toBe(true);
    expect(Object.isFrozen(inspection.diagnostics)).toBe(true);
    expect(() => {
      (inspection.diagnostics as LifecycleContribution[]).push(
        contributions[0]!,
      );
    }).toThrow(TypeError);

    await expect(result.host.start()).resolves.toEqual({
      ok: false,
      state: "failed",
      failures: [{ code: "LIFECYCLE_INVALID_STATE", stage: "transition" }],
    });
    expect(disposalAttempts).toBe(1);

    await expect(result.host.stop()).resolves.toEqual({
      ok: true,
      state: "stopped",
    });
    expect(disposalAttempts).toBe(1);
  });

  it("accepts exact safe ID and order boundaries", async () => {
    const events: string[] = [];
    const maximumLengthId = `a${"b".repeat(127)}`;
    expect(maximumLengthId).toHaveLength(128);
    const result = await composeRuntimeHost({
      register(registry) {
        registry.use(
          createLifecycleModule("probe.valid-boundaries", [
            eventContribution(maximumLengthId, Number.MAX_SAFE_INTEGER, events),
            eventContribution("valid.segment-1", 0, events),
            eventContribution("a", Number.MIN_SAFE_INTEGER, events),
          ]),
        );
      },
    });
    assertHost(result);

    await expect(result.host.start()).resolves.toEqual({
      ok: true,
      state: "started",
    });
    expect(events).toEqual([
      "start:a",
      "start:valid.segment-1",
      `start:${maximumLengthId}`,
    ]);
    await result.host.stop();
    expect(events.slice(3)).toEqual([
      `stop:${maximumLengthId}`,
      "stop:valid.segment-1",
      "stop:a",
    ]);
  });

  it("rejects exact ID/order boundary violations in registration order", async () => {
    const events: string[] = [];
    let disposalAttempts = 0;
    const tooLongId = `a${"b".repeat(128)}`;
    expect(tooLongId).toHaveLength(129);
    const contributions = [
      eventContribution("", 0, events),
      eventContribution(tooLongId, 0, events),
      eventContribution("1starts-with-digit", 0, events),
      eventContribution("Uppercase", 0, events),
      eventContribution("double..segment", 0, events),
      eventContribution("trailing-", 0, events),
      eventContribution("under_score", 0, events),
      eventContribution(42 as unknown as string, 0, events),
      eventContribution("fractional-order", 0.5, events),
      eventContribution("infinite-order", Number.POSITIVE_INFINITY, events),
      eventContribution("too-large-order", Number.MAX_SAFE_INTEGER + 1, events),
      eventContribution("too-small-order", Number.MIN_SAFE_INTEGER - 1, events),
      eventContribution(UNSAFE_ID_SENTINEL, Number.NaN, events),
    ];
    const result = await composeRuntimeHost({
      register(registry) {
        registry.use(
          createLifecycleModule(
            "probe.invalid-boundaries",
            contributions,
            async () => {
              disposalAttempts += 1;
            },
          ),
        );
      },
    });
    assertHost(result);

    const validationFailure = {
      code: "LIFECYCLE_VALIDATION_FAILED" as const,
      stage: "validation" as const,
    };
    const startResult = await result.host.start();
    expect(startResult).toEqual({
      ok: false,
      state: "failed",
      failures: [
        validationFailure,
        validationFailure,
        validationFailure,
        validationFailure,
        validationFailure,
        validationFailure,
        validationFailure,
        validationFailure,
        { ...validationFailure, contributionId: "fractional-order" },
        { ...validationFailure, contributionId: "infinite-order" },
        { ...validationFailure, contributionId: "too-large-order" },
        { ...validationFailure, contributionId: "too-small-order" },
        validationFailure,
        validationFailure,
      ],
    });
    expect(events).toEqual([]);
    expect(disposalAttempts).toBe(1);
    expect(JSON.stringify(startResult)).not.toContain(UNSAFE_ID_SENTINEL);
    expect(JSON.stringify(startResult)).not.toContain(tooLongId);
    expect(JSON.stringify(startResult)).not.toContain("42");

    await result.host.stop();
    expect(disposalAttempts).toBe(1);
  });

  it("keeps rejected-start cleanup local and rolls back only resolved starts", async () => {
    const events: string[] = [];
    let failingStopAttempts = 0;
    let disposalAttempts = 0;
    const first = eventContribution("first", 0, events);
    const second = eventContribution("second", 1, events, {
      async stop(): Promise<void> {
        throw new Error(SECRET_SENTINEL);
      },
    });
    const failing = eventContribution("failing", 2, events, {
      async start(): Promise<void> {
        events.push("partial:acquired");
        events.push("partial:cleaned");
        throw new Error(SECRET_SENTINEL);
      },
      async stop(): Promise<void> {
        failingStopAttempts += 1;
      },
    });
    const after = eventContribution("after", 3, events);
    const result = await composeRuntimeHost({
      register(registry) {
        registry.use(
          createLifecycleModule(
            "probe.start-failure",
            [after, failing, second, first],
            async () => {
              disposalAttempts += 1;
              events.push("dispose:graph");
              throw new Error(SECRET_SENTINEL);
            },
          ),
        );
      },
    });
    assertHost(result);

    const startResult = await result.host.start();
    expect(startResult).toEqual({
      ok: false,
      state: "failed",
      failures: [
        {
          code: "LIFECYCLE_START_FAILED",
          stage: "start",
          contributionId: "failing",
        },
        {
          code: "LIFECYCLE_STOP_FAILED",
          stage: "stop",
          contributionId: "second",
        },
        { code: "RUNTIME_DISPOSE_FAILED", stage: "dispose" },
      ],
    });
    expect(events).toEqual([
      "start:first",
      "start:second",
      "start:failing",
      "partial:acquired",
      "partial:cleaned",
      "stop:second",
      "stop:first",
      "dispose:graph",
    ]);
    expect(failingStopAttempts).toBe(0);
    expect(disposalAttempts).toBe(1);
    expect(JSON.stringify(startResult)).not.toContain(SECRET_SENTINEL);

    await expect(result.host.stop()).resolves.toEqual({
      ok: true,
      state: "stopped",
    });
    expect(events).toHaveLength(8);
    expect(disposalAttempts).toBe(1);
  });

  it("continues normal reverse cleanup after failures and never retries attempts", async () => {
    const events: string[] = [];
    let disposalAttempts = 0;
    const first = eventContribution("first", 0, events);
    const second = eventContribution("second", 1, events, {
      async stop(): Promise<void> {
        throw new Error(SECRET_SENTINEL);
      },
    });
    const result = await composeRuntimeHost({
      register(registry) {
        registry.use(
          createLifecycleModule(
            "probe.stop-failure",
            [first, second],
            async () => {
              disposalAttempts += 1;
              events.push("dispose:graph");
              throw new Error(SECRET_SENTINEL);
            },
          ),
        );
      },
    });
    assertHost(result);

    await result.host.start();
    await expect(result.host.stop()).resolves.toEqual({
      ok: false,
      state: "stopped",
      failures: [
        {
          code: "LIFECYCLE_STOP_FAILED",
          stage: "stop",
          contributionId: "second",
        },
        { code: "RUNTIME_DISPOSE_FAILED", stage: "dispose" },
      ],
    });
    expect(events).toEqual([
      "start:first",
      "start:second",
      "stop:second",
      "stop:first",
      "dispose:graph",
    ]);

    await expect(result.host.stop()).resolves.toEqual({
      ok: true,
      state: "stopped",
    });
    expect(events).toHaveLength(5);
    expect(disposalAttempts).toBe(1);
    expect(result.host.inspect().diagnostics).toHaveLength(2);
  });

  it("enforces busy, idempotent, invalid-state, and ready transitions", async () => {
    const startGate = deferred();
    const stopGate = deferred();
    const result = await composeRuntimeHost({
      register(registry) {
        registry.use(
          createLifecycleModule("probe.transitions", [
            lifecycleContribution({
              id: "gated",
              order: 0,
              async start(): Promise<void> {
                await startGate.promise;
              },
              async stop(): Promise<void> {
                await stopGate.promise;
              },
            }),
          ]),
        );
      },
    });
    assertHost(result);

    const firstStart = result.host.start();
    expect(result.host.state).toBe("starting");
    await expect(result.host.start()).resolves.toEqual({
      ok: false,
      state: "starting",
      failures: [{ code: "LIFECYCLE_BUSY", stage: "transition" }],
    });
    await expect(result.host.stop()).resolves.toEqual({
      ok: false,
      state: "starting",
      failures: [{ code: "LIFECYCLE_BUSY", stage: "transition" }],
    });
    startGate.resolve();
    await expect(firstStart).resolves.toEqual({ ok: true, state: "started" });
    expect(result.host.inspect().ready).toBe(true);

    await expect(result.host.start()).resolves.toEqual({
      ok: true,
      state: "started",
    });
    const firstStop = result.host.stop();
    expect(result.host.state).toBe("stopping");
    await expect(result.host.start()).resolves.toEqual({
      ok: false,
      state: "stopping",
      failures: [{ code: "LIFECYCLE_BUSY", stage: "transition" }],
    });
    await expect(result.host.stop()).resolves.toEqual({
      ok: false,
      state: "stopping",
      failures: [{ code: "LIFECYCLE_BUSY", stage: "transition" }],
    });
    stopGate.resolve();
    await expect(firstStop).resolves.toEqual({ ok: true, state: "stopped" });
    await expect(result.host.start()).resolves.toEqual({
      ok: false,
      state: "stopped",
      failures: [{ code: "LIFECYCLE_INVALID_STATE", stage: "transition" }],
    });
  });

  it("stops from created, normalizes disposal failure, and never retries", async () => {
    const events: string[] = [];
    let disposalAttempts = 0;
    const result = await composeRuntimeHost({
      register(registry) {
        registry.use(
          createLifecycleModule(
            "probe.created-stop",
            [eventContribution("never-started", 0, events)],
            async () => {
              disposalAttempts += 1;
              events.push("dispose:graph");
              throw new Error(SECRET_SENTINEL);
            },
          ),
        );
      },
    });
    assertHost(result);

    await expect(result.host.stop()).resolves.toEqual({
      ok: false,
      state: "stopped",
      failures: [{ code: "RUNTIME_DISPOSE_FAILED", stage: "dispose" }],
    });
    expect(events).toEqual(["dispose:graph"]);
    expect(disposalAttempts).toBe(1);
    expect(JSON.stringify(result.host.inspect())).not.toContain(
      SECRET_SENTINEL,
    );

    await expect(result.host.stop()).resolves.toEqual({
      ok: true,
      state: "stopped",
    });
    expect(events).toEqual(["dispose:graph"]);
    expect(disposalAttempts).toBe(1);
    await expect(result.host.start()).resolves.toEqual({
      ok: false,
      state: "stopped",
      failures: [{ code: "LIFECYCLE_INVALID_STATE", stage: "transition" }],
    });
  });

  it("keeps each fresh composition isolated", async () => {
    const events: string[] = [];
    let instanceId = 0;
    const moduleDefinition = defineModule({
      id: "probe.fresh-runtime",
      provides: [
        {
          token: LIFECYCLE_CONTRIBUTIONS,
          kind: "admin-contribution",
          cardinality: "multi",
        },
      ],
      setup(context) {
        const current = ++instanceId;
        context.add(LIFECYCLE_CONTRIBUTIONS).toValue(
          lifecycleContribution({
            id: `instance-${String(current)}`,
            order: 0,
            async start(): Promise<void> {
              events.push(`start:${String(current)}`);
            },
            async stop(): Promise<void> {
              events.push(`stop:${String(current)}`);
            },
          }),
        );
      },
    });
    const compose = async (): Promise<RuntimeLifecycleHost> => {
      const composed = await composeRuntimeHost({
        register(registry) {
          registry.use(moduleDefinition);
        },
      });
      assertHost(composed);
      return composed.host;
    };

    const first = await compose();
    const second = await compose();
    await first.start();
    await second.start();
    expect(events).toEqual(["start:1", "start:2"]);
    await first.stop();
    await second.stop();
    expect(events).toEqual(["start:1", "start:2", "stop:1", "stop:2"]);
  });
});
