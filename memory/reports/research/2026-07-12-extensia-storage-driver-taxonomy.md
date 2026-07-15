# Taxonomy storage driver families Extensia

Related Task: [P4-DG1 / TASK-07.26-0039](../../tasks/plan/TASK-07.26-0039-p4-dg1-concrete-storage-protocol/task.md)
Related Run: [RUN-002](../../tasks/plan/TASK-07.26-0039-p4-dg1-concrete-storage-protocol/RUN-002/index.md)
Related Research: [RSCH-002](../../tasks/plan/TASK-07.26-0039-p4-dg1-concrete-storage-protocol/RSCH-002.md)
Date: 2026-07-12

## Architecture framing

Extensia є in-process media-resource library, а не database system. Storage Driver — adapter semantic persistence port Core. Він може делегувати physical durability embedded engine, filesystem protocol або remote database server. Тому `local-sqlite-v1` не є «database adapter поверх іншої database»; це один embedded implementation внутрішньої durability boundary.

Core authority завершується на semantic operations: exclusive/coherent session, stage, atomic commit, committed journal stream, recovery-before-ready, readonly та integrity outcomes. SQL statements, paths, server transactions, lock APIs і physical recovery не входять у shared port.

## Canonical families

### `filesystem-native`

Для game-development, tools, portable project folders та локальних embedded scenarios. Physical state може бути inspectable і asset-friendly, але durable profile не можна ототожнювати з generic `node:fs`.

Окремий design gate має дослідити:

- Windows та POSIX native lock/directory-sync/replace primitives через bounded native helper/addon або інший verified platform bridge;
- чи можуть sidecar files реалізувати owner record, generation/fencing token, transaction manifest, prepared/committed marker та recovery journal;
- exact binary/text schema, checksums, versioning, canonical encoding, ownership і state transitions кожного sidecar;
- stale owner detection без небезпечного PID-only lock stealing;
- directory entry durability, same-volume atomic publication, crash cleanup і external modification policy;
- support matrix для NTFS/ext4/XFS та executable power-loss/cut-point evidence.

Окремий lock file сам по собі не створює crash-safe mutex, а окремий directory-sync marker не здатен примусити OS flush-ити directory. Sidecars можуть бути protocol records, але native durability/locking primitive все одно має бути доведений.

### `embedded-transactional`

In-process engine володіє transaction, journal/locking і crash recovery. `local-sqlite-v1` є first/default concrete profile `0.1.0`, тому що він може реалізувати current semantic contract у single durability domain без другого write path.

Цей family не стає universal physical template. SQLite schema, rollback journal і `locking_mode=EXCLUSIVE` є лише profile-local details. Майбутній LMDB-подібний profile може мати іншу physical модель за тієї самої semantic conformance.

### `client-server-transactional`

PostgreSQL/MySQL profiles делегують durability, WAL/redo, locks і crash recovery database server. Driver володіє schema, transaction boundaries, operation idempotency, committed journal projection, connection/session lifecycle і network reconciliation.

Окремий design gate має порівняти:

- PostgreSQL/MySQL transaction та isolation capabilities;
- advisory/application locks, fencing, connection loss і failover;
- ambiguous network outcome після server-side COMMIT та reconciliation за `operation_id`;
- readonly transactions/replicas, schema migrations і pooling;
- payload strategy boundary без передчасного змішування з P4-DG2 Asset semantics;
- shared family contract проти vendor-specific profiles.

PostgreSQL і MySQL не мають штучно зводитися до одного lowest-common-denominator physical protocol. Спільний semantic port лишається один, а vendor profiles можуть мати різні exact proof matrices.

## Shared conformance contract

Кожний durable full-driver profile має довести:

- atomic semantic commit staged state + рівно одного committed journal entry;
- operation-id idempotency та canonical sequence/cursor integrity;
- exclusive/coherent storage session у межах прийнятого lifecycle contract;
- resolve лише proven committed, reject лише proven not committed; family-specific persistent-failure liveness policy explicit;
- recovery-before-ready, readonly no-hidden-write behavior і corruption fail-close;
- один production write/journal path без Core-visible physical semantics;
- family/profile capability declaration та executable failure/crash evidence.

Shared contract не визначає SQL, filenames, sidecars, native lock calls, database engine isolation level або server topology.

## Planning consequences

- `local-sqlite-v1` лишається first implementation і future `P4-WP1` target.
- Approved FIX-001 лишається exact concrete-profile proposal; RUN-002 його не переписує.
- Required FIX-002 додає taxonomy й framing та має бути окремо approved/applied.
- `TASK-07.26-0041` готує filesystem-native research/design.
- `TASK-07.26-0042` готує PostgreSQL/MySQL client-server research/design.
- P4-WP1 ще не створюється: gate вимагає whole-task approval P4-DG1, approval обох required fixations, exact application/publication і зелений post-application audit.

## Architecture pressure

Taxonomy запобігає двом небезпечним крайнощам: перетворенню SQLite layout на universal Storage Driver contract і послабленню durable guarantees заради простого filesystem prototype. Різні families мають різні physical mechanisms, але один semantic truth boundary.
