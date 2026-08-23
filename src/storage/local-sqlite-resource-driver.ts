import { existsSync, lstatSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  hasValidAssetArrayInvariants,
  validateAssetStorageInvariants,
  type AssetPayloadState,
} from "../domain/asset-metadata.js";
import { isIDString, isTimestamp, type IDString } from "../domain/scalars.js";
import {
  buildResourceSnapshot,
  isAssetSnapshot,
  type ResourceSnapshot,
} from "../domain/snapshots.js";
import {
  COHERENT_SYNCHRONIZED_OBSERVATION,
  READONLY_COHERENT_METADATA_SNAPSHOT,
  CoreObservationTransientError,
  type CommittedChangeObservation,
  type CommittedChangeObservationRequest,
  type CoreMetadataCompleteObservation,
  type ReadonlySynchronizedObservationCapability,
} from "../core/read-model-observation.js";
import {
  buildCompleteReadModelGeneration,
  createObservationStamp,
} from "../core/read-model-generation.js";
import type { ReadonlyResourceDriver } from "../core/resource-read-runtime.js";
import {
  ResourceStorageSessionTransientError,
  type FullResourceDriverAdapter,
} from "./full-resource-driver-adapter.js";
import {
  canonicalResourceStorageJson,
  cloneAssetLogicalChange,
  cloneCommittedOperationDraft,
  cloneCommittedOperationEntry,
  computeResourceWriteSetFingerprint,
  equalCommittedOperationDrafts,
  hasCanonicalAssetChanges,
  journalSequence,
  parseJournalSequence,
  ResourceStorageIntegrityError,
  validateContiguousJournal,
} from "./resource-journal-integrity.js";
import type {
  AssetLogicalChange,
  CommittedOperationDraft,
  CommittedOperationEntry,
  JournalSequence,
  ResourceRecoveryReport,
  ResourceStorageSession,
  ResourceWriteTransaction,
} from "./resource-write-protocol.js";
import {
  AssetStorageIntegrityError,
  ResourceRuntimeIntegrityError,
} from "./resource-runtime-integrity.js";
import {
  ASSET_UPLOAD_CHUNK_BYTES,
  ASSET_UPLOAD_MAX_BYTES,
  assetUploadChunkCount,
  assetUploadDigest,
  attachAssetUploadSessionCapability,
  createAssetUploadHandle,
  createAssetUploadHandleAuthority,
  isAssetUploadHandle,
  validateAssetUploadBytes,
  type AssetUploadHandle,
  type AssetUploadHandleAuthority,
  type StagedAssetUpload,
} from "./asset-upload-capability.js";

const APPLICATION_ID = 1_163_416_625;
const FORMAT = "extensia-local-sqlite";
const FORMAT_VERSION = 2;
const DATABASE_FILE = "extensia.sqlite3";
const JOURNAL_FILE = `${DATABASE_FILE}-journal`;
const DEFAULT_TIMEOUT_MS = 1_000;
const DEFAULT_RECONCILIATION_DELAY_MS = 25;

const OPERATION_TYPES = new Set<CommittedOperationEntry["type"]>([
  "resource.create",
  "resource.update",
  "resource.move",
  "resource.delete",
  "resource.marks.set",
  "resource.kv.set",
  "asset.create",
  "asset.update",
  "asset.primary.set",
  "asset.reassign",
  "asset.delete",
  "asset.upload.begin",
  "asset.upload.finish",
  "asset.upload.abort",
]);

const SCHEMA = `
CREATE TABLE storage_format (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  format TEXT NOT NULL,
  version INTEGER NOT NULL
) STRICT;
CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  snapshot_json TEXT NOT NULL,
  tombstoned INTEGER NOT NULL CHECK (tombstoned IN (0, 1)),
  revision INTEGER NOT NULL CHECK (revision >= 1)
) STRICT, WITHOUT ROWID;
CREATE TABLE journal (
  sequence_text TEXT PRIMARY KEY,
  sequence_length INTEGER NOT NULL CHECK (sequence_length >= 1),
  operation_id TEXT NOT NULL UNIQUE,
  actor_id TEXT NOT NULL,
  type TEXT NOT NULL,
  committed_at INTEGER NOT NULL,
  write_set_fingerprint TEXT NOT NULL,
  entry_json TEXT NOT NULL
) STRICT, WITHOUT ROWID;
CREATE TABLE payloads (
  payload_id TEXT PRIMARY KEY,
  digest TEXT NOT NULL,
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0)
) STRICT, WITHOUT ROWID;
CREATE TABLE payload_chunks (
  payload_id TEXT NOT NULL REFERENCES payloads(payload_id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  bytes BLOB NOT NULL,
  PRIMARY KEY (payload_id, chunk_index)
) STRICT, WITHOUT ROWID;
CREATE TABLE asset_upload_generations (
  asset_id TEXT PRIMARY KEY,
  upload_id TEXT NOT NULL UNIQUE,
  replaces_committed INTEGER NOT NULL CHECK (replaces_committed IN (0, 1))
) STRICT, WITHOUT ROWID;
INSERT INTO storage_format(singleton, format, version)
VALUES (1, '${FORMAT}', ${FORMAT_VERSION});
PRAGMA application_id = ${APPLICATION_ID};
PRAGMA user_version = ${FORMAT_VERSION};
`;

const EXPECTED_TABLES = new Map<string, readonly ColumnSpec[]>([
  [
    "asset_upload_generations",
    [
      ["asset_id", "TEXT", 1, 1],
      ["upload_id", "TEXT", 1, 0],
      ["replaces_committed", "INTEGER", 1, 0],
    ],
  ],
  [
    "storage_format",
    [
      ["singleton", "INTEGER", 0, 1],
      ["format", "TEXT", 1, 0],
      ["version", "INTEGER", 1, 0],
    ],
  ],
  [
    "resources",
    [
      ["id", "TEXT", 1, 1],
      ["snapshot_json", "TEXT", 1, 0],
      ["tombstoned", "INTEGER", 1, 0],
      ["revision", "INTEGER", 1, 0],
    ],
  ],
  [
    "journal",
    [
      ["sequence_text", "TEXT", 1, 1],
      ["sequence_length", "INTEGER", 1, 0],
      ["operation_id", "TEXT", 1, 0],
      ["actor_id", "TEXT", 1, 0],
      ["type", "TEXT", 1, 0],
      ["committed_at", "INTEGER", 1, 0],
      ["write_set_fingerprint", "TEXT", 1, 0],
      ["entry_json", "TEXT", 1, 0],
    ],
  ],
  [
    "payloads",
    [
      ["payload_id", "TEXT", 1, 1],
      ["digest", "TEXT", 1, 0],
      ["byte_length", "INTEGER", 1, 0],
    ],
  ],
  [
    "payload_chunks",
    [
      ["payload_id", "TEXT", 1, 1],
      ["chunk_index", "INTEGER", 1, 2],
      ["bytes", "BLOB", 1, 0],
    ],
  ],
]);

const EXPECTED_TABLE_SQL = new Map<string, string>([
  [
    "asset_upload_generations",
    "CREATE TABLE asset_upload_generations (asset_id TEXT PRIMARY KEY, upload_id TEXT NOT NULL UNIQUE, replaces_committed INTEGER NOT NULL CHECK (replaces_committed IN (0, 1))) STRICT, WITHOUT ROWID",
  ],
  [
    "storage_format",
    "CREATE TABLE storage_format (singleton INTEGER PRIMARY KEY CHECK (singleton = 1), format TEXT NOT NULL, version INTEGER NOT NULL) STRICT",
  ],
  [
    "resources",
    "CREATE TABLE resources (id TEXT PRIMARY KEY, snapshot_json TEXT NOT NULL, tombstoned INTEGER NOT NULL CHECK (tombstoned IN (0, 1)), revision INTEGER NOT NULL CHECK (revision >= 1)) STRICT, WITHOUT ROWID",
  ],
  [
    "journal",
    "CREATE TABLE journal (sequence_text TEXT PRIMARY KEY, sequence_length INTEGER NOT NULL CHECK (sequence_length >= 1), operation_id TEXT NOT NULL UNIQUE, actor_id TEXT NOT NULL, type TEXT NOT NULL, committed_at INTEGER NOT NULL, write_set_fingerprint TEXT NOT NULL, entry_json TEXT NOT NULL) STRICT, WITHOUT ROWID",
  ],
  [
    "payloads",
    "CREATE TABLE payloads (payload_id TEXT PRIMARY KEY, digest TEXT NOT NULL, byte_length INTEGER NOT NULL CHECK (byte_length >= 0)) STRICT, WITHOUT ROWID",
  ],
  [
    "payload_chunks",
    "CREATE TABLE payload_chunks (payload_id TEXT NOT NULL REFERENCES payloads(payload_id) ON DELETE CASCADE, chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0), bytes BLOB NOT NULL, PRIMARY KEY (payload_id, chunk_index)) STRICT, WITHOUT ROWID",
  ],
]);

const LEGACY_EXPECTED_TABLES = new Map(
  [...EXPECTED_TABLES].filter(([name]) => name !== "asset_upload_generations"),
);
const LEGACY_EXPECTED_TABLE_SQL = new Map(
  [...EXPECTED_TABLE_SQL].filter(
    ([name]) => name !== "asset_upload_generations",
  ),
);

type ColumnSpec = readonly [
  name: string,
  type: string,
  notNull: number,
  primaryKey: number,
];

export type LocalSqliteProfile =
  "windows-local-ntfs-v1" | "candidate-local-filesystem";

export type LocalSqliteFaultPoint =
  | "session.after-lock"
  | "transaction.before-write"
  | "transaction.after-resource-write"
  | "transaction.after-journal-write"
  | "transaction.before-commit"
  | "transaction.after-commit"
  | "asset-upload.stage.before-write"
  | "asset-upload.stage.after-write"
  | "asset-upload.stage.after-commit"
  | "reconciliation.before-reopen"
  | "reconciliation.before-query"
  | "readonly.after-open"
  | "readonly.snapshot.after-resources";

