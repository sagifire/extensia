import { createHash } from "node:crypto";

import type { IDString } from "../domain/scalars.js";

export const ASSET_UPLOAD_CHUNK_BYTES: number = 64 * 1024;
export const ASSET_UPLOAD_MAX_BYTES: number = 16 * 1024 * 1024;
export const ASSET_UPLOAD_MAX_CHUNKS: number =
  ASSET_UPLOAD_MAX_BYTES / ASSET_UPLOAD_CHUNK_BYTES;

export interface AssetUploadHandle {
  readonly resource_id: IDString;
  readonly asset_id: IDString;
  readonly upload_id: IDString;
}

export interface StagedAssetUpload {
  readonly byte_length: number;
  readonly digest: string;
}

export interface AssetUploadSessionCapability {
  ownsHandle(handle: AssetUploadHandle): boolean;
  issueHandle(
    resourceId: IDString,
    assetId: IDString,
    uploadId: IDString,
  ): AssetUploadHandle;
  resolveActiveUpload(
    resourceId: IDString,
    assetId: IDString,
  ): Promise<AssetUploadHandle | null>;
  stageBytes(
    handle: AssetUploadHandle,
    bytes: Uint8Array,
  ): Promise<StagedAssetUpload | null>;
  inspectStagedUpload(
    handle: AssetUploadHandle,
  ): Promise<StagedAssetUpload | null>;
  readCommitted(
    resourceId: IDString,
    assetId: IDString,
  ): Promise<Uint8Array | null>;
}

export type AssetUploadHandleAuthority = object;

const handleAuthorities = new WeakMap<object, AssetUploadHandleAuthority>();
const sessionCapabilities = new WeakMap<object, AssetUploadSessionCapability>();

export function createAssetUploadHandleAuthority(): AssetUploadHandleAuthority {
  return Object.freeze(Object.create(null) as object);
}

export function createAssetUploadHandle(
  input: {
    readonly resource_id: IDString;
    readonly asset_id: IDString;
    readonly upload_id: IDString;
  },
  authority: AssetUploadHandleAuthority,
): AssetUploadHandle {
  const handle = Object.create(null) as AssetUploadHandle;
  Object.defineProperties(handle, {
    asset_id: {
      configurable: false,
      enumerable: false,
      value: input.asset_id,
      writable: false,
    },
    resource_id: {
      configurable: false,
      enumerable: false,
      value: input.resource_id,
      writable: false,
    },
    upload_id: {
      configurable: false,
      enumerable: false,
      value: input.upload_id,
      writable: false,
    },
  });
  Object.freeze(handle);
  handleAuthorities.set(handle, authority);
  return handle;
}

export function isAssetUploadHandle(
  value: unknown,
  authority?: AssetUploadHandleAuthority,
): value is AssetUploadHandle {
  if (typeof value !== "object" || value === null) return false;
  const owner = handleAuthorities.get(value);
  return (
    owner !== undefined && (authority === undefined || owner === authority)
  );
}

export function attachAssetUploadSessionCapability<TSession extends object>(
  session: TSession,
  capability: AssetUploadSessionCapability,
): TSession {
  sessionCapabilities.set(session, Object.freeze(capability));
  return session;
}

export function resolveAssetUploadSessionCapability(
  session: object,
): AssetUploadSessionCapability | null {
  return sessionCapabilities.get(session) ?? null;
}

export function validateAssetUploadBytes(bytes: Uint8Array): void {
  if (bytes.byteLength > ASSET_UPLOAD_MAX_BYTES) {
    throw new RangeError("Asset upload exceeds the bounded payload limit");
  }
}

export function assetUploadDigest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function assetUploadChunkCount(byteLength: number): number {
  return byteLength === 0
    ? 0
    : Math.ceil(byteLength / ASSET_UPLOAD_CHUNK_BYTES);
}
