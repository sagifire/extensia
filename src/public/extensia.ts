import {
  composeExtensia,
  multiCapability,
  singleCapability,
} from "../composition/root.js";
import {
  READONLY_RESOURCE_CORE_MODULE,
  READONLY_RESOURCE_DRIVER,
} from "../core/resource-read-runtime.js";
import {
  FULL_RESOURCE_CORE_MODULE,
  FULL_RESOURCE_DRIVER,
} from "../core/resource-write-runtime.js";
import type { FacadeRegistryAccess } from "../runtime/facades.js";
import {
  createRuntimeLifecycleHost,
  LIFECYCLE_CONTRIBUTIONS,
  type LifecycleFailureEntry,
  type RuntimeLifecycleHost,
} from "../runtime/lifecycle.js";
import {
  DEFAULT_API_FACADE_REGISTRY_MODULE,
  DEFAULT_API_SYSTEM_EXTENSION_MODULE,
  FULL_DEFAULT_API_SYSTEM_EXTENSION_MODULE,
  QUERY_FACADE,
  STORAGE_FACADE,
} from "../system-extensions/default-api/facades.js";
import { resolveFullResourceDriver } from "./full-resource-driver.js";
import { FACADE_REGISTRY_ACCESS } from "../runtime/facades.js";
import type {
  ExtensiaConfig,
  ExtensiaError,
  ExtensiaErrorCode,
  ExtensiaInspection,
  ExtensiaModule,
  ExtensiaModuleState,
  ExtensiaResult,
  FullResourceDriver,
  QueryFacade,
  ReadonlyResourceDriver,
  SafeDiagnostic,
  StorageFacade,
} from "./contracts.js";

const INVALID_CONFIG = Symbol("invalid Extensia config");

interface NormalizedConfig {
  readonly storage: {
    readonly driver: ReadonlyResourceDriver | FullResourceDriver;
  };
}

interface PublicRuntime {
  readonly host: RuntimeLifecycleHost;
  readonly facades: FacadeRegistryAccess;
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ownDataValue(
  value: object,
  key: PropertyKey,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor !== undefined && "value" in descriptor
    ? Object.freeze({ ok: true, value: descriptor.value })
    : Object.freeze({ ok: false });
}

function dataValue(
  value: object,
  key: PropertyKey,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  const visited = new Set<object>();
  let current: object | null = value;

  while (current !== null && !visited.has(current)) {
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor !== undefined) {
      return "value" in descriptor
        ? Object.freeze({ ok: true, value: descriptor.value })
        : Object.freeze({ ok: false });
    }
    current = Object.getPrototypeOf(current);
  }

  return Object.freeze({ ok: false });
}

function normalizeConfig(
  input: unknown,
): NormalizedConfig | typeof INVALID_CONFIG {
  try {
    if (!isObject(input)) return INVALID_CONFIG;
    const storageProperty = ownDataValue(input, "storage");
    if (!storageProperty.ok || !isObject(storageProperty.value)) {
      return INVALID_CONFIG;
    }

    const driverProperty = ownDataValue(storageProperty.value, "driver");
    if (!driverProperty.ok || !isObject(driverProperty.value)) {
      return INVALID_CONFIG;
    }

    return Object.freeze({
      storage: Object.freeze({
        driver: driverProperty.value as
          ReadonlyResourceDriver | FullResourceDriver,
      }),
    });
  } catch {
    return INVALID_CONFIG;
  }
}

function hasValidReadonlyDriverShape(driver: ReadonlyResourceDriver): boolean {
  try {
    const mode = dataValue(driver, "mode");
    const open = dataValue(driver, "open");
    const close = dataValue(driver, "close");
    const listResources = dataValue(driver, "listResources");
    return (
      mode.ok &&
      mode.value === "readonly" &&
      open.ok &&
      typeof open.value === "function" &&
      close.ok &&
      typeof close.value === "function" &&
      listResources.ok &&
      typeof listResources.value === "function"
    );
  } catch {
    return false;
  }
}

