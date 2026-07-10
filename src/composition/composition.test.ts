import { defineModule, SagifireIocError } from "@sagifire/ioc";
import { describe, expect, it } from "vitest";

import type { ExtensiaCapabilityExports } from "./root.js";
import {
  composeExtensia,
  multiCapability,
  scopeValue,
  singleCapability,
  type ExtensiaCompositionRegistry,
  type ExtensiaCompositionResult,
} from "./root.js";
import {
  createExtensiaInternalNamespace,
  synchronousContribution,
  synchronousContributionToken,
} from "./tokens.js";

interface SourceApi {
  read(): string;
}

interface ReaderPort {
  readNormalized(): string;
}

interface ResultApi {
  result(): string;
}

interface Descriptor {
  readonly id: string;
}

interface ScopedProbe {
  readonly instanceId: number;
  readonly context: string;
}

const SECRET_SENTINEL = "private-secret-do-not-disclose";
const UNSAFE_CONFIG_SENTINEL = "unsafe-config-do-not-disclose";
const TYPECHECK_ONLY = false as boolean;
const tokens = createExtensiaInternalNamespace("conformance.probes");
const SOURCE_API = tokens.token<SourceApi>("source-api");
const READER_PORT = tokens.token<ReaderPort>("reader-port");
const RESULT_API = tokens.token<ResultApi>("result-api");
const PRIVATE_SECRET = tokens.token<string>("private-secret");
const DESCRIPTORS = synchronousContributionToken<Descriptor>(
  tokens,
  "descriptors",
);
const SCOPED_PROBE = tokens.token<ScopedProbe>("scoped-probe");
const SCOPE_CONTEXT = tokens.token<string>("scope-context");
const DISPOSABLE_RESOURCE = tokens.token<{ readonly ready: true }>(
  "disposable-resource",
);

function assertSuccessful<TExports extends ExtensiaCapabilityExports>(
  result: ExtensiaCompositionResult<TExports>,
): asserts result is Extract<
  ExtensiaCompositionResult<TExports>,
  { readonly ok: true }
> {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(
      `Expected successful composition, got ${result.failure.code}`,
    );
  }
}

function createSourceModule(): ReturnType<typeof defineModule> {
  return defineModule({
    id: "probe.source",
    metadata: { unsafeConfig: UNSAFE_CONFIG_SENTINEL },
    provides: [{ token: SOURCE_API, kind: "public-api" }],
    setup(context) {
      context.bind(PRIVATE_SECRET).toValue(SECRET_SENTINEL);
      context
        .bind(SOURCE_API)
        .toFactory(({ get }) => ({
          read(): string {
            return get(PRIVATE_SECRET);
          },
        }))
        .singleton();
    },
  });
}

function createConsumerModule(
  onSetup?: () => void,
): ReturnType<typeof defineModule> {
  return defineModule({
    id: "probe.consumer",
    requires: [{ token: READER_PORT }],
    provides: [{ token: RESULT_API, kind: "public-api" }],
    setup(context) {
      onSetup?.();
      context
        .bind(RESULT_API)
        .toFactory(({ get }) => ({
          result(): string {
            return get(READER_PORT).readNormalized();
          },
        }))
        .singleton();
    },
  });
}

function createDescriptorModule(): ReturnType<typeof defineModule> {
  return defineModule({
    id: "probe.descriptors",
    provides: [
      {
        token: DESCRIPTORS,
        kind: "admin-contribution",
        cardinality: "multi",
      },
    ],
    setup(context) {
      context
        .add(DESCRIPTORS)
        .toValue(synchronousContribution({ id: "alpha" }));
      context.add(DESCRIPTORS).toValue(synchronousContribution({ id: "beta" }));
    },
  });
}

describe("internal token contracts", () => {
  it("creates lowercase namespaced tokens and rejects unsafe scope syntax", () => {
    expect(tokens.id).toBe("extensia.internal.conformance.probes");
    expect(SOURCE_API.id).toBe(
      "extensia.internal.conformance.probes.source-api",
    );
    expect(() => createExtensiaInternalNamespace("Public Tokens")).toThrow(
      TypeError,
    );
  });

  it("encodes synchronous descriptor contributions at the type boundary", () => {
    expect(synchronousContribution({ id: "sync" })).toEqual({ id: "sync" });

    if (TYPECHECK_ONLY) {
      // @ts-expect-error Async values are not descriptor contributions.
      synchronousContribution(Promise.resolve({ id: "async" }));
      // @ts-expect-error Async contribution token values are forbidden.
      synchronousContributionToken<Promise<Descriptor>>(tokens, "async");
    }
  });
});

