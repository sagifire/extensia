import { isDeepStrictEqual } from "node:util";

import {
  validateAssetSnapshotStorageInvariants,
  type AssetPayloadState,
} from "../domain/asset-metadata.js";
import type { IDString } from "../domain/scalars.js";
import {
  buildAssetSnapshot,
  buildResourceSnapshot,
  type AssetSnapshot,
  type MarkSnapshot,
  type ResourceChildRefSnapshot,
  type ResourceSnapshot,
} from "../domain/snapshots.js";
import { validateResourceHierarchy } from "../domain/resource-hierarchy.js";
import { ResourceRuntimeIntegrityError } from "../storage/resource-runtime-integrity.js";
import { PersistentStringMap } from "./persistent-string-map.js";

declare const markIdentityKeyBrand: unique symbol;
declare const observationStampBrand: unique symbol;

export type MarkIdentityKey = string & {
  readonly [markIdentityKeyBrand]: "MarkIdentityKey";
};

export interface ObservationStamp {
  readonly [observationStampBrand]: "ObservationStamp";
}

export interface CompleteGenerationCoverage {
  readonly kind: "complete";
  readonly resource_points: "all";
  readonly resource_one_level: "all";
  readonly asset_points_and_owners: "all";
  readonly mark_selectors: "all";
  readonly storage_global: true;
}

export interface SelectiveGenerationCoverage {
  readonly kind: "selective";
  readonly resource_points: ReadonlySet<IDString>;
  readonly resource_one_level: ReadonlySet<IDString>;
  readonly asset_points_and_owners: ReadonlySet<IDString>;
  readonly mark_selectors: ReadonlySet<MarkIdentityKey>;
  readonly local_resource_points: ReadonlySet<IDString>;
  readonly storage_global: false;
}

export type GenerationCoverage =
  CompleteGenerationCoverage | SelectiveGenerationCoverage;

export interface ReadModelGenerationStatistics {
  readonly full_rebuilds: number;
  readonly delta_publications: number;
  readonly changed_resources: number;
  readonly touched_projection_keys: number;
  readonly structural_writes: number;
}

export interface ReadModelGeneration {
  readonly observationStamp: ObservationStamp;
  readonly coverage: GenerationCoverage;
  readonly resourcesById: ReadonlyMap<IDString, ResourceSnapshot>;
  readonly childrenByParent: ReadonlyMap<
    IDString | null,
    readonly ResourceChildRefSnapshot[]
  >;
  readonly assetById: ReadonlyMap<IDString, AssetSnapshot>;
  readonly assetOwnerById: ReadonlyMap<IDString, IDString>;
  readonly primaryAssetByResource: ReadonlyMap<IDString, IDString>;
  readonly lineageDependentsByAsset: ReadonlyMap<IDString, readonly IDString[]>;
  readonly resourcesByMark: ReadonlyMap<MarkIdentityKey, readonly IDString[]>;
  readonly statistics: ReadModelGenerationStatistics;
}

const COMPLETE_COVERAGE: CompleteGenerationCoverage = Object.freeze({
  asset_points_and_owners: "all",
  kind: "complete",
  mark_selectors: "all",
  resource_one_level: "all",
  resource_points: "all",
  storage_global: true,
});

const ROOT_PARENT = "\u0000extensia-root-parent";

function mapIterator<T>(iterator: IterableIterator<T>): MapIterator<T> {
  Object.defineProperty(iterator, Symbol.dispose, {
    configurable: true,
    value: () => undefined,
  });
  return iterator as MapIterator<T>;
}

function parentKey(parentId: IDString | null): string {
  return parentId ?? ROOT_PARENT;
}

function parentID(key: string): IDString | null {
  return key === ROOT_PARENT ? null : (key as IDString);
}

class ParentProjectionMap implements ReadonlyMap<
  IDString | null,
  readonly ResourceChildRefSnapshot[]
