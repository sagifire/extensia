# Client-server transactional Storage Driver family

Status: completed design research
Related Task: [TASK-07.26-0042](../../tasks/plan/TASK-07.26-0042-client-server-sql-storage-driver-design/task.md)
Related Run: [RUN-001](../../tasks/plan/TASK-07.26-0042-client-server-sql-storage-driver-design/RUN-001/result.md)
Task-local Research: [RSCH-001](../../tasks/plan/TASK-07.26-0042-client-server-sql-storage-driver-design/RSCH-001.md)
Date: 2026-07-15

## Executive verdict

PostgreSQL і MySQL можуть реалізувати одну сім’ю `client-server-transactional`, але не один physical driver. Спільними є semantic commit, logical schema, operation-level idempotency, reconciliation state machine, recovery-before-ready та conformance suite. SQL dialect, lock primitive, durability/configuration gate, DDL migration і session reset належать окремим vendor profiles.

Рекомендована послідовність: спочатку bounded shared `indeterminate commit` conformance foundation без vendor dependency, потім окремий PostgreSQL owner/implementation/certification slice, після нього окремий MySQL 8.4 LTS owner/implementation/certification slice. PostgreSQL є першим proof target через transactional DDL і transaction-scoped advisory-lock option; це sequencing рішення, а не вибір default production dependency.

## Evidence boundary

Primary sources перевірено 2026-07-15. PostgreSQL current documentation відповідає version 18; підтримувані major versions — 14–18, але profile certification прив’язується до exact current minor кожного major. MySQL design обмежено LTS series 8.4 та InnoDB.

Executable server probes в RUN-001 не виконувалися: workspace не має `docker`, `podman`, `psql`, `mysql` або `pg_isready`, а встановлення dependency/server виходить за scope. Тому design claims мають рівень primary-documentation + logical proof; production support виникає тільки після downstream executable certification.

## Primary sources

### PostgreSQL

- Version policy: <https://www.postgresql.org/support/versioning/>.
- Transaction isolation: <https://www.postgresql.org/docs/current/transaction-iso.html>.
- Explicit/advisory locks: <https://www.postgresql.org/docs/current/explicit-locking.html>.
- Advisory functions: <https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS>.
- Transaction access/isolation: <https://www.postgresql.org/docs/current/sql-set-transaction.html>.
- WAL durability settings: <https://www.postgresql.org/docs/current/runtime-config-wal.html>.
- Connection/transaction status limitation: <https://www.postgresql.org/docs/current/libpq-status.html>.

### MySQL

- LTS/Innovation policy: <https://dev.mysql.com/doc/refman/8.4/en/mysql-releases.html>.
- InnoDB transaction isolation: <https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html>.
- Locking reads: <https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html>.
- `GET_LOCK()` lifecycle: <https://dev.mysql.com/doc/refman/8.4/en/locking-functions.html>.
- Transaction control/read-only: <https://dev.mysql.com/doc/refman/8.4/en/commit.html>.
- InnoDB error handling: <https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html>.
- InnoDB durability: <https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_flush_log_at_trx_commit>.
- InnoDB doublewrite/torn-page recovery: <https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_doublewrite>.
- Binary-log durability: <https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html#sysvar_sync_binlog>.
- Atomic DDL vs implicit commit: <https://dev.mysql.com/doc/refman/8.4/en/atomic-ddl.html> and <https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html>.
- Connection reset semantics: <https://dev.mysql.com/doc/c-api/8.4/en/mysql-reset-connection.html>.
- Automatic reconnect hazards: <https://dev.mysql.com/doc/c-api/8.4/en/c-api-auto-reconnect.html>.

## Vendor evidence matrix

