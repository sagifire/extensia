type IDString = string & { readonly __id: unique symbol };
type JSONObject = Readonly<Record<string, unknown>>;
interface AssetSnapshot { readonly id: IDString }
interface ResourceSnapshot { readonly data: { readonly id: IDString } }
interface ResourceWriteWarning { readonly code: string; readonly message: string }

type ExtensiaErrorCode =
  | "CONFIG_INVALID" | "MODULE_BUSY" | "MODULE_INVALID_STATE"
  | "MODULE_NOT_READY" | "START_FAILED" | "STOP_FAILED"
  | "INVALID_RESOURCE_ID" | "RESOURCE_NOT_FOUND" | "STORAGE_READONLY"
  | "RESOURCE_INPUT_INVALID" | "RESOURCE_NO_CHANGES"
  | "RESOURCE_ID_GENERATION_FAILED" | "STORAGE_LOCK_FAILED"
  | "STORAGE_WRITE_FAILED" | "STORAGE_INTEGRITY_FAILED"
  | "RESOURCE_PARENT_NOT_FOUND" | "RESOURCE_MOVE_CYCLE"
  | "RESOURCE_ORDER_OUT_OF_RANGE" | "RESOURCE_HAS_CHILDREN"
  | "RESOURCE_ALREADY_DELETED" | "RESOURCE_ASSET_UPLOAD_ACTIVE"
  | "INVALID_ASSET_ID" | "ASSET_INPUT_INVALID" | "ASSET_URL_INVALID"
  | "ASSET_DATA_INVALID" | "ASSET_NOT_FOUND" | "ASSET_NO_CHANGES"
  | "ASSET_ID_GENERATION_FAILED" | "ASSET_PRIMARY_CONFLICT"
  | "ASSET_NOT_READY" | "ASSET_LINEAGE_INVALID"
  | "ASSET_LINEAGE_CONFLICT" | "ASSET_HAS_DERIVATIVES"
  | "ASSET_UPLOAD_ALREADY_ACTIVE" | "ASSET_UPLOAD_NOT_ACTIVE"
  | "ASSET_UPLOAD_INCOMPLETE" | "ASSET_FILE_NOT_READY";

interface ExtensiaError<TCode extends ExtensiaErrorCode = ExtensiaErrorCode> {
  readonly code: TCode;
  readonly message: string;
}
type ErrorOf<TCode extends ExtensiaErrorCode> = ExtensiaError<TCode>;
type ExtensiaResult<T, E extends ExtensiaError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

interface CreateAssetBaseInput {
  readonly type: string; readonly role: string;
  readonly mime: string | null; readonly extension: string | null;
  readonly derived_from?: string | null; readonly data?: JSONObject | null;
}
interface CreateExternalAssetInput extends CreateAssetBaseInput {
  readonly kind: "external"; readonly url: string; readonly is_primary?: boolean;
}
interface CreateInternalAssetInput extends CreateAssetBaseInput {
  readonly kind: "internal"; readonly is_primary?: false;
}
type CreateAssetInput = CreateExternalAssetInput | CreateInternalAssetInput;
interface UpdateAssetInput {
  readonly type?: string; readonly role?: string;
  readonly mime?: string | null; readonly extension?: string | null;
  readonly url?: string; readonly derived_from?: string | null;
  readonly data?: JSONObject | null;
}
interface AssetWriteSuccess {
  readonly committed: true; readonly operation_id: IDString;
  readonly asset: AssetSnapshot | null;
  readonly resources: readonly ResourceSnapshot[];
  readonly warnings: readonly ResourceWriteWarning[];
}

type AssetInfrastructureError =
  | ErrorOf<"MODULE_NOT_READY"> | ErrorOf<"STORAGE_READONLY">
  | ErrorOf<"INVALID_RESOURCE_ID"> | ErrorOf<"RESOURCE_NOT_FOUND">
  | ErrorOf<"STORAGE_LOCK_FAILED"> | ErrorOf<"STORAGE_WRITE_FAILED">
  | ErrorOf<"STORAGE_INTEGRITY_FAILED">;
type AssetExistingError = AssetInfrastructureError
  | ErrorOf<"INVALID_ASSET_ID"> | ErrorOf<"ASSET_NOT_FOUND">;
