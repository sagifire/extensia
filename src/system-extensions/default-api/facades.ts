import {
  defineModule,
  type ContributionToken,
  type Token,
} from "@sagifire/ioc";

import {
  createExtensiaInternalNamespace,
  synchronousContributionToken,
} from "../../composition/tokens.js";
import { parseIDString } from "../../domain/scalars.js";
import type {
  AssetCreateResult,
  AssetDeleteResult,
  AssetPrimaryResult,
  AssetReassignResult,
  AssetUpdateResult,
  ReadModelRefreshOptions,
  ReadModelRefreshResult,
} from "../../public/contracts.js";
import {
  CORE_ASSET_WRITE_PORT,
  type CoreAssetWriteFailureCode,
  type CoreAssetWritePort,
} from "./asset-write-port.js";
import {
  parseCreateAssetInput,
  parseUpdateAssetInput,
  type AssetInputFailureCode,
} from "./asset-input.js";
import {
  parseKVNamespace,
  parseMarks,
  validKVNamespace,
} from "../../domain/resource-aggregates.js";
import type {
  ResourceSnapshot,
  ResourceTreeViewSnapshot,
} from "../../domain/snapshots.js";
import {
  createFacadeRuntime,
  facadeHandle,
  facadeProvider,
  FACADE_PROVIDER_CONTRIBUTIONS,
  FACADE_REGISTRY_ACCESS,
  type FacadeFactoryContext,
  type FacadeProvider,
  type FacadeRuntime,
} from "../../runtime/facades.js";
import { LIFECYCLE_CONTRIBUTIONS } from "../../runtime/lifecycle.js";
import {
  CORE_RESOURCE_READ_PORT,
  type CoreResourceReadPort,
} from "./resource-read-port.js";
import {
  CORE_RESOURCE_WRITE_PORT,
  type CoreResourceWritePort,
  type CoreResourceWriteFailureCode,
} from "./resource-write-port.js";
import { RUNTIME_FAULT_SINK_CONTRIBUTIONS } from "../../core/runtime-fault-sink.js";
import {
  READ_MODEL_CONTROL_PORT,
  type ReadModelControlPort,
} from "../../core/read-model-runtime.js";

const defaultApiFacadeTokens = createExtensiaInternalNamespace(
  "system-extensions.default-api.facades",
);
const SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS: ContributionToken<FacadeProvider> =
  synchronousContributionToken<FacadeProvider>(
    defaultApiFacadeTokens,
    "system-providers",
  );
const FACADE_RUNTIME: Token<FacadeRuntime> =
  defaultApiFacadeTokens.token<FacadeRuntime>("runtime");

export type DefaultApiFailureCode =
  | "MODULE_NOT_READY"
  | "INVALID_RESOURCE_ID"
  | "RESOURCE_NOT_FOUND"
  | "STORAGE_READ_FAILED"
  | "READ_MODEL_REFRESH_UNAVAILABLE"
  | "READ_MODEL_REFRESH_OPTIONS_INVALID"
  | "READ_MODEL_REFRESH_CANCELED"
  | "READ_MODEL_REFRESH_EXHAUSTED"
  | "STORAGE_READONLY"
  | "INVALID_ASSET_ID"
  | "ASSET_URL_INVALID"
  | "ASSET_DATA_INVALID"
  | AssetInputFailureCode
  | CoreAssetWriteFailureCode
  | CoreResourceWriteFailureCode;

export interface DefaultApiFailure<
  TCode extends DefaultApiFailureCode = DefaultApiFailureCode,
> {
  readonly code: TCode;
  readonly message: string;
}

export type DefaultApiResult<
  TValue,
  TFailure extends DefaultApiFailure = DefaultApiFailure,
> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TFailure };

type ModuleNotReadyFailure = DefaultApiFailure<"MODULE_NOT_READY">;
type InvalidResourceIDFailure = DefaultApiFailure<"INVALID_RESOURCE_ID">;
type ResourceNotFoundFailure = DefaultApiFailure<"RESOURCE_NOT_FOUND">;
type StorageReadFailure = DefaultApiFailure<"STORAGE_READ_FAILED">;
type StorageIntegrityFailure = DefaultApiFailure<"STORAGE_INTEGRITY_FAILED">;
type StorageReadonlyFailure = DefaultApiFailure<"STORAGE_READONLY">;

export interface QueryFacade {
  getResource(
    id: string,
  ): Promise<
    DefaultApiResult<
      ResourceSnapshot,
      | ModuleNotReadyFailure
      | InvalidResourceIDFailure
      | ResourceNotFoundFailure
      | StorageReadFailure
      | StorageIntegrityFailure
    >
  >;
  getResourceTree(
    id: string,
  ): Promise<
    DefaultApiResult<
      ResourceTreeViewSnapshot,
      | ModuleNotReadyFailure
      | InvalidResourceIDFailure
      | ResourceNotFoundFailure
      | StorageReadFailure
      | StorageIntegrityFailure
    >
  >;
  refresh(options?: ReadModelRefreshOptions): Promise<ReadModelRefreshResult>;
}

