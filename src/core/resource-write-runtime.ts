import { defineModule, type Token } from "@sagifire/ioc";

import { createExtensiaInternalNamespace } from "../composition/tokens.js";
import { validateAssetStorageInvariants } from "../domain/asset-metadata.js";
import {
  generateIDString,
  parseTimestamp,
  type IDString,
} from "../domain/scalars.js";
import {
  buildResourceSnapshot,
  type ResourceSnapshot,
} from "../domain/snapshots.js";
import {
  kvNamespaceEqual,
  marksEqual,
  replaceKV,
} from "../domain/resource-aggregates.js";
import {
  prepareResourceDelete,
  prepareResourceMove,
  validateResourceHierarchy,
} from "../domain/resource-hierarchy.js";
import {
  createOperationEngine,
  type OperationEngine,
  type OperationScope,
  type ResourceOperationPlan,
} from "../operations/operation-engine.js";
import type { ResourceOperationIdentitySource } from "../operations/resource-operation-contracts.js";
import {
  lifecycleContribution,
  LIFECYCLE_CONTRIBUTIONS,
  type LifecycleContribution,
} from "../runtime/lifecycle.js";
import {
  computeResourceWriteSetFingerprint,
  ResourceStorageIntegrityError,
} from "../storage/resource-journal-integrity.js";
import {
  ResourceStorageSessionTransientError,
  type FullResourceDriverAdapter,
} from "../storage/full-resource-driver-adapter.js";
import {
  AssetStorageIntegrityError,
  ResourceCommittedIntegrityError,
  ResourceRuntimeIntegrityError,
} from "../storage/resource-runtime-integrity.js";
import { scanRecoveryCleanResourceState } from "../storage/resource-recovery-coordinator.js";
import type {
  CommittedOperationEntry,
  CommittedOperationDraft,
  ResourceWriteTransaction,
} from "../storage/resource-write-protocol.js";
import {
  CORE_ASSET_WRITE_PORT,
  type CoreAssetWritePort,
} from "../system-extensions/default-api/asset-write-port.js";
import {
  CORE_RESOURCE_READ_PORT,
  type CoreResourceReadPort,
} from "../system-extensions/default-api/resource-read-port.js";
import {
  CORE_RESOURCE_WRITE_PORT,
  type CoreResourceWritePort,
  type CoreResourceWriteResult,
} from "../system-extensions/default-api/resource-write-port.js";
import { createGreedyResourceIndex } from "./resource-index.js";
import { createReadModelPublicationCoordinator } from "./read-model-coordinator.js";
import {
  createReadModelSynchronizationActor,
  createReadModelSynchronizationAttempt,
  READ_MODEL_SYNCHRONIZATION_ACTOR,
  type ReadModelSynchronizationActor,
} from "./read-model-synchronization.js";
import {
  createAssetUploadPort,
  createAssetWritePort,
} from "./asset-write-runtime.js";
import {
  CORE_ASSET_UPLOAD_PORT,
  type CoreAssetUploadPort,
} from "../system-extensions/default-api/asset-upload-port.js";
import {
  CORE_COMMITTED_CHANGE_OBSERVATION_PORT,
  CORE_METADATA_OBSERVATION_PORT,
  type CoreCommittedChangeObservationPort,
  type CoreMetadataObservationPort,
} from "./read-model-observation.js";
import {
  createFullCommittedChangeObservationPort,
  createFullMetadataObservationPort,
} from "./read-model-storage-observation.js";
import {
  createRuntimeFaultSink,
  RUNTIME_FAULT_SINK,
  RUNTIME_FAULT_SINK_CONTRIBUTIONS,
  type RuntimeFaultSink,
} from "./runtime-fault-sink.js";
import {
  createReadModelSelectorPort,
  createResourceReadPort,
  type InternalReadModelSelectorPort,
} from "./read-model-query.js";
import {
  createReadModelControl,
  DEFAULT_READ_MODEL_RUNTIME_CONFIG,
  READ_MODEL_CONTROL_PORT,
  type ReadModelControlPort,
  type ResolvedReadModelRuntimeConfig,
} from "./read-model-runtime.js";

