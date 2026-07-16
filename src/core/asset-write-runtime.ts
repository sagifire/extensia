import {
  assetDataEqual,
  compareAssetIDs,
  hasValidAssetArrayInvariants,
  validateAssetStorageInvariants,
  type AssetPayloadState,
} from "../domain/asset-metadata.js";
import {
  generateIDString,
  parseTimestamp,
  type IDString,
} from "../domain/scalars.js";
import {
  buildAssetSnapshot,
  buildResourceSnapshot,
  type AssetSnapshot,
  type ResourceSnapshot,
} from "../domain/snapshots.js";
import type {
  OperationEngine,
  OperationScope,
  ResourceOperationPlan,
} from "../operations/operation-engine.js";
import type { ResourceOperationIdentitySource } from "../operations/resource-operation-contracts.js";
import {
  computeResourceWriteSetFingerprint,
  ResourceStorageIntegrityError,
} from "../storage/resource-journal-integrity.js";
import type { FullResourceDriverAdapter } from "../storage/full-resource-driver-adapter.js";
import {
  AssetStorageIntegrityError,
  ResourceCommittedIntegrityError,
  ResourceRuntimeIntegrityError,
} from "../storage/resource-runtime-integrity.js";
import type {
  AssetLifecycleState,
  AssetLogicalChange,
  AssetPayloadAction,
  CommittedAssetOperationDraft,
  ResourceStorageSession,
  ResourceWriteTransaction,
} from "../storage/resource-write-protocol.js";
import type {
  CoreAssetWriteFailureCode,
  CoreAssetWritePort,
  CoreAssetWriteRequest,
  CoreAssetWriteResult,
} from "../system-extensions/default-api/asset-write-port.js";
import { validateResourceHierarchy } from "../domain/resource-hierarchy.js";
import type { MutableGreedyResourceIndex } from "./resource-index-write-contracts.js";

type AssetAttempt =
  | {
      readonly kind: "success";
      readonly operationId: IDString;
      readonly asset: AssetSnapshot | null;
      readonly resources: readonly ResourceSnapshot[];
      readonly warnings: readonly (
        "LOCAL_INDEX_PUBLICATION_FAILED" | "POST_COMMIT_CLEANUP_FAILED"
      )[];
    }
  | { readonly kind: "collision" }
  | { readonly kind: "failure"; readonly code: CoreAssetWriteFailureCode };

type BaseAssetAttempt =
  | Omit<Extract<AssetAttempt, { kind: "success" }>, "warnings">
  | Exclude<AssetAttempt, { kind: "success" }>;

interface LoadedAssetState {
  readonly resources: readonly ResourceSnapshot[];
  readonly resourcesByID: ReadonlyMap<IDString, ResourceSnapshot>;
  readonly assetsByID: ReadonlyMap<
    IDString,
    { readonly asset: AssetSnapshot; readonly owner: ResourceSnapshot }
  >;
  readonly payloadByAssetID: ReadonlyMap<IDString, AssetPayloadState>;
}

function failure(code: CoreAssetWriteFailureCode): BaseAssetAttempt {
  return Object.freeze({ kind: "failure", code });
}

function coherentResourceMap(
  resources: readonly ResourceSnapshot[],
): Map<IDString, ResourceSnapshot> {
  const result = new Map<IDString, ResourceSnapshot>();
  for (const resource of resources) {
    if (result.has(resource.data.id)) {
      throw new ResourceStorageIntegrityError(
        "Storage returned duplicate Resource IDs",
      );
    }
    result.set(resource.data.id, resource);
  }
  return result;
}