> {
  readonly inner: PersistentStringMap<
    string,
    readonly ResourceChildRefSnapshot[]
  >;

  constructor(
    inner = PersistentStringMap.empty<
      string,
      readonly ResourceChildRefSnapshot[]
    >(),
  ) {
    this.inner = inner;
  }

  get size(): number {
    return this.inner.size;
  }

  get(key: IDString | null): readonly ResourceChildRefSnapshot[] | undefined {
    return this.inner.get(parentKey(key));
  }

  has(key: IDString | null): boolean {
    return this.inner.has(parentKey(key));
  }

  entries(): MapIterator<
    [IDString | null, readonly ResourceChildRefSnapshot[]]
  > {
    const source = this.inner.entries();
    return mapIterator(
      (function* () {
        for (const [key, value] of source) {
          yield [parentID(key), value] as [
            IDString | null,
            readonly ResourceChildRefSnapshot[],
          ];
        }
      })(),
    );
  }

  keys(): MapIterator<IDString | null> {
    const source = this.entries();
    return mapIterator(
      (function* () {
        for (const [key] of source) yield key;
      })(),
    );
  }

  values(): MapIterator<readonly ResourceChildRefSnapshot[]> {
    return this.inner.values();
  }

  forEach(
    callbackfn: (
      value: readonly ResourceChildRefSnapshot[],
      key: IDString | null,
      map: ReadonlyMap<IDString | null, readonly ResourceChildRefSnapshot[]>,
    ) => void,
    thisArg?: unknown,
  ): void {
    for (const [key, value] of this.entries()) {
      callbackfn.call(thisArg, value, key, this);
    }
  }

  [Symbol.iterator](): MapIterator<
    [IDString | null, readonly ResourceChildRefSnapshot[]]
  > {
    return this.entries();
  }

  get [Symbol.toStringTag](): string {
    return "ParentProjectionMap";
  }
}

interface MutableGenerationMaps {
  resourcesById: PersistentStringMap<IDString, ResourceSnapshot>;
  childrenByParent: ParentProjectionMap;
  assetById: PersistentStringMap<IDString, AssetSnapshot>;
  assetOwnerById: PersistentStringMap<IDString, IDString>;
  primaryAssetByResource: PersistentStringMap<IDString, IDString>;
  lineageDependentsByAsset: PersistentStringMap<IDString, readonly IDString[]>;
  resourcesByMark: PersistentStringMap<MarkIdentityKey, readonly IDString[]>;
}

export function createObservationStamp(): ObservationStamp {
  return Object.freeze({}) as ObservationStamp;
}

function sortedIDs(values: Iterable<IDString>): readonly IDString[] {
  return Object.freeze([...new Set(values)].sort());
}

function childRef(resource: ResourceSnapshot): ResourceChildRefSnapshot {
  return Object.freeze({
    id: resource.data.id,
    order_index: resource.data.order_index,
  });
}

function sortedChildren(
  children: Iterable<ResourceChildRefSnapshot>,
): readonly ResourceChildRefSnapshot[] {
  return Object.freeze(
    [...children]
      .map((child) => Object.freeze({ ...child }))
      .sort((left, right) =>
        left.order_index === right.order_index
          ? left.id.localeCompare(right.id)
          : left.order_index - right.order_index,
      ),
  );
}

export function markIdentityKey(
  mark: Pick<MarkSnapshot, "type" | "name">,
): MarkIdentityKey {
  return JSON.stringify([mark.type, mark.name]) as MarkIdentityKey;
}

function freezeAsset(input: AssetSnapshot): AssetSnapshot {
  const asset = buildAssetSnapshot(input);
  if (asset.data !== null) deepFreeze(asset.data);
  return Object.freeze(asset);
}

export function freezeResourceSnapshot(
  input: ResourceSnapshot,
): ResourceSnapshot {
  const built = buildResourceSnapshot(input);
  const resource: ResourceSnapshot = {
    ...built,
    assets: built.assets.map(freezeAsset),
  };
  Object.freeze(resource.data);
  resource.marks.forEach(Object.freeze);
  for (const values of Object.values(resource.kv)) Object.freeze(values);
  Object.freeze(resource.kv);
  Object.freeze(resource.assets);
  Object.freeze(resource.marks);
  return Object.freeze(resource);
}

function deepFreeze(value: object): void {
  for (const entry of Object.values(value)) {
    if (
      entry !== null &&
      typeof entry === "object" &&
      !Object.isFrozen(entry)
    ) {
      deepFreeze(entry);
    }
  }
  Object.freeze(value);
}

