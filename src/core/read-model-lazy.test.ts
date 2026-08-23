import { describe, expect, it } from "vitest";

import { parseIDString, parseTimestamp } from "../domain/scalars.js";
import type { ResourceSnapshot } from "../domain/snapshots.js";
import { journalSequence } from "../storage/resource-journal-integrity.js";
import type { CommittedOperationEntry } from "../storage/resource-write-protocol.js";
import {
  buildSelectiveReadModelGeneration,
  createObservationStamp,
  hasAssetPointCoverage,
  hasMarkSelectorCoverage,
  markIdentityKey,
} from "./read-model-generation.js";
import {
  createDeterministicMetadataObservationAdapter,
  createDeterministicObservationBarrier,
} from "./deterministic-read-model-observation.js";
import {
  createReadModelSelectorPort,
  createResourceReadPort,
} from "./read-model-query.js";
import {
  createCoreMetadataObservationPort,
  CoreMetadataQueryUnavailableError,
} from "./read-model-observation.js";
import {
  createFullMetadataObservationPort,
  createReadonlyMetadataObservationPort,
} from "./read-model-storage-observation.js";
import { createGreedyResourceIndex } from "./resource-index.js";
import { createRuntimeFaultSink } from "./runtime-fault-sink.js";

const NOW = parseTimestamp(1_784_294_400_000);
const FIRST_ID = parseIDString("550e8400-e29b-41d4-a716-446655440000");
const LOCAL_ID = parseIDString("8f14e45f-ea6f-4d7a-923b-966f7356c001");
const ASSET_ID = parseIDString("00000000-0000-4000-8000-000000000099");
const MISSING_ASSET_ID = parseIDString("00000000-0000-4000-8000-000000000098");

function resource(
  id: typeof FIRST_ID,
  orderIndex: number,
  title: string,
): ResourceSnapshot {
  return {
    assets: [],
    data: {
      created_at: NOW,
      description: null,
      hidden: false,
      id,
      is_deleted: false,
      locked: false,
      order_index: orderIndex,
      parent_id: null,
      title,
      updated_at: NOW,
    },
    kv: {},
    marks: [],
  };
}

function committed(resourceId: typeof FIRST_ID): CommittedOperationEntry {
  return Object.freeze({
    actor_id: parseIDString("00000000-0000-4000-8000-000000000001"),
    affected_resources: Object.freeze([resourceId]),
    changes: Object.freeze([
      Object.freeze({
        kind: "resource.upsert" as const,
        resource_id: resourceId,
      }),
    ]),
    committed_at: NOW,
    operation_id: parseIDString("00000000-0000-4000-8000-000000000002"),
    schema_version: 1 as const,
    sequence: journalSequence(1n),
    type: "resource.create" as const,
    write_set_fingerprint: "0".repeat(64),
  });
}

