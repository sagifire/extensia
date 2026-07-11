import type { FullResourceDriverAdapter } from "../storage/full-resource-driver-adapter.js";
import { isIDString, isTimestamp } from "../domain/scalars.js";
import {
  cloneCommittedOperationEntry,
  equalCommittedOperationDrafts,
  parseJournalSequence,
} from "../storage/resource-journal-integrity.js";
import type {
  CommittedOperationDraft,
  CommittedOperationEntry,
} from "../storage/resource-write-protocol.js";

declare const fullResourceDriverBrand: unique symbol;

export interface FullResourceDriver {
  readonly mode: "full";
  readonly [fullResourceDriverBrand]: "FullResourceDriver";
}

export interface FullResourceDriverDefinition {
  open(): Promise<void>;
  close(): Promise<void>;
  acquireStorageSession(
    signal?: AbortSignal,
  ): ReturnType<FullResourceDriverAdapter["acquireStorageSession"]>;
}

const definitions = new WeakMap<object, FullResourceDriverAdapter>();

function dataMethod(
  value: object,
  key: PropertyKey,
): ((...args: unknown[]) => unknown) | null {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor !== undefined &&
    "value" in descriptor &&
    typeof descriptor.value === "function"
    ? descriptor.value
    : null;
}

function inheritedDataMethod(
  value: object,
  key: PropertyKey,
): ((...args: unknown[]) => unknown) | null {
  const visited = new Set<object>();
  let current: object | null = value;
  while (current !== null && !visited.has(current)) {
    visited.add(current);
    const method = dataMethod(current, key);
    if (method !== null) return method;
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor !== undefined) return null;
    current = Object.getPrototypeOf(current);
  }
  return null;
}

function dataValue(value: object, key: PropertyKey): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || !("value" in descriptor)) {
    throw new TypeError("Full Resource driver runtime shape is invalid");
  }
  return descriptor.value;
}

function captureMethod(value: object, key: PropertyKey) {
  const method = inheritedDataMethod(value, key);
  if (method === null)
    throw new TypeError("Full Resource driver runtime shape is invalid");
  return (...args: unknown[]) => Reflect.apply(method, value, args);
}

async function validateSession(candidate: unknown) {
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    Array.isArray(candidate)
  ) {
    throw new TypeError("Full Resource driver session is invalid");
  }
  const recovery = dataValue(candidate, "recovery");
  if (
    typeof recovery !== "object" ||
    recovery === null ||
    Array.isArray(recovery)
  ) {
    throw new TypeError("Full Resource driver recovery report is invalid");
  }
  const status = dataValue(recovery, "status");
  const rolledBack = dataValue(recovery, "rolled_back_operations");
  const completed = dataValue(recovery, "completed_operations");
  if (
    (status !== "clean" && status !== "recovered") ||
    !Number.isSafeInteger(rolledBack) ||
    (rolledBack as number) < 0 ||
    !Number.isSafeInteger(completed) ||
    (completed as number) < 0
  ) {
    throw new TypeError("Full Resource driver recovery report is invalid");
  }
  const listResources = captureMethod(candidate, "listResources");
  const readResource = captureMethod(candidate, "readResource");
  const begin = captureMethod(candidate, "begin");
  const readCommittedOperationsAfter = captureMethod(
    candidate,
    "readCommittedOperationsAfter",
  );
  const release = captureMethod(candidate, "release");
  return {
    recovery: {
      status,
      rolled_back_operations: rolledBack as number,
      completed_operations: completed as number,
    },
    listResources: () =>
      listResources() as ReturnType<
        import("../storage/resource-write-protocol.js").ResourceStorageSession["listResources"]
      >,
    readResource: (id: import("../domain/scalars.js").IDString) =>
      readResource(id) as ReturnType<
        import("../storage/resource-write-protocol.js").ResourceStorageSession["readResource"]
      >,
    async begin(id: import("../domain/scalars.js").IDString) {
      const transaction = await begin(id);
      if (
        typeof transaction !== "object" ||
        transaction === null ||
        Array.isArray(transaction)
      )
        throw new TypeError("Full Resource driver transaction is invalid");
      const stageResource = captureMethod(transaction, "stageResource");
      const commit = captureMethod(transaction, "commit");
      const abort = captureMethod(transaction, "abort");
      return {
        stageResource: (
          resource: import("../domain/snapshots.js").ResourceSnapshot,
        ) => stageResource(resource) as Promise<void>,
        async commit(draft: CommittedOperationDraft) {
          return validateCommittedEntry(await commit(draft), draft);
        },
        abort: () => abort() as Promise<void>,
      };
    },
    readCommittedOperationsAfter: (
      cursor:
        import("../storage/resource-write-protocol.js").JournalSequence | null,
    ) =>
      readCommittedOperationsAfter(cursor) as ReturnType<
        import("../storage/resource-write-protocol.js").ResourceStorageSession["readCommittedOperationsAfter"]
      >,
    release: () => release() as Promise<void>,
  } satisfies import("../storage/resource-write-protocol.js").ResourceStorageSession;
}

