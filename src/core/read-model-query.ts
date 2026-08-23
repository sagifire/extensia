import type {
  AssetSnapshot,
  ResourceSnapshot,
  ResourceTreeViewSnapshot,
} from "../domain/snapshots.js";
import { ResourceRuntimeIntegrityError } from "../storage/resource-runtime-integrity.js";
import type {
  CoreReadResult,
  CoreResourceReadPort,
  GetResourceReadRequest,
  GetResourceTreeReadRequest,
} from "../system-extensions/default-api/resource-read-port.js";
import type { MutableGreedyResourceIndex } from "./resource-index-write-contracts.js";
import {
  CoreMetadataQueryUnavailableError,
  type CoreMetadataObservationPort,
} from "./read-model-observation.js";
import type { RuntimeFaultSink } from "./runtime-fault-sink.js";
import { markIdentityKey } from "./read-model-generation.js";
import type { IDString } from "../domain/scalars.js";

function failure<T>(
  code:
    "RESOURCE_NOT_FOUND" | "STORAGE_READ_FAILED" | "STORAGE_INTEGRITY_FAILED",
): CoreReadResult<T> {
  return Object.freeze({ ok: false, error: Object.freeze({ code }) });
}

function found<T>(value: T): CoreReadResult<T> {
  return Object.freeze({ ok: true, value });
}

export function createResourceReadPort(input: {
  readonly index: MutableGreedyResourceIndex;
  readonly metadataObservation: CoreMetadataObservationPort;
  readonly faultSink: RuntimeFaultSink;
}): CoreResourceReadPort {
  async function ensureCoverage(
    request: GetResourceReadRequest | GetResourceTreeReadRequest,
  ): Promise<CoreReadResult<void>> {
    const covered = (): boolean =>
      request.type === "resource.get"
        ? input.index.hasResourcePointCoverage(request.id)
        : input.index.hasResourceOneLevelCoverage(request.id);
    for (let attempt = 0; attempt < 3 && !covered(); attempt += 1) {
      const baseRevision = input.index.captureRevision();
      let observation: import("./read-model-observation.js").CoreMetadataObservation;
      try {
        observation = await input.metadataObservation.observeMetadata(
          request.type === "resource.get"
            ? { kind: "resource-point", id: request.id }
            : { kind: "resource-one-level", id: request.id },
        );
      } catch (error) {
        if (error instanceof ResourceRuntimeIntegrityError) {
          input.faultSink.report({ kind: "integrity", code: error.code });
          return failure("STORAGE_INTEGRITY_FAILED");
        }
        return failure("STORAGE_READ_FAILED");
      }
      try {
        if (
          (request.type === "resource.get" &&
            observation.kind !== "resource-point") ||
          (request.type === "resource.tree.get" &&
            observation.kind !== "resource-one-level")
        ) {
          throw new ResourceRuntimeIntegrityError(
            "RESOURCE_INDEX_INTEGRITY",
            "Metadata observation returned an incompatible scope",
          );
        }
        input.index.publishMetadataObservation(
          baseRevision,
          request.type === "resource.get"
            ? { kind: "resource-point", id: request.id }
            : { kind: "resource-one-level", id: request.id },
          observation,
        );
      } catch (error) {
        input.faultSink.report({
          code:
            error instanceof ResourceRuntimeIntegrityError
              ? error.code
              : "RESOURCE_INDEX_INTEGRITY",
          kind: "integrity",
        });
        return failure("STORAGE_INTEGRITY_FAILED");
      }
    }
    return covered() ? found(undefined) : failure("STORAGE_READ_FAILED");
  }

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
      const coverage = await ensureCoverage(request);
      if (!coverage.ok) return coverage;
      const value =
        request.type === "resource.get"
          ? input.index.getResource(request.id)
          : input.index.getResourceTree(request.id);
      return value === undefined ? failure("RESOURCE_NOT_FOUND") : found(value);
    }
  }

  return Object.freeze(new ReadPort());
}

