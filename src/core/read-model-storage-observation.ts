import {
  validateAssetStorageInvariants,
  type AssetPayloadState,
} from "../domain/asset-metadata.js";
import {
  buildResourceSnapshot,
  type ResourceSnapshot,
} from "../domain/snapshots.js";
import type { IDString } from "../domain/scalars.js";
import type { FullResourceDriverAdapter } from "../storage/full-resource-driver-adapter.js";
import {
  cloneCommittedOperationEntry,
  parseJournalSequence,
} from "../storage/resource-journal-integrity.js";
import { ResourceStorageIntegrityError } from "../storage/resource-journal-integrity.js";
import type { CommittedOperationEntry } from "../storage/resource-write-protocol.js";
import { buildCompleteReadModelGeneration } from "./read-model-generation.js";
import { freezeResourceSnapshot } from "./read-model-generation.js";
import {
  createCoreMetadataObservationPort,
  READONLY_COHERENT_METADATA_SNAPSHOT,
  type CoreCommittedChangeObservationPort,
  type CommittedChangeObservationRequest,
  type CoreMetadataObservationPort,
  type ReadonlyCoherentMetadataSnapshot,
} from "./read-model-observation.js";

export interface ReadonlyMetadataDriver {
  listResources(): AsyncIterable<ResourceSnapshot>;
  [READONLY_COHERENT_METADATA_SNAPSHOT]?(): Promise<ReadonlyCoherentMetadataSnapshot>;
}

function freezeDetached<T extends object>(value: T): Readonly<T> {
  for (const entry of Object.values(value)) {
    if (
      entry !== null &&
      typeof entry === "object" &&
      !Object.isFrozen(entry)
    ) {
      freezeDetached(entry);
    }
  }
  return Object.freeze(value);
}

async function readFullState(driver: FullResourceDriverAdapter): Promise<{
  readonly resources: readonly ResourceSnapshot[];
  readonly asset_payload_states: readonly AssetPayloadState[];
}> {
  const session = await driver.acquireStorageSession();
  try {
    const resources: ResourceSnapshot[] = [];
    for await (const resource of session.listResources()) {
      resources.push(freezeResourceSnapshot(resource));
    }
    const payloadStates: AssetPayloadState[] = [];
    for await (const state of session.listAssetPayloadStates?.() ?? []) {
      payloadStates.push(
        Object.freeze({
          active_upload:
            state.active_upload === null
              ? null
              : Object.freeze({ ...state.active_upload }),
          asset_id: state.asset_id,
          committed: state.committed,
        }),
      );
    }
    if (!validateAssetStorageInvariants(resources, payloadStates)) {
      throw new ResourceStorageIntegrityError(
        "Full metadata observation violates Asset invariants",
      );
    }
    return Object.freeze({
      asset_payload_states: Object.freeze(payloadStates),
      resources: Object.freeze(resources),
    });
  } finally {
    await session.release();
  }
}

export function createFullMetadataObservationPort(
  driver: FullResourceDriverAdapter,
): CoreMetadataObservationPort {
  return createCoreMetadataObservationPort({
    readComplete: () => readFullState(driver),
  });
}

export function createReadonlyMetadataObservationPort(
  driver: ReadonlyMetadataDriver,
): CoreMetadataObservationPort {
  return createCoreMetadataObservationPort({
    async readComplete() {
      const coherent = driver[READONLY_COHERENT_METADATA_SNAPSHOT];
      if (coherent !== undefined) {
        const snapshot = await coherent.call(driver);
        return Object.freeze({
          asset_payload_states: Object.freeze(
            snapshot.asset_payload_states.map((state) =>
              Object.freeze({
                active_upload:
                  state.active_upload === null
                    ? null
                    : Object.freeze({ ...state.active_upload }),
                asset_id: state.asset_id,
                committed: state.committed,
              }),
            ),
          ),
          resources: Object.freeze(
            snapshot.resources.map(buildResourceSnapshot),
          ),
        });
      }
      const resources: ResourceSnapshot[] = [];
      for await (const resource of driver.listResources()) {
        resources.push(buildResourceSnapshot(resource));
      }
      return Object.freeze({
        resources: Object.freeze(resources),
      });
    },
  });
}

