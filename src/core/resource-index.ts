import {
  buildAssetSnapshot,
  buildResourceSnapshot,
  buildResourceTreeViewSnapshot,
  type AssetSnapshot,
  type ResourceSnapshot,
  type ResourceTreeViewSnapshot,
} from "../domain/snapshots.js";
import type { IDString } from "../domain/scalars.js";
import type {
  CommittedOperationEntry,
  JournalSequence,
} from "../storage/resource-write-protocol.js";
import { ResourceRuntimeIntegrityError } from "../storage/resource-runtime-integrity.js";
import type {
  MutableGreedyResourceIndex,
  PreparedResourceIndexChange,
} from "./resource-index-write-contracts.js";
import {
  buildEmptySelectiveReadModelGeneration,
  buildSelectiveReadModelGeneration,
  buildCompleteReadModelGeneration,
  hasResourceOneLevelCoverage,
  hasResourcePointCoverage,
  hasAssetPointCoverage,
  hasMarkSelectorCoverage,
  markIdentityKey,
  rebaseSelectiveLocalOverlays,
  type ReadModelGenerationStatistics,
  type MarkIdentityKey,
} from "./read-model-generation.js";
import {
  createReadModelPublicationCoordinator,
  type ReadModelPublicationCoordinator,
} from "./read-model-coordinator.js";

export interface GreedyResourceIndex {
  readonly ready: boolean;
  initialize(
    resources: AsyncIterable<ResourceSnapshot>,
    options?: Readonly<{
      synchronization?:
        | { readonly kind: "static-unsupported" }
        | {
            readonly kind: "synchronized";
            readonly cursor: JournalSequence | null;
          };
      asset_readiness?: ReadonlyMap<IDString, boolean>;
      loading?: "greedy" | "lazy";
    }>,
  ): Promise<void>;
  clear(): void;
  inspectCoverage(): "none" | "selective" | "complete";
  inspectStatistics(): ReadModelGenerationStatistics;
  hasResourcePointCoverage(id: IDString): boolean;
  hasResourceOneLevelCoverage(id: IDString): boolean;
  hasAssetPointCoverage(id: IDString): boolean;
  hasMarkSelectorCoverage(key: MarkIdentityKey): boolean;
  captureRevision(): number;
  publishMetadataObservation(
    baseRevision: number,
    request: import("./read-model-observation.js").CoreMetadataObservationRequest,
    observation: import("./read-model-observation.js").CoreMetadataObservation,
  ): boolean;
  getResource(id: IDString): ResourceSnapshot | undefined;
  getResourceTree(id: IDString): ResourceTreeViewSnapshot | undefined;
  getAssetOwner(
    id: IDString,
  ): { readonly owner_id: IDString; readonly asset: AssetSnapshot } | undefined;
  getResourceIDsByMark(key: MarkIdentityKey): readonly IDString[];
}

type GreedyResourceIndexInitializeOptions = NonNullable<
  Parameters<GreedyResourceIndex["initialize"]>[1]
>;

