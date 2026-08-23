import type { Token } from "@sagifire/ioc";

import { createExtensiaInternalNamespace } from "../composition/tokens.js";
import type { AssetPayloadState } from "../domain/asset-metadata.js";
import type { IDString } from "../domain/scalars.js";
import { type ResourceSnapshot } from "../domain/snapshots.js";
import type {
  CommittedOperationEntry,
  JournalSequence,
} from "../storage/resource-write-protocol.js";
import {
  buildCompleteReadModelGeneration,
  freezeResourceSnapshot,
  markIdentityKey,
  type ObservationStamp,
} from "./read-model-generation.js";
import { ResourceRuntimeIntegrityError } from "../storage/resource-runtime-integrity.js";

export const READONLY_COHERENT_METADATA_SNAPSHOT: unique symbol = Symbol(
  "extensia.internal.readonly-coherent-metadata-snapshot",
);

export interface ReadonlyCoherentMetadataSnapshot {
  readonly resources: readonly ResourceSnapshot[];
  readonly asset_payload_states: readonly AssetPayloadState[];
}

const readModelObservationTokens = createExtensiaInternalNamespace(
  "core.read-model-observation",
);

export type CoreMetadataObservationRequest =
  | { readonly kind: "resource-point"; readonly id: IDString }
  | { readonly kind: "resource-one-level"; readonly id: IDString }
  | { readonly kind: "asset-owner"; readonly asset_id: IDString }
  | {
      readonly kind: "mark-resources";
      readonly type: string;
      readonly name: string;
    }
  | { readonly kind: "storage-complete" }
  | { readonly kind: "storage-integrity" };

export interface CoreMetadataCompleteObservation {
  readonly kind: "storage-complete";
  readonly resources: readonly ResourceSnapshot[];
  readonly asset_readiness: readonly {
    readonly asset_id: IDString;
    readonly has_committed_representation: boolean;
  }[];
  readonly observation_stamp: ObservationStamp;
}

export type CoreMetadataObservation =
  | CoreMetadataCompleteObservation
  | {
      readonly kind: "storage-integrity";
      readonly resources: readonly ResourceSnapshot[];
      readonly asset_readiness: CoreMetadataCompleteObservation["asset_readiness"];
      readonly observation_stamp: ObservationStamp;
    }
  | {
      readonly kind: "resource-point";
      readonly resource: ResourceSnapshot | null;
      readonly observation_stamp: ObservationStamp;
    }
  | {
      readonly kind: "resource-one-level";
      readonly resource: ResourceSnapshot | null;
      readonly children: readonly ResourceSnapshot[];
      readonly observation_stamp: ObservationStamp;
    }
  | {
      readonly kind: "asset-owner";
      readonly owner: ResourceSnapshot | null;
      readonly observation_stamp: ObservationStamp;
    }
  | {
      readonly kind: "mark-resources";
      readonly resources: readonly ResourceSnapshot[];
      readonly observation_stamp: ObservationStamp;
    };

export interface CoreMetadataObservationPort {
  observeMetadata(
    request: CoreMetadataObservationRequest,
  ): Promise<CoreMetadataObservation>;
}

export const CORE_METADATA_OBSERVATION_PORT: Token<CoreMetadataObservationPort> =
  readModelObservationTokens.token("metadata-observation-port");

export interface CoreMetadataCompleteSource {
  readComplete(): Promise<{
    readonly resources: readonly ResourceSnapshot[];
    readonly asset_payload_states?: readonly AssetPayloadState[];
  }>;
}

function detachedResources(
  resources: readonly ResourceSnapshot[],
): readonly ResourceSnapshot[] {
  return Object.freeze(
    resources
      .map(freezeResourceSnapshot)
      .sort((left, right) => left.data.id.localeCompare(right.data.id)),
  );
}

function readiness(
  states: readonly AssetPayloadState[] | undefined,
): CoreMetadataCompleteObservation["asset_readiness"] {
  const seen = new Set<IDString>();
  const result = [];
  for (const state of states ?? []) {
    if (seen.has(state.asset_id)) {
      throw new ResourceRuntimeIntegrityError(
        "ASSET_STORAGE_INTEGRITY",
        "Metadata observation contains duplicate Asset readiness proof",
      );
    }
    seen.add(state.asset_id);
    if (state.active_upload !== null) {
      result.push(
        Object.freeze({
          asset_id: state.asset_id,
          has_committed_representation: state.committed,
        }),
      );
    }
  }
  return Object.freeze(
    result.sort((left, right) => left.asset_id.localeCompare(right.asset_id)),
  );
}