function validateCommittedEntry(
  candidate: unknown,
  draft: CommittedOperationDraft,
): CommittedOperationEntry {
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    Array.isArray(candidate)
  ) {
    throw new TypeError("Full Resource driver committed entry is invalid");
  }
  const entry = candidate as Partial<CommittedOperationEntry>;
  if (
    entry.schema_version !== 1 ||
    !isIDString(entry.operation_id) ||
    !isIDString(entry.actor_id) ||
    (entry.type !== "resource.create" && entry.type !== "resource.update") ||
    !isTimestamp(entry.committed_at) ||
    typeof entry.sequence !== "string" ||
    parseJournalSequence(entry.sequence as never) < 1n ||
    typeof entry.write_set_fingerprint !== "string" ||
    !/^[0-9a-f]{64}$/.test(entry.write_set_fingerprint) ||
    !Array.isArray(entry.affected_resources) ||
    !entry.affected_resources.every(isIDString) ||
    !Array.isArray(entry.changes) ||
    !entry.changes.every(
      (change) =>
        typeof change === "object" &&
        change !== null &&
        change.kind === "resource.upsert" &&
        isIDString(change.resource_id),
    )
  ) {
    throw new TypeError("Full Resource driver committed entry is invalid");
  }
  const detached = cloneCommittedOperationEntry(
    entry as CommittedOperationEntry,
  );
  if (!equalCommittedOperationDrafts(detached, draft)) {
    throw new TypeError(
      "Full Resource driver committed entry does not match its draft",
    );
  }
  return detached;
}

export function defineFullResourceDriver(
  definition: FullResourceDriverDefinition,
): FullResourceDriver {
  if (
    typeof definition !== "object" ||
    definition === null ||
    Array.isArray(definition)
  ) {
    throw new TypeError("Full Resource driver definition is invalid");
  }
  const open = dataMethod(definition, "open");
  const close = dataMethod(definition, "close");
  const acquireStorageSession = dataMethod(definition, "acquireStorageSession");
  if (open === null || close === null || acquireStorageSession === null) {
    throw new TypeError("Full Resource driver definition is invalid");
  }
  const captured: FullResourceDriverAdapter = Object.freeze({
    mode: "full",
    open: () => Reflect.apply(open, definition, []) as Promise<void>,
    close: () => Reflect.apply(close, definition, []) as Promise<void>,
    acquireStorageSession: (signal?: AbortSignal) =>
      Promise.resolve(
        Reflect.apply(acquireStorageSession, definition, [signal]),
      ).then(validateSession),
  });
  const handle = Object.freeze({ mode: "full" }) as FullResourceDriver;
  definitions.set(handle, captured);
  return handle;
}

export function resolveFullResourceDriver(
  handle: FullResourceDriver,
): FullResourceDriverAdapter | null {
  return definitions.get(handle) ?? null;
}
