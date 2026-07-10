import {
  cloneJSONObject,
  isJSONArray,
  isJSONObject,
  type JSONObject,
} from "./json.js";
import {
  isIDString,
  isTimestamp,
  type IDString,
  type Timestamp,
} from "./scalars.js";

export interface MarkSnapshot {
  readonly type: string;
  readonly name: string;
  readonly value: number | null;
}

export type ResourceKVSnapshot = Readonly<
  Record<string, Readonly<Record<string, string>>>
>;

export interface AssetSnapshot {
  readonly id: IDString;
  readonly type: string;
  readonly role: string;
  readonly mime: string | null;
  readonly extension: string | null;
  readonly is_external: boolean;
  readonly is_primary: boolean;
  readonly is_on_uploading: boolean;
  readonly url: string | null;
  readonly derived_from: IDString | null;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
  readonly data: JSONObject | null;
}

export interface ResourceDataSnapshot {
  readonly id: IDString;
  readonly created_at: Timestamp;
  readonly updated_at: Timestamp;
  readonly locked: boolean;
  readonly hidden: boolean;
  readonly is_deleted: boolean;
  readonly title: string;
  readonly description: string | null;
  readonly parent_id: IDString | null;
  readonly order_index: number;
}

export interface ResourceSnapshot {
  readonly data: ResourceDataSnapshot;
  readonly assets: readonly AssetSnapshot[];
  readonly marks: readonly MarkSnapshot[];
  readonly kv: ResourceKVSnapshot;
}

export interface ResourceChildRefSnapshot {
  readonly id: IDString;
  readonly order_index: number;
}

export interface ResourceTreeViewSnapshot {
  readonly resource: ResourceSnapshot;
  readonly children: readonly ResourceChildRefSnapshot[];
}

type UnknownRecord = Readonly<Record<string, unknown>>;

const ASSET_KEYS: readonly string[] = [
  "id",
  "type",
  "role",
  "mime",
  "extension",
  "is_external",
  "is_primary",
  "is_on_uploading",
  "url",
  "derived_from",
  "created_at",
  "updated_at",
  "data",
];
const MARK_KEYS: readonly string[] = ["type", "name", "value"];
const RESOURCE_DATA_KEYS: readonly string[] = [
  "id",
  "created_at",
  "updated_at",
  "locked",
  "hidden",
  "is_deleted",
  "title",
  "description",
  "parent_id",
  "order_index",
];
const RESOURCE_KEYS: readonly string[] = ["data", "assets", "marks", "kv"];
const CHILD_REF_KEYS: readonly string[] = ["id", "order_index"];
const TREE_VIEW_KEYS: readonly string[] = ["resource", "children"];

function isDataRecord(value: unknown): value is UnknownRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return false;
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") {
      return false;
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      return false;
    }
  }

  return true;
}