export function createGreedyResourceIndex(
  coordinator: ReadModelPublicationCoordinator = createReadModelPublicationCoordinator(),
): MutableGreedyResourceIndex {
  function generation() {
    return coordinator.capture().generation;
  }

  return Object.freeze({
    get ready(): boolean {
      return coordinator.ready;
    },
    async initialize(
      resources: AsyncIterable<ResourceSnapshot>,
      options: GreedyResourceIndexInitializeOptions = {},
    ): Promise<void> {
      if (coordinator.ready) {
        throw new Error("Resource index is already initialized");
      }
      const detached: ResourceSnapshot[] = [];
      for await (const resource of resources) {
        detached.push(buildResourceSnapshot(resource));
      }
      const complete = buildCompleteReadModelGeneration(detached, {
        ...(options.asset_readiness === undefined
          ? {}
          : { assetReadiness: options.asset_readiness }),
      });
      const synchronization = options.synchronization ?? {
        kind: "static-unsupported" as const,
      };
      const next =
        options.loading === "lazy"
          ? buildEmptySelectiveReadModelGeneration(complete.observationStamp)
          : complete;
      if (synchronization.kind === "synchronized") {
        coordinator.initializeSynchronized(next, synchronization.cursor);
      } else {
        coordinator.initializeStatic(next);
      }
    },
    clear(): void {
      coordinator.clear();
    },
    inspectCoverage(): "none" | "selective" | "complete" {
      return coordinator.ready
        ? coordinator.capture().generation.coverage.kind
        : "none";
    },
    inspectStatistics(): ReadModelGenerationStatistics {
      return generation().statistics;
    },
    hasResourcePointCoverage(id: IDString): boolean {
      return hasResourcePointCoverage(generation(), id);
    },
    hasResourceOneLevelCoverage(id: IDString): boolean {
      return hasResourceOneLevelCoverage(generation(), id);
    },
    hasAssetPointCoverage(id: IDString): boolean {
      return hasAssetPointCoverage(generation(), id);
    },
    hasMarkSelectorCoverage(key: MarkIdentityKey): boolean {
      return hasMarkSelectorCoverage(generation(), key);
    },
    captureRevision(): number {
      return coordinator.capture().revision;
    },
    publishMetadataObservation(
      baseRevision: number,
      request: import("./read-model-observation.js").CoreMetadataObservationRequest,
      observation: import("./read-model-observation.js").CoreMetadataObservation,
    ): boolean {
      const current = coordinator.capture();
      if (current.generation.coverage.kind === "complete") return true;
      if (current.revision !== baseRevision) return false;
      const next = (() => {
        if (observation.kind === "resource-point") {
          if (request.kind !== "resource-point") {
            throw new ResourceRuntimeIntegrityError(
              "RESOURCE_INDEX_INTEGRITY",
              "Metadata observation request mismatch",
            );
          }
          if (
            observation.resource !== null &&
            observation.resource.data.id !== request.id
          ) {
            throw new ResourceRuntimeIntegrityError(
              "RESOURCE_INDEX_INTEGRITY",
              "Resource point observation returned a different Resource",
            );
          }
          return buildSelectiveReadModelGeneration({
            observationStamp: observation.observation_stamp,
            resourcePoints: [request.id],
            resources:
              observation.resource === null ? [] : [observation.resource],
          });
        }
        if (observation.kind === "resource-one-level") {
          if (request.kind !== "resource-one-level") {
            throw new ResourceRuntimeIntegrityError(
              "RESOURCE_INDEX_INTEGRITY",
              "Metadata observation request mismatch",
            );
          }
          if (observation.resource === null) {
            return buildSelectiveReadModelGeneration({
              observationStamp: observation.observation_stamp,
              resourcePoints: [request.id],
              resourceOneLevelPoints: [request.id],
              resources: [],
            });
          }
          if (observation.resource.data.id !== request.id) {
            throw new ResourceRuntimeIntegrityError(
              "RESOURCE_INDEX_INTEGRITY",
              "Resource one-level observation returned a different parent",
            );
          }
          return buildSelectiveReadModelGeneration({
            observationStamp: observation.observation_stamp,
            resourceOneLevel: {
              children: observation.children,
              parent: observation.resource.data.id,
            },
            resourcePoints: [observation.resource.data.id],
            resources: [observation.resource, ...observation.children],
          });
        }
        if (observation.kind === "asset-owner") {
          if (request.kind !== "asset-owner") {
            throw new ResourceRuntimeIntegrityError(
              "RESOURCE_INDEX_INTEGRITY",
              "Metadata observation request mismatch",
            );
          }
          if (
            observation.owner !== null &&
            !observation.owner.assets.some(
              (asset) => asset.id === request.asset_id,
            )
          ) {
            throw new ResourceRuntimeIntegrityError(
              "RESOURCE_INDEX_INTEGRITY",
              "Asset owner observation returned a different Asset",
            );
          }
          return buildSelectiveReadModelGeneration({
            assetPoints: [request.asset_id],
            observationStamp: observation.observation_stamp,
            resources: observation.owner === null ? [] : [observation.owner],
          });
        }
        if (observation.kind === "mark-resources") {
          if (request.kind !== "mark-resources") {
            throw new ResourceRuntimeIntegrityError(
              "RESOURCE_INDEX_INTEGRITY",
              "Metadata observation request mismatch",
            );
          }
          const key = markIdentityKey(request);
          return buildSelectiveReadModelGeneration({
            observationStamp: observation.observation_stamp,
            resources: observation.resources,
            markSelector: {
              key,
              resourceIds: observation.resources.map(
                (resource: ResourceSnapshot) => resource.data.id,
              ),
            },
          });
        }
        throw new ResourceRuntimeIntegrityError(
          "RESOURCE_INDEX_INTEGRITY",
          "Complete observations are not lazy query loads",
        );
      })();
      return coordinator.publishCandidate(
        coordinator.candidate(
          rebaseSelectiveLocalOverlays(current.generation, next),
          current.kind === "synchronized" ? current.cursor : undefined,
        ),
      );
    },
    getResource(id: IDString): ResourceSnapshot | undefined {
      const resource = generation().resourcesById.get(id);
      return resource === undefined || resource.data.is_deleted
        ? undefined
        : buildResourceSnapshot(resource);
    },
    getResourceTree(id: IDString): ResourceTreeViewSnapshot | undefined {
      const current = generation();
      const resource = current.resourcesById.get(id);
      if (resource === undefined || resource.data.is_deleted) return undefined;
      return buildResourceTreeViewSnapshot({
        children: current.childrenByParent.get(id) ?? [],
        resource,
      });
    },
    getAssetOwner(
      id: IDString,
    ):
      | { readonly owner_id: IDString; readonly asset: AssetSnapshot }
      | undefined {
      const current = generation();
      const owner = current.assetOwnerById.get(id);
      const resource =
        owner === undefined ? undefined : current.resourcesById.get(owner);
      const asset = current.assetById.get(id);
      return resource === undefined ||
        resource.data.is_deleted ||
        asset === undefined
        ? undefined
        : Object.freeze({ asset: buildAssetSnapshot(asset), owner_id: owner! });
    },
    getResourceIDsByMark(key: MarkIdentityKey): readonly IDString[] {
      return Object.freeze([...(generation().resourcesByMark.get(key) ?? [])]);
    },
    prepareBatch(
      candidates: readonly ResourceSnapshot[],
    ): PreparedResourceIndexChange {
      const exactChanges = candidates.map(buildResourceSnapshot);
      const prepared = coordinator.prepareLocal(exactChanges);
      return Object.freeze({
        resources: Object.freeze(exactChanges.map(buildResourceSnapshot)),
        publish: (entry: CommittedOperationEntry) => {
          prepared.publish(entry);
        },
      });
    },
    prepareUpsert(candidate: ResourceSnapshot): PreparedResourceIndexChange {
      const resource = buildResourceSnapshot(candidate);
      const prepared = coordinator.prepareLocal([resource]);
      return Object.freeze({
        resources: Object.freeze([buildResourceSnapshot(resource)]),
        publish: (entry: CommittedOperationEntry) => {
          prepared.publish(entry);
        },
      });
    },
  });
}
