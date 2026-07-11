import { defineModule, type Token } from "@sagifire/ioc";

import { createExtensiaInternalNamespace } from "../composition/tokens.js";
import {
  generateIDString,
  parseTimestamp,
  type IDString,
} from "../domain/scalars.js";
import {
  buildResourceSnapshot,
  type ResourceSnapshot,
  type ResourceTreeViewSnapshot,
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
import type { FullResourceDriverAdapter } from "../storage/full-resource-driver-adapter.js";
import {
  ResourceCommittedIntegrityError,
  ResourceRuntimeIntegrityError,
} from "../storage/resource-runtime-integrity.js";
import { scanRecoveryCleanResourceState } from "../storage/resource-recovery-coordinator.js";
import type {
  CommittedOperationDraft,
  ResourceWriteTransaction,
} from "../storage/resource-write-protocol.js";
import {
  CORE_RESOURCE_READ_PORT,
  type CoreReadResult,
  type CoreResourceReadPort,
  type GetResourceReadRequest,
  type GetResourceTreeReadRequest,
} from "../system-extensions/default-api/resource-read-port.js";
import {
  CORE_RESOURCE_WRITE_PORT,
  type CoreResourceWritePort,
  type CoreResourceWriteResult,
} from "../system-extensions/default-api/resource-write-port.js";
import { createGreedyResourceIndex } from "./resource-index.js";
import type { MutableGreedyResourceIndex } from "./resource-index-write-contracts.js";

const tokens = createExtensiaInternalNamespace("core.resource-write-runtime");
export const FULL_RESOURCE_DRIVER: Token<FullResourceDriverAdapter> =
  tokens.token("full-resource-driver");
const RUNTIME: Token<FullResourceRuntime> = tokens.token("runtime");

interface FullResourceRuntime {
  readonly readPort: CoreResourceReadPort;
  readonly writePort: CoreResourceWritePort;
  readonly lifecycle: LifecycleContribution;
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
  | { readonly kind: "integrity" }
  | { readonly kind: "lock-failed" }
  | { readonly kind: "write-failed" };
type BaseAttempt =
  | Omit<Extract<Attempt, { kind: "success" }>, "warnings">
  | Exclude<Attempt, { kind: "success" }>;

function createReadPort(
  index: MutableGreedyResourceIndex,
): CoreResourceReadPort {
  class ReadPort implements CoreResourceReadPort {
    async read(
      request: GetResourceReadRequest,
    ): Promise<CoreReadResult<ResourceSnapshot>>;
    async read(
      request: GetResourceTreeReadRequest,
    ): Promise<CoreReadResult<ResourceTreeViewSnapshot>>;
    async read(
      request: GetResourceReadRequest | GetResourceTreeReadRequest,
    ): Promise<CoreReadResult<ResourceSnapshot | ResourceTreeViewSnapshot>> {
      const value =
        request.type === "resource.get"
          ? index.getResource(request.id)
          : index.getResourceTree(request.id);
      return value === undefined
        ? Object.freeze({
            ok: false,
            error: Object.freeze({ code: "RESOURCE_NOT_FOUND" }),
          })
        : Object.freeze({ ok: true, value });
    }
  }
  return Object.freeze(new ReadPort());
}

function createRuntime(driver: FullResourceDriverAdapter): FullResourceRuntime {
  const index = createGreedyResourceIndex();
  const actorId = generateIDString();
  const identities: ResourceOperationIdentitySource = Object.freeze({
    create: () =>
      Object.freeze({ operation_id: generateIDString(), actor_id: actorId }),
  });
  const engine: OperationEngine = createOperationEngine(identities);

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
          validateResourceHierarchy(coherentResourceMap(current));
          const nextResource = buildResourceSnapshot({
            ...resource,
            data: {
              ...resource.data,
              order_index: current.filter(
                (item) => !item.data.is_deleted && item.data.parent_id === null,
              ).length,
            },
          });
          const prepared = index.prepareBatch(
            [nextResource],
            [...current, nextResource],
          );
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
          try {
            await transaction.commit(draft);
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
          prepared.publish();
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
      coherentResourceMap(all);
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
      const changed = new Map(resources.map((item) => [item.data.id, item]));
      const coherentNext = all.map((item) => changed.get(item.data.id) ?? item);
      const prepared = index.prepareBatch(resources, coherentNext);
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
      try {
        await transaction.commit(draft);
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
      prepared.publish();
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
      coherentResourceMap(all);
      const preparation = prepareResourceDelete(all, request.id, now);
      if (preparation.kind !== "success")
        return Object.freeze({ kind: preparation.kind });
      const resources = preparation.resources;
      const changed = new Map(resources.map((item) => [item.data.id, item]));
      const coherentNext = all.map((item) => changed.get(item.data.id) ?? item);
      const prepared = index.prepareBatch(resources, coherentNext);
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
      try {
        await transaction.commit(draft);
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
      prepared.publish();
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
      validateResourceHierarchy(coherentResourceMap(coherentResources));
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
      const prepared = index.prepareBatch(
        [resource],
        coherentResources.map((item) =>
          item.data.id === resource.data.id ? resource : item,
        ),
      );
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
      try {
        await transaction.commit(draft);
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
      prepared.publish();
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
      validateResourceHierarchy(coherentResourceMap(all));
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
      const prepared = index.prepareBatch(
        [resource],
        all.map((item) => (item.data.id === request.id ? resource : item)),
      );
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
      try {
        await transaction.commit(draft);
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
      prepared.publish();
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

  return Object.freeze({
    readPort: createReadPort(index),
    writePort,
    lifecycle: lifecycleContribution({
      id: "core.resource-write",
      order: 30,
      async start() {
        try {
          await driver.open();
          const state = await scanRecoveryCleanResourceState(driver);
          await index.initialize(
            (async function* () {
              yield* state.resources;
            })(),
          );
        } catch {
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
        await engine.closeAndDrain();
        try {
          await driver.close();
        } finally {
          index.clear();
        }
      },
    }),
  });
}

export const FULL_RESOURCE_CORE_MODULE: ReturnType<typeof defineModule> =
  defineModule({
    id: "extensia.core.resource-write",
    requires: [{ token: FULL_RESOURCE_DRIVER }],
    provides: [
      { token: CORE_RESOURCE_READ_PORT, kind: "public-api" },
      { token: CORE_RESOURCE_WRITE_PORT, kind: "public-api" },
      {
        token: LIFECYCLE_CONTRIBUTIONS,
        kind: "admin-contribution",
        cardinality: "multi",
      },
    ],
    setup(context) {
      context
        .bind(RUNTIME)
        .toFactory(({ get }) => createRuntime(get(FULL_RESOURCE_DRIVER)))
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
        .add(LIFECYCLE_CONTRIBUTIONS)
        .toFactory(({ get }) => get(RUNTIME).lifecycle)
        .singleton();
    },
  });
