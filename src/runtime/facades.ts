import type { ContributionToken, Token } from "@sagifire/ioc";

import {
  createExtensiaInternalNamespace,
  synchronousContributionToken,
} from "../composition/tokens.js";
import {
  lifecycleContribution,
  type LifecycleContribution,
} from "./lifecycle.js";

const FACADE_NAME_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const MAX_FACADE_NAME_LENGTH = 128;
const DEFAULT_API_OWNER = "extensia.default-api";
const RESERVED_FACADE_NAMES = new Set(["query", "storage"]);
const facadeTokens = createExtensiaInternalNamespace("runtime.facades");

declare const facadeHandleBrand: unique symbol;

export interface FacadeHandle<TFacade> {
  readonly name: string;
  readonly [facadeHandleBrand]?: TFacade;
}

export interface FacadeOperationLease {
  release(): void;
}

export interface FacadeOperationGate {
  acquire(): FacadeOperationLease | null;
}

export interface FacadeDependencyAccess {
  get<TFacade>(handle: FacadeHandle<TFacade>): TFacade;
}

export interface FacadeFactoryContext {
  readonly dependencies: FacadeDependencyAccess;
  readonly operations: FacadeOperationGate;
  failClose(
    code?:
      | "RESOURCE_STORAGE_INTEGRITY"
      | "RESOURCE_INDEX_INTEGRITY"
      | "ASSET_STORAGE_INTEGRITY",
    operationId?: string,
  ): void;
}

export interface FacadeProvider<TFacade = unknown> {
  readonly handle: FacadeHandle<TFacade>;
  readonly owner: string;
  readonly dependencies: readonly FacadeHandle<unknown>[];
  create(context: FacadeFactoryContext): TFacade | Promise<TFacade>;
  dispose?(facade: TFacade): void | Promise<void>;
}

export type FacadeRegistryPhase =
  "created" | "registering" | "frozen" | "disposed";

export type FacadeRegistryDiagnosticCode =
  | "FACADE_NAME_INVALID"
  | "FACADE_OWNER_INVALID"
  | "FACADE_RESERVED"
  | "FACADE_DUPLICATE"
  | "FACADE_DEPENDENCY_INVALID"
  | "FACADE_DEPENDENCY_MISSING"
  | "FACADE_DEPENDENCY_CYCLE"
  | "FACADE_CREATE_FAILED"
  | "FACADE_DISPOSE_FAILED"
  | "FACADE_RUNTIME_FAILED"
  | "RESOURCE_STORAGE_INTEGRITY"
  | "RESOURCE_INDEX_INTEGRITY"
  | "ASSET_STORAGE_INTEGRITY"
  | "FACADE_PHASE_INVALID";

export interface FacadeRegistryDiagnostic {
  readonly code: FacadeRegistryDiagnosticCode;
  readonly subject?: string;
}

export interface FacadeRegistryInspection {
  readonly phase: FacadeRegistryPhase;
  readonly ready: boolean;
  readonly facades: readonly string[];
  readonly diagnostics: readonly FacadeRegistryDiagnostic[];
}

export interface FacadeRegistryAccess {
  get<TFacade>(handle: FacadeHandle<TFacade>): TFacade | null;
  inspect(): FacadeRegistryInspection;
}

interface ProviderEnvelope {
  readonly provider: FacadeProvider;
  readonly provenance: "custom" | "system";
}

interface CreatedFacade {
  readonly provider: FacadeProvider;
  readonly value: unknown;
}

interface FrozenFacadeSurface {
  readonly byName: ReadonlyMap<string, CreatedFacade>;
  readonly names: readonly string[];
}

interface OperationGateController extends FacadeOperationGate {
  open(): void;
  close(): void;
  waitForDrain(): Promise<void>;
}

export interface FacadeRuntime {
  readonly access: FacadeRegistryAccess;
  readonly lifecycle: LifecycleContribution;
}

