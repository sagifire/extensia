import type { IDString, Timestamp } from "../domain/scalars.js";
import type { ResourceSnapshot } from "../domain/snapshots.js";

declare const journalSequenceBrand: unique symbol;
declare const writeSetFingerprintBrand: unique symbol;

export type StorageCapabilityMode = "readonly" | "full";
export type JournalSequence = string & {
  readonly [journalSequenceBrand]: "JournalSequence";
};
export type WriteSetFingerprint = string & {
  readonly [writeSetFingerprintBrand]: "WriteSetFingerprint";
};

export interface ResourceRecoveryReport {
  readonly status: "clean" | "recovered";
  readonly rolled_back_operations: number;
  readonly completed_operations: number;
}

export interface CommittedResourceChange {
  readonly kind: "resource.upsert";
  readonly resource_id: IDString;
}

export interface CommittedOperationEntry {
  readonly schema_version: 1;
  readonly sequence: JournalSequence;
  readonly operation_id: IDString;
  readonly actor_id: IDString;
  readonly type:
    | "resource.create"
    | "resource.update"
    | "resource.move"
    | "resource.delete"
    | "resource.marks.set"
    | "resource.kv.set";
  readonly affected_resources: readonly IDString[];
  readonly committed_at: Timestamp;
  readonly write_set_fingerprint: WriteSetFingerprint;
  readonly changes: readonly CommittedResourceChange[];
}

export type CommittedOperationDraft = Omit<CommittedOperationEntry, "sequence">;

export interface ResourceWriteTransaction {
  stageResource(resource: ResourceSnapshot): Promise<void>;
  commit(entry: CommittedOperationDraft): Promise<CommittedOperationEntry>;
  abort(): Promise<void>;
}

export interface ResourceStorageSession {
  readonly recovery: ResourceRecoveryReport;
  listResources(): AsyncIterable<ResourceSnapshot>;
  readResource(id: IDString): Promise<ResourceSnapshot | null>;
  begin(operationId: IDString): Promise<ResourceWriteTransaction>;
  readCommittedOperationsAfter(
    cursor: JournalSequence | null,
  ): AsyncIterable<CommittedOperationEntry>;
  release(): Promise<void>;
}
