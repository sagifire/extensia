import type { ResourceSnapshot } from "../domain/snapshots.js";
import type { GreedyResourceIndex } from "./resource-index.js";

export interface PreparedResourceIndexChange {
  readonly resource: ResourceSnapshot;
  publish(): void;
}

export interface MutableGreedyResourceIndex extends GreedyResourceIndex {
  prepareUpsert(resource: ResourceSnapshot): PreparedResourceIndexChange;
}
