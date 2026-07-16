import { describe, expect, it } from "vitest";

import { createExtensia, defineFullResourceDriver } from "../index.js";
import {
  createDeterministicFullDriverBacking,
  createDeterministicFullResourceDriver,
} from "../storage/deterministic-full-resource-driver.js";
import {
  buildAssetSnapshot,
  buildResourceSnapshot,
} from "../domain/snapshots.js";

async function fixture() {
  const backing = createDeterministicFullDriverBacking();
  const driver = createDeterministicFullResourceDriver(backing);
  const extensia = createExtensia({
    storage: { driver: defineFullResourceDriver(driver.adapter) },
  });
  const started = await extensia.start();
  if (!started.ok) throw new Error("start failed");
  const first = await extensia.storage()!.createResource({ title: "first" });
  const second = await extensia.storage()!.createResource({ title: "second" });
  if (!first.ok || !second.ok) throw new Error("resource create failed");
  return {
    backing,
    driver,
    extensia,
    firstID: first.value.resource.data.id,
    secondID: second.value.resource.data.id,
  };
}

async function restart(
  backing: ReturnType<typeof createDeterministicFullDriverBacking>,
) {
  const driver = createDeterministicFullResourceDriver(backing);
  const extensia = createExtensia({
    storage: { driver: defineFullResourceDriver(driver.adapter) },
  });
  const started = await extensia.start();
  if (!started.ok) throw new Error("restart failed");
  return { driver, extensia };
}

const externalInput = {
  data: { z: 1, nested: { ok: true } },
  extension: "jpg",
  kind: "external" as const,
  mime: "image/jpeg",
  role: "original",
  type: "image",
  url: "HTTPS://Example.COM:443/media/../asset.jpg?q=1#v",
};

