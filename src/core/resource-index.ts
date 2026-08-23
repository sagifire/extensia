import {
  buildResourceSnapshot,
  buildResourceTreeViewSnapshot,
  type ResourceSnapshot,
  type ResourceTreeViewSnapshot,
} from "../domain/snapshots.js";
import type { IDString } from "../domain/scalars.js";
import type {
  CommittedOperationEntry,
  JournalSequence,
} from "../storage/resource-write-protocol.js";
import type {
  MutableGreedyResourceIndex,
  PreparedResourceIndexChange,
} from "./resource-index-write-contracts.js";
import {
  buildCompleteReadModelGeneration,
  type ReadModelGenerationStatistics,
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
    }>,
  ): Promise<void>;
  clear(): void;
  inspectStatistics(): ReadModelGenerationStatistics;
  getResource(id: IDString): ResourceSnapshot | undefined;
  getResourceTree(id: IDString): ResourceTreeViewSnapshot | undefined;
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
      const next = buildCompleteReadModelGeneration(detached, {
        ...(options.asset_readiness === undefined
          ? {}
          : { assetReadiness: options.asset_readiness }),
      });
      const synchronization = options.synchronization ?? {
        kind: "static-unsupported" as const,
      };
      if (synchronization.kind === "synchronized") {
        coordinator.initializeSynchronized(next, synchronization.cursor);
      } else {
        coordinator.initializeStatic(next);
      }
    },
    clear(): void {
      coordinator.clear();
    },
    inspectStatistics(): ReadModelGenerationStatistics {
      return generation().statistics;
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
