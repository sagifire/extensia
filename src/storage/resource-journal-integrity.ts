import { createHash } from "node:crypto";

import {
  buildResourceSnapshot,
  type ResourceSnapshot,
} from "../domain/snapshots.js";
import type {
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

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) {
      throw new ResourceStorageIntegrityError("Value is not canonical JSON");
    }
    return encoded;
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(",")}}`;
}

export function computeResourceWriteSetFingerprint(
  resources: readonly ResourceSnapshot[],
): WriteSetFingerprint {
  const detached = resources.map(buildResourceSnapshot);
  return createHash("sha256")
    .update(canonicalize(detached), "utf8")
    .digest("hex") as WriteSetFingerprint;
}

export function cloneCommittedOperationDraft(
  draft: CommittedOperationDraft,
): CommittedOperationDraft {
  return {
    actor_id: draft.actor_id,
    affected_resources: [...draft.affected_resources],
    changes: draft.changes.map((change) => ({ ...change })),
    committed_at: draft.committed_at,
    operation_id: draft.operation_id,
    schema_version: 1,
    type: draft.type,
    write_set_fingerprint: draft.write_set_fingerprint,
  };
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
    canonicalize(cloneCommittedOperationDraft(left)) ===
    canonicalize(cloneCommittedOperationDraft(right))
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