describe("Extensia Composition Root", () => {
  it("exports only immutable declared capabilities through a narrow adapter", async () => {
    const result = await composeExtensia({
      register(registry) {
        registry.use(createSourceModule());
        registry.use(createConsumerModule());
        registry.use(createDescriptorModule());
        registry.adapt(READER_PORT, SOURCE_API, (source) => ({
          readNormalized(): string {
            return source.read().toUpperCase();
          },
        }));
      },
      exports: {
        result: singleCapability(RESULT_API),
        descriptors: multiCapability(DESCRIPTORS),
      },
    });

    assertSuccessful(result);
    const { composition } = result;

    expect(composition.capabilities.result.result()).toBe(
      SECRET_SENTINEL.toUpperCase(),
    );
    expect(composition.capabilities.descriptors).toEqual([
      { id: "alpha" },
      { id: "beta" },
    ]);
    expect(Object.isFrozen(composition)).toBe(true);
    expect(Object.isFrozen(composition.capabilities)).toBe(true);
    expect(Object.isFrozen(composition.capabilities.descriptors)).toBe(true);
    expect(Object.keys(composition).sort()).toEqual([
      "capabilities",
      "dispose",
      "inspection",
      "withScope",
    ]);
    expect("runtime" in composition).toBe(false);
    expect("get" in composition).toBe(false);

    const serializedInspection = JSON.stringify(composition.inspection);
    expect(serializedInspection).not.toContain(SECRET_SENTINEL);
    expect(serializedInspection).not.toContain(UNSAFE_CONFIG_SENTINEL);
    expect(serializedInspection).not.toContain("metadata");
    expect(composition.inspection.edges).toContainEqual(
      expect.objectContaining({
        edgeKind: "adapter-source",
        consumerModuleId: "probe.consumer",
        requiredTokenId: READER_PORT.id,
      }),
    );

    expect(() => {
      (composition.inspection.modules as unknown[]).push({});
    }).toThrow(TypeError);
    expect(() => {
      (composition.capabilities as { result: ResultApi }).result = {
        result: () => "mutated",
      };
    }).toThrow(TypeError);

    await composition.dispose();
  });

  it("normalizes private-provider access without exposing the raw error", async () => {
    const result = await composeExtensia({
      register(registry) {
        registry.use(createSourceModule());
      },
      exports: { forbidden: singleCapability(PRIVATE_SECRET) },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected private access to fail");
    expect(result.failure.stage).toBe("capability-export");
    expect(result.failure.diagnostics).toEqual([
      expect.objectContaining({ category: "private-access" }),
    ]);
    expect(JSON.stringify(result.failure)).not.toContain(SECRET_SENTINEL);
    expect(JSON.stringify(result.failure)).not.toContain("details");
    expect(JSON.stringify(result.failure)).not.toContain("cause");
  });

  it("normalizes single access to a multi capability as cardinality failure", async () => {
    const result = await composeExtensia({
      register(registry) {
        registry.use(createDescriptorModule());
      },
      exports: { invalid: singleCapability(DESCRIPTORS) },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected root cardinality failure");
    expect(result.failure.stage).toBe("capability-export");
    expect(result.failure.diagnostics).toEqual([
      expect.objectContaining({
        code: "EXTENSIA_COMPOSITION_CARDINALITY_INVALID",
        category: "cardinality",
      }),
    ]);
  });

  it("builds a fresh immutable composition for every invocation", async () => {
    let instanceId = 0;
    const moduleDefinition = defineModule({
      id: "probe.fresh",
      provides: [{ token: SOURCE_API, kind: "public-api" }],
      setup(context) {
        context
          .bind(SOURCE_API)
          .toFactory(() => {
            const current = ++instanceId;
            return { read: () => String(current) };
          })
          .singleton();
      },
    });
    const spec = {
      register(registry: ExtensiaCompositionRegistry): undefined {
        registry.use(moduleDefinition);
        return undefined;
      },
      exports: { source: singleCapability(SOURCE_API) },
    };

    const first = await composeExtensia(spec);
    const second = await composeExtensia(spec);
    assertSuccessful(first);
    assertSuccessful(second);

    expect(first.composition.capabilities.source.read()).toBe("1");
    expect(second.composition.capabilities.source.read()).toBe("2");
    expect(first.composition.capabilities.source).not.toBe(
      second.composition.capabilities.source,
    );

    await first.composition.dispose();
    await second.composition.dispose();
  });

  it("closes the registration lease before validation and composition", async () => {
    let capturedRegistry: ExtensiaCompositionRegistry | undefined;
    const result = await composeExtensia({
      register(registry) {
        capturedRegistry = registry;
        registry.use(createSourceModule());
      },
      exports: { source: singleCapability(SOURCE_API) },
    });
    assertSuccessful(result);

    expect(() =>
      capturedRegistry?.bindValue(SOURCE_API, { read: () => "override" }),
    ).toThrow("registration is closed");
    expect(result.composition.capabilities.source.read()).toBe(SECRET_SENTINEL);

    await result.composition.dispose();
  });

  it("rejects async registration at type and runtime boundaries", async () => {
    if (TYPECHECK_ONLY) {
      void composeExtensia({
        // @ts-expect-error Registration must not return a Promise.
        register: async () => undefined,
        exports: {},
      });
    }

    let setups = 0;
    const lateModule = createConsumerModule(() => setups++);
    const result = await composeExtensia({
      register(registry): undefined {
        return (async () => {
          await Promise.resolve();
          registry.use(lateModule);
        })() as unknown as undefined;
      },
      exports: {},
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected async registration failure");
    expect(result.failure.stage).toBe("registration");
    expect(result.failure.diagnostics).toEqual([
      expect.objectContaining({
        code: "EXTENSIA_COMPOSITION_UNEXPECTED",
        category: "unexpected",
      }),
    ]);
    await Promise.resolve();
    await Promise.resolve();
    expect(setups).toBe(0);
  });

  it("maps arbitrary package error codes to an Extensia-owned safe code", async () => {
    const result = await composeExtensia({
      register(): undefined {
        throw new SagifireIocError({
          code: SECRET_SENTINEL,
          message: UNSAFE_CONFIG_SENTINEL,
          details: { secret: SECRET_SENTINEL },
        });
      },
      exports: {},
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected registration failure");
    expect(result.failure.diagnostics).toEqual([
      {
        code: "EXTENSIA_COMPOSITION_UNEXPECTED",
        severity: "error",
        category: "unexpected",
      },
    ]);
    expect(JSON.stringify(result.failure)).not.toContain(SECRET_SENTINEL);
    expect(JSON.stringify(result.failure)).not.toContain(
      UNSAFE_CONFIG_SENTINEL,
    );
  });

  it("provides controlled scopes and idempotent runtime disposal", async () => {
    let scopedInstanceId = 0;
    let resourceDisposals = 0;
    const scopeModule = defineModule({
      id: "probe.scope-disposal",
      provides: [
        { token: SCOPED_PROBE, kind: "shared-service" },
        { token: SCOPE_CONTEXT, kind: "shared-service" },
      ],
      setup(context) {
        context.bind(SCOPE_CONTEXT).toValue("default");
        context
          .bind(SCOPED_PROBE)
          .toFactory(({ get }) => ({
            instanceId: ++scopedInstanceId,
            context: get(SCOPE_CONTEXT),
          }))
          .scoped();
        context
          .bind(DISPOSABLE_RESOURCE)
          .toAsyncResource(async () => ({
            value: { ready: true as const },
            dispose: async () => {
              resourceDisposals += 1;
            },
          }))
          .singleton()
          .eager();
      },
    });
    const result = await composeExtensia({
      register(registry) {
        registry.use(scopeModule);
      },
      exports: {},
    });
    assertSuccessful(result);

    const scopedExports = {
      first: singleCapability(SCOPED_PROBE),
      second: singleCapability(SCOPED_PROBE),
      context: singleCapability(SCOPE_CONTEXT),
    };
    const firstScope = await result.composition.withScope(
      scopedExports,
      (capabilities) => capabilities,
      { values: [scopeValue(SCOPE_CONTEXT, "request-a")] },
    );
    const secondScope = await result.composition.withScope(
      scopedExports,
      (capabilities) => capabilities,
      { values: [scopeValue(SCOPE_CONTEXT, "request-b")] },
    );

    expect(firstScope.first).toBe(firstScope.second);
    expect(firstScope.first).not.toBe(secondScope.first);
    expect(firstScope.context).toBe("request-a");
    expect(firstScope.first.context).toBe("request-a");
    expect(secondScope.context).toBe("request-b");
    expect(secondScope.first.context).toBe("request-b");
    expect(Object.isFrozen(firstScope)).toBe(true);
    expect(resourceDisposals).toBe(0);

    await result.composition.dispose();
    await result.composition.dispose();
    expect(resourceDisposals).toBe(1);
    await expect(
      result.composition.withScope(scopedExports, () => undefined),
    ).rejects.toThrow("disposed");
  });
});

describe("graph conformance failures", () => {
  it("fails a missing required port before module setup", async () => {
    let setups = 0;
    const result = await composeExtensia({
      register(registry) {
        registry.use(createConsumerModule(() => setups++));
      },
      exports: {},
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected missing-port failure");
    expect(result.failure.stage).toBe("validation");
    expect(result.failure.diagnostics).toContainEqual(
      expect.objectContaining({ category: "missing" }),
    );
    expect(setups).toBe(0);
  });

  it("fails module cycles before module setup", async () => {
    const CYCLE_A = tokens.token<string>("cycle-a");
    const CYCLE_B = tokens.token<string>("cycle-b");
    let setups = 0;
    const moduleA = defineModule({
      id: "probe.cycle-a",
      requires: [{ token: CYCLE_B }],
      provides: [{ token: CYCLE_A, kind: "shared-service" }],
      setup(context) {
        setups++;
        context.bind(CYCLE_A).toFactory(({ get }) => get(CYCLE_B));
      },
    });
    const moduleB = defineModule({
      id: "probe.cycle-b",
      requires: [{ token: CYCLE_A }],
      provides: [{ token: CYCLE_B, kind: "shared-service" }],
      setup(context) {
        setups++;
        context.bind(CYCLE_B).toFactory(({ get }) => get(CYCLE_A));
      },
    });
    const result = await composeExtensia({
      register(registry) {
        registry.use(moduleA);
        registry.use(moduleB);
      },
      exports: {},
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected cycle failure");
    expect(result.failure.diagnostics).toContainEqual(
      expect.objectContaining({ category: "cycle" }),
    );
    expect(setups).toBe(0);
  });

  it("fails duplicate composition-root bindings during validation", async () => {
    const duplicateValue = { secret: SECRET_SENTINEL };
    const result = await composeExtensia({
      register(registry) {
        registry.bindValue(SOURCE_API, duplicateValue as unknown as SourceApi);
        registry.bindValue(SOURCE_API, duplicateValue as unknown as SourceApi);
      },
      exports: {},
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected duplicate-binding failure");
    expect(result.failure.stage).toBe("validation");
    expect(result.failure.diagnostics).toContainEqual(
      expect.objectContaining({ category: "duplicate" }),
    );
    expect(JSON.stringify(result.failure)).not.toContain(SECRET_SENTINEL);
  });

  it("fails single/multi cardinality mismatches deterministically", async () => {
    const provider = defineModule({
      id: "probe.multi-provider",
      provides: [
        {
          token: DESCRIPTORS,
          kind: "admin-contribution",
          cardinality: "multi",
        },
      ],
      setup(context) {
        context.add(DESCRIPTORS).toValue({ id: "one" });
      },
    });
    const consumer = defineModule({
      id: "probe.single-consumer",
      requires: [{ token: DESCRIPTORS, cardinality: "single" }],
      setup() {},
    });
    const result = await composeExtensia({
      register(registry) {
        registry.use(provider);
        registry.use(consumer);
      },
      exports: {},
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected cardinality failure");
    expect(result.failure.diagnostics).toContainEqual(
      expect.objectContaining({ category: "cardinality" }),
    );
  });

  it("fails invalid adapter sources before module setup", async () => {
    const MISSING_SOURCE = tokens.token<SourceApi>("missing-adapter-source");
    let setups = 0;
    const result = await composeExtensia({
      register(registry) {
        registry.use(createConsumerModule(() => setups++));
        registry.adapt(READER_PORT, MISSING_SOURCE, (source) => ({
          readNormalized: () => source.read(),
        }));
      },
      exports: {},
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected invalid-adapter failure");
    expect(result.failure.stage).toBe("validation");
    expect(result.failure.diagnostics).toContainEqual(
      expect.objectContaining({ category: "adapter" }),
    );
    expect(setups).toBe(0);
  });

  it("fails adapters whose target is not a declared required port", async () => {
    const UNUSED_TARGET = tokens.token<ReaderPort>("unused-adapter-target");
    const result = await composeExtensia({
      register(registry) {
        registry.use(createSourceModule());
        registry.adapt(UNUSED_TARGET, SOURCE_API, (source) => ({
          readNormalized: () => source.read(),
        }));
      },
      exports: {},
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected invalid adapter target failure");
    expect(result.failure.stage).toBe("validation");
    expect(result.failure.diagnostics).toContainEqual(
      expect.objectContaining({ category: "adapter" }),
    );
  });
});
