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
import { computeResourceWriteSetFingerprint } from "../storage/resource-journal-integrity.js";
import type { FullResourceDriverAdapter } from "../storage/full-resource-driver-adapter.js";
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

  async function attemptCreate(
    resource: ResourceSnapshot,
    scope: OperationScope<BaseAttempt>,
    plan: ResourceOperationPlan,
  ): Promise<BaseAttempt> {
    return scope.withLocks([`resource:${resource.data.id}`], async () => {
      let session;
      try {
        session = await driver.acquireStorageSession(scope.signal);
      } catch {
        return Object.freeze({ kind: "lock-failed" as const });
      }
      let transaction: ResourceWriteTransaction | undefined;
      let committed = false;
      try {
        if ((await session.readResource(resource.data.id)) !== null) {
          return Object.freeze({ kind: "collision" as const });
        }
        const prepared = index.prepareUpsert(resource);
        transaction = await session.begin(plan.operation_id);
        scope.transition("staging");
        await transaction.stageResource(resource);
        const draft: CommittedOperationDraft = Object.freeze({
          schema_version: 1,
          operation_id: plan.operation_id,
          actor_id: plan.actor_id,
          type: "resource.create",
          affected_resources: Object.freeze([resource.data.id]),
          committed_at: resource.data.created_at,
          write_set_fingerprint: computeResourceWriteSetFingerprint([resource]),
          changes: Object.freeze([
            { kind: "resource.upsert" as const, resource_id: resource.data.id },
          ]),
        });
        scope.transition("committing");
        await transaction.commit(draft);
        const success = Object.freeze({
          kind: "success" as const,
          resource: buildResourceSnapshot(resource),
          operationId: plan.operation_id,
        });
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
    });
  }

  const writePort: CoreResourceWritePort = Object.freeze({
    async write(
      request: Parameters<CoreResourceWritePort["write"]>[0],
    ): Promise<CoreResourceWriteResult> {
      if (request.type !== "resource.create") {
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "RESOURCE_INPUT_INVALID" }),
        });
      }
      const identity = Object.freeze(identities.create());
      const now = parseTimestamp(Date.now());
      const engineResult = await engine.execute<BaseAttempt>(
        {
          type: "resource.create",
          affected_resources: [],
          identity,
          lock_keys: [],
        },
        async (scope, plan) => {
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
          error: Object.freeze({ code: "STORAGE_WRITE_FAILED" }),
        });
      const attempt = engineResult.value;
      if (attempt.kind === "collision")
        return Object.freeze({
          ok: false,
          error: Object.freeze({ code: "RESOURCE_ID_GENERATION_FAILED" }),
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