export type ReadModelSelectorResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
      readonly completeness: {
        readonly status: "complete";
        readonly scope: "point" | "storage-global";
      };
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code:
          | "READ_MODEL_QUERY_UNAVAILABLE"
          | "STORAGE_READ_FAILED"
          | "STORAGE_INTEGRITY_FAILED";
      };
    };

export interface InternalReadModelSelectorPort {
  readAssetOwner(assetId: IDString): Promise<
    ReadModelSelectorResult<{
      readonly owner_id: IDString;
      readonly asset: AssetSnapshot;
    } | null>
  >;
  readMarkResourceIDs(
    type: string,
    name: string,
  ): Promise<ReadModelSelectorResult<readonly IDString[]>>;
}

function selectorFailure<T>(
  code:
    | "READ_MODEL_QUERY_UNAVAILABLE"
    | "STORAGE_READ_FAILED"
    | "STORAGE_INTEGRITY_FAILED",
): ReadModelSelectorResult<T> {
  return Object.freeze({ error: Object.freeze({ code }), ok: false });
}

function selectorSuccess<T>(
  value: T,
  scope: "point" | "storage-global",
): ReadModelSelectorResult<T> {
  return Object.freeze({
    completeness: Object.freeze({ scope, status: "complete" as const }),
    ok: true,
    value,
  });
}

export function createReadModelSelectorPort(input: {
  readonly index: MutableGreedyResourceIndex;
  readonly metadataObservation: CoreMetadataObservationPort;
  readonly faultSink: RuntimeFaultSink;
}): InternalReadModelSelectorPort {
  async function ensureSelector(
    request:
      | { readonly kind: "asset-owner"; readonly asset_id: IDString }
      | {
          readonly kind: "mark-resources";
          readonly type: string;
          readonly name: string;
        },
    covered: () => boolean,
  ): Promise<ReadModelSelectorResult<void>> {
    for (let attempt = 0; attempt < 3 && !covered(); attempt += 1) {
      const baseRevision = input.index.captureRevision();
      try {
        const observation =
          await input.metadataObservation.observeMetadata(request);
        if (observation.kind !== request.kind) {
          throw new ResourceRuntimeIntegrityError(
            "RESOURCE_INDEX_INTEGRITY",
            "Metadata observation returned an incompatible selector scope",
          );
        }
        input.index.publishMetadataObservation(
          baseRevision,
          request,
          observation,
        );
      } catch (error) {
        if (error instanceof ResourceRuntimeIntegrityError) {
          input.faultSink.report({ code: error.code, kind: "integrity" });
          return selectorFailure("STORAGE_INTEGRITY_FAILED");
        }
        return selectorFailure(
          error instanceof CoreMetadataQueryUnavailableError
            ? "READ_MODEL_QUERY_UNAVAILABLE"
            : "STORAGE_READ_FAILED",
        );
      }
    }
    return covered()
      ? selectorSuccess(
          undefined,
          request.kind === "asset-owner" ? "point" : "storage-global",
        )
      : selectorFailure("READ_MODEL_QUERY_UNAVAILABLE");
  }

  return Object.freeze({
    async readAssetOwner(assetId: IDString) {
      const coverage = await ensureSelector(
        { asset_id: assetId, kind: "asset-owner" },
        () => input.index.hasAssetPointCoverage(assetId),
      );
      return coverage.ok
        ? selectorSuccess(input.index.getAssetOwner(assetId) ?? null, "point")
        : coverage;
    },
    async readMarkResourceIDs(type: string, name: string) {
      const key = markIdentityKey({ name, type });
      const coverage = await ensureSelector(
        { kind: "mark-resources", name, type },
        () => input.index.hasMarkSelectorCoverage(key),
      );
      return coverage.ok
        ? selectorSuccess(
            input.index.getResourceIDsByMark(key),
            "storage-global",
          )
        : coverage;
    },
  });
}
