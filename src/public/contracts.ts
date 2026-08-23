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
  | "STORAGE_READ_FAILED"
  | "READ_MODEL_REFRESH_UNAVAILABLE"
  | "READ_MODEL_REFRESH_OPTIONS_INVALID"
  | "READ_MODEL_REFRESH_CANCELED"
  | "READ_MODEL_REFRESH_EXHAUSTED"
  | "STORAGE_READONLY"
  | "RESOURCE_INPUT_INVALID"
  | "RESOURCE_NO_CHANGES"
  | "RESOURCE_ID_GENERATION_FAILED"
  | "STORAGE_LOCK_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "STORAGE_INTEGRITY_FAILED"
  | "RESOURCE_PARENT_NOT_FOUND"
  | "RESOURCE_MOVE_CYCLE"
  | "RESOURCE_ORDER_OUT_OF_RANGE"
  | "RESOURCE_HAS_CHILDREN"
  | "RESOURCE_ALREADY_DELETED"
  | "RESOURCE_ASSET_UPLOAD_ACTIVE"
  | "INVALID_ASSET_ID"
  | "ASSET_INPUT_INVALID"
  | "ASSET_URL_INVALID"
  | "ASSET_DATA_INVALID"
  | "ASSET_NOT_FOUND"
  | "ASSET_NO_CHANGES"
  | "ASSET_ID_GENERATION_FAILED"
  | "ASSET_PRIMARY_CONFLICT"
  | "ASSET_NOT_READY"
  | "ASSET_LINEAGE_INVALID"
  | "ASSET_LINEAGE_CONFLICT"
  | "ASSET_HAS_DERIVATIVES"
  | "ASSET_UPLOAD_ALREADY_ACTIVE"
  | "ASSET_UPLOAD_NOT_ACTIVE"
  | "ASSET_UPLOAD_INCOMPLETE"
  | "ASSET_FILE_NOT_READY";

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
  readonly read_model: ReadModelInspection;
}

export type ReadModelLoadingMode = "greedy" | "lazy";
export type ReadModelSynchronizationMode = "manual" | "polling";

export interface ReadModelRetryConfig {
  readonly maxAttempts?: number;
  readonly deadlineMs?: number;
  readonly initialDelayMs?: number;
  readonly maxDelayMs?: number;
}

export interface ReadModelPollingConfig {
  readonly intervalMs: number;
  readonly maxBackoffMs?: number;
}

export interface ReadModelSynchronizationConfig {
  readonly mode?: ReadModelSynchronizationMode;
  readonly retry?: ReadModelRetryConfig;
  readonly polling?: ReadModelPollingConfig;
}

export interface SafeSynchronizationInspection {
  readonly mode: ReadModelSynchronizationMode;
  readonly state:
    | "not-started"
    | "starting"
    | "unsupported"
    | "idle"
    | "refreshing"
    | "backoff"
    | "degraded"
    | "stopping"
    | "stopped"
    | "failed";
  readonly freshness: "startup" | "observed" | "unknown" | "failed";
  readonly last_observed_at: Timestamp | null;
  readonly last_failure:
    | null
    | "storage-lock"
    | "storage-unavailable"
    | "storage-read"
    | "coordinator-conflict"
    | "retry-exhausted"
    | "capability"
    | "integrity";
}

