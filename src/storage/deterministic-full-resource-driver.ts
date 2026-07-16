import {
  validateAssetStorageInvariants,
  type AssetPayloadState,
} from "../domain/asset-metadata.js";
import {
  buildResourceSnapshot,
  type ResourceSnapshot,
} from "../domain/snapshots.js";
import type { IDString } from "../domain/scalars.js";
import type { FullResourceDriverAdapter } from "./full-resource-driver-adapter.js";
import {
  cloneAssetLogicalChange,
  canonicalResourceStorageJson,
  cloneCommittedOperationDraft,
  cloneCommittedOperationEntry,
  computeResourceWriteSetFingerprint,
  equalCommittedOperationDrafts,
  journalSequence,
  parseJournalSequence,
  ResourceStorageIntegrityError,
  validateContiguousJournal,
} from "./resource-journal-integrity.js";
import type {
  AssetLogicalChange,
  CommittedOperationDraft,
  CommittedOperationEntry,
  ResourceRecoveryReport,
  ResourceStorageSession,
  ResourceWriteTransaction,
} from "./resource-write-protocol.js";

export type DeterministicFullDriverCutPoint =
  | "open"
  | "close"
  | "session.acquire"
  | "recovery.rollback"
  | "recovery.finalize"
  | "resource.list"
  | "resource.read"
  | "journal.read"
  | "transaction.begin"
  | "transaction.stage.before"
  | "transaction.stage.after"
  | "transaction.commit.before"
  | "transaction.commit.after-durable"
  | "transaction.abort"
  | "session.release";

export class DeterministicDriverCrashError extends Error {
  readonly code = "DETERMINISTIC_DRIVER_CRASH";
  readonly cutPoint: DeterministicFullDriverCutPoint;

  constructor(cutPoint: DeterministicFullDriverCutPoint) {
    super(`Simulated process crash at ${cutPoint}`);
    this.name = "DeterministicDriverCrashError";
    this.cutPoint = cutPoint;
  }
}

interface StagingManifest {
  readonly operationId: IDString;
  readonly resources: ResourceSnapshot[];
  readonly assetChanges: AssetLogicalChange[];
  draft: CommittedOperationDraft | null;
  phase: "active" | "committed-needs-finalization";
}

export interface DeterministicFullDriverBacking {
  readonly assetPayloadStates: Map<IDString, AssetPayloadState>;
  readonly resources: Map<IDString, ResourceSnapshot>;
  readonly journal: CommittedOperationEntry[];
  readonly staging: Map<IDString, StagingManifest>;
}

export function createDeterministicFullDriverBacking(): DeterministicFullDriverBacking {
  return {
    assetPayloadStates: new Map(),
    journal: [],
    resources: new Map(),
    staging: new Map(),
  };
}

type Failure =
  | { readonly kind: "error"; readonly error: Error }
  | { readonly kind: "crash" };

class FailurePlan {
  readonly #failures = new Map<DeterministicFullDriverCutPoint, Failure[]>();
  readonly #onCrash: () => void;

  constructor(onCrash: () => void) {
    this.#onCrash = onCrash;
  }

  enqueue(point: DeterministicFullDriverCutPoint, failure: Failure): void {
    const queue = this.#failures.get(point) ?? [];
    queue.push(failure);
    this.#failures.set(point, queue);
  }

  hit(point: DeterministicFullDriverCutPoint): void {
    const queue = this.#failures.get(point);
    const failure = queue?.shift();
    if (failure === undefined) return;
    if (failure.kind === "crash") {
      this.#onCrash();
      throw new DeterministicDriverCrashError(point);
    }
    throw failure.error;
  }
}

class ExclusiveLease {
  #held = false;
  readonly #waiters: Array<{
    resolve: () => void;
    reject: (error: unknown) => void;
    signal?: AbortSignal;
  }> = [];

  async acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted === true) throw signal.reason;
    if (!this.#held) {
      this.#held = true;
      return () => this.release();
    }
    await new Promise<void>((resolve, reject) => {
      const waiter = {
        resolve,
        reject,
        ...(signal === undefined ? {} : { signal }),
      };
      this.#waiters.push(waiter);
      signal?.addEventListener(
        "abort",
        () => {
          const index = this.#waiters.indexOf(waiter);
          if (index >= 0) this.#waiters.splice(index, 1);
          reject(signal.reason);
        },
        { once: true },
      );
    });
    return () => this.release();
  }

  private release(): void {
    const waiter = this.#waiters.shift();
    if (waiter === undefined) this.#held = false;
    else waiter.resolve();
  }
}

