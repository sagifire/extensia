import { describe, expect, it } from "vitest";

import {
  assertJSONObject,
  assertJSONValue,
  cloneJSONObject,
  cloneJSONValue,
  isJSONObject,
  isJSONValue,
} from "./json.js";

describe("JSON-safe boundary", () => {
  it("accepts recursive finite JSON values with stable roundtrip semantics", () => {
    const value = {
      boolean: true,
      nested: [{ count: 1.25, nullable: null }, "text"],
    };

    expect(isJSONValue(value)).toBe(true);
    expect(JSON.parse(JSON.stringify(value))).toEqual(value);
    expect(() => assertJSONValue(value)).not.toThrow();
    expect(() => assertJSONObject(value)).not.toThrow();
  });

  it.each([
    undefined,
    new Date(0),
    1n,
    () => undefined,
    Symbol("value"),
    Number.NaN,
    Number.POSITIVE_INFINITY,
    { nested: undefined },
    { nested: [Number.NEGATIVE_INFINITY] },
  ])("rejects non-JSON values recursively %#", (value) => {
    expect(isJSONValue(value)).toBe(false);
    expect(() => assertJSONValue(value)).toThrow(TypeError);
  });

  it("rejects cycles, sparse arrays, symbol keys and non-data properties", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic["self"] = cyclic;

    const sparse = new Array<unknown>(1);
    const symbolKeyed = { value: true, [Symbol("hidden")]: false };
    const accessor = {};
    Object.defineProperty(accessor, "value", {
      enumerable: true,
      get: () => true,
    });
    const nonEnumerable = {};
    Object.defineProperty(nonEnumerable, "value", { value: true });

    for (const value of [
      cyclic,
      sparse,
      symbolKeyed,
      accessor,
      nonEnumerable,
    ]) {
      expect(isJSONValue(value)).toBe(false);
    }
  });

  it("allows repeated aliases but returns a fully detached clone", () => {
    const shared = { labels: ["one"] };
    const source = { first: shared, second: shared };
    const clone = cloneJSONValue(source);

    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);

    shared.labels[0] = "changed";
    shared.labels.push("two");

    expect(clone).toEqual({
      first: { labels: ["one"] },
      second: { labels: ["one"] },
    });
  });

  it("clones object keys that are special to Object.prototype safely", () => {
    const source: Record<string, unknown> = {};
    Object.defineProperty(source, "__proto__", {
      configurable: true,
      enumerable: true,
      value: { safe: true },
      writable: true,
    });

    const clone = cloneJSONObject(source);

    expect(Object.getPrototypeOf(clone)).toBe(Object.prototype);
    expect(clone["__proto__"]).toEqual({ safe: true });
    expect(Object.hasOwn(clone, "__proto__")).toBe(true);
  });

  it("distinguishes JSON objects from arrays and primitives", () => {
    expect(isJSONObject({})).toBe(true);
    expect(isJSONObject([])).toBe(false);
    expect(isJSONObject(null)).toBe(false);
    expect(isJSONObject("text")).toBe(false);
    expect(isJSONObject(1)).toBe(false);
    expect(() => assertJSONObject(true)).toThrow(TypeError);
    expect(() => cloneJSONObject([])).toThrow(TypeError);
  });
});