function setMap<K extends string, V>(
  map: PersistentStringMap<K, V>,
  key: K,
  value: V,
  writes: { count: number },
): PersistentStringMap<K, V> {
  const mutation = map.set(key, value);
  writes.count += mutation.structural_writes;
  return mutation.map;
}

function deleteMap<K extends string, V>(
  map: PersistentStringMap<K, V>,
  key: K,
  writes: { count: number },
): PersistentStringMap<K, V> {
  const mutation = map.delete(key);
  writes.count += mutation.structural_writes;
  return mutation.map;
}

function emptyMaps(): MutableGenerationMaps {
  return {
    assetById: PersistentStringMap.empty(),
    assetOwnerById: PersistentStringMap.empty(),
    childrenByParent: new ParentProjectionMap(),
    lineageDependentsByAsset: PersistentStringMap.empty(),
    primaryAssetByResource: PersistentStringMap.empty(),
    resourcesById: PersistentStringMap.empty(),
    resourcesByMark: PersistentStringMap.empty(),
  };
}

function publishable(
  maps: MutableGenerationMaps,
  statistics: ReadModelGenerationStatistics,
  coverage: GenerationCoverage = COMPLETE_COVERAGE,
  observationStamp: ObservationStamp = createObservationStamp(),
): ReadModelGeneration {
  return Object.freeze({
    ...maps,
    coverage,
    observationStamp,
    statistics: Object.freeze(statistics),
  });
}

class ImmutableSet<T> implements ReadonlySet<T> {
  readonly #values: Set<T>;

  constructor(values: Iterable<T>) {
    this.#values = new Set(values);
    Object.freeze(this);
  }

  get size(): number {
    return this.#values.size;
  }

  has(value: T): boolean {
    return this.#values.has(value);
  }

  entries(): SetIterator<[T, T]> {
    return this.#values.entries();
  }

  keys(): SetIterator<T> {
    return this.#values.keys();
  }

  values(): SetIterator<T> {
    return this.#values.values();
  }

  forEach(
    callbackfn: (value: T, value2: T, set: ReadonlySet<T>) => void,
    thisArg?: unknown,
  ): void {
    this.#values.forEach((value, value2) =>
      callbackfn.call(thisArg, value, value2, this),
    );
  }

  [Symbol.iterator](): SetIterator<T> {
    return this.values();
  }

  get [Symbol.toStringTag](): string {
    return "ImmutableSet";
  }
}

function frozenSet<T>(values: Iterable<T> = []): ReadonlySet<T> {
  return new ImmutableSet(values);
}

function selectiveCoverage(
  input: {
    readonly resourcePoints?: Iterable<IDString>;
    readonly resourceOneLevel?: Iterable<IDString>;
    readonly assetPoints?: Iterable<IDString>;
    readonly markSelectors?: Iterable<MarkIdentityKey>;
    readonly localResourcePoints?: Iterable<IDString>;
  } = {},
): SelectiveGenerationCoverage {
  return Object.freeze({
    asset_points_and_owners: frozenSet(input.assetPoints),
    kind: "selective",
    local_resource_points: frozenSet(input.localResourcePoints),
    mark_selectors: frozenSet(input.markSelectors),
    resource_one_level: frozenSet(input.resourceOneLevel),
    resource_points: frozenSet(input.resourcePoints),
    storage_global: false,
  });
}

export function buildEmptySelectiveReadModelGeneration(
  observationStamp: ObservationStamp,
): ReadModelGeneration {
  return publishable(
    emptyMaps(),
    {
      changed_resources: 0,
      delta_publications: 0,
      full_rebuilds: 0,
      structural_writes: 0,
      touched_projection_keys: 0,
    },
    selectiveCoverage(),
    observationStamp,
  );
}

