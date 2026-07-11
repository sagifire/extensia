import type {
  JSONPrimitive,
  JSONArray,
  JSONObject,
  JSONValue,
} from "../domain/json.js";
import type { IDString, Timestamp } from "../domain/scalars.js";
import type {
  AssetSnapshot,
  MarkSnapshot,
  ResourceChildRefSnapshot,
  ResourceDataSnapshot,
  ResourceKVSnapshot,
  ResourceSnapshot,
  ResourceTreeViewSnapshot,
} from "../domain/snapshots.js";
import type {
  FullResourceDriver,
  FullResourceDriverDefinition,
} from "./full-resource-driver.js";

export type {
  AssetSnapshot,
  IDString,
  JSONArray,
  JSONObject,
  JSONPrimitive,
  JSONValue,
  MarkSnapshot,
  ResourceChildRefSnapshot,
  ResourceDataSnapshot,
  ResourceKVSnapshot,
  ResourceSnapshot,
  ResourceTreeViewSnapshot,
  Timestamp,
  FullResourceDriver,
  FullResourceDriverDefinition,
};

export type ExtensiaModuleState =
  "created" | "starting" | "started" | "stopping" | "stopped" | "failed";

export type ExtensiaErrorCode =
  | "CONFIG_INVALID"
  | "MODULE_BUSY"
  | "MODULE_INVALID_STATE"
  | "MODULE_NOT_READY"
  | "START_FAILED"
  | "STOP_FAILED"
  | "INVALID_RESOURCE_ID"
  | "RESOURCE_NOT_FOUND"
  | "STORAGE_READONLY"
  | "RESOURCE_INPUT_INVALID"
  | "RESOURCE_NO_CHANGES"
  | "RESOURCE_ID_GENERATION_FAILED"
  | "STORAGE_LOCK_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "STORAGE_INTEGRITY_FAILED"
  | "RESOURCE_PARENT_NOT_FOUND"
  | "RESOURCE_MOVE_CYCLE"
  | "RESOURCE_ORDER_OUT_OF_RANGE";

export interface ExtensiaError<
  TCode extends ExtensiaErrorCode = ExtensiaErrorCode,
> {
  readonly code: TCode;
  readonly message: string;
}

export type ExtensiaResult<
  TValue,
  TError extends ExtensiaError = ExtensiaError,
> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };

export interface SafeDiagnostic {
  readonly code: string;
  readonly stage:
    "config" | "composition" | "start" | "stop" | "facade" | "operation";
  readonly subject?: string;
}

export interface ExtensiaInspection {
  readonly state: ExtensiaModuleState;
  readonly ready: boolean;
  readonly facades: readonly ("query" | "storage")[];
  readonly diagnostics: readonly SafeDiagnostic[];
}

export interface ReadonlyResourceDriver {
  readonly mode: "readonly";
  open(): Promise<void>;
  close(): Promise<void>;
  listResources(): AsyncIterable<ResourceSnapshot>;
}

export interface ExtensiaConfig {
  readonly storage: {
    readonly driver: ReadonlyResourceDriver | FullResourceDriver;
  };
}

export interface CreateResourceInput {
  readonly title: string;
  readonly description?: string | null;
}

export interface UpdateResourceInput {
  readonly title?: string;
  readonly description?: string | null;
}

export interface MoveResourceInput {
  readonly parent_id: string | null;
  readonly order_index: number;
}

export type ResourceWriteWarningCode =
  "LOCAL_INDEX_PUBLICATION_FAILED" | "POST_COMMIT_CLEANUP_FAILED";

export interface ResourceWriteWarning {
  readonly code: ResourceWriteWarningCode;
  readonly message: string;
}

export interface ResourceWriteSuccess {
  readonly committed: true;
  readonly operation_id: IDString;
  readonly resource: ResourceSnapshot;
  readonly warnings: readonly ResourceWriteWarning[];
}

export type ResourceWriteError =
  | ModuleNotReadyError
  | InvalidResourceIDError
  | StorageReadonlyError
  | ExtensiaError<"RESOURCE_INPUT_INVALID">
  | ResourceNotFoundError
  | ExtensiaError<"RESOURCE_NO_CHANGES">
  | ExtensiaError<"RESOURCE_ID_GENERATION_FAILED">
  | ExtensiaError<"STORAGE_LOCK_FAILED">
  | ExtensiaError<"STORAGE_WRITE_FAILED">
  | ExtensiaError<"STORAGE_INTEGRITY_FAILED">;

export type ResourceMoveError =
  | ModuleNotReadyError
  | StorageReadonlyError
  | InvalidResourceIDError
  | ExtensiaError<"RESOURCE_INPUT_INVALID">
  | ResourceNotFoundError
  | ExtensiaError<"RESOURCE_PARENT_NOT_FOUND">
  | ExtensiaError<"RESOURCE_MOVE_CYCLE">
  | ExtensiaError<"RESOURCE_ORDER_OUT_OF_RANGE">
  | ExtensiaError<"RESOURCE_NO_CHANGES">
  | ExtensiaError<"STORAGE_LOCK_FAILED">
  | ExtensiaError<"STORAGE_WRITE_FAILED">
  | ExtensiaError<"STORAGE_INTEGRITY_FAILED">;

export type ResourceMoveResult = ExtensiaResult<
  ResourceWriteSuccess,
  ResourceMoveError
>;

type ModuleNotReadyError = ExtensiaError<"MODULE_NOT_READY">;
type InvalidResourceIDError = ExtensiaError<"INVALID_RESOURCE_ID">;
type ResourceNotFoundError = ExtensiaError<"RESOURCE_NOT_FOUND">;
type StorageReadonlyError = ExtensiaError<"STORAGE_READONLY">;

export interface QueryFacade {
  getResource(
    id: string,
  ): Promise<
    ExtensiaResult<
      ResourceSnapshot,
      ModuleNotReadyError | InvalidResourceIDError | ResourceNotFoundError
    >
  >;
  getResourceTree(
    id: string,
  ): Promise<
    ExtensiaResult<
      ResourceTreeViewSnapshot,
      ModuleNotReadyError | InvalidResourceIDError | ResourceNotFoundError
    >
  >;
}

export interface StorageFacade {
  createResource(
    input: CreateResourceInput,
  ): Promise<ExtensiaResult<ResourceWriteSuccess, ResourceWriteError>>;
  updateResource(
    id: string,
    patch: UpdateResourceInput,
  ): Promise<ExtensiaResult<ResourceWriteSuccess, ResourceWriteError>>;
  moveResource(
    id: string,
    input: MoveResourceInput,
  ): Promise<ResourceMoveResult>;
}

export interface ExtensiaModule {
  getState(): ExtensiaModuleState;
  start(): Promise<
    ExtensiaResult<
      void,
      ExtensiaError<
        | "CONFIG_INVALID"
        | "MODULE_BUSY"
        | "MODULE_INVALID_STATE"
        | "START_FAILED"
      >
    >
  >;
  stop(): Promise<
    ExtensiaResult<void, ExtensiaError<"MODULE_BUSY" | "STOP_FAILED">>
  >;
  query(): QueryFacade | null;
  storage(): StorageFacade | null;
  inspect(): ExtensiaInspection;
}