export interface LocalSqliteFaultInjector {
  hit(point: LocalSqliteFaultPoint): void;
}

export interface LocalSqliteFilesystemProfileEvidence {
  readonly canonicalRootPath: string;
  readonly driveType: "Fixed";
  readonly filesystemName: "NTFS";
  readonly networkBacked: false;
  readonly syncBacked: false;
}

export interface LocalSqliteDriverOptions {
  readonly rootPath: string;
  readonly timeoutMs?: number;
  readonly reconciliationDelayMs?: number;
  readonly profile?: LocalSqliteProfile;
  readonly verifyFilesystemProfile?: (
    canonicalRootPath: string,
  ) => LocalSqliteFilesystemProfileEvidence | null;
  readonly faults?: LocalSqliteFaultInjector;
  readonly onObservationDiagnostic?: (
    sample: LocalSqliteObservationDiagnostic,
  ) => void;
}

export interface LocalSqliteObservationDiagnostic {
  readonly role: "full" | "readonly";
  readonly phase: "startup" | "refresh";
  readonly strategy: "startup" | "at-head" | "delta" | "rebuild";
  readonly outcome: "success" | "lock" | "unavailable" | "read" | "integrity";
  readonly configured_timeout_ms: number;
  readonly actual_wait_ms: number;
  readonly session_duration_ms: number;
  readonly synchronous_overshoot_ms: number;
}

interface NormalizedOptions {
  readonly rootPath: string;
  readonly timeoutMs: number;
  readonly reconciliationDelayMs: number;
  readonly profile: LocalSqliteProfile;
  readonly verifyFilesystemProfile?: (
    canonicalRootPath: string,
  ) => LocalSqliteFilesystemProfileEvidence | null;
  readonly faults?: LocalSqliteFaultInjector;
  readonly onObservationDiagnostic?: (
    sample: LocalSqliteObservationDiagnostic,
  ) => void;
}

interface ResolvedRoot {
  readonly rootPath: string;
  readonly databasePath: string;
  readonly journalPath: string;
}

interface ResourceRow extends Record<string, unknown> {
  readonly id: unknown;
  readonly snapshot_json: unknown;
  readonly tombstoned: unknown;
  readonly revision: unknown;
}

interface JournalRow extends Record<string, unknown> {
  readonly sequence_text: unknown;
  readonly sequence_length: unknown;
  readonly operation_id: unknown;
  readonly actor_id: unknown;
  readonly type: unknown;
  readonly committed_at: unknown;
  readonly write_set_fingerprint: unknown;
  readonly entry_json: unknown;
}

interface AssetGenerationRow extends Record<string, unknown> {
  readonly asset_id: unknown;
  readonly upload_id: unknown;
  readonly replaces_committed: unknown;
}

interface ConnectionState {
  db: DatabaseSync;
  recovery: ResourceRecoveryReport;
}

class ProvenAbsentCommitError extends Error {
  override readonly cause: unknown;

  constructor(cause: unknown) {
    super("SQLite commit is proven absent");
    this.name = "ProvenAbsentCommitError";
    this.cause = cause;
  }
}

export function createLocalSqliteFullResourceDriver(
  input: LocalSqliteDriverOptions,
): FullResourceDriverAdapter {
  const options = normalizeOptions(input);
  let openedRoot: ResolvedRoot | null = null;
  let sessionActive = false;
  let uploadHandleAuthority = createAssetUploadHandleAuthority();

  async function observe<T>(
    phase: "startup" | "refresh",
    deadline: number,
    signal: AbortSignal | undefined,
    read: (db: DatabaseSync) => T,
  ): Promise<T> {
    if (openedRoot === null)
      throw new CoreObservationTransientError("storage-unavailable");
    if (sessionActive) throw new CoreObservationTransientError("storage-lock");
    throwIfObservationAborted(signal);
    const configuredTimeout = observationTimeout(options, deadline);
    const started = performance.now();
    sessionActive = true;
    let connection: ConnectionState | null = null;
    let waitEnded = started;
    let outcome: LocalSqliteObservationDiagnostic["outcome"] = "success";
    let strategy: LocalSqliteObservationDiagnostic["strategy"] =
      phase === "startup" ? "startup" : "at-head";
    try {
      const attemptOptions = { ...options, timeoutMs: configuredTimeout };
      if (phase === "startup") {
        connection = openFullConnection(openedRoot, attemptOptions);
      } else {
        const db = openReadonlyObservationConnection(
          openedRoot,
          attemptOptions,
        );
        db.exec("BEGIN;");
        acquireObservationReadLock(db);
        connection = {
          db,
          recovery: {
            completed_operations: 0,
            rolled_back_operations: 0,
            status: "clean",
          },
        };
      }
      waitEnded = performance.now();
      throwIfObservationAborted(signal);
      const result = read(connection.db);
      if (
        phase === "refresh" &&
        typeof result === "object" &&
        result !== null &&
        "kind" in result &&
        (result.kind === "at-head" ||
          result.kind === "delta" ||
          result.kind === "rebuild")
      ) {
        strategy = result.kind;
      }
      if (phase === "refresh") connection.db.exec("COMMIT;");
      return result;
    } catch (error) {
      waitEnded = performance.now();
      const normalized = normalizeCoreObservationError(error, signal);
      outcome = observationOutcome(normalized);
      throw normalized;
    } finally {
      try {
        rollbackObservation(connection?.db ?? null);
        connection?.db.close();
      } finally {
        sessionActive = false;
        emitObservationDiagnostic(options, {
          actual_wait_ms: Math.max(0, waitEnded - started),
          configured_timeout_ms: configuredTimeout,
          outcome,
          phase,
          role: "full",
          session_duration_ms: Math.max(0, performance.now() - started),
          strategy,
          synchronous_overshoot_ms: Math.max(0, performance.now() - deadline),
        });
      }
    }
  }

  const synchronizedObservation: ReadonlySynchronizedObservationCapability =
    Object.freeze({
      async observeCommittedChanges(
        request: CommittedChangeObservationRequest,
      ) {
        validateCommittedObservationRequest(request);
        return observe(
          "refresh",
          request.attempt_admission_deadline_monotonic_ms,
          request.signal,
          (db) => observeCommittedChangesFromDatabase(db, request),
        );
      },
      async observeStartup(
        request: Parameters<
          ReadonlySynchronizedObservationCapability["observeStartup"]
        >[0],
      ) {
        return observe(
          "startup",
          request.attempt_admission_deadline_monotonic_ms,
          request.signal,
          observeStartupFromDatabase,
        );
      },
    });

  return Object.freeze({
    [COHERENT_SYNCHRONIZED_OBSERVATION]: synchronizedObservation,
    mode: "full" as const,
    async open() {
      if (openedRoot !== null) throw new Error("Driver is already open");
      openedRoot = resolveStorageRoot(options);
      uploadHandleAuthority = createAssetUploadHandleAuthority();
    },
    async close() {
      if (sessionActive) throw new Error("Cannot close with an active session");
      openedRoot = null;
    },
    async acquireStorageSession(signal?: AbortSignal) {
      if (openedRoot === null) {
        throw new ResourceStorageSessionTransientError("unavailable");
      }
      if (sessionActive) {
        throw new ResourceStorageSessionTransientError("lock");
      }
      if (signal?.aborted === true) throw signal.reason;

      sessionActive = true;
      let connection: ConnectionState | null = null;
      try {
        connection = openFullConnection(openedRoot, options);
        options.faults?.hit("session.after-lock");
        return createFullSession(
          openedRoot,
          options,
          connection,
          () => {
            sessionActive = false;
          },
          uploadHandleAuthority,
        );
      } catch (error) {
        connection?.db.close();
        sessionActive = false;
        throw normalizeSqliteSessionAcquireError(error);
      }
    },
  });
}

