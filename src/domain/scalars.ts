import { randomUUID } from "node:crypto";

declare const idStringBrand: unique symbol;
declare const timestampBrand: unique symbol;

export type IDString = string & { readonly [idStringBrand]: "IDString" };
export type Timestamp = number & { readonly [timestampBrand]: "Timestamp" };

export const MIN_TIMESTAMP: number = -8_640_000_000_000_000;
export const MAX_TIMESTAMP: number = 8_640_000_000_000_000;

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CANONICAL_UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isIDString(value: unknown): value is IDString {
  return typeof value === "string" && CANONICAL_UUID_V4_PATTERN.test(value);
}

export function parseIDString(value: unknown): IDString {
  if (typeof value !== "string" || !UUID_V4_PATTERN.test(value)) {
    throw new TypeError("IDString must be a hyphenated UUID v4 string");
  }

  return value.toLowerCase() as IDString;
}

export function generateIDString(): IDString {
  return parseIDString(randomUUID());
}

export function isTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= MIN_TIMESTAMP &&
    value <= MAX_TIMESTAMP
  );
}

export function parseTimestamp(value: unknown): Timestamp {
  if (!isTimestamp(value)) {
    throw new TypeError(
      "Timestamp must be a safe integer within the ECMAScript Date range",
    );
  }

  return value;
}

export function timestampFromDate(value: Date): Timestamp {
  if (!(value instanceof Date)) {
    throw new TypeError("Timestamp conversion requires a Date instance");
  }

  return parseTimestamp(value.getTime());
}

export function timestampToDate(value: Timestamp): Date {
  return new Date(parseTimestamp(value));
}
