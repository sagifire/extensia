import {
  createComposer,
  type Composer,
  type ComposerAdapterFactory,
  type ComposerAdapterSource,
  type ComposedRuntime,
  type ModuleDefinition,
  type Scope,
  type Token,
} from "@sagifire/ioc";

import {
  normalizeCompositionError,
  normalizeCompositionReport,
  type SafeCompositionFailure,
} from "./diagnostics.js";
import {
  createSafeCompositionInspection,
  type SafeCompositionInspection,
} from "./inspection.js";

export type ExtensiaCapabilityAccess = "single" | "multi";

export interface ExtensiaCapabilityExport<
  TValue,
  TAccess extends ExtensiaCapabilityAccess = ExtensiaCapabilityAccess,
> {
  readonly token: Token<TValue>;
  readonly access: TAccess;
}

export type ExtensiaCapabilityExports = Readonly<
  Record<string, ExtensiaCapabilityExport<unknown>>
>;

type ExportedCapabilityValue<TExport> =
  TExport extends ExtensiaCapabilityExport<infer TValue, infer TAccess>
    ? TAccess extends "multi"
      ? readonly TValue[]
      : TValue
    : never;

export type ExtensiaCapabilities<TExports extends ExtensiaCapabilityExports> =
  Readonly<{
    [TKey in keyof TExports]: ExportedCapabilityValue<TExports[TKey]>;
  }>;

export interface ExtensiaCompositionRegistry {
  use(moduleDefinition: ModuleDefinition): void;
  bindValue<TValue>(token: Token<TValue>, value: TValue): void;
  addValue<TValue>(token: Token<TValue>, value: TValue): void;
  adapt<TValue, const TSource extends ComposerAdapterSource>(
    target: Token<TValue>,
    source: TSource,
    factory: ComposerAdapterFactory<TSource, TValue>,
  ): void;
}

export interface ExtensiaCompositionSpec<
  TExports extends ExtensiaCapabilityExports,
> {
  readonly register: (registry: ExtensiaCompositionRegistry) => undefined;
  readonly exports: TExports;
}

export interface ExtensiaScopeValue<TValue = unknown> {
  readonly token: Token<TValue>;
  readonly value: TValue;
}

export interface ExtensiaScopeOptions {
  readonly values?: readonly ExtensiaScopeValue[];
  readonly multiValues?: readonly ExtensiaScopeValue[];
}

export interface ExtensiaComposition<
  TExports extends ExtensiaCapabilityExports,
> {
  readonly capabilities: ExtensiaCapabilities<TExports>;
  readonly inspection: SafeCompositionInspection;
  withScope<TScopedExports extends ExtensiaCapabilityExports, TResult>(
    exports: TScopedExports,
    callback: (
      capabilities: ExtensiaCapabilities<TScopedExports>,
    ) => TResult | Promise<TResult>,
    options?: ExtensiaScopeOptions,
  ): Promise<TResult>;
  dispose(): Promise<void>;
}

export type ExtensiaCompositionResult<
  TExports extends ExtensiaCapabilityExports,
> =
  | {
      readonly ok: true;
      readonly composition: ExtensiaComposition<TExports>;
    }
  | {
      readonly ok: false;
      readonly failure: SafeCompositionFailure;
    };

interface CapabilityReader {
  get<TValue>(token: Token<TValue>): TValue;
  getAll<TValue>(token: Token<TValue>): TValue[];
}

interface CompositionRegistryLease {
  readonly registry: ExtensiaCompositionRegistry;
  close(): void;
}

export function scopeValue<TValue>(
  token: Token<TValue>,
  value: TValue,
): ExtensiaScopeValue<TValue> {
  return Object.freeze({ token, value });
}

export function singleCapability<TValue>(
  token: Token<TValue>,
): ExtensiaCapabilityExport<TValue, "single"> {
  return Object.freeze({ token, access: "single" });
}

export function multiCapability<TValue>(
  token: Token<TValue>,
): ExtensiaCapabilityExport<TValue, "multi"> {
  return Object.freeze({ token, access: "multi" });
}

function createRegistry(composer: Composer): CompositionRegistryLease {
  let open = true;
  function assertOpen(): void {
    if (!open) {
      throw new Error("Extensia composition registration is closed");
    }
  }

  const registry: ExtensiaCompositionRegistry = Object.freeze({
    use(moduleDefinition: ModuleDefinition): void {
      assertOpen();
      composer.use(moduleDefinition);
    },
    bindValue<TValue>(token: Token<TValue>, value: TValue): void {
      assertOpen();
      composer.bind(token).toValue(value);
    },
    addValue<TValue>(token: Token<TValue>, value: TValue): void {
      assertOpen();
      composer.add(token).toValue(value);
    },
    adapt<TValue, const TSource extends ComposerAdapterSource>(
      target: Token<TValue>,
      source: TSource,
      factory: ComposerAdapterFactory<TSource, TValue>,
    ): void {
      assertOpen();
      composer.adapt(target).from(source).using(factory);
    },
  });

  return Object.freeze({
    registry,
    close(): void {
      open = false;
    },
  });
}