const tokens = createExtensiaInternalNamespace("core.resource-write-runtime");
export const FULL_RESOURCE_DRIVER: Token<FullResourceDriverAdapter> =
  tokens.token("full-resource-driver");
const RUNTIME: Token<FullResourceRuntime> = tokens.token("runtime");

interface FullResourceRuntime {
  readonly assetUploadPort: CoreAssetUploadPort;
  readonly assetWritePort: CoreAssetWritePort;
  readonly readPort: CoreResourceReadPort;
  readonly selectors: InternalReadModelSelectorPort;
  readonly writePort: CoreResourceWritePort;
  readonly lifecycle: LifecycleContribution;
  readonly metadataObservation: CoreMetadataObservationPort;
  readonly committedChangeObservation: CoreCommittedChangeObservationPort;
  readonly synchronizationActor: ReadModelSynchronizationActor;
  readonly faultSink: RuntimeFaultSink;
  readonly control: ReadModelControlPort;
}

type Attempt =
  | {
      readonly kind: "success";
      readonly resource: ResourceSnapshot;
      readonly operationId: IDString;
      readonly warnings: readonly (
        "LOCAL_INDEX_PUBLICATION_FAILED" | "POST_COMMIT_CLEANUP_FAILED"
      )[];
    }
  | { readonly kind: "collision" }
  | { readonly kind: "missing" }
  | { readonly kind: "no-change" }
  | { readonly kind: "input-invalid" }
  | { readonly kind: "parent-missing" }
  | { readonly kind: "cycle" }
  | { readonly kind: "range" }
  | { readonly kind: "already-deleted" }
  | { readonly kind: "has-children" }
  | { readonly kind: "active-upload" }
  | { readonly kind: "integrity" }
  | { readonly kind: "lock-failed" }
  | { readonly kind: "write-failed" };
type BaseAttempt =
  | Omit<Extract<Attempt, { kind: "success" }>, "warnings">
  | Exclude<Attempt, { kind: "success" }>;

