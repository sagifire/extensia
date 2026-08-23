import { defineModule, type Token } from "@sagifire/ioc";

import { createExtensiaInternalNamespace } from "../composition/tokens.js";
import { validateAssetSnapshotStorageInvariants } from "../domain/asset-metadata.js";
import type {
  ResourceSnapshot,
  ResourceTreeViewSnapshot,
} from "../domain/snapshots.js";
import { buildResourceSnapshot } from "../domain/snapshots.js";
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
import {
  CORE_METADATA_OBSERVATION_PORT,
  READONLY_COHERENT_METADATA_SNAPSHOT,
  type CoreMetadataObservationPort,
  type ReadonlyCoherentMetadataSnapshot,
} from "./read-model-observation.js";
import { createReadonlyMetadataObservationPort } from "./read-model-storage-observation.js";
import {
  createRuntimeFaultSink,
  RUNTIME_FAULT_SINK,
  RUNTIME_FAULT_SINK_CONTRIBUTIONS,
  type RuntimeFaultSink,
} from "./runtime-fault-sink.js";

export interface ReadonlyResourceDriver {
  readonly mode: "readonly";
  open(): Promise<void>;
  close(): Promise<void>;
  listResources(): AsyncIterable<ResourceSnapshot>;
  [READONLY_COHERENT_METADATA_SNAPSHOT]?(): Promise<ReadonlyCoherentMetadataSnapshot>;
}

export { READONLY_COHERENT_METADATA_SNAPSHOT } from "./read-model-observation.js";

interface ResourceReadRuntime {
  readonly port: CoreResourceReadPort;
  readonly metadataObservation: CoreMetadataObservationPort;
  readonly faultSink: RuntimeFaultSink;
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
  const metadataObservation = createReadonlyMetadataObservationPort(driver);
  const faultSink = createRuntimeFaultSink({
    closeIntake: () => index.clear(),
    cleanup: () => undefined,
  });

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
    metadataObservation,
    faultSink,
    lifecycle: lifecycleContribution({
      id: "core.resource-read",
      order: 30,
      async start(): Promise<void> {
        try {
          await driver.open();
          const observation = await metadataObservation.observeMetadata({
            kind: "storage-complete",
          });
          if (observation.kind !== "storage-complete") {
            throw new Error("Readonly complete observation is unavailable");
          }
          const resources = observation.resources.map(buildResourceSnapshot);
          const readiness = new Map<
            import("../domain/scalars.js").IDString,
            boolean
          >();
          for (const proof of observation.asset_readiness) {
            if (
              readiness.has(proof.asset_id) ||
              typeof proof.has_committed_representation !== "boolean"
            ) {
              throw new Error("Readonly Asset readiness proof is invalid");
            }
            readiness.set(proof.asset_id, proof.has_committed_representation);
          }
          if (!validateAssetSnapshotStorageInvariants(resources, readiness)) {
            throw new Error("Readonly Asset storage invariants are invalid");
          }
          await index.initialize(
            (async function* () {
              yield* resources;
            })(),
            { asset_readiness: readiness },
          );
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
      { token: CORE_METADATA_OBSERVATION_PORT, kind: "shared-service" },
      { token: RUNTIME_FAULT_SINK, kind: "shared-service" },
      {
        token: RUNTIME_FAULT_SINK_CONTRIBUTIONS,
        kind: "admin-contribution",
        cardinality: "multi",
      },
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
        .bind(CORE_METADATA_OBSERVATION_PORT)
        .toFactory(({ get }) => get(RESOURCE_READ_RUNTIME).metadataObservation)
        .singleton();
      context
        .bind(RUNTIME_FAULT_SINK)
        .toFactory(({ get }) => get(RESOURCE_READ_RUNTIME).faultSink)
        .singleton();
      context
        .add(RUNTIME_FAULT_SINK_CONTRIBUTIONS)
        .toFactory(({ get }) => get(RESOURCE_READ_RUNTIME).faultSink)
        .singleton();
      context
        .add(LIFECYCLE_CONTRIBUTIONS)
        .toFactory(({ get }) => get(RESOURCE_READ_RUNTIME).lifecycle)
        .singleton();
    },
  });
