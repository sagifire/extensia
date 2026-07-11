import {
  defineModule,
  type ContributionToken,
  type Token,
} from "@sagifire/ioc";

import {
  createExtensiaInternalNamespace,
  synchronousContributionToken,
} from "../../composition/tokens.js";
import { parseIDString } from "../../domain/scalars.js";
import type {
  ResourceSnapshot,
  ResourceTreeViewSnapshot,
} from "../../domain/snapshots.js";
import {
  createFacadeRuntime,
  facadeHandle,
  facadeProvider,
  FACADE_PROVIDER_CONTRIBUTIONS,
  FACADE_REGISTRY_ACCESS,
  type FacadeFactoryContext,
  type FacadeProvider,
  type FacadeRuntime,
} from "../../runtime/facades.js";
import { LIFECYCLE_CONTRIBUTIONS } from "../../runtime/lifecycle.js";
import {
  CORE_RESOURCE_READ_PORT,
  type CoreResourceReadPort,
} from "./resource-read-port.js";
import {
  CORE_RESOURCE_WRITE_PORT,
  type CoreResourceWritePort,
  type CoreResourceWriteFailureCode,
} from "./resource-write-port.js";

const defaultApiFacadeTokens = createExtensiaInternalNamespace(
  "system-extensions.default-api.facades",
);
const SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS: ContributionToken<FacadeProvider> =
  synchronousContributionToken<FacadeProvider>(
    defaultApiFacadeTokens,
    "system-providers",
  );
const FACADE_RUNTIME: Token<FacadeRuntime> =
  defaultApiFacadeTokens.token<FacadeRuntime>("runtime");

export type DefaultApiFailureCode =
  | "MODULE_NOT_READY"
  | "INVALID_RESOURCE_ID"
  | "RESOURCE_NOT_FOUND"
  | "STORAGE_READONLY"
  | CoreResourceWriteFailureCode;

export interface DefaultApiFailure<
  TCode extends DefaultApiFailureCode = DefaultApiFailureCode,
> {
  readonly code: TCode;
  readonly message: string;
}

export type DefaultApiResult<
  TValue,
  TFailure extends DefaultApiFailure = DefaultApiFailure,
> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TFailure };

type ModuleNotReadyFailure = DefaultApiFailure<"MODULE_NOT_READY">;
type InvalidResourceIDFailure = DefaultApiFailure<"INVALID_RESOURCE_ID">;
type ResourceNotFoundFailure = DefaultApiFailure<"RESOURCE_NOT_FOUND">;
type StorageReadonlyFailure = DefaultApiFailure<"STORAGE_READONLY">;

export interface QueryFacade {
  getResource(
    id: string,
  ): Promise<
    DefaultApiResult<
      ResourceSnapshot,
      ModuleNotReadyFailure | InvalidResourceIDFailure | ResourceNotFoundFailure
    >
  >;
  getResourceTree(
    id: string,
  ): Promise<
    DefaultApiResult<
      ResourceTreeViewSnapshot,
      ModuleNotReadyFailure | InvalidResourceIDFailure | ResourceNotFoundFailure
    >
  >;
}

export interface StorageFacade {
  createResource(
    input: unknown,
  ): Promise<
    DefaultApiResult<DefaultResourceWriteSuccess, CreateResourceFailure>
  >;
}

interface DefaultResourceWriteSuccess {
  readonly committed: true;
  readonly operation_id: import("../../domain/scalars.js").IDString;
  readonly resource: ResourceSnapshot;
  readonly warnings: readonly {
    readonly code:
      "LOCAL_INDEX_PUBLICATION_FAILED" | "POST_COMMIT_CLEANUP_FAILED";
    readonly message: string;
  }[];
}

type CreateResourceFailure =
  | ModuleNotReadyFailure
  | StorageReadonlyFailure
  | DefaultApiFailure<"RESOURCE_INPUT_INVALID">
  | DefaultApiFailure<"RESOURCE_ID_GENERATION_FAILED">
  | DefaultApiFailure<"STORAGE_LOCK_FAILED">
  | DefaultApiFailure<"STORAGE_WRITE_FAILED">;

export const QUERY_FACADE: ReturnType<typeof facadeHandle<QueryFacade>> =
  facadeHandle<QueryFacade>("query");
export const STORAGE_FACADE: ReturnType<typeof facadeHandle<StorageFacade>> =
  facadeHandle<StorageFacade>("storage");

