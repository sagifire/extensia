import { defineModule } from "@sagifire/ioc";
import { describe, expect, it } from "vitest";

import {
  composeExtensia,
  multiCapability,
  singleCapability,
  type ExtensiaCapabilityExports,
  type ExtensiaCompositionResult,
} from "../composition/root.js";
import { parseIDString } from "../domain/scalars.js";
import type {
  ResourceSnapshot,
  ResourceTreeViewSnapshot,
} from "../domain/snapshots.js";
import { LIFECYCLE_CONTRIBUTIONS } from "./lifecycle.js";
import {
  facadeHandle,
  facadeProvider,
  FACADE_PROVIDER_CONTRIBUTIONS,
  FACADE_REGISTRY_ACCESS,
  type FacadeProvider,
} from "./facades.js";
import {
  DEFAULT_API_FACADE_REGISTRY_MODULE,
  DEFAULT_API_SYSTEM_EXTENSION_MODULE,
  QUERY_FACADE,
  STORAGE_FACADE,
} from "../system-extensions/default-api/facades.js";
import {
  CORE_RESOURCE_READ_PORT,
  type CoreResourceReadPort,
} from "../system-extensions/default-api/resource-read-port.js";
import {
  READ_MODEL_CONTROL_PORT,
  type ReadModelControlPort,
} from "../core/read-model-runtime.js";

const RESOURCE_ID = "550e8400-e29b-41d4-a716-446655440000";
const MISSING_ID = "8f14e45f-ea6f-4d7a-923b-966f7356c001";

const STATIC_READ_MODEL_CONTROL: ReadModelControlPort = Object.freeze({
  refreshSupported: false,
  async refresh() {
    return Object.freeze({
      code: "READ_MODEL_SYNCHRONIZATION_CAPABILITY_FAILED" as const,
      ok: false as const,
    });
  },
  inspect() {
    return Object.freeze({
      coverage: "complete" as const,
      lifecycle: "ready" as const,
      loading: "greedy" as const,
      synchronization: Object.freeze({
        freshness: "startup" as const,
        last_failure: null,
        last_observed_at: null,
        mode: "manual" as const,
        state: "unsupported" as const,
      }),
    });
  },
});

const FACADE_EXPORTS = {
  access: singleCapability(FACADE_REGISTRY_ACCESS),
  lifecycle: multiCapability(LIFECYCLE_CONTRIBUTIONS),
} as const satisfies ExtensiaCapabilityExports;

type FacadeCompositionResult = ExtensiaCompositionResult<typeof FACADE_EXPORTS>;
type FacadeComposition = Extract<
  FacadeCompositionResult,
  { readonly ok: true }
>;

function assertComposed(
  result: FacadeCompositionResult,
): asserts result is FacadeComposition {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.code);
}

function providerModule(
  id: string,
  providers: readonly FacadeProvider[],
): ReturnType<typeof defineModule> {
  return defineModule({
    id,
    provides: [
      {
        token: FACADE_PROVIDER_CONTRIBUTIONS,
        kind: "admin-contribution",
        cardinality: "multi",
      },
    ],
    setup(context) {
      for (const provider of providers) {
        context.add(FACADE_PROVIDER_CONTRIBUTIONS).toValue(provider);
      }
    },
  });
}

async function composeProviders(
  customProviders: readonly FacadeProvider[] = [],
): Promise<FacadeComposition> {
  const unusedPort = Object.freeze({
    async read(): Promise<never> {
      throw new Error("Unexpected Core read");
    },
  }) as CoreResourceReadPort;
  const result = await composeExtensia({
    register(registry) {
      registry.bindValue(CORE_RESOURCE_READ_PORT, unusedPort);
      registry.bindValue(READ_MODEL_CONTROL_PORT, STATIC_READ_MODEL_CONTROL);
      registry.use(DEFAULT_API_SYSTEM_EXTENSION_MODULE);
      if (customProviders.length > 0) {
        registry.use(providerModule("probe.custom-providers", customProviders));
      }
      registry.use(DEFAULT_API_FACADE_REGISTRY_MODULE);
    },
    exports: FACADE_EXPORTS,
  });
  assertComposed(result);
  return result;
}

