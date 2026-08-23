import { defineModule, type Token } from "@sagifire/ioc";

import { createExtensiaInternalNamespace } from "../composition/tokens.js";
import { validateAssetSnapshotStorageInvariants } from "../domain/asset-metadata.js";
import type { ResourceSnapshot } from "../domain/snapshots.js";
import { buildResourceSnapshot } from "../domain/snapshots.js";
import { ResourceRuntimeIntegrityError } from "../storage/resource-runtime-integrity.js";
import {
  LIFECYCLE_CONTRIBUTIONS,
  lifecycleContribution,
  type LifecycleContribution,
} from "../runtime/lifecycle.js";
import {
  CORE_RESOURCE_READ_PORT,
  type CoreResourceReadPort,
} from "../system-extensions/default-api/resource-read-port.js";
import { createGreedyResourceIndex } from "./resource-index.js";
import {
  CORE_METADATA_OBSERVATION_PORT,
  READONLY_COHERENT_METADATA_SNAPSHOT,
  READONLY_SYNCHRONIZED_OBSERVATION,
  type CoreMetadataCompleteObservation,
  type CoreMetadataObservationPort,
  type ReadonlyCoherentMetadataSnapshot,
  type ReadonlySynchronizedObservationCapability,
} from "./read-model-observation.js";
import { createReadonlyMetadataObservationPort } from "./read-model-storage-observation.js";
import {
  createRuntimeFaultSink,
  RUNTIME_FAULT_SINK,
  RUNTIME_FAULT_SINK_CONTRIBUTIONS,
  type RuntimeFaultSink,
} from "./runtime-fault-sink.js";
import {
  createReadModelSelectorPort,
  createResourceReadPort,
  type InternalReadModelSelectorPort,
} from "./read-model-query.js";
import {
  createReadModelControl,
  DEFAULT_READ_MODEL_RUNTIME_CONFIG,
  READ_MODEL_CONTROL_PORT,
  type ReadModelControlPort,
  type ResolvedReadModelRuntimeConfig,
} from "./read-model-runtime.js";
import { createReadModelPublicationCoordinator } from "./read-model-coordinator.js";
import {
  createReadModelSynchronizationActor,
  createReadModelSynchronizationAttempt,
  type ReadModelSynchronizationActor,
} from "./read-model-synchronization.js";

export interface ReadonlyResourceDriver {
  readonly mode: "readonly";
  open(): Promise<void>;
  close(): Promise<void>;
  listResources(): AsyncIterable<ResourceSnapshot>;
  [READONLY_COHERENT_METADATA_SNAPSHOT]?(): Promise<ReadonlyCoherentMetadataSnapshot>;
  readonly [READONLY_SYNCHRONIZED_OBSERVATION]?: ReadonlySynchronizedObservationCapability;
}

export {
  READONLY_COHERENT_METADATA_SNAPSHOT,
  READONLY_SYNCHRONIZED_OBSERVATION,
} from "./read-model-observation.js";

interface ResourceReadRuntime {
  readonly port: CoreResourceReadPort;
  readonly selectors: InternalReadModelSelectorPort;
  readonly metadataObservation: CoreMetadataObservationPort;
  readonly faultSink: RuntimeFaultSink;
  readonly control: ReadModelControlPort;
  readonly lifecycle: LifecycleContribution;
  readonly synchronizationActor: ReadModelSynchronizationActor | null;
}

const resourceReadTokens =
  createExtensiaInternalNamespace("core.resource-read");

export const READONLY_RESOURCE_DRIVER: Token<ReadonlyResourceDriver> =
  resourceReadTokens.token<ReadonlyResourceDriver>("readonly-resource-driver");

const RESOURCE_READ_RUNTIME: Token<ResourceReadRuntime> =
  resourceReadTokens.token<ResourceReadRuntime>("runtime");