function messageFor(code: ExtensiaErrorCode): string {
  switch (code) {
    case "CONFIG_INVALID":
      return "Extensia configuration is invalid";
    case "MODULE_BUSY":
      return "Extensia lifecycle transition is already in progress";
    case "MODULE_INVALID_STATE":
      return "Extensia cannot start from its current state";
    case "START_FAILED":
      return "Extensia failed to start";
    case "STOP_FAILED":
      return "Extensia stopped with cleanup failures";
    case "MODULE_NOT_READY":
      return "Extensia is not ready";
    case "INVALID_RESOURCE_ID":
      return "Resource ID is invalid";
    case "RESOURCE_NOT_FOUND":
      return "Resource was not found";
    case "STORAGE_READONLY":
      return "Resource storage is readonly in this runtime";
    case "RESOURCE_INPUT_INVALID":
      return "Resource input is invalid";
    case "RESOURCE_NO_CHANGES":
      return "Resource update has no changes";
    case "RESOURCE_ID_GENERATION_FAILED":
      return "Resource ID generation failed";
    case "STORAGE_LOCK_FAILED":
      return "Resource storage lock failed";
    case "STORAGE_WRITE_FAILED":
      return "Resource storage write failed";
    case "STORAGE_INTEGRITY_FAILED":
      return "Resource storage integrity failed";
    case "RESOURCE_PARENT_NOT_FOUND":
      return "Resource parent was not found";
    case "RESOURCE_MOVE_CYCLE":
      return "Resource move would create a cycle";
    case "RESOURCE_ORDER_OUT_OF_RANGE":
      return "Resource order is out of range";
  }
}

function failure<TCode extends ExtensiaErrorCode>(
  code: TCode,
): ExtensiaResult<never, ExtensiaError<TCode>> {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code, message: messageFor(code) }),
  });
}

function success(): { readonly ok: true; readonly value: void } {
  return Object.freeze({ ok: true, value: undefined });
}

function diagnostic(
  code: string,
  stage: SafeDiagnostic["stage"],
  subject?: string,
): SafeDiagnostic {
  return Object.freeze({
    code,
    stage,
    ...(subject === undefined ? {} : { subject }),
  });
}

function lifecycleDiagnostic(entry: LifecycleFailureEntry): SafeDiagnostic {
  const stage: SafeDiagnostic["stage"] =
    entry.stage === "publication"
      ? "facade"
      : entry.stage === "stop" || entry.stage === "dispose"
        ? "stop"
        : "start";
  return diagnostic(entry.code, stage, entry.contributionId);
}

async function composePublicRuntime(
  config: NormalizedConfig,
): Promise<
  | { readonly ok: true; readonly runtime: PublicRuntime }
  | { readonly ok: false; readonly diagnostics: readonly SafeDiagnostic[] }
> {
  const result = await composeExtensia({
    register(registry) {
      const driver = config.storage.driver;
      const full = resolveFullResourceDriver(driver as FullResourceDriver);
      if (full !== null) {
        registry.bindValue(FULL_RESOURCE_DRIVER, full);
        registry.use(FULL_RESOURCE_CORE_MODULE);
        registry.use(FULL_DEFAULT_API_SYSTEM_EXTENSION_MODULE);
      } else {
        registry.bindValue(
          READONLY_RESOURCE_DRIVER,
          driver as ReadonlyResourceDriver,
        );
        registry.use(READONLY_RESOURCE_CORE_MODULE);
        registry.use(DEFAULT_API_SYSTEM_EXTENSION_MODULE);
      }
      registry.use(DEFAULT_API_FACADE_REGISTRY_MODULE);
      return undefined;
    },
    exports: {
      lifecycle: multiCapability(LIFECYCLE_CONTRIBUTIONS),
      facades: singleCapability(FACADE_REGISTRY_ACCESS),
    },
  });

  if (!result.ok) {
    return Object.freeze({
      ok: false,
      diagnostics: Object.freeze([
        diagnostic(result.failure.code, "composition"),
        ...result.failure.diagnostics.map((entry) =>
          diagnostic(entry.code, "composition"),
        ),
      ]),
    });
  }

  return Object.freeze({
    ok: true,
    runtime: Object.freeze({
      facades: result.composition.capabilities.facades,
      host: createRuntimeLifecycleHost(result.composition),
    }),
  });
}

