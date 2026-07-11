import type { ResourceSnapshot } from "../domain/snapshots.js";
import type { GreedyResourceIndex } from "./resource-index.js";

export interface PreparedResourceIndexChange {
  readonly resources: readonly ResourceSnapshot[];
  publish(): void;
}

export interface MutableGreedyResourceIndex extends GreedyResourceIndex {
  prepareBatch(
    resources: readonly ResourceSnapshot[],
    coherentResources?: readonly ResourceSnapshot[],
  ): PreparedResourceIndexChange;
  prepareUpsert(resource: ResourceSnapshot): PreparedResourceIndexChange;
}