export function createLocalSqliteReadonlyResourceDriver(
  input: LocalSqliteDriverOptions,
): ReadonlyResourceDriver {
  const options = normalizeOptions(input);
  let root: ResolvedRoot | null = null;
  let db: DatabaseSync | null = null;

  async function observe<T>(
    phase: "startup" | "refresh",
    deadline: number,
    signal: AbortSignal | undefined,
    read: (database: DatabaseSync) => T,
  ): Promise<T> {
    if (db === null || root === null)
      throw new CoreObservationTransientError("storage-unavailable");
    throwIfObservationAborted(signal);
    const configuredTimeout = observationTimeout(options, deadline);
    const started = performance.now();
    let waitEnded = started;
    let outcome: LocalSqliteObservationDiagnostic["outcome"] = "success";
    let strategy: LocalSqliteObservationDiagnostic["strategy"] =
      phase === "startup" ? "startup" : "at-head";
    try {
      db.exec(`PRAGMA busy_timeout = ${configuredTimeout}; BEGIN;`);
      acquireObservationReadLock(db);
      waitEnded = performance.now();
      throwIfObservationAborted(signal);
      if (phase === "startup") validateDatabase(db, true);
      const result = read(db);
      if (
        phase === "refresh" &&
        typeof result === "object" &&
        result !== null &&
        "kind" in result &&
        (result.kind === "at-head" ||
          result.kind === "delta" ||
          result.kind === "rebuild")
      ) {
        strategy = result.kind;
      }
      db.exec("COMMIT;");
      return result;
    } catch (error) {
      waitEnded = performance.now();
      rollbackObservation(db);
      const normalized = normalizeCoreObservationError(error, signal);
      outcome = observationOutcome(normalized);
      throw normalized;
    } finally {
      emitObservationDiagnostic(options, {
        actual_wait_ms: Math.max(0, waitEnded - started),
        configured_timeout_ms: configuredTimeout,
        outcome,
        phase,
        role: "readonly",
        session_duration_ms: Math.max(0, performance.now() - started),
        strategy,
        synchronous_overshoot_ms: Math.max(0, performance.now() - deadline),
      });
    }
  }

  const synchronizedObservation: ReadonlySynchronizedObservationCapability =
    Object.freeze({
      async observeCommittedChanges(
        request: CommittedChangeObservationRequest,
      ) {
        validateCommittedObservationRequest(request);
        return observe(
          "refresh",
          request.attempt_admission_deadline_monotonic_ms,
          request.signal,
          (database) => observeCommittedChangesFromDatabase(database, request),
        );
      },
      async observeStartup(
        request: Parameters<
          ReadonlySynchronizedObservationCapability["observeStartup"]
        >[0],
      ) {
        return observe(
          "startup",
          request.attempt_admission_deadline_monotonic_ms,
          request.signal,
          observeStartupFromDatabase,
        );
      },
    });

  return Object.freeze({
    [COHERENT_SYNCHRONIZED_OBSERVATION]: synchronizedObservation,
    mode: "readonly" as const,
    async open() {
      if (db !== null) throw new Error("Driver is already open");
      root = resolveStorageRoot(options);
      if (existsSync(root.journalPath)) {
        root = null;
        throw new ResourceStorageIntegrityError(
          "Readonly SQLite open requires recovery",
        );
      }
      let candidate: DatabaseSync | null = null;
      try {
        candidate = new DatabaseSync(root.databasePath, {
          allowExtension: false,
          defensive: true,
          enableDoubleQuotedStringLiterals: false,
          enableForeignKeyConstraints: true,
          readOnly: true,
          timeout: options.timeoutMs,
        });
        candidate.exec("PRAGMA trusted_schema = OFF; PRAGMA query_only = ON;");
        assertPragma(candidate, "query_only", 1);
        options.faults?.hit("readonly.after-open");
        db = candidate;
      } catch (error) {
        candidate?.close();
        root = null;
        throw normalizeSqliteIntegrityError(error);
      }
    },
    async close() {
      db?.close();
      db = null;
      root = null;
    },
    async *listResources() {
      if (db === null || root === null) throw new Error("Driver is not open");
      for (const resource of loadResources(db)) {
        if (db === null) throw new Error("Driver is not open");
        yield resource;
      }
    },
    async [READONLY_COHERENT_METADATA_SNAPSHOT]() {
      if (db === null || root === null) throw new Error("Driver is not open");
      db.exec("BEGIN;");
      try {
        const resources = Object.freeze(loadResources(db));
        options.faults?.hit("readonly.snapshot.after-resources");
        const assetPayloadStates = Object.freeze(loadAssetPayloadStates(db));
        db.exec("COMMIT;");
        return Object.freeze({
          asset_payload_states: assetPayloadStates,
          resources,
        });
      } catch (error) {
        try {
          db.exec("ROLLBACK;");
        } catch {
          // The primary observation failure remains authoritative.
        }
        throw normalizeSqliteIntegrityError(error);
      }
    },
  });
}

function normalizeOptions(input: LocalSqliteDriverOptions): NormalizedOptions {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("Local SQLite driver options are invalid");
  }
  if (typeof input.rootPath !== "string" || input.rootPath.length === 0) {
    throw new TypeError("Local SQLite root path is invalid");
  }
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const reconciliationDelayMs =
    input.reconciliationDelayMs ?? DEFAULT_RECONCILIATION_DELAY_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 0) {
    throw new TypeError("Local SQLite timeout is invalid");
  }
  if (
    !Number.isSafeInteger(reconciliationDelayMs) ||
    reconciliationDelayMs < 0
  ) {
    throw new TypeError("Local SQLite reconciliation delay is invalid");
  }
  const profile = input.profile ?? "windows-local-ntfs-v1";
  if (
    profile !== "windows-local-ntfs-v1" &&
    profile !== "candidate-local-filesystem"
  ) {
    throw new TypeError("Local SQLite profile is invalid");
  }
  if (
    input.faults !== undefined &&
    (typeof input.faults !== "object" ||
      input.faults === null ||
      typeof input.faults.hit !== "function")
  ) {
    throw new TypeError("Local SQLite fault injector is invalid");
  }
  if (
    input.verifyFilesystemProfile !== undefined &&
    typeof input.verifyFilesystemProfile !== "function"
  ) {
    throw new TypeError("Local SQLite filesystem profile verifier is invalid");
  }
  if (
    input.onObservationDiagnostic !== undefined &&
    typeof input.onObservationDiagnostic !== "function"
  ) {
    throw new TypeError("Local SQLite observation diagnostic sink is invalid");
  }
  return {
    rootPath: input.rootPath,
    timeoutMs,
    reconciliationDelayMs,
    profile,
    ...(input.faults === undefined ? {} : { faults: input.faults }),
    ...(input.onObservationDiagnostic === undefined
      ? {}
      : { onObservationDiagnostic: input.onObservationDiagnostic }),
    ...(input.verifyFilesystemProfile === undefined
      ? {}
      : { verifyFilesystemProfile: input.verifyFilesystemProfile }),
  };
}

function observationTimeout(
  options: NormalizedOptions,
  deadline: number,
): number {
  if (!Number.isFinite(deadline)) {
    throw new TypeError("SQLite observation deadline is invalid");
  }
  const remaining = Math.floor(deadline - performance.now());
  if (remaining <= 0) {
    throw new CoreObservationTransientError("storage-lock");
  }
  return Math.min(options.timeoutMs, remaining);
}

function emitObservationDiagnostic(
  options: NormalizedOptions,
  sample: LocalSqliteObservationDiagnostic,
): void {
  try {
    options.onObservationDiagnostic?.(Object.freeze({ ...sample }));
  } catch {
    // Diagnostics must not affect storage correctness or caller settlement.
  }
}

function rollbackObservation(db: DatabaseSync | null): void {
  if (db === null || !db.isTransaction) return;
  try {
    db.exec("ROLLBACK;");
  } catch {
    // The primary observation failure remains authoritative.
  }
}

function acquireObservationReadLock(db: DatabaseSync): void {
  db.prepare("PRAGMA schema_version").get();
}

function throwIfObservationAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw signal.reason;
}

function observationOutcome(
  error: unknown,
): LocalSqliteObservationDiagnostic["outcome"] {
  if (error instanceof CoreObservationTransientError) {
    return error.category === "storage-lock"
      ? "lock"
      : error.category === "storage-unavailable"
        ? "unavailable"
        : "read";
  }
  if (error instanceof ResourceRuntimeIntegrityError) return "integrity";
  return "read";
}

function normalizeCoreObservationError(
  error: unknown,
  signal: AbortSignal | undefined,
): unknown {
  if (signal?.aborted === true) return signal.reason;
  if (
    error instanceof CoreObservationTransientError ||
    error instanceof ResourceRuntimeIntegrityError ||
    error instanceof TypeError
  ) {
    return error;
  }
  const normalized = normalizeSqliteSessionAcquireError(error);
  if (normalized instanceof ResourceStorageSessionTransientError) {
    return new CoreObservationTransientError(
      normalized.category === "lock"
        ? "storage-lock"
        : normalized.category === "unavailable"
          ? "storage-unavailable"
          : "storage-read",
    );
  }
  if (normalized instanceof ResourceRuntimeIntegrityError) return normalized;
  return new CoreObservationTransientError("storage-read");
}

function validateCommittedObservationRequest(
  request: CommittedChangeObservationRequest,
): void {
  if (
    request.incremental_entry_limit !== 256 ||
    request.incremental_resource_limit !== 256 ||
    !Number.isFinite(request.attempt_admission_deadline_monotonic_ms)
  ) {
    throw new TypeError("Committed-change observation request is invalid");
  }
}

function resolveStorageRoot(options: NormalizedOptions): ResolvedRoot {
  const absolute = resolve(options.rootPath);
  if (!isAbsolute(absolute) || !existsSync(absolute)) {
    throw new Error("Local SQLite storage root does not exist");
  }
  if (options.profile === "windows-local-ntfs-v1") {
    if (process.platform !== "win32" || absolute.startsWith("\\\\")) {
      throw new Error("Local SQLite storage profile is unsupported");
    }
  }
  const rootStat = lstatSync(absolute);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error("Local SQLite storage root is not a regular directory");
  }
  const canonicalRoot = realpathSync.native(absolute);
  if (options.profile === "windows-local-ntfs-v1") {
    const evidence = options.verifyFilesystemProfile?.(canonicalRoot);
    if (
      evidence === null ||
      evidence === undefined ||
      realpathSync.native(evidence.canonicalRootPath) !== canonicalRoot ||
      evidence.driveType !== "Fixed" ||
      evidence.filesystemName !== "NTFS" ||
      evidence.networkBacked !== false ||
      evidence.syncBacked !== false
    ) {
      throw new Error("Local SQLite storage profile is unsupported");
    }
  }
  const databasePath = join(canonicalRoot, DATABASE_FILE);
  const journalPath = join(canonicalRoot, JOURNAL_FILE);
  assertContained(canonicalRoot, databasePath);
  assertSafeOwnedFile(databasePath);
  assertSafeOwnedFile(journalPath);
  return { databasePath, journalPath, rootPath: canonicalRoot };
}

function assertContained(rootPath: string, candidate: string): void {
  const pathFromRoot = relative(rootPath, candidate);
  if (
    pathFromRoot.length === 0 ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error("Local SQLite database path escapes its root");
  }
}

function assertSafeOwnedFile(path: string): void {
  if (!existsSync(path)) return;
  const file = lstatSync(path);
  if (!file.isFile() || file.isSymbolicLink()) {
    throw new Error("Local SQLite owned path is not a regular file");
  }
}

