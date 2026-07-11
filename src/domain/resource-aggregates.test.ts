import { describe, expect, it } from "vitest";
import {
  parseKVNamespace,
  parseMarks,
  replaceKV,
} from "./resource-aggregates.js";

describe("exact Resource aggregate parsing", () => {
  it("canonicalizes Marks and enforces identities and int32", () => {
    expect(
      parseMarks([
        { type: "z", name: "a", value: null },
        { type: "a", name: "z", value: -2_147_483_648 },
      ]),
    ).toEqual([
      { type: "a", name: "z", value: -2_147_483_648 },
      { type: "z", name: "a", value: null },
    ]);
    expect(
      parseMarks([
        { type: "a", name: "b", value: 1 },
        { type: "a", name: "b", value: 2 },
      ]),
    ).toBeNull();
    expect(
      parseMarks([{ type: "a", name: "b", value: 2_147_483_648 }]),
    ).toBeNull();
  });
  it("rejects sparse/accessor/symbol/extra Mark shapes", () => {
    const sparse = new Array(1);
    const accessor = [
      {
        type: "a",
        name: "b",
        get value() {
          return 1;
        },
      },
    ];
    const symbol = Object.assign(
      { type: "a", name: "b", value: 1 },
      { [Symbol()]: true },
    );
    expect(parseMarks(sparse)).toBeNull();
    expect(parseMarks(accessor)).toBeNull();
    expect(parseMarks([symbol])).toBeNull();
    const lying = new Proxy(
      { type: 1, name: "b", value: 1 },
      {
        get(target, key) {
          return key === "type" ? "a" : Reflect.get(target, key);
        },
      },
    );
    expect(parseMarks([lying])).toBeNull();
  });
  it("parses exact KV records and checks resulting aggregate limits", () => {
    expect(
      parseKVNamespace(Object.assign(Object.create(null), { b: "2", a: "1" })),
    ).toEqual({ a: "1", b: "2" });
    expect(
      parseKVNamespace({
        get a() {
          return "x";
        },
      }),
    ).toBeNull();
    expect(parseKVNamespace({ ["x".repeat(129)]: "v" })).toBeNull();
    const lying = new Proxy(
      { a: 1 },
      {
        get() {
          return "accepted-only-by-get";
        },
      },
    );
    expect(parseKVNamespace(lying)).toBeNull();
    expect(replaceKV({}, "ns", { key: "v" })).toEqual({ ns: { key: "v" } });
    expect(replaceKV({ ns: { key: "v" } }, "ns", {})).toEqual({});
    expect(
      replaceKV(
        {
          stale: Object.fromEntries(
            Array.from({ length: 257 }, (_, i) => [String(i), "v"]),
          ),
        },
        "ns",
        { key: "v" },
      ),
    ).toBeNull();
  });
  it("enforces exact boundary values", () => {
    expect(
      parseMarks(
        Array.from({ length: 256 }, (_, i) => ({
          type: "t",
          name: String(i),
          value: 2_147_483_647,
        })),
      ),
    ).not.toBeNull();
    expect(
      parseMarks(
        Array.from({ length: 257 }, (_, i) => ({
          type: "t",
          name: String(i),
          value: 0,
        })),
      ),
    ).toBeNull();
    expect(
      parseMarks([{ type: "x".repeat(128), name: "n", value: null }]),
    ).not.toBeNull();
    expect(
      parseMarks([{ type: "x".repeat(129), name: "n", value: null }]),
    ).toBeNull();
    expect(parseKVNamespace({ key: "x".repeat(16_384) })).not.toBeNull();
    expect(parseKVNamespace({ key: "x".repeat(16_385) })).toBeNull();
  });
});