function registryLifecycle(composed: FacadeComposition) {
  const contribution = composed.composition.capabilities.lifecycle.find(
    (item) => item.id === "runtime.facades",
  );
  expect(contribution).toBeDefined();
  if (contribution === undefined) throw new Error("Missing facade lifecycle");
  return contribution;
}

describe("internal Facade Provider/Registry", () => {
  it("orders dependencies deterministically and disposes in reverse order", async () => {
    const events: string[] = [];
    const alpha = facadeHandle<{ readonly name: "alpha" }>("alpha");
    const beta = facadeHandle<{ readonly name: "beta" }>("beta");
    const gamma = facadeHandle<{ readonly name: "gamma" }>("gamma");
    const providers: readonly FacadeProvider[] = [
      facadeProvider({
        handle: gamma,
        owner: "probe.owner",
        dependencies: [beta],
        create({ dependencies }) {
          expect(dependencies.get(beta)).toEqual({ name: "beta" });
          events.push("create:gamma");
          return Object.freeze({ name: "gamma" as const });
        },
        dispose() {
          events.push("dispose:gamma");
        },
      }),
      facadeProvider({
        handle: beta,
        owner: "probe.owner",
        dependencies: [alpha],
        create({ dependencies }) {
          expect(dependencies.get(alpha)).toEqual({ name: "alpha" });
          events.push("create:beta");
          return Object.freeze({ name: "beta" as const });
        },
        dispose() {
          events.push("dispose:beta");
        },
      }),
      facadeProvider({
        handle: alpha,
        owner: "probe.owner",
        dependencies: [],
        create() {
          events.push("create:alpha");
          return Object.freeze({ name: "alpha" as const });
        },
        dispose() {
          events.push("dispose:alpha");
        },
      }),
    ];
    const composed = await composeProviders(providers);
    const lifecycle = registryLifecycle(composed);

    expect(composed.composition.capabilities.access.inspect()).toEqual({
      phase: "created",
      ready: false,
      facades: [],
      diagnostics: [],
    });
    await lifecycle.start();
    expect(events).toEqual(["create:alpha", "create:beta", "create:gamma"]);
    expect(composed.composition.capabilities.access.get(alpha)).toBeNull();
    expect(composed.composition.capabilities.access.inspect()).toMatchObject({
      phase: "frozen",
      ready: false,
    });

    lifecycle.publishReady?.();
    expect(composed.composition.capabilities.access.get(alpha)).toEqual({
      name: "alpha",
    });
    expect(composed.composition.capabilities.access.inspect()).toEqual({
      phase: "frozen",
      ready: true,
      facades: ["alpha", "beta", "gamma", "query", "storage"],
      diagnostics: [],
    });

    lifecycle.unpublishReady?.();
    expect(composed.composition.capabilities.access.get(alpha)).toBeNull();
    await lifecycle.stop();
    expect(events).toEqual([
      "create:alpha",
      "create:beta",
      "create:gamma",
      "dispose:gamma",
      "dispose:beta",
      "dispose:alpha",
    ]);
    expect(composed.composition.capabilities.access.inspect()).toMatchObject({
      phase: "disposed",
      ready: false,
      facades: [],
    });
    await composed.composition.dispose();
  });

  it.each([
    {
      name: "invalid facade name",
      expected: "FACADE_NAME_INVALID",
      providers: [
        facadeProvider({
          handle: facadeHandle("Invalid"),
          owner: "probe.owner",
          dependencies: [],
          create: () => ({}),
        }),
      ],
    },
    {
      name: "invalid owner",
      expected: "FACADE_OWNER_INVALID",
      providers: [
        facadeProvider({
          handle: facadeHandle("valid"),
          owner: "Probe Owner",
          dependencies: [],
          create: () => ({}),
        }),
      ],
    },
    {
      name: "reserved custom facade",
      expected: "FACADE_RESERVED",
      providers: [
        facadeProvider({
          handle: facadeHandle("query"),
          owner: "extensia.default-api",
          dependencies: [],
          create: () => ({}),
        }),
      ],
    },
    {
      name: "duplicate facade",
      expected: "FACADE_DUPLICATE",
      providers: [
        facadeProvider({
          handle: facadeHandle("duplicate"),
          owner: "probe.owner",
          dependencies: [],
          create: () => ({}),
        }),
        facadeProvider({
          handle: facadeHandle("duplicate"),
          owner: "probe.other",
          dependencies: [],
          create: () => ({}),
        }),
      ],
    },
    {
      name: "missing dependency",
      expected: "FACADE_DEPENDENCY_MISSING",
      providers: [
        facadeProvider({
          handle: facadeHandle("dependent"),
          owner: "probe.owner",
          dependencies: [facadeHandle("absent")],
          create: () => ({}),
        }),
      ],
    },
    {
      name: "dependency cycle",
      expected: "FACADE_DEPENDENCY_CYCLE",
      providers: (() => {
        const first = facadeHandle("first");
        const second = facadeHandle("second");
        return [
          facadeProvider({
            handle: first,
            owner: "probe.owner",
            dependencies: [second],
            create: () => ({}),
          }),
          facadeProvider({
            handle: second,
            owner: "probe.owner",
            dependencies: [first],
            create: () => ({}),
          }),
        ];
      })(),
    },
  ])("rejects $name before publication", async ({ providers, expected }) => {
    const composed = await composeProviders(providers);
    const lifecycle = registryLifecycle(composed);

    await expect(lifecycle.start()).rejects.toThrow("startup failed");
    const inspection = composed.composition.capabilities.access.inspect();
    expect(inspection).toMatchObject({
      phase: "disposed",
      ready: false,
      facades: [],
    });
    expect(inspection.diagnostics.map((item) => item.code)).toContain(expected);
    expect(JSON.stringify(inspection)).not.toContain("private");
    await composed.composition.dispose();
  });

  it("rejects reserved-name spoofing through the only external contribution path", async () => {
    const spoofedQuery = facadeProvider({
      handle: facadeHandle("query"),
      owner: "extensia.default-api",
      dependencies: [],
      create: () => ({}),
    });
    const composed = await composeProviders([spoofedQuery]);
    const lifecycle = registryLifecycle(composed);

    await expect(lifecycle.start()).rejects.toThrow();
    expect(
      composed.composition.capabilities.access
        .inspect()
        .diagnostics.map((item) => item.code),
    ).toContain("FACADE_RESERVED");
    await composed.composition.dispose();
  });

  it("rolls back partial creation and continues reverse disposal failures", async () => {
    const events: string[] = [];
    const first = facadeHandle("first");
    const second = facadeHandle("second");
    const composed = await composeProviders([
      facadeProvider({
        handle: first,
        owner: "probe.owner",
        dependencies: [],
        create() {
          events.push("create:first");
          return {};
        },
        dispose() {
          events.push("dispose:first");
          throw new Error("secret-dispose-error");
        },
      }),
      facadeProvider({
        handle: second,
        owner: "probe.owner",
        dependencies: [first],
        create() {
          events.push("create:second");
          throw new Error("secret-create-error");
        },
      }),
    ]);
    const lifecycle = registryLifecycle(composed);

    await expect(lifecycle.start()).rejects.toThrow("startup failed");
    expect(events).toEqual(["create:first", "create:second", "dispose:first"]);
    const serialized = JSON.stringify(
      composed.composition.capabilities.access.inspect(),
    );
    expect(serialized).toContain("FACADE_CREATE_FAILED");
    expect(serialized).toContain("FACADE_DISPOSE_FAILED");
    expect(serialized).not.toContain("secret-");
    await composed.composition.dispose();
  });
});