function failure<TCode extends DefaultApiFailureCode>(
  code: TCode,
  message: string,
): DefaultApiResult<never, DefaultApiFailure<TCode>> {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code, message }),
  });
}

function notReady(): DefaultApiResult<never, ModuleNotReadyFailure> {
  return failure("MODULE_NOT_READY", "Extensia is not ready");
}

function invalidResourceID(): DefaultApiResult<
  never,
  InvalidResourceIDFailure
> {
  return failure("INVALID_RESOURCE_ID", "Resource ID is invalid");
}

function createQueryFacade(
  port: CoreResourceReadPort,
  context: FacadeFactoryContext,
): QueryFacade {
  async function getResource(
    rawId: string,
  ): ReturnType<QueryFacade["getResource"]> {
    const lease = context.operations.acquire();
    if (lease === null) return notReady();

    try {
      let id;
      try {
        id = parseIDString(rawId);
      } catch {
        return invalidResourceID();
      }

      const result = await port.read({ type: "resource.get", id });
      return result.ok
        ? Object.freeze({ ok: true, value: result.value })
        : failure("RESOURCE_NOT_FOUND", "Resource was not found");
    } finally {
      lease.release();
    }
  }

  async function getResourceTree(
    rawId: string,
  ): ReturnType<QueryFacade["getResourceTree"]> {
    const lease = context.operations.acquire();
    if (lease === null) return notReady();

    try {
      let id;
      try {
        id = parseIDString(rawId);
      } catch {
        return invalidResourceID();
      }

      const result = await port.read({ type: "resource.tree.get", id });
      return result.ok
        ? Object.freeze({ ok: true, value: result.value })
        : failure("RESOURCE_NOT_FOUND", "Resource was not found");
    } finally {
      lease.release();
    }
  }

  return Object.freeze({ getResource, getResourceTree });
}

function parseCreateInput(
  input: unknown,
): { title: string; description?: string | null } | null {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return null;
  const keys = Reflect.ownKeys(input);
  if (
    keys.some(
      (key) =>
        typeof key !== "string" || (key !== "title" && key !== "description"),
    )
  )
    return null;
  const title = Object.getOwnPropertyDescriptor(input, "title");
  if (
    title === undefined ||
    !("value" in title) ||
    typeof title.value !== "string" ||
    title.value.trim().length === 0
  )
    return null;
  const description = Object.getOwnPropertyDescriptor(input, "description");
  if (
    description !== undefined &&
    (!("value" in description) ||
      (description.value !== null && typeof description.value !== "string"))
  )
    return null;
  return Object.freeze({
    title: title.value,
    ...(description === undefined
      ? {}
      : { description: description.value as string | null }),
  });
}

function createStorageFacade(
  context: FacadeFactoryContext,
  port: CoreResourceWritePort | null,
): StorageFacade {
  return Object.freeze({
    async createResource(
      input: unknown,
    ): ReturnType<StorageFacade["createResource"]> {
      const lease = context.operations.acquire();
      if (lease === null) return notReady();

      try {
        if (port === null)
          return failure(
            "STORAGE_READONLY",
            "Resource storage is readonly in this runtime",
          );
        const parsed = parseCreateInput(input);
        if (parsed === null)
          return failure("RESOURCE_INPUT_INVALID", "Resource input is invalid");
        const result = await port.write({ type: "resource.create", ...parsed });
        if (!result.ok) return createWriteFailure(result.error.code);
        if (result.value.warnings.length > 0) context.failClose();
        return Object.freeze({
          ok: true,
          value: Object.freeze({
            committed: true,
            operation_id: result.value.operation_id,
            resource: result.value.resource,
            warnings: Object.freeze(
              result.value.warnings.map((code) =>
                Object.freeze({
                  code,
                  message:
                    code === "LOCAL_INDEX_PUBLICATION_FAILED"
                      ? "Committed Resource could not be published to the local index"
                      : "Committed Resource cleanup failed",
                }),
              ),
            ),
          }),
        });
      } finally {
        lease.release();
      }
    },
  });
}

function messageForWriteFailure(code: CoreResourceWriteFailureCode): string {
  switch (code) {
    case "RESOURCE_INPUT_INVALID":
      return "Resource input is invalid";
    case "RESOURCE_NOT_FOUND":
      return "Resource was not found";
    case "RESOURCE_NO_CHANGES":
      return "Resource update has no changes";
    case "RESOURCE_ID_GENERATION_FAILED":
      return "Resource ID generation failed";
    case "STORAGE_LOCK_FAILED":
      return "Resource storage lock failed";
    case "STORAGE_WRITE_FAILED":
      return "Resource storage write failed";
  }
}