| Area | PostgreSQL | MySQL 8.4/InnoDB | Design consequence |
|---|---|---|---|
| Default isolation | `READ COMMITTED` | `REPEATABLE READ` | Profile explicitly sets isolation; pool defaults are never authority. |
| Strong isolation | SSI `SERIALIZABLE`, whole transaction may return `40001` | `SERIALIZABLE` adds locking behavior; deadlock/timeout semantics differ | Shared contract classifies vendor codes; does not equate algorithms. |
| Row lock | `SELECT ... FOR UPDATE` until transaction end | `SELECT ... FOR UPDATE` only inside transaction | Singleton control row serializes head allocation and mutation. |
| Advisory lock | session and transaction variants; transaction lock auto-releases at transaction end | `GET_LOCK()` is session-scoped, not released by commit/rollback | Storage session pins one physical connection; vendor release/reset differs. |
| Server session end | session advisory locks release | `GET_LOCK()` releases; client transport loss can leave the old server session/lock alive until detected | Client loss invalidates the handle but does not authorize immediate takeover. |
| Deadlock | transaction abort, retry whole transaction | deadlock rolls back whole transaction | Retry only with same `operation_id` after definite non-commit/reconciliation. |
| Lock timeout | configured statement/lock timeout; transaction state must be inspected/rolled back | default lock wait timeout rolls back statement, not necessarily whole transaction | Driver always explicitly rolls back/discards connection before definite retry. |
| Readonly | `READ ONLY`; `SERIALIZABLE READ ONLY DEFERRABLE` optional | `START TRANSACTION READ ONLY`; temporary-table exception exists | Runtime credential denies writes; transaction flag is defense-in-depth. |
| DDL | ordinary DDL is transaction-aware | atomic DDL is not transactional DDL and implicitly commits | Migration executors and cut-point proofs are vendor-specific. |
| Local durability | `fsync=on`, `full_page_writes=on`, per-operation `synchronous_commit=on` | `innodb_flush_log_at_trx_commit=1`, `innodb_doublewrite=ON`; if binlog enabled, `sync_binlog=1` | Open/certification probe verifies effective settings, not defaults alone; atomic-write replacement needs separate exact certificate. |
| Pool close/reset | dedicated gated control connection is never reset/handed off while open; after stop+drain, explicitly release/verify gate, then `DISCARD ALL`/equivalent | after stop+drain, explicitly `RELEASE_LOCK()`/verify, then protocol reset; reset itself releases `GET_LOCK()` | Unexpected reset/backend change while ready is gate loss → fail-close/destroy; only post-release clean connection may return to pool. |
| Failover | server/session locks are instance-local | `GET_LOCK()` is one-`mysqld` only | Certified single-primary topology and external fencing are prerequisites. |

## Alternatives

### A. One SQL implementation for both vendors

Відхилено. Спільний lowest-common-denominator приховав би isolation, DDL, error, advisory-lock і session-reset differences та зробив configuration proof нечесним.

### B. Vendor drivers without shared family contract

Відхилено. Це дублює semantic state machine й дає ризик різних значень commit/idempotency/journal.

### C. Durable time-based lease as writer authority

Відхилено для baseline. Server clock зменшує local-clock risk, але lease без topology fencing дозволяє старому primary або delayed owner писати після takeover. Lease може бути diagnostic/optimization лише після окремого fencing design.

### D. Session advisory lock only

Недостатньо. Він забезпечує cooperative exclusion на одному server instance, але не serializes journal head independently і не захищає від pool handoff mistakes.

### E. Runtime-lifetime advisory gate + transactional control-row lock

Прийнято для V1. Driver `open()` pin-ить dedicated control connection і тримає один exclusive vendor advisory gate до `close()` у full та readonly modes. Це серіалізує runtime/migration lifecycle; operation session reuse-ить gated connection, а singleton row lock всередині кожної write transaction serializes committed head. Migrator бере той самий gate лише offline. V1 дозволяє один active runtime на storage; multi-instance/shared gate deferred до Phase 5. Втрата control session fail-close-ить runtime і запускає reconciliation/restart, а не lease takeover.

## Shared logical storage model

Усі назви нижче logical; exact quoting/schema namespace визначає vendor profile.

| Relation | Authority |
|---|---|
| `storage_control` | singleton: storage UUID, profile/format version, migration state, journal head |
| `resource_snapshot` | canonical detached Resource bytes + hash, keyed by canonical UUID |
| `payload_chunk` | immutable bytes/chunk hash keyed by payload UUID + ordinal |
| `operation_journal` | exactly one committed row per semantic operation: sequence, operation ID, actor, type, timestamp, fingerprint, canonical journal bytes |
| `operation_resource` | ordered affected Resource IDs when normalized relation is preferable to one canonical blob |

Canonical JSON/journal bytes і SHA-256 fingerprint обчислює Extensia; vendor JSON types не є equality authority. IDs зберігаються в exact canonical representation. Journal sequence виділяється як `storage_control.journal_head + 1` під row lock; PostgreSQL sequences і MySQL auto-increment не використовуються, бо gap-free semantic sequence є contract requirement.

