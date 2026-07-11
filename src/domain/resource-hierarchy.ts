import type { IDString, Timestamp } from "./scalars.js";
import { buildResourceSnapshot, type ResourceSnapshot } from "./snapshots.js";
import { ResourceRuntimeIntegrityError } from "../storage/resource-runtime-integrity.js";

export function validateResourceHierarchy(
  resources: ReadonlyMap<IDString, ResourceSnapshot>,
): void {
  const active = [...resources.values()].filter(
    (item) => !item.data.is_deleted,
  );
  const groups = new Map<IDString | null, ResourceSnapshot[]>();
  for (const resource of active) {
    const parent = resource.data.parent_id;
    if (parent !== null) {
      const parentResource = resources.get(parent);
      if (parentResource === undefined || parentResource.data.is_deleted) {
        throw new ResourceRuntimeIntegrityError(
          "RESOURCE_INDEX_INTEGRITY",
          "Active Resource has no active parent",
        );
      }
    }
    const group = groups.get(parent) ?? [];
    group.push(resource);
    groups.set(parent, group);
  }
  for (const group of groups.values()) {
    const order = group
      .map((item) => item.data.order_index)
      .sort((a, b) => a - b);
    if (
      order.some(
        (value, index) => !Number.isSafeInteger(value) || value !== index,
      )
    ) {
      throw new ResourceRuntimeIntegrityError(
        "RESOURCE_INDEX_INTEGRITY",
        "Active sibling order is not dense",
      );
    }
  }
  for (const resource of active) {
    const path = new Set<IDString>();
    let current: IDString | null = resource.data.id;
    while (current !== null) {
      if (path.has(current)) {
        throw new ResourceRuntimeIntegrityError(
          "RESOURCE_INDEX_INTEGRITY",
          "Resource hierarchy contains a cycle",
        );
      }
      path.add(current);
      current = resources.get(current)?.data.parent_id ?? null;
    }
  }
}

export type ResourceMovePreparation =
  | {
      readonly kind:
        "missing" | "parent-missing" | "cycle" | "range" | "no-change";
    }
  | {
      readonly kind: "success";
      readonly resources: readonly ResourceSnapshot[];
    };

export function prepareResourceMove(
  currentResources: readonly ResourceSnapshot[],
  targetId: IDString,
  parentId: IDString | null,
  orderIndex: number,
  now: Timestamp,
): ResourceMovePreparation {
  const byId = new Map(currentResources.map((item) => [item.data.id, item]));
  validateResourceHierarchy(byId);
  const target = byId.get(targetId);
  if (target === undefined || target.data.is_deleted)
    return { kind: "missing" };
  if (parentId !== null) {
    const parent = byId.get(parentId);
    if (parent === undefined || parent.data.is_deleted)
      return { kind: "parent-missing" };
    let cursor: IDString | null = parentId;
    while (cursor !== null) {
      if (cursor === targetId) return { kind: "cycle" };
      cursor = byId.get(cursor)?.data.parent_id ?? null;
    }
  }
  const source = currentResources
    .filter(
      (item) =>
        !item.data.is_deleted &&
        item.data.parent_id === target.data.parent_id &&
        item.data.id !== targetId,
    )
    .sort((a, b) => a.data.order_index - b.data.order_index);
  const destination =
    parentId === target.data.parent_id
      ? source
      : currentResources
          .filter(
            (item) =>
              !item.data.is_deleted &&
              item.data.parent_id === parentId &&
              item.data.id !== targetId,
          )
          .sort((a, b) => a.data.order_index - b.data.order_index);
  if (orderIndex < 0 || orderIndex > destination.length)
    return { kind: "range" };
  if (
    target.data.parent_id === parentId &&
    target.data.order_index === orderIndex
  )
    return { kind: "no-change" };
  destination.splice(orderIndex, 0, target);
  const changed = new Map<IDString, ResourceSnapshot>();
  const stageGroup = (
    group: readonly ResourceSnapshot[],
    nextParent: IDString | null,
  ) => {
    group.forEach((item, index) => {
      if (
        item.data.parent_id !== nextParent ||
        item.data.order_index !== index
      ) {
        changed.set(
          item.data.id,
          buildResourceSnapshot({
            ...item,
            data: {
              ...item.data,
              parent_id: nextParent,
              order_index: index,
              updated_at: now,
            },
          }),
        );
      }
    });
  };
  if (target.data.parent_id !== parentId)
    stageGroup(source, target.data.parent_id);
  stageGroup(destination, parentId);
  const next = new Map(byId);
  changed.forEach((value, key) => next.set(key, value));
  validateResourceHierarchy(next);
  return {
    kind: "success",
    resources: Object.freeze(
      [...changed.values()].sort((a, b) => a.data.id.localeCompare(b.data.id)),
    ),
  };
}
