import { describe, expect, it } from "vitest";

import type { JSONObject } from "./json.js";
import { parseIDString, parseTimestamp } from "./scalars.js";
import {
  buildAssetSnapshot,
  buildMarkSnapshot,
  buildResourceSnapshot,
  buildResourceTreeViewSnapshot,
  isAssetSnapshot,
  isMarkSnapshot,
  isResourceKVSnapshot,
  isResourceSnapshot,
  isResourceTreeViewSnapshot,
  type AssetSnapshot,
  type MarkSnapshot,
  type ResourceChildRefSnapshot,
  type ResourceSnapshot,
} from "./snapshots.js";

const RESOURCE_ID = parseIDString("550e8400-e29b-41d4-a716-446655440000");
const ASSET_ID = parseIDString("8f14e45f-ea6f-4d7a-923b-966f7356c001");
const SECOND_ASSET_ID = parseIDString("9f14e45f-ea6f-4d7a-823b-966f7356c002");
const CHILD_ID = parseIDString("af14e45f-ea6f-4d7a-923b-966f7356c003");
const NOW = parseTimestamp(1_784_294_400_000);

function createAsset(overrides: Partial<AssetSnapshot> = {}): AssetSnapshot {
  return {
    created_at: NOW,
    data: null,
    derived_from: null,
    extension: null,
    id: ASSET_ID,
    is_external: false,
    is_on_uploading: false,
    is_primary: false,
    mime: null,
    role: "original",
    type: "image",
    updated_at: NOW,
    url: null,
    ...overrides,
  };
}

function createResource(
  overrides: Partial<ResourceSnapshot> = {},
): ResourceSnapshot {
  return {
    assets: [],
    data: {
      created_at: NOW,
      description: null,
      hidden: false,
      id: RESOURCE_ID,
      is_deleted: false,
      locked: false,
      order_index: 0,
      parent_id: null,
      title: "Resource",
      updated_at: NOW,
    },
    kv: {},
    marks: [],
    ...overrides,
  };
}

describe("pure domain validators", () => {
  it("validates internal and external Asset combinations", () => {
    expect(isAssetSnapshot(createAsset())).toBe(true);
    expect(isAssetSnapshot(createAsset({ is_on_uploading: true }))).toBe(true);
    expect(
      isAssetSnapshot(
        createAsset({ is_external: true, url: "", is_on_uploading: false }),
      ),
    ).toBe(false);
    expect(
      isAssetSnapshot(
        createAsset({
          is_external: true,
          url: "https://example.test/file",
          is_on_uploading: false,
        }),
      ),
    ).toBe(true);

    expect(isAssetSnapshot(createAsset({ url: "file://unexpected" }))).toBe(
      false,
    );
    expect(isAssetSnapshot(createAsset({ is_external: true, url: null }))).toBe(
      false,
    );
    expect(
      isAssetSnapshot(
        createAsset({
          is_external: true,
          is_on_uploading: true,
          url: "https://example.test/file",
        }),
      ),
    ).toBe(false);
  });

  it("validates Mark int32 values without inventing string normalization", () => {
    expect(isMarkSnapshot({ name: "", type: "", value: null })).toBe(true);
    expect(
      isMarkSnapshot({ name: "rank", type: "score", value: -2_147_483_648 }),
    ).toBe(true);
    expect(
      isMarkSnapshot({ name: "rank", type: "score", value: 2_147_483_647 }),
    ).toBe(true);
    expect(isMarkSnapshot({ name: "rank", type: "score", value: 1.5 })).toBe(
      false,
    );
    expect(
      isMarkSnapshot({ name: "rank", type: "score", value: 2_147_483_648 }),
    ).toBe(false);
  });

  it("validates KV as namespace-key-string records", () => {
    expect(isResourceKVSnapshot({ "": { "": "allowed" } })).toBe(true);
    expect(isResourceKVSnapshot({ app: { count: 1 } })).toBe(false);
    expect(isResourceKVSnapshot({ app: ["value"] })).toBe(false);
  });

  it("enforces only accepted local aggregate invariants", () => {
    const primary = createAsset({ is_primary: true });
    const secondPrimary = createAsset({
      id: SECOND_ASSET_ID,
      is_primary: true,
    });

    expect(isResourceSnapshot(createResource({ assets: [primary] }))).toBe(
      true,
    );
    expect(
      isResourceSnapshot(createResource({ assets: [primary, secondPrimary] })),
    ).toBe(false);
    expect(
      isResourceSnapshot(createResource({ assets: [primary, { ...primary }] })),
    ).toBe(false);

    const mark: MarkSnapshot = { name: "rank", type: "score", value: 1 };
    expect(isResourceSnapshot(createResource({ marks: [mark] }))).toBe(true);
    expect(
      isResourceSnapshot(
        createResource({ marks: [mark, { ...mark, value: 2 }] }),
      ),
    ).toBe(false);
  });

  it("keeps open order-index policy unresolved while requiring JSON-safe numbers", () => {
    expect(
      isResourceSnapshot(
        createResource({
          data: { ...createResource().data, order_index: 1.5 },
        }),
      ),
    ).toBe(true);
    expect(
      isResourceSnapshot(
        createResource({
          data: { ...createResource().data, order_index: Number.NaN },
        }),
      ),
    ).toBe(false);
  });

  it("rejects non-canonical aggregate arrays without throwing", () => {
    const sparseAssets = new Array<AssetSnapshot>(1);
    const sparseMarks = new Array<MarkSnapshot>(1);
    const sparseChildren = new Array<ResourceChildRefSnapshot>(1);

    const accessorAssets: AssetSnapshot[] = [];
    Object.defineProperty(accessorAssets, "0", {
      configurable: true,
      enumerable: true,
      get: () => createAsset(),
    });
    accessorAssets.length = 1;

    const extraKeyAssets = [createAsset()] as AssetSnapshot[] & {
      extra?: string;
    };
    extraKeyAssets.extra = "not-json-array-data";

    const symbolKeyAssets = [createAsset()] as AssetSnapshot[] & {
      [key: symbol]: string;
    };
    symbolKeyAssets[Symbol("extra")] = "not-json-array-data";

    for (const assets of [
      sparseAssets,
      accessorAssets,
      extraKeyAssets,
      symbolKeyAssets,
    ]) {
      expect(() =>
        isResourceSnapshot(createResource({ assets })),
      ).not.toThrow();
      expect(isResourceSnapshot(createResource({ assets }))).toBe(false);
    }

    expect(isResourceSnapshot(createResource({ marks: sparseMarks }))).toBe(
      false,
    );
    expect(
      isResourceTreeViewSnapshot({
        children: sparseChildren,
        resource: createResource(),
      }),
    ).toBe(false);
  });
});