export function buildSelectiveReadModelGeneration(input: {
  readonly observationStamp: ObservationStamp;
  readonly resources: readonly ResourceSnapshot[];
  readonly resourcePoints?: readonly IDString[];
  readonly resourceOneLevelPoints?: readonly IDString[];
  readonly resourceOneLevel?: Readonly<{
    readonly parent: IDString;
    readonly children: readonly ResourceSnapshot[];
  }>;
  readonly assetPoints?: readonly IDString[];
  readonly markSelector?: Readonly<{
    readonly key: MarkIdentityKey;
    readonly resourceIds: readonly IDString[];
  }>;
}): ReadModelGeneration {
  const maps = emptyMaps();
  const writes = { count: 0 };
  const detached = input.resources.map(freezeResourceSnapshot);
  const byID = new Map<IDString, ResourceSnapshot>();
  const lineage = new Map<IDString, IDString[]>();
  for (const resource of detached) {
    if (byID.has(resource.data.id)) {
      throw new ResourceRuntimeIntegrityError(
        "RESOURCE_INDEX_INTEGRITY",
        "Selective observation contains duplicate Resource IDs",
      );
    }
    byID.set(resource.data.id, resource);
    maps.resourcesById = setMap(
      maps.resourcesById,
      resource.data.id,
      resource,
      writes,
    );
    if (resource.data.is_deleted) continue;
    const primary = resource.assets.find((asset) => asset.is_primary);
    if (primary !== undefined) {
      maps.primaryAssetByResource = setMap(
        maps.primaryAssetByResource,
        resource.data.id,
        primary.id,
        writes,
      );
    }
    for (const asset of resource.assets) {
      const owner = maps.assetOwnerById.get(asset.id);
      if (owner !== undefined && owner !== resource.data.id) {
        throw new ResourceRuntimeIntegrityError(
          "RESOURCE_INDEX_INTEGRITY",
          "Selective observation duplicates a global Asset ID",
        );
      }
      maps.assetById = setMap(maps.assetById, asset.id, asset, writes);
      maps.assetOwnerById = setMap(
        maps.assetOwnerById,
        asset.id,
        resource.data.id,
        writes,
      );
      if (asset.derived_from !== null) {
        const dependents = lineage.get(asset.derived_from) ?? [];
        dependents.push(asset.id);
        lineage.set(asset.derived_from, dependents);
      }
    }
  }
  for (const [assetID, dependents] of lineage) {
    maps.lineageDependentsByAsset = setMap(
      maps.lineageDependentsByAsset,
      assetID,
      sortedIDs(dependents),
      writes,
    );
  }
  if (input.resourceOneLevel !== undefined) {
    const parent = byID.get(input.resourceOneLevel.parent);
    if (parent === undefined || parent.data.is_deleted) {
      throw new ResourceRuntimeIntegrityError(
        "RESOURCE_INDEX_INTEGRITY",
        "Selective one-level observation is missing its active parent",
      );
    }
    const children = input.resourceOneLevel.children.map((child) => {
      if (
        child.data.is_deleted ||
        child.data.parent_id !== input.resourceOneLevel!.parent
      ) {
        throw new ResourceRuntimeIntegrityError(
          "RESOURCE_INDEX_INTEGRITY",
          "Selective one-level observation contains an invalid child",
        );
      }
      return childRef(child);
    });
    const sorted = sortedChildren(children);
    for (let index = 0; index < sorted.length; index += 1) {
      if (sorted[index]!.order_index !== index) {
        throw new ResourceRuntimeIntegrityError(
          "RESOURCE_INDEX_INTEGRITY",
          "Selective one-level observation violates dense sibling order",
        );
      }
    }
    maps.childrenByParent = new ParentProjectionMap(
      setMap(
        maps.childrenByParent.inner,
        parentKey(input.resourceOneLevel.parent),
        sorted,
        writes,
      ),
    );
  }
  if (input.markSelector !== undefined) {
    for (const resourceID of input.markSelector.resourceIds) {
      const resource = byID.get(resourceID);
      if (
        resource === undefined ||
        resource.data.is_deleted ||
        !resource.marks.some(
          (mark) => markIdentityKey(mark) === input.markSelector!.key,
        )
      ) {
        throw new ResourceRuntimeIntegrityError(
          "RESOURCE_INDEX_INTEGRITY",
          "Selective Mark observation contains an invalid match",
        );
      }
    }
    maps.resourcesByMark = setMap(
      maps.resourcesByMark,
      input.markSelector.key,
      sortedIDs(input.markSelector.resourceIds),
      writes,
    );
  }
  return publishable(
    maps,
    {
      changed_resources: detached.length,
      delta_publications: 0,
      full_rebuilds: 0,
      structural_writes: writes.count,
      touched_projection_keys: writes.count,
    },
    selectiveCoverage({
      ...(input.assetPoints === undefined
        ? {}
        : { assetPoints: input.assetPoints }),
      markSelectors:
        input.markSelector === undefined ? [] : [input.markSelector.key],
      resourceOneLevel:
        input.resourceOneLevel === undefined
          ? (input.resourceOneLevelPoints ?? [])
          : [input.resourceOneLevel.parent],
      ...(input.resourcePoints === undefined
        ? {}
        : { resourcePoints: input.resourcePoints }),
    }),
    input.observationStamp,
  );
}

