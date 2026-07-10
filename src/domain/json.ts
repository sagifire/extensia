export type JSONPrimitive = null | boolean | number | string;
export type JSONValue = JSONPrimitive | JSONArray | JSONObject;
export type JSONArray = readonly JSONValue[];
export interface JSONObject {
  readonly [key: string]: JSONValue;
}

function validateArray(
  value: readonly unknown[],
  ancestors: WeakSet<object>,
): boolean {
  if (ancestors.has(value)) {
    return false;
  }

  ancestors.add(value);

  try {
    const ownKeys = Reflect.ownKeys(value);

    for (const key of ownKeys) {
      if (typeof key === "symbol") {
        return false;
      }

      if (key === "length") {
        continue;
      }

      const index = Number(key);
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= value.length ||
        String(index) !== key
      ) {
        return false;
      }
    }

    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));

      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor) ||
        !validateValue(descriptor.value, ancestors)
      ) {
        return false;
      }
    }

    return true;
  } finally {
    ancestors.delete(value);
  }
}

function validateObject(value: object, ancestors: WeakSet<object>): boolean {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return false;
  }

  if (ancestors.has(value)) {
    return false;
  }

  ancestors.add(value);

  try {
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol") {
        return false;
      }

      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor) ||
        !validateValue(descriptor.value, ancestors)
      ) {
        return false;
      }
    }

    return true;
  } finally {
    ancestors.delete(value);
  }
}

function validateValue(value: unknown, ancestors: WeakSet<object>): boolean {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return validateArray(value, ancestors);
  }

  return typeof value === "object" && validateObject(value, ancestors);
}

export function isJSONValue(value: unknown): value is JSONValue {
  try {
    return validateValue(value, new WeakSet<object>());
  } catch {
    return false;
  }
}

export function isJSONArray(value: unknown): value is JSONArray {
  return Array.isArray(value) && isJSONValue(value);
}

export function isJSONObject(value: unknown): value is JSONObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    isJSONValue(value)
  );
}

export function assertJSONValue(value: unknown): asserts value is JSONValue {
  if (!isJSONValue(value)) {
    throw new TypeError("Value must be a finite, detached-safe JSON value");
  }
}

export function assertJSONObject(value: unknown): asserts value is JSONObject {
  if (!isJSONObject(value)) {
    throw new TypeError("Value must be a JSON object");
  }
}

function defineEnumerableValue(
  target: Record<string, JSONValue>,
  key: string,
  value: JSONValue,
): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function cloneValidatedJSON(value: JSONValue): JSONValue {
  if (Array.isArray(value)) {
    const clone: JSONValue[] = [];
    for (const item of value) {
      clone.push(cloneValidatedJSON(item));
    }

    return clone;
  }

  if (value !== null && typeof value === "object") {
    const objectValue = value as JSONObject;
    const clone: Record<string, JSONValue> = {};
    for (const key of Object.keys(objectValue)) {
      defineEnumerableValue(clone, key, cloneValidatedJSON(objectValue[key]!));
    }

    return clone;
  }

  return value;
}

export function cloneJSONValue(value: unknown): JSONValue {
  assertJSONValue(value);
  return cloneValidatedJSON(value);
}

export function cloneJSONObject(value: unknown): JSONObject {
  assertJSONObject(value);
  return cloneValidatedJSON(value) as JSONObject;
}