function openFullConnection(
  root: ResolvedRoot,
  options: NormalizedOptions,
): ConnectionState {
  assertSafeOwnedFile(root.databasePath);
  assertSafeOwnedFile(root.journalPath);
  const databaseExisted = existsSync(root.databasePath);
  const journalExisted = existsSync(root.journalPath);
  if (!databaseExisted && journalExisted) {
    throw new ResourceStorageIntegrityError(
      "SQLite rollback journal exists without its database",
    );
  }
  const db = new DatabaseSync(root.databasePath, {
    allowExtension: false,
    defensive: true,
    enableDoubleQuotedStringLiterals: false,
    enableForeignKeyConstraints: true,
    timeout: options.timeoutMs,
  });
  try {
    const location = db.location();
    if (
      location === null ||
      realpathOrResolved(location) !== root.databasePath
    ) {
      throw new ResourceStorageIntegrityError(
        "SQLite opened an unexpected database location",
      );
    }
    assertSafeOwnedFile(root.databasePath);
    configureFullConnection(db);
    if (!databaseExisted) initializeDatabase(db);
    acquireExclusiveLease(db);
    migrateLegacyDatabase(db);
    validateDatabase(db);
    const recovered = journalExisted && !existsSync(root.journalPath);
    return {
      db,
      recovery: {
        completed_operations: 0,
        rolled_back_operations: recovered ? 1 : 0,
        status: recovered ? "recovered" : "clean",
      },
    };
  } catch (error) {
    db.close();
    throw normalizeSqliteIntegrityError(error);
  }
}

function openReadonlyObservationConnection(
  root: ResolvedRoot,
  options: NormalizedOptions,
): DatabaseSync {
  assertSafeOwnedFile(root.databasePath);
  if (!existsSync(root.databasePath)) {
    throw new ResourceStorageSessionTransientError("unavailable");
  }
  const db = new DatabaseSync(root.databasePath, {
    allowExtension: false,
    defensive: true,
    enableDoubleQuotedStringLiterals: false,
    enableForeignKeyConstraints: true,
    readOnly: true,
    timeout: options.timeoutMs,
  });
  try {
    const location = db.location();
    if (
      location === null ||
      realpathOrResolved(location) !== root.databasePath
    ) {
      throw new ResourceStorageIntegrityError(
        "SQLite opened an unexpected observation database location",
      );
    }
    db.exec("PRAGMA trusted_schema = OFF; PRAGMA query_only = ON;");
    assertPragma(db, "query_only", 1);
    return db;
  } catch (error) {
    db.close();
    throw normalizeSqliteIntegrityError(error);
  }
}

function realpathOrResolved(path: string): string {
  return existsSync(path) ? realpathSync.native(path) : resolve(path);
}

