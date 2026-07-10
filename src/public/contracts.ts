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
  | "STORAGE_READONLY";

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
  readonly stage: "config" | "composition" | "start" | "stop" | "facade";
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
    readonly driver: ReadonlyResourceDriver;
  };
}

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
    input: unknown,
  ): Promise<ExtensiaResult<never, ModuleNotReadyError | StorageReadonlyError>>;
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