export function createExtensia(config: ExtensiaConfig): ExtensiaModule {
  const normalizedConfig = normalizeConfig(config);
  const moduleDiagnostics: SafeDiagnostic[] = [];
  let state: ExtensiaModuleState = "created";
  let runtime: PublicRuntime | null = null;
  let readyQuery: QueryFacade | null = null;
  let readyStorage: StorageFacade | null = null;

  async function start(): ReturnType<ExtensiaModule["start"]> {
    if (state === "started") return success();
    if (state === "starting" || state === "stopping") {
      return failure("MODULE_BUSY");
    }
    if (state === "stopped" || state === "failed") {
      return failure("MODULE_INVALID_STATE");
    }

    state = "starting";
    if (normalizedConfig === INVALID_CONFIG) {
      moduleDiagnostics.push(diagnostic("CONFIG_INVALID", "config"));
      state = "failed";
      return failure("CONFIG_INVALID");
    }
    const driver = normalizedConfig.storage.driver;
    const validDriver = (() => {
      try {
        return (
          resolveFullResourceDriver(driver as FullResourceDriver) !== null ||
          hasValidReadonlyDriverShape(driver as ReadonlyResourceDriver)
        );
      } catch {
        return false;
      }
    })();
    if (!validDriver) {
      moduleDiagnostics.push(diagnostic("CONFIG_INVALID", "config"));
      state = "failed";
      return failure("CONFIG_INVALID");
    }

    const compositionResult = await composePublicRuntime(normalizedConfig);
    if (!compositionResult.ok) {
      moduleDiagnostics.push(...compositionResult.diagnostics);
      state = "failed";
      return failure("START_FAILED");
    }

    runtime = compositionResult.runtime;
    const lifecycleResult = await runtime.host.start();
    if (!lifecycleResult.ok) {
      state = "failed";
      return failure("START_FAILED");
    }

    const query = runtime.facades.get(QUERY_FACADE);
    const storage = runtime.facades.get(STORAGE_FACADE);
    if (query === null || storage === null) {
      await runtime.host.stop();
      state = "failed";
      return failure("START_FAILED");
    }

    readyQuery = query;
    readyStorage = storage;
    state = "started";
    return success();
  }

  async function stop(): ReturnType<ExtensiaModule["stop"]> {
    if (state === "stopped") return success();
    if (state === "starting" || state === "stopping") {
      return failure("MODULE_BUSY");
    }
    if (state === "created") {
      state = "stopped";
      return success();
    }
    if (state === "failed") {
      if (runtime !== null) await runtime.host.stop();
      state = "stopped";
      return success();
    }

    state = "stopping";
    readyQuery = null;
    readyStorage = null;
    const result = await runtime!.host.stop();
    state = "stopped";
    return result.ok ? success() : failure("STOP_FAILED");
  }

  return Object.freeze({
    getState(): ExtensiaModuleState {
      reconcileRuntimeFault();
      return state;
    },
    start,
    stop,
    query(): QueryFacade | null {
      reconcileRuntimeFault();
      return state === "started" ? readyQuery : null;
    },
    storage(): StorageFacade | null {
      reconcileRuntimeFault();
      return state === "started" ? readyStorage : null;
    },
    inspect(): ExtensiaInspection {
      reconcileRuntimeFault();
      const ready = state === "started";
      const lifecycleDiagnostics =
        runtime?.host.inspect().diagnostics.map(lifecycleDiagnostic) ?? [];
      const facadeInspection = runtime?.facades.inspect();
      const facadeDiagnostics =
        facadeInspection?.diagnostics.map((entry) =>
          diagnostic(
            entry.code,
            entry.code === "RESOURCE_STORAGE_INTEGRITY" ||
              entry.code === "RESOURCE_INDEX_INTEGRITY"
              ? "operation"
              : "facade",
            entry.subject,
          ),
        ) ?? [];
      const facades = ready
        ? (facadeInspection?.facades.filter(
            (name): name is "query" | "storage" =>
              name === "query" || name === "storage",
          ) ?? [])
        : [];

      return Object.freeze({
        state,
        ready,
        facades: Object.freeze([...facades]),
        diagnostics: Object.freeze([
          ...moduleDiagnostics,
          ...lifecycleDiagnostics,
          ...facadeDiagnostics,
        ]),
      });
    },
  });

  function reconcileRuntimeFault(): void {
    if (state === "started" && runtime?.facades.inspect().ready === false) {
      readyQuery = null;
      readyStorage = null;
      state = "failed";
    }
  }
}
