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
  CommittedOperationEntry,
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
import {
  isAssetUploadHandle,
  resolveAssetUploadSessionCapability,
  validateAssetUploadBytes,
  type AssetUploadHandle,
} from "../storage/asset-upload-capability.js";
import type {
  AssetUploadReadSuccess,
  AssetUploadStageSuccess,
  CoreAssetUploadFailureCode,
  CoreAssetUploadPort,
  CoreAssetUploadResult,
} from "../system-extensions/default-api/asset-upload-port.js";

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

function createUniqueUploadID(
  state: LoadedAssetState,
  additional: readonly IDString[] = [],
): IDString | null {
  const occupied = new Set<IDString>([
    ...state.assetsByID.keys(),
    ...additional,
  ]);
  for (const payload of state.payloadByAssetID.values()) {
    if (payload.active_upload !== null) {
      occupied.add(payload.active_upload.upload_id);
    }
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = generateIDString();
    if (!occupied.has(candidate)) return candidate;
  }
  return null;
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
  const prepared = index.prepareBatch(preparedResources);
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
                  if (
                    state.assetsByID.has(assetID) ||
                    [...state.payloadByAssetID.values()].some(
                      (payload) => payload.active_upload?.upload_id === assetID,
                    )
                  ) {
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
                      ? createUniqueUploadID(state, [assetID])
                      : null;
                  if (request.input.kind === "internal" && uploadID === null) {
                    await session.release();
                    return failure("ASSET_ID_GENERATION_FAILED");
                  }
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

type UploadAttempt<TValue> =
  | { readonly kind: "success"; readonly value: TValue }
  | { readonly kind: "failure"; readonly code: CoreAssetUploadFailureCode };

function uploadFailure(code: CoreAssetUploadFailureCode): UploadAttempt<never> {
  return Object.freeze({ kind: "failure", code });
}

function uploadResult<TValue>(
  result: Awaited<ReturnType<OperationEngine["execute"]>>,
): CoreAssetUploadResult<TValue> {
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
  const attempt = result.value as UploadAttempt<TValue>;
  return attempt.kind === "failure"
    ? Object.freeze({
        error: Object.freeze({ code: attempt.code }),
        ok: false,
      })
    : Object.freeze({ ok: true, value: attempt.value });
}

function committedUploadWrite(
  attempt: Extract<BaseAssetAttempt, { readonly kind: "success" }>,
  warnings: readonly (
    "LOCAL_INDEX_PUBLICATION_FAILED" | "POST_COMMIT_CLEANUP_FAILED"
  )[],
) {
  return Object.freeze({
    asset: attempt.asset === null ? null : buildAssetSnapshot(attempt.asset),
    operation_id: attempt.operationId,
    resources: Object.freeze(attempt.resources.map(buildResourceSnapshot)),
    warnings,
  });
}

export function createAssetUploadPort(input: {
  readonly driver: FullResourceDriverAdapter;
  readonly index: MutableGreedyResourceIndex;
  readonly engine: OperationEngine;
  readonly identities: ResourceOperationIdentitySource;
}): CoreAssetUploadPort {
  const { driver, engine, identities, index } = input;

  async function resolve(
    resourceId: IDString,
    assetId: IDString,
    failIntegrity?: Parameters<CoreAssetUploadPort["resolve"]>[2],
  ): ReturnType<CoreAssetUploadPort["resolve"]> {
    const result = await engine.execute<UploadAttempt<AssetUploadHandle>>(
      {
        ...(failIntegrity === undefined
          ? {}
          : { fail_integrity: failIntegrity }),
        lock_keys: [`resource:${resourceId}`],
        resource_hints: [resourceId],
        type: "asset.upload.resolve",
      },
      async (scope) => {
        let session: ResourceStorageSession;
        try {
          session = await driver.acquireStorageSession(scope.signal);
        } catch (error) {
          if (error instanceof ResourceRuntimeIntegrityError) throw error;
          return uploadFailure("STORAGE_LOCK_FAILED");
        }
        try {
          const state = await loadAssetState(session);
          const owner = state.resourcesByID.get(resourceId);
          if (owner === undefined || owner.data.is_deleted) {
            return uploadFailure("RESOURCE_NOT_FOUND");
          }
          const asset = owner.assets.find(
            (candidate) => candidate.id === assetId,
          );
          if (asset === undefined) return uploadFailure("ASSET_NOT_FOUND");
          const payload = state.payloadByAssetID.get(assetId);
          if (
            asset.is_external ||
            !asset.is_on_uploading ||
            payload?.active_upload === null ||
            payload === undefined
          ) {
            return uploadFailure("ASSET_UPLOAD_NOT_ACTIVE");
          }
          const capability = resolveAssetUploadSessionCapability(session);
          if (capability === null) {
            throw new AssetStorageIntegrityError(
              "Storage Driver lacks Asset upload capability",
            );
          }
          const handle = await capability.resolveActiveUpload(
            resourceId,
            assetId,
          );
          if (
            handle === null ||
            handle.upload_id !== payload.active_upload.upload_id
          ) {
            throw new AssetStorageIntegrityError(
              "Storage Driver returned an inconsistent Asset upload handle",
            );
          }
          return Object.freeze({ kind: "success", value: handle });
        } finally {
          await session.release();
        }
      },
    );
    return uploadResult<AssetUploadHandle>(result);
  }

  async function stage(
    handle: AssetUploadHandle,
    inputBytes: Uint8Array,
    failIntegrity?: Parameters<CoreAssetUploadPort["stage"]>[2],
  ): ReturnType<CoreAssetUploadPort["stage"]> {
    if (!isAssetUploadHandle(handle)) {
      return Object.freeze({
        error: Object.freeze({ code: "ASSET_UPLOAD_NOT_ACTIVE" }),
        ok: false,
      });
    }
    if (!(inputBytes instanceof Uint8Array)) {
      return Object.freeze({
        error: Object.freeze({ code: "STORAGE_WRITE_FAILED" }),
        ok: false,
      });
    }
    try {
      validateAssetUploadBytes(inputBytes);
    } catch {
      return Object.freeze({
        error: Object.freeze({ code: "STORAGE_WRITE_FAILED" }),
        ok: false,
      });
    }
    const bytes = new Uint8Array(inputBytes);
    const result = await engine.execute<UploadAttempt<AssetUploadStageSuccess>>(
      {
        ...(failIntegrity === undefined
          ? {}
          : { fail_integrity: failIntegrity }),
        lock_keys: [`resource:${handle.resource_id}`],
        resource_hints: [handle.resource_id],
        type: "asset.upload.stage",
      },
      async (scope) => {
        let session: ResourceStorageSession;
        try {
          session = await driver.acquireStorageSession(scope.signal);
        } catch (error) {
          if (error instanceof ResourceRuntimeIntegrityError) throw error;
          return uploadFailure("STORAGE_LOCK_FAILED");
        }
        try {
          const state = await loadAssetState(session);
          const owner = state.resourcesByID.get(handle.resource_id);
          if (owner === undefined || owner.data.is_deleted) {
            return uploadFailure("RESOURCE_NOT_FOUND");
          }
          const asset = owner.assets.find(
            (candidate) => candidate.id === handle.asset_id,
          );
          if (asset === undefined) return uploadFailure("ASSET_NOT_FOUND");
          const payload = state.payloadByAssetID.get(handle.asset_id);
          if (
            !asset.is_on_uploading ||
            payload?.active_upload?.upload_id !== handle.upload_id
          ) {
            return uploadFailure("ASSET_UPLOAD_NOT_ACTIVE");
          }
          const capability = resolveAssetUploadSessionCapability(session);
          if (capability === null) {
            throw new AssetStorageIntegrityError(
              "Storage Driver lacks Asset upload capability",
            );
          }
          const staged = await capability.stageBytes(handle, bytes);
          if (staged === null) return uploadFailure("ASSET_UPLOAD_NOT_ACTIVE");
          return Object.freeze({
            kind: "success",
            value: Object.freeze({
              byte_length: staged.byte_length,
              digest: staged.digest,
              handle,
            }),
          });
        } finally {
          await session.release();
        }
      },
    );
    return uploadResult<AssetUploadStageSuccess>(result);
  }

  async function read(
    resourceId: IDString,
    assetId: IDString,
    failIntegrity?: Parameters<CoreAssetUploadPort["read"]>[2],
  ): ReturnType<CoreAssetUploadPort["read"]> {
    const result = await engine.execute<UploadAttempt<AssetUploadReadSuccess>>(
      {
        ...(failIntegrity === undefined
          ? {}
          : { fail_integrity: failIntegrity }),
        lock_keys: [`resource:${resourceId}`],
        resource_hints: [resourceId],
        type: "asset.file.read",
      },
      async (scope) => {
        let session: ResourceStorageSession;
        try {
          session = await driver.acquireStorageSession(scope.signal);
        } catch (error) {
          if (error instanceof ResourceRuntimeIntegrityError) throw error;
          return uploadFailure("STORAGE_LOCK_FAILED");
        }
        try {
          const state = await loadAssetState(session);
          const owner = state.resourcesByID.get(resourceId);
          if (owner === undefined || owner.data.is_deleted) {
            return uploadFailure("RESOURCE_NOT_FOUND");
          }
          const asset = owner.assets.find(
            (candidate) => candidate.id === assetId,
          );
          if (asset === undefined) return uploadFailure("ASSET_NOT_FOUND");
          if (
            asset.is_external ||
            state.payloadByAssetID.get(assetId)?.committed !== true
          ) {
            return uploadFailure("ASSET_FILE_NOT_READY");
          }
          const capability = resolveAssetUploadSessionCapability(session);
          if (capability === null) {
            throw new AssetStorageIntegrityError(
              "Storage Driver lacks Asset upload capability",
            );
          }
          const bytes = await capability.readCommitted(resourceId, assetId);
          if (bytes === null) {
            throw new AssetStorageIntegrityError(
              "Committed Asset payload bytes are missing",
            );
          }
          return Object.freeze({
            kind: "success",
            value: Object.freeze({
              asset_id: assetId,
              bytes: new Uint8Array(bytes),
            }),
          });
        } finally {
          await session.release();
        }
      },
    );
    return uploadResult<AssetUploadReadSuccess>(result);
  }

  async function begin(
    resourceId: IDString,
    assetId: IDString,
    failIntegrity?: Parameters<CoreAssetUploadPort["begin"]>[2],
  ): ReturnType<CoreAssetUploadPort["begin"]> {
    const identity = Object.freeze(identities.create());
    const now = parseTimestamp(Date.now());
    let handle: AssetUploadHandle | null = null;
    const result = await engine.execute<BaseAssetAttempt>(
      {
        ...(failIntegrity === undefined
          ? {}
          : { fail_integrity: failIntegrity }),
        identity,
        lock_keys: [`resource:${resourceId}`],
        resource_hints: [resourceId],
        type: "asset.upload.begin",
      },
      async (scope, plan) =>
        withSession(driver, scope, async (session, state) => {
          const owner = state.resourcesByID.get(resourceId);
          if (owner === undefined || owner.data.is_deleted) {
            await session.release();
            return failure("RESOURCE_NOT_FOUND");
          }
          const asset = owner.assets.find(
            (candidate) => candidate.id === assetId,
          );
          if (asset === undefined) {
            await session.release();
            return failure("ASSET_NOT_FOUND");
          }
          if (asset.is_external) {
            await session.release();
            return failure("ASSET_NOT_READY");
          }
          if (asset.is_on_uploading) {
            await session.release();
            return failure("ASSET_UPLOAD_ALREADY_ACTIVE");
          }
          const payload = state.payloadByAssetID.get(assetId);
          if (payload?.committed !== true || payload.active_upload !== null) {
            throw new AssetStorageIntegrityError(
              "Ready internal Asset has invalid payload state",
            );
          }
          const uploadId = createUniqueUploadID(state);
          if (uploadId === null) {
            await session.release();
            return failure("STORAGE_WRITE_FAILED");
          }
          const capability = resolveAssetUploadSessionCapability(session);
          if (capability === null) {
            throw new AssetStorageIntegrityError(
              "Storage Driver lacks Asset upload capability",
            );
          }
          handle = capability.issueHandle(resourceId, assetId, uploadId);
          const next = buildAssetSnapshot({
            ...asset,
            is_on_uploading: true,
            updated_at: now,
          });
          const resource = buildResourceSnapshot({
            ...owner,
            assets: owner.assets.map((candidate) =>
              candidate.id === assetId ? next : candidate,
            ),
            data: { ...owner.data, updated_at: now },
          });
          const committed = await commitPrepared(
            session,
            scope,
            plan,
            index,
            state.resources,
            [resource],
            [
              {
                asset_id: assetId,
                owner_after: resourceId,
                owner_before: resourceId,
                payload_action: {
                  kind: "generation.create",
                  upload_id: uploadId,
                },
                state_after: "replacement-uploading",
                state_before: "ready",
              },
            ],
            next,
            now,
          );
          return committed;
        }),
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
    if (result.value.kind !== "success") {
      return Object.freeze({
        error: Object.freeze({
          code:
            result.value.kind === "failure"
              ? (result.value.code as CoreAssetUploadFailureCode)
              : "STORAGE_WRITE_FAILED",
        }),
        ok: false,
      });
    }
    if (handle === null) {
      throw new Error("Committed Asset upload begin has no handle");
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        handle,
        write: committedUploadWrite(result.value, result.warnings),
      }),
    });
  }

  async function finish(
    handle: AssetUploadHandle,
    failIntegrity?: Parameters<CoreAssetUploadPort["finish"]>[1],
  ): ReturnType<CoreAssetUploadPort["finish"]> {
    return transition(handle, "finish", failIntegrity);
  }

  async function abort(
    handle: AssetUploadHandle,
    failIntegrity?: Parameters<CoreAssetUploadPort["abort"]>[1],
  ): ReturnType<CoreAssetUploadPort["abort"]> {
    return transition(handle, "abort", failIntegrity);
  }

  async function transition(
    handle: AssetUploadHandle,
    kind: "finish" | "abort",
    failIntegrity?: Parameters<CoreAssetUploadPort["finish"]>[1],
  ): Promise<CoreAssetUploadResult<ReturnType<typeof committedUploadWrite>>> {
    if (!isAssetUploadHandle(handle)) {
      return Object.freeze({
        error: Object.freeze({ code: "ASSET_UPLOAD_NOT_ACTIVE" }),
        ok: false,
      });
    }
    const identity = Object.freeze(identities.create());
    const now = parseTimestamp(Date.now());
    const result = await engine.execute<BaseAssetAttempt>(
      {
        ...(failIntegrity === undefined
          ? {}
          : { fail_integrity: failIntegrity }),
        identity,
        lock_keys: [`resource:${handle.resource_id}`],
        resource_hints: [handle.resource_id],
        type: `asset.upload.${kind}`,
      },
      async (scope, plan) =>
        withSession(driver, scope, async (session, state) => {
          const owner = state.resourcesByID.get(handle.resource_id);
          if (owner === undefined || owner.data.is_deleted) {
            await session.release();
            return failure("RESOURCE_NOT_FOUND");
          }
          const asset = owner.assets.find(
            (candidate) => candidate.id === handle.asset_id,
          );
          if (asset === undefined) {
            await session.release();
            return failure("ASSET_NOT_FOUND");
          }
          const payload = state.payloadByAssetID.get(handle.asset_id);
          if (
            !asset.is_on_uploading ||
            payload?.active_upload?.upload_id !== handle.upload_id
          ) {
            await session.release();
            return failure("ASSET_UPLOAD_NOT_ACTIVE");
          }
          const before = lifecycleState(asset, payload);
          const capability = resolveAssetUploadSessionCapability(session);
          if (capability === null) {
            throw new AssetStorageIntegrityError(
              "Storage Driver lacks Asset upload capability",
            );
          }
          if (!capability.ownsHandle(handle)) {
            await session.release();
            return failure("ASSET_UPLOAD_NOT_ACTIVE");
          }
          if (kind === "finish") {
            if ((await capability.inspectStagedUpload(handle)) === null) {
              await session.release();
              return failure("ASSET_UPLOAD_INCOMPLETE");
            }
          }
          const initial = before === "initial-uploading";
          const next =
            initial && kind === "abort"
              ? null
              : buildAssetSnapshot({
                  ...asset,
                  is_on_uploading: false,
                  updated_at: now,
                });
          const resource = buildResourceSnapshot({
            ...owner,
            assets:
              next === null
                ? owner.assets.filter(
                    (candidate) => candidate.id !== handle.asset_id,
                  )
                : owner.assets.map((candidate) =>
                    candidate.id === handle.asset_id ? next : candidate,
                  ),
            data: { ...owner.data, updated_at: now },
          });
          const committed = await commitPrepared(
            session,
            scope,
            plan,
            index,
            state.resources,
            [resource],
            [
              {
                asset_id: handle.asset_id,
                owner_after: next === null ? null : handle.resource_id,
                owner_before: handle.resource_id,
                payload_action:
                  kind === "finish"
                    ? {
                        kind: "generation.publish",
                        replaces_committed: payload.committed,
                        upload_id: handle.upload_id,
                      }
                    : {
                        kind: "generation.discard",
                        upload_id: handle.upload_id,
                      },
                state_after: next === null ? null : "ready",
                state_before: before,
              },
            ],
            next,
            now,
          );
          return committed;
        }),
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
    if (result.value.kind !== "success") {
      return Object.freeze({
        error: Object.freeze({
          code:
            result.value.kind === "failure"
              ? (result.value.code as CoreAssetUploadFailureCode)
              : "STORAGE_WRITE_FAILED",
        }),
        ok: false,
      });
    }
    return Object.freeze({
      ok: true,
      value: committedUploadWrite(result.value, result.warnings),
    });
  }

  return Object.freeze({ abort, begin, finish, read, resolve, stage });
}