Metadata, payload chunks/actions, snapshots, operation relations, рівно один `operation_journal` row і новий journal head входять в одну vendor transaction. DDL, migrations, advisory lock acquisition/release і cleanup поза нею.

### V1 physical type profile

Logical constraints однакові, але DDL окремий. Exact names можуть отримати safe constant prefix у vendor owner gate; meaning/type mapping не змінюється без format-version gate.

| Logical field | PostgreSQL profile | MySQL 8.4 profile | Exact rule |
|---|---|---|---|
| UUID | native `uuid` | `BINARY(16)` | RFC 4122 network-byte order; adapter round-trips lowercase canonical UUID |
| canonical bytes | `bytea` | `LONGBLOB` | vendor JSON/text collation не є authority |
| SHA-256 | `bytea CHECK (octet_length(v)=32)` | `BINARY(32)` | exact 32 bytes |
| journal sequence/head | `numeric(20,0)` | `DECIMAL(20,0)` | `0..99999999999999999999`; row sequence `>0`; exhaustion fail-close |
| timestamp | `bigint` | `BIGINT` | JavaScript safe integer Unix ms check |
| ordinal/count | `integer` | `INT UNSIGNED` | nonnegative bounded by profile limits |
| profile/type/state | `text` + `CHECK` | ASCII `VARCHAR` with binary collation + `CHECK` | exact enum bytes, no case folding |

Required relations/constraints:

- `storage_control`: singleton primary/check key `1`; unique storage UUID; exact profile/format/migration enum; head nonnegative; PostgreSQL persisted signed `bigint advisory_lock_key` unique within the Extensia lock catalog, allocated transactionally; MySQL advisory name is exact ASCII `extensia:<canonical-storage-uuid>` (45 chars).
- `resource_snapshot`: UUID primary key, canonical bytes, 32-byte hash; no vendor-generated JSON normalization.
- `payload_chunk`: `(payload_id, ordinal)` primary key, bytes, byte length and hash; maximum chunk/count/transaction limits are certificate values.
- `operation_journal`: unique positive sequence, unique operation UUID, actor UUID, exact type, safe timestamp, 32-byte fingerprint and canonical journal bytes; unique operation ID is the reconciliation lookup.
- `operation_resource`: `(operation_id, ordinal)` primary key plus resource UUID foreign keys where the exact lifecycle permits; ordering is explicit, never collation-derived.

All MySQL relations explicitly declare `ENGINE=InnoDB`; mixing engines is integrity/configuration failure. All foreign keys/indexes/checks are introspected at open. PostgreSQL unlogged/temp relations and MySQL vendor JSON/auto-increment are forbidden for committed authority.

## Write protocol

1. Driver `open()` checkout-ить dedicated physical control connection, capture-ить verified durability-lineage/server-incarnation identity, role, storage UUID/profile/schema, session cleanliness і durability settings.
2. Acquire bounded exclusive vendor runtime/migration advisory gate for storage UUID; record backend/thread identity і hold до `close()`. Full operations reuse this gated connection; readonly holds it without durable writes. Pool handoff заборонений.
3. Reconcile any pending local operation and complete recovery-before-ready checks.
4. Begin explicit read-write transaction with profile isolation.
5. Lock singleton `storage_control` row `FOR UPDATE`; revalidate format/migration state and head.
6. If `operation_id` exists: exact fingerprint/type/write-set match returns prior committed entry; mismatch is integrity failure.
7. Load latest committed state, validate prepared set, write metadata/payload changes and insert exactly one journal row at `head + 1`; update head.
8. Send `COMMIT` once. Acknowledged commit returns the exact journal entry. Definite pre-commit failure is rolled back and may be classified/retried.
9. Any transport loss/timeout/protocol uncertainty after commit send enters `indeterminate`; old connection is destroyed and no `ROLLBACK` claim is made.
10. Reconnect to a certified authoritative writable primary, verify storage identity and durability lineage, reacquire session lock and query `operation_id`: exact row means committed; absence proves not-committed only on the same verified durability lineage/server incarnation as the commit attempt, or when an exact topology certificate proves preservation of all possibly committed history across that promotion; mismatch means integrity failure; changed/unproved lineage, unavailable or role-unknown remains unsettled.
11. Core index publication happens only after committed reconciliation. Persistent inability to reconcile suspends settlement/intake/runtime; it never becomes ambiguous rejection.
12. Clean `close()` stops intake, drains operations, explicitly releases and verifies the lifecycle gate, then resets session state and returns the connection. Reset, auto-reconnect, backend/thread identity change or pool handoff before that point is gate loss: fail-close and destroy, never continue ready.

