import type { Token } from "@sagifire/ioc";

import { createExtensiaInternalNamespace } from "../composition/tokens.js";
import type { IDString, Timestamp } from "../domain/scalars.js";

const operationTokens = createExtensiaInternalNamespace(
  "operations.resource-write",
);

export interface ResourceOperationIdentity {
  readonly operation_id: IDString;
  readonly actor_id: IDString;
}

export interface ResourceOperationIdentitySource {
  create(): ResourceOperationIdentity;
}

export interface OperationClock {
  now(): Timestamp;
}

export const RESOURCE_OPERATION_IDENTITY_SOURCE: Token<ResourceOperationIdentitySource> =
  operationTokens.token<ResourceOperationIdentitySource>("identity-source");
export const OPERATION_CLOCK: Token<OperationClock> =
  operationTokens.token<OperationClock>("clock");