export interface FacadeRuntimeFaultBoundary {
  report(
    fault:
      | {
          readonly kind: "integrity";
          readonly code:
            | "RESOURCE_STORAGE_INTEGRITY"
            | "RESOURCE_INDEX_INTEGRITY"
            | "ASSET_STORAGE_INTEGRITY";
          readonly operation_id?: string;
        }
      | {
          readonly kind: "fatal-runtime";
          readonly code: "READ_MODEL_RUNTIME_FAILED";
        },
  ): void;
  subscribe(
    handler: (
      fault:
        | {
            readonly kind: "integrity";
            readonly code:
              | "RESOURCE_STORAGE_INTEGRITY"
              | "RESOURCE_INDEX_INTEGRITY"
              | "ASSET_STORAGE_INTEGRITY";
            readonly operation_id?: string;
          }
        | {
            readonly kind: "fatal-runtime";
            readonly code: "READ_MODEL_RUNTIME_FAILED";
          },
    ) => void,
  ): () => void;
}

export const FACADE_PROVIDER_CONTRIBUTIONS: ContributionToken<FacadeProvider> =
  synchronousContributionToken<FacadeProvider>(facadeTokens, "providers");

export const FACADE_REGISTRY_ACCESS: Token<FacadeRegistryAccess> =
  facadeTokens.token<FacadeRegistryAccess>("access");

export function facadeHandle<TFacade>(name: string): FacadeHandle<TFacade> {
  return Object.freeze({ name });
}

export function facadeProvider<TFacade>(
  provider: FacadeProvider<TFacade>,
): FacadeProvider<TFacade> {
  return Object.freeze({
    handle: provider.handle,
    owner: provider.owner,
    dependencies: Object.freeze([...provider.dependencies]),
    create: provider.create,
    ...(provider.dispose === undefined ? {} : { dispose: provider.dispose }),
  });
}

function isCanonicalName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= MAX_FACADE_NAME_LENGTH &&
    FACADE_NAME_PATTERN.test(value)
  );
}

function diagnostic(
  code: FacadeRegistryDiagnosticCode,
  subject?: string,
): FacadeRegistryDiagnostic {
  return Object.freeze({
    code,
    ...(subject === undefined ? {} : { subject }),
  });
}

function snapshotProvider(provider: FacadeProvider): FacadeProvider {
  return Object.freeze({
    handle: provider.handle,
    owner: provider.owner,
    dependencies: Object.freeze([...provider.dependencies]),
    create: provider.create,
    ...(provider.dispose === undefined ? {} : { dispose: provider.dispose }),
  });
}

function createOperationGate(): OperationGateController {
  let open = false;
  let active = 0;
  const drainWaiters: Array<() => void> = [];

  function resolveDrain(): void {
    if (active !== 0) return;
    for (const resolve of drainWaiters.splice(0)) resolve();
  }

  return Object.freeze({
    acquire(): FacadeOperationLease | null {
      if (!open) return null;
      active += 1;
      let released = false;
      return Object.freeze({
        release(): void {
          if (released) return;
          released = true;
          active -= 1;
          resolveDrain();
        },
      });
    },
    open(): void {
      open = true;
    },
    close(): void {
      open = false;
      resolveDrain();
    },
    waitForDrain(): Promise<void> {
      if (active === 0) return Promise.resolve();
      return new Promise<void>((resolve) => drainWaiters.push(resolve));
    },
  });
}