## Outcome state machine

| Cut point | Evidence | Outcome/action |
|---|---|---|
| Before transaction | no mutation sent | definite not-committed; bounded safe retry allowed |
| During staging, connection alive | SQL error + successful rollback | definite not-committed |
| During staging, connection lost | transaction cannot survive session, but topology must settle | reconnect/reconcile; absence proves not-committed only on same verified durability lineage |
| Before `COMMIT` send | local cancellation | rollback; not-committed |
| `COMMIT` acknowledged | returned entry matches draft | committed |
| Server rejects commit and connection remains usable | rollback/status plus authoritative operation lookup absent | not-committed; classify vendor error |
| Timeout/loss during or after commit | commit may have executed | `indeterminate`; destroy connection, never blind retry |
| Reconciliation finds matching operation | durable row + fingerprint | committed; publish exact result |
| Reconciliation finds no row | same verified durability lineage and recovery complete | not-committed; retry same operation ID/fingerprint permitted |
| Reconciliation finds no row after primary/lineage change | history continuity not proven | remain unsettled; no reject/retry until an exact failover certificate or original lineage resolves it |
| Reconciliation finds mismatch | same ID, different fingerprint/body | fatal integrity failure |
| No authoritative primary / storage unavailable | no truthful evidence | remain unsettled; fail readiness/intake, do not reject as not committed |

Process crash while unsettled leaves no second journal path: next startup scans/reconciles known locally planned operation where available and validates journal/control consistency. If the caller lost the operation ID with process memory, committed storage remains authoritative; startup rebuild includes it, while client-level deduplication remains outside current public API.

## Lock, session and failover rules

- PostgreSQL profile uses a collision-free persisted namespaced 64-bit session advisory key as the exclusive runtime/migration lifecycle gate. Transaction-level advisory lock may supplement migration steps but does not replace it.
- MySQL profile uses namespaced `GET_LOCK()` name no longer than 64 characters as the same exclusive lifecycle gate. `RELEASE_LOCK()` is mandatory before clean close; reset/destroy is mandatory on any uncertainty.
- Every SQL call asserts the captured backend PID/thread ID where feasible. Connection recreation is a new session and requires full acquire/recovery.
- `DISCARD ALL`, protocol reset and pool return are close-only after explicit gate release/verification. Any unexpected reset/session change while open is equivalent to losing writer/migration authority.
- Advisory locks coordinate cooperating Extensia drivers on one primary, not hostile SQL writers. Runtime credentials and schema privileges are the security boundary.
- Multi-primary, writable old-primary after failover, NDB Cluster, read-replica reconciliation and topology without externally enforced single-writer fencing are unsupported. Fencing alone does not prove commit-history continuity.
- Lock wait has bounded configured timeout. Client transport loss is not proof of server-session end; stale owner is resolved only by server-granted lock after confirmed session termination/external topology fencing, and timestamps never authorize takeover.
- Baseline absence-proof is same-lineage only. PostgreSQL/MySQL vendor gates must define an executable server-incarnation/authority-lineage token. A changed primary may prove commit by a matching row, але absence лишається unknown без topology certificate, який доводить preservation усієї possibly committed history для exact cut point.

## Isolation and retry classification

Baseline write transactions use explicit `SERIALIZABLE` for both profiles in the first certification because it gives a portable semantic target, while accepting different physical algorithms. A vendor owner gate may prove `READ COMMITTED` plus control-row/advisory locking equivalent for the exact access pattern; it may not silently relax isolation.

Retryable-before-settlement: connection acquisition failure before begin, lock-not-acquired, PostgreSQL `40001`/`40P01`, MySQL deadlock, and profile-approved transient server errors — only after rollback or same-lineage authoritative absence of `operation_id`. MySQL lock wait timeout requires full explicit rollback/discard because default behavior can roll back only the statement. Integrity, schema/profile mismatch, permission/configuration failure and operation-ID fingerprint mismatch are nonretryable. Transport error around commit always enters reconciliation first.

## Readonly