export interface StorageFacade {
  createAsset(resourceId: string, input: unknown): Promise<AssetCreateResult>;
  updateAsset(
    resourceId: string,
    assetId: string,
    patch: unknown,
  ): Promise<AssetUpdateResult>;
  setPrimaryAsset(
    resourceId: string,
    assetId: string | null,
  ): Promise<AssetPrimaryResult>;
  reassignAsset(
    sourceResourceId: string,
    assetId: string,
    destinationResourceId: string,
  ): Promise<AssetReassignResult>;
  deleteAsset(resourceId: string, assetId: string): Promise<AssetDeleteResult>;
  createResource(
    input: unknown,
  ): Promise<
    DefaultApiResult<DefaultResourceWriteSuccess, CreateResourceFailure>
  >;
  updateResource(
    id: string,
    patch: unknown,
  ): Promise<
    DefaultApiResult<DefaultResourceWriteSuccess, UpdateResourceFailure>
  >;
  moveResource(
    id: string,
    input: unknown,
  ): Promise<
    DefaultApiResult<DefaultResourceWriteSuccess, MoveResourceFailure>
  >;
  deleteResource(
    id: string,
  ): Promise<
    DefaultApiResult<DefaultResourceWriteSuccess, DeleteResourceFailure>
  >;
  setMarks(
    resourceId: string,
    marks: unknown,
  ): Promise<
    DefaultApiResult<DefaultResourceWriteSuccess, AggregateResourceFailure>
  >;
  setKV(
    resourceId: string,
    namespace: unknown,
    values: unknown,
  ): Promise<
    DefaultApiResult<DefaultResourceWriteSuccess, AggregateResourceFailure>
  >;
}

interface DefaultResourceWriteSuccess {
  readonly committed: true;
  readonly operation_id: import("../../domain/scalars.js").IDString;
  readonly resource: ResourceSnapshot;
  readonly warnings: readonly {
    readonly code:
      "LOCAL_INDEX_PUBLICATION_FAILED" | "POST_COMMIT_CLEANUP_FAILED";
    readonly message: string;
  }[];
}

type CreateResourceFailure =
  | ModuleNotReadyFailure
  | StorageReadonlyFailure
  | DefaultApiFailure<"RESOURCE_INPUT_INVALID">
  | DefaultApiFailure<"RESOURCE_ID_GENERATION_FAILED">
  | DefaultApiFailure<"STORAGE_LOCK_FAILED">
  | DefaultApiFailure<"STORAGE_WRITE_FAILED">
  | DefaultApiFailure<"STORAGE_INTEGRITY_FAILED">;

type UpdateResourceFailure =
  | ModuleNotReadyFailure
  | InvalidResourceIDFailure
  | StorageReadonlyFailure
  | DefaultApiFailure<"RESOURCE_INPUT_INVALID">
  | ResourceNotFoundFailure
  | DefaultApiFailure<"RESOURCE_NO_CHANGES">
  | DefaultApiFailure<"STORAGE_LOCK_FAILED">
  | DefaultApiFailure<"STORAGE_WRITE_FAILED">
  | DefaultApiFailure<"STORAGE_INTEGRITY_FAILED">;

type MoveResourceFailure =
  | ModuleNotReadyFailure
  | InvalidResourceIDFailure
  | StorageReadonlyFailure
  | DefaultApiFailure<"RESOURCE_INPUT_INVALID">
  | ResourceNotFoundFailure
  | DefaultApiFailure<"RESOURCE_PARENT_NOT_FOUND">
  | DefaultApiFailure<"RESOURCE_MOVE_CYCLE">
  | DefaultApiFailure<"RESOURCE_ORDER_OUT_OF_RANGE">
  | DefaultApiFailure<"RESOURCE_NO_CHANGES">
  | DefaultApiFailure<"STORAGE_LOCK_FAILED">
  | DefaultApiFailure<"STORAGE_WRITE_FAILED">
  | DefaultApiFailure<"STORAGE_INTEGRITY_FAILED">;
type DeleteResourceFailure =
  | ModuleNotReadyFailure
  | InvalidResourceIDFailure
  | StorageReadonlyFailure
  | ResourceNotFoundFailure
  | DefaultApiFailure<"RESOURCE_HAS_CHILDREN">
  | DefaultApiFailure<"RESOURCE_ALREADY_DELETED">
  | DefaultApiFailure<"RESOURCE_ASSET_UPLOAD_ACTIVE">
  | DefaultApiFailure<"STORAGE_LOCK_FAILED">
  | DefaultApiFailure<"STORAGE_WRITE_FAILED">
  | DefaultApiFailure<"STORAGE_INTEGRITY_FAILED">;
type AggregateResourceFailure =
  | ModuleNotReadyFailure
  | InvalidResourceIDFailure
  | StorageReadonlyFailure
  | DefaultApiFailure<"RESOURCE_INPUT_INVALID">
  | ResourceNotFoundFailure
  | DefaultApiFailure<"RESOURCE_NO_CHANGES">
  | DefaultApiFailure<"STORAGE_LOCK_FAILED">
  | DefaultApiFailure<"STORAGE_WRITE_FAILED">
  | DefaultApiFailure<"STORAGE_INTEGRITY_FAILED">;

export const QUERY_FACADE: ReturnType<typeof facadeHandle<QueryFacade>> =
  facadeHandle<QueryFacade>("query");
export const STORAGE_FACADE: ReturnType<typeof facadeHandle<StorageFacade>> =
  facadeHandle<StorageFacade>("storage");

function failure<TCode extends DefaultApiFailureCode>(
  code: TCode,
  message: string,
): DefaultApiResult<never, DefaultApiFailure<TCode>> {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code, message }),
  });
}

function notReady(): DefaultApiResult<never, ModuleNotReadyFailure> {
  return failure("MODULE_NOT_READY", "Extensia is not ready");
}

function invalidResourceID(): DefaultApiResult<
  never,
  InvalidResourceIDFailure
> {
  return failure("INVALID_RESOURCE_ID", "Resource ID is invalid");
}