export function createFullCommittedChangeObservationPort(
  driver: FullResourceDriverAdapter,
): CoreCommittedChangeObservationPort {
  return Object.freeze({
    async observeCommittedChanges(request: CommittedChangeObservationRequest) {
      if (
        request.incremental_entry_limit !== 256 ||
        request.incremental_resource_limit !== 256 ||
        !Number.isFinite(request.attempt_admission_deadline_monotonic_ms)
      ) {
        throw new TypeError("Committed-change observation request is invalid");
      }
      if (request.signal?.aborted === true) throw request.signal.reason;
      const session = await driver.acquireStorageSession(request.signal);
      try {
        const completeJournal: CommittedOperationEntry[] = [];
        const operationIDs = new Set<IDString>();
        let expected = 1n;
        for await (const candidate of session.readCommittedOperationsAfter(
          null,
        )) {
          const entry = freezeDetached(cloneCommittedOperationEntry(candidate));
          if (
            parseJournalSequence(entry.sequence) !== expected ||
            operationIDs.has(entry.operation_id)
          ) {
            throw new ResourceStorageIntegrityError(
              "Committed-change observation is not contiguous and unique",
            );
          }
          expected += 1n;
          operationIDs.add(entry.operation_id);
          completeJournal.push(entry);
        }
        const observedHead = completeJournal.at(-1)?.sequence ?? null;
        const requestedAfter =
          request.after === null ? 0n : parseJournalSequence(request.after);
        if (
          requestedAfter >
          (observedHead === null ? 0n : parseJournalSequence(observedHead))
        ) {
          throw new ResourceStorageIntegrityError(
            "Committed-change cursor is ahead of the observed journal head",
          );
        }
        const entries = completeJournal.filter(
          (entry) => parseJournalSequence(entry.sequence) > requestedAfter,
        );
        const resources: ResourceSnapshot[] = [];
        const payloadStates: AssetPayloadState[] = [];
        for await (const resource of session.listResources()) {
          resources.push(freezeResourceSnapshot(resource));
        }
        for await (const state of session.listAssetPayloadStates?.() ?? []) {
          payloadStates.push(
            Object.freeze({
              active_upload:
                state.active_upload === null
                  ? null
                  : Object.freeze({ ...state.active_upload }),
              asset_id: state.asset_id,
              committed: state.committed,
            }),
          );
        }
        if (!validateAssetStorageInvariants(resources, payloadStates)) {
          throw new ResourceStorageIntegrityError(
            "Committed-change metadata violates Asset invariants",
          );
        }
        const complete = buildCompleteReadModelGeneration(resources, {
          payloadStates,
        });
        if (entries.length === 0) {
          return Object.freeze({
            kind: "at-head" as const,
            observation_stamp: complete.observationStamp,
            observed_head: observedHead,
          });
        }
        const head = entries.at(-1)!.sequence;
        const affected = new Set<IDString>();
        entries.forEach((entry) =>
          entry.affected_resources.forEach((id) => affected.add(id)),
        );
        if (entries.length > 256 || affected.size > 256) {
          return Object.freeze({
            complete: Object.freeze({
              asset_readiness: Object.freeze(
                payloadStates
                  .filter((state) => state.active_upload !== null)
                  .map((state) =>
                    Object.freeze({
                      asset_id: state.asset_id,
                      has_committed_representation: state.committed,
                    }),
                  ),
              ),
              kind: "storage-complete" as const,
              observation_stamp: complete.observationStamp,
              resources: Object.freeze(resources.map(freezeResourceSnapshot)),
            }),
            kind: "rebuild" as const,
            observed_head: head,
            validated_range: "all-after-cursor-through-head" as const,
          });
        }
        const byID = new Map(
          resources.map((resource) => [resource.data.id, resource]),
        );
        const changed = [...affected].map((id) => {
          const resource = byID.get(id);
          if (resource === undefined) {
            throw new ResourceStorageIntegrityError(
              "Committed entry references a missing Resource aggregate",
            );
          }
          return freezeResourceSnapshot(resource);
        });
        return Object.freeze({
          entries: Object.freeze(entries),
          kind: "delta" as const,
          observation_stamp: complete.observationStamp,
          observed_head: head,
          resources: Object.freeze(changed),
        });
      } finally {
        await session.release();
      }
    },
  });
}