describe("detached snapshot builders", () => {
  it("detaches nested arrays, records and Asset.data without runtime freeze", () => {
    const assetData = { nested: { labels: ["one"] } };
    const kv = { app: { key: "value" } };
    const assets = [createAsset({ data: assetData as JSONObject })];
    const marks = [{ name: "rank", type: "score", value: 1 }];
    const input = createResource({ assets, kv, marks });
    const snapshot = buildResourceSnapshot(input);

    assetData.nested.labels[0] = "changed";
    assetData.nested.labels.push("two");
    kv.app.key = "changed";
    assets.push(createAsset({ id: SECOND_ASSET_ID }));
    marks[0]!.value = 2;

    expect(snapshot.assets).toHaveLength(1);
    expect(snapshot.assets[0]!.data).toEqual({ nested: { labels: ["one"] } });
    expect(snapshot.kv).toEqual({ app: { key: "value" } });
    expect(snapshot.marks).toEqual([{ name: "rank", type: "score", value: 1 }]);
    expect(Object.isFrozen(snapshot)).toBe(false);
    expect(Object.isFrozen(snapshot.assets)).toBe(false);
  });

  it("detaches tree projection children and nested resource", () => {
    const children = [{ id: CHILD_ID, order_index: 1 }];
    const input = { children, resource: createResource() };
    const snapshot = buildResourceTreeViewSnapshot(input);

    children[0]!.order_index = 2;
    children.push({ id: RESOURCE_ID, order_index: 3 });

    expect(isResourceTreeViewSnapshot(snapshot)).toBe(true);
    expect(snapshot.children).toEqual([{ id: CHILD_ID, order_index: 1 }]);
  });

  it("builders reject values that violate their runtime contract", () => {
    expect(() =>
      buildAssetSnapshot(createAsset({ is_external: true, url: null })),
    ).toThrow(TypeError);
    expect(() =>
      buildMarkSnapshot({ name: "rank", type: "score", value: 1.5 }),
    ).toThrow(TypeError);
    expect(() =>
      buildResourceSnapshot(
        createResource({
          marks: [
            { name: "rank", type: "score", value: 1 },
            { name: "rank", type: "score", value: 2 },
          ],
        }),
      ),
    ).toThrow(TypeError);
  });
});