function createQueryFacade(
  port: CoreResourceReadPort,
  control: ReadModelControlPort,
  context: FacadeFactoryContext,
): QueryFacade {
  function readFailure(
    code:
      "RESOURCE_NOT_FOUND" | "STORAGE_READ_FAILED" | "STORAGE_INTEGRITY_FAILED",
  ) {
    if (code === "STORAGE_READ_FAILED") {
      return failure("STORAGE_READ_FAILED", "Resource storage read failed");
    }
    if (code === "STORAGE_INTEGRITY_FAILED") {
      return failure(
        "STORAGE_INTEGRITY_FAILED",
        "Resource storage integrity failed",
      );
    }
    return failure("RESOURCE_NOT_FOUND", "Resource was not found");
  }

  async function getResource(
    rawId: string,
  ): ReturnType<QueryFacade["getResource"]> {
    const lease = context.operations.acquire();
    if (lease === null) return notReady();

    try {
      let id;
      try {
        id = parseIDString(rawId);
      } catch {
        return invalidResourceID();
      }

      const result = await port.read({ type: "resource.get", id });
      return result.ok
        ? Object.freeze({ ok: true, value: result.value })
        : readFailure(result.error.code);
    } finally {
      lease.release();
    }
  }

  async function getResourceTree(
    rawId: string,
  ): ReturnType<QueryFacade["getResourceTree"]> {
    const lease = context.operations.acquire();
    if (lease === null) return notReady();

    try {
      let id;
      try {
        id = parseIDString(rawId);
      } catch {
        return invalidResourceID();
      }

      const result = await port.read({ type: "resource.tree.get", id });
      return result.ok
        ? Object.freeze({ ok: true, value: result.value })
        : readFailure(result.error.code);
    } finally {
      lease.release();
    }
  }

  async function refresh(
    options?: ReadModelRefreshOptions,
  ): Promise<ReadModelRefreshResult> {
    const lease = context.operations.acquire();
    if (lease === null) return notReady();
    try {
      if (!control.refreshSupported) {
        return failure(
          "READ_MODEL_REFRESH_UNAVAILABLE",
          "Read-model refresh is unavailable",
        );
      }
      const signal = parseRefreshOptions(options);
      if (signal === INVALID_REFRESH_OPTIONS) {
        return failure(
          "READ_MODEL_REFRESH_OPTIONS_INVALID",
          "Read-model refresh options are invalid",
        );
      }
      if (signal?.aborted === true) {
        return failure(
          "READ_MODEL_REFRESH_CANCELED",
          "Read-model refresh was canceled",
        );
      }
      const result = await control.refresh(signal);
      if (result.ok) {
        return Object.freeze({
          ok: true,
          value: Object.freeze({ changed: result.changed, observed: true }),
        });
      }
      if (result.code === "READ_MODEL_REFRESH_EXHAUSTED") {
        return Object.freeze({
          error: Object.freeze({
            code: result.code,
            last_failure: result.last_failure!,
            message: "Read-model refresh exhausted its retry budget",
            reason: result.reason,
          }),
          ok: false,
        });
      }
      if (result.code === "STORAGE_INTEGRITY_FAILED") {
        return failure(
          "STORAGE_INTEGRITY_FAILED",
          "Resource storage integrity failed",
        );
      }
      if (result.code === "READ_MODEL_REFRESH_CANCELED") {
        return failure(
          "READ_MODEL_REFRESH_CANCELED",
          "Read-model refresh was canceled",
        );
      }
      if (
        result.code === "MODULE_NOT_READY" ||
        result.code === "READ_MODEL_RUNTIME_FAILED"
      ) {
        return failure("MODULE_NOT_READY", "Extensia is not ready");
      }
      return failure(
        "READ_MODEL_REFRESH_UNAVAILABLE",
        "Read-model refresh is unavailable",
      );
    } finally {
      lease.release();
    }
  }

  return Object.freeze({ getResource, getResourceTree, refresh });
}

const INVALID_REFRESH_OPTIONS = Symbol("invalid refresh options");

function parseRefreshOptions(
  input: ReadModelRefreshOptions | undefined,
): AbortSignal | undefined | typeof INVALID_REFRESH_OPTIONS {
  if (input === undefined) return undefined;
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return INVALID_REFRESH_OPTIONS;
    }
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      return INVALID_REFRESH_OPTIONS;
    }
    const keys = Reflect.ownKeys(input);
    if (keys.some((key) => key !== "signal")) return INVALID_REFRESH_OPTIONS;
    if (!keys.includes("signal")) return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(input, "signal");
    if (descriptor === undefined || !("value" in descriptor)) {
      return INVALID_REFRESH_OPTIONS;
    }
    if (descriptor.value === undefined) return undefined;
    const aborted = Object.getOwnPropertyDescriptor(
      AbortSignal.prototype,
      "aborted",
    )?.get;
    if (aborted === undefined) return INVALID_REFRESH_OPTIONS;
    aborted.call(descriptor.value);
    return descriptor.value as AbortSignal;
  } catch {
    return INVALID_REFRESH_OPTIONS;
  }
}

function parseCreateInput(
  input: unknown,
): { title: string; description?: string | null } | null {
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input))
      return null;
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(input);
    if (
      keys.some(
        (key) =>
          typeof key !== "string" || (key !== "title" && key !== "description"),
      )
    )
      return null;
    const title = Object.getOwnPropertyDescriptor(input, "title");
    if (
      title === undefined ||
      !("value" in title) ||
      typeof title.value !== "string" ||
      title.value.trim().length === 0
    )
      return null;
    const description = Object.getOwnPropertyDescriptor(input, "description");
    if (
      description !== undefined &&
      (!("value" in description) ||
        (description.value !== null && typeof description.value !== "string"))
    )
      return null;
    return Object.freeze({
      title: title.value,
      ...(description === undefined
        ? {}
        : { description: description.value as string | null }),
    });
  } catch {
    return null;
  }
}