function configureFullConnection(db: DatabaseSync): void {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA trusted_schema = OFF;
    PRAGMA journal_mode = DELETE;
    PRAGMA synchronous = EXTRA;
    PRAGMA locking_mode = EXCLUSIVE;
  `);
  assertPragma(db, "foreign_keys", 1);
  assertPragma(db, "trusted_schema", 0);
  assertPragma(db, "journal_mode", "delete");
  assertPragma(db, "synchronous", 3);
  assertPragma(db, "locking_mode", "exclusive");
}

function initializeDatabase(db: DatabaseSync): void {
  db.exec("BEGIN EXCLUSIVE");
  try {
    db.exec(SCHEMA);
    db.exec("COMMIT");
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK");
    throw error;
  }
}

function acquireExclusiveLease(db: DatabaseSync): void {
  db.exec("BEGIN EXCLUSIVE");
  db.exec("COMMIT");
  assertPragma(db, "locking_mode", "exclusive");
}

function assertPragma(
  db: DatabaseSync,
  name: string,
  expected: string | number,
): void {
  const row = db.prepare(`PRAGMA ${name}`).get();
  const value = row?.[name];
  if (value !== expected) {
    throw new ResourceStorageIntegrityError(
      `SQLite PRAGMA ${name} does not match the profile`,
    );
  }
}

function validateDatabase(db: DatabaseSync, allowLegacy = false): void {
  try {
    const version = readDatabaseVersion(db);
    if (allowLegacy && version === 1) validateLegacyDatabaseState(db);
    else validateDatabaseState(db);
  } catch (error) {
    if (error instanceof ResourceRuntimeIntegrityError) throw error;
    throw new ResourceStorageIntegrityError(
      "SQLite profile state cannot be validated",
    );
  }
}

function readDatabaseVersion(db: DatabaseSync): number {
  assertPragma(db, "application_id", APPLICATION_ID);
  const row = db.prepare("PRAGMA user_version").get();
  const version = row?.["user_version"];
  if (!Number.isSafeInteger(version)) {
    throw new ResourceStorageIntegrityError(
      "SQLite storage version is invalid",
    );
  }
  return version as number;
}

function validateLegacyDatabaseState(db: DatabaseSync): void {
  if (readDatabaseVersion(db) !== 1) {
    throw new ResourceStorageIntegrityError(
      "SQLite legacy storage version is invalid",
    );
  }
  const quickCheck = db.prepare("PRAGMA quick_check").get();
  if (quickCheck?.["quick_check"] !== "ok") {
    throw new ResourceStorageIntegrityError("SQLite quick_check failed");
  }
  const format = db
    .prepare(
      "SELECT singleton, format, version FROM storage_format ORDER BY singleton",
    )
    .all();
  if (
    format.length !== 1 ||
    format[0]?.["singleton"] !== 1 ||
    format[0]?.["format"] !== FORMAT ||
    format[0]?.["version"] !== 1
  ) {
    throw new ResourceStorageIntegrityError(
      "SQLite legacy storage marker is invalid",
    );
  }
  validateSchema(db, LEGACY_EXPECTED_TABLES, LEGACY_EXPECTED_TABLE_SQL);
  assertLegacyPayloadSeamEmpty(db);
  const resources = loadResources(db);
  if (!validateAssetStorageInvariants(resources, [])) {
    throw new AssetStorageIntegrityError(
      "SQLite legacy Asset state cannot be migrated",
    );
  }
  const journal = loadJournal(db);
  if (journal.some((entry) => entry.type.startsWith("asset."))) {
    throw new ResourceStorageIntegrityError(
      "SQLite legacy journal contains unsupported Asset operations",
    );
  }
  validateContiguousJournal(journal);
}

function migrateLegacyDatabase(db: DatabaseSync): void {
  if (readDatabaseVersion(db) !== 1) return;
  validateLegacyDatabaseState(db);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`
      CREATE TABLE asset_upload_generations (
        asset_id TEXT PRIMARY KEY,
        upload_id TEXT NOT NULL UNIQUE,
        replaces_committed INTEGER NOT NULL CHECK (replaces_committed IN (0, 1))
      ) STRICT, WITHOUT ROWID;
      UPDATE storage_format SET version = ${FORMAT_VERSION} WHERE singleton = 1;
      PRAGMA user_version = ${FORMAT_VERSION};
    `);
    db.exec("COMMIT");
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK");
    throw error;
  }
}

function validateDatabaseState(db: DatabaseSync): void {
  assertPragma(db, "application_id", APPLICATION_ID);
  assertPragma(db, "user_version", FORMAT_VERSION);
  const quickCheck = db.prepare("PRAGMA quick_check").get();
  if (quickCheck?.["quick_check"] !== "ok") {
    throw new ResourceStorageIntegrityError("SQLite quick_check failed");
  }

  const format = db
    .prepare(
      "SELECT singleton, format, version FROM storage_format ORDER BY singleton",
    )
    .all();
  if (
    format.length !== 1 ||
    format[0]?.["singleton"] !== 1 ||
    format[0]?.["format"] !== FORMAT ||
    format[0]?.["version"] !== FORMAT_VERSION
  ) {
    throw new ResourceStorageIntegrityError(
      "SQLite storage format marker is invalid",
    );
  }
  validateSchema(db);
  const resources = loadResources(db);
  const assetPayloadStates = loadAssetPayloadStates(db);
  if (!validateAssetStorageInvariants(resources, assetPayloadStates)) {
    throw new AssetStorageIntegrityError(
      "SQLite Asset storage state is invalid",
    );
  }
  const journal = loadJournal(db);
  validateContiguousJournal(journal);
  const resourceIDs = new Set(resources.map((resource) => resource.data.id));
  for (const entry of journal) {
    if (entry.affected_resources.some((id) => !resourceIDs.has(id))) {
      throw new ResourceStorageIntegrityError(
        "Committed journal references a missing Resource",
      );
    }
  }
}

function validateSchema(
  db: DatabaseSync,
  expectedTables = EXPECTED_TABLES,
  expectedTableSql = EXPECTED_TABLE_SQL,
): void {
  const schemaRows = db
    .prepare(
      "SELECT type, name, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name",
    )
    .all();
  if (schemaRows.some((row) => row["type"] !== "table")) {
    throw new ResourceStorageIntegrityError(
      "SQLite schema contains unsupported objects",
    );
  }
  const tableRows = schemaRows;
  const tables = tableRows.map((row) => row["name"]);
  const expectedNames = [...expectedTables.keys()].sort();
  if (
    tables.length !== expectedNames.length ||
    tables.some((name, index) => name !== expectedNames[index])
  ) {
    throw new ResourceStorageIntegrityError("SQLite schema tables are invalid");
  }
  for (const [table, expectedColumns] of expectedTables) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (columns.length !== expectedColumns.length) {
      throw new ResourceStorageIntegrityError(
        `SQLite ${table} schema is invalid`,
      );
    }
    for (let index = 0; index < columns.length; index += 1) {
      const column = columns[index]!;
      const expected = expectedColumns[index]!;
      if (
        column["name"] !== expected[0] ||
        column["type"] !== expected[1] ||
        column["notnull"] !== expected[2] ||
        column["pk"] !== expected[3]
      ) {
        throw new ResourceStorageIntegrityError(
          `SQLite ${table} schema is invalid`,
        );
      }
    }
    const schemaSql = tableRows.find((row) => row["name"] === table)?.["sql"];
    if (typeof schemaSql !== "string") {
      throw new ResourceStorageIntegrityError(
        `SQLite ${table} schema SQL is invalid`,
      );
    }
    if (
      normalizeSchemaSql(schemaSql) !==
      normalizeSchemaSql(expectedTableSql.get(table)!)
    ) {
      throw new ResourceStorageIntegrityError(
        `SQLite ${table} constraints are invalid`,
      );
    }
  }
}

function assertLegacyPayloadSeamEmpty(db: DatabaseSync): void {
  const payloads = db.prepare("SELECT count(*) AS count FROM payloads").get();
  const chunks = db
    .prepare("SELECT count(*) AS count FROM payload_chunks")
    .get();
  if (payloads?.["count"] !== 0 || chunks?.["count"] !== 0) {
    throw new ResourceStorageIntegrityError(
      "SQLite legacy opaque payload state cannot be migrated",
    );
  }
}

function normalizeSchemaSql(sql: string): string {
  return sql.toLowerCase().replaceAll(/\s+/g, "");
}

function loadAssetPayloadStates(db: DatabaseSync): AssetPayloadState[] {
  const states = new Map<IDString, AssetPayloadState>();
  const generationRows = db
    .prepare(
      "SELECT asset_id, upload_id, replaces_committed FROM asset_upload_generations ORDER BY asset_id",
    )
    .all() as AssetGenerationRow[];
  const stagedPayloadIDs = new Set<IDString>();
  for (const row of generationRows) {
    if (
      !isIDString(row.asset_id) ||
      !isIDString(row.upload_id) ||
      (row.replaces_committed !== 0 && row.replaces_committed !== 1) ||
      stagedPayloadIDs.has(row.upload_id)
    ) {
      throw new AssetStorageIntegrityError(
        "SQLite Asset upload generation is invalid",
      );
    }
    stagedPayloadIDs.add(row.upload_id);
  }
  const payloadRows = db
    .prepare("SELECT payload_id FROM payloads ORDER BY payload_id")
    .all();
  for (const row of payloadRows) {
    const assetID = row["payload_id"];
    if (!isIDString(assetID)) {
      throw new AssetStorageIntegrityError(
        "SQLite committed Asset payload identity is invalid",
      );
    }
    loadPayloadBytes(db, assetID);
    if (stagedPayloadIDs.has(assetID)) continue;
    states.set(assetID, {
      active_upload: null,
      asset_id: assetID,
      committed: true,
    });
  }
  for (const row of generationRows) {
    const assetId = row.asset_id as IDString;
    const uploadId = row.upload_id as IDString;
    const committed = states.has(assetId);
    states.set(assetId, {
      active_upload: {
        replaces_committed: row.replaces_committed === 1,
        upload_id: uploadId,
      },
      asset_id: assetId,
      committed,
    });
  }
  return [...states.values()];
}

function loadPayloadBytes(
  db: DatabaseSync,
  payloadId: IDString,
): { readonly bytes: Uint8Array; readonly staged: StagedAssetUpload } | null {
  const row = db
    .prepare("SELECT digest, byte_length FROM payloads WHERE payload_id = ?")
    .get(payloadId);
  if (row === undefined) return null;
  const digest = row["digest"];
  const byteLength = row["byte_length"];
  if (
    typeof digest !== "string" ||
    !/^[0-9a-f]{64}$/.test(digest) ||
    !Number.isSafeInteger(byteLength) ||
    (byteLength as number) < 0 ||
    (byteLength as number) > ASSET_UPLOAD_MAX_BYTES
  ) {
    throw new AssetStorageIntegrityError("SQLite Asset payload is invalid");
  }
  const chunks = db
    .prepare(
      "SELECT chunk_index, bytes FROM payload_chunks WHERE payload_id = ? ORDER BY chunk_index",
    )
    .all(payloadId);
  const expectedChunks = assetUploadChunkCount(byteLength as number);
  if (chunks.length !== expectedChunks) {
    throw new AssetStorageIntegrityError(
      "SQLite Asset payload chunks are incomplete",
    );
  }
  const bytes = new Uint8Array(byteLength as number);
  let offset = 0;
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]!;
    const value = chunk["bytes"];
    const expectedLength = Math.min(
      ASSET_UPLOAD_CHUNK_BYTES,
      (byteLength as number) - offset,
    );
    if (
      chunk["chunk_index"] !== index ||
      !(value instanceof Uint8Array) ||
      value.byteLength !== expectedLength
    ) {
      throw new AssetStorageIntegrityError(
        "SQLite Asset payload chunk is invalid",
      );
    }
    bytes.set(value, offset);
    offset += value.byteLength;
  }
  if (offset !== byteLength || assetUploadDigest(bytes) !== digest) {
    throw new AssetStorageIntegrityError(
      "SQLite Asset payload digest or length is invalid",
    );
  }
  return {
    bytes,
    staged: Object.freeze({ byte_length: byteLength as number, digest }),
  };
}

function resourceOwnsAsset(
  db: DatabaseSync,
  resourceId: IDString,
  assetId: IDString,
): boolean {
  const row = db
    .prepare(
      "SELECT id, snapshot_json, tombstoned, revision FROM resources WHERE id = ?",
    )
    .get(resourceId) as ResourceRow | undefined;
  if (row === undefined) return false;
  const resource = decodeResourceRow(row);
  return (
    !resource.data.is_deleted &&
    resource.assets.some((asset) => asset.id === assetId)
  );
}

function resolveActiveUploadHandle(
  db: DatabaseSync,
  resourceId: IDString,
  assetId: IDString,
  uploadHandleAuthority: AssetUploadHandleAuthority,
): AssetUploadHandle | null {
  if (!resourceOwnsAsset(db, resourceId, assetId)) return null;
  const row = db
    .prepare(
      "SELECT upload_id FROM asset_upload_generations WHERE asset_id = ?",
    )
    .get(assetId);
  const uploadId = row?.["upload_id"];
  return isIDString(uploadId)
    ? createAssetUploadHandle(
        {
          asset_id: assetId,
          resource_id: resourceId,
          upload_id: uploadId,
        },
        uploadHandleAuthority,
      )
    : null;
}

function loadResources(db: DatabaseSync): ResourceSnapshot[] {
  const rows = db
    .prepare(
      "SELECT id, snapshot_json, tombstoned, revision FROM resources ORDER BY id",
    )
    .all() as ResourceRow[];
  return rows.map(decodeResourceRow);
}

function decodeResourceRow(row: ResourceRow): ResourceSnapshot {
  if (
    typeof row.id !== "string" ||
    typeof row.snapshot_json !== "string" ||
    (row.tombstoned !== 0 && row.tombstoned !== 1) ||
    !Number.isSafeInteger(row.revision) ||
    (row.revision as number) < 1
  ) {
    throw new ResourceStorageIntegrityError("SQLite Resource row is invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.snapshot_json);
  } catch {
    throw new ResourceStorageIntegrityError("SQLite Resource JSON is invalid");
  }
  let resource: ResourceSnapshot;
  try {
    resource = buildResourceSnapshot(parsed as ResourceSnapshot);
  } catch {
    if (hasInvalidStoredAssetShape(parsed)) {
      throw new AssetStorageIntegrityError("SQLite Asset snapshot is invalid");
    }
    throw new ResourceStorageIntegrityError("SQLite Resource is invalid");
  }
  if (
    resource.data.id !== row.id ||
    Number(resource.data.is_deleted) !== row.tombstoned ||
    canonicalResourceStorageJson(resource) !== row.snapshot_json
  ) {
    throw new ResourceStorageIntegrityError(
      "SQLite Resource row does not match its canonical snapshot",
    );
  }
  return resource;
}

function hasInvalidStoredAssetShape(value: unknown): boolean {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return false;
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, "assets");
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      !Array.isArray(descriptor.value)
    ) {
      return false;
    }
    return (
      !descriptor.value.every(isAssetSnapshot) ||
      !hasValidAssetArrayInvariants(descriptor.value)
    );
  } catch {
    return false;
  }
}

function loadJournal(db: DatabaseSync): CommittedOperationEntry[] {
  const rows = db
    .prepare(
      `SELECT sequence_text, sequence_length, operation_id, actor_id, type,
              committed_at, write_set_fingerprint, entry_json
         FROM journal
        ORDER BY sequence_length, sequence_text`,
    )
    .all() as JournalRow[];
  return rows.map(decodeJournalRow);
}

function loadJournalAfter(
  db: DatabaseSync,
  after: JournalSequence | null,
): CommittedOperationEntry[] {
  if (after === null) return loadJournal(db);
  const rows = db
    .prepare(
      `SELECT sequence_text, sequence_length, operation_id, actor_id, type,
              committed_at, write_set_fingerprint, entry_json
         FROM journal
        WHERE sequence_length > ?
           OR (sequence_length = ? AND sequence_text > ?)
        ORDER BY sequence_length, sequence_text`,
    )
    .all(after.length, after.length, after) as JournalRow[];
  return rows.map(decodeJournalRow);
}

function readJournalHead(db: DatabaseSync): JournalSequence | null {
  const row = db
    .prepare(
      `SELECT sequence_text, sequence_length
         FROM journal
        ORDER BY sequence_length DESC, sequence_text DESC
        LIMIT 1`,
    )
    .get() as
    | { readonly sequence_text: unknown; readonly sequence_length: unknown }
    | undefined;
  if (row === undefined) return null;
  if (
    typeof row.sequence_text !== "string" ||
    row.sequence_length !== row.sequence_text.length
  ) {
    throw new ResourceStorageIntegrityError("SQLite journal head is invalid");
  }
  parseJournalSequence(row.sequence_text as JournalSequence);
  return row.sequence_text as JournalSequence;
}

function loadResourcesByIDs(
  db: DatabaseSync,
  ids: ReadonlySet<IDString>,
): ResourceSnapshot[] {
  const statement = db.prepare(
    "SELECT id, snapshot_json, tombstoned, revision FROM resources WHERE id = ?",
  );
  return [...ids]
    .sort((left, right) => left.localeCompare(right))
    .map((id) => {
      const row = statement.get(id) as ResourceRow | undefined;
      if (row === undefined) {
        throw new ResourceStorageIntegrityError(
          "Committed journal references a missing Resource",
        );
      }
      return decodeResourceRow(row);
    });
}

function completeMetadataObservation(
  resources: readonly ResourceSnapshot[],
  payloadStates: readonly AssetPayloadState[],
): CoreMetadataCompleteObservation {
  if (!validateAssetStorageInvariants(resources, payloadStates)) {
    throw new ResourceStorageIntegrityError(
      "SQLite synchronized metadata violates Asset invariants",
    );
  }
  const generation = buildCompleteReadModelGeneration(resources, {
    payloadStates,
  });
  return Object.freeze({
    asset_readiness: Object.freeze(
      payloadStates
        .filter((state) => state.active_upload !== null)
        .map((state) =>
          Object.freeze({
            asset_id: state.asset_id,
            has_committed_representation: state.committed,
          }),
        )
        .sort((left, right) => left.asset_id.localeCompare(right.asset_id)),
    ),
    kind: "storage-complete" as const,
    observation_stamp: generation.observationStamp,
    resources: Object.freeze(resources.map(buildResourceSnapshot)),
  });
}

function observeStartupFromDatabase(db: DatabaseSync): {
  readonly complete: CoreMetadataCompleteObservation;
  readonly observed_head: JournalSequence | null;
} {
  const journal = loadJournal(db);
  validateContiguousJournal(journal);
  const resources = loadResources(db);
  const payloadStates = loadAssetPayloadStates(db);
  return Object.freeze({
    complete: completeMetadataObservation(resources, payloadStates),
    observed_head: journal.at(-1)?.sequence ?? null,
  });
}

function observeCommittedChangesFromDatabase(
  db: DatabaseSync,
  request: CommittedChangeObservationRequest,
): CommittedChangeObservation {
  const observedHead = readJournalHead(db);
  const cursor =
    request.after === null ? 0n : parseJournalSequence(request.after);
  const head = observedHead === null ? 0n : parseJournalSequence(observedHead);
  if (cursor > head) {
    throw new ResourceStorageIntegrityError(
      "Committed-change cursor is ahead of the observed journal head",
    );
  }
  const entries = loadJournalAfter(db, request.after);
  let expected = cursor + 1n;
  const operationIDs = new Set<IDString>();
  const affected = new Set<IDString>();
  for (const entry of entries) {
    if (
      parseJournalSequence(entry.sequence) !== expected ||
      operationIDs.has(entry.operation_id)
    ) {
      throw new ResourceStorageIntegrityError(
        "Committed-change range is not contiguous and unique",
      );
    }
    expected += 1n;
    operationIDs.add(entry.operation_id);
    entry.affected_resources.forEach((id) => affected.add(id));
  }
  if (expected !== head + 1n) {
    throw new ResourceStorageIntegrityError(
      "Committed-change range does not reach the observed journal head",
    );
  }
  if (entries.length === 0) {
    return Object.freeze({
      kind: "at-head" as const,
      observation_stamp: createObservationStamp(),
      observed_head: observedHead,
    });
  }
  if (
    entries.length > request.incremental_entry_limit ||
    affected.size > request.incremental_resource_limit
  ) {
    const resources = loadResources(db);
    const payloadStates = loadAssetPayloadStates(db);
    return Object.freeze({
      complete: completeMetadataObservation(resources, payloadStates),
      kind: "rebuild" as const,
      observed_head: observedHead,
      validated_range: "all-after-cursor-through-head" as const,
    });
  }
  return Object.freeze({
    entries: Object.freeze(entries.map(cloneCommittedOperationEntry)),
    kind: "delta" as const,
    observation_stamp: createObservationStamp(),
    observed_head: observedHead!,
    resources: Object.freeze(loadResourcesByIDs(db, affected)),
  });
}

function loadOperation(
  db: DatabaseSync,
  operationId: IDString,
): CommittedOperationEntry | null {
  const row = db
    .prepare(
      `SELECT sequence_text, sequence_length, operation_id, actor_id, type,
              committed_at, write_set_fingerprint, entry_json
         FROM journal WHERE operation_id = ?`,
    )
    .get(operationId) as JournalRow | undefined;
  return row === undefined ? null : decodeJournalRow(row);
}

function decodeJournalRow(row: JournalRow): CommittedOperationEntry {
  if (
    typeof row.sequence_text !== "string" ||
    typeof row.sequence_length !== "number" ||
    row.sequence_length !== row.sequence_text.length ||
    typeof row.operation_id !== "string" ||
    typeof row.actor_id !== "string" ||
    typeof row.type !== "string" ||
    typeof row.committed_at !== "number" ||
    typeof row.write_set_fingerprint !== "string" ||
    typeof row.entry_json !== "string"
  ) {
    throw new ResourceStorageIntegrityError("SQLite journal row is invalid");
  }
  parseJournalSequence(row.sequence_text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.entry_json);
  } catch {
    throw new ResourceStorageIntegrityError("SQLite journal JSON is invalid");
  }
  const entry = validateJournalEntry(parsed);
  if (
    entry.sequence !== row.sequence_text ||
    entry.operation_id !== row.operation_id ||
    entry.actor_id !== row.actor_id ||
    entry.type !== row.type ||
    entry.committed_at !== row.committed_at ||
    entry.write_set_fingerprint !== row.write_set_fingerprint ||
    canonicalResourceStorageJson(entry) !== row.entry_json
  ) {
    throw new ResourceStorageIntegrityError(
      "SQLite journal row does not match its canonical entry",
    );
  }
  return entry;
}

function validateJournalEntry(value: unknown): CommittedOperationEntry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ResourceStorageIntegrityError("SQLite journal entry is invalid");
  }
  const entry = value as Partial<CommittedOperationEntry>;
  if (
    entry.schema_version !== 1 ||
    typeof entry.sequence !== "string" ||
    parseJournalSequence(entry.sequence) < 1n ||
    !isIDString(entry.operation_id) ||
    !isIDString(entry.actor_id) ||
    !OPERATION_TYPES.has(entry.type as CommittedOperationEntry["type"]) ||
    !isTimestamp(entry.committed_at) ||
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
    throw new ResourceStorageIntegrityError("SQLite journal entry is invalid");
  }
  const assetOperation = entry.type?.startsWith("asset.") === true;
  const assetChanges = (
    entry as Partial<
      import("./resource-write-protocol.js").CommittedAssetOperationDraft
    >
  ).asset_changes;
  if (
    assetOperation
      ? !Array.isArray(assetChanges) ||
        assetChanges.length === 0 ||
        !hasCanonicalAssetChanges(assetChanges)
      : "asset_changes" in entry
  ) {
    throw new AssetStorageIntegrityError(
      "SQLite journal Asset changes are invalid",
    );
  }
  if (
    entry.affected_resources.length === 0 ||
    entry.affected_resources.length !== entry.changes.length ||
    new Set(entry.affected_resources).size !==
      entry.affected_resources.length ||
    entry.affected_resources.some(
      (id, index) => entry.changes?.[index]?.resource_id !== id,
    )
  ) {
    throw new ResourceStorageIntegrityError(
      "SQLite journal entry write-set is invalid",
    );
  }
  return cloneCommittedOperationEntry(entry as CommittedOperationEntry);
}

function createFullSession(
  root: ResolvedRoot,
  options: NormalizedOptions,
  initial: ConnectionState,
  releaseOwnership: () => void,
  uploadHandleAuthority: AssetUploadHandleAuthority,
): ResourceStorageSession {
  let connection = initial;
  let released = false;
  let releaseRequested = false;
  let releasePromise: Promise<void> | undefined;
  let transactionActive = false;
  let transactionSettling = false;
  let resolveTransactionSettlement: (() => void) | undefined;
  let transactionSettlement: Promise<void> | undefined;

  const assertActive = () => {
    if (released || releaseRequested) {
      throw new Error("Storage session is released");
    }
  };
  const reopen = () => {
    try {
      connection.db.close();
    } catch {
      // Reconciliation continues by opening a fresh connection.
    }
    connection = openFullConnection(root, options);
  };
  const finishTransaction = () => {
    transactionActive = false;
    transactionSettling = false;
    resolveTransactionSettlement?.();
    resolveTransactionSettlement = undefined;
  };

  const session: ResourceStorageSession = {
    recovery: initial.recovery,
    async *listResources() {
      assertActive();
      for (const resource of loadResources(connection.db)) {
        assertActive();
        yield resource;
      }
      assertActive();
    },
    async readResource(id) {
      assertActive();
      const row = connection.db
        .prepare(
          "SELECT id, snapshot_json, tombstoned, revision FROM resources WHERE id = ?",
        )
        .get(id) as ResourceRow | undefined;
      return row === undefined ? null : decodeResourceRow(row);
    },
    async *listAssetPayloadStates() {
      assertActive();
      for (const state of loadAssetPayloadStates(connection.db)) {
        assertActive();
        yield {
          active_upload:
            state.active_upload === null ? null : { ...state.active_upload },
          asset_id: state.asset_id,
          committed: state.committed,
        };
      }
      assertActive();
    },
    async begin(operationId) {
      assertActive();
      if (transactionActive) throw new Error("A transaction is already active");
      connection.db.exec("BEGIN IMMEDIATE");
      transactionActive = true;
      transactionSettling = false;
      transactionSettlement = new Promise<void>((resolveSettlement) => {
        resolveTransactionSettlement = resolveSettlement;
      });
      return createWriteTransaction(
        options,
        operationId,
        assertActive,
        () => connection.db,
        reopen,
        () => {
          transactionSettling = true;
        },
        finishTransaction,
      );
    },
    async *readCommittedOperationsAfter(cursor) {
      assertActive();
      const entries = loadJournal(connection.db);
      let start = 0;
      if (cursor !== null) {
        const parsed = parseJournalSequence(cursor);
        if (parsed > BigInt(entries.length)) {
          throw new ResourceStorageIntegrityError(
            "Journal cursor is ahead of head",
          );
        }
        start = Number(parsed);
      }
      for (const entry of entries.slice(start)) {
        assertActive();
        yield cloneCommittedOperationEntry(entry);
      }
      assertActive();
    },
    async release() {
      if (releasePromise !== undefined) return releasePromise;
      releaseRequested = true;
      releasePromise = (async () => {
        if (transactionActive && transactionSettling) {
          await transactionSettlement;
        }
        try {
          if (connection.db.isTransaction) connection.db.exec("ROLLBACK");
          if (transactionActive) finishTransaction();
          connection.db.close();
        } finally {
          released = true;
          releaseOwnership();
        }
      })();
      return releasePromise;
    },
  };

  return attachAssetUploadSessionCapability(session, {
    ownsHandle(handle) {
      return isAssetUploadHandle(handle, uploadHandleAuthority);
    },
    issueHandle(resourceId, assetId, uploadId) {
      assertActive();
      return createAssetUploadHandle(
        {
          asset_id: assetId,
          resource_id: resourceId,
          upload_id: uploadId,
        },
        uploadHandleAuthority,
      );
    },
    async resolveActiveUpload(resourceId, assetId) {
      assertActive();
      if (transactionActive) {
        throw new Error("Cannot resolve an Asset upload during a transaction");
      }
      return resolveActiveUploadHandle(
        connection.db,
        resourceId,
        assetId,
        uploadHandleAuthority,
      );
    },
    async stageBytes(handle, bytes) {
      assertActive();
      if (transactionActive) {
        throw new Error("Cannot stage Asset bytes during a transaction");
      }
      if (!isAssetUploadHandle(handle, uploadHandleAuthority)) return null;
      validateAssetUploadBytes(bytes);
      const active = resolveActiveUploadHandle(
        connection.db,
        handle.resource_id,
        handle.asset_id,
        uploadHandleAuthority,
      );
      if (active?.upload_id !== handle.upload_id) return null;
      if (handle.upload_id === handle.asset_id) {
        throw new AssetStorageIntegrityError(
          "SQLite Asset upload identity collides with its Asset",
        );
      }
      const digest = assetUploadDigest(bytes);
      const db = connection.db;
      db.exec("BEGIN IMMEDIATE");
      try {
        options.faults?.hit("asset-upload.stage.before-write");
        db.prepare("DELETE FROM payloads WHERE payload_id = ?").run(
          handle.upload_id,
        );
        db.prepare(
          "INSERT INTO payloads(payload_id, digest, byte_length) VALUES (?, ?, ?)",
        ).run(handle.upload_id, digest, bytes.byteLength);
        const insert = db.prepare(
          "INSERT INTO payload_chunks(payload_id, chunk_index, bytes) VALUES (?, ?, ?)",
        );
        for (
          let offset = 0, chunkIndex = 0;
          offset < bytes.byteLength;
          offset += ASSET_UPLOAD_CHUNK_BYTES, chunkIndex += 1
        ) {
          insert.run(
            handle.upload_id,
            chunkIndex,
            bytes.subarray(offset, offset + ASSET_UPLOAD_CHUNK_BYTES),
          );
        }
        options.faults?.hit("asset-upload.stage.after-write");
        db.exec("COMMIT");
        options.faults?.hit("asset-upload.stage.after-commit");
        return Object.freeze({
          byte_length: bytes.byteLength,
          digest,
        });
      } catch (error) {
        if (db.isTransaction) db.exec("ROLLBACK");
        throw normalizeSqliteIntegrityError(error);
      }
    },
    async inspectStagedUpload(handle) {
      assertActive();
      if (transactionActive) {
        throw new Error("Cannot inspect Asset bytes during a transaction");
      }
      if (!isAssetUploadHandle(handle, uploadHandleAuthority)) return null;
      const active = resolveActiveUploadHandle(
        connection.db,
        handle.resource_id,
        handle.asset_id,
        uploadHandleAuthority,
      );
      if (active?.upload_id !== handle.upload_id) return null;
      return loadPayloadBytes(connection.db, handle.upload_id)?.staged ?? null;
    },
    async readCommitted(resourceId, assetId) {
      assertActive();
      if (transactionActive) {
        throw new Error("Cannot read Asset bytes during a transaction");
      }
      if (!resourceOwnsAsset(connection.db, resourceId, assetId)) return null;
      const payload = loadPayloadBytes(connection.db, assetId);
      return payload === null ? null : new Uint8Array(payload.bytes);
    },
  });
}

function createWriteTransaction(
  options: NormalizedOptions,
  operationId: IDString,
  assertSessionActive: () => void,
  currentDb: () => DatabaseSync,
  reopen: () => void,
  startSettling: () => void,
  finish: () => void,
): ResourceWriteTransaction {
  const staged = new Map<IDString, ResourceSnapshot>();
  const stagedAssetChanges = new Map<IDString, AssetLogicalChange>();
  let settled = false;

  return {
    async stageResource(resource) {
      assertSessionActive();
      if (settled) throw new Error("Transaction is no longer active");
      const detached = buildResourceSnapshot(resource);
      staged.set(detached.data.id, detached);
    },
    async stageAssetChange(change) {
      assertSessionActive();
      if (settled) throw new Error("Transaction is no longer active");
      if (stagedAssetChanges.has(change.asset_id)) {
        throw new AssetStorageIntegrityError(
          "Asset change is staged more than once",
        );
      }
      stagedAssetChanges.set(change.asset_id, cloneAssetLogicalChange(change));
    },
    async commit(draft) {
      assertSessionActive();
      if (settled) throw new Error("Transaction is no longer active");
      if (draft.operation_id !== operationId) {
        throw new ResourceStorageIntegrityError(
          "Operation ID does not match transaction",
        );
      }
      const resources = [...staged.values()];
      const assetChanges = [...stagedAssetChanges.values()].sort(
        (left, right) =>
          left.asset_id < right.asset_id
            ? -1
            : left.asset_id > right.asset_id
              ? 1
              : 0,
      );
      if (resources.length === 0) {
        throw new ResourceStorageIntegrityError(
          "Transaction has no staged Resource",
        );
      }
      validateDraftDescribesWriteSet(draft, resources, assetChanges);
      const db = currentDb();
      const existing = loadOperation(db, operationId);
      if (existing !== null) {
        if (!equalCommittedOperationDrafts(existing, draft)) {
          throw new ResourceStorageIntegrityError(
            "Operation ID integrity mismatch",
          );
        }
        db.exec("ROLLBACK");
        settled = true;
        finish();
        return existing;
      }

      const sequence = nextSequence(db);
      const entry: CommittedOperationEntry = {
        ...cloneDraft(draft),
        sequence,
      };
      startSettling();
      try {
        options.faults?.hit("transaction.before-write");
        writeResources(db, resources);
        options.faults?.hit("transaction.after-resource-write");
        writeAssetPayloadChanges(db, assetChanges);
        if (
          !validateAssetStorageInvariants(
            loadResources(db),
            loadAssetPayloadStates(db),
          )
        ) {
          throw new AssetStorageIntegrityError(
            "SQLite staged Asset state is invalid",
          );
        }
        writeJournal(db, entry);
        options.faults?.hit("transaction.after-journal-write");
        options.faults?.hit("transaction.before-commit");
        db.exec("COMMIT");
        options.faults?.hit("transaction.after-commit");
        const verified = loadOperation(db, operationId);
        if (
          verified === null ||
          !equalCommittedOperationDrafts(verified, draft)
        ) {
          throw new ResourceStorageIntegrityError(
            "Committed operation cannot be verified",
          );
        }
        settled = true;
        finish();
        return verified;
      } catch (error) {
        try {
          const reconciled = await reconcileCommit(
            options,
            operationId,
            draft,
            currentDb,
            reopen,
            error,
          );
          settled = true;
          finish();
          return reconciled;
        } catch (reconciliationError) {
          settled = true;
          finish();
          if (reconciliationError instanceof ProvenAbsentCommitError) {
            throw reconciliationError.cause;
          }
          throw reconciliationError;
        }
      }
    },
    async abort() {
      assertSessionActive();
      if (settled) return;
      settled = true;
      try {
        const db = currentDb();
        if (db.isTransaction) db.exec("ROLLBACK");
      } finally {
        finish();
      }
    },
  };
}

function validateDraftDescribesWriteSet(
  draft: CommittedOperationDraft,
  resources: readonly ResourceSnapshot[],
  stagedAssetChanges: readonly AssetLogicalChange[] = [],
): void {
  const ids = resources.map((resource) => resource.data.id);
  const assetChanges =
    "asset_changes" in draft ? draft.asset_changes : undefined;
  if (
    computeResourceWriteSetFingerprint(resources, assetChanges) !==
      draft.write_set_fingerprint ||
    draft.affected_resources.length !== ids.length ||
    draft.changes.length !== ids.length ||
    ids.some(
      (id, index) =>
        draft.affected_resources[index] !== id ||
        draft.changes[index]?.kind !== "resource.upsert" ||
        draft.changes[index]?.resource_id !== id,
    ) ||
    (assetChanges === undefined
      ? stagedAssetChanges.length !== 0
      : assetChanges.length === 0 ||
        !hasCanonicalAssetChanges(assetChanges) ||
        canonicalResourceStorageJson(assetChanges) !==
          canonicalResourceStorageJson(stagedAssetChanges))
  ) {
    throw new ResourceStorageIntegrityError(
      "Committed draft does not describe the staged write-set",
    );
  }
}

function cloneDraft(draft: CommittedOperationDraft): CommittedOperationDraft {
  return cloneCommittedOperationDraft(draft);
}

function writeAssetPayloadChanges(
  db: DatabaseSync,
  changes: readonly AssetLogicalChange[],
): void {
  for (const change of changes) {
    switch (change.payload_action.kind) {
      case "none":
        break;
      case "generation.create": {
        if (
          change.payload_action.upload_id === change.asset_id ||
          db
            .prepare("SELECT 1 AS present FROM payloads WHERE payload_id = ?")
            .get(change.payload_action.upload_id) !== undefined
        ) {
          throw new AssetStorageIntegrityError(
            "SQLite Asset upload identity collides with payload state",
          );
        }
        db.prepare(
          `INSERT INTO asset_upload_generations(
             asset_id, upload_id, replaces_committed
           ) VALUES (?, ?, ?)`,
        ).run(
          change.asset_id,
          change.payload_action.upload_id,
          Number(change.state_after === "replacement-uploading"),
        );
        break;
      }
      case "generation.discard": {
        db.prepare("DELETE FROM payloads WHERE payload_id = ?").run(
          change.payload_action.upload_id,
        );
        const result = db
          .prepare(
            "DELETE FROM asset_upload_generations WHERE asset_id = ? AND upload_id = ?",
          )
          .run(change.asset_id, change.payload_action.upload_id);
        if (result.changes !== 1) {
          throw new AssetStorageIntegrityError(
            "SQLite Asset generation discard did not match active state",
          );
        }
        break;
      }
      case "payload.delete": {
        const result = db
          .prepare("DELETE FROM payloads WHERE payload_id = ?")
          .run(change.asset_id);
        if (result.changes !== 1) {
          throw new AssetStorageIntegrityError(
            "SQLite Asset payload delete did not match committed state",
          );
        }
        break;
      }
      case "payload.delete-and-generation.discard": {
        db.prepare("DELETE FROM payloads WHERE payload_id = ?").run(
          change.payload_action.upload_id,
        );
        const generation = db
          .prepare(
            "DELETE FROM asset_upload_generations WHERE asset_id = ? AND upload_id = ?",
          )
          .run(change.asset_id, change.payload_action.upload_id);
        const payload = db
          .prepare("DELETE FROM payloads WHERE payload_id = ?")
          .run(change.asset_id);
        if (generation.changes !== 1 || payload.changes !== 1) {
          throw new AssetStorageIntegrityError(
            "SQLite Asset payload/generation delete did not match state",
          );
        }
        break;
      }
      case "generation.publish": {
        const generation = db
          .prepare(
            "SELECT upload_id, replaces_committed FROM asset_upload_generations WHERE asset_id = ?",
          )
          .get(change.asset_id);
        if (
          generation?.["upload_id"] !== change.payload_action.upload_id ||
          generation["replaces_committed"] !==
            Number(change.payload_action.replaces_committed)
        ) {
          throw new AssetStorageIntegrityError(
            "SQLite Asset generation publication did not match active state",
          );
        }
        const staged = loadPayloadBytes(db, change.payload_action.upload_id);
        if (staged === null) {
          throw new AssetStorageIntegrityError(
            "SQLite Asset generation publication is incomplete",
          );
        }
        const removedCommitted = db
          .prepare("DELETE FROM payloads WHERE payload_id = ?")
          .run(change.asset_id);
        if (
          removedCommitted.changes !==
          Number(change.payload_action.replaces_committed)
        ) {
          throw new AssetStorageIntegrityError(
            "SQLite Asset generation replacement state is invalid",
          );
        }
        const inserted = db
          .prepare(
            `INSERT INTO payloads(payload_id, digest, byte_length)
             SELECT ?, digest, byte_length FROM payloads WHERE payload_id = ?`,
          )
          .run(change.asset_id, change.payload_action.upload_id);
        if (inserted.changes !== 1) {
          throw new AssetStorageIntegrityError(
            "SQLite Asset generation publication payload is missing",
          );
        }
        db.prepare(
          "UPDATE payload_chunks SET payload_id = ? WHERE payload_id = ?",
        ).run(change.asset_id, change.payload_action.upload_id);
        const removedStaged = db
          .prepare("DELETE FROM payloads WHERE payload_id = ?")
          .run(change.payload_action.upload_id);
        const removedGeneration = db
          .prepare(
            "DELETE FROM asset_upload_generations WHERE asset_id = ? AND upload_id = ?",
          )
          .run(change.asset_id, change.payload_action.upload_id);
        if (removedStaged.changes !== 1 || removedGeneration.changes !== 1) {
          throw new AssetStorageIntegrityError(
            "SQLite Asset generation publication cleanup is invalid",
          );
        }
        break;
      }
    }
  }
}

function nextSequence(db: DatabaseSync): JournalSequence {
  const row = db
    .prepare(
      "SELECT sequence_text FROM journal ORDER BY sequence_length DESC, sequence_text DESC LIMIT 1",
    )
    .get();
  if (row === undefined) return journalSequence(1n);
  const current = row["sequence_text"];
  if (typeof current !== "string") {
    throw new ResourceStorageIntegrityError("Journal head is invalid");
  }
  return journalSequence(parseJournalSequence(current) + 1n);
}

function writeResources(
  db: DatabaseSync,
  resources: readonly ResourceSnapshot[],
): void {
  const statement = db.prepare(`
    INSERT INTO resources(id, snapshot_json, tombstoned, revision)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET
      snapshot_json = excluded.snapshot_json,
      tombstoned = excluded.tombstoned,
      revision = resources.revision + 1
  `);
  for (const resource of resources) {
    statement.run(
      resource.data.id,
      canonicalResourceStorageJson(resource),
      Number(resource.data.is_deleted),
    );
  }
}

function writeJournal(db: DatabaseSync, entry: CommittedOperationEntry): void {
  db.prepare(
    `INSERT INTO journal(
       sequence_text, sequence_length, operation_id, actor_id, type,
       committed_at, write_set_fingerprint, entry_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    entry.sequence,
    entry.sequence.length,
    entry.operation_id,
    entry.actor_id,
    entry.type,
    entry.committed_at,
    entry.write_set_fingerprint,
    canonicalResourceStorageJson(entry),
  );
}