Readonly uses a read-only runtime credential, але `open()` спочатку бере той самий exclusive runtime/migration advisory gate на dedicated control connection і тримає до `close()`. Gate є non-durable coordination, не storage mutation. Startup у explicit read-only transaction бере coherent snapshot, validates schema/control/journal head і state, performs zero migrations/cleanup/repair, then releases transaction while retaining lifecycle gate. PostgreSQL may use `SERIALIZABLE READ ONLY DEFERRABLE`; MySQL uses explicit consistent read-only transaction. Temporary-table write exceptions are irrelevant because runtime credentials and allowed statement set prohibit them.

V1 допускає рівно один active full або readonly runtime на storage. Current local index visibility remains startup snapshot/local writes; external change sync і shared/multi-instance lifecycle gate are Phase 5. If migration/recovery/integrity work is required, readonly fails before ready.

## Schema lifecycle

`storage_control` contains exact format version and migration state. Runtime credentials have DML-only least privilege; a separate migrator credential owns DDL. No migration runs lazily inside an application operation. Migration is offline-only: migrator must acquire the same exclusive runtime-lifetime advisory gate, so no full/readonly runtime is open; after acquisition it revalidates role, lineage, schema and version before the first DDL.

PostgreSQL migration profile: session owner lock, explicit transaction for compatible DDL/data step, version update in the same transaction, crash rollback, then full validation.

MySQL migration profile: session `GET_LOCK()`, forward-only step ledger because DDL implicitly commits, one atomic-DDL step at a time, pre/postcondition and checksum per step, resumable recovery after each cut point, final version publication only after all steps validate. “Atomic DDL” must never be described as multi-statement transactional migration.

Concurrent startup: one party owns the exclusive lifecycle gate. A runtime that read `clean` cannot race migration before ready because migrator cannot acquire the gate until that runtime closes; a migrator rechecks state after gate acquisition. Downgrade/open of newer unknown format fails closed. Backup/restore and replication operations remain deployment responsibilities, not hidden migration mechanisms.

## Capability boundary

### Shared mandatory gate

- Exact vendor/profile/version certificate and current patch level.
- Dedicated schema/database with immutable storage UUID; all tables use one transactional durability domain.
- Authoritative writable primary plus verified durability-lineage/server-incarnation token for writes and reconciliation; TLS/auth configuration is host responsibility but secrets never enter diagnostics.
- Runtime DML and separate migrator privileges; no application DDL.
- Server/session timeouts, isolation, encoding/collation, SQL mode and durability variables verified on every open.
- Pool supports exclusive pinned control connection, disables unsafe auto-reconnect, forbids reset/handoff while open, and proves `stop intake → drain → explicit release/verify → reset → return`; uncertain/gate-lost sessions are destroyed.
- V1 certificate enforces exactly one active full/readonly runtime or migrator per storage; lifecycle lock loss synchronously closes intake/readiness.

### PostgreSQL candidate boundary

- Candidate majors 16, 17, 18 at latest minor; each major/minor/topology is separately certified. PostgreSQL 14/15 are not baseline targets despite current upstream support, to bound the matrix; adding them is a certificate change.
- `fsync=on`, `full_page_writes=on`, operation `synchronous_commit=on`; unlogged/temp relations forbidden.
- Direct writable-primary connection. Baseline absence-proof is limited to the same verified server lineage/incarnation. Synchronous failover/replication durability and cross-primary absence-proof require a separate topology certificate; baseline makes no zero-data-loss failover claim.

### MySQL candidate boundary

- MySQL 8.4 LTS at a certified 8.4.x patch; InnoDB for every table, strict SQL mode and exact binary/canonical collation choices.
- `innodb_flush_log_at_trx_commit=1`, `innodb_doublewrite=ON`; if binary logging is enabled, `sync_binlog=1`. `DETECT_ONLY`/`OFF` are unsupported; a hardware atomic-write replacement is allowed only under a separate exact device/filesystem/server certificate. Hardware flush honesty remains environmental evidence.
- Single writable primary only. Baseline absence-proof is limited to the same verified server lineage/incarnation. NDB, multi-primary Group Replication, statement-based replication dependence and read-replica reconciliation are unsupported; cross-primary absence-proof needs a separate history-preservation certificate.

## Integrity diagnostics