function parseUpdatePatch(
  patch: unknown,
): { readonly title?: string; readonly description?: string | null } | null {
  try {
    if (typeof patch !== "object" || patch === null || Array.isArray(patch))
      return null;
    const prototype = Object.getPrototypeOf(patch);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(patch);
    if (
      keys.length === 0 ||
      keys.some(
        (key) =>
          typeof key !== "string" || (key !== "title" && key !== "description"),
      )
    )
      return null;
    const title = Object.getOwnPropertyDescriptor(patch, "title");
    if (
      title !== undefined &&
      (!("value" in title) ||
        typeof title.value !== "string" ||
        title.value.trim().length === 0)
    )
      return null;
    const description = Object.getOwnPropertyDescriptor(patch, "description");
    if (
      description !== undefined &&
      (!("value" in description) ||
        (description.value !== null && typeof description.value !== "string"))
    )
      return null;
    return Object.freeze({
      ...(title === undefined ? {} : { title: title.value as string }),
      ...(description === undefined
        ? {}
        : { description: description.value as string | null }),
    });
  } catch {
    return null;
  }
}

function parseMoveInput(input: unknown):
  | {
      readonly parent_id: import("../../domain/scalars.js").IDString | null;
      readonly order_index: number;
    }
  | "invalid-id"
  | null {
  try {
    if (typeof input !== "object" || input === null || Array.isArray(input))
      return null;
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(input);
    if (
      keys.length !== 2 ||
      !keys.includes("parent_id") ||
      !keys.includes("order_index")
    )
      return null;
    const parent = Object.getOwnPropertyDescriptor(input, "parent_id");
    const order = Object.getOwnPropertyDescriptor(input, "order_index");
    if (
      parent === undefined ||
      order === undefined ||
      !("value" in parent) ||
      !("value" in order) ||
      parent.enumerable !== true ||
      order.enumerable !== true ||
      (parent.value !== null && typeof parent.value !== "string") ||
      typeof order.value !== "number" ||
      !Number.isSafeInteger(order.value) ||
      order.value < 0
    )
      return null;
    let parentId = null;
    if (parent.value !== null) {
      try {
        parentId = parseIDString(parent.value as string);
      } catch {
        return "invalid-id";
      }
    }
    return Object.freeze({ parent_id: parentId, order_index: order.value });
  } catch {
    return null;
  }
}

function writeSuccess(
  result: Extract<
    Awaited<ReturnType<CoreResourceWritePort["write"]>>,
    { ok: true }
  >,
  context: FacadeFactoryContext,
): { readonly ok: true; readonly value: DefaultResourceWriteSuccess } {
  if (result.value.warnings.length > 0) context.failClose();
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      committed: true,
      operation_id: result.value.operation_id,
      resource: result.value.resource,
      warnings: Object.freeze(
        result.value.warnings.map((code) =>
          Object.freeze({
            code,
            message:
              code === "LOCAL_INDEX_PUBLICATION_FAILED"
                ? "Committed Resource could not be published to the local index"
                : "Committed Resource cleanup failed",
          }),
        ),
      ),
    }),
  });
}

function invalidAssetID() {
  return failure("INVALID_ASSET_ID", "Asset ID is invalid");
}

function assetMessage(code: DefaultApiFailureCode): string {
  switch (code) {
    case "ASSET_INPUT_INVALID":
      return "Asset input is invalid";
    case "ASSET_URL_INVALID":
      return "Asset URL is invalid";
    case "ASSET_DATA_INVALID":
      return "Asset data is invalid";
    case "ASSET_NOT_FOUND":
      return "Asset was not found";
    case "ASSET_NO_CHANGES":
      return "Asset update has no changes";
    case "ASSET_ID_GENERATION_FAILED":
      return "Asset ID generation failed";
    case "ASSET_PRIMARY_CONFLICT":
      return "Resource already has a primary Asset";
    case "ASSET_NOT_READY":
      return "Asset has no ready representation";
    case "ASSET_LINEAGE_INVALID":
      return "Asset lineage is invalid";
    case "ASSET_LINEAGE_CONFLICT":
      return "Asset lineage prevents reassignment";
    case "ASSET_HAS_DERIVATIVES":
      return "Asset has derivatives";
    case "ASSET_UPLOAD_ALREADY_ACTIVE":
      return "Asset upload is already active";
    case "RESOURCE_NOT_FOUND":
      return "Resource was not found";
    case "STORAGE_LOCK_FAILED":
      return "Asset storage lock failed";
    case "STORAGE_INTEGRITY_FAILED":
      return "Asset storage integrity failed";
    default:
      return "Asset storage write failed";
  }
}

function assetWriteSuccess(
  result: Extract<
    Awaited<ReturnType<CoreAssetWritePort["write"]>>,
    { ok: true }
  >,
  context: FacadeFactoryContext,
) {
  if (result.value.warnings.length > 0) context.failClose();
  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      asset: result.value.asset,
      committed: true as const,
      operation_id: result.value.operation_id,
      resources: result.value.resources,
      warnings: Object.freeze(
        result.value.warnings.map((code) =>
          Object.freeze({
            code,
            message:
              code === "LOCAL_INDEX_PUBLICATION_FAILED"
                ? "Committed Asset state could not be published to the local index"
                : "Committed Asset cleanup failed",
          }),
        ),
      ),
    }),
  });
}

function createAssetCoreFailure(
  code: CoreAssetWriteFailureCode,
): AssetCreateResult {
  switch (code) {
    case "RESOURCE_NOT_FOUND":
    case "ASSET_INPUT_INVALID":
    case "ASSET_ID_GENERATION_FAILED":
    case "ASSET_PRIMARY_CONFLICT":
    case "ASSET_LINEAGE_INVALID":
    case "STORAGE_LOCK_FAILED":
    case "STORAGE_WRITE_FAILED":
    case "STORAGE_INTEGRITY_FAILED":
      return failure(code, assetMessage(code));
    default:
      return failure(
        "STORAGE_WRITE_FAILED",
        assetMessage("STORAGE_WRITE_FAILED"),
      );
  }
}