async function reconcileCommit(
  options: NormalizedOptions,
  operationId: IDString,
  draft: CommittedOperationDraft,
  currentDb: () => DatabaseSync,
  reopen: () => void,
  originalError: unknown,
): Promise<CommittedOperationEntry> {
  let mustReopen = false;
  for (;;) {
    try {
      if (mustReopen) {
        options.faults?.hit("reconciliation.before-reopen");
        reopen();
        mustReopen = false;
      }
      const db = currentDb();
      if (db.isTransaction) db.exec("ROLLBACK");
      options.faults?.hit("reconciliation.before-query");
      const existing = loadOperation(db, operationId);
      if (existing === null) throw new ProvenAbsentCommitError(originalError);
      if (!equalCommittedOperationDrafts(existing, draft)) {
        throw new ResourceStorageIntegrityError(
          "Reconciled operation does not match its draft",
        );
      }
      return existing;
    } catch (error) {
      if (
        error instanceof ProvenAbsentCommitError ||
        error instanceof ResourceStorageIntegrityError
      ) {
        throw error;
      }
      mustReopen = true;
      await delay(options.reconciliationDelayMs);
    }
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function normalizeSqliteIntegrityError(error: unknown): unknown {
  if (error instanceof ResourceStorageIntegrityError) return error;
  if (
    typeof error === "object" &&
    error !== null &&
    (("errcode" in error && (error.errcode === 11 || error.errcode === 26)) ||
      ("code" in error &&
        (error.code === "ERR_SQLITE_CORRUPT" ||
          error.code === "ERR_SQLITE_NOTADB")))
  ) {
    return new ResourceStorageIntegrityError("SQLite database is corrupt");
  }
  return error;
}

function normalizeSqliteSessionAcquireError(error: unknown): unknown {
  const normalized = normalizeSqliteIntegrityError(error);
  if (normalized instanceof ResourceRuntimeIntegrityError) return normalized;
  if (typeof normalized === "object" && normalized !== null) {
    if (
      ("errcode" in normalized &&
        (normalized.errcode === 5 || normalized.errcode === 6)) ||
      ("code" in normalized &&
        (normalized.code === "ERR_SQLITE_BUSY" ||
          normalized.code === "ERR_SQLITE_LOCKED"))
    ) {
      return new ResourceStorageSessionTransientError("lock");
    }
    if (
      ("errcode" in normalized && normalized.errcode === 14) ||
      ("code" in normalized && normalized.code === "ERR_SQLITE_CANTOPEN")
    ) {
      return new ResourceStorageSessionTransientError("unavailable");
    }
  }
  return normalized;
}

export function inspectLocalSqliteProfile(rootPath: string): Readonly<{
  databasePath: string;
  databaseBytes: number;
  rollbackJournalPresent: boolean;
}> {
  const root = resolveStorageRoot(
    normalizeOptions({
      profile: "candidate-local-filesystem",
      rootPath,
    }),
  );
  return Object.freeze({
    databasePath: root.databasePath,
    databaseBytes: statSync(root.databasePath).size,
    rollbackJournalPresent: existsSync(root.journalPath),
  });
}
