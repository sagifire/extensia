import type { ResourceSnapshot } from "../domain/snapshots.js";
import type { CommittedOperationEntry } from "../storage/resource-write-protocol.js";
import type { GreedyResourceIndex } from "./resource-index.js";

export interface PreparedResourceIndexChange {
  readonly resources: readonly ResourceSnapshot[];
  publish(entry: CommittedOperationEntry): void;
}

export interface MutableGreedyResourceIndex extends GreedyResourceIndex {
  prepareBatch(
    resources: readonly ResourceSnapshot[],
  ): PreparedResourceIndexChange;
  prepareUpsert(resource: ResourceSnapshot): PreparedResourceIndexChange;
}
