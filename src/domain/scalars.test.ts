import { describe, expect, it } from "vitest";

import {
  generateIDString,
  isIDString,
  isTimestamp,
  MAX_TIMESTAMP,
  MIN_TIMESTAMP,
  parseIDString,
  parseTimestamp,
  timestampFromDate,
  timestampToDate,
  type Timestamp,
} from "./scalars.js";

describe("IDString", () => {
  it("parses UUID v4 in any hex case into its lowercase canonical form", () => {
    expect(parseIDString("550E8400-E29B-41D4-A716-446655440000")).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(parseIDString("550e8400-E29B-41d4-a716-446655440000")).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it.each([
    "550e8400-e29b-11d4-a716-446655440000",
    "550e8400e29b41d4a716446655440000",
    "{550e8400-e29b-41d4-a716-446655440000}",
    "550e8400-e29b-41d4-7716-446655440000",
    "not-an-id",
    42,
    null,
  ])("rejects non-v4 or non-hyphenated input %#", (value) => {
    expect(() => parseIDString(value)).toThrow(TypeError);
  });

  it("validates only the canonical lowercase representation", () => {
    expect(isIDString("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isIDString("550E8400-E29B-41D4-A716-446655440000")).toBe(false);
  });

  it("generates canonical UUID v4 values", () => {
    const generated = Array.from({ length: 128 }, generateIDString);

    expect(generated.every(isIDString)).toBe(true);
    expect(new Set(generated)).toHaveLength(generated.length);
  });
});

describe("Timestamp", () => {
  it.each([MIN_TIMESTAMP, -1, 0, 1, MAX_TIMESTAMP])(
    "accepts safe epoch-millisecond boundary %s",
    (value) => {
      expect(parseTimestamp(value)).toBe(value);
      expect(isTimestamp(value)).toBe(true);
    },
  );

  it.each([
    MIN_TIMESTAMP - 1,
    MAX_TIMESTAMP + 1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "0",
    new Date(0),
    null,
  ])("rejects invalid timestamp input %#", (value) => {
    expect(isTimestamp(value)).toBe(false);
    expect(() => parseTimestamp(value)).toThrow(TypeError);
  });

  it("converts valid Date values explicitly in both directions", () => {
    const source = new Date("2026-07-10T12:34:56.789Z");
    const timestamp = timestampFromDate(source);
    const restored = timestampToDate(timestamp);

    expect(timestamp).toBe(source.getTime());
    expect(restored).not.toBe(source);
    expect(restored.getTime()).toBe(source.getTime());
  });

  it("rejects invalid Date values and revalidates branded runtime input", () => {
    expect(() => timestampFromDate(new Date(Number.NaN))).toThrow(TypeError);
    expect(() => timestampFromDate({} as Date)).toThrow(TypeError);
    expect(() => timestampToDate((MAX_TIMESTAMP + 1) as Timestamp)).toThrow(
      TypeError,
    );
  });
});