describe("lazy read-model publication", () => {
  it("records exact positive and negative selector proofs without storage-global coverage", () => {
    const marked = {
      ...resource(FIRST_ID, 0, "marked"),
      marks: [{ name: "hero", type: "role", value: null }],
    } satisfies ResourceSnapshot;
    const key = markIdentityKey({ name: "hero", type: "role" });
    const positive = buildSelectiveReadModelGeneration({
      markSelector: { key, resourceIds: [FIRST_ID] },
      observationStamp: createObservationStamp(),
      resources: [marked],
    });
    expect(hasMarkSelectorCoverage(positive, key)).toBe(true);
    expect(positive.resourcesByMark.get(key)).toEqual([FIRST_ID]);
    expect(positive.coverage.storage_global).toBe(false);

    const absentAsset = parseIDString("00000000-0000-4000-8000-000000000099");
    const negative = buildSelectiveReadModelGeneration({
      assetPoints: [absentAsset],
      markSelector: { key, resourceIds: [] },
      observationStamp: createObservationStamp(),
      resources: [],
    });
    expect(hasAssetPointCoverage(negative, absentAsset)).toBe(true);
    expect(hasMarkSelectorCoverage(negative, key)).toBe(true);
    expect(negative.resourcesByMark.get(key)).toEqual([]);
    expect(negative.assetById.has(absentAsset)).toBe(false);
  });

  it("loads cold/warm Asset-owner and storage-global Mark selectors with exact negative and unavailable outcomes", async () => {
    const indexed: ResourceSnapshot = {
      ...resource(FIRST_ID, 0, "indexed"),
      assets: [
        {
          created_at: NOW,
          data: null,
          derived_from: null,
          extension: null,
          id: ASSET_ID,
          is_external: true,
          is_on_uploading: false,
          is_primary: true,
          mime: null,
          role: "hero",
          type: "image",
          updated_at: NOW,
          url: "https://example.test/hero",
        },
      ],
      marks: [{ name: "hero", type: "role", value: null }],
    };
    const observation = createDeterministicMetadataObservationAdapter([
      indexed,
    ]);
    const index = createGreedyResourceIndex();
    await index.initialize(
      (async function* () {
        yield indexed;
      })(),
      { loading: "lazy" },
    );
    const faultSink = createRuntimeFaultSink({
      cleanup: () => undefined,
      closeIntake: () => index.clear(),
    });
    const selectors = createReadModelSelectorPort({
      faultSink,
      index,
      metadataObservation: observation.port,
    });

    await expect(selectors.readAssetOwner(ASSET_ID)).resolves.toMatchObject({
      completeness: { scope: "point", status: "complete" },
      ok: true,
      value: { asset: { id: ASSET_ID }, owner_id: FIRST_ID },
    });
    expect(observation.reads).toBe(1);
    await selectors.readAssetOwner(ASSET_ID);
    expect(observation.reads).toBe(1);
    await expect(selectors.readAssetOwner(MISSING_ASSET_ID)).resolves.toEqual({
      completeness: { scope: "point", status: "complete" },
      ok: true,
      value: null,
    });

    await expect(
      selectors.readMarkResourceIDs("role", "hero"),
    ).resolves.toEqual({
      completeness: { scope: "storage-global", status: "complete" },
      ok: true,
      value: [FIRST_ID],
    });
    const markReads = observation.reads;
    await selectors.readMarkResourceIDs("role", "hero");
    expect(observation.reads).toBe(markReads);
    await expect(
      selectors.readMarkResourceIDs("role", "missing"),
    ).resolves.toEqual({
      completeness: { scope: "storage-global", status: "complete" },
      ok: true,
      value: [],
    });

    observation.failNext();
    await expect(
      selectors.readMarkResourceIDs("role", "read-failure"),
    ).resolves.toEqual({
      error: { code: "STORAGE_READ_FAILED" },
      ok: false,
    });
    const unavailable = createReadModelSelectorPort({
      faultSink,
      index,
      metadataObservation: {
        async observeMetadata() {
          throw new CoreMetadataQueryUnavailableError();
        },
      },
    });
    await expect(
      unavailable.readMarkResourceIDs("role", "unavailable"),
    ).resolves.toEqual({
      error: { code: "READ_MODEL_QUERY_UNAVAILABLE" },
      ok: false,
    });
    expect(faultSink.failed).toBe(false);
  });

  it("rejects a storage-global Mark selector before production full or readonly scans", async () => {
    const request = {
      kind: "mark-resources" as const,
      name: "hero",
      type: "role",
    };
    const unmarkedParent = resource(LOCAL_ID, 0, "unmarked parent");
    const childBase = resource(FIRST_ID, 0, "marked child");
    const markedChild: ResourceSnapshot = {
      ...childBase,
      data: { ...childBase.data, parent_id: unmarkedParent.data.id },
      marks: [{ name: "hero", type: "role", value: null }],
    };
    let unexpectedCompleteReads = 0;
    let exactMarkReads = 0;
    const exact = createCoreMetadataObservationPort({
      async readComplete() {
        unexpectedCompleteReads += 1;
        throw new Error("complete observation must not start");
      },
      async readMarkResources() {
        exactMarkReads += 1;
        return [markedChild];
      },
    });
    await expect(exact.observeMetadata(request)).resolves.toMatchObject({
      kind: "mark-resources",
      resources: [{ data: { id: FIRST_ID, parent_id: LOCAL_ID } }],
    });
    expect(exactMarkReads).toBe(1);
    expect(unexpectedCompleteReads).toBe(0);

    let fullAcquisitions = 0;
    const full = createFullMetadataObservationPort({
      async acquireStorageSession() {
        fullAcquisitions += 1;
        throw new Error("full observation must not start");
      },
    } as never);
    await expect(full.observeMetadata(request)).rejects.toBeInstanceOf(
      CoreMetadataQueryUnavailableError,
    );
    expect(fullAcquisitions).toBe(0);

    let readonlyScans = 0;
    const readonly = createReadonlyMetadataObservationPort({
      async *listResources() {
        readonlyScans += 1;
        yield resource(FIRST_ID, 0, "must not be scanned");
      },
    });
    await expect(readonly.observeMetadata(request)).rejects.toBeInstanceOf(
      CoreMetadataQueryUnavailableError,
    );
    expect(readonlyScans).toBe(0);
  });

  it("rejects a stale observation CAS and retains authoritative local overlays", async () => {
    const first = resource(FIRST_ID, 0, "first");
    const local = resource(LOCAL_ID, 1, "local");
    const observation = createDeterministicMetadataObservationAdapter([first]);
    const index = createGreedyResourceIndex();
    await index.initialize(
      (async function* () {
        yield first;
      })(),
      { loading: "lazy" },
    );
    const faultSink = createRuntimeFaultSink({
      cleanup: () => undefined,
      closeIntake: () => index.clear(),
    });
    const port = createResourceReadPort({
      faultSink,
      index,
      metadataObservation: observation.port,
    });
    const barrier = createDeterministicObservationBarrier();
    observation.blockNext(barrier);

    const reading = port.read({ id: FIRST_ID, type: "resource.get" });
    await barrier.entered;
    const prepared = index.prepareBatch([local]);
    prepared.publish(committed(LOCAL_ID));
    observation.replace([first, local]);
    barrier.release();

    await expect(reading).resolves.toMatchObject({
      ok: true,
      value: { data: { id: FIRST_ID } },
    });
    expect(observation.reads).toBe(2);
    expect(index.hasResourcePointCoverage(LOCAL_ID)).toBe(true);
    expect(index.getResource(LOCAL_ID)?.data.title).toBe("local");
    expect(faultSink.failed).toBe(false);
  });
});
