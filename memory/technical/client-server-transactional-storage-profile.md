# Контракт client-server transactional Storage Driver family

Status: accepted target design
Compatibility: `experimental-client-server-transactional`
Authority: TASK-07.26-0042, ADR-0013
Detailed Design: [Client-server transactional Storage Driver family](../reports/research/2026-07-15-extensia-client-server-sql-storage-driver-design.md)

## Межа family

PostgreSQL і MySQL реалізують один semantic family contract через окремі physical profiles. Shared layer визначає logical schema, one-commit authority, operation idempotency, reconciliation, recovery-before-ready, readonly, integrity і conformance. SQL dialect, isolation implementation, advisory lock, session reset, durability variables, DDL migration, topology та certificate належать vendor profile й не виходять у Core/public API.

Жоден client-server profile ще не implemented або certified. Design не обирає npm dependency, ORM, pool чи default vendor.

## Logical authority

- `storage_control` singleton з storage UUID, profile/format, migration state і journal head.
- `resource_snapshot` з canonical detached bytes/hash.
- `payload_chunk` з immutable bytes/hash та ordinal.
- `operation_journal` як єдина committed journal authority: gap-free sequence, operation/actor IDs, type, committed time, fingerprint і canonical journal bytes.
- Нормалізовані affected-resource rows дозволені лише як частина тієї самої transaction.

Canonical bytes і SHA-256 визначає Extensia; vendor JSON equality не є authority. Sequence виділяється як locked `journal_head + 1`; nontransactional sequence/auto-increment не визначають semantic journal order.

Metadata, payload chunks/actions, snapshots, рівно один journal row і новий head commit-яться в одній vendor transaction. DDL, migration ledger та advisory lock lifecycle не входять у semantic operation transaction.

V1 physical mapping: PostgreSQL використовує native `uuid`, `bytea`, 32-byte length checks, `numeric(20,0)` sequence/head, `bigint` safe timestamps і exact checked text enums; MySQL 8.4 використовує RFC-4122-order `BINARY(16)`, `LONGBLOB`, `BINARY(32)`, `DECIMAL(20,0)`, signed safe `BIGINT` і ASCII binary-collated checked enums. Sequence range `0..99999999999999999999`, committed row `>0`; exhaustion fail-close. MySQL tables explicit `ENGINE=InnoDB`; PostgreSQL unlogged/temp authority, vendor JSON equality та sequence/auto-increment authority заборонені.

Required constraints: singleton `storage_control`; unique storage UUID; `resource_snapshot` UUID primary + canonical bytes/hash; `payload_chunk(payload_id, ordinal)` primary + bytes/hash; `operation_journal` unique sequence і unique operation UUID + exact fingerprint/body; `operation_resource(operation_id, ordinal)` ordered keys. PostgreSQL зберігає transactionally allocated unique signed `bigint advisory_lock_key` в Extensia lock catalog; MySQL lock name exact `extensia:<canonical-storage-uuid>`. Open introspect-ить engine, columns, constraints та indexes; mismatch fail-close.

## Storage session і commit

Driver `open()` pin-ить dedicated physical control connection, capture-ить exact durability-lineage/server-incarnation identity і бере bounded exclusive runtime/migration advisory gate, namespaced storage UUID, до `close()` у full і readonly modes. Full operations reuse gated connection; кожна write transaction додатково lock-ить singleton `storage_control FOR UPDATE`, revalidate-ить profile/migration/head та serializes commit. PostgreSQL використовує session advisory lock; MySQL — exact `GET_LOCK()` lifecycle. Backend/thread identity перевіряється, pool handoff заборонений, uncertain session destroy-иться. Client transport loss не доводить server-session termination; lifecycle lock loss fail-close-ить runtime, а нова session не отримує takeover authority до server-granted lock.

Time-based lease не є writer authority без окремого topology fencing design. Advisory lock координує cooperating drivers лише на одному writable primary. Certified topology повинна зовнішньо гарантувати один writable primary; multi-primary, writable old-primary, NDB і read-replica reconciliation unsupported.

`operation_id` unique. Existing identical fingerprint/type/write-set повертає exact committed entry; mismatch є integrity failure. Commit acknowledgement означає committed. Definite reject дозволений лише до commit або після durable reconciliation, яка довела same-lineage authoritative absence operation row.

Після transport loss/timeout навколо `COMMIT` connection destroy-иться, session вважається втраченою, а operation переходить у `indeterminate`. Нове authoritative-primary connection перевіряє storage identity/role/schema і durability lineage, reacquire-ить lock і шукає operation ID:

- exact row/fingerprint — committed;
- absence після recovery на тій самій verified durability lineage/server incarnation — not committed, дозволено same-ID retry;
- absence після primary/lineage change — unsettled, якщо exact topology certificate не доводить preservation усієї possibly committed history через цей failover cut point;
- mismatch — integrity failure;
- unavailable або role/topology unknown — operation лишається unsettled, intake/runtime призупиняється; reject як not committed заборонений.

