import { defineModule, type Token } from "@sagifire/ioc";

import { createExtensiaInternalNamespace } from "../composition/tokens.js";
import type {
  ResourceSnapshot,
  ResourceTreeViewSnapshot,
} from "../domain/snapshots.js";
import {
  LIFECYCLE_CONTRIBUTIONS,
  lifecycleContribution,
  type LifecycleContribution,
} from "../runtime/lifecycle.js";
import {
  CORE_RESOURCE_READ_PORT,
  type CoreReadResult,
  type CoreResourceReadPort,
  type GetResourceReadRequest,
  type GetResourceTreeReadRequest,
} from "../system-extensions/default-api/resource-read-port.js";
import {
  createGreedyResourceIndex,
  type GreedyResourceIndex,
} from "./resource-index.js";

export interface ReadonlyResourceDriver {
  readonly mode: "readonly";
  open(): Promise<void>;
  close(): Promise<void>;
  listResources(): AsyncIterable<ResourceSnapshot>;
}

interface ResourceReadRuntime {
  readonly port: CoreResourceReadPort;
  readonly lifecycle: LifecycleContribution;
}

const resourceReadTokens =
  createExtensiaInternalNamespace("core.resource-read");

export const READONLY_RESOURCE_DRIVER: Token<ReadonlyResourceDriver> =
  resourceReadTokens.token<ReadonlyResourceDriver>("readonly-resource-driver");

const RESOURCE_READ_RUNTIME: Token<ResourceReadRuntime> =
  resourceReadTokens.token<ResourceReadRuntime>("runtime");

function notFound<T>(): CoreReadResult<T> {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code: "RESOURCE_NOT_FOUND" }),
  });
}

function found<T>(value: T): CoreReadResult<T> {
  return Object.freeze({ ok: true, value });
}

function createReadPort(index: GreedyResourceIndex): CoreResourceReadPort {
  class ResourceReadPort implements CoreResourceReadPort {
    async read(
      request: GetResourceReadRequest,
    ): Promise<CoreReadResult<ResourceSnapshot>>;
    async read(
      request: GetResourceTreeReadRequest,
    ): Promise<CoreReadResult<ResourceTreeViewSnapshot>>;
    async read(
      request: GetResourceReadRequest | GetResourceTreeReadRequest,
    ): Promise<CoreReadResult<ResourceSnapshot | ResourceTreeViewSnapshot>> {
      if (request.type === "resource.get") {
        const resource = index.getResource(request.id);
        return resource === undefined ? notFound() : found(resource);
      }

      if (request.type === "resource.tree.get") {
        const tree = index.getResourceTree(request.id);
        return tree === undefined ? notFound() : found(tree);
      }

      const unsupportedRequest: never = request;
      void unsupportedRequest;
      throw new TypeError("Unsupported Core Resource read request");
    }
  }

  return Object.freeze(new ResourceReadPort());
}

function createResourceReadRuntime(
  driver: ReadonlyResourceDriver,
): ResourceReadRuntime {
  const index = createGreedyResourceIndex();
  const port = createReadPort(index);

  async function closeAfterRejectedStart(): Promise<void> {
    index.clear();
    try {
      await driver.close();
    } catch {
      // Existing lifecycle diagnostics remain safe and authoritative.
    }
  }

  return Object.freeze({
    port,
    lifecycle: lifecycleContribution({
      id: "core.resource-read",
      order: 30,
      async start(): Promise<void> {
        try {
          await driver.open();
          await index.initialize(driver.listResources());
        } catch {
          await closeAfterRejectedStart();
          throw new Error("Readonly Resource initialization failed");
        }
      },
      async stop(): Promise<void> {
        try {
          await driver.close();
        } finally {
          index.clear();
        }
      },
    }),
  });
}

export const READONLY_RESOURCE_CORE_MODULE: ReturnType<typeof defineModule> =
  defineModule({
    id: "extensia.core.resource-read",
    requires: [{ token: READONLY_RESOURCE_DRIVER }],
    provides: [
      { token: CORE_RESOURCE_READ_PORT, kind: "public-api" },
      {
        token: LIFECYCLE_CONTRIBUTIONS,
        kind: "admin-contribution",
        cardinality: "multi",
      },
    ],
    setup(context) {
      context
        .bind(RESOURCE_READ_RUNTIME)
        .toFactory(({ get }) =>
          createResourceReadRuntime(get(READONLY_RESOURCE_DRIVER)),
        )
        .singleton();
      context
        .bind(CORE_RESOURCE_READ_PORT)
        .toFactory(({ get }) => get(RESOURCE_READ_RUNTIME).port)
        .singleton();
      context
        .add(LIFECYCLE_CONTRIBUTIONS)
        .toFactory(({ get }) => get(RESOURCE_READ_RUNTIME).lifecycle)
        .singleton();
    },
  });