function readCapabilities<TExports extends ExtensiaCapabilityExports>(
  reader: CapabilityReader,
  exports: TExports,
): ExtensiaCapabilities<TExports> {
  const capabilities: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;

  for (const key of Object.keys(exports)) {
    const capabilityExport = exports[key];
    if (capabilityExport === undefined) continue;

    capabilities[key] =
      capabilityExport.access === "multi"
        ? Object.freeze(reader.getAll(capabilityExport.token))
        : reader.get(capabilityExport.token);
  }

  return Object.freeze(capabilities) as ExtensiaCapabilities<TExports>;
}

async function disposeQuietly(runtime: ComposedRuntime): Promise<void> {
  try {
    await runtime.dispose();
  } catch {
    // The original composition failure remains authoritative and safe.
  }
}

function successfulResult<TExports extends ExtensiaCapabilityExports>(
  composition: ExtensiaComposition<TExports>,
): ExtensiaCompositionResult<TExports> {
  return Object.freeze({ ok: true, composition });
}

function failedResult<TExports extends ExtensiaCapabilityExports>(
  failure: SafeCompositionFailure,
): ExtensiaCompositionResult<TExports> {
  return Object.freeze({ ok: false, failure });
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    ((typeof value === "object" && value !== null) ||
      typeof value === "function") &&
    typeof (value as { readonly then?: unknown }).then === "function"
  );
}

export async function composeExtensia<
  const TExports extends ExtensiaCapabilityExports,
>(
  spec: ExtensiaCompositionSpec<TExports>,
): Promise<ExtensiaCompositionResult<TExports>> {
  const composer = createComposer();
  const registryLease = createRegistry(composer);

  try {
    const registrationResult: unknown = spec.register(registryLease.registry);
    if (registrationResult !== undefined) {
      if (isPromiseLike(registrationResult)) {
        void Promise.resolve(registrationResult).catch(() => undefined);
      }
      throw new TypeError(
        "Extensia composition registration must complete synchronously",
      );
    }
  } catch (error) {
    return failedResult(normalizeCompositionError(error, "registration"));
  } finally {
    registryLease.close();
  }

  let validation;
  try {
    validation = composer.validate();
  } catch (error) {
    return failedResult(normalizeCompositionError(error, "validation"));
  }
  if (!validation.ok) {
    return failedResult(normalizeCompositionReport(validation));
  }

  let runtime: ComposedRuntime;
  try {
    runtime = await composer.compose();
  } catch (error) {
    return failedResult(normalizeCompositionError(error, "compose"));
  }

  let capabilities: ExtensiaCapabilities<TExports>;
  try {
    capabilities = readCapabilities(runtime, spec.exports);
  } catch (error) {
    await disposeQuietly(runtime);
    return failedResult(normalizeCompositionError(error, "capability-export"));
  }

  let inspection: SafeCompositionInspection;
  try {
    inspection = createSafeCompositionInspection(runtime.inspect());
  } catch (error) {
    await disposeQuietly(runtime);
    return failedResult(normalizeCompositionError(error, "inspection"));
  }

  let disposed = false;
  const composition: ExtensiaComposition<TExports> = Object.freeze({
    capabilities,
    inspection,
    async withScope<TScopedExports extends ExtensiaCapabilityExports, TResult>(
      exports: TScopedExports,
      callback: (
        scopedCapabilities: ExtensiaCapabilities<TScopedExports>,
      ) => TResult | Promise<TResult>,
      options?: ExtensiaScopeOptions,
    ): Promise<TResult> {
      if (disposed) {
        throw new Error("Extensia composition has been disposed");
      }

      const scope: Scope = runtime.createScope(
        options === undefined
          ? undefined
          : {
              ...(options.values === undefined
                ? {}
                : { values: options.values }),
              ...(options.multiValues === undefined
                ? {}
                : { multiValues: options.multiValues }),
            },
      );
      try {
        return await callback(readCapabilities(scope, exports));
      } finally {
        await scope.dispose();
      }
    },
    async dispose(): Promise<void> {
      if (disposed) return;
      disposed = true;
      await runtime.dispose();
    },
  });

  return successfulResult(composition);
}
