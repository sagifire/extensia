import type { MarkSnapshot, ResourceKVSnapshot } from "./snapshots.js";

const MAX_ITEMS = 256,
  MAX_TEXT = 128,
  MAX_VALUE = 16_384,
  MAX_TOTAL = 1_048_576;
function validName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= MAX_TEXT
  );
}
function exactRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Reflect.ownKeys(value).every((key) => {
    if (typeof key !== "string") return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return (
      descriptor !== undefined && descriptor.enumerable && "value" in descriptor
    );
  });
}
export function parseMarks(value: unknown): readonly MarkSnapshot[] | null {
  try {
    if (!Array.isArray(value) || value.length > MAX_ITEMS) return null;
    if (
      Reflect.ownKeys(value).some((key) => {
        if (key === "length")
          return !("value" in Object.getOwnPropertyDescriptor(value, key)!);
        if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)) return true;
        const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
        return (
          Number(key) >= value.length ||
          !descriptor.enumerable ||
          !("value" in descriptor)
        );
      }) ||
      Object.keys(value).length !== value.length
    )
      return null;
    const result: MarkSnapshot[] = [],
      identities = new Set<string>();
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      const entry =
        descriptor && "value" in descriptor ? descriptor.value : undefined;
      if (
        !exactRecord(entry) ||
        Reflect.ownKeys(entry).length !== 3 ||
        !Object.hasOwn(entry, "type") ||
        !Object.hasOwn(entry, "name") ||
        !Object.hasOwn(entry, "value")
      )
        return null;
      const type = Object.getOwnPropertyDescriptor(entry, "type")!.value,
        name = Object.getOwnPropertyDescriptor(entry, "name")!.value,
        markValue = Object.getOwnPropertyDescriptor(entry, "value")!.value;
      if (
        !validName(type) ||
        !validName(name) ||
        !(
          markValue === null ||
          (typeof markValue === "number" &&
            Number.isInteger(markValue) &&
            markValue >= -2_147_483_648 &&
            markValue <= 2_147_483_647)
        )
      )
        return null;
      const identity = `${type.length}:${type}${name}`;
      if (identities.has(identity)) return null;
      identities.add(identity);
      result.push(Object.freeze({ type, name, value: markValue }));
    }
    result.sort((a, b) =>
      a.type < b.type
        ? -1
        : a.type > b.type
          ? 1
          : a.name < b.name
            ? -1
            : a.name > b.name
              ? 1
              : 0,
    );
    return Object.freeze(result);
  } catch {
    return null;
  }
}
export function parseKVNamespace(
  value: unknown,
): Readonly<Record<string, string>> | null {
  try {
    if (!exactRecord(value)) return null;
    const keys = Object.keys(value);
    if (keys.length > MAX_ITEMS) return null;
    const result: Record<string, string> = Object.create(null);
    for (const key of keys.sort()) {
      const item = Object.getOwnPropertyDescriptor(value, key)!.value;
      if (
        !validName(key) ||
        typeof item !== "string" ||
        item.length > MAX_VALUE
      )
        return null;
      Object.defineProperty(result, key, { enumerable: true, value: item });
    }
    return Object.freeze(result);
  } catch {
    return null;
  }
}
export function validKVNamespace(value: unknown): value is string {
  return validName(value);
}
export function marksEqual(
  a: readonly MarkSnapshot[],
  b: readonly MarkSnapshot[],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (v, i) =>
        v.type === b[i]?.type &&
        v.name === b[i]?.name &&
        v.value === b[i]?.value,
    )
  );
}
export function kvNamespaceEqual(
  a: Readonly<Record<string, string>> | undefined,
  b: Readonly<Record<string, string>>,
): boolean {
  const ak = a === undefined ? [] : Object.keys(a).sort(),
    bk = Object.keys(b);
  return (
    ak.length === bk.length &&
    ak.every((key, i) => key === bk[i] && a?.[key] === b[key])
  );
}
export function replaceKV(
  current: ResourceKVSnapshot,
  namespace: string,
  values: Readonly<Record<string, string>>,
): ResourceKVSnapshot | null {
  const next: Record<string, Readonly<Record<string, string>>> = Object.create(
    null,
  );
  for (const key of Object.keys(current).sort())
    if (key !== namespace) next[key] = current[key]!;
  if (Object.keys(values).length > 0) next[namespace] = values;
  const namespaces = Object.keys(next).sort();
  if (namespaces.length > MAX_ITEMS) return null;
  let total = 0;
  const canonical: Record<
    string,
    Readonly<Record<string, string>>
  > = Object.create(null);
  for (const ns of namespaces) {
    const entries = next[ns]!;
    if (!validName(ns) || Object.keys(entries).length > MAX_ITEMS) return null;
    canonical[ns] = entries;
    for (const [key, item] of Object.entries(entries)) {
      if (
        !validName(key) ||
        typeof item !== "string" ||
        item.length > MAX_VALUE
      )
        return null;
      total += ns.length + key.length + item.length;
    }
  }
  return total <= MAX_TOTAL ? canonical : null;
}
