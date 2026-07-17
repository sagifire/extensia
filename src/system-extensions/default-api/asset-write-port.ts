import type { Token } from "@sagifire/ioc";

import { createExtensiaInternalNamespace } from "../../composition/tokens.js";
import type { JSONObject } from "../../domain/json.js";
import type { IDString } from "../../domain/scalars.js";
import type {
  AssetSnapshot,
  ResourceSnapshot,
} from "../../domain/snapshots.js";
import type { RuntimeIntegrityFailureHandler } from "./resource-write-port.js";

const defaultApiTokens = createExtensiaInternalNamespace(
  "system-extensions.default-api",
);

export interface NormalizedCreateAssetInput {
  readonly kind: "external" | "internal";
  readonly type: string;
  readonly role: string;
  readonly mime: string | null;
  readonly extension: string | null;
  readonly url: string | null;
  readonly derived_from: IDString | null;
  readonly data: JSONObject | null;
  readonly is_primary: boolean;
}

export interface NormalizedUpdateAssetPatch {
  readonly type?: string;
  readonly role?: string;
  readonly mime?: string | null;
  readonly extension?: string | null;
  readonly url?: string;
  readonly derived_from?: IDString | null;
  readonly data?: JSONObject | null;
}

export type CoreAssetWriteRequest =
  | {
      readonly type: "asset.create";
      readonly resource_id: IDString;
      readonly input: NormalizedCreateAssetInput;
      readonly fail_integrity?: RuntimeIntegrityFailureHandler;
    }
  | {
      readonly type: "asset.update";
      readonly resource_id: IDString;
      readonly asset_id: IDString;
      readonly patch: NormalizedUpdateAssetPatch;
      readonly fail_integrity?: RuntimeIntegrityFailureHandler;
    }
  | {
      readonly type: "asset.primary.set";
      readonly resource_id: IDString;
      readonly asset_id: IDString | null;
      readonly fail_integrity?: RuntimeIntegrityFailureHandler;
    }
  | {
      readonly type: "asset.reassign";
      readonly source_resource_id: IDString;
      readonly asset_id: IDString;
      readonly destination_resource_id: IDString;
      readonly fail_integrity?: RuntimeIntegrityFailureHandler;
    }
  | {
      readonly type: "asset.delete";
      readonly resource_id: IDString;
      readonly asset_id: IDString;
      readonly fail_integrity?: RuntimeIntegrityFailureHandler;
    };

export type CoreAssetWriteFailureCode =
  | "RESOURCE_NOT_FOUND"
  | "ASSET_INPUT_INVALID"
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
  | "STORAGE_LOCK_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "STORAGE_INTEGRITY_FAILED";

export interface CoreAssetWriteSuccess {
  readonly operation_id: IDString;
  readonly asset: AssetSnapshot | null;
  readonly resources: readonly ResourceSnapshot[];
  readonly warnings: readonly (
    "LOCAL_INDEX_PUBLICATION_FAILED" | "POST_COMMIT_CLEANUP_FAILED"
  )[];
}

export type CoreAssetWriteResult =
  | { readonly ok: true; readonly value: CoreAssetWriteSuccess }
  | {
      readonly ok: false;
      readonly error: { readonly code: CoreAssetWriteFailureCode };
    };

export interface CoreAssetWritePort {
  write(request: CoreAssetWriteRequest): Promise<CoreAssetWriteResult>;
}

export const CORE_ASSET_WRITE_PORT: Token<CoreAssetWritePort> =
  defaultApiTokens.token<CoreAssetWritePort>("core-asset-write-port");