function validateAndOrderProviders(
  envelopes: readonly ProviderEnvelope[],
  record: (entry: FacadeRegistryDiagnostic) => void,
): readonly ProviderEnvelope[] {
  const byName = new Map<string, ProviderEnvelope>();
  let invalid = false;

  for (const envelope of envelopes) {
    const { provider, provenance } = envelope;
    const name = provider.handle?.name;
    const safeName = isCanonicalName(name);
    const safeSubject = safeName ? name : undefined;

    if (!safeName) {
      record(diagnostic("FACADE_NAME_INVALID"));
      invalid = true;
    }
    if (
      safeName &&
      RESERVED_FACADE_NAMES.has(name) &&
      !(provenance === "system" && provider.owner === DEFAULT_API_OWNER)
    ) {
      record(diagnostic("FACADE_RESERVED", name));
      invalid = true;
    }
    if (!isCanonicalName(provider.owner)) {
      record(diagnostic("FACADE_OWNER_INVALID", safeSubject));
      invalid = true;
    }
    if (provenance === "system" && provider.owner !== DEFAULT_API_OWNER) {
      record(diagnostic("FACADE_OWNER_INVALID", safeSubject));
      invalid = true;
    }

    const dependencyNames = new Set<string>();
    for (const dependency of provider.dependencies) {
      const dependencyName = dependency?.name;
      if (
        !isCanonicalName(dependencyName) ||
        dependencyNames.has(dependencyName)
      ) {
        record(diagnostic("FACADE_DEPENDENCY_INVALID", safeSubject));
        invalid = true;
      } else {
        dependencyNames.add(dependencyName);
      }
    }

    if (safeName) {
      if (byName.has(name)) {
        record(diagnostic("FACADE_DUPLICATE", name));
        invalid = true;
      } else {
        byName.set(name, envelope);
      }
    }
  }

  for (const [name, envelope] of byName) {
    for (const dependency of envelope.provider.dependencies) {
      if (!byName.has(dependency.name)) {
        record(diagnostic("FACADE_DEPENDENCY_MISSING", name));
        invalid = true;
      }
    }
  }

  if (invalid) throw new Error("Facade provider validation failed");

  const remaining = new Map(byName);
  const ordered: ProviderEnvelope[] = [];
  const resolved = new Set<string>();

  while (remaining.size > 0) {
    const ready = [...remaining.entries()]
      .filter(([, envelope]) =>
        envelope.provider.dependencies.every((item) => resolved.has(item.name)),
      )
      .sort(([left], [right]) => left.localeCompare(right));

    if (ready.length === 0) {
      for (const name of [...remaining.keys()].sort()) {
        record(diagnostic("FACADE_DEPENDENCY_CYCLE", name));
      }
      throw new Error("Facade provider dependency cycle");
    }

    for (const [name, envelope] of ready) {
      ordered.push(envelope);
      resolved.add(name);
      remaining.delete(name);
    }
  }

  return Object.freeze(ordered);
}