export function hasResourcePointCoverage(
  generation: ReadModelGeneration,
  id: IDString,
): boolean {
  return (
    generation.coverage.kind === "complete" ||
    generation.coverage.resource_points.has(id)
  );
}

export function hasResourceOneLevelCoverage(
  generation: ReadModelGeneration,
  id: IDString,
): boolean {
  return (
    generation.coverage.kind === "complete" ||
    generation.coverage.resource_one_level.has(id)
  );
}

export function hasAssetPointCoverage(
  generation: ReadModelGeneration,
  id: IDString,
): boolean {
  return (
    generation.coverage.kind === "complete" ||
    generation.coverage.asset_points_and_owners.has(id)
  );
}

export function hasMarkSelectorCoverage(
  generation: ReadModelGeneration,
  key: MarkIdentityKey,
): boolean {
  return (
    generation.coverage.kind === "complete" ||
    generation.coverage.mark_selectors.has(key)
  );
}

function readinessMap(
  payloadStates: readonly AssetPayloadState[] | undefined,
): ReadonlyMap<IDString, boolean> | undefined {
  if (payloadStates === undefined) return undefined;
  return new Map(
    payloadStates
      .filter((state) => state.active_upload !== null)
      .map((state) => [state.asset_id, state.committed]),
  );
}

export function buildCompleteReadModelGeneration(
  resources: readonly ResourceSnapshot[],
  options: Readonly<{
    payloadStates?: readonly AssetPayloadState[];
    assetReadiness?: ReadonlyMap<IDString, boolean>;
  }> = {},
): ReadModelGeneration {
  const detached = resources.map(freezeResourceSnapshot);
  const resourceAuthority = new Map<IDString, ResourceSnapshot>();
  for (const resource of detached) {
    if (resourceAuthority.has(resource.data.id)) {
      throw new ResourceRuntimeIntegrityError(
        "RESOURCE_INDEX_INTEGRITY",
        "Read-model generation contains duplicate Resource IDs",
      );
    }
    resourceAuthority.set(resource.data.id, resource);
  }
  try {
    validateResourceHierarchy(resourceAuthority);
    if (
      !validateAssetSnapshotStorageInvariants(
        detached,
        options.assetReadiness ?? readinessMap(options.payloadStates),
      )
    ) {
      throw new Error("Asset projection invariants are invalid");
    }
  } catch (error) {
    throw new ResourceRuntimeIntegrityError(
      "RESOURCE_INDEX_INTEGRITY",
      error instanceof Error ? error.message : "Read-model integrity failed",
    );
  }

  const maps = emptyMaps();
  const writes = { count: 0 };
  const touched = new Set<string>();
  const children = new Map<string, ResourceChildRefSnapshot[]>();
  const lineage = new Map<IDString, IDString[]>();
  const marked = new Map<MarkIdentityKey, IDString[]>();

  for (const resource of detached) {
    touched.add(`resource:${resource.data.id}`);
    maps.resourcesById = setMap(
      maps.resourcesById,
      resource.data.id,
      resource,
      writes,
    );
    if (resource.data.is_deleted) continue;
    const key = parentKey(resource.data.parent_id);
    const siblingRefs = children.get(key) ?? [];
    siblingRefs.push(childRef(resource));
    children.set(key, siblingRefs);
    const primary = resource.assets.find((asset) => asset.is_primary);
    if (primary !== undefined) {
      touched.add(`primary:${resource.data.id}`);
      maps.primaryAssetByResource = setMap(
        maps.primaryAssetByResource,
        resource.data.id,
        primary.id,
        writes,
      );
    }
    for (const asset of resource.assets) {
      touched.add(`asset:${asset.id}`);
      maps.assetById = setMap(
        maps.assetById,
        asset.id,
        freezeAsset(asset),
        writes,
      );
      maps.assetOwnerById = setMap(
        maps.assetOwnerById,
        asset.id,
        resource.data.id,
        writes,
      );
      if (asset.derived_from !== null) {
        const dependents = lineage.get(asset.derived_from) ?? [];
        dependents.push(asset.id);
        lineage.set(asset.derived_from, dependents);
      }
    }
    for (const mark of resource.marks) {
      const markKey = markIdentityKey(mark);
      const resourceIDs = marked.get(markKey) ?? [];
      resourceIDs.push(resource.data.id);
      marked.set(markKey, resourceIDs);
    }
  }
  let parentInner = maps.childrenByParent.inner;
  for (const [key, refs] of children) {
    touched.add(`children:${key}`);
    parentInner = setMap(parentInner, key, sortedChildren(refs), writes);
  }
  maps.childrenByParent = new ParentProjectionMap(parentInner);
  for (const [assetID, dependents] of lineage) {
    touched.add(`lineage:${assetID}`);
    maps.lineageDependentsByAsset = setMap(
      maps.lineageDependentsByAsset,
      assetID,
      sortedIDs(dependents),
      writes,
    );
  }
  for (const [markKey, resourceIDs] of marked) {
    touched.add(`mark:${markKey}`);
    maps.resourcesByMark = setMap(
      maps.resourcesByMark,
      markKey,
      sortedIDs(resourceIDs),
      writes,
    );
  }
  return publishable(maps, {
    changed_resources: detached.length,
    delta_publications: 0,
    full_rebuilds: 1,
    structural_writes: writes.count,
    touched_projection_keys: touched.size,
  });
}

