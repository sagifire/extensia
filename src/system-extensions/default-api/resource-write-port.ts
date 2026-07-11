import type { Token } from "@sagifire/ioc";

import { createExtensiaInternalNamespace } from "../../composition/tokens.js";
import type { IDString } from "../../domain/scalars.js";
import type { ResourceSnapshot } from "../../domain/snapshots.js";
import type { MarkSnapshot } from "../../domain/snapshots.js";

const defaultApiTokens = createExtensiaInternalNamespace(
  "system-extensions.default-api",
);

export interface CreateResourceWriteRequest {
  readonly type: "resource.create";
  readonly title: string;
  readonly description?: string | null;
  readonly fail_integrity?: RuntimeIntegrityFailureHandler;
}

export type RuntimeIntegrityFailureHandler = (input: {
  readonly code: "RESOURCE_STORAGE_INTEGRITY" | "RESOURCE_INDEX_INTEGRITY";
  readonly operation_id: IDString;
}) => void;

export interface UpdateResourceWriteRequest {
  readonly type: "resource.update";
  readonly id: IDString;
  readonly patch: {
    readonly title?: string;
    readonly description?: string | null;
  };
  readonly fail_integrity?: RuntimeIntegrityFailureHandler;
}

export interface MoveResourceWriteRequest {
  readonly type: "resource.move";
  readonly id: IDString;
  readonly parent_id: IDString | null;
  readonly order_index: number;
  readonly fail_integrity?: RuntimeIntegrityFailureHandler;
}
export interface SetMarksWriteRequest {
  readonly type: "resource.marks.set";
  readonly id: IDString;
  readonly marks: readonly MarkSnapshot[];
  readonly fail_integrity?: RuntimeIntegrityFailureHandler;
}
export interface SetKVWriteRequest {
  readonly type: "resource.kv.set";
  readonly id: IDString;
  readonly namespace: string;
  readonly values: Readonly<Record<string, string>>;
  readonly fail_integrity?: RuntimeIntegrityFailureHandler;
}

export type CoreResourceWriteRequest =
  | CreateResourceWriteRequest
  | UpdateResourceWriteRequest
  | MoveResourceWriteRequest
  | SetMarksWriteRequest
  | SetKVWriteRequest;
export type CoreResourceWriteFailureCode =
  | "RESOURCE_INPUT_INVALID"
  | "RESOURCE_NOT_FOUND"
  | "RESOURCE_NO_CHANGES"
  | "RESOURCE_PARENT_NOT_FOUND"
  | "RESOURCE_MOVE_CYCLE"
  | "RESOURCE_ORDER_OUT_OF_RANGE"
  | "RESOURCE_ID_GENERATION_FAILED"
  | "STORAGE_LOCK_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "STORAGE_INTEGRITY_FAILED";

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