const leases = new WeakMap<DeterministicFullDriverBacking, ExclusiveLease>();

function leaseFor(backing: DeterministicFullDriverBacking): ExclusiveLease {
  let lease = leases.get(backing);
  if (lease === undefined) {
    lease = new ExclusiveLease();
    leases.set(backing, lease);
  }
  return lease;
}

export interface DeterministicFullDriverFixture {
  readonly adapter: FullResourceDriverAdapter;
  failNext(point: DeterministicFullDriverCutPoint, error?: Error): void;
  crashNext(point: DeterministicFullDriverCutPoint): void;
  inspect(): Readonly<{
    asset_payload_states: readonly AssetPayloadState[];
    resources: readonly ResourceSnapshot[];
    journal: readonly CommittedOperationEntry[];
    staging_operations: readonly IDString[];
  }>;
  injectUnknownStaging(operationId: IDString): void;
  corruptJournal(mutator: (journal: CommittedOperationEntry[]) => void): void;
}

export function createDeterministicFullResourceDriver(
  backing: DeterministicFullDriverBacking = createDeterministicFullDriverBacking(),
): DeterministicFullDriverFixture {
  let opened = false;
  let activeSession = false;
  let crashRelease: (() => void) | null = null;
  let generation = 0;
  const failures = new FailurePlan(() => {
    const release = crashRelease;
    crashRelease = null;
    activeSession = false;
    opened = false;
    generation += 1;
    release?.();
  });

  const recover = (): ResourceRecoveryReport => {
    validateBacking(backing);
    let rolledBack = 0;
    let completed = 0;
    for (const [operationId, manifest] of [...backing.staging]) {
      if (manifest.phase === "active") {
        failures.hit("recovery.rollback");
        backing.staging.delete(operationId);
        rolledBack += 1;
      } else {
        failures.hit("recovery.finalize");
        const existing = backing.journal.find(
          (entry) => entry.operation_id === operationId,
        );
        if (
          existing === undefined ||
          manifest.draft === null ||
          !equalCommittedOperationDrafts(existing, manifest.draft)
        ) {
          throw new ResourceStorageIntegrityError(
            "Committed staging cannot be finalized",
          );
        }
        validateDraftDescribesWriteSet(manifest.draft, manifest.resources);
        const committedResources = manifest.resources.map((resource) => {
          const committedResource = backing.resources.get(resource.data.id);
          if (committedResource === undefined) {
            throw new ResourceStorageIntegrityError(
              "Committed staging references a missing Resource",
            );
          }
          return committedResource;
        });
        if (
          computeResourceWriteSetFingerprint(
            committedResources,
            "asset_changes" in manifest.draft
              ? manifest.assetChanges
              : undefined,
          ) !== manifest.draft.write_set_fingerprint
        ) {
          throw new ResourceStorageIntegrityError(
            "Committed staging does not match durable Resources",
          );
        }
        backing.staging.delete(operationId);
        completed += 1;
      }
    }
    return {
      completed_operations: completed,
      rolled_back_operations: rolledBack,
      status: rolledBack + completed === 0 ? "clean" : "recovered",
    };
  };

  const adapter: FullResourceDriverAdapter = {
    mode: "full",
    async open() {
      failures.hit("open");
      if (opened) throw new Error("Driver is already open");
      opened = true;
    },
    async close() {
      failures.hit("close");
      if (activeSession) throw new Error("Cannot close with an active session");
      opened = false;
    },
    async acquireStorageSession(signal?: AbortSignal) {
      if (!opened) throw new Error("Driver is not open");
      failures.hit("session.acquire");
      const releaseLease = await leaseFor(backing).acquire(signal);
      let leaseReleased = false;
      const releaseOwnedLease = () => {
        if (leaseReleased) return;
        leaseReleased = true;
        releaseLease();
      };
      if (activeSession) {
        releaseOwnedLease();
        throw new Error("Adapter already owns a session");
      }
      activeSession = true;
      crashRelease = releaseOwnedLease;
      const sessionGeneration = generation;
      try {
        const recovery = recover();
        return createSession(
          backing,
          failures,
          recovery,
          () => {
            activeSession = false;
            crashRelease = null;
            releaseOwnedLease();
          },
          () => generation === sessionGeneration,
        );
      } catch (error) {
        activeSession = false;
        crashRelease = null;
        releaseOwnedLease();
        throw error;
      }
    },
  };

  return {
    adapter,
    corruptJournal(mutator) {
      mutator(backing.journal);
    },
    crashNext(point) {
      failures.enqueue(point, { kind: "crash" });
    },
    failNext(point, error = new Error(`Injected failure at ${point}`)) {
      if (point === "transaction.commit.after-durable") {
        throw new RangeError(
          "Post-durable commit injection must use crashNext",
        );
      }
      failures.enqueue(point, { error, kind: "error" });
    },
    injectUnknownStaging(operationId) {
      backing.staging.set(operationId, {
        draft: null,
        assetChanges: [],
        operationId,
        phase: "committed-needs-finalization",
        resources: [],
      });
    },
    inspect() {
      return {
        asset_payload_states: [...backing.assetPayloadStates.values()].map(
          cloneAssetPayloadState,
        ),
        journal: backing.journal.map(cloneCommittedOperationEntry),
        resources: [...backing.resources.values()].map(buildResourceSnapshot),
        staging_operations: [...backing.staging.keys()],
      };
    },
  };
}