describe("public Asset metadata lifecycle", () => {
  it("creates canonical external metadata and updates it through one journal path", async () => {
    const { driver, extensia, firstID } = await fixture();
    const created = await extensia
      .storage()!
      .createAsset(firstID, externalInput);
    expect(created).toMatchObject({
      ok: true,
      value: {
        asset: {
          data: { nested: { ok: true }, z: 1 },
          is_external: true,
          is_on_uploading: false,
          is_primary: false,
          url: "https://example.com/asset.jpg?q=1#v",
        },
        committed: true,
        resources: [{ data: { id: firstID } }],
      },
    });
    if (!created.ok || created.value.asset === null) {
      throw new Error("Asset create failed");
    }
    const assetID = created.value.asset.id;
    const beforeResourceTime = created.value.resources[0]!.data.updated_at;

    await expect(
      extensia.storage()!.updateAsset(firstID, assetID, {
        data: { nested: { ok: true }, z: 1 },
        url: "https://EXAMPLE.com:443/asset.jpg?q=1#v",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ASSET_NO_CHANGES" },
    });
    const updated = await extensia.storage()!.updateAsset(firstID, assetID, {
      data: { nested: { ok: false }, z: 2 },
      role: "preview",
    });
    expect(updated).toMatchObject({
      ok: true,
      value: {
        asset: { data: { nested: { ok: false }, z: 2 }, role: "preview" },
      },
    });
    if (!updated.ok || updated.value.asset === null) {
      throw new Error("Asset update failed");
    }
    expect(updated.value.asset.updated_at).toBe(
      updated.value.resources[0]!.data.updated_at,
    );
    expect(updated.value.resources[0]!.data.updated_at).toBeGreaterThanOrEqual(
      beforeResourceTime,
    );

    const entries = driver.inspect().journal.slice(-2);
    expect(entries.map((entry) => entry.type)).toEqual([
      "asset.create",
      "asset.update",
    ]);
    expect(entries[0]).toMatchObject({
      affected_resources: [firstID],
      asset_changes: [
        {
          asset_id: assetID,
          owner_before: null,
          owner_after: firstID,
          state_before: null,
          state_after: "external-ready",
          payload_action: { kind: "none" },
        },
      ],
    });
    expect(driver.inspect().journal).toHaveLength(4);
    await extensia.stop();
  });

  it("enforces lineage, explicit primary, reassignment and delete conflicts atomically", async () => {
    const { driver, extensia, firstID, secondID } = await fixture();
    const original = await extensia.storage()!.createAsset(firstID, {
      ...externalInput,
      is_primary: true,
      role: "original",
    });
    if (!original.ok || original.value.asset === null)
      throw new Error("create");
    const derivative = await extensia.storage()!.createAsset(firstID, {
      ...externalInput,
      derived_from: original.value.asset.id,
      role: "thumbnail",
      url: "https://example.test/thumb.jpg",
    });
    const alternate = await extensia.storage()!.createAsset(firstID, {
      ...externalInput,
      role: "alternate",
      url: "https://example.test/alternate.jpg",
    });
    if (
      !derivative.ok ||
      derivative.value.asset === null ||
      !alternate.ok ||
      alternate.value.asset === null
    ) {
      throw new Error("create");
    }

    await expect(
      extensia.storage()!.deleteAsset(firstID, original.value.asset.id),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ASSET_HAS_DERIVATIVES" },
    });
    await expect(
      extensia
        .storage()!
        .reassignAsset(firstID, derivative.value.asset.id, secondID),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ASSET_LINEAGE_CONFLICT" },
    });
    const primary = await extensia
      .storage()!
      .setPrimaryAsset(firstID, alternate.value.asset.id);
    expect(primary).toMatchObject({
      ok: true,
      value: { asset: { id: alternate.value.asset.id, is_primary: true } },
    });
    const primaryEntry = driver.inspect().journal.at(-1)!;
    expect(primaryEntry.type).toBe("asset.primary.set");
    if (!("asset_changes" in primaryEntry)) throw new Error("missing changes");
    expect(primaryEntry.asset_changes).toHaveLength(2);
    expect(primaryEntry.asset_changes.map((change) => change.asset_id)).toEqual(
      [...primaryEntry.asset_changes].map((change) => change.asset_id).sort(),
    );

    await extensia
      .storage()!
      .updateAsset(firstID, derivative.value.asset.id, { derived_from: null });
    const moved = await extensia
      .storage()!
      .reassignAsset(firstID, derivative.value.asset.id, secondID);
    expect(moved).toMatchObject({
      ok: true,
      value: {
        asset: { derived_from: null, is_primary: false },
        resources: [
          { data: { id: expect.any(String) } },
          { data: { id: expect.any(String) } },
        ],
      },
    });
    if (!moved.ok) throw new Error("move");
    expect(moved.value.resources.map((resource) => resource.data.id)).toEqual(
      [firstID, secondID].sort(),
    );
    await expect(
      extensia.storage()!.deleteAsset(firstID, original.value.asset.id),
    ).resolves.toMatchObject({ ok: true, value: { asset: null } });
    await extensia.stop();
  });

  it("reassigns an older Asset into a newer Resource without corrupting timestamps", async () => {
    const backing = createDeterministicFullDriverBacking();
    const driver = createDeterministicFullResourceDriver(backing);
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(driver.adapter) },
    });
    await extensia.start();
    const source = await extensia
      .storage()!
      .createResource({ title: "source" });
    if (!source.ok) throw new Error("source");
    const created = await extensia
      .storage()!
      .createAsset(source.value.resource.data.id, externalInput);
    if (!created.ok || created.value.asset === null) throw new Error("asset");
    while (Date.now() <= created.value.asset.created_at) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    const destination = await extensia
      .storage()!
      .createResource({ title: "destination" });
    if (!destination.ok) throw new Error("destination");
    expect(destination.value.resource.data.created_at).toBeGreaterThan(
      created.value.asset.created_at,
    );

    await expect(
      extensia
        .storage()!
        .reassignAsset(
          source.value.resource.data.id,
          created.value.asset.id,
          destination.value.resource.data.id,
        ),
    ).resolves.toMatchObject({ ok: true });
    expect(extensia.getState()).toBe("started");
    await extensia.stop();
  });

  it("rejects self, cycle, cross-Resource, dangling and not-ready lineage", async () => {
    const { backing, extensia, firstID, secondID } = await fixture();
    const original = await extensia
      .storage()!
      .createAsset(firstID, externalInput);
    if (!original.ok || original.value.asset === null) throw new Error("first");
    const derivative = await extensia.storage()!.createAsset(firstID, {
      ...externalInput,
      derived_from: original.value.asset.id,
      role: "derivative",
    });
    const cross = await extensia.storage()!.createAsset(secondID, {
      ...externalInput,
      role: "cross",
    });
    const staged = await extensia.storage()!.createAsset(firstID, {
      extension: null,
      kind: "internal",
      mime: null,
      role: "staged",
      type: "binary",
    });
    if (
      !derivative.ok ||
      derivative.value.asset === null ||
      !cross.ok ||
      cross.value.asset === null ||
      !staged.ok ||
      staged.value.asset === null
    ) {
      throw new Error("lineage setup");
    }
    for (const derivedFrom of [
      original.value.asset.id,
      derivative.value.asset.id,
      cross.value.asset.id,
      "40000000-0000-4000-8000-000000000001",
      staged.value.asset.id,
    ]) {
      await expect(
        extensia.storage()!.updateAsset(firstID, original.value.asset.id, {
          derived_from: derivedFrom,
        }),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: "ASSET_LINEAGE_INVALID" },
      });
    }
    await extensia.stop();

    const owner = backing.resources.get(firstID)!;
    backing.resources.set(
      firstID,
      buildResourceSnapshot({
        ...owner,
        assets: owner.assets.map((asset) =>
          asset.id === original.value.asset!.id
            ? { ...asset, derived_from: staged.value.asset!.id }
            : asset,
        ),
      }),
    );
    const notReadyRestart = createExtensia({
      storage: {
        driver: defineFullResourceDriver(
          createDeterministicFullResourceDriver(backing).adapter,
        ),
      },
    });
    await expect(notReadyRestart.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "START_FAILED" },
    });

    const cycle = await fixture();
    const left = await cycle.extensia
      .storage()!
      .createAsset(cycle.firstID, externalInput);
    const right = await cycle.extensia.storage()!.createAsset(cycle.firstID, {
      ...externalInput,
      role: "right",
    });
    if (
      !left.ok ||
      left.value.asset === null ||
      !right.ok ||
      right.value.asset === null
    ) {
      throw new Error("cycle setup");
    }
    await cycle.extensia.stop();
    const cycleOwner = cycle.backing.resources.get(cycle.firstID)!;
    cycle.backing.resources.set(cycle.firstID, {
      ...cycleOwner,
      assets: cycleOwner.assets.map((asset) => ({
        ...asset,
        derived_from:
          asset.id === left.value.asset!.id
            ? right.value.asset!.id
            : left.value.asset!.id,
      })),
    });
    const cycleRestart = createExtensia({
      storage: {
        driver: defineFullResourceDriver(
          createDeterministicFullResourceDriver(cycle.backing).adapter,
        ),
      },
    });
    await expect(cycleRestart.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "START_FAILED" },
    });
  });

  it("keeps internal metadata staged-only and blocks primary/reassign/Resource delete", async () => {
    const { driver, extensia, firstID, secondID } = await fixture();
    const created = await extensia.storage()!.createAsset(firstID, {
      data: null,
      extension: "bin",
      kind: "internal",
      mime: "application/octet-stream",
      role: "original",
      type: "binary",
    });
    expect(created).toMatchObject({
      ok: true,
      value: {
        asset: {
          is_external: false,
          is_on_uploading: true,
          is_primary: false,
          url: null,
        },
      },
    });
    if (!created.ok || created.value.asset === null) throw new Error("create");
    const assetID = created.value.asset.id;
    expect(driver.inspect().asset_payload_states).toMatchObject([
      {
        asset_id: assetID,
        committed: false,
        active_upload: { replaces_committed: false },
      },
    ]);
    await expect(
      extensia.storage()!.setPrimaryAsset(firstID, assetID),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ASSET_NOT_READY" },
    });
    await expect(
      extensia.storage()!.reassignAsset(firstID, assetID, secondID),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ASSET_UPLOAD_ALREADY_ACTIVE" },
    });
    await expect(
      extensia.storage()!.deleteResource(firstID),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_ASSET_UPLOAD_ACTIVE" },
    });
    await expect(
      extensia.storage()!.deleteAsset(firstID, assetID),
    ).resolves.toMatchObject({ ok: true, value: { asset: null } });
    expect(driver.inspect().asset_payload_states).toEqual([]);
    await expect(
      extensia.storage()!.deleteResource(firstID),
    ).resolves.toMatchObject({ ok: true });
    await extensia.stop();
  });

  it("supports ready internal primary, reassignment and payload delete semantics", async () => {
    const { backing, extensia, firstID, secondID } = await fixture();
    const created = await extensia.storage()!.createAsset(firstID, {
      extension: "bin",
      kind: "internal",
      mime: "application/octet-stream",
      role: "ready",
      type: "binary",
    });
    if (!created.ok || created.value.asset === null) throw new Error("create");
    const assetID = created.value.asset.id;
    await extensia.stop();
    const owner = backing.resources.get(firstID)!;
    backing.resources.set(
      firstID,
      buildResourceSnapshot({
        ...owner,
        assets: owner.assets.map((asset) =>
          asset.id === assetID ? { ...asset, is_on_uploading: false } : asset,
        ),
      }),
    );
    backing.assetPayloadStates.set(assetID, {
      active_upload: null,
      asset_id: assetID,
      committed: true,
    });

    const active = await restart(backing);
    await expect(
      active.extensia.storage()!.setPrimaryAsset(firstID, assetID),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      active.extensia.storage()!.reassignAsset(firstID, assetID, secondID),
    ).resolves.toMatchObject({
      ok: true,
      value: { asset: { is_primary: false } },
    });
    await expect(
      active.extensia.storage()!.deleteAsset(secondID, assetID),
    ).resolves.toMatchObject({ ok: true, value: { asset: null } });
    expect(active.driver.inspect().journal.at(-1)).toMatchObject({
      asset_changes: [
        {
          asset_id: assetID,
          payload_action: { kind: "payload.delete" },
          state_before: "ready",
          state_after: null,
        },
      ],
    });
    expect(active.driver.inspect().asset_payload_states).toEqual([]);
    await active.extensia.stop();
  });

  it("treats replacement upload as ready but active and deletes it atomically", async () => {
    const { backing, extensia, firstID, secondID } = await fixture();
    const created = await extensia.storage()!.createAsset(firstID, {
      extension: "bin",
      kind: "internal",
      mime: "application/octet-stream",
      role: "replacement",
      type: "binary",
    });
    if (!created.ok || created.value.asset === null) throw new Error("create");
    const assetID = created.value.asset.id;
    const initial = backing.assetPayloadStates.get(assetID)!;
    const uploadID = initial.active_upload!.upload_id;
    await extensia.stop();
    backing.assetPayloadStates.set(assetID, {
      active_upload: { replaces_committed: true, upload_id: uploadID },
      asset_id: assetID,
      committed: true,
    });

    const active = await restart(backing);
    await expect(
      active.extensia.storage()!.setPrimaryAsset(firstID, assetID),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      active.extensia.storage()!.reassignAsset(firstID, assetID, secondID),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ASSET_UPLOAD_ALREADY_ACTIVE" },
    });
    await expect(
      active.extensia.storage()!.deleteAsset(firstID, assetID),
    ).resolves.toMatchObject({ ok: true });
    expect(active.driver.inspect().journal.at(-1)).toMatchObject({
      asset_changes: [
        {
          asset_id: assetID,
          payload_action: {
            kind: "payload.delete-and-generation.discard",
            upload_id: uploadID,
          },
          state_before: "replacement-uploading",
          state_after: null,
        },
      ],
    });
    expect(active.driver.inspect().asset_payload_states).toEqual([]);
    await active.extensia.stop();
  });

  it("allows Resource delete with external Assets and preserves a valid tombstone", async () => {
    const { backing, extensia, firstID } = await fixture();
    await expect(
      extensia.storage()!.createAsset(firstID, externalInput),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      extensia.storage()!.deleteResource(firstID),
    ).resolves.toMatchObject({ ok: true });
    await extensia.stop();

    const restarted = createExtensia({
      storage: {
        driver: defineFullResourceDriver(
          createDeterministicFullResourceDriver(backing).adapter,
        ),
      },
    });
    await expect(restarted.start()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await restarted.stop();
  });

  it("rejects explicit undefined optional create fields", async () => {
    const { extensia, firstID } = await fixture();
    for (const [input, code] of [
      [{ ...externalInput, data: undefined }, "ASSET_DATA_INVALID"],
      [{ ...externalInput, derived_from: undefined }, "ASSET_LINEAGE_INVALID"],
      [{ ...externalInput, is_primary: undefined }, "ASSET_INPUT_INVALID"],
    ]) {
      await expect(
        extensia.storage()!.createAsset(firstID, input as never),
      ).resolves.toMatchObject({ ok: false, error: { code } });
    }
    await extensia.stop();
  });

  it("maps hostile nested data traps to ASSET_DATA_INVALID", async () => {
    const { extensia, firstID } = await fixture();
    const hostileData = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("hostile data");
        },
      },
    );
    await expect(
      extensia.storage()!.createAsset(firstID, {
        ...externalInput,
        data: hostileData as never,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ASSET_DATA_INVALID" },
    });
    const created = await extensia
      .storage()!
      .createAsset(firstID, externalInput);
    if (!created.ok || created.value.asset === null) throw new Error("create");
    await expect(
      extensia.storage()!.updateAsset(firstID, created.value.asset.id, {
        data: hostileData as never,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ASSET_DATA_INVALID" },
    });
    await extensia.stop();
  });

  it("rejects readonly Asset writes before inspecting hostile input", async () => {
    let inspected = false;
    const extensia = createExtensia({
      storage: {
        driver: {
          mode: "readonly",
          async open() {},
          async close() {},
          async *listResources() {},
        },
      },
    });
    await extensia.start();
    const hostile = Object.defineProperty({}, "kind", {
      enumerable: true,
      get() {
        inspected = true;
        throw new Error("must not inspect");
      },
    });
    await expect(
      extensia.storage()!.createAsset("invalid", hostile as never),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "STORAGE_READONLY" },
    });
    expect(inspected).toBe(false);
    await extensia.stop();
  });

  it("fails generic readonly startup closed for a storage-wide duplicate Asset ID", async () => {
    const asset = buildAssetSnapshot({
      created_at: 1,
      data: null,
      derived_from: null,
      extension: "jpg",
      id: "30000000-0000-4000-8000-000000000001",
      is_external: true,
      is_on_uploading: false,
      is_primary: false,
      mime: "image/jpeg",
      role: "source",
      type: "image",
      updated_at: 1,
      url: "https://example.test/source.jpg",
    });
    const resources = [
      "10000000-0000-4000-8000-000000000001",
      "20000000-0000-4000-8000-000000000001",
    ].map((id) =>
      buildResourceSnapshot({
        assets: [asset],
        data: {
          created_at: 1,
          description: null,
          hidden: false,
          id,
          is_deleted: false,
          locked: false,
          order_index: 0,
          parent_id: null,
          title: id,
          updated_at: 1,
        },
        kv: {},
        marks: [],
      }),
    );
    const extensia = createExtensia({
      storage: {
        driver: {
          mode: "readonly",
          async open() {},
          async close() {},
          async *listResources() {
            yield* resources;
          },
        },
      },
    });
    await expect(extensia.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "START_FAILED" },
    });
    expect(extensia.getState()).toBe("failed");
    await extensia.stop();
  });

  it("requires safe readiness proof for an uploading internal lineage target in generic readonly mode", async () => {
    const targetID = "30000000-0000-4000-8000-000000000002";
    const resource = buildResourceSnapshot({
      assets: [
        buildAssetSnapshot({
          created_at: 1,
          data: null,
          derived_from: null,
          extension: "bin",
          id: targetID,
          is_external: false,
          is_on_uploading: true,
          is_primary: false,
          mime: "application/octet-stream",
          role: "target",
          type: "binary",
          updated_at: 1,
          url: null,
        }),
        buildAssetSnapshot({
          created_at: 1,
          data: null,
          derived_from: targetID,
          extension: "jpg",
          id: "30000000-0000-4000-8000-000000000003",
          is_external: true,
          is_on_uploading: false,
          is_primary: false,
          mime: "image/jpeg",
          role: "derivative",
          type: "image",
          updated_at: 1,
          url: "https://example.test/derivative.jpg",
        }),
      ],
      data: {
        created_at: 1,
        description: null,
        hidden: false,
        id: "10000000-0000-4000-8000-000000000003",
        is_deleted: false,
        locked: false,
        order_index: 0,
        parent_id: null,
        title: "readiness",
        updated_at: 1,
      },
      kv: {},
      marks: [],
    });
    function readonly(withUntrustedProof: boolean) {
      return createExtensia({
        storage: {
          driver: {
            mode: "readonly" as const,
            async open() {},
            async close() {},
            async *listResources() {
              yield resource;
            },
            ...(withUntrustedProof
              ? {
                  async *listAssetReadiness() {
                    yield {
                      asset_id: targetID,
                      has_committed_representation: true,
                    };
                  },
                }
              : {}),
          },
        },
      });
    }
    const ambiguous = readonly(false);
    await expect(ambiguous.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "START_FAILED" },
    });
    await ambiguous.stop();

    const untrustedReplacementProof = readonly(true);
    await expect(untrustedReplacementProof.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "START_FAILED" },
    });
    await untrustedReplacementProof.stop();
  });

  it("applies capability and identifier precedence before command input", async () => {
    const { extensia, firstID } = await fixture();
    let inspected = false;
    const hostile = Object.defineProperty({}, "role", {
      enumerable: true,
      get() {
        inspected = true;
        throw new Error("must not inspect");
      },
    });
    await expect(
      extensia.storage()!.updateAsset("invalid", "invalid", hostile as never),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_RESOURCE_ID" },
    });
    await expect(
      extensia.storage()!.updateAsset(firstID, "invalid", hostile as never),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_ASSET_ID" },
    });
    expect(inspected).toBe(false);
    await extensia.stop();
  });

  it("fails startup closed for duplicate IDs and invalid generation state", async () => {
    const duplicate = await fixture();
    const external = await duplicate.extensia
      .storage()!
      .createAsset(duplicate.firstID, externalInput);
    if (!external.ok || external.value.asset === null)
      throw new Error("create");
    await duplicate.extensia.stop();
    const second = duplicate.backing.resources.get(duplicate.secondID)!;
    duplicate.backing.resources.set(
      duplicate.secondID,
      buildResourceSnapshot({
        ...second,
        assets: [external.value.asset],
        data: {
          ...second.data,
          updated_at: external.value.asset.updated_at,
        },
      }),
    );
    const duplicateRestart = createExtensia({
      storage: {
        driver: defineFullResourceDriver(
          createDeterministicFullResourceDriver(duplicate.backing).adapter,
        ),
      },
    });
    await expect(duplicateRestart.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "START_FAILED" },
    });

    const missingGeneration = await fixture();
    const internal = await missingGeneration.extensia
      .storage()!
      .createAsset(missingGeneration.firstID, {
        extension: null,
        kind: "internal",
        mime: null,
        role: "original",
        type: "binary",
      });
    if (!internal.ok || internal.value.asset === null)
      throw new Error("create");
    await missingGeneration.extensia.stop();
    missingGeneration.backing.assetPayloadStates.delete(
      internal.value.asset.id,
    );
    const generationRestart = createExtensia({
      storage: {
        driver: defineFullResourceDriver(
          createDeterministicFullResourceDriver(missingGeneration.backing)
            .adapter,
        ),
      },
    });
    await expect(generationRestart.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "START_FAILED" },
    });

    const duplicateUpload = await fixture();
    const firstInternal = await duplicateUpload.extensia
      .storage()!
      .createAsset(duplicateUpload.firstID, {
        extension: null,
        kind: "internal",
        mime: null,
        role: "first",
        type: "binary",
      });
    const secondInternal = await duplicateUpload.extensia
      .storage()!
      .createAsset(duplicateUpload.secondID, {
        extension: null,
        kind: "internal",
        mime: null,
        role: "second",
        type: "binary",
      });
    if (
      !firstInternal.ok ||
      firstInternal.value.asset === null ||
      !secondInternal.ok ||
      secondInternal.value.asset === null
    ) {
      throw new Error("create");
    }
    await duplicateUpload.extensia.stop();
    const firstPayload = duplicateUpload.backing.assetPayloadStates.get(
      firstInternal.value.asset.id,
    )!;
    duplicateUpload.backing.assetPayloadStates.set(
      secondInternal.value.asset.id,
      {
        ...duplicateUpload.backing.assetPayloadStates.get(
          secondInternal.value.asset.id,
        )!,
        active_upload: { ...firstPayload.active_upload! },
      },
    );
    const duplicateUploadRestart = createExtensia({
      storage: {
        driver: defineFullResourceDriver(
          createDeterministicFullResourceDriver(duplicateUpload.backing)
            .adapter,
        ),
      },
    });
    await expect(duplicateUploadRestart.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "START_FAILED" },
    });
  });

  it("rolls back metadata/generation/journal together and serializes concurrent updates", async () => {
    const { driver, extensia, firstID } = await fixture();
    driver.failNext("transaction.commit.before");
    await expect(
      extensia.storage()!.createAsset(firstID, {
        extension: null,
        kind: "internal",
        mime: null,
        role: "failed",
        type: "binary",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "STORAGE_WRITE_FAILED" },
    });
    expect(driver.inspect().asset_payload_states).toEqual([]);
    expect(driver.inspect().journal).toHaveLength(2);
    await expect(extensia.query()!.getResource(firstID)).resolves.toMatchObject(
      {
        ok: true,
        value: { assets: [] },
      },
    );

    const created = await extensia
      .storage()!
      .createAsset(firstID, externalInput);
    if (!created.ok || created.value.asset === null) throw new Error("create");
    const [left, right] = await Promise.all([
      extensia
        .storage()!
        .updateAsset(firstID, created.value.asset.id, { role: "left" }),
      extensia
        .storage()!
        .updateAsset(firstID, created.value.asset.id, { role: "right" }),
    ]);
    expect(left.ok).toBe(true);
    expect(right.ok).toBe(true);
    const read = await extensia.query()!.getResource(firstID);
    expect(read).toMatchObject({
      ok: true,
      value: { assets: [{ role: "right" }] },
    });
    expect(
      driver
        .inspect()
        .journal.slice(-3)
        .map((entry) => entry.type),
    ).toEqual(["asset.create", "asset.update", "asset.update"]);
    await extensia.stop();
  });
});