export interface ReadModelInspection {
  readonly loading: ReadModelLoadingMode;
  readonly lifecycle:
    "not-started" | "building" | "ready" | "stopping" | "failed" | "stopped";
  readonly coverage: "none" | "selective" | "complete";
  readonly synchronization: SafeSynchronizationInspection;
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
  readonly readModel?: {
    readonly loading?: ReadModelLoadingMode;
    readonly synchronization?: ReadModelSynchronizationConfig;
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
export interface SetMarkInput {
  readonly type: string;
  readonly name: string;
  readonly value: number | null;
}

interface CreateAssetBaseInput {
  readonly type: string;
  readonly role: string;
  readonly mime: string | null;
  readonly extension: string | null;
  readonly derived_from?: string | null;
  readonly data?: JSONObject | null;
}

export interface CreateExternalAssetInput extends CreateAssetBaseInput {
  readonly kind: "external";
  readonly url: string;
  readonly is_primary?: boolean;
}

export interface CreateInternalAssetInput extends CreateAssetBaseInput {
  readonly kind: "internal";
  readonly is_primary?: false;
}

export type CreateAssetInput =
  CreateExternalAssetInput | CreateInternalAssetInput;

export interface UpdateAssetInput {
  readonly type?: string;
  readonly role?: string;
  readonly mime?: string | null;
  readonly extension?: string | null;
  readonly url?: string;
  readonly derived_from?: string | null;
  readonly data?: JSONObject | null;
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

export interface AssetWriteSuccess {
  readonly committed: true;
  readonly operation_id: IDString;
  readonly asset: AssetSnapshot | null;
  readonly resources: readonly ResourceSnapshot[];
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
export type ResourceDeleteError =
  | ModuleNotReadyError
  | StorageReadonlyError
  | InvalidResourceIDError
  | ResourceNotFoundError
  | ExtensiaError<"RESOURCE_HAS_CHILDREN">
  | ExtensiaError<"RESOURCE_ALREADY_DELETED">
  | ExtensiaError<"RESOURCE_ASSET_UPLOAD_ACTIVE">
  | ExtensiaError<"STORAGE_LOCK_FAILED">
  | ExtensiaError<"STORAGE_WRITE_FAILED">
  | ExtensiaError<"STORAGE_INTEGRITY_FAILED">;
export type ResourceDeleteResult = ExtensiaResult<
  ResourceWriteSuccess,
  ResourceDeleteError
>;
export type ResourceMarksError =
  | ModuleNotReadyError
  | StorageReadonlyError
  | InvalidResourceIDError
  | ExtensiaError<"RESOURCE_INPUT_INVALID">
  | ResourceNotFoundError
  | ExtensiaError<"RESOURCE_NO_CHANGES">
  | ExtensiaError<"STORAGE_LOCK_FAILED">
  | ExtensiaError<"STORAGE_WRITE_FAILED">
  | ExtensiaError<"STORAGE_INTEGRITY_FAILED">;
export type ResourceKVError = ResourceMarksError;
export type ResourceMarksResult = ExtensiaResult<
  ResourceWriteSuccess,
  ResourceMarksError
>;
export type ResourceKVResult = ExtensiaResult<
  ResourceWriteSuccess,
  ResourceKVError
>;

type AssetInfrastructureError =
  | ModuleNotReadyError
  | StorageReadonlyError
  | InvalidResourceIDError
  | ResourceNotFoundError
  | ExtensiaError<"STORAGE_LOCK_FAILED">
  | ExtensiaError<"STORAGE_WRITE_FAILED">
  | ExtensiaError<"STORAGE_INTEGRITY_FAILED">;
type AssetExistingError =
  | AssetInfrastructureError
  | ExtensiaError<"INVALID_ASSET_ID">
  | ExtensiaError<"ASSET_NOT_FOUND">;
export type AssetCreateError =
  | AssetInfrastructureError
  | ExtensiaError<"INVALID_ASSET_ID">
  | ExtensiaError<"ASSET_INPUT_INVALID">
  | ExtensiaError<"ASSET_URL_INVALID">
  | ExtensiaError<"ASSET_DATA_INVALID">
  | ExtensiaError<"ASSET_ID_GENERATION_FAILED">
  | ExtensiaError<"ASSET_PRIMARY_CONFLICT">
  | ExtensiaError<"ASSET_LINEAGE_INVALID">;
export type AssetUpdateError =
  | AssetExistingError
  | ExtensiaError<"ASSET_INPUT_INVALID">
  | ExtensiaError<"ASSET_URL_INVALID">
  | ExtensiaError<"ASSET_DATA_INVALID">
  | ExtensiaError<"ASSET_NO_CHANGES">
  | ExtensiaError<"ASSET_LINEAGE_INVALID">;
export type AssetPrimaryError =
  | AssetExistingError
  | ExtensiaError<"ASSET_NO_CHANGES">
  | ExtensiaError<"ASSET_NOT_READY">;
export type AssetReassignError =
  | AssetExistingError
  | ExtensiaError<"ASSET_NO_CHANGES">
  | ExtensiaError<"ASSET_LINEAGE_CONFLICT">
  | ExtensiaError<"ASSET_UPLOAD_ALREADY_ACTIVE">;
export type AssetDeleteError =
  AssetExistingError | ExtensiaError<"ASSET_HAS_DERIVATIVES">;

export type AssetCreateResult = ExtensiaResult<
  AssetWriteSuccess,
  AssetCreateError
>;
export type AssetUpdateResult = ExtensiaResult<
  AssetWriteSuccess,
  AssetUpdateError
>;
export type AssetPrimaryResult = ExtensiaResult<
  AssetWriteSuccess,
  AssetPrimaryError
>;
export type AssetReassignResult = ExtensiaResult<
  AssetWriteSuccess,
  AssetReassignError
>;
export type AssetDeleteResult = ExtensiaResult<
  AssetWriteSuccess,
  AssetDeleteError
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
      | ModuleNotReadyError
      | InvalidResourceIDError
      | ResourceNotFoundError
      | ExtensiaError<"STORAGE_READ_FAILED">
      | ExtensiaError<"STORAGE_INTEGRITY_FAILED">
    >
  >;
  getResourceTree(
    id: string,
  ): Promise<
    ExtensiaResult<
      ResourceTreeViewSnapshot,
      | ModuleNotReadyError
      | InvalidResourceIDError
      | ResourceNotFoundError
      | ExtensiaError<"STORAGE_READ_FAILED">
      | ExtensiaError<"STORAGE_INTEGRITY_FAILED">
    >
  >;
  refresh(options?: ReadModelRefreshOptions): Promise<ReadModelRefreshResult>;
}

export interface ReadModelRefreshOptions {
  readonly signal?: AbortSignal;
}

export interface ReadModelRefreshSuccess {
  readonly observed: true;
  readonly changed: boolean;
}

export interface ReadModelRefreshExhaustedError extends ExtensiaError<"READ_MODEL_REFRESH_EXHAUSTED"> {
  readonly reason: "attempts" | "deadline";
  readonly last_failure:
    | "storage-lock"
    | "storage-unavailable"
    | "storage-read"
    | "coordinator-conflict";
}

export type ReadModelRefreshResult = ExtensiaResult<
  ReadModelRefreshSuccess,
  | ModuleNotReadyError
  | ExtensiaError<"READ_MODEL_REFRESH_UNAVAILABLE">
  | ExtensiaError<"READ_MODEL_REFRESH_OPTIONS_INVALID">
  | ExtensiaError<"READ_MODEL_REFRESH_CANCELED">
  | ReadModelRefreshExhaustedError
  | ExtensiaError<"STORAGE_INTEGRITY_FAILED">
>;

export interface StorageFacade {
  createAsset(
    resourceId: string,
    input: CreateAssetInput,
  ): Promise<AssetCreateResult>;
  updateAsset(
    resourceId: string,
    assetId: string,
    patch: UpdateAssetInput,
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
  deleteResource(id: string): Promise<ResourceDeleteResult>;
  setMarks(
    resourceId: string,
    marks: readonly SetMarkInput[],
  ): Promise<ResourceMarksResult>;
  setKV(
    resourceId: string,
    namespace: string,
    values: Readonly<Record<string, string>>,
  ): Promise<ResourceKVResult>;
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