async function loadAssetState(
  session: ResourceStorageSession,
): Promise<LoadedAssetState> {
  const resources: ResourceSnapshot[] = [];
  for await (const resource of session.listResources())
    resources.push(resource);
  const resourcesByID = coherentResourceMap(resources);
  validateResourceHierarchy(resourcesByID);
  const payloadStates: AssetPayloadState[] = [];
  for await (const state of session.listAssetPayloadStates?.() ?? []) {
    payloadStates.push({
      active_upload:
        state.active_upload === null ? null : { ...state.active_upload },
      asset_id: state.asset_id,
      committed: state.committed,
    });
  }
  if (!validateAssetStorageInvariants(resources, payloadStates)) {
    throw new AssetStorageIntegrityError(
      "Asset storage invariants are invalid",
    );
  }
  const assetsByID = new Map<
    IDString,
    { readonly asset: AssetSnapshot; readonly owner: ResourceSnapshot }
  >();
  for (const owner of resources) {
    for (const asset of owner.assets)
      assetsByID.set(asset.id, { asset, owner });
  }
  return {
    assetsByID,
    payloadByAssetID: new Map(
      payloadStates.map((state) => [state.asset_id, state]),
    ),
    resources,
    resourcesByID,
  };
}

function lifecycleState(
  asset: AssetSnapshot,
  payload: AssetPayloadState | undefined,
): AssetLifecycleState {
  if (asset.is_external) return "external-ready";
  if (!asset.is_on_uploading) return "ready";
  if (payload?.active_upload === null || payload === undefined) {
    throw new AssetStorageIntegrityError("Uploading Asset has no generation");
  }
  return payload.active_upload.replaces_committed
    ? "replacement-uploading"
    : "initial-uploading";
}

function isReady(
  asset: AssetSnapshot,
  payloadByAssetID: ReadonlyMap<IDString, AssetPayloadState>,
): boolean {
  return (
    asset.is_external || payloadByAssetID.get(asset.id)?.committed === true
  );
}

function lineageValid(
  assets: readonly AssetSnapshot[],
  payloadByAssetID: ReadonlyMap<IDString, AssetPayloadState>,
): boolean {
  if (!hasValidAssetArrayInvariants(assets)) return false;
  const byID = new Map(assets.map((asset) => [asset.id, asset]));
  return assets.every((asset) => {
    if (asset.derived_from === null) return true;
    const target = byID.get(asset.derived_from);
    return target !== undefined && isReady(target, payloadByAssetID);
  });
}

function sortedResources(
  resources: readonly ResourceSnapshot[],
): readonly ResourceSnapshot[] {
  return Object.freeze(
    [...resources]
      .sort((left, right) =>
        left.data.id < right.data.id
          ? -1
          : left.data.id > right.data.id
            ? 1
            : 0,
      )
      .map(buildResourceSnapshot),
  );
}

function sortedAssetChanges(
  changes: readonly AssetLogicalChange[],
): readonly AssetLogicalChange[] {
  return Object.freeze(
    [...changes].sort((left, right) =>
      left.asset_id < right.asset_id
        ? -1
        : left.asset_id > right.asset_id
          ? 1
          : 0,
    ),
  );
}