function validateBacking(backing: DeterministicFullDriverBacking): void {
  validateContiguousJournal(backing.journal);
  for (const entry of backing.journal) {
    for (const resourceId of entry.affected_resources) {
      if (!backing.resources.has(resourceId)) {
        throw new ResourceStorageIntegrityError(
          "Committed entry references a missing Resource",
        );
      }
    }
  }
  if (
    !validateAssetStorageInvariants(
      [...backing.resources.values()],
      [...backing.assetPayloadStates.values()],
    )
  ) {
    throw new ResourceStorageIntegrityError(
      "Deterministic Asset storage state is invalid",
    );
  }
}

function validateDraftDescribesWriteSet(
  draft: CommittedOperationDraft,
  resources: readonly ResourceSnapshot[],
): void {
  const resourceIDs = resources.map((resource) => resource.data.id);
  const assetChanges =
    "asset_changes" in draft ? draft.asset_changes : undefined;
  if (
    computeResourceWriteSetFingerprint(resources, assetChanges) !==
      draft.write_set_fingerprint ||
    draft.affected_resources.length !== resourceIDs.length ||
    draft.changes.length !== resourceIDs.length ||
    resourceIDs.some(
      (id, index) =>
        draft.affected_resources[index] !== id ||
        draft.changes[index]?.kind !== "resource.upsert" ||
        draft.changes[index]?.resource_id !== id,
    )
  ) {
    throw new ResourceStorageIntegrityError(
      "Committed draft does not describe the staged write-set",
    );
  }
}

function createSession(
  backing: DeterministicFullDriverBacking,
  failures: FailurePlan,
  recovery: ResourceRecoveryReport,
  releaseLease: () => void,
  isGenerationActive: () => boolean,
): ResourceStorageSession {
  let released = false;
  const assertActive = () => {
    if (released || !isGenerationActive()) {
      throw new Error(
        "Storage session is released or belongs to a crashed generation",
      );
    }
  };
  return {
    recovery,
    async *listResources() {
      assertActive();
      failures.hit("resource.list");
      for (const resource of backing.resources.values()) {
        assertActive();
        yield buildResourceSnapshot(resource);
      }
    },
    async readResource(id) {
      assertActive();
      failures.hit("resource.read");
      const resource = backing.resources.get(id);
      return resource === undefined ? null : buildResourceSnapshot(resource);
    },
    async *listAssetPayloadStates() {
      assertActive();
      for (const state of backing.assetPayloadStates.values()) {
        assertActive();
        yield cloneAssetPayloadState(state);
      }
    },
    async begin(operationId) {
      assertActive();
      failures.hit("transaction.begin");
      const existingStaging = backing.staging.get(operationId);
      if (existingStaging !== undefined)
        throw new ResourceStorageIntegrityError(
          "Operation already has private staging",
        );
      const manifest: StagingManifest = {
        assetChanges: [],
        draft: null,
        operationId,
        phase: "active",
        resources: [],
      };
      backing.staging.set(operationId, manifest);
      return createTransaction(backing, failures, manifest, assertActive);
    },
    async *readCommittedOperationsAfter(cursor) {
      assertActive();
      failures.hit("journal.read");
      validateContiguousJournal(backing.journal);
      let start = 0;
      if (cursor !== null) {
        const numeric = parseJournalSequence(cursor);
        if (numeric > BigInt(backing.journal.length))
          throw new ResourceStorageIntegrityError(
            "Journal cursor is ahead of head",
          );
        start = Number(numeric);
      }
      for (const entry of backing.journal.slice(start)) {
        assertActive();
        yield cloneCommittedOperationEntry(entry);
      }
    },
    async release() {
      if (released) return;
      released = true;
      releaseLease();
      failures.hit("session.release");
    },
  };
}

