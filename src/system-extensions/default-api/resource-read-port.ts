import { type Token } from "@sagifire/ioc";

import { createExtensiaInternalNamespace } from "../../composition/tokens.js";
import type { IDString } from "../../domain/scalars.js";
import type {
  ResourceSnapshot,
  ResourceTreeViewSnapshot,
} from "../../domain/snapshots.js";

const defaultApiTokens = createExtensiaInternalNamespace(
  "system-extensions.default-api",
);

export const CORE_RESOURCE_READ_PORT: Token<CoreResourceReadPort> =
  defaultApiTokens.token<CoreResourceReadPort>("core-resource-read-port");

export interface GetResourceReadRequest {
  readonly type: "resource.get";
  readonly id: IDString;
}

export interface GetResourceTreeReadRequest {
  readonly type: "resource.tree.get";
  readonly id: IDString;
}

export interface CoreReadFailure {
  readonly code: "RESOURCE_NOT_FOUND";
}

export type CoreReadResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: CoreReadFailure };

export interface CoreResourceReadPort {
  read(
    request: GetResourceReadRequest,
  ): Promise<CoreReadResult<ResourceSnapshot>>;
  read(
    request: GetResourceTreeReadRequest,
  ): Promise<CoreReadResult<ResourceTreeViewSnapshot>>;
}