Open and every reconciliation validate storage UUID, profile/format version, migration state, relation/column/index/constraint signatures, engine, journal head, contiguous sequence, unique operation ID, canonical bytes/fingerprint, referenced Resources/payload chunks and no unknown committed change kind. SQL/schema/object names are safe constants, never user identifiers. Diagnostics expose vendor code/category and safe profile facts but redact connection strings, SQL parameters, payloads and credentials.

## Executable certification matrix

1. Provision exact PostgreSQL/MySQL versions and verify negative configuration/engine/privilege cases, including MySQL doublewrite disabled/detect-only and PostgreSQL WAL safety knobs.
2. Two-process lifecycle gate contention across full/readonly/migrator, bounded timeout, clean ordered close, killed control connection, reset-before-release/hidden reconnect/backend-change fail-close and post-release clean pool return.
3. Concurrent operations under chosen isolation, deadlock/serialization/lock-timeout injection and same-ID idempotent replay/mismatch.
4. Proxy cut points before begin, during staging, immediately before commit send, server commit before response, partial/late response and reconnect.
5. Assert no blind retry, exact matching-row commit, same-lineage absence retry, changed-lineage absence unsettled behavior and unavailable-primary unsettled behavior.
6. Server process crash/restart around commit and recovery-before-ready; same-incarnation restart, primary promotion, authority-lineage token and storage identity revalidation. Optional failover certificate injects every promotion cut point and proves history preservation before allowing cross-primary absence.
7. Journal head gap/duplicate/regression, canonical-byte/hash, missing payload/resource and schema corruption fail-close.
8. Readonly zero-write startup, migration-required refusal and external-write stale-window statement.
9. PostgreSQL transactional migration crash matrix; MySQL forward-only atomic-DDL step ledger crash matrix; `clean` read → migration attempt → ready publication race; migration attempt while full/readonly ready; gate-loss fail-close.
10. Package-level conformance reuses the deterministic fake semantic suite without importing vendor SQL into Core/public API.

Mandatory process/network certificate injects driver/server process crash, reconnect and network cut points but does not prove OS/power-loss durability. A power-loss support claim additionally requires destructive VM/block-device or physical power-cut evidence on the exact storage/hardware/filesystem/server tuple; MySQL doublewrite and PostgreSQL full-page/WAL settings remain mandatory even before that claim. No profile is `supported` beyond its explicit certificate class until the corresponding matrix is green.

## Downstream decomposition

1. `CS-WP0`: shared internal indeterminate-commit/reconciliation conformance foundation and deterministic network fault model; no vendor dependency.
2. `PG-DG1`: exact PostgreSQL physical/schema/migration/certificate owner gate and dependency selection.
3. `PG-VS1`: PostgreSQL implementation + primary/process/network certification.
4. `MY-DG1`: exact MySQL 8.4 physical/schema/migration/certificate owner gate, incorporating PG foundation lessons without copying PG SQL.
5. `MY-VS1`: MySQL implementation + primary/process/network certification.
6. Optional topology certificates for synchronous PostgreSQL failover or MySQL HA are separate tasks; they do not widen baseline profiles implicitly.

Tasks are recommendations only; RUN-001 does not create or activate them.

## Traceability

| Acceptance | Result |
|---|---|
| 1 | Primary vendor docs and explicit no-probe limitation |
| 2 | Shared semantic contract + distinct profiles |
| 3 | One transaction, singleton head lock, one journal row |
| 4 | Exact `indeterminate` reconciliation state machine |
| 5 | Session/transaction/lease alternatives and failover boundary |
| 6 | Readonly, retry, migration, integrity, privileges, certification |
| 7 | Shared foundation followed by separate PG/MySQL owner gates |
| 8 | RSCH-001, this report and required FIX-001; no dependency/code changes |

## Residual risks

- Existing semantic port can remain unchanged only if the driver keeps an indeterminate `commit()` unsettled until durable reconciliation. A future bounded foundation must prove shutdown/cancellation/fail-close behavior without returning false rejection.
- Baseline cannot convert cross-primary absence to not-committed. A lost/unavailable original lineage can therefore leave an operation unsettled until separately certified history continuity or manual recovery.
- Server documentation cannot prove a cloud/proxy topology’s fencing or storage durability. Each topology needs executable certification.
- Payload chunk performance, transaction size and operational limits need vendor benchmarks; correctness design does not establish budgets.
- Public client deduplication after caller/process loss remains outside current API; storage idempotency prevents duplicate durable mutation but cannot reproduce a response to a caller that lost its operation ID.