function createTransaction(
  backing: DeterministicFullDriverBacking,
  failures: FailurePlan,
  manifest: StagingManifest,
  assertSessionActive: () => void,
): ResourceWriteTransaction {
  let committed: CommittedOperationEntry | null = null;
  let aborted = false;
  return {
    async stageResource(resource) {
      assertSessionActive();
      if (aborted || committed !== null)
        throw new Error("Transaction is no longer active");
      failures.hit("transaction.stage.before");
      const detached = buildResourceSnapshot(resource);
      const index = manifest.resources.findIndex(
        (item) => item.data.id === detached.data.id,
      );
      if (index >= 0) manifest.resources[index] = detached;
      else manifest.resources.push(detached);
      failures.hit("transaction.stage.after");
    },
    async stageAssetChange(change) {
      assertSessionActive();
      if (aborted || committed !== null) {
        throw new Error("Transaction is no longer active");
      }
      if (
        manifest.assetChanges.some(
          (candidate) => candidate.asset_id === change.asset_id,
        )
      ) {
        throw new ResourceStorageIntegrityError(
          "Asset change is staged more than once",
        );
      }
      manifest.assetChanges.push(cloneAssetLogicalChange(change));
      manifest.assetChanges.sort((left, right) =>
        left.asset_id < right.asset_id
          ? -1
          : left.asset_id > right.asset_id
            ? 1
            : 0,
      );
    },
    async commit(draft) {
      assertSessionActive();
      if (aborted) throw new Error("Transaction is aborted");
      if (committed !== null) {
        if (!equalCommittedOperationDrafts(committed, draft))
          throw new ResourceStorageIntegrityError(
            "Idempotent commit draft mismatch",
          );
        return cloneCommittedOperationEntry(committed);
      }
      failures.hit("transaction.commit.before");
      if (draft.operation_id !== manifest.operationId)
        throw new ResourceStorageIntegrityError(
          "Operation ID does not match transaction",
        );
      if (manifest.resources.length === 0)
        throw new ResourceStorageIntegrityError(
          "Transaction has no staged Resource",
        );
      if (
        computeResourceWriteSetFingerprint(
          manifest.resources,
          "asset_changes" in draft ? manifest.assetChanges : undefined,
        ) !== draft.write_set_fingerprint
      )
        throw new ResourceStorageIntegrityError(
          "Write-set fingerprint mismatch",
        );
      validateDraftDescribesWriteSet(draft, manifest.resources);
      if (
        "asset_changes" in draft !== manifest.assetChanges.length > 0 ||
        ("asset_changes" in draft &&
          canonicalAssetChanges(draft.asset_changes) !==
            canonicalAssetChanges(manifest.assetChanges))
      ) {
        throw new ResourceStorageIntegrityError(
          "Staged Asset changes do not match the draft",
        );
      }
      const existing = backing.journal.find(
        (entry) => entry.operation_id === draft.operation_id,
      );
      if (existing !== undefined) {
        if (!equalCommittedOperationDrafts(existing, draft))
          throw new ResourceStorageIntegrityError(
            "Operation ID integrity mismatch",
          );
        backing.staging.delete(manifest.operationId);
        committed = existing;
        return cloneCommittedOperationEntry(existing);
      }
      const entry: CommittedOperationEntry = {
        ...cloneCommittedOperationDraft(draft),
        sequence: journalSequence(BigInt(backing.journal.length + 1)),
      };
      manifest.draft = cloneCommittedOperationDraft(draft);
      const nextResources = new Map(backing.resources);
      for (const resource of manifest.resources) {
        nextResources.set(resource.data.id, buildResourceSnapshot(resource));
      }
      const nextPayloadStates = prepareAssetPayloadStates(
        backing.assetPayloadStates,
        manifest.assetChanges,
      );
      if (
        !validateAssetStorageInvariants(
          [...nextResources.values()],
          [...nextPayloadStates.values()],
        )
      ) {
        throw new ResourceStorageIntegrityError(
          "Committed Asset state would violate storage invariants",
        );
      }
      backing.resources.clear();
      nextResources.forEach((value, key) => backing.resources.set(key, value));
      backing.assetPayloadStates.clear();
      nextPayloadStates.forEach((value, key) =>
        backing.assetPayloadStates.set(key, value),
      );
      backing.journal.push(entry);
      manifest.phase = "committed-needs-finalization";
      committed = entry;
      failures.hit("transaction.commit.after-durable");
      backing.staging.delete(manifest.operationId);
      return cloneCommittedOperationEntry(entry);
    },
    async abort() {
      assertSessionActive();
      if (committed !== null || aborted) return;
      failures.hit("transaction.abort");
      aborted = true;
      backing.staging.delete(manifest.operationId);
    },
  };
}