function createRuntime(
  driver: FullResourceDriverAdapter,
  config: ResolvedReadModelRuntimeConfig,
): FullResourceRuntime {
  const coordinator = createReadModelPublicationCoordinator();
  const index = createGreedyResourceIndex(coordinator);
  const actorId = generateIDString();
  const identities: ResourceOperationIdentitySource = Object.freeze({
    create: () =>
      Object.freeze({ operation_id: generateIDString(), actor_id: actorId }),
  });
  const engine: OperationEngine = createOperationEngine(identities);
  const metadataObservation = createFullMetadataObservationPort(driver);
  const committedChangeObservation =
    createFullCommittedChangeObservationPort(driver);
  let synchronizationActor: ReadModelSynchronizationActor | null = null;
  const faultSink = createRuntimeFaultSink({
    closeIntake: () => {
      engine.failClose();
      index.clear();
    },
    cleanup: () => synchronizationActor?.stop(),
  });
  const refreshAttempt = createReadModelSynchronizationAttempt({
    coordinator,
    observation: committedChangeObservation,
  });
  synchronizationActor = createReadModelSynchronizationActor({
    async attempt(context) {
      if (coordinator.ready) return refreshAttempt(context);
      try {
        const state = await scanRecoveryCleanResourceState(
          driver,
          context.signal,
        );
        await index.initialize(
          (async function* () {
            yield* state.resources;
          })(),
          {
            asset_readiness: new Map(
              state.asset_payload_states
                .filter((item) => item.active_upload !== null)
                .map((item) => [item.asset_id, item.committed]),
            ),
            loading: config.loading,
            synchronization: {
              cursor: state.journal_head,
              kind: "synchronized",
            },
          },
        );
        return Object.freeze({ changed: true, ok: true as const });
      } catch (error) {
        if (error instanceof ResourceStorageSessionTransientError) {
          return Object.freeze({
            category:
              error.category === "lock"
                ? ("storage-lock" as const)
                : error.category === "unavailable"
                  ? ("storage-unavailable" as const)
                  : ("storage-read" as const),
            ok: false as const,
          });
        }
        throw error;
      }
    },
    faultSink,
    initiallyOpen: false,
    retry: config.synchronization.retry,
  });
  const control = createReadModelControl({
    actor: synchronizationActor,
    config,
    coverage: () => index.inspectCoverage(),
    cursorBehind: () => coordinator.isCursorBehind(),
    fault: () => faultSink.fault?.kind ?? null,
  });
  const readPort = createResourceReadPort({
    faultSink,
    index,
    metadataObservation,
  });
  const selectors = createReadModelSelectorPort({
    index,
    metadataObservation,
    faultSink,
  });

  function coherentResourceMap(
    resources: readonly ResourceSnapshot[],
  ): Map<IDString, ResourceSnapshot> {
    const result = new Map<IDString, ResourceSnapshot>();
    for (const resource of resources) {
      if (result.has(resource.data.id))
        throw new ResourceStorageIntegrityError(
          "Storage returned duplicate Resource IDs",
        );
      result.set(resource.data.id, resource);
    }
    return result;
  }

  async function validateCoherentStorageState(
    session: import("../storage/resource-write-protocol.js").ResourceStorageSession,
    resources: readonly ResourceSnapshot[],
  ): Promise<void> {
    validateResourceHierarchy(coherentResourceMap(resources));
    const payloadStates = [];
    for await (const state of session.listAssetPayloadStates?.() ?? []) {
      payloadStates.push(state);
    }
    if (!validateAssetStorageInvariants(resources, payloadStates)) {
      throw new AssetStorageIntegrityError(
        "Asset storage invariants are invalid",
      );
    }
  }

  async function attemptCreate(
    resource: ResourceSnapshot,
    scope: OperationScope<BaseAttempt>,
    plan: ResourceOperationPlan,
  ): Promise<BaseAttempt> {
    return scope.withLocks(
      ["resource-hierarchy", `resource:${resource.data.id}`],
      async () => {
        let session;
        try {
          session = await driver.acquireStorageSession(scope.signal);
        } catch (error) {
          if (error instanceof ResourceRuntimeIntegrityError) throw error;
          return Object.freeze({ kind: "lock-failed" as const });
        }
        let transaction: ResourceWriteTransaction | undefined;
        let committed = false;
        try {
          if ((await session.readResource(resource.data.id)) !== null) {
            return Object.freeze({ kind: "collision" as const });
          }
          const current: ResourceSnapshot[] = [];
          for await (const item of session.listResources()) current.push(item);
          await validateCoherentStorageState(session, current);
          const nextResource = buildResourceSnapshot({
            ...resource,
            data: {
              ...resource.data,
              order_index: current.filter(
                (item) => !item.data.is_deleted && item.data.parent_id === null,
              ).length,
            },
          });
          const prepared = index.prepareBatch([nextResource]);
          transaction = await session.begin(plan.operation_id);
          scope.transition("staging");
          await transaction.stageResource(nextResource);
          const draft: CommittedOperationDraft = Object.freeze({
            schema_version: 1,
            operation_id: plan.operation_id,
            actor_id: plan.actor_id,
            type: "resource.create",
            affected_resources: Object.freeze([nextResource.data.id]),
            committed_at: nextResource.data.created_at,
            write_set_fingerprint: computeResourceWriteSetFingerprint([
              nextResource,
            ]),
            changes: Object.freeze([
              {
                kind: "resource.upsert" as const,
                resource_id: nextResource.data.id,
              },
            ]),
          });
          const success = Object.freeze({
            kind: "success" as const,
            resource: buildResourceSnapshot(nextResource),
            operationId: plan.operation_id,
          });
          scope.transition("committing");
          let committedEntry: CommittedOperationEntry;
          try {
            committedEntry = await transaction.commit(draft);
          } catch (error) {
            if (error instanceof ResourceCommittedIntegrityError) {
              scope.commit(success);
              committed = true;
              scope.deferCleanup(async () => {
                await transaction?.abort();
                await session.release();
              });
            }
            throw error;
          }
          scope.commit(success);
          committed = true;
          scope.deferCleanup(async () => {
            await transaction?.abort();
            await session.release();
          });
          prepared.publish(committedEntry);
          return success;
        } finally {
          if (!committed) {
            await transaction?.abort();
            await session.release();
          }
        }
      },
    );
  }

  async function attemptMove(
    request: Extract<
      Parameters<CoreResourceWritePort["write"]>[0],
      { type: "resource.move" }
    >,
    now: ReturnType<typeof parseTimestamp>,
    scope: OperationScope<BaseAttempt>,
    plan: ResourceOperationPlan,
  ): Promise<BaseAttempt> {
    let session;
    try {
      session = await driver.acquireStorageSession(scope.signal);
    } catch (error) {
      if (error instanceof ResourceRuntimeIntegrityError) throw error;
      return Object.freeze({ kind: "lock-failed" as const });
    }
    let transaction: ResourceWriteTransaction | undefined;
    let committed = false;
    try {
      const all: ResourceSnapshot[] = [];
      for await (const item of session.listResources()) all.push(item);
      await validateCoherentStorageState(session, all);
      const preparation = prepareResourceMove(
        all,
        request.id,
        request.parent_id,
        request.order_index,
        now,
      );
      if (preparation.kind !== "success")
        return Object.freeze({ kind: preparation.kind });
      const resources = preparation.resources;
      const prepared = index.prepareBatch(resources);
      transaction = await session.begin(plan.operation_id);
      scope.transition("staging");
      for (const resource of resources)
        await transaction.stageResource(resource);
      const resourceIds = Object.freeze(resources.map((item) => item.data.id));
      const draft: CommittedOperationDraft = Object.freeze({
        schema_version: 1,
        operation_id: plan.operation_id,
        actor_id: plan.actor_id,
        type: "resource.move",
        affected_resources: resourceIds,
        committed_at: now,
        write_set_fingerprint: computeResourceWriteSetFingerprint(resources),
        changes: Object.freeze(
          resourceIds.map((resource_id) => ({
            kind: "resource.upsert" as const,
            resource_id,
          })),
        ),
      });
      const target = resources.find((item) => item.data.id === request.id)!;
      const success = Object.freeze({
        kind: "success" as const,
        resource: buildResourceSnapshot(target),
        operationId: plan.operation_id,
      });
      scope.transition("committing");
      let committedEntry: CommittedOperationEntry;
      try {
        committedEntry = await transaction.commit(draft);
      } catch (error) {
        if (error instanceof ResourceCommittedIntegrityError) {
          scope.commit(success);
          committed = true;
          scope.deferCleanup(async () => {
            await transaction?.abort();
            await session.release();
          });
        }
        throw error;
      }
      scope.commit(success);
      committed = true;
      scope.deferCleanup(async () => {
        await transaction?.abort();
        await session.release();
      });
      prepared.publish(committedEntry);
      return success;
    } finally {
      if (!committed) {
        await transaction?.abort();
        await session.release();
      }
    }
  }

  async function attemptDelete(
    request: Extract<
      Parameters<CoreResourceWritePort["write"]>[0],
      { type: "resource.delete" }
    >,
    now: ReturnType<typeof parseTimestamp>,
    scope: OperationScope<BaseAttempt>,
    plan: ResourceOperationPlan,
  ): Promise<BaseAttempt> {
    let session;
    try {
      session = await driver.acquireStorageSession(scope.signal);
    } catch (error) {
      if (error instanceof ResourceRuntimeIntegrityError) throw error;
      return Object.freeze({ kind: "lock-failed" as const });
    }
    let transaction: ResourceWriteTransaction | undefined;
    let committed = false;
    try {
      const all: ResourceSnapshot[] = [];
      for await (const item of session.listResources()) all.push(item);
      await validateCoherentStorageState(session, all);
      const preparation = prepareResourceDelete(all, request.id, now);
      if (preparation.kind !== "success")
        return Object.freeze({ kind: preparation.kind });
      const resources = preparation.resources;
      const prepared = index.prepareBatch(resources);
      transaction = await session.begin(plan.operation_id);
      scope.transition("staging");
      for (const resource of resources)
        await transaction.stageResource(resource);
      const resourceIds = Object.freeze(resources.map((item) => item.data.id));
      const draft: CommittedOperationDraft = Object.freeze({
        schema_version: 1,
        operation_id: plan.operation_id,
        actor_id: plan.actor_id,
        type: "resource.delete",
        affected_resources: resourceIds,
        committed_at: now,
        write_set_fingerprint: computeResourceWriteSetFingerprint(resources),
        changes: Object.freeze(
          resourceIds.map((resource_id) => ({
            kind: "resource.upsert" as const,
            resource_id,
          })),
        ),
      });
      const target = resources.find((item) => item.data.id === request.id)!;
      const success = Object.freeze({
        kind: "success" as const,
        resource: buildResourceSnapshot(target),
        operationId: plan.operation_id,
      });
      scope.transition("committing");
      let committedEntry: CommittedOperationEntry;
      try {
        committedEntry = await transaction.commit(draft);
      } catch (error) {
        if (error instanceof ResourceCommittedIntegrityError) {
          scope.commit(success);
          committed = true;
          scope.deferCleanup(async () => {
            await transaction?.abort();
            await session.release();
          });
        }
        throw error;
      }
      scope.commit(success);
      committed = true;
      scope.deferCleanup(async () => {
        await transaction?.abort();
        await session.release();
      });
      prepared.publish(committedEntry);
      return success;
    } finally {
      if (!committed) {
        await transaction?.abort();
        await session.release();
      }
    }
  }

  async function attemptUpdate(
    request: Extract<
      Parameters<CoreResourceWritePort["write"]>[0],
      { type: "resource.update" }
    >,
    now: ReturnType<typeof parseTimestamp>,
    scope: OperationScope<BaseAttempt>,
    plan: ResourceOperationPlan,
  ): Promise<BaseAttempt> {
    let session;
    try {
      session = await driver.acquireStorageSession(scope.signal);
    } catch (error) {
      if (error instanceof ResourceRuntimeIntegrityError) throw error;
      return Object.freeze({ kind: "lock-failed" as const });
    }
    let transaction: ResourceWriteTransaction | undefined;
    let committed = false;
    try {
      const coherentResources: ResourceSnapshot[] = [];
      for await (const item of session.listResources())
        coherentResources.push(item);
      await validateCoherentStorageState(session, coherentResources);
      const current = coherentResources.find(
        (item) => item.data.id === request.id,
      );
      if (current === undefined || current.data.is_deleted)
        return Object.freeze({ kind: "missing" as const });
      const title = request.patch.title ?? current.data.title;
      const description =
        "description" in request.patch
          ? (request.patch.description ?? null)
          : current.data.description;
      if (
        title === current.data.title &&
        description === current.data.description
      )
        return Object.freeze({ kind: "no-change" as const });
      const resource = buildResourceSnapshot({
        ...current,
        data: { ...current.data, title, description, updated_at: now },
      });
      const prepared = index.prepareBatch([resource]);
      transaction = await session.begin(plan.operation_id);
      scope.transition("staging");
      await transaction.stageResource(resource);
      const draft: CommittedOperationDraft = Object.freeze({
        schema_version: 1,
        operation_id: plan.operation_id,
        actor_id: plan.actor_id,
        type: "resource.update",
        affected_resources: Object.freeze([resource.data.id]),
        committed_at: now,
        write_set_fingerprint: computeResourceWriteSetFingerprint([resource]),
        changes: Object.freeze([
          { kind: "resource.upsert" as const, resource_id: resource.data.id },
        ]),
      });
      const success = Object.freeze({
        kind: "success" as const,
        resource: buildResourceSnapshot(resource),
        operationId: plan.operation_id,
      });
      scope.transition("committing");
      let committedEntry: CommittedOperationEntry;
      try {
        committedEntry = await transaction.commit(draft);
      } catch (error) {
        if (error instanceof ResourceCommittedIntegrityError) {
          scope.commit(success);
          committed = true;
          scope.deferCleanup(async () => {
            await transaction?.abort();
            await session.release();
          });
        }
        throw error;
      }
      scope.commit(success);
      committed = true;
      scope.deferCleanup(async () => {
        await transaction?.abort();
        await session.release();
      });
      prepared.publish(committedEntry);
      return success;
    } finally {
      if (!committed) {
        await transaction?.abort();
        await session.release();
      }
    }
  }

  async function attemptAggregate(
    request: Extract<
      Parameters<CoreResourceWritePort["write"]>[0],
      { type: "resource.marks.set" | "resource.kv.set" }
    >,
    now: ReturnType<typeof parseTimestamp>,
    scope: OperationScope<BaseAttempt>,
    plan: ResourceOperationPlan,
  ): Promise<BaseAttempt> {
    let session;
    try {
      session = await driver.acquireStorageSession(scope.signal);
    } catch (error) {
      if (error instanceof ResourceRuntimeIntegrityError) throw error;
      return Object.freeze({ kind: "lock-failed" as const });
    }
    let transaction: ResourceWriteTransaction | undefined;
    let committed = false;
    try {
      const all: ResourceSnapshot[] = [];
      for await (const item of session.listResources()) all.push(item);
      await validateCoherentStorageState(session, all);
      const current = all.find((item) => item.data.id === request.id);
      if (current === undefined || current.data.is_deleted)
        return Object.freeze({ kind: "missing" as const });
      let resource: ResourceSnapshot;
      if (request.type === "resource.marks.set") {
        if (marksEqual(current.marks, request.marks))
          return Object.freeze({ kind: "no-change" as const });
        resource = buildResourceSnapshot({
          ...current,
          marks: request.marks,
          data: { ...current.data, updated_at: now },
        });
      } else {
        if (kvNamespaceEqual(current.kv[request.namespace], request.values))
          return Object.freeze({ kind: "no-change" as const });
        const kv = replaceKV(current.kv, request.namespace, request.values);
        if (kv === null)
          return Object.freeze({ kind: "input-invalid" as const });
        resource = buildResourceSnapshot({
          ...current,
          kv,
          data: { ...current.data, updated_at: now },
        });
      }
      const prepared = index.prepareBatch([resource]);
      transaction = await session.begin(plan.operation_id);
      scope.transition("staging");
      await transaction.stageResource(resource);
      const draft: CommittedOperationDraft = Object.freeze({
        schema_version: 1,
        operation_id: plan.operation_id,
        actor_id: plan.actor_id,
        type: request.type,
        affected_resources: Object.freeze([request.id]),
        committed_at: now,
        write_set_fingerprint: computeResourceWriteSetFingerprint([resource]),
        changes: Object.freeze([
          { kind: "resource.upsert" as const, resource_id: request.id },
        ]),
      });
      const success = Object.freeze({
        kind: "success" as const,
        resource: buildResourceSnapshot(resource),
        operationId: plan.operation_id,
      });
      scope.transition("committing");
      let committedEntry: CommittedOperationEntry;
      try {
        committedEntry = await transaction.commit(draft);
      } catch (error) {
        if (error instanceof ResourceCommittedIntegrityError) {
          scope.commit(success);
          committed = true;
          scope.deferCleanup(async () => {
            await transaction?.abort();
            await session.release();
          });
        }
        throw error;
      }
      scope.commit(success);
      committed = true;
      scope.deferCleanup(async () => {
        await transaction?.abort();
        await session.release();
      });
      prepared.publish(committedEntry);
      return success;
    } finally {
      if (!committed) {
        await transaction?.abort();
        await session.release();
      }
    }
  }

  const writePort: CoreResourceWritePort = Object.freeze({
    async write(
      request: Parameters<CoreResourceWritePort["write"]>[0],
    ): Promise<CoreResourceWriteResult> {
      const identity = Object.freeze(identities.create());
      const now = parseTimestamp(Date.now());
      const engineResult = await engine.execute<BaseAttempt>(
        {
          type: request.type,
          resource_hints:
            request.type === "resource.create" ? [] : [request.id],
          identity,
          ...(request.fail_integrity === undefined
            ? {}
            : { fail_integrity: request.fail_integrity }),
          lock_keys:
            request.type === "resource.update" ||
            request.type === "resource.marks.set" ||
            request.type === "resource.kv.set"
              ? [`resource:${request.id}`]
              : request.type === "resource.move" ||
                  request.type === "resource.delete"
                ? ["resource-hierarchy", `resource:${request.id}`]
                : [],
        },
        async (scope, plan) => {
          if (request.type === "resource.update")
            return attemptUpdate(request, now, scope, plan);
          if (request.type === "resource.move")
            return attemptMove(request, now, scope, plan);
          if (request.type === "resource.delete")
            return attemptDelete(request, now, scope, plan);
          if (
            request.type === "resource.marks.set" ||
            request.type === "resource.kv.set"
          )
            return attemptAggregate(request, now, scope, plan);
          for (let candidate = 0; candidate < 3; candidate += 1) {
            const resource = buildResourceSnapshot({
              data: {
                id: generateIDString(),
                created_at: now,
                updated_at: now,
                locked: false,
                hidden: false,
                is_deleted: false,
                title: request.title,
                description: request.description ?? null,
                parent_id: null,
                order_index: 0,
              },
              assets: [],
              marks: [],
              kv: {},
            });
            const attempt = await attemptCreate(resource, scope, plan);
            if (attempt.kind === "collision") continue;
            return attempt;
          }
          return Object.freeze({ kind: "collision" as const });
        },
      );
      if (!engineResult.ok)
        return Object.freeze({
          ok: false,
          error: Object.freeze({
            code:
              engineResult.code === "OPERATION_INTEGRITY_FAILED"
                ? "STORAGE_INTEGRITY_FAILED"
                : "STORAGE_WRITE_FAILED",
          }),
        });
      const attempt = engineResult.value;
      if (attempt.kind === "collision")
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "RESOURCE_ID_GENERATION_FAILED" }),
        });
      if (attempt.kind === "missing")
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "RESOURCE_NOT_FOUND" }),
        });
      if (attempt.kind === "no-change")
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "RESOURCE_NO_CHANGES" }),
        });
      if (attempt.kind === "input-invalid")
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "RESOURCE_INPUT_INVALID" }),
        });
      if (attempt.kind === "parent-missing")
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "RESOURCE_PARENT_NOT_FOUND" }),
        });
      if (attempt.kind === "already-deleted")
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "RESOURCE_ALREADY_DELETED" }),
        });
      if (attempt.kind === "has-children")
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "RESOURCE_HAS_CHILDREN" }),
        });
      if (attempt.kind === "active-upload")
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "RESOURCE_ASSET_UPLOAD_ACTIVE" }),
        });
      if (attempt.kind === "cycle")
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "RESOURCE_MOVE_CYCLE" }),
        });
      if (attempt.kind === "range")
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "RESOURCE_ORDER_OUT_OF_RANGE" }),
        });
      if (attempt.kind === "integrity")
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "STORAGE_INTEGRITY_FAILED" }),
        });
      if (attempt.kind === "lock-failed")
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "STORAGE_LOCK_FAILED" }),
        });
      if (attempt.kind === "write-failed")
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "STORAGE_WRITE_FAILED" }),
        });
      return Object.freeze({
        ok: true,
        value: Object.freeze({
          operation_id: attempt.operationId,
          resource: buildResourceSnapshot(attempt.resource),
          warnings: engineResult.warnings,
        }),
      });
    },
  });

  const assetRuntimeInput = { driver, engine, identities, index };
  return Object.freeze({
    assetUploadPort: createAssetUploadPort(assetRuntimeInput),
    assetWritePort: createAssetWritePort(assetRuntimeInput),
    control,
    readPort,
    selectors,
    writePort,
    metadataObservation,
    committedChangeObservation,
    synchronizationActor,
    faultSink,
    lifecycle: lifecycleContribution({
      id: "core.resource-write",
      order: 30,
      async start() {
        control.setLifecycle("building");
        if (config.synchronization.mode === "polling") {
          control.markStartupFailure("capability");
          control.setLifecycle("failed");
          throw new Error(
            "Polling activation belongs to the concrete synchronization slice",
          );
        }
        try {
          await driver.open();
          synchronizationActor.openIntake();
          const startup = await synchronizationActor.refresh();
          if (!startup.ok) {
            if (startup.code === "READ_MODEL_REFRESH_EXHAUSTED") {
              control.markStartupFailure("retry-exhausted");
            } else if (startup.code === "STORAGE_INTEGRITY_FAILED") {
              control.markStartupFailure("integrity");
            } else if (
              startup.code === "READ_MODEL_SYNCHRONIZATION_CAPABILITY_FAILED"
            ) {
              control.markStartupFailure("capability");
            }
            throw new Error("Full Resource startup observation failed");
          }
          control.markStartupObserved();
          control.setLifecycle("ready");
        } catch {
          control.setLifecycle("failed");
          await synchronizationActor.stop();
          index.clear();
          try {
            await driver.close();
          } catch {
            /* primary startup failure remains authoritative */
          }
          throw new Error("Full Resource initialization failed");
        }
      },
      async stop() {
        control.setLifecycle("stopping");
        const synchronizationDrain = synchronizationActor.stop();
        const operationDrain = engine.closeAndDrain();
        await synchronizationDrain;
        await operationDrain;
        await faultSink.drain();
        try {
          await driver.close();
        } finally {
          index.clear();
          control.setLifecycle("stopped");
        }
      },
    }),
  });
}

