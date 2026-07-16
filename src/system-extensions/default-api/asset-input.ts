import {
  canonicalizeAssetURL,
  isAssetClassifier,
  isAssetExtension,
  isAssetMime,
  parseAssetData,
} from "../../domain/asset-metadata.js";
import { parseIDString } from "../../domain/scalars.js";
import type {
  NormalizedCreateAssetInput,
  NormalizedUpdateAssetPatch,
} from "./asset-write-port.js";

export type AssetInputFailureCode =
  | "ASSET_INPUT_INVALID"
  | "ASSET_URL_INVALID"
  | "ASSET_DATA_INVALID"
  | "ASSET_LINEAGE_INVALID";

export type ParsedAssetInput<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: AssetInputFailureCode };

function invalid<T>(code: AssetInputFailureCode): ParsedAssetInput<T> {
  return { ok: false, code };
}

function exactDataRecord(
  value: unknown,
  allowed: readonly string[],
  required: readonly string[],
): Readonly<Record<string, unknown>> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const keys = Reflect.ownKeys(value);
  if (
    keys.some((key) => typeof key !== "string" || !allowed.includes(key)) ||
    required.some((key) => !keys.includes(key))
  ) {
    return null;
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !("value" in descriptor)
    ) {
      return null;
    }
  }
  return value as Readonly<Record<string, unknown>>;
}

function parseDerivedFrom(
  value: unknown,
): ReturnType<typeof parseIDString> | null | undefined {
  if (value === null || value === undefined) return value;
  try {
    return parseIDString(value);
  } catch {
    return undefined;
  }
}

const CREATE_KEYS = [
  "kind",
  "type",
  "role",
  "mime",
  "extension",
  "url",
  "derived_from",
  "data",
  "is_primary",
] as const;

export function parseCreateAssetInput(
  input: unknown,
): ParsedAssetInput<NormalizedCreateAssetInput> {
  try {
    const value = exactDataRecord(input, CREATE_KEYS, [
      "kind",
      "type",
      "role",
      "mime",
      "extension",
    ]);
    if (
      value === null ||
      (value["kind"] !== "external" && value["kind"] !== "internal") ||
      !isAssetClassifier(value["type"]) ||
      !isAssetClassifier(value["role"]) ||
      !isAssetMime(value["mime"]) ||
      !isAssetExtension(value["extension"])
    ) {
      return invalid("ASSET_INPUT_INVALID");
    }
    const derived = parseDerivedFrom(value["derived_from"]);
    if ("derived_from" in value && derived === undefined) {
      return invalid("ASSET_LINEAGE_INVALID");
    }
    const data = "data" in value ? parseAssetData(value["data"]) : null;
    if (data === undefined) return invalid("ASSET_DATA_INVALID");
    const primary = "is_primary" in value ? value["is_primary"] : false;
    if (typeof primary !== "boolean") return invalid("ASSET_INPUT_INVALID");
    if (value["kind"] === "internal") {
      if ("url" in value || primary) return invalid("ASSET_INPUT_INVALID");
      return {
        ok: true,
        value: {
          data,
          derived_from: derived ?? null,
          extension: value["extension"],
          is_primary: false,
          kind: "internal",
          mime: value["mime"],
          role: value["role"],
          type: value["type"],
          url: null,
        },
      };
    }
    if (!("url" in value)) return invalid("ASSET_INPUT_INVALID");
    const url = canonicalizeAssetURL(value["url"]);
    if (url === null) return invalid("ASSET_URL_INVALID");
    return {
      ok: true,
      value: {
        data,
        derived_from: derived ?? null,
        extension: value["extension"],
        is_primary: primary,
        kind: "external",
        mime: value["mime"],
        role: value["role"],
        type: value["type"],
        url,
      },
    };
  } catch {
    return invalid("ASSET_INPUT_INVALID");
  }
}

const UPDATE_KEYS = [
  "type",
  "role",
  "mime",
  "extension",
  "url",
  "derived_from",
  "data",
] as const;

export function parseUpdateAssetInput(
  input: unknown,
): ParsedAssetInput<NormalizedUpdateAssetPatch> {
  try {
    const value = exactDataRecord(input, UPDATE_KEYS, []);
    if (value === null || Reflect.ownKeys(value).length === 0) {
      return invalid("ASSET_INPUT_INVALID");
    }
    if (
      ("type" in value && !isAssetClassifier(value["type"])) ||
      ("role" in value && !isAssetClassifier(value["role"])) ||
      ("mime" in value && !isAssetMime(value["mime"])) ||
      ("extension" in value && !isAssetExtension(value["extension"]))
    ) {
      return invalid("ASSET_INPUT_INVALID");
    }
    const derived = parseDerivedFrom(value["derived_from"]);
    if ("derived_from" in value && derived === undefined) {
      return invalid("ASSET_LINEAGE_INVALID");
    }
    const data = "data" in value ? parseAssetData(value["data"]) : undefined;
    if ("data" in value && data === undefined) {
      return invalid("ASSET_DATA_INVALID");
    }
    const url = "url" in value ? canonicalizeAssetURL(value["url"]) : undefined;
    if ("url" in value && url === null) return invalid("ASSET_URL_INVALID");
    return {
      ok: true,
      value: {
        ...(value["type"] === undefined
          ? {}
          : { type: value["type"] as string }),
        ...(value["role"] === undefined
          ? {}
          : { role: value["role"] as string }),
        ...("mime" in value ? { mime: value["mime"] as string | null } : {}),
        ...("extension" in value
          ? { extension: value["extension"] as string | null }
          : {}),
        ...(url === undefined ? {} : { url: url as string }),
        ...("derived_from" in value ? { derived_from: derived ?? null } : {}),
        ...("data" in value ? { data: data ?? null } : {}),
      },
    };
  } catch {
    return invalid("ASSET_INPUT_INVALID");
  }
}