export function createFacadeRuntime(
  systemProviders: readonly FacadeProvider[],
  customProviders: readonly FacadeProvider[],
  faultBoundary?: FacadeRuntimeFaultBoundary,
): FacadeRuntime {
  const envelopes: readonly ProviderEnvelope[] = Object.freeze([
    ...systemProviders.map((provider) =>
      Object.freeze({
        provider: snapshotProvider(provider),
        provenance: "system" as const,
      }),
    ),
    ...customProviders.map((provider) =>
      Object.freeze({
        provider: snapshotProvider(provider),
        provenance: "custom" as const,
      }),
    ),
  ]);
  const gate = createOperationGate();
  const diagnostics: FacadeRegistryDiagnostic[] = [];
  const created: CreatedFacade[] = [];
  let phase: FacadeRegistryPhase = "created";
  let frozenSurface: FrozenFacadeSurface | null = null;
  let publishedSurface: FrozenFacadeSurface | null = null;

  function record(entry: FacadeRegistryDiagnostic): void {
    diagnostics.push(entry);
  }

  function failCloseRuntime(
    code: FacadeRegistryDiagnosticCode = "FACADE_RUNTIME_FAILED",
    subject?: string,
  ): void {
    gate.close();
    publishedSurface = null;
    record(diagnostic(code, subject));
  }

  const unsubscribeFaultBoundary =
    faultBoundary?.subscribe((fault) => {
      if (fault.kind === "fatal-runtime") {
        failCloseRuntime("FACADE_RUNTIME_FAILED");
      } else {
        failCloseRuntime(fault.code, fault.operation_id);
      }
    }) ?? (() => undefined);

  async function disposeCreated(): Promise<boolean> {
    let failed = false;
    for (let index = created.length - 1; index >= 0; index -= 1) {
      const entry = created[index];
      if (entry === undefined || entry.provider.dispose === undefined) continue;
      try {
        await entry.provider.dispose(entry.value);
      } catch {
        failed = true;
        const name = entry.provider.handle.name;
        record(
          diagnostic(
            "FACADE_DISPOSE_FAILED",
            isCanonicalName(name) ? name : undefined,
          ),
        );
      }
    }
    created.splice(0);
    return failed;
  }

  const access: FacadeRegistryAccess = Object.freeze({
    get<TFacade>(handle: FacadeHandle<TFacade>): TFacade | null {
      const entry = publishedSurface?.byName.get(handle.name);
      return entry !== undefined && entry.provider.handle === handle
        ? (entry.value as TFacade)
        : null;
    },
    inspect(): FacadeRegistryInspection {
      return Object.freeze({
        phase,
        ready: publishedSurface !== null,
        facades:
          publishedSurface === null
            ? Object.freeze([])
            : Object.freeze([...publishedSurface.names]),
        diagnostics: Object.freeze([...diagnostics]),
      });
    },
  });

  const lifecycle = lifecycleContribution({
    id: "runtime.facades",
    order: 90,
    async start(): Promise<void> {
      if (phase !== "created") {
        record(diagnostic("FACADE_PHASE_INVALID"));
        throw new Error("Facade Registry cannot restart");
      }

      phase = "registering";
      try {
        const ordered = validateAndOrderProviders(envelopes, record);
        const byName = new Map<string, CreatedFacade>();

        for (const envelope of ordered) {
          const { provider } = envelope;
          const dependencyValues = new Map<FacadeHandle<unknown>, unknown>();
          for (const dependency of provider.dependencies) {
            const dependencyEntry = byName.get(dependency.name);
            if (dependencyEntry === undefined) {
              throw new Error("Validated facade dependency is unavailable");
            }
            dependencyValues.set(dependency, dependencyEntry.value);
          }

          const context: FacadeFactoryContext = Object.freeze({
            dependencies: Object.freeze({
              get<TFacade>(handle: FacadeHandle<TFacade>): TFacade {
                if (!dependencyValues.has(handle)) {
                  throw new Error("Undeclared facade dependency access");
                }
                return dependencyValues.get(handle) as TFacade;
              },
            }),
            operations: gate,
            failClose(
              code?:
                | "RESOURCE_STORAGE_INTEGRITY"
                | "RESOURCE_INDEX_INTEGRITY"
                | "ASSET_STORAGE_INTEGRITY",
              operationId?: string,
            ): void {
              if (faultBoundary === undefined) {
                failCloseRuntime(code ?? "FACADE_RUNTIME_FAILED", operationId);
                return;
              }
              if (code === undefined) {
                faultBoundary.report({
                  code: "READ_MODEL_RUNTIME_FAILED",
                  kind: "fatal-runtime",
                });
                return;
              }
              faultBoundary.report({
                code,
                kind: "integrity",
                ...(operationId === undefined
                  ? {}
                  : { operation_id: operationId }),
              });
            },
          });

          let value: unknown;
          try {
            value = await provider.create(context);
          } catch {
            record(diagnostic("FACADE_CREATE_FAILED", provider.handle.name));
            throw new Error("Facade provider creation failed");
          }
          if (
            (typeof value !== "object" || value === null) &&
            typeof value !== "function"
          ) {
            record(diagnostic("FACADE_CREATE_FAILED", provider.handle.name));
            throw new Error("Facade provider returned an invalid facade");
          }

          const entry = Object.freeze({ provider, value });
          created.push(entry);
          byName.set(provider.handle.name, entry);
        }

        frozenSurface = Object.freeze({
          byName,
          names: Object.freeze([...byName.keys()].sort()),
        });
        phase = "frozen";
      } catch {
        gate.close();
        await disposeCreated();
        frozenSurface = null;
        phase = "disposed";
        unsubscribeFaultBoundary();
        throw new Error("Facade Registry startup failed");
      }
    },
    publishReady(): void {
      if (phase !== "frozen" || frozenSurface === null) {
        record(diagnostic("FACADE_PHASE_INVALID"));
        throw new Error("Facade Registry is not frozen");
      }
      publishedSurface = frozenSurface;
      gate.open();
    },
    unpublishReady(): void {
      gate.close();
      publishedSurface = null;
    },
    async stop(): Promise<void> {
      gate.close();
      publishedSurface = null;
      await gate.waitForDrain();
      const disposeFailed = await disposeCreated();
      frozenSurface = null;
      phase = "disposed";
      unsubscribeFaultBoundary();
      if (disposeFailed) throw new Error("Facade disposal failed");
    },
  });

  return Object.freeze({ access, lifecycle });
}