export function createFullResourceCoreModule(
  config: ResolvedReadModelRuntimeConfig = DEFAULT_READ_MODEL_RUNTIME_CONFIG,
): ReturnType<typeof defineModule> {
  return defineModule({
    id: "extensia.core.resource-write",
    requires: [{ token: FULL_RESOURCE_DRIVER }],
    provides: [
      { token: CORE_RESOURCE_READ_PORT, kind: "public-api" },
      { token: CORE_RESOURCE_WRITE_PORT, kind: "public-api" },
      { token: CORE_ASSET_WRITE_PORT, kind: "public-api" },
      { token: CORE_ASSET_UPLOAD_PORT, kind: "shared-service" },
      { token: CORE_METADATA_OBSERVATION_PORT, kind: "shared-service" },
      {
        token: CORE_COMMITTED_CHANGE_OBSERVATION_PORT,
        kind: "shared-service",
      },
      { token: READ_MODEL_SYNCHRONIZATION_ACTOR, kind: "shared-service" },
      { token: READ_MODEL_CONTROL_PORT, kind: "shared-service" },
      { token: RUNTIME_FAULT_SINK, kind: "shared-service" },
      {
        token: RUNTIME_FAULT_SINK_CONTRIBUTIONS,
        kind: "admin-contribution",
        cardinality: "multi",
      },
      {
        token: LIFECYCLE_CONTRIBUTIONS,
        kind: "admin-contribution",
        cardinality: "multi",
      },
    ],
    setup(context) {
      context
        .bind(RUNTIME)
        .toFactory(({ get }) =>
          createRuntime(get(FULL_RESOURCE_DRIVER), config),
        )
        .singleton();
      context
        .bind(CORE_ASSET_UPLOAD_PORT)
        .toFactory(({ get }) => get(RUNTIME).assetUploadPort)
        .singleton();
      context
        .bind(CORE_ASSET_WRITE_PORT)
        .toFactory(({ get }) => get(RUNTIME).assetWritePort)
        .singleton();
      context
        .bind(CORE_RESOURCE_READ_PORT)
        .toFactory(({ get }) => get(RUNTIME).readPort)
        .singleton();
      context
        .bind(CORE_RESOURCE_WRITE_PORT)
        .toFactory(({ get }) => get(RUNTIME).writePort)
        .singleton();
      context
        .bind(CORE_METADATA_OBSERVATION_PORT)
        .toFactory(({ get }) => get(RUNTIME).metadataObservation)
        .singleton();
      context
        .bind(CORE_COMMITTED_CHANGE_OBSERVATION_PORT)
        .toFactory(({ get }) => get(RUNTIME).committedChangeObservation)
        .singleton();
      context
        .bind(READ_MODEL_SYNCHRONIZATION_ACTOR)
        .toFactory(({ get }) => get(RUNTIME).synchronizationActor)
        .singleton();
      context
        .bind(READ_MODEL_CONTROL_PORT)
        .toFactory(({ get }) => get(RUNTIME).control)
        .singleton();
      context
        .bind(RUNTIME_FAULT_SINK)
        .toFactory(({ get }) => get(RUNTIME).faultSink)
        .singleton();
      context
        .add(RUNTIME_FAULT_SINK_CONTRIBUTIONS)
        .toFactory(({ get }) => get(RUNTIME).faultSink)
        .singleton();
      context
        .add(LIFECYCLE_CONTRIBUTIONS)
        .toFactory(({ get }) => get(RUNTIME).lifecycle)
        .singleton();
    },
  });
}

export const FULL_RESOURCE_CORE_MODULE: ReturnType<typeof defineModule> =
  createFullResourceCoreModule();
