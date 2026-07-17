import type { Token } from "@sagifire/ioc";

import { createExtensiaInternalNamespace } from "../../composition/tokens.js";
import type { IDString } from "../../domain/scalars.js";
import type { AssetUploadHandle } from "../../storage/asset-upload-capability.js";
import type { RuntimeIntegrityFailureHandler } from "./resource-write-port.js";
import type { CoreAssetWriteSuccess } from "./asset-write-port.js";

const tokens = createExtensiaInternalNamespace(
  "system-extensions.default-api.asset-upload",
);

export type CoreAssetUploadFailureCode =
  | "RESOURCE_NOT_FOUND"
  | "ASSET_NOT_FOUND"
  | "ASSET_NOT_READY"
  | "ASSET_UPLOAD_ALREADY_ACTIVE"
  | "ASSET_UPLOAD_NOT_ACTIVE"
  | "ASSET_UPLOAD_INCOMPLETE"
  | "ASSET_FILE_NOT_READY"
  | "STORAGE_LOCK_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "STORAGE_INTEGRITY_FAILED";

export type CoreAssetUploadResult<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | {
      readonly ok: false;
      readonly error: { readonly code: CoreAssetUploadFailureCode };
    };

export interface AssetUploadBeginSuccess {
  readonly handle: AssetUploadHandle;
  readonly write: CoreAssetWriteSuccess;
}

export interface AssetUploadStageSuccess {
  readonly handle: AssetUploadHandle;
  readonly byte_length: number;
  readonly digest: string;
}

export interface AssetUploadReadSuccess {
  readonly asset_id: IDString;
  readonly bytes: Uint8Array;
}

export interface CoreAssetUploadPort {
  begin(
    resourceId: IDString,
    assetId: IDString,
    failIntegrity?: RuntimeIntegrityFailureHandler,
  ): Promise<CoreAssetUploadResult<AssetUploadBeginSuccess>>;
  resolve(
    resourceId: IDString,
    assetId: IDString,
    failIntegrity?: RuntimeIntegrityFailureHandler,
  ): Promise<CoreAssetUploadResult<AssetUploadHandle>>;
  stage(
    handle: AssetUploadHandle,
    bytes: Uint8Array,
    failIntegrity?: RuntimeIntegrityFailureHandler,
  ): Promise<CoreAssetUploadResult<AssetUploadStageSuccess>>;
  finish(
    handle: AssetUploadHandle,
    failIntegrity?: RuntimeIntegrityFailureHandler,
  ): Promise<CoreAssetUploadResult<CoreAssetWriteSuccess>>;
  abort(
    handle: AssetUploadHandle,
    failIntegrity?: RuntimeIntegrityFailureHandler,
  ): Promise<CoreAssetUploadResult<CoreAssetWriteSuccess>>;
  read(
    resourceId: IDString,
    assetId: IDString,
    failIntegrity?: RuntimeIntegrityFailureHandler,
  ): Promise<CoreAssetUploadResult<AssetUploadReadSuccess>>;
}

export const CORE_ASSET_UPLOAD_PORT: Token<CoreAssetUploadPort> =
  tokens.token<CoreAssetUploadPort>("port");