describe("extensia.default-api system facades", () => {
  it("adapts the exact Core seam, freezes before publication, and rejects readonly writes", async () => {
    const requests: unknown[] = [];
    const snapshot = Object.freeze({
      data: Object.freeze({ id: RESOURCE_ID }),
    });
    const port: CoreResourceReadPort = Object.freeze({
      async read(request) {
        requests.push(request);
        if (request.id === parseIDString(MISSING_ID)) {
          return Object.freeze({
            ok: false as const,
            error: Object.freeze({ code: "RESOURCE_NOT_FOUND" as const }),
          });
        }
        return Object.freeze({
          ok: true as const,
          value:
            request.type === "resource.get"
              ? (snapshot as unknown as ResourceSnapshot)
              : (Object.freeze({
                  resource: snapshot,
                  children: Object.freeze([]),
                }) as unknown as ResourceTreeViewSnapshot),
        });
      },
    });
    const result = await composeExtensia({
      register(registry) {
        registry.bindValue(CORE_RESOURCE_READ_PORT, port);
        registry.bindValue(READ_MODEL_CONTROL_PORT, STATIC_READ_MODEL_CONTROL);
        registry.use(DEFAULT_API_SYSTEM_EXTENSION_MODULE);
        registry.use(DEFAULT_API_FACADE_REGISTRY_MODULE);
      },
      exports: FACADE_EXPORTS,
    });
    assertComposed(result);
    const lifecycle = registryLifecycle(result);

    expect(result.composition.capabilities.access.get(QUERY_FACADE)).toBeNull();
    await lifecycle.start();
    expect(result.composition.capabilities.access.inspect()).toEqual({
      phase: "frozen",
      ready: false,
      facades: [],
      diagnostics: [],
    });
    lifecycle.publishReady?.();
    const query = result.composition.capabilities.access.get(QUERY_FACADE);
    const storage = result.composition.capabilities.access.get(STORAGE_FACADE);
    expect(query).not.toBeNull();
    expect(storage).not.toBeNull();
    if (query === null || storage === null) throw new Error("Missing facades");

    await expect(query.getResource(RESOURCE_ID.toUpperCase())).resolves.toEqual(
      {
        ok: true,
        value: snapshot,
      },
    );
    await expect(query.getResource(MISSING_ID)).resolves.toEqual({
      ok: false,
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource was not found",
      },
    });
    await expect(query.getResource("not-a-resource-id")).resolves.toEqual({
      ok: false,
      error: {
        code: "INVALID_RESOURCE_ID",
        message: "Resource ID is invalid",
      },
    });
    expect(requests).toHaveLength(2);

    let inputInspected = false;
    const opaqueInput = Object.defineProperty({}, "secret", {
      get() {
        inputInspected = true;
        throw new Error("must not inspect readonly input");
      },
    });
    await expect(storage.createResource(opaqueInput)).resolves.toEqual({
      ok: false,
      error: {
        code: "STORAGE_READONLY",
        message: "Resource storage is readonly in this runtime",
      },
    });
    expect(inputInspected).toBe(false);

    lifecycle.unpublishReady?.();
    expect(result.composition.capabilities.access.get(QUERY_FACADE)).toBeNull();
    await expect(query.getResource(RESOURCE_ID)).resolves.toMatchObject({
      ok: false,
      error: { code: "MODULE_NOT_READY" },
    });
    await expect(storage.createResource(opaqueInput)).resolves.toMatchObject({
      ok: false,
      error: { code: "MODULE_NOT_READY" },
    });
    expect(requests).toHaveLength(2);
    await lifecycle.stop();
    await result.composition.dispose();
  });

  it("closes intake and drains admitted reads before disposal", async () => {
    let resolveRead: ((value: ResourceSnapshot) => void) | undefined;
    const readValue = new Promise<ResourceSnapshot>((resolve) => {
      resolveRead = resolve;
    });
    const port: CoreResourceReadPort = Object.freeze({
      async read(request) {
        const value = await readValue;
        return request.type === "resource.get"
          ? { ok: true as const, value }
          : {
              ok: true as const,
              value: { resource: value, children: [] },
            };
      },
    });
    const result = await composeExtensia({
      register(registry) {
        registry.bindValue(CORE_RESOURCE_READ_PORT, port);
        registry.bindValue(READ_MODEL_CONTROL_PORT, STATIC_READ_MODEL_CONTROL);
        registry.use(DEFAULT_API_SYSTEM_EXTENSION_MODULE);
        registry.use(DEFAULT_API_FACADE_REGISTRY_MODULE);
      },
      exports: FACADE_EXPORTS,
    });
    assertComposed(result);
    const lifecycle = registryLifecycle(result);
    await lifecycle.start();
    lifecycle.publishReady?.();
    const query = result.composition.capabilities.access.get(QUERY_FACADE);
    if (query === null) throw new Error("Missing query facade");

    const admitted = query.getResource(RESOURCE_ID);
    lifecycle.unpublishReady?.();
    let stopSettled = false;
    const stopping = lifecycle.stop().then(() => {
      stopSettled = true;
    });
    await Promise.resolve();
    expect(stopSettled).toBe(false);
    resolveRead?.(Object.freeze({}) as ResourceSnapshot);
    await expect(admitted).resolves.toMatchObject({ ok: true });
    await stopping;
    expect(stopSettled).toBe(true);
    await result.composition.dispose();
  });
});
