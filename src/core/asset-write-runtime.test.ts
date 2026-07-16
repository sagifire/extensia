import { describe, expect, it } from "vitest";

import type { IDString, Timestamp } from "../domain/scalars.js";
import {
  buildAssetSnapshot,
  buildResourceSnapshot,
} from "../domain/snapshots.js";
import { createOperationEngine } from "../operations/operation-engine.js";
import type { ResourceOperationIdentitySource } from "../operations/resource-operation-contracts.js";
import {
  createDeterministicFullDriverBacking,
  createDeterministicFullResourceDriver,
} from "../storage/deterministic-full-resource-driver.js";
import { createGreedyResourceIndex } from "./resource-index.js";
import { createAssetWritePort } from "./asset-write-runtime.js";

const RESOURCE_ID = "10000000-0000-4000-8000-000000000001" as IDString;
const EXISTING_ASSET_ID = "20000000-0000-4000-8000-000000000001" as IDString;
const OPERATION_ID = "30000000-0000-4000-8000-000000000001" as IDString;
const ACTOR_ID = "40000000-0000-4000-8000-000000000001" as IDString;

describe("Core Asset write runtime", () => {
  it("returns ASSET_ID_GENERATION_FAILED after three global candidate collisions", async () => {
    const resource = buildResourceSnapshot({
      assets: [
        buildAssetSnapshot({
          created_at: 1 as Timestamp,
          data: null,
          derived_from: null,
          extension: "jpg",
          id: EXISTING_ASSET_ID,
          is_external: true,
          is_on_uploading: false,
          is_primary: false,
          mime: "image/jpeg",
          role: "existing",
          type: "image",
          updated_at: 1 as Timestamp,
          url: "https://example.test/existing.jpg",
        }),
      ],
      data: {
        created_at: 1 as Timestamp,
        description: null,
        hidden: false,
        id: RESOURCE_ID,
        is_deleted: false,
        locked: false,
        order_index: 0,
        parent_id: null,
        title: "owner",
        updated_at: 1 as Timestamp,
      },
      kv: {},
      marks: [],
    });
    const backing = createDeterministicFullDriverBacking();
    backing.resources.set(RESOURCE_ID, resource);
    const driver = createDeterministicFullResourceDriver(backing);
    await driver.adapter.open();
    const index = createGreedyResourceIndex();
    await index.initialize(
      (async function* () {
        yield resource;
      })(),
    );
    let candidates = 0;
    const identities: ResourceOperationIdentitySource = {
      create() {
        return { actor_id: ACTOR_ID, operation_id: OPERATION_ID };
      },
    };
    const port = createAssetWritePort({
      assetIDs: {
        create() {
          candidates += 1;
          return EXISTING_ASSET_ID;
        },
      },
      driver: driver.adapter,
      engine: createOperationEngine(identities),
      identities,
      index,
    });

    await expect(
      port.write({
        input: {
          data: null,
          derived_from: null,
          extension: "png",
          is_primary: false,
          kind: "external",
          mime: "image/png",
          role: "candidate",
          type: "image",
          url: "https://example.test/candidate.png",
        },
        resource_id: RESOURCE_ID,
        type: "asset.create",
      }),
    ).resolves.toEqual({
      error: { code: "ASSET_ID_GENERATION_FAILED" },
      ok: false,
    });
    expect(candidates).toBe(3);
    expect(backing.journal).toEqual([]);
    expect(backing.resources.get(RESOURCE_ID)).toEqual(resource);
    index.clear();
    await driver.adapter.close();
  });
});