function hasExactKeys(
  value: unknown,
  expectedKeys: readonly string[],
): value is UnknownRecord {
  if (!isDataRecord(value)) {
    return false;
  }

  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableIDString(value: unknown): value is IDString | null {
  return value === null || isIDString(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isArrayOf<T>(
  value: unknown,
  guard: (candidate: unknown) => candidate is T,
): value is readonly T[] {
  return isJSONArray(value) && value.every(guard);
}

export function isMarkSnapshot(value: unknown): value is MarkSnapshot {
  if (!hasExactKeys(value, MARK_KEYS)) {
    return false;
  }

  const markValue = value["value"];
  return (
    typeof value["type"] === "string" &&
    typeof value["name"] === "string" &&
    (markValue === null ||
      (typeof markValue === "number" &&
        Number.isInteger(markValue) &&
        markValue >= -2_147_483_648 &&
        markValue <= 2_147_483_647))
  );
}

export function isResourceKVSnapshot(
  value: unknown,
): value is ResourceKVSnapshot {
  if (!isDataRecord(value)) {
    return false;
  }

  return Object.values(value).every(
    (namespace) =>
      isDataRecord(namespace) &&
      Object.values(namespace).every((item) => typeof item === "string"),
  );
}

export function isAssetSnapshot(value: unknown): value is AssetSnapshot {
  if (!hasExactKeys(value, ASSET_KEYS)) {
    return false;
  }

  const isExternal = value["is_external"];
  const isUploading = value["is_on_uploading"];
  const url = value["url"];

  if (
    !isIDString(value["id"]) ||
    typeof value["type"] !== "string" ||
    typeof value["role"] !== "string" ||
    !isNullableString(value["mime"]) ||
    !isNullableString(value["extension"]) ||
    typeof isExternal !== "boolean" ||
    typeof value["is_primary"] !== "boolean" ||
    typeof isUploading !== "boolean" ||
    !isNullableString(url) ||
    !isNullableIDString(value["derived_from"]) ||
    !isTimestamp(value["created_at"]) ||
    !isTimestamp(value["updated_at"]) ||
    !(value["data"] === null || isJSONObject(value["data"]))
  ) {
    return false;
  }

  return isExternal ? url !== null && !isUploading : url === null;
}

export function isResourceDataSnapshot(
  value: unknown,
): value is ResourceDataSnapshot {
  return (
    hasExactKeys(value, RESOURCE_DATA_KEYS) &&
    isIDString(value["id"]) &&
    isTimestamp(value["created_at"]) &&
    isTimestamp(value["updated_at"]) &&
    typeof value["locked"] === "boolean" &&
    typeof value["hidden"] === "boolean" &&
    typeof value["is_deleted"] === "boolean" &&
    typeof value["title"] === "string" &&
    isNullableString(value["description"]) &&
    isNullableIDString(value["parent_id"]) &&
    isFiniteNumber(value["order_index"])
  );
}

function hasValidAggregateInvariants(
  assets: readonly AssetSnapshot[],
  marks: readonly MarkSnapshot[],
): boolean {
  const assetIDs = new Set<IDString>();
  let primaryCount = 0;

  for (const asset of assets) {
    if (assetIDs.has(asset.id)) {
      return false;
    }

    assetIDs.add(asset.id);
    if (asset.is_primary) {
      primaryCount += 1;
      if (primaryCount > 1) {
        return false;
      }
    }
  }

  const marksByType = new Map<string, Set<string>>();
  for (const mark of marks) {
    const names = marksByType.get(mark.type) ?? new Set<string>();
    if (names.has(mark.name)) {
      return false;
    }

    names.add(mark.name);
    marksByType.set(mark.type, names);
  }

  return true;
}

export function isResourceSnapshot(value: unknown): value is ResourceSnapshot {
  if (!hasExactKeys(value, RESOURCE_KEYS)) {
    return false;
  }

  const assets = value["assets"];
  const marks = value["marks"];

  if (
    !isResourceDataSnapshot(value["data"]) ||
    !isArrayOf(assets, isAssetSnapshot) ||
    !isArrayOf(marks, isMarkSnapshot) ||
    !isResourceKVSnapshot(value["kv"])
  ) {
    return false;
  }

  return hasValidAggregateInvariants(assets, marks);
}

export function isResourceChildRefSnapshot(
  value: unknown,
): value is ResourceChildRefSnapshot {
  return (
    hasExactKeys(value, CHILD_REF_KEYS) &&
    isIDString(value["id"]) &&
    isFiniteNumber(value["order_index"])
  );
}

export function isResourceTreeViewSnapshot(
  value: unknown,
): value is ResourceTreeViewSnapshot {
  return (
    hasExactKeys(value, TREE_VIEW_KEYS) &&
    isResourceSnapshot(value["resource"]) &&
    isArrayOf(value["children"], isResourceChildRefSnapshot)
  );
}

function assertSnapshot<T>(
  value: unknown,
  guard: (candidate: unknown) => candidate is T,
  name: string,
): asserts value is T {
  if (!guard(value)) {
    throw new TypeError(`${name} violates the canonical domain contract`);
  }
}

function defineEnumerableValue<T>(
  target: Record<string, T>,
  key: string,
  value: T,
): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

export function buildMarkSnapshot(input: MarkSnapshot): MarkSnapshot {
  assertSnapshot(input, isMarkSnapshot, "MarkSnapshot");
  return { name: input.name, type: input.type, value: input.value };
}

export function buildResourceKVSnapshot(
  input: ResourceKVSnapshot,
): ResourceKVSnapshot {
  assertSnapshot(input, isResourceKVSnapshot, "ResourceKVSnapshot");
  const result: Record<string, Record<string, string>> = {};

  for (const [namespace, entries] of Object.entries(input)) {
    const entryClone: Record<string, string> = {};
    for (const [key, value] of Object.entries(entries)) {
      defineEnumerableValue(entryClone, key, value);
    }

    defineEnumerableValue(result, namespace, entryClone);
  }

  return result;
}

export function buildAssetSnapshot(input: AssetSnapshot): AssetSnapshot {
  assertSnapshot(input, isAssetSnapshot, "AssetSnapshot");
  return {
    created_at: input.created_at,
    data: input.data === null ? null : cloneJSONObject(input.data),
    derived_from: input.derived_from,
    extension: input.extension,
    id: input.id,
    is_external: input.is_external,
    is_on_uploading: input.is_on_uploading,
    is_primary: input.is_primary,
    mime: input.mime,
    role: input.role,
    type: input.type,
    updated_at: input.updated_at,
    url: input.url,
  };
}

export function buildResourceDataSnapshot(
  input: ResourceDataSnapshot,
): ResourceDataSnapshot {
  assertSnapshot(input, isResourceDataSnapshot, "ResourceDataSnapshot");
  return {
    created_at: input.created_at,
    description: input.description,
    hidden: input.hidden,
    id: input.id,
    is_deleted: input.is_deleted,
    locked: input.locked,
    order_index: input.order_index,
    parent_id: input.parent_id,
    title: input.title,
    updated_at: input.updated_at,
  };
}

export function buildResourceSnapshot(
  input: ResourceSnapshot,
): ResourceSnapshot {
  assertSnapshot(input, isResourceSnapshot, "ResourceSnapshot");
  return {
    assets: input.assets.map(buildAssetSnapshot),
    data: buildResourceDataSnapshot(input.data),
    kv: buildResourceKVSnapshot(input.kv),
    marks: input.marks.map(buildMarkSnapshot),
  };
}

export function buildResourceChildRefSnapshot(
  input: ResourceChildRefSnapshot,
): ResourceChildRefSnapshot {
  assertSnapshot(input, isResourceChildRefSnapshot, "ResourceChildRefSnapshot");
  return { id: input.id, order_index: input.order_index };
}

export function buildResourceTreeViewSnapshot(
  input: ResourceTreeViewSnapshot,
): ResourceTreeViewSnapshot {
  assertSnapshot(input, isResourceTreeViewSnapshot, "ResourceTreeViewSnapshot");
  return {
    children: input.children.map(buildResourceChildRefSnapshot),
    resource: buildResourceSnapshot(input.resource),
  };
}
