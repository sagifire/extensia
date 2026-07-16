import { createHash } from "node:crypto";

import {
  buildResourceSnapshot,
  type ResourceSnapshot,
} from "../domain/snapshots.js";
import { isIDString } from "../domain/scalars.js";
import type {
  AssetLogicalChange,
  CommittedOperationDraft,
  CommittedOperationEntry,
  JournalSequence,
  WriteSetFingerprint,
} from "./resource-write-protocol.js";
import { ResourceRuntimeIntegrityError } from "./resource-runtime-integrity.js";

export class ResourceStorageIntegrityError extends ResourceRuntimeIntegrityError {
  override readonly code = "RESOURCE_STORAGE_INTEGRITY";

  constructor(message: string) {
    super("RESOURCE_STORAGE_INTEGRITY", message);
    this.name = "ResourceStorageIntegrityError";
  }
}

export function parseJournalSequence(sequence: string): bigint {
  if (!/^[1-9][0-9]*$/.test(sequence)) {
    throw new ResourceStorageIntegrityError(
      "Journal sequence is not canonical",
    );
  }
  return BigInt(sequence);
}

export function journalSequence(value: bigint): JournalSequence {
  if (value < 1n) {
    throw new ResourceStorageIntegrityError(
      "Journal sequence must be positive",
    );
  }
  return value.toString() as JournalSequence;
}

export function canonicalResourceStorageJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) {
      throw new ResourceStorageIntegrityError("Value is not canonical JSON");
    }
    return encoded;
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalResourceStorageJson).join(",")}]`;
  }
  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalResourceStorageJson(record[key])}`,
    )
    .join(",")}}`;
}

export function computeResourceWriteSetFingerprint(
  resources: readonly ResourceSnapshot[],
  assetChanges?: readonly AssetLogicalChange[],
): WriteSetFingerprint {
  const detached = resources.map(buildResourceSnapshot);
  const value =
    assetChanges === undefined
      ? detached
      : {
          asset_changes: assetChanges.map(cloneAssetLogicalChange),
          resources: detached,
        };
  return createHash("sha256")
    .update(canonicalResourceStorageJson(value), "utf8")
    .digest("hex") as WriteSetFingerprint;
}

export function cloneAssetLogicalChange(
  change: AssetLogicalChange,
): AssetLogicalChange {
  return {
    asset_id: change.asset_id,
    owner_after: change.owner_after,
    owner_before: change.owner_before,
    payload_action: { ...change.payload_action },
    state_after: change.state_after,
    state_before: change.state_before,
  };
}

function exactDataRecord(
  value: unknown,
  keys: readonly string[],
): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))
  ) {
    return false;
  }
  return ownKeys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return (
      descriptor !== undefined &&
      descriptor.enumerable === true &&
      "value" in descriptor
    );
  });
}

function validLifecycleState(value: unknown): boolean {
  return (
    value === null ||
    value === "external-ready" ||
    value === "initial-uploading" ||
    value === "ready" ||
    value === "replacement-uploading"
  );
}

function validPayloadAction(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const kind = (value as { readonly kind?: unknown }).kind;
  if (kind === "none" || kind === "payload.delete") {
    return exactDataRecord(value, ["kind"]);
  }
  if (
    kind === "generation.create" ||
    kind === "generation.discard" ||
    kind === "payload.delete-and-generation.discard"
  ) {
    return (
      exactDataRecord(value, ["kind", "upload_id"]) &&
      isIDString(value["upload_id"])
    );
  }
  return (
    kind === "generation.publish" &&
    exactDataRecord(value, ["kind", "upload_id", "replaces_committed"]) &&
    isIDString(value["upload_id"]) &&
    typeof value["replaces_committed"] === "boolean"
  );
}

export function isAssetLogicalChange(
  value: unknown,
): value is AssetLogicalChange {
  return (
    exactDataRecord(value, [
      "asset_id",
      "owner_before",
      "owner_after",
      "state_before",
      "state_after",
      "payload_action",
    ]) &&
    isIDString(value["asset_id"]) &&
    (value["owner_before"] === null || isIDString(value["owner_before"])) &&
    (value["owner_after"] === null || isIDString(value["owner_after"])) &&
    validLifecycleState(value["state_before"]) &&
    validLifecycleState(value["state_after"]) &&
    validPayloadAction(value["payload_action"])
  );
}

export function hasCanonicalAssetChanges(
  changes: readonly unknown[],
): changes is readonly AssetLogicalChange[] {
  return changes.every(
    (change, index) =>
      isAssetLogicalChange(change) &&
      (index === 0 ||
        (changes[index - 1] as AssetLogicalChange).asset_id < change.asset_id),
  );
}

export function cloneCommittedOperationDraft(
  draft: CommittedOperationDraft,
): CommittedOperationDraft {
  const base = {
    actor_id: draft.actor_id,
    affected_resources: [...draft.affected_resources],
    changes: draft.changes.map((change) => ({ ...change })),
    committed_at: draft.committed_at,
    operation_id: draft.operation_id,
    schema_version: 1 as const,
    type: draft.type,
    write_set_fingerprint: draft.write_set_fingerprint,
  };
  return "asset_changes" in draft
    ? {
        ...base,
        type: draft.type,
        asset_changes: draft.asset_changes.map(cloneAssetLogicalChange),
      }
    : { ...base, type: draft.type };
}

export function cloneCommittedOperationEntry(
  entry: CommittedOperationEntry,
): CommittedOperationEntry {
  return { ...cloneCommittedOperationDraft(entry), sequence: entry.sequence };
}

export function equalCommittedOperationDrafts(
  left: CommittedOperationDraft,
  right: CommittedOperationDraft,
): boolean {
  return (
    canonicalResourceStorageJson(cloneCommittedOperationDraft(left)) ===
    canonicalResourceStorageJson(cloneCommittedOperationDraft(right))
  );
}

export function validateContiguousJournal(
  entries: readonly CommittedOperationEntry[],
): void {
  const operationIDs = new Set<string>();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    if (parseJournalSequence(entry.sequence) !== BigInt(index + 1)) {
      throw new ResourceStorageIntegrityError("Journal is not contiguous");
    }
    if (operationIDs.has(entry.operation_id)) {
      throw new ResourceStorageIntegrityError(
        "Journal operation ID is duplicated",
      );
    }
    operationIDs.add(entry.operation_id);
  }
}