export function createCoreMetadataObservationPort(
  source: CoreMetadataCompleteSource,
): CoreMetadataObservationPort {
  return Object.freeze({
    async observeMetadata(
      request: CoreMetadataObservationRequest,
    ): Promise<CoreMetadataObservation> {
      const complete = await source.readComplete();
      const resources = detachedResources(complete.resources);
      const stamp = buildCompleteReadModelGeneration(resources, {
        ...(complete.asset_payload_states === undefined
          ? {}
          : { payloadStates: complete.asset_payload_states }),
      }).observationStamp;
      if (
        request.kind === "storage-complete" ||
        request.kind === "storage-integrity"
      ) {
        return Object.freeze({
          asset_readiness: readiness(complete.asset_payload_states),
          kind: request.kind,
          observation_stamp: stamp,
          resources,
        });
      }
      if (request.kind === "resource-point") {
        const resource = resources.find((item) => item.data.id === request.id);
        return Object.freeze({
          kind: request.kind,
          observation_stamp: stamp,
          resource:
            resource === undefined || resource.data.is_deleted
              ? null
              : freezeResourceSnapshot(resource),
        });
      }
      if (request.kind === "resource-one-level") {
        const resource = resources.find((item) => item.data.id === request.id);
        const children = resources
          .filter(
            (item) =>
              !item.data.is_deleted && item.data.parent_id === request.id,
          )
          .sort((left, right) =>
            left.data.order_index === right.data.order_index
              ? left.data.id.localeCompare(right.data.id)
              : left.data.order_index - right.data.order_index,
          );
        return Object.freeze({
          children: detachedResources(children),
          kind: request.kind,
          observation_stamp: stamp,
          resource:
            resource === undefined || resource.data.is_deleted
              ? null
              : freezeResourceSnapshot(resource),
        });
      }
      if (request.kind === "asset-owner") {
        const owner = resources.find(
          (item) =>
            !item.data.is_deleted &&
            item.assets.some((asset) => asset.id === request.asset_id),
        );
        return Object.freeze({
          kind: request.kind,
          observation_stamp: stamp,
          owner: owner === undefined ? null : freezeResourceSnapshot(owner),
        });
      }
      const key = markIdentityKey(request);
      return Object.freeze({
        kind: request.kind,
        observation_stamp: stamp,
        resources: detachedResources(
          resources.filter(
            (resource) =>
              !resource.data.is_deleted &&
              resource.marks.some((mark) => markIdentityKey(mark) === key),
          ),
        ),
      });
    },
  });
}

export interface CommittedChangeObservationRequest {
  readonly after: JournalSequence | null;
  readonly incremental_entry_limit: 256;
  readonly incremental_resource_limit: 256;
  readonly attempt_admission_deadline_monotonic_ms: number;
  readonly signal?: AbortSignal;
}

export type CommittedChangeObservation =
  | {
      readonly kind: "at-head";
      readonly observed_head: JournalSequence | null;
      readonly observation_stamp: ObservationStamp;
    }
  | {
      readonly kind: "delta";
      readonly observed_head: JournalSequence;
      readonly entries: readonly CommittedOperationEntry[];
      readonly resources: readonly ResourceSnapshot[];
      readonly observation_stamp: ObservationStamp;
    }
  | {
      readonly kind: "rebuild";
      readonly observed_head: JournalSequence | null;
      readonly complete: CoreMetadataCompleteObservation;
      readonly validated_range: "all-after-cursor-through-head";
    };

export interface CoreCommittedChangeObservationPort {
  observeCommittedChanges(
    request: CommittedChangeObservationRequest,
  ): Promise<CommittedChangeObservation>;
}

export type CoreObservationTransientCategory =
  "storage-lock" | "storage-unavailable" | "storage-read";

export class CoreObservationTransientError extends Error {
  readonly category: CoreObservationTransientCategory;

  constructor(category: CoreObservationTransientCategory) {
    super("Core read-model observation failed transiently");
    this.name = "CoreObservationTransientError";
    this.category = category;
  }
}

export const CORE_COMMITTED_CHANGE_OBSERVATION_PORT: Token<CoreCommittedChangeObservationPort> =
  readModelObservationTokens.token("committed-change-observation-port");