function updateAssetCoreFailure(
  code: CoreAssetWriteFailureCode,
): AssetUpdateResult {
  switch (code) {
    case "RESOURCE_NOT_FOUND":
    case "ASSET_INPUT_INVALID":
    case "ASSET_NOT_FOUND":
    case "ASSET_NO_CHANGES":
    case "ASSET_LINEAGE_INVALID":
    case "STORAGE_LOCK_FAILED":
    case "STORAGE_WRITE_FAILED":
    case "STORAGE_INTEGRITY_FAILED":
      return failure(code, assetMessage(code));
    default:
      return failure(
        "STORAGE_WRITE_FAILED",
        assetMessage("STORAGE_WRITE_FAILED"),
      );
  }
}

function primaryAssetCoreFailure(
  code: CoreAssetWriteFailureCode,
): AssetPrimaryResult {
  switch (code) {
    case "RESOURCE_NOT_FOUND":
    case "ASSET_NOT_FOUND":
    case "ASSET_NO_CHANGES":
    case "ASSET_NOT_READY":
    case "STORAGE_LOCK_FAILED":
    case "STORAGE_WRITE_FAILED":
    case "STORAGE_INTEGRITY_FAILED":
      return failure(code, assetMessage(code));
    default:
      return failure(
        "STORAGE_WRITE_FAILED",
        assetMessage("STORAGE_WRITE_FAILED"),
      );
  }
}

function reassignAssetCoreFailure(
  code: CoreAssetWriteFailureCode,
): AssetReassignResult {
  switch (code) {
    case "RESOURCE_NOT_FOUND":
    case "ASSET_NOT_FOUND":
    case "ASSET_NO_CHANGES":
    case "ASSET_LINEAGE_CONFLICT":
    case "ASSET_UPLOAD_ALREADY_ACTIVE":
    case "STORAGE_LOCK_FAILED":
    case "STORAGE_WRITE_FAILED":
    case "STORAGE_INTEGRITY_FAILED":
      return failure(code, assetMessage(code));
    default:
      return failure(
        "STORAGE_WRITE_FAILED",
        assetMessage("STORAGE_WRITE_FAILED"),
      );
  }
}

function deleteAssetCoreFailure(
  code: CoreAssetWriteFailureCode,
): AssetDeleteResult {
  switch (code) {
    case "RESOURCE_NOT_FOUND":
    case "ASSET_NOT_FOUND":
    case "ASSET_HAS_DERIVATIVES":
    case "STORAGE_LOCK_FAILED":
    case "STORAGE_WRITE_FAILED":
    case "STORAGE_INTEGRITY_FAILED":
      return failure(code, assetMessage(code));
    default:
      return failure(
        "STORAGE_WRITE_FAILED",
        assetMessage("STORAGE_WRITE_FAILED"),
      );
  }
}