function cloneAssetPayloadState(state: AssetPayloadState): AssetPayloadState {
  return {
    active_upload:
      state.active_upload === null ? null : { ...state.active_upload },
    asset_id: state.asset_id,
    committed: state.committed,
  };
}

function canonicalAssetChanges(changes: readonly AssetLogicalChange[]): string {
  return canonicalResourceStorageJson(changes.map(cloneAssetLogicalChange));
}

function prepareAssetPayloadStates(
  current: ReadonlyMap<IDString, AssetPayloadState>,
  changes: readonly AssetLogicalChange[],
): Map<IDString, AssetPayloadState> {
  const next = new Map<IDString, AssetPayloadState>();
  current.forEach((value, key) => next.set(key, cloneAssetPayloadState(value)));
  for (const change of changes) {
    const state = next.get(change.asset_id);
    switch (change.payload_action.kind) {
      case "none":
        break;
      case "generation.create": {
        const replacement = change.state_after === "replacement-uploading";
        if (
          (replacement &&
            (state === undefined ||
              !state.committed ||
              state.active_upload !== null)) ||
          (!replacement && state !== undefined)
        ) {
          throw new ResourceStorageIntegrityError(
            "Asset generation create state is invalid",
          );
        }
        next.set(change.asset_id, {
          active_upload: {
            replaces_committed: replacement,
            upload_id: change.payload_action.upload_id,
          },
          asset_id: change.asset_id,
          committed: replacement,
        });
        break;
      }
      case "generation.discard":
        if (
          state?.active_upload?.upload_id !== change.payload_action.upload_id
        ) {
          throw new ResourceStorageIntegrityError(
            "Asset generation discard state is invalid",
          );
        }
        if (state.committed) {
          next.set(change.asset_id, {
            active_upload: null,
            asset_id: change.asset_id,
            committed: true,
          });
        } else {
          next.delete(change.asset_id);
        }
        break;
      case "payload.delete":
        if (
          state === undefined ||
          !state.committed ||
          state.active_upload !== null
        ) {
          throw new ResourceStorageIntegrityError(
            "Asset payload delete state is invalid",
          );
        }
        next.delete(change.asset_id);
        break;
      case "payload.delete-and-generation.discard":
        if (
          state === undefined ||
          !state.committed ||
          state.active_upload?.upload_id !== change.payload_action.upload_id
        ) {
          throw new ResourceStorageIntegrityError(
            "Asset payload and generation delete state is invalid",
          );
        }
        next.delete(change.asset_id);
        break;
      case "generation.publish":
        throw new ResourceStorageIntegrityError(
          "Asset generation publication is not implemented in P4-VS2",
        );
    }
  }
  return next;
}