Blind retry після ambiguous cut point заборонений. Core index publish-иться лише після committed reconciliation. Driver приховує network mechanics, утримуючи semantic commit unsettled до definite outcome; shutdown/cancellation не перетворює unknown на rejection.

## Isolation, errors і readonly

Перший certificate target використовує explicit `SERIALIZABLE` write transactions в обох profiles, не прирівнюючи vendor algorithms. Relaxation до `READ COMMITTED` можлива лише окремим proof gate для exact access pattern.

Serialization/deadlock/lock-timeout/transient errors retry-яться як whole transaction зі старим operation ID тільки після definite rollback або same-lineage authoritative absence. MySQL lock timeout потребує explicit full rollback/discard, бо default може rollback-нути лише statement. Schema/profile/config/permission/integrity mismatch nonretryable.

Readonly використовує separate read-only credential, але тримає той самий non-durable exclusive runtime/migration advisory gate від `open()` до `close()`. Explicit read-only coherent startup transaction робить zero durable writes. Migration/recovery/integrity need спричиняє fail-before-ready. V1 має рівно один active full або readonly runtime на storage; shared/multi-instance gate і external change visibility належать Phase 5.

## Migration

Runtime credential має DML-only privilege; DDL виконує окремий migrator. Migration offline-only: migrator бере той самий exclusive runtime-lifetime advisory gate, отже жоден full/readonly runtime не open, і після acquire повторно перевіряє role/lineage/schema/version. Migration не запускається всередині application operation.

PostgreSQL profile використовує transactional compatible DDL/data step і version update. MySQL profile використовує forward-only checksum step ledger: atomic DDL є single-statement atomic, але DDL implicitly commit-ить і не є multi-statement transactional migration. Interrupted/concurrent startup revalidate-ить step pre/postconditions; unknown/newer version, dirty state або checksum mismatch fail-close.

## Candidate capability profiles

PostgreSQL candidates: majors 16, 17, 18 at exact latest certified minor; кожен major/minor/topology має окремий certificate. Mandatory: `fsync=on`, `full_page_writes=on`, per-operation `synchronous_commit=on`, logged permanent tables і direct writable-primary reconciliation. Zero-loss failover claim потребує окремого synchronous-topology certificate.

MySQL candidate: 8.4 LTS exact certified patch, InnoDB-only, strict exact session/SQL/collation configuration, `innodb_flush_log_at_trx_commit=1`, `innodb_doublewrite=ON`, а з binary log — `sync_binlog=1`. `DETECT_ONLY`/`OFF` unsupported; atomic-write replacement потребує separate exact device/filesystem/server certificate. Baseline — single writable primary; NDB, multi-primary, statement-based-replication dependence і replica reconciliation unsupported.

Pool certificate доводить pinned checkout, disabled unsafe auto-reconnect і exact clean close order: stop intake → drain → explicit advisory gate release/verification → session reset → pool return. Reset/`DISCARD ALL`, backend/thread identity change або handoff while open є gate loss і спричиняє fail-close/destroy; runtime не продовжує ready. Vendor certificate визначає exact durability-lineage/server-incarnation token. Diagnostics redacted. Hardware/cloud durability, primary fencing, commit-history continuity і failover лишаються environment certificate facts, не inference з driver code.

## Certification

Обов’язкові executable gates: exact server/config/privilege negatives, включно з MySQL doublewrite disabled/detect-only; full/readonly/migrator lifecycle gate contention і killed-owner release; `clean` read → migration attempt → ready race; migration while runtime ready; gate-loss fail-close; pool contamination; concurrent serializable writes/deadlock/timeout; same-ID replay/mismatch; network proxy cuts до/під час/після commit; same-lineage server crash/restart; changed-primary absence remains unsettled; authority-lineage identity; journal/schema/payload corruption; readonly zero-write; PostgreSQL transactional migration; MySQL forward-only DDL-step crash matrix; full shared semantic conformance. Optional failover certificate окремо доводить preservation possibly committed history на кожному promotion cut point до cross-primary absence-proof.

Mandatory process/network certificate не є power-loss certificate. Power-loss support claim додатково потребує destructive VM/block-device або physical power-cut evidence на exact storage/hardware/filesystem/server tuple; MySQL doublewrite і PostgreSQL WAL/full-page settings лишаються mandatory prerequisites.

No profile стає supported до green certificate exact tuple.

## Downstream sequence

1. Shared `CS-WP0` indeterminate-commit/reconciliation conformance foundation без vendor dependency.
2. Окремий PostgreSQL owner gate, dependency selection, implementation і certificate.
3. Окремий MySQL 8.4 LTS owner gate, dependency selection, implementation і certificate.
4. HA/failover topology certificates — окремі optional tasks.

PostgreSQL-first зменшує перший proof/migration risk через transactional DDL; це sequencing, не product default. Жодна downstream task не активується цим контрактом.