function createStorageFacade(
  context: FacadeFactoryContext,
  port: CoreResourceWritePort | null,
  assetPort: CoreAssetWritePort | null,
): StorageFacade {
  return Object.freeze({
    async createAsset(
      rawResourceID: string,
      input: unknown,
    ): ReturnType<StorageFacade["createAsset"]> {
      const lease = context.operations.acquire();
      if (lease === null) return notReady();
      try {
        if (assetPort === null) {
          return failure(
            "STORAGE_READONLY",
            "Asset storage is readonly in this runtime",
          );
        }
        let resourceID;
        try {
          resourceID = parseIDString(rawResourceID);
        } catch {
          return invalidResourceID();
        }
        const parsed = parseCreateAssetInput(input);
        if (!parsed.ok) return failure(parsed.code, assetMessage(parsed.code));
        const result = await assetPort.write({
          fail_integrity: ({ code, operation_id }) =>
            context.failClose(code, operation_id),
          input: parsed.value,
          resource_id: resourceID,
          type: "asset.create",
        });
        return result.ok
          ? assetWriteSuccess(result, context)
          : createAssetCoreFailure(result.error.code);
      } finally {
        lease.release();
      }
    },
    async updateAsset(
      rawResourceID: string,
      rawAssetID: string,
      patch: unknown,
    ): ReturnType<StorageFacade["updateAsset"]> {
      const lease = context.operations.acquire();
      if (lease === null) return notReady();
      try {
        if (assetPort === null) {
          return failure(
            "STORAGE_READONLY",
            "Asset storage is readonly in this runtime",
          );
        }
        let resourceID;
        let assetID;
        try {
          resourceID = parseIDString(rawResourceID);
        } catch {
          return invalidResourceID();
        }
        try {
          assetID = parseIDString(rawAssetID);
        } catch {
          return invalidAssetID();
        }
        const parsed = parseUpdateAssetInput(patch);
        if (!parsed.ok) return failure(parsed.code, assetMessage(parsed.code));
        const result = await assetPort.write({
          asset_id: assetID,
          fail_integrity: ({ code, operation_id }) =>
            context.failClose(code, operation_id),
          patch: parsed.value,
          resource_id: resourceID,
          type: "asset.update",
        });
        return result.ok
          ? assetWriteSuccess(result, context)
          : updateAssetCoreFailure(result.error.code);
      } finally {
        lease.release();
      }
    },
    async setPrimaryAsset(
      rawResourceID: string,
      rawAssetID: string | null,
    ): ReturnType<StorageFacade["setPrimaryAsset"]> {
      const lease = context.operations.acquire();
      if (lease === null) return notReady();
      try {
        if (assetPort === null) {
          return failure(
            "STORAGE_READONLY",
            "Asset storage is readonly in this runtime",
          );
        }
        let resourceID;
        let assetID = null;
        try {
          resourceID = parseIDString(rawResourceID);
        } catch {
          return invalidResourceID();
        }
        if (rawAssetID !== null) {
          try {
            assetID = parseIDString(rawAssetID);
          } catch {
            return invalidAssetID();
          }
        }
        const result = await assetPort.write({
          asset_id: assetID,
          fail_integrity: ({ code, operation_id }) =>
            context.failClose(code, operation_id),
          resource_id: resourceID,
          type: "asset.primary.set",
        });
        return result.ok
          ? assetWriteSuccess(result, context)
          : primaryAssetCoreFailure(result.error.code);
      } finally {
        lease.release();
      }
    },
    async reassignAsset(
      rawSourceID: string,
      rawAssetID: string,
      rawDestinationID: string,
    ): ReturnType<StorageFacade["reassignAsset"]> {
      const lease = context.operations.acquire();
      if (lease === null) return notReady();
      try {
        if (assetPort === null) {
          return failure(
            "STORAGE_READONLY",
            "Asset storage is readonly in this runtime",
          );
        }
        let sourceID;
        let destinationID;
        let assetID;
        try {
          sourceID = parseIDString(rawSourceID);
          destinationID = parseIDString(rawDestinationID);
        } catch {
          return invalidResourceID();
        }
        try {
          assetID = parseIDString(rawAssetID);
        } catch {
          return invalidAssetID();
        }
        const result = await assetPort.write({
          asset_id: assetID,
          destination_resource_id: destinationID,
          fail_integrity: ({ code, operation_id }) =>
            context.failClose(code, operation_id),
          source_resource_id: sourceID,
          type: "asset.reassign",
        });
        return result.ok
          ? assetWriteSuccess(result, context)
          : reassignAssetCoreFailure(result.error.code);
      } finally {
        lease.release();
      }
    },
    async deleteAsset(
      rawResourceID: string,
      rawAssetID: string,
    ): ReturnType<StorageFacade["deleteAsset"]> {
      const lease = context.operations.acquire();
      if (lease === null) return notReady();
      try {
        if (assetPort === null) {
          return failure(
            "STORAGE_READONLY",
            "Asset storage is readonly in this runtime",
          );
        }
        let resourceID;
        let assetID;
        try {
          resourceID = parseIDString(rawResourceID);
        } catch {
          return invalidResourceID();
        }
        try {
          assetID = parseIDString(rawAssetID);
        } catch {
          return invalidAssetID();
        }
        const result = await assetPort.write({
          asset_id: assetID,
          fail_integrity: ({ code, operation_id }) =>
            context.failClose(code, operation_id),
          resource_id: resourceID,
          type: "asset.delete",
        });
        return result.ok
          ? assetWriteSuccess(result, context)
          : deleteAssetCoreFailure(result.error.code);
      } finally {
        lease.release();
      }
    },
    async createResource(
      input: unknown,
    ): ReturnType<StorageFacade["createResource"]> {
      const lease = context.operations.acquire();
      if (lease === null) return notReady();

      try {
        if (port === null)
          return failure(
            "STORAGE_READONLY",
            "Resource storage is readonly in this runtime",
          );
        const parsed = parseCreateInput(input);
        if (parsed === null)
          return failure("RESOURCE_INPUT_INVALID", "Resource input is invalid");
        const result = await port.write({
          type: "resource.create",
          ...parsed,
          fail_integrity: ({ code, operation_id }) =>
            context.failClose(code, operation_id),
        });
        if (!result.ok) {
          return createWriteFailure(result.error.code);
        }
        return writeSuccess(result, context);
      } finally {
        lease.release();
      }
    },
    async updateResource(
      rawId: string,
      patch: unknown,
    ): ReturnType<StorageFacade["updateResource"]> {
      const lease = context.operations.acquire();
      if (lease === null) return notReady();
      try {
        if (port === null)
          return failure(
            "STORAGE_READONLY",
            "Resource storage is readonly in this runtime",
          );
        let id;
        try {
          id = parseIDString(rawId);
        } catch {
          return invalidResourceID();
        }
        const parsed = parseUpdatePatch(patch);
        if (parsed === null)
          return failure("RESOURCE_INPUT_INVALID", "Resource input is invalid");
        const result = await port.write({
          type: "resource.update",
          id,
          patch: parsed,
          fail_integrity: ({ code, operation_id }) =>
            context.failClose(code, operation_id),
        });
        if (!result.ok) {
          return updateWriteFailure(result.error.code);
        }
        return writeSuccess(result, context);
      } finally {
        lease.release();
      }
    },
    async moveResource(
      rawId: string,
      input: unknown,
    ): ReturnType<StorageFacade["moveResource"]> {
      const lease = context.operations.acquire();
      if (lease === null) return notReady();
      try {
        if (port === null)
          return failure(
            "STORAGE_READONLY",
            "Resource storage is readonly in this runtime",
          );
        let id;
        try {
          id = parseIDString(rawId);
        } catch {
          return invalidResourceID();
        }
        const parsed = parseMoveInput(input);
        if (parsed === "invalid-id") return invalidResourceID();
        if (parsed === null)
          return failure("RESOURCE_INPUT_INVALID", "Resource input is invalid");
        const result = await port.write({
          type: "resource.move",
          id,
          ...parsed,
          fail_integrity: ({ code, operation_id }) =>
            context.failClose(code, operation_id),
        });
        if (!result.ok) {
          return moveWriteFailure(result.error.code);
        }
        return writeSuccess(result, context);
      } finally {
        lease.release();
      }
    },
    async deleteResource(
      rawId: string,
    ): ReturnType<StorageFacade["deleteResource"]> {
      const lease = context.operations.acquire();
      if (lease === null) return notReady();
      try {
        if (port === null)
          return failure(
            "STORAGE_READONLY",
            "Resource storage is readonly in this runtime",
          );
        let id;
        try {
          id = parseIDString(rawId);
        } catch {
          return invalidResourceID();
        }
        const result = await port.write({
          type: "resource.delete",
          id,
          fail_integrity: ({ code, operation_id }) =>
            context.failClose(code, operation_id),
        });
        return result.ok
          ? writeSuccess(result, context)
          : deleteWriteFailure(result.error.code);
      } finally {
        lease.release();
      }
    },
    async setMarks(
      rawId: string,
      marks: unknown,
    ): ReturnType<StorageFacade["setMarks"]> {
      const lease = context.operations.acquire();
      if (lease === null) return notReady();
      try {
        if (port === null)
          return failure(
            "STORAGE_READONLY",
            "Resource storage is readonly in this runtime",
          );
        let id;
        try {
          id = parseIDString(rawId);
        } catch {
          return invalidResourceID();
        }
        const parsed = parseMarks(marks);
        if (parsed === null)
          return failure("RESOURCE_INPUT_INVALID", "Resource input is invalid");
        const result = await port.write({
          type: "resource.marks.set",
          id,
          marks: parsed,
          fail_integrity: ({ code, operation_id }) =>
            context.failClose(code, operation_id),
        });
        return result.ok
          ? writeSuccess(result, context)
          : aggregateWriteFailure(result.error.code);
      } finally {
        lease.release();
      }
    },
    async setKV(
      rawId: string,
      namespace: unknown,
      values: unknown,
    ): ReturnType<StorageFacade["setKV"]> {
      const lease = context.operations.acquire();
      if (lease === null) return notReady();
      try {
        if (port === null)
          return failure(
            "STORAGE_READONLY",
            "Resource storage is readonly in this runtime",
          );
        let id;
        try {
          id = parseIDString(rawId);
        } catch {
          return invalidResourceID();
        }
        if (!validKVNamespace(namespace))
          return failure("RESOURCE_INPUT_INVALID", "Resource input is invalid");
        const parsed = parseKVNamespace(values);
        if (parsed === null)
          return failure("RESOURCE_INPUT_INVALID", "Resource input is invalid");
        const result = await port.write({
          type: "resource.kv.set",
          id,
          namespace,
          values: parsed,
          fail_integrity: ({ code, operation_id }) =>
            context.failClose(code, operation_id),
        });
        return result.ok
          ? writeSuccess(result, context)
          : aggregateWriteFailure(result.error.code);
      } finally {
        lease.release();
      }
    },
  });
}

