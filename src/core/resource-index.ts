import {
  buildResourceSnapshot,
  buildResourceTreeViewSnapshot,
  type ResourceChildRefSnapshot,
  type ResourceSnapshot,
  type ResourceTreeViewSnapshot,
} from "../domain/snapshots.js";
import type { IDString } from "../domain/scalars.js";

export interface GreedyResourceIndex {
  readonly ready: boolean;
  initialize(resources: AsyncIterable<ResourceSnapshot>): Promise<void>;
  clear(): void;
  getResource(id: IDString): ResourceSnapshot | undefined;
  getResourceTree(id: IDString): ResourceTreeViewSnapshot | undefined;
}

function compareChildren(
  left: ResourceChildRefSnapshot,
  right: ResourceChildRefSnapshot,
): number {
  if (left.order_index !== right.order_index) {
    return left.order_index < right.order_index ? -1 : 1;
  }
  if (left.id === right.id) return 0;
  return left.id < right.id ? -1 : 1;
}

function validateTree(
  resources: ReadonlyMap<IDString, ResourceSnapshot>,
): void {
  for (const resource of resources.values()) {
    const parentId = resource.data.parent_id;
    if (parentId !== null && !resources.has(parentId)) {
      throw new TypeError("Resource index contains an orphan relation");
    }
  }

  for (const resource of resources.values()) {
    const path = new Set<IDString>();
    let currentId: IDString | null = resource.data.id;

    while (currentId !== null) {
      if (path.has(currentId)) {
        throw new TypeError("Resource index contains a parent cycle");
      }
      path.add(currentId);
      currentId = resources.get(currentId)?.data.parent_id ?? null;
    }
  }
}

export function createGreedyResourceIndex(): GreedyResourceIndex {
  let ready = false;
  let resourcesById = new Map<IDString, ResourceSnapshot>();
  let childrenByParent = new Map<
    IDString,
    readonly ResourceChildRefSnapshot[]
  >();

  function assertReady(): void {
    if (!ready) {
      throw new Error("Resource index is not ready");
    }
  }

  return Object.freeze({
    get ready(): boolean {
      return ready;
    },
    async initialize(
      resources: AsyncIterable<ResourceSnapshot>,
    ): Promise<void> {
      if (ready) {
        throw new Error("Resource index is already initialized");
      }

      const nextResources = new Map<IDString, ResourceSnapshot>();
      for await (const candidate of resources) {
        const snapshot = buildResourceSnapshot(candidate);
        if (nextResources.has(snapshot.data.id)) {
          throw new TypeError("Resource index contains a duplicate ID");
        }
        nextResources.set(snapshot.data.id, snapshot);
      }

      validateTree(nextResources);

      const mutableChildren = new Map<IDString, ResourceChildRefSnapshot[]>();
      for (const resource of nextResources.values()) {
        const parentId = resource.data.parent_id;
        if (parentId === null) continue;

        const children = mutableChildren.get(parentId) ?? [];
        children.push({
          id: resource.data.id,
          order_index: resource.data.order_index,
        });
        mutableChildren.set(parentId, children);
      }

      const nextChildren = new Map<
        IDString,
        readonly ResourceChildRefSnapshot[]
      >();
      for (const [parentId, children] of mutableChildren) {
        nextChildren.set(
          parentId,
          Object.freeze([...children].sort(compareChildren)),
        );
      }

      resourcesById = nextResources;
      childrenByParent = nextChildren;
      ready = true;
    },
    clear(): void {
      ready = false;
      resourcesById = new Map<IDString, ResourceSnapshot>();
      childrenByParent = new Map<
        IDString,
        readonly ResourceChildRefSnapshot[]
      >();
    },
    getResource(id: IDString): ResourceSnapshot | undefined {
      assertReady();
      const resource = resourcesById.get(id);
      return resource === undefined
        ? undefined
        : buildResourceSnapshot(resource);
    },
    getResourceTree(id: IDString): ResourceTreeViewSnapshot | undefined {
      assertReady();
      const resource = resourcesById.get(id);
      if (resource === undefined) return undefined;

      return buildResourceTreeViewSnapshot({
        resource,
        children: childrenByParent.get(id) ?? [],
      });
    },
  });
}