function createWriteFailure(
  code: CoreResourceWriteFailureCode,
): DefaultApiResult<never, CreateResourceFailure> {
  switch (code) {
    case "RESOURCE_INPUT_INVALID":
      return failure(code, messageForWriteFailure(code));
    case "RESOURCE_ID_GENERATION_FAILED":
      return failure(code, messageForWriteFailure(code));
    case "STORAGE_LOCK_FAILED":
      return failure(code, messageForWriteFailure(code));
    case "STORAGE_WRITE_FAILED":
      return failure(code, messageForWriteFailure(code));
    case "RESOURCE_NOT_FOUND":
    case "RESOURCE_NO_CHANGES":
      return failure(
        "STORAGE_WRITE_FAILED",
        messageForWriteFailure("STORAGE_WRITE_FAILED"),
      );
  }
}

function queryProvider(
  port: CoreResourceReadPort,
): FacadeProvider<QueryFacade> {
  return facadeProvider({
    handle: QUERY_FACADE,
    owner: "extensia.default-api",
    dependencies: [],
    create(context): QueryFacade {
      return createQueryFacade(port, context);
    },
  });
}

function storageProvider(
  port: CoreResourceWritePort | null,
): FacadeProvider<StorageFacade> {
  return facadeProvider({
    handle: STORAGE_FACADE,
    owner: "extensia.default-api",
    dependencies: [],
    create(context): StorageFacade {
      return createStorageFacade(context, port);
    },
  });
}

export const DEFAULT_API_SYSTEM_EXTENSION_MODULE: ReturnType<
  typeof defineModule
> = defineModule({
  id: "extensia.default-api",
  requires: [{ token: CORE_RESOURCE_READ_PORT }],
  provides: [
    {
      token: SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS,
      kind: "admin-contribution",
      cardinality: "multi",
    },
  ],
  setup(context) {
    context
      .add(SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS)
      .toFactory(({ get }) => queryProvider(get(CORE_RESOURCE_READ_PORT)))
      .singleton();
    context
      .add(SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS)
      .toValue(storageProvider(null));
  },
});

export const FULL_DEFAULT_API_SYSTEM_EXTENSION_MODULE: ReturnType<
  typeof defineModule
> = defineModule({
  id: "extensia.default-api.full",
  requires: [
    { token: CORE_RESOURCE_READ_PORT },
    { token: CORE_RESOURCE_WRITE_PORT },
  ],
  provides: [
    {
      token: SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS,
      kind: "admin-contribution",
      cardinality: "multi",
    },
  ],
  setup(context) {
    context
      .add(SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS)
      .toFactory(({ get }) => queryProvider(get(CORE_RESOURCE_READ_PORT)))
      .singleton();
    context
      .add(SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS)
      .toFactory(({ get }) => storageProvider(get(CORE_RESOURCE_WRITE_PORT)))
      .singleton();
  },
});

export const DEFAULT_API_FACADE_REGISTRY_MODULE: ReturnType<
  typeof defineModule
> = defineModule({
  id: "extensia.runtime.facades",
  requires: [
    {
      token: SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS,
      cardinality: "multi",
    },
    {
      token: FACADE_PROVIDER_CONTRIBUTIONS,
      cardinality: "multi",
      required: false,
    },
  ],
  provides: [
    { token: FACADE_REGISTRY_ACCESS, kind: "shared-service" },
    {
      token: LIFECYCLE_CONTRIBUTIONS,
      kind: "admin-contribution",
      cardinality: "multi",
    },
  ],
  setup(context) {
    context
      .bind(FACADE_RUNTIME)
      .toFactory(({ getAll }) =>
        createFacadeRuntime(
          getAll(SYSTEM_FACADE_PROVIDER_CONTRIBUTIONS),
          getAll(FACADE_PROVIDER_CONTRIBUTIONS),
        ),
      )
      .singleton();
    context
      .bind(FACADE_REGISTRY_ACCESS)
      .toFactory(({ get }) => get(FACADE_RUNTIME).access)
      .singleton();
    context
      .add(LIFECYCLE_CONTRIBUTIONS)
      .toFactory(({ get }) => get(FACADE_RUNTIME).lifecycle)
      .singleton();
  },
});
