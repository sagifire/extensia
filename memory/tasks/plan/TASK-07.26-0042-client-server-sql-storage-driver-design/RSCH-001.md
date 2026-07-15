# RSCH-001: Client-server transactional Storage Driver family

Status: completed
Related Task: [TASK-07.26-0042](task.md)
Related Run: [RUN-001](RUN-001/index.md)
Detailed Report: [Client-server SQL Storage Driver design](../../../reports/research/2026-07-15-extensia-client-server-sql-storage-driver-design.md)

## Мета

Порівняти PostgreSQL/MySQL за primary sources, визначити shared semantic family contract, vendor profiles, exact network-ambiguous commit reconciliation і downstream sequencing без implementation dependency або production code.

## Verdict

Один semantic family contract є коректним, один physical driver — ні. Shared foundation стандартизує logical schema, atomic metadata/payload/one-journal transaction, `operation_id`/fingerprint idempotency, indeterminate reconciliation, recovery-before-ready та conformance. PostgreSQL і MySQL мають окремі isolation/error, advisory lock, session reset, durability, DDL migration і certification profiles.

Writer authority: runtime-lifetime pinned vendor advisory gate for full/readonly/migrator exclusion + transactional singleton control-row lock; time lease відхилено без topology fencing. Network loss навколо `COMMIT` переходить у unsettled reconciliation: matching operation = committed; absence = not committed лише на тій самій verified durability lineage/server incarnation або під exact history-preservation certificate; changed/unproved lineage, unavailable чи role-unknown лишаються unsettled; mismatch = integrity. Blind retry заборонений.

Sequencing: `CS-WP0` shared reconciliation foundation → окремі PostgreSQL owner/implementation/certification tasks → окремі MySQL 8.4 LTS owner/implementation/certification tasks. Жодну задачу не створено й не активовано.

Lifecycle refinement: V1 утримує exclusive runtime/migration advisory gate від `open()` до ordered `close()` для full/readonly/migrator exclusion, допускає один active runtime на storage і fail-close-ить будь-який premature reset/session identity change. Transactional control-row lock лишається per-write journal serializer.

## Evidence

- Primary PostgreSQL 18/current docs: supported versions, isolation, advisory locks, WAL durability, readonly/session semantics.
- Primary MySQL 8.4 LTS docs: InnoDB isolation/errors, `GET_LOCK()`, durability, implicit/atomic DDL, connection reset.
- Environment probe: `docker`, `podman`, `psql`, `mysql`, `pg_isready` absent. Executable vendor probes перенесені в exact certification matrix; dependencies не встановлювалися.

## Traceability

| Acceptance | Evidence |
|---|---|
| 1 | Primary-source/version matrix і explicit probe limitation |
| 2 | shared logical/semantic section + vendor evidence/profile sections |
| 3 | one transaction, control-row head, one journal row |
| 4 | commit cut-point/state machine і deterministic reconciliation |
| 5 | advisory/row/lease alternatives, pool/session/failover/readonly matrix |
| 6 | migration, integrity, privilege, durability і capability gates |
| 7 | shared foundation + separate sequential vendor owner gates |
| 8 | report, RSCH-001, required FIX-001; zero dependency/source changes |

## Disposition

`final-result`; exact canonical proposal винесено у required [FIX-001](FIX-001.md). Application і downstream activation не виконані.