type AssetCreateError = AssetInfrastructureError
  | ErrorOf<"INVALID_ASSET_ID"> | ErrorOf<"ASSET_INPUT_INVALID">
  | ErrorOf<"ASSET_URL_INVALID"> | ErrorOf<"ASSET_DATA_INVALID">
  | ErrorOf<"ASSET_ID_GENERATION_FAILED"> | ErrorOf<"ASSET_PRIMARY_CONFLICT">
  | ErrorOf<"ASSET_LINEAGE_INVALID">;
type AssetUpdateError = AssetExistingError
  | ErrorOf<"ASSET_INPUT_INVALID"> | ErrorOf<"ASSET_URL_INVALID">
  | ErrorOf<"ASSET_DATA_INVALID"> | ErrorOf<"ASSET_NO_CHANGES">
  | ErrorOf<"ASSET_LINEAGE_INVALID">;
type AssetPrimaryError = AssetExistingError
  | ErrorOf<"ASSET_NO_CHANGES"> | ErrorOf<"ASSET_NOT_READY">;
type AssetReassignError = AssetExistingError
  | ErrorOf<"ASSET_NO_CHANGES"> | ErrorOf<"ASSET_LINEAGE_CONFLICT">
  | ErrorOf<"ASSET_UPLOAD_ALREADY_ACTIVE">;
type AssetDeleteError = AssetExistingError | ErrorOf<"ASSET_HAS_DERIVATIVES">;
type AssetCreateResult = ExtensiaResult<AssetWriteSuccess, AssetCreateError>;
type AssetUpdateResult = ExtensiaResult<AssetWriteSuccess, AssetUpdateError>;
type AssetPrimaryResult = ExtensiaResult<AssetWriteSuccess, AssetPrimaryError>;
type AssetReassignResult = ExtensiaResult<AssetWriteSuccess, AssetReassignError>;
type AssetDeleteResult = ExtensiaResult<AssetWriteSuccess, AssetDeleteError>;

interface StorageFacade {
  createAsset(resourceId: string, input: CreateAssetInput): Promise<AssetCreateResult>;
  updateAsset(resourceId: string, assetId: string, patch: UpdateAssetInput): Promise<AssetUpdateResult>;
  setPrimaryAsset(resourceId: string, assetId: string | null): Promise<AssetPrimaryResult>;
  reassignAsset(sourceResourceId: string, assetId: string, destinationResourceId: string): Promise<AssetReassignResult>;
  deleteAsset(resourceId: string, assetId: string): Promise<AssetDeleteResult>;
}

declare const assetUploadHandleBrand: unique symbol;
interface AssetUploadHandle {
  readonly [assetUploadHandleBrand]: "AssetUploadHandle";
  readonly resource_id: IDString; readonly asset_id: IDString; readonly upload_id: IDString;
}
interface AssetUploadBeginSuccess { readonly write: AssetWriteSuccess; readonly handle: AssetUploadHandle }
type AssetUploadError = AssetExistingError
  | ErrorOf<"ASSET_NOT_READY"> | ErrorOf<"ASSET_UPLOAD_ALREADY_ACTIVE">
  | ErrorOf<"ASSET_UPLOAD_NOT_ACTIVE"> | ErrorOf<"ASSET_UPLOAD_INCOMPLETE">;
type AssetUploadBeginResult = ExtensiaResult<AssetUploadBeginSuccess, AssetUploadError>;
type AssetUploadTransitionResult = ExtensiaResult<AssetWriteSuccess, AssetUploadError>;
type AssetUploadHandleResult = ExtensiaResult<AssetUploadHandle, AssetUploadError>;

type ResourceDeleteError =
  | ErrorOf<"MODULE_NOT_READY"> | ErrorOf<"STORAGE_READONLY">
  | ErrorOf<"INVALID_RESOURCE_ID"> | ErrorOf<"RESOURCE_NOT_FOUND">
  | ErrorOf<"RESOURCE_HAS_CHILDREN"> | ErrorOf<"RESOURCE_ASSET_UPLOAD_ACTIVE">
  | ErrorOf<"RESOURCE_ALREADY_DELETED"> | ErrorOf<"STORAGE_LOCK_FAILED">
  | ErrorOf<"STORAGE_WRITE_FAILED"> | ErrorOf<"STORAGE_INTEGRITY_FAILED">;

declare const storage: StorageFacade;
void storage;
type Probe = AssetUploadBeginResult | AssetUploadTransitionResult | AssetUploadHandleResult | ResourceDeleteError;
export type { Probe };