function createResourceReadRuntime(
  driver: ReadonlyResourceDriver,
  config: ResolvedReadModelRuntimeConfig,
): ResourceReadRuntime {
  const coordinator = createReadModelPublicationCoordinator();
  const index = createGreedyResourceIndex(coordinator);
  const metadataObservation = createReadonlyMetadataObservationPort(driver);
  const synchronizedObservation = driver[READONLY_SYNCHRONIZED_OBSERVATION];
  let synchronizationActor: ReadModelSynchronizationActor | null = null;
  const faultSink = createRuntimeFaultSink({
    closeIntake: () => index.clear(),
    cleanup: () => synchronizationActor?.stop(),
  });
  async function initialize(
    observation: CoreMetadataCompleteObservation,
    synchronization:
      | { readonly kind: "static-unsupported" }
      | {
          readonly kind: "synchronized";
          readonly cursor:
            | import("../storage/resource-write-protocol.js").JournalSequence
            | null;
        },
  ): Promise<void> {
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
        throw new ResourceRuntimeIntegrityError(
          "ASSET_STORAGE_INTEGRITY",
          "Readonly Asset readiness proof is invalid",
        );
      }
      readiness.set(proof.asset_id, proof.has_committed_representation);
    }
    if (!validateAssetSnapshotStorageInvariants(resources, readiness)) {
      throw new ResourceRuntimeIntegrityError(
        "ASSET_STORAGE_INTEGRITY",
        "Readonly Asset storage invariants are invalid",
      );
    }
    await index.initialize(
      (async function* () {
        yield* resources;
      })(),
      { asset_readiness: readiness, loading: config.loading, synchronization },
    );
  }
  if (synchronizedObservation !== undefined) {
    const refreshAttempt = createReadModelSynchronizationAttempt({
      coordinator,
      observation: synchronizedObservation,
    });
    synchronizationActor = createReadModelSynchronizationActor({
      async attempt(context) {
        if (coordinator.ready) return refreshAttempt(context);
        const startup = await synchronizedObservation.observeStartup(
          context.signal,
        );
        await initialize(startup.complete, {
          cursor: startup.observed_head,
          kind: "synchronized",
        });
        return Object.freeze({ changed: true, ok: true as const });
      },
      faultSink,
      initiallyOpen: false,
      retry: config.synchronization.retry,
    });
  }
  const control = createReadModelControl({
    actor: synchronizationActor,
    config,
    coverage: () => index.inspectCoverage(),
    cursorBehind: () => coordinator.isCursorBehind(),
    fault: () => faultSink.fault?.kind ?? null,
  });
  const port = createResourceReadPort({
    index,
    metadataObservation,
    faultSink,
  });
  const selectors = createReadModelSelectorPort({
    index,
    metadataObservation,
    faultSink,
  });

  async function closeAfterRejectedStart(): Promise<void> {
    await synchronizationActor?.stop();
    index.clear();
    try {
      await driver.close();
    } catch {
      // Existing lifecycle diagnostics remain safe and authoritative.
    }
  }

  return Object.freeze({
    control,
    port,
    selectors,
    metadataObservation,
    faultSink,
    synchronizationActor,
    lifecycle: lifecycleContribution({
      id: "core.resource-read",
      order: 30,
      async start(): Promise<void> {
        control.setLifecycle("building");
        if (config.synchronization.mode === "polling") {
          control.markStartupFailure("capability");
          control.setLifecycle("failed");
          throw new Error(
            "Polling activation belongs to the concrete synchronization slice",
          );
        }
        try {
          await driver.open();
          if (synchronizationActor !== null) {
            synchronizationActor.openIntake();
            const startup = await synchronizationActor.refresh();
            if (!startup.ok) {
              if (startup.code === "READ_MODEL_REFRESH_EXHAUSTED") {
                control.markStartupFailure("retry-exhausted");
              } else if (startup.code === "STORAGE_INTEGRITY_FAILED") {
                control.markStartupFailure("integrity");
              } else if (
                startup.code === "READ_MODEL_SYNCHRONIZATION_CAPABILITY_FAILED"
              ) {
                control.markStartupFailure("capability");
              }
              throw new Error("Readonly startup observation failed");
            }
            control.markStartupObserved();
          } else {
            const observation = await metadataObservation.observeMetadata({
              kind: "storage-complete",
            });
            if (observation.kind !== "storage-complete") {
              throw new Error("Readonly complete observation is unavailable");
            }
            await initialize(observation, { kind: "static-unsupported" });
          }
          control.setLifecycle("ready");
        } catch {
          control.setLifecycle("failed");
          await closeAfterRejectedStart();
          throw new Error("Readonly Resource initialization failed");
        }
      },
      async stop(): Promise<void> {
        control.setLifecycle("stopping");
        await synchronizationActor?.stop();
        try {
          await driver.close();
        } finally {
          index.clear();
          control.setLifecycle("stopped");
        }
      },
    }),
  });
}

export function createReadonlyResourceCoreModule(
  config: ResolvedReadModelRuntimeConfig = DEFAULT_READ_MODEL_RUNTIME_CONFIG,
): ReturnType<typeof defineModule> {
  return defineModule({
    id: "extensia.core.resource-read",
    requires: [{ token: READONLY_RESOURCE_DRIVER }],
    provides: [
      { token: CORE_RESOURCE_READ_PORT, kind: "public-api" },
      { token: CORE_METADATA_OBSERVATION_PORT, kind: "shared-service" },
      { token: RUNTIME_FAULT_SINK, kind: "shared-service" },
      { token: READ_MODEL_CONTROL_PORT, kind: "shared-service" },
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
          createResourceReadRuntime(get(READONLY_RESOURCE_DRIVER), config),
        )
        .singleton();
      context
        .bind(READ_MODEL_CONTROL_PORT)
        .toFactory(({ get }) => get(RESOURCE_READ_RUNTIME).control)
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
}

export const READONLY_RESOURCE_CORE_MODULE: ReturnType<typeof defineModule> =
  createReadonlyResourceCoreModule();
