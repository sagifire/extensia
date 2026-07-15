import { existsSync, lstatSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { isIDString, isTimestamp, type IDString } from "../domain/scalars.js";
import {
  buildResourceSnapshot,
  type ResourceSnapshot,
} from "../domain/snapshots.js";
import type { ReadonlyResourceDriver } from "../public/contracts.js";
import type { FullResourceDriverAdapter } from "./full-resource-driver-adapter.js";
import {
  canonicalResourceStorageJson,
  cloneCommittedOperationEntry,
  computeResourceWriteSetFingerprint,
  equalCommittedOperationDrafts,
  journalSequence,
  parseJournalSequence,
  ResourceStorageIntegrityError,
  validateContiguousJournal,
} from "./resource-journal-integrity.js";
import type {
  CommittedOperationDraft,
  CommittedOperationEntry,
  JournalSequence,
  ResourceRecoveryReport,
  ResourceStorageSession,
  ResourceWriteTransaction,
} from "./resource-write-protocol.js";

const APPLICATION_ID = 1_163_416_625;
const FORMAT = "extensia-local-sqlite";
const FORMAT_VERSION = 1;
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
INSERT INTO storage_format(singleton, format, version)
VALUES (1, '${FORMAT}', ${FORMAT_VERSION});
PRAGMA application_id = ${APPLICATION_ID};
PRAGMA user_version = ${FORMAT_VERSION};
`;

const EXPECTED_TABLES = new Map<string, readonly ColumnSpec[]>([
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
  | "reconciliation.before-reopen"
  | "reconciliation.before-query"
  | "readonly.after-open";

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

  return Object.freeze({
    mode: "full" as const,
    async open() {
      if (openedRoot !== null) throw new Error("Driver is already open");
      openedRoot = resolveStorageRoot(options);
    },
    async close() {
      if (sessionActive) throw new Error("Cannot close with an active session");
      openedRoot = null;
    },
    async acquireStorageSession(signal?: AbortSignal) {
      if (openedRoot === null) throw new Error("Driver is not open");
      if (sessionActive) throw new Error("Driver already owns a session");
      if (signal?.aborted === true) throw signal.reason;

      sessionActive = true;
      let connection: ConnectionState | null = null;
      try {
        connection = openFullConnection(openedRoot, options);
        options.faults?.hit("session.after-lock");
        return createFullSession(openedRoot, options, connection, () => {
          sessionActive = false;
        });
      } catch (error) {
        connection?.db.close();
        sessionActive = false;
        throw normalizeSqliteIntegrityError(error);
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

  return Object.freeze({
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
        validateDatabase(candidate);
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
  return {
    rootPath: input.rootPath,
    timeoutMs,
    reconciliationDelayMs,
    profile,
    ...(input.faults === undefined ? {} : { faults: input.faults }),
    ...(input.verifyFilesystemProfile === undefined
      ? {}
      : { verifyFilesystemProfile: input.verifyFilesystemProfile }),
  };
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

function validateDatabase(db: DatabaseSync): void {
  try {
    validateDatabaseState(db);
  } catch (error) {
    if (error instanceof ResourceStorageIntegrityError) throw error;
    throw new ResourceStorageIntegrityError(
      "SQLite profile state cannot be validated",
    );
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
  assertPayloadSeamEmpty(db);
  const resources = loadResources(db);
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

function validateSchema(db: DatabaseSync): void {
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
  const expectedNames = [...EXPECTED_TABLES.keys()].sort();
  if (
    tables.length !== expectedNames.length ||
    tables.some((name, index) => name !== expectedNames[index])
  ) {
    throw new ResourceStorageIntegrityError("SQLite schema tables are invalid");
  }
  for (const [table, expectedColumns] of EXPECTED_TABLES) {
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
      normalizeSchemaSql(EXPECTED_TABLE_SQL.get(table)!)
    ) {
      throw new ResourceStorageIntegrityError(
        `SQLite ${table} constraints are invalid`,
      );
    }
  }
}

function normalizeSchemaSql(sql: string): string {
  return sql.toLowerCase().replaceAll(/\s+/g, "");
}

function assertPayloadSeamEmpty(db: DatabaseSync): void {
  const payloads = db.prepare("SELECT count(*) AS count FROM payloads").get();
  const chunks = db
    .prepare("SELECT count(*) AS count FROM payload_chunks")
    .get();
  if (payloads?.["count"] !== 0 || chunks?.["count"] !== 0) {
    throw new ResourceStorageIntegrityError(
      "SQLite opaque payload state is not active in P4-WP1",
    );
  }
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

  return {
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
  let settled = false;

  return {
    async stageResource(resource) {
      assertSessionActive();
      if (settled) throw new Error("Transaction is no longer active");
      const detached = buildResourceSnapshot(resource);
      staged.set(detached.data.id, detached);
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
      if (resources.length === 0) {
        throw new ResourceStorageIntegrityError(
          "Transaction has no staged Resource",
        );
      }
      validateDraftDescribesWriteSet(draft, resources);
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
): void {
  const ids = resources.map((resource) => resource.data.id);
  if (
    computeResourceWriteSetFingerprint(resources) !==
      draft.write_set_fingerprint ||
    draft.affected_resources.length !== ids.length ||
    draft.changes.length !== ids.length ||
    ids.some(
      (id, index) =>
        draft.affected_resources[index] !== id ||
        draft.changes[index]?.kind !== "resource.upsert" ||
        draft.changes[index]?.resource_id !== id,
    )
  ) {
    throw new ResourceStorageIntegrityError(
      "Committed draft does not describe the staged write-set",
    );
  }
}

function cloneDraft(draft: CommittedOperationDraft): CommittedOperationDraft {
  return {
    actor_id: draft.actor_id,
    affected_resources: [...draft.affected_resources],
    changes: draft.changes.map((change) => ({ ...change })),
    committed_at: draft.committed_at,
    operation_id: draft.operation_id,
    schema_version: 1,
    type: draft.type,
    write_set_fingerprint: draft.write_set_fingerprint,
  };
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