async function commitPrepared(
  session: ResourceStorageSession,
  scope: OperationScope<BaseAssetAttempt>,
  plan: ResourceOperationPlan,
  index: MutableGreedyResourceIndex,
  currentResources: readonly ResourceSnapshot[],
  resources: readonly ResourceSnapshot[],
  assetChanges: readonly AssetLogicalChange[],
  asset: AssetSnapshot | null,
  committedAt: ReturnType<typeof parseTimestamp>,
): Promise<BaseAssetAttempt> {
  const preparedResources = sortedResources(resources);
  const changes = sortedAssetChanges(assetChanges);
  const changedByID = new Map(
    preparedResources.map((resource) => [resource.data.id, resource]),
  );
  const coherentNext = currentResources.map(
    (resource) => changedByID.get(resource.data.id) ?? resource,
  );
  const prepared = index.prepareBatch(preparedResources, coherentNext);
  let transaction: ResourceWriteTransaction | undefined;
  let committed = false;
  try {
    transaction = await session.begin(plan.operation_id);
    scope.transition("staging");
    for (const resource of preparedResources) {
      await transaction.stageResource(resource);
    }
    if (transaction.stageAssetChange === undefined) {
      throw new Error("Storage Driver lacks Asset metadata capability");
    }
    for (const change of changes) await transaction.stageAssetChange(change);
    const resourceIDs = Object.freeze(
      preparedResources.map((resource) => resource.data.id),
    );
    const draft: CommittedAssetOperationDraft = Object.freeze({
      actor_id: plan.actor_id,
      affected_resources: resourceIDs,
      asset_changes: changes,
      changes: Object.freeze(
        resourceIDs.map((resource_id) => ({
          kind: "resource.upsert" as const,
          resource_id,
        })),
      ),
      committed_at: committedAt,
      operation_id: plan.operation_id,
      schema_version: 1,
      type: plan.type as CommittedAssetOperationDraft["type"],
      write_set_fingerprint: computeResourceWriteSetFingerprint(
        preparedResources,
        changes,
      ),
    });
    const success = Object.freeze({
      asset: asset === null ? null : buildAssetSnapshot(asset),
      kind: "success" as const,
      operationId: plan.operation_id,
      resources: preparedResources,
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

async function withSession(
  driver: FullResourceDriverAdapter,
  scope: OperationScope<BaseAssetAttempt>,
  callback: (
    session: ResourceStorageSession,
    state: LoadedAssetState,
  ) => Promise<BaseAssetAttempt>,
): Promise<BaseAssetAttempt> {
  let session: ResourceStorageSession;
  try {
    session = await driver.acquireStorageSession(scope.signal);
  } catch (error) {
    if (error instanceof ResourceRuntimeIntegrityError) throw error;
    return failure("STORAGE_LOCK_FAILED");
  }
  try {
    return await callback(session, await loadAssetState(session));
  } catch (error) {
    if (scope.state === "committed") throw error;
    try {
      await session.release();
    } catch {
      /* The original failure remains authoritative. */
    }
    throw error;
  }
}

export function createAssetWritePort(input: {
  readonly driver: FullResourceDriverAdapter;
  readonly index: MutableGreedyResourceIndex;
  readonly engine: OperationEngine;
  readonly identities: ResourceOperationIdentitySource;
  readonly assetIDs?: { create(): IDString };
}): CoreAssetWritePort {
  const { driver, engine, identities, index } = input;
  const assetIDs = input.assetIDs ?? { create: generateIDString };

  async function execute(
    request: CoreAssetWriteRequest,
  ): Promise<CoreAssetWriteResult> {
    const identity = Object.freeze(identities.create());
    const now = parseTimestamp(Date.now());
    const lockKeys =
      request.type === "asset.reassign"
        ? [
            `resource:${request.source_resource_id}`,
            `resource:${request.destination_resource_id}`,
          ]
        : [`resource:${request.resource_id}`];
    const resourceHints =
      request.type === "asset.reassign"
        ? [request.source_resource_id, request.destination_resource_id]
        : [request.resource_id];
    const result = await engine.execute<BaseAssetAttempt>(
      {
        ...(request.fail_integrity === undefined
          ? {}
          : { fail_integrity: request.fail_integrity }),
        identity,
        lock_keys: lockKeys,
        resource_hints: resourceHints,
        type: request.type,
      },
      async (scope, plan) => {
        if (request.type === "asset.create") {
          for (
            let candidateNumber = 0;
            candidateNumber < 3;
            candidateNumber += 1
          ) {
            const assetID = assetIDs.create();
            const attempt = await scope.withLocks(
              [`asset:${assetID}`],
              async () =>
                withSession(driver, scope, async (session, state) => {
                  const owner = state.resourcesByID.get(request.resource_id);
                  if (owner === undefined || owner.data.is_deleted) {
                    await session.release();
                    return failure("RESOURCE_NOT_FOUND");
                  }
                  if (state.assetsByID.has(assetID)) {
                    await session.release();
                    return Object.freeze({ kind: "collision" as const });
                  }
                  if (
                    request.input.is_primary &&
                    owner.assets.some((asset) => asset.is_primary)
                  ) {
                    await session.release();
                    return failure("ASSET_PRIMARY_CONFLICT");
                  }
                  if (request.input.derived_from !== null) {
                    const target = owner.assets.find(
                      (asset) => asset.id === request.input.derived_from,
                    );
                    if (
                      target === undefined ||
                      !isReady(target, state.payloadByAssetID)
                    ) {
                      await session.release();
                      return failure("ASSET_LINEAGE_INVALID");
                    }
                  }
                  const uploadID =
                    request.input.kind === "internal"
                      ? generateIDString()
                      : null;
                  const asset = buildAssetSnapshot({
                    created_at: now,
                    data: request.input.data,
                    derived_from: request.input.derived_from,
                    extension: request.input.extension,
                    id: assetID,
                    is_external: request.input.kind === "external",
                    is_on_uploading: request.input.kind === "internal",
                    is_primary: request.input.is_primary,
                    mime: request.input.mime,
                    role: request.input.role,
                    type: request.input.type,
                    updated_at: now,
                    url: request.input.url,
                  });
                  const resource = buildResourceSnapshot({
                    ...owner,
                    assets: [...owner.assets, asset].sort(compareAssetIDs),
                    data: { ...owner.data, updated_at: now },
                  });
                  const payloadAction: AssetPayloadAction =
                    uploadID === null
                      ? { kind: "none" }
                      : { kind: "generation.create", upload_id: uploadID };
                  return commitPrepared(
                    session,
                    scope,
                    plan,
                    index,
                    state.resources,
                    [resource],
                    [
                      {
                        asset_id: asset.id,
                        owner_after: owner.data.id,
                        owner_before: null,
                        payload_action: payloadAction,
                        state_after:
                          request.input.kind === "external"
                            ? "external-ready"
                            : "initial-uploading",
                        state_before: null,
                      },
                    ],
                    asset,
                    now,
                  );
                }),
            );
            if (attempt.kind !== "collision") return attempt;
          }
          return Object.freeze({ kind: "collision" as const });
        }

        return withSession(driver, scope, async (session, state) => {
          if (request.type === "asset.reassign") {
            const source = state.resourcesByID.get(request.source_resource_id);
            const destination = state.resourcesByID.get(
              request.destination_resource_id,
            );
            if (
              source === undefined ||
              source.data.is_deleted ||
              destination === undefined ||
              destination.data.is_deleted
            ) {
              await session.release();
              return failure("RESOURCE_NOT_FOUND");
            }
            const asset = source.assets.find(
              (candidate) => candidate.id === request.asset_id,
            );
            if (asset === undefined) {
              await session.release();
              return failure("ASSET_NOT_FOUND");
            }
            if (source.data.id === destination.data.id) {
              await session.release();
              return failure("ASSET_NO_CHANGES");
            }
            if (
              asset.derived_from !== null ||
              source.assets.some(
                (candidate) => candidate.derived_from === asset.id,
              )
            ) {
              await session.release();
              return failure("ASSET_LINEAGE_CONFLICT");
            }
            if (asset.is_on_uploading) {
              await session.release();
              return failure("ASSET_UPLOAD_ALREADY_ACTIVE");
            }
            const moved = buildAssetSnapshot({
              ...asset,
              is_primary: false,
              updated_at: now,
            });
            const sourceNext = buildResourceSnapshot({
              ...source,
              assets: source.assets.filter(
                (candidate) => candidate.id !== asset.id,
              ),
              data: { ...source.data, updated_at: now },
            });
            const destinationNext = buildResourceSnapshot({
              ...destination,
              assets: [...destination.assets, moved].sort(compareAssetIDs),
              data: { ...destination.data, updated_at: now },
            });
            const stateName = lifecycleState(
              asset,
              state.payloadByAssetID.get(asset.id),
            );
            return commitPrepared(
              session,
              scope,
              plan,
              index,
              state.resources,
              [sourceNext, destinationNext],
              [
                {
                  asset_id: asset.id,
                  owner_after: destination.data.id,
                  owner_before: source.data.id,
                  payload_action: { kind: "none" },
                  state_after: stateName,
                  state_before: stateName,
                },
              ],
              moved,
              now,
            );
          }

          const owner = state.resourcesByID.get(request.resource_id);
          if (owner === undefined || owner.data.is_deleted) {
            await session.release();
            return failure("RESOURCE_NOT_FOUND");
          }

          if (request.type === "asset.primary.set") {
            const currentPrimary = owner.assets.find(
              (asset) => asset.is_primary,
            );
            if (request.asset_id === null) {
              if (currentPrimary === undefined) {
                await session.release();
                return failure("ASSET_NO_CHANGES");
              }
              const demoted = buildAssetSnapshot({
                ...currentPrimary,
                is_primary: false,
                updated_at: now,
              });
              const resource = buildResourceSnapshot({
                ...owner,
                assets: owner.assets.map((asset) =>
                  asset.id === demoted.id ? demoted : asset,
                ),
                data: { ...owner.data, updated_at: now },
              });
              const stateName = lifecycleState(
                currentPrimary,
                state.payloadByAssetID.get(currentPrimary.id),
              );
              return commitPrepared(
                session,
                scope,
                plan,
                index,
                state.resources,
                [resource],
                [
                  {
                    asset_id: demoted.id,
                    owner_after: owner.data.id,
                    owner_before: owner.data.id,
                    payload_action: { kind: "none" },
                    state_after: stateName,
                    state_before: stateName,
                  },
                ],
                null,
                now,
              );
            }
            const target = owner.assets.find(
              (asset) => asset.id === request.asset_id,
            );
            if (target === undefined) {
              await session.release();
              return failure("ASSET_NOT_FOUND");
            }
            if (target.is_primary) {
              await session.release();
              return failure("ASSET_NO_CHANGES");
            }
            if (!isReady(target, state.payloadByAssetID)) {
              await session.release();
              return failure("ASSET_NOT_READY");
            }
            const changedAssets: AssetSnapshot[] = [];
            const assets = owner.assets.map((asset) => {
              if (asset.id !== target.id && asset.id !== currentPrimary?.id) {
                return asset;
              }
              const changed = buildAssetSnapshot({
                ...asset,
                is_primary: asset.id === target.id,
                updated_at: now,
              });
              changedAssets.push(changed);
              return changed;
            });
            const resource = buildResourceSnapshot({
              ...owner,
              assets,
              data: { ...owner.data, updated_at: now },
            });
            return commitPrepared(
              session,
              scope,
              plan,
              index,
              state.resources,
              [resource],
              changedAssets.map((asset) => {
                const stateName = lifecycleState(
                  asset,
                  state.payloadByAssetID.get(asset.id),
                );
                return {
                  asset_id: asset.id,
                  owner_after: owner.data.id,
                  owner_before: owner.data.id,
                  payload_action: { kind: "none" as const },
                  state_after: stateName,
                  state_before: stateName,
                };
              }),
              resource.assets.find((asset) => asset.id === target.id)!,
              now,
            );
          }

          const asset = owner.assets.find(
            (candidate) => candidate.id === request.asset_id,
          );
          if (asset === undefined) {
            await session.release();
            return failure("ASSET_NOT_FOUND");
          }
          const stateName = lifecycleState(
            asset,
            state.payloadByAssetID.get(asset.id),
          );

          if (request.type === "asset.update") {
            if ("url" in request.patch && !asset.is_external) {
              await session.release();
              return failure("ASSET_INPUT_INVALID");
            }
            const next = buildAssetSnapshot({
              ...asset,
              data: "data" in request.patch ? request.patch.data! : asset.data,
              derived_from:
                "derived_from" in request.patch
                  ? request.patch.derived_from!
                  : asset.derived_from,
              extension:
                "extension" in request.patch
                  ? request.patch.extension!
                  : asset.extension,
              mime: "mime" in request.patch ? request.patch.mime! : asset.mime,
              role: request.patch.role ?? asset.role,
              type: request.patch.type ?? asset.type,
              updated_at: now,
              url: "url" in request.patch ? request.patch.url! : asset.url,
            });
            const candidateAssets = owner.assets
              .map((candidate) =>
                candidate.id === asset.id ? next : candidate,
              )
              .sort(compareAssetIDs);
            if (!lineageValid(candidateAssets, state.payloadByAssetID)) {
              await session.release();
              return failure("ASSET_LINEAGE_INVALID");
            }
            if (
              next.type === asset.type &&
              next.role === asset.role &&
              next.mime === asset.mime &&
              next.extension === asset.extension &&
              next.url === asset.url &&
              next.derived_from === asset.derived_from &&
              assetDataEqual(next.data, asset.data)
            ) {
              await session.release();
              return failure("ASSET_NO_CHANGES");
            }
            const resource = buildResourceSnapshot({
              ...owner,
              assets: candidateAssets,
              data: { ...owner.data, updated_at: now },
            });
            return commitPrepared(
              session,
              scope,
              plan,
              index,
              state.resources,
              [resource],
              [
                {
                  asset_id: asset.id,
                  owner_after: owner.data.id,
                  owner_before: owner.data.id,
                  payload_action: { kind: "none" },
                  state_after: stateName,
                  state_before: stateName,
                },
              ],
              next,
              now,
            );
          }

          if (
            owner.assets.some(
              (candidate) => candidate.derived_from === asset.id,
            )
          ) {
            await session.release();
            return failure("ASSET_HAS_DERIVATIVES");
          }
          const payload = state.payloadByAssetID.get(asset.id);
          let payloadAction: AssetPayloadAction;
          switch (stateName) {
            case "external-ready":
              payloadAction = { kind: "none" };
              break;
            case "initial-uploading":
              payloadAction = {
                kind: "generation.discard",
                upload_id: payload!.active_upload!.upload_id,
              };
              break;
            case "ready":
              payloadAction = { kind: "payload.delete" };
              break;
            case "replacement-uploading":
              payloadAction = {
                kind: "payload.delete-and-generation.discard",
                upload_id: payload!.active_upload!.upload_id,
              };
              break;
          }
          const resource = buildResourceSnapshot({
            ...owner,
            assets: owner.assets.filter(
              (candidate) => candidate.id !== asset.id,
            ),
            data: { ...owner.data, updated_at: now },
          });
          return commitPrepared(
            session,
            scope,
            plan,
            index,
            state.resources,
            [resource],
            [
              {
                asset_id: asset.id,
                owner_after: null,
                owner_before: owner.data.id,
                payload_action: payloadAction,
                state_after: null,
                state_before: stateName,
              },
            ],
            null,
            now,
          );
        });
      },
    );

    if (!result.ok) {
      return Object.freeze({
        error: Object.freeze({
          code:
            result.code === "OPERATION_INTEGRITY_FAILED"
              ? "STORAGE_INTEGRITY_FAILED"
              : "STORAGE_WRITE_FAILED",
        }),
        ok: false,
      });
    }
    if (result.value.kind === "collision") {
      return Object.freeze({
        error: Object.freeze({ code: "ASSET_ID_GENERATION_FAILED" }),
        ok: false,
      });
    }
    if (result.value.kind === "failure") {
      return Object.freeze({
        error: Object.freeze({ code: result.value.code }),
        ok: false,
      });
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        asset:
          result.value.asset === null
            ? null
            : buildAssetSnapshot(result.value.asset),
        operation_id: result.value.operationId,
        resources: Object.freeze(
          result.value.resources.map(buildResourceSnapshot),
        ),
        warnings: result.warnings,
      }),
    });
  }

  return Object.freeze({ write: execute });
}
