import { describe, expect, it } from "vitest";

import {
  canonicalizeAssetURL,
  isAssetClassifier,
  isAssetExtension,
  isAssetMime,
  parseAssetData,
} from "./asset-metadata.js";

function nested(depth: number): object {
  let value: object = {};
  for (let index = 1; index < depth; index += 1) value = { value };
  return value;
}

function nestedWithLeaf(containers: number): object {
  let value: unknown = 0;
  for (let index = 0; index < containers; index += 1) value = { value };
  return value as object;
}

describe("Asset metadata validators", () => {
  it("implements exact classifier, MIME, extension and URL tables", () => {
    expect(isAssetClassifier("x")).toBe(true);
    expect(isAssetClassifier("x".repeat(128))).toBe(true);
    expect(isAssetClassifier("")).toBe(false);
    expect(isAssetClassifier("   ")).toBe(false);
    expect(isAssetClassifier("x".repeat(129))).toBe(false);

    expect(isAssetMime(null)).toBe(true);
    expect(isAssetMime("image/jpeg")).toBe(true);
    expect(isAssetMime("application/vnd.example+json")).toBe(true);
    for (const value of ["Image/JPEG", "image", "image/jpeg; q=1", "a/ b"]) {
      expect(isAssetMime(value)).toBe(false);
    }

    expect(isAssetExtension(null)).toBe(true);
    expect(isAssetExtension("a")).toBe(true);
    expect(isAssetExtension("tar_gz-1")).toBe(true);
    expect(isAssetExtension("a".repeat(32))).toBe(true);
    for (const value of ["", ".jpg", "JPG", "a/b", "a".repeat(33)]) {
      expect(isAssetExtension(value)).toBe(false);
    }

    expect(canonicalizeAssetURL("HTTPS://Example.COM:443/a/../b?q=1#x")).toBe(
      "https://example.com/b?q=1#x",
    );
    expect(canonicalizeAssetURL("http://user:pass@example.com/")).toBeNull();
    expect(canonicalizeAssetURL("file:///tmp/private")).toBeNull();
    expect(canonicalizeAssetURL("x".repeat(4097))).toBeNull();
  });

  it("enforces depth, containers, strings, nodes and canonical UTF-8 limits", () => {
    expect(parseAssetData(nested(16))).toBeDefined();
    expect(parseAssetData(nested(17))).toBeUndefined();
    expect(parseAssetData(nestedWithLeaf(16))).toBeDefined();
    expect(parseAssetData(nestedWithLeaf(17))).toBeUndefined();
    expect(
      parseAssetData({ values: Array.from({ length: 1024 }, () => 0) }),
    ).toBeDefined();
    expect(
      parseAssetData({ values: Array.from({ length: 1025 }, () => 0) }),
    ).toBeUndefined();
    expect(parseAssetData({ value: "x".repeat(16_384) })).toBeDefined();
    expect(parseAssetData({ value: "x".repeat(16_385) })).toBeUndefined();

    const keys256 = Object.fromEntries(
      Array.from({ length: 256 }, (_, index) => [`k${index}`, index]),
    );
    const keys257 = { ...keys256, overflow: true };
    expect(parseAssetData(keys256)).toBeDefined();
    expect(parseAssetData(keys257)).toBeUndefined();

    const nodes4096 = Object.fromEntries(
      Array.from({ length: 256 }, (_, index) => [
        `k${index}`,
        Array.from({ length: index === 0 ? 14 : 15 }, () => null),
      ]),
    );
    const nodes4097 = {
      ...nodes4096,
      k0: Array.from({ length: 15 }, () => null),
    };
    expect(parseAssetData(nodes4096)).toBeDefined();
    expect(parseAssetData(nodes4097)).toBeUndefined();

    expect(parseAssetData({ one: "😀".repeat(8192) })).toBeDefined();
    expect(
      parseAssetData({ one: "😀".repeat(8192), two: "😀".repeat(8192) }),
    ).toBeUndefined();
  });

  it("rejects hostile descriptors, sparse arrays, cycles and exotic values", () => {
    let inspected = false;
    const accessor = Object.defineProperty({}, "value", {
      enumerable: true,
      get() {
        inspected = true;
        return 1;
      },
    });
    expect(parseAssetData(accessor)).toBeUndefined();
    expect(inspected).toBe(false);

    const sparse = new Array(1);
    expect(parseAssetData({ sparse })).toBeUndefined();
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(parseAssetData(cyclic)).toBeUndefined();
    expect(parseAssetData({ value: Number.NaN })).toBeUndefined();
    expect(parseAssetData(Object.create({ inherited: true }))).toBeUndefined();
    expect(
      parseAssetData(
        new Proxy(
          {},
          {
            ownKeys() {
              throw new Error("hostile data");
            },
          },
        ),
      ),
    ).toBeUndefined();
  });
});
