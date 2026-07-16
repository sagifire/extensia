import type { AssetPayloadState } from "../domain/asset-metadata.js";
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

export type ResourceOperationType =
  | "resource.create"
  | "resource.update"
  | "resource.move"
  | "resource.delete"
  | "resource.marks.set"
  | "resource.kv.set";

export type AssetOperationType =
  | "asset.create"
  | "asset.update"
  | "asset.primary.set"
  | "asset.reassign"
  | "asset.delete";

export type AssetLifecycleState =
  "external-ready" | "initial-uploading" | "ready" | "replacement-uploading";

export type AssetPayloadAction =
  | { readonly kind: "none" }
  | { readonly kind: "generation.create"; readonly upload_id: IDString }
  | {
      readonly kind: "generation.publish";
      readonly upload_id: IDString;
      readonly replaces_committed: boolean;
    }
  | { readonly kind: "generation.discard"; readonly upload_id: IDString }
  | { readonly kind: "payload.delete" }
  | {
      readonly kind: "payload.delete-and-generation.discard";
      readonly upload_id: IDString;
    };

export interface AssetLogicalChange {
  readonly asset_id: IDString;
  readonly owner_before: IDString | null;
  readonly owner_after: IDString | null;
  readonly state_before: AssetLifecycleState | null;
  readonly state_after: AssetLifecycleState | null;
  readonly payload_action: AssetPayloadAction;
}

interface CommittedOperationBase {
  readonly schema_version: 1;
  readonly operation_id: IDString;
  readonly actor_id: IDString;
  readonly affected_resources: readonly IDString[];
  readonly committed_at: Timestamp;
  readonly write_set_fingerprint: WriteSetFingerprint;
  readonly changes: readonly CommittedResourceChange[];
}

export interface CommittedResourceOperationDraft extends CommittedOperationBase {
  readonly type: ResourceOperationType;
}

export interface CommittedAssetOperationDraft extends CommittedOperationBase {
  readonly type: AssetOperationType;
  readonly asset_changes: readonly AssetLogicalChange[];
}

export type CommittedOperationDraft =
  CommittedResourceOperationDraft | CommittedAssetOperationDraft;

export type CommittedOperationEntry = CommittedOperationDraft & {
  readonly sequence: JournalSequence;
};

export interface ResourceWriteTransaction {
  stageResource(resource: ResourceSnapshot): Promise<void>;
  stageAssetChange?(change: AssetLogicalChange): Promise<void>;
  commit(entry: CommittedOperationDraft): Promise<CommittedOperationEntry>;
  abort(): Promise<void>;
}

export interface ResourceStorageSession {
  readonly recovery: ResourceRecoveryReport;
  listResources(): AsyncIterable<ResourceSnapshot>;
  listAssetPayloadStates?(): AsyncIterable<AssetPayloadState>;
  readResource(id: IDString): Promise<ResourceSnapshot | null>;
  begin(operationId: IDString): Promise<ResourceWriteTransaction>;
  readCommittedOperationsAfter(
    cursor: JournalSequence | null,
  ): AsyncIterable<CommittedOperationEntry>;
  release(): Promise<void>;
}
