import { cloneJSONObject, type JSONObject, type JSONValue } from "./json.js";
import { isIDString, type IDString } from "./scalars.js";
import type { AssetSnapshot, ResourceSnapshot } from "./snapshots.js";

const MIME_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/;
const EXTENSION_PATTERN = /^[a-z0-9][a-z0-9_+-]*$/;
const encoder = new TextEncoder();

export interface AssetActiveUploadState {
  readonly upload_id: IDString;
  readonly replaces_committed: boolean;
}

export interface AssetPayloadState {
  readonly asset_id: IDString;
  readonly committed: boolean;
  readonly active_upload: AssetActiveUploadState | null;
}

export function isAssetClassifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 128 &&
    value.trim().length > 0
  );
}

export function isAssetMime(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" &&
      value.length >= 1 &&
      value.length <= 255 &&
      MIME_PATTERN.test(value))
  );
}

export function isAssetExtension(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" &&
      value.length >= 1 &&
      value.length <= 32 &&
      EXTENSION_PATTERN.test(value))
  );
}

export function canonicalizeAssetURL(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 1 || value.length > 4096) {
    return null;
  }
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username.length > 0 ||
      url.password.length > 0 ||
      url.href.length > 4096
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function canonicalJSON(value: JSONValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJSON).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalJSON((value as JSONObject)[key]!)}`,
    )
    .join(",")}}`;
}

function measureAssetData(value: unknown): value is JSONObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const ancestors = new WeakSet<object>();
  let nodes = 0;

  function visit(candidate: unknown, depth: number): candidate is JSONValue {
    nodes += 1;
    if (nodes > 4096) return false;
    if (
      candidate === null ||
      typeof candidate === "boolean" ||
      (typeof candidate === "number" && Number.isFinite(candidate))
    ) {
      return true;
    }
    if (typeof candidate === "string") return candidate.length <= 16_384;
    if (typeof candidate !== "object") return false;
    if (depth > 16) return false;
    if (ancestors.has(candidate)) return false;
    ancestors.add(candidate);
    try {
      if (Array.isArray(candidate)) {
        if (candidate.length > 1024) return false;
        const ownKeys = Reflect.ownKeys(candidate);
        if (
          ownKeys.some((key) => {
            if (key === "length") return false;
            if (typeof key !== "string") return true;
            const index = Number(key);
            return (
              !Number.isInteger(index) ||
              index < 0 ||
              index >= candidate.length ||
              String(index) !== key
            );
          })
        ) {
          return false;
        }
        for (let index = 0; index < candidate.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(
            candidate,
            String(index),
          );
          if (
            descriptor === undefined ||
            descriptor.enumerable !== true ||
            !("value" in descriptor) ||
            !visit(descriptor.value, depth + 1)
          ) {
            return false;
          }
        }
        return true;
      }
      const prototype = Object.getPrototypeOf(candidate);
      if (prototype !== Object.prototype && prototype !== null) return false;
      const keys = Reflect.ownKeys(candidate);
      if (keys.length > 256) return false;
      for (const key of keys) {
        if (typeof key !== "string" || key.length > 128) return false;
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
        if (
          descriptor === undefined ||
          descriptor.enumerable !== true ||
          !("value" in descriptor) ||
          !visit(descriptor.value, depth + 1)
        ) {
          return false;
        }
      }
      return true;
    } finally {
      ancestors.delete(candidate);
    }
  }

  if (!visit(value, 1)) return false;
  return (
    encoder.encode(canonicalJSON(value as JSONObject)).byteLength <= 65_536
  );
}

export function parseAssetData(value: unknown): JSONObject | null | undefined {
  if (value === null) return null;
  try {
    return measureAssetData(value) ? cloneJSONObject(value) : undefined;
  } catch {
    return undefined;
  }
}

export function isAssetData(value: unknown): value is JSONObject | null {
  if (value === null) return true;
  try {
    return measureAssetData(value);
  } catch {
    return false;
  }
}

export function assetDataEqual(
  left: JSONObject | null,
  right: JSONObject | null,
): boolean {
  if (left === null || right === null) return left === right;
  return canonicalJSON(left) === canonicalJSON(right);
}

export function isCanonicalAssetURL(value: unknown): value is string {
  return typeof value === "string" && canonicalizeAssetURL(value) === value;
}