function messageForWriteFailure(code: CoreResourceWriteFailureCode): string {
  switch (code) {
    case "RESOURCE_INPUT_INVALID":
      return "Resource input is invalid";
    case "RESOURCE_NOT_FOUND":
      return "Resource was not found";
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
    case "RESOURCE_HAS_CHILDREN":
      return "Resource has active children";
    case "RESOURCE_ALREADY_DELETED":
      return "Resource is already deleted";
    case "RESOURCE_ASSET_UPLOAD_ACTIVE":
      return "Resource has an active Asset upload";
  }
}

function moveWriteFailure(
  code: CoreResourceWriteFailureCode,
): DefaultApiResult<never, MoveResourceFailure> {
  switch (code) {
    case "RESOURCE_INPUT_INVALID":
    case "RESOURCE_NOT_FOUND":
    case "RESOURCE_NO_CHANGES":
    case "RESOURCE_PARENT_NOT_FOUND":
    case "RESOURCE_MOVE_CYCLE":
    case "RESOURCE_ORDER_OUT_OF_RANGE":
    case "STORAGE_LOCK_FAILED":
    case "STORAGE_WRITE_FAILED":
    case "STORAGE_INTEGRITY_FAILED":
      return failure(code, messageForWriteFailure(code));
    case "RESOURCE_ID_GENERATION_FAILED":
    case "RESOURCE_HAS_CHILDREN":
    case "RESOURCE_ALREADY_DELETED":
    case "RESOURCE_ASSET_UPLOAD_ACTIVE":
      return failure(
        "STORAGE_WRITE_FAILED",
        messageForWriteFailure("STORAGE_WRITE_FAILED"),
      );
  }
}
function deleteWriteFailure(
  code: CoreResourceWriteFailureCode,
): DefaultApiResult<never, DeleteResourceFailure> {
  switch (code) {
    case "RESOURCE_NOT_FOUND":
    case "RESOURCE_HAS_CHILDREN":
    case "RESOURCE_ALREADY_DELETED":
    case "RESOURCE_ASSET_UPLOAD_ACTIVE":
    case "STORAGE_LOCK_FAILED":
    case "STORAGE_WRITE_FAILED":
    case "STORAGE_INTEGRITY_FAILED":
      return failure(code, messageForWriteFailure(code));
    default:
      return failure(
        "STORAGE_WRITE_FAILED",
        messageForWriteFailure("STORAGE_WRITE_FAILED"),
      );
  }
}
function aggregateWriteFailure(
  code: CoreResourceWriteFailureCode,
): DefaultApiResult<never, AggregateResourceFailure> {
  switch (code) {
    case "RESOURCE_INPUT_INVALID":
    case "RESOURCE_NOT_FOUND":
    case "RESOURCE_NO_CHANGES":
    case "STORAGE_LOCK_FAILED":
    case "STORAGE_WRITE_FAILED":
    case "STORAGE_INTEGRITY_FAILED":
      return failure(code, messageForWriteFailure(code));
    default:
      return failure(
        "STORAGE_WRITE_FAILED",
        messageForWriteFailure("STORAGE_WRITE_FAILED"),
      );
  }
}

function createWriteFailure(
  code: CoreResourceWriteFailureCode,
): DefaultApiResult<never, CreateResourceFailure> {
  switch (code) {
    case "RESOURCE_INPUT_INVALID":
      return failure(code, messageForWriteFailure(code));
    case "RESOURCE_ID_GENERATION_FAILED":
      return failure(code, messageForWriteFailure(code));
    case "STORAGE_LOCK_FAILED":
      return failure(code, messageForWriteFailure(code));
    case "STORAGE_WRITE_FAILED":
      return failure(code, messageForWriteFailure(code));
    case "STORAGE_INTEGRITY_FAILED":
      return failure(code, messageForWriteFailure(code));
    case "RESOURCE_NOT_FOUND":
    case "RESOURCE_NO_CHANGES":
    case "RESOURCE_PARENT_NOT_FOUND":
    case "RESOURCE_MOVE_CYCLE":
    case "RESOURCE_ORDER_OUT_OF_RANGE":
    case "RESOURCE_HAS_CHILDREN":
    case "RESOURCE_ALREADY_DELETED":
    case "RESOURCE_ASSET_UPLOAD_ACTIVE":
      return failure(
        "STORAGE_WRITE_FAILED",
        messageForWriteFailure("STORAGE_WRITE_FAILED"),
      );
  }
}

