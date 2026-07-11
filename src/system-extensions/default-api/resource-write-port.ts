import type { Token } from "@sagifire/ioc";

import { createExtensiaInternalNamespace } from "../../composition/tokens.js";
import type { IDString } from "../../domain/scalars.js";
import type { ResourceSnapshot } from "../../domain/snapshots.js";

const defaultApiTokens = createExtensiaInternalNamespace(
  "system-extensions.default-api",
);

export interface CreateResourceWriteRequest {
  readonly type: "resource.create";
  readonly title: string;
  readonly description?: string | null;
}

export interface UpdateResourceWriteRequest {
  readonly type: "resource.update";
  readonly id: IDString;
  readonly patch: {
    readonly title?: string;
    readonly description?: string | null;
  };
}

export type CoreResourceWriteRequest =
  CreateResourceWriteRequest | UpdateResourceWriteRequest;
export type CoreResourceWriteFailureCode =
  | "RESOURCE_INPUT_INVALID"
  | "RESOURCE_NOT_FOUND"
  | "RESOURCE_NO_CHANGES"
  | "RESOURCE_ID_GENERATION_FAILED"
  | "STORAGE_LOCK_FAILED"
  | "STORAGE_WRITE_FAILED";

export interface CoreResourceWriteFailure {
  readonly code: CoreResourceWriteFailureCode;
}

export interface CoreResourceWriteSuccess {
  readonly operation_id: IDString;
  readonly resource: ResourceSnapshot;
  readonly warnings: readonly (
    "LOCAL_INDEX_PUBLICATION_FAILED" | "POST_COMMIT_CLEANUP_FAILED"
  )[];
}

export type CoreResourceWriteResult =
  | { readonly ok: true; readonly value: CoreResourceWriteSuccess }
  | { readonly ok: false; readonly error: CoreResourceWriteFailure };

export interface CoreResourceWritePort {
  write(request: CoreResourceWriteRequest): Promise<CoreResourceWriteResult>;
}

export const CORE_RESOURCE_WRITE_PORT: Token<CoreResourceWritePort> =
  defaultApiTokens.token<CoreResourceWritePort>("core-resource-write-port");