function removeID(
  values: readonly IDString[] | undefined,
  id: IDString,
): readonly IDString[] {
  return sortedIDs((values ?? []).filter((value) => value !== id));
}

function addID(
  values: readonly IDString[] | undefined,
  id: IDString,
): readonly IDString[] {
  return sortedIDs([...(values ?? []), id]);
}

function validateChangedHierarchy(
  resources: ReadonlyMap<IDString, ResourceSnapshot>,
  changed: readonly ResourceSnapshot[],
  allowUnobservedParent: boolean,
): void {
  for (const resource of changed) {
    const parent = resource.data.parent_id;
    if (parent !== null && !resources.has(parent) && !allowUnobservedParent) {
      throw new ResourceRuntimeIntegrityError(
        "RESOURCE_INDEX_INTEGRITY",
        "Read-model delta contains an orphan Resource",
      );
    }
    const visited = new Set<IDString>();
    let current: IDString | null = resource.data.id;
    while (current !== null) {
      if (visited.has(current)) {
        throw new ResourceRuntimeIntegrityError(
          "RESOURCE_INDEX_INTEGRITY",
          "Read-model delta contains a Resource cycle",
        );
      }
      visited.add(current);
      current = resources.get(current)?.data.parent_id ?? null;
    }
  }
}

export function applyCompleteReadModelDelta(
  current: ReadModelGeneration,
  changedResources: readonly ResourceSnapshot[],
  options: Readonly<{
    fullRebuild?: boolean;
    storageValidatedLocalDelta?: boolean;
    localPublication?: boolean;
  }> = {},
): ReadModelGeneration {
  const changed = changedResources.map(freezeResourceSnapshot);
  const changedIDs = new Set<IDString>();
  for (const resource of changed) {
    if (changedIDs.has(resource.data.id)) {
      throw new ResourceRuntimeIntegrityError(
        "RESOURCE_INDEX_INTEGRITY",
        "Read-model delta contains duplicate Resource IDs",
      );
    }
    changedIDs.add(resource.data.id);
  }

  const writes = { count: 0 };
  const touched = new Set<string>();
  const maps: MutableGenerationMaps = {
    assetById: current.assetById as PersistentStringMap<
      IDString,
      AssetSnapshot
    >,
    assetOwnerById: current.assetOwnerById as PersistentStringMap<
      IDString,
      IDString
    >,
    childrenByParent: current.childrenByParent as ParentProjectionMap,
    lineageDependentsByAsset:
      current.lineageDependentsByAsset as PersistentStringMap<
        IDString,
        readonly IDString[]
      >,
    primaryAssetByResource:
      current.primaryAssetByResource as PersistentStringMap<IDString, IDString>,
    resourcesById: current.resourcesById as PersistentStringMap<
      IDString,
      ResourceSnapshot
    >,
    resourcesByMark: current.resourcesByMark as PersistentStringMap<
      MarkIdentityKey,
      readonly IDString[]
    >,
  };

  const oldResources = changed
    .map((resource) => maps.resourcesById.get(resource.data.id))
    .filter((resource): resource is ResourceSnapshot => resource !== undefined);
  const oldByID = new Map(
    oldResources.map((resource) => [resource.data.id, resource]),
  );

  for (const resource of oldResources) {
    touched.add(`primary:${resource.data.id}`);
    maps.primaryAssetByResource = deleteMap(
      maps.primaryAssetByResource,
      resource.data.id,
      writes,
    );
    for (const asset of resource.assets) {
      touched.add(`asset:${asset.id}`);
      maps.assetById = deleteMap(maps.assetById, asset.id, writes);
      maps.assetOwnerById = deleteMap(maps.assetOwnerById, asset.id, writes);
      if (asset.derived_from !== null) {
        touched.add(`lineage:${asset.derived_from}`);
        const dependents = removeID(
          maps.lineageDependentsByAsset.get(asset.derived_from),
          asset.id,
        );
        maps.lineageDependentsByAsset =
          dependents.length === 0
            ? deleteMap(
                maps.lineageDependentsByAsset,
                asset.derived_from,
                writes,
              )
            : setMap(
                maps.lineageDependentsByAsset,
                asset.derived_from,
                dependents,
                writes,
              );
      }
    }
    for (const mark of resource.marks) {
      const key = markIdentityKey(mark);
      touched.add(`mark:${key}`);
      const resourceIDs = removeID(
        maps.resourcesByMark.get(key),
        resource.data.id,
      );
      maps.resourcesByMark =
        resourceIDs.length === 0
          ? deleteMap(maps.resourcesByMark, key, writes)
          : setMap(maps.resourcesByMark, key, resourceIDs, writes);
    }
  }

  for (const resource of changed) {
    touched.add(`resource:${resource.data.id}`);
    maps.resourcesById = setMap(
      maps.resourcesById,
      resource.data.id,
      resource,
      writes,
    );
  }
  validateChangedHierarchy(
    maps.resourcesById,
    changed,
    options.storageValidatedLocalDelta === true,
  );

  const touchedParents = new Set<IDString | null>();
  for (const resource of changed) {
    const old = oldByID.get(resource.data.id);
    if (
      old === undefined ||
      old.data.is_deleted !== resource.data.is_deleted ||
      old.data.parent_id !== resource.data.parent_id ||
      old.data.order_index !== resource.data.order_index
    ) {
      if (old !== undefined) touchedParents.add(old.data.parent_id);
      touchedParents.add(resource.data.parent_id);
    }
  }
  let parentInner = maps.childrenByParent.inner;
  for (const parent of touchedParents) {
    touched.add(`children:${parent ?? "root"}`);
    const refs = new Map(
      (maps.childrenByParent.get(parent) ?? []).map((ref) => [ref.id, ref]),
    );
    for (const resource of oldResources) {
      if (resource.data.parent_id === parent) refs.delete(resource.data.id);
    }
    for (const resource of changed) {
      if (!resource.data.is_deleted && resource.data.parent_id === parent) {
        refs.set(resource.data.id, childRef(resource));
      }
    }
    const children = sortedChildren(refs.values());
    for (let index = 0; index < children.length; index += 1) {
      if (
        options.storageValidatedLocalDelta !== true &&
        children[index]!.order_index !== index
      ) {
        throw new ResourceRuntimeIntegrityError(
          "RESOURCE_INDEX_INTEGRITY",
          "Read-model delta violates dense sibling order",
        );
      }
    }
    parentInner =
      children.length === 0
        ? deleteMap(parentInner, parentKey(parent), writes)
        : setMap(parentInner, parentKey(parent), children, writes);
  }
  maps.childrenByParent = new ParentProjectionMap(parentInner);

  for (const resource of changed) {
    if (resource.data.is_deleted) continue;
    const primary = resource.assets.find((asset) => asset.is_primary);
    touched.add(`primary:${resource.data.id}`);
    if (primary !== undefined) {
      maps.primaryAssetByResource = setMap(
        maps.primaryAssetByResource,
        resource.data.id,
        primary.id,
        writes,
      );
    }
    for (const asset of resource.assets) {
      const existingOwner = maps.assetOwnerById.get(asset.id);
      if (existingOwner !== undefined && existingOwner !== resource.data.id) {
        throw new ResourceRuntimeIntegrityError(
          "RESOURCE_INDEX_INTEGRITY",
          "Read-model delta duplicates a global Asset ID",
        );
      }
      touched.add(`asset:${asset.id}`);
      maps.assetById = setMap(
        maps.assetById,
        asset.id,
        freezeAsset(asset),
        writes,
      );
      maps.assetOwnerById = setMap(
        maps.assetOwnerById,
        asset.id,
        resource.data.id,
        writes,
      );
      if (asset.derived_from !== null) {
        touched.add(`lineage:${asset.derived_from}`);
        maps.lineageDependentsByAsset = setMap(
          maps.lineageDependentsByAsset,
          asset.derived_from,
          addID(
            maps.lineageDependentsByAsset.get(asset.derived_from),
            asset.id,
          ),
          writes,
        );
      }
    }
    for (const mark of resource.marks) {
      const key = markIdentityKey(mark);
      touched.add(`mark:${key}`);
      maps.resourcesByMark = setMap(
        maps.resourcesByMark,
        key,
        addID(maps.resourcesByMark.get(key), resource.data.id),
        writes,
      );
    }
  }

  let coverage: GenerationCoverage = current.coverage;
  if (current.coverage.kind === "selective") {
    const resourcePoints = new Set(current.coverage.resource_points);
    const resourceOneLevel = new Set(current.coverage.resource_one_level);
    const assetPoints = new Set(current.coverage.asset_points_and_owners);
    const markSelectors = new Set(current.coverage.mark_selectors);
    const localResourcePoints = new Set(current.coverage.local_resource_points);
    for (const resource of oldResources) {
      resourceOneLevel.delete(resource.data.parent_id as IDString);
      resource.assets.forEach((asset) => assetPoints.delete(asset.id));
      resource.marks.forEach((mark) =>
        markSelectors.delete(markIdentityKey(mark)),
      );
    }
    for (const resource of changed) {
      resourcePoints.add(resource.data.id);
      if (options.localPublication === true) {
        localResourcePoints.add(resource.data.id);
      }
      resourceOneLevel.delete(resource.data.parent_id as IDString);
      resource.assets.forEach((asset) => assetPoints.delete(asset.id));
      resource.marks.forEach((mark) =>
        markSelectors.delete(markIdentityKey(mark)),
      );
    }
    coverage = selectiveCoverage({
      assetPoints,
      localResourcePoints,
      markSelectors,
      resourceOneLevel,
      resourcePoints,
    });
  }

  return publishable(
    maps,
    {
      changed_resources: changed.length,
      delta_publications:
        current.statistics.delta_publications + (options.fullRebuild ? 0 : 1),
      full_rebuilds:
        current.statistics.full_rebuilds + (options.fullRebuild ? 1 : 0),
      structural_writes: writes.count,
      touched_projection_keys: touched.size,
    },
    coverage,
  );
}

export function rebaseSelectiveLocalOverlays(
  current: ReadModelGeneration,
  observed: ReadModelGeneration,
): ReadModelGeneration {
  if (
    current.coverage.kind === "complete" ||
    observed.coverage.kind === "complete" ||
    current.coverage.local_resource_points.size === 0
  ) {
    return observed;
  }
  const observedCoverage = observed.coverage;
  const overlays = [...current.coverage.local_resource_points]
    .map((id) => current.resourcesById.get(id))
    .filter(
      (resource): resource is ResourceSnapshot =>
        resource !== undefined &&
        !(
          resource.data.is_deleted &&
          resource.data.parent_id !== null &&
          observedCoverage.resource_one_level.has(resource.data.parent_id) &&
          !observed.resourcesById.has(resource.data.id)
        ) &&
        !isDeepStrictEqual(
          resource,
          observed.resourcesById.get(resource.data.id),
        ),
    );
  return overlays.length === 0
    ? observed
    : applyCompleteReadModelDelta(observed, overlays, {
        localPublication: true,
        storageValidatedLocalDelta: true,
      });
}