export function compareAssetIDs(
  left: AssetSnapshot,
  right: AssetSnapshot,
): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export function hasValidAssetArrayInvariants(
  assets: readonly AssetSnapshot[],
): boolean {
  const byID = new Map<IDString, AssetSnapshot>();
  let primaryCount = 0;
  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index]!;
    if (index > 0 && assets[index - 1]!.id >= asset.id) return false;
    if (byID.has(asset.id)) return false;
    byID.set(asset.id, asset);
    if (asset.is_primary && ++primaryCount > 1) return false;
  }
  for (const asset of assets) {
    if (asset.derived_from === null) continue;
    if (asset.derived_from === asset.id || !byID.has(asset.derived_from)) {
      return false;
    }
    const visited = new Set<IDString>([asset.id]);
    let current: AssetSnapshot | undefined = asset;
    while (current?.derived_from !== null) {
      if (visited.has(current.derived_from)) return false;
      visited.add(current.derived_from);
      current = byID.get(current.derived_from);
      if (current === undefined) return false;
    }
  }
  return true;
}

function validPayloadState(value: AssetPayloadState): boolean {
  return (
    isIDString(value.asset_id) &&
    typeof value.committed === "boolean" &&
    (value.active_upload === null ||
      (isIDString(value.active_upload.upload_id) &&
        typeof value.active_upload.replaces_committed === "boolean"))
  );
}

export function validateAssetStorageInvariants(
  resources: readonly ResourceSnapshot[],
  payloadStates: readonly AssetPayloadState[],
): boolean {
  if (!validateAssetSnapshotStorageInvariants(resources)) return false;

  const assets = new Map<IDString, AssetSnapshot>();
  const owners = new Map<IDString, ResourceSnapshot>();
  for (const resource of resources) {
    for (const asset of resource.assets) {
      assets.set(asset.id, asset);
      owners.set(asset.id, resource);
    }
  }

  const stateByAsset = new Map<IDString, AssetPayloadState>();
  const activeUploadIDs = new Set<IDString>();
  for (const state of payloadStates) {
    if (
      !validPayloadState(state) ||
      stateByAsset.has(state.asset_id) ||
      (state.active_upload !== null &&
        (activeUploadIDs.has(state.active_upload.upload_id) ||
          assets.has(state.active_upload.upload_id)))
    ) {
      return false;
    }
    stateByAsset.set(state.asset_id, state);
    if (state.active_upload !== null) {
      activeUploadIDs.add(state.active_upload.upload_id);
    }
  }

  for (const [assetID, state] of stateByAsset) {
    const asset = assets.get(assetID);
    if (asset === undefined || asset.is_external) return false;
    if (asset.is_on_uploading) {
      if (
        state.active_upload === null ||
        state.committed !== state.active_upload.replaces_committed
      ) {
        return false;
      }
    } else if (!state.committed || state.active_upload !== null) {
      return false;
    }
  }

  for (const [assetID, asset] of assets) {
    const state = stateByAsset.get(assetID);
    if (asset.is_external) {
      if (state !== undefined) return false;
    } else if (state === undefined) {
      return false;
    }
    const owner = owners.get(assetID)!;
    if (owner.data.is_deleted && asset.is_on_uploading) {
      return false;
    }
    const ready = asset.is_external || state?.committed === true;
    if (asset.is_primary && !ready) return false;
    if (asset.derived_from !== null) {
      const target = assets.get(asset.derived_from);
      if (
        target === undefined ||
        !owner.assets.some((candidate) => candidate.id === target.id) ||
        !(target.is_external || stateByAsset.get(target.id)?.committed === true)
      ) {
        return false;
      }
    }
  }
  return true;
}

export function validateAssetSnapshotStorageInvariants(
  resources: readonly ResourceSnapshot[],
  readinessProof?: ReadonlyMap<IDString, boolean>,
): boolean {
  const assetIDs = new Set<IDString>();
  const assetsByID = new Map<IDString, AssetSnapshot>();
  for (const resource of resources) {
    if (!hasValidAssetArrayInvariants(resource.assets)) return false;
    for (const asset of resource.assets) {
      if (
        assetIDs.has(asset.id) ||
        asset.updated_at < asset.created_at ||
        asset.updated_at > resource.data.updated_at
      ) {
        return false;
      }
      assetIDs.add(asset.id);
      assetsByID.set(asset.id, asset);
    }
  }
  if (readinessProof !== undefined) {
    for (const [assetID, hasCommittedRepresentation] of readinessProof) {
      const asset = assetsByID.get(assetID);
      if (
        asset === undefined ||
        asset.is_external ||
        !asset.is_on_uploading ||
        typeof hasCommittedRepresentation !== "boolean"
      ) {
        return false;
      }
    }
    for (const resource of resources) {
      const localAssets = new Map(
        resource.assets.map((asset) => [asset.id, asset]),
      );
      for (const asset of resource.assets) {
        const ready =
          asset.is_external ||
          !asset.is_on_uploading ||
          readinessProof.get(asset.id) === true;
        if (asset.is_primary && !ready) return false;
        if (asset.derived_from !== null) {
          const target = localAssets.get(asset.derived_from)!;
          if (
            !target.is_external &&
            target.is_on_uploading &&
            readinessProof.get(target.id) !== true
          ) {
            return false;
          }
        }
      }
    }
  }
  return true;
}