function updateWriteFailure(
  code: CoreResourceWriteFailureCode,
): DefaultApiResult<never, UpdateResourceFailure> {
  switch (code) {
    case "RESOURCE_INPUT_INVALID":
    case "RESOURCE_NOT_FOUND":
    case "RESOURCE_NO_CHANGES":
    case "STORAGE_LOCK_FAILED":
    case "STORAGE_WRITE_FAILED":
    case "STORAGE_INTEGRITY_FAILED":
      return failure(code, messageForWriteFailure(code));
    case "RESOURCE_ID_GENERATION_FAILED":
    case "RESOURCE_PARENT_NOT_FOUND":
    case "RESOURCE_MOVE_CYCLE":
    case "RESOURCE_ORDER_OUT_OF_RANGE":
    case "RESOURCE_HAS_CHILDREN":
    case "RESOURCE_ALREADY_DELETED":
    case "RESOURCE_ASSET_UPLOAD_ACTIVE":
      return failure(
        "STORAGE_WRITE_FAILED",
        messageForWriteFailure("STORAGE_WRITE_FAILED"),
      );
  }
}

function queryProvider(
  port: CoreResourceReadPort,
  control: ReadModelControlPort,
): FacadeProvider<QueryFacade> {
  return facadeProvider({
    handle: QUERY_FACADE,
    owner: "extensia.default-api",
    dependencies: [],
    create(context): QueryFacade {
      return createQueryFacade(port, control, context);
    },
  });
}

function storageProvider(
  port: CoreResourceWritePort | null,
  assetPort: CoreAssetWritePort | null,
): FacadeProvider<StorageFacade> {
  return facadeProvider({
    handle: STORAGE_FACADE,
    owner: "extensia.default-api",
    dependencies: [],
    create(context): StorageFacade {
      return createStorageFacade(context, port, assetPort);
    },
  });
}

export const DEFAULT_API_SYSTEM_EXTENSION_MODULE: ReturnType<
  typeof defineModule
> = defineModule({
  id: "extensia.default-api",
  requires: [
    { token: CORE_RESOURCE_READ_PORT },
    { token: READ_MODEL_CONTROL_PORT },
  ],
  provides: [
    {
      token: SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS,
      kind: "admin-contribution",
      cardinality: "multi",
    },
  ],
  setup(context) {
    context
      .add(SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS)
      .toFactory(({ get }) =>
        queryProvider(
          get(CORE_RESOURCE_READ_PORT),
          get(READ_MODEL_CONTROL_PORT),
        ),
      )
      .singleton();
    context
      .add(SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS)
      .toValue(storageProvider(null, null));
  },
});

export const FULL_DEFAULT_API_SYSTEM_EXTENSION_MODULE: ReturnType<
  typeof defineModule
> = defineModule({
  id: "extensia.default-api.full",
  requires: [
    { token: CORE_RESOURCE_READ_PORT },
    { token: READ_MODEL_CONTROL_PORT },
    { token: CORE_RESOURCE_WRITE_PORT },
    { token: CORE_ASSET_WRITE_PORT },
  ],
  provides: [
    {
      token: SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS,
      kind: "admin-contribution",
      cardinality: "multi",
    },
  ],
  setup(context) {
    context
      .add(SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS)
      .toFactory(({ get }) =>
        queryProvider(
          get(CORE_RESOURCE_READ_PORT),
          get(READ_MODEL_CONTROL_PORT),
        ),
      )
      .singleton();
    context
      .add(SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS)
      .toFactory(({ get }) =>
        storageProvider(
          get(CORE_RESOURCE_WRITE_PORT),
          get(CORE_ASSET_WRITE_PORT),
        ),
      )
      .singleton();
  },
});

export const DEFAULT_API_FACADE_REGISTRY_MODULE: ReturnType<
  typeof defineModule
> = defineModule({
  id: "extensia.runtime.facades",
  requires: [
    {
      token: SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS,
      cardinality: "multi",
    },
    {
      token: FACADE_PROVIDER_CONTRIBUTIONS,
      cardinality: "multi",
      required: false,
    },
    {
      token: RUNTIME_FAULT_SINK_CONTRIBUTIONS,
      cardinality: "multi",
      required: false,
    },
  ],
  provides: [
    { token: FACADE_REGISTRY_ACCESS, kind: "shared-service" },
    {
      token: LIFECYCLE_CONTRIBUTIONS,
      kind: "admin-contribution",
      cardinality: "multi",
    },
  ],
  setup(context) {
    context
      .bind(FACADE_RUNTIME)
      .toFactory(({ getAll }) => {
        const faultSinks = getAll(RUNTIME_FAULT_SINK_CONTRIBUTIONS);
        if (faultSinks.length > 1) {
          throw new Error("Facade Registry requires one RuntimeFaultSink");
        }
        return createFacadeRuntime(
          getAll(SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS),
          getAll(FACADE_PROVIDER_CONTRIBUTIONS),
          faultSinks[0],
        );
      })
      .singleton();
    context
      .bind(FACADE_REGISTRY_ACCESS)
      .toFactory(({ get }) => get(FACADE_RUNTIME).access)
      .singleton();
    context
      .add(LIFECYCLE_CONTRIBUTIONS)
      .toFactory(({ get }) => get(FACADE_RUNTIME).lifecycle)
      .singleton();
  },
});
