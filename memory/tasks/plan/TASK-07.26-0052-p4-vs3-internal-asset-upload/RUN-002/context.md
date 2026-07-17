# Контекст виконання: RUN-002

Related Task: [P4-VS3 / TASK-07.26-0052](../task.md)
Prepared: 2026-07-17
Activated: 2026-07-17
Prepared By: Agent Implementer `/root`
Previous Run: [RUN-001](../RUN-001/index.md) — blocked activation capability audit

## Мета run

Materialize-ити exact internal Asset upload generation lifecycle в одному vertical slice, де executable opaque Core↔driver stage/read/publish capability і bounded bytes transport map є першими deliverables перед begin/finish/abort consumers.

## Human decision і ownership correction

RUN-001 довів circular activation ownership: P4-WP1 залишила inactive payload schema, P4-VS2 — generation metadata без bytes/finalization, а original P4-VS3 gate вимагав capability до run. Користувач 2026-07-17 прямо погодив recommended correction: RUN-002 сам materialize-ить exact opaque adapter як first deliverable цього самого vertical slice.

Це рішення не послаблює gate. До lifecycle integration capability повинна пройти executable conformance на deterministic fake та `local-sqlite-v1`; failure зупиняє run без direct SQL із Core/facade, public physical token або другого write path.

## Effective requirements

1. Completed/accepted P4-VS2 є виконаним mandatory predecessor.
2. Спершу materialize-ити internal opaque upload handle/generation adapter із resolve active generation, bounded stage bytes, committed read і transaction-owned publish validation; physical IDs/rows/connections не виходять із storage layer.
3. Deterministic fake і `local-sqlite-v1` реалізують один shared internal capability contract; fake-only, SQLite-only consumer contract або public driver-author widening заборонені.
4. Stage bytes змінює тільки active incomplete generation і не створює journal/metadata transition. Finish/abort/begin проходять один Core/Operation Engine semantic path; publish/discard/delete commit-яться atomically з metadata та exactly one journal row.
5. Initial upload не readable до finish. Replacement читає last committed payload до finish і atomic new payload після finish; incomplete/aborted/stale generation ніколи не visible.
6. Opaque handle stale-safe, runtime-owned, non-serializable й не є public/package API. Trusted internal adapter resolves initial handle за Resource/Asset identity після capability/readiness checks.
7. Bytes transport bounded: fixed chunk envelope, explicit payload/chunk limits, copy/detach semantics, measured peak memory, synchronous SQLite latency, DB/rollback-journal growth і transaction duration.
8. Retry/idempotency, duplicate/stale finish/abort, partial stage, disk/IO/readonly/lock/corruption/cleanup failures та crash/restart cut points мають outcome-definite behavior без false settlement.
9. Startup integrity/recovery fail-close перевіряє payload digest/length/chunk continuity та generation state; incomplete staged bytes лишаються invisible, а cleanup не створює independent commit authority.
10. Public root exports, `AssetSnapshot`, ordinary `StorageFacade`, public driver definition і package subpaths не розширюються upload/path/session/transaction/SQL surface.

## Delivery sequence

1. Exact shared opaque capability types, limits і adapter map.
2. Deterministic executable conformance implementation/tests.
3. SQLite stage/read/publish implementation у current schema/durability domain.
4. Core internal upload port і Operation Engine begin/finish/abort transitions.
5. Composition-owned trusted upload controller/adapter без public root export.
6. Lifecycle, retry, failure, restart, pressure й package verification.
7. Self-review, independent audit, remediation та human Review Request.

## Acceptance

1. Capability-first gate доводить shared opaque stage/read/publish/discard/delete contract на fake й SQLite до lifecycle integration; no parallel path.
2. Internal begin/resolve/stage/finish/abort/retry точно реалізують accepted states, handle ownership і normalized stale/not-active/incomplete failures.
3. Initial/replacement visibility та last-ready semantics доведені read tests до/після finish/abort/restart.
4. Publish/discard/delete є exact compound actions тієї самої semantic transaction з metadata й одним journal entry.
5. Retry/idempotency та crash cut points outcome-definite без orphan visibility або false settlement.
6. Measured bounded transport envelope зафіксований і не leak-ить storage mechanics.
7. Fault matrix доводить rollback/fail-close та last-ready preservation.
8. Startup recovery/integrity детерміновано відхиляє corrupt/incomplete committed state; staged bytes не публікуються.
9. Focused/full/package/double-pack, architecture/memory/language self-review та independent audit завершені без open P0-P3; task лишається `review` до whole-task human approval.

## Verification

- shared capability compile/runtime conformance для deterministic fake й SQLite;
- initial/replacement/incomplete/stale/idempotency lifecycle matrix;
- committed read та chunk boundary/detachment/property tests;
- SQLite fault injection і child-process crash/restart cut points;
- size/memory/latency/transaction/DB/rollback-journal measurements;
- readonly/input-precedence, corruption, lock, cleanup і fail-close fixtures;
- `npm run check`, packed consumer, root export/subpath scan і deterministic double pack.

## Task-specific reading

- [RUN-001 blocker evidence](../RUN-001/result.md)
- [P4-VS2](../../TASK-07.26-0051-p4-vs2-asset-metadata-lifecycle/task.md)
- [P4-WP1](../../TASK-07.26-0049-p4-wp1-local-sqlite-driver/task.md)
- [Asset Contract](../../../../technical/asset-contract.md)
- [Write contract](../../../../technical/write-journal-recovery-contract.md)
- [ADR-0010](../../../../technical/decisions/ADR-0010-local-sqlite-storage-protocol.md)
- [Architecture](../../../../technical/architecture.md)
- [Technical Rules](../../../../technical/rules.md)
- [Asset contract report](../../../../reports/research/2026-07-15-extensia-asset-contracts.md)
- [Concrete storage report](../../../../reports/research/2026-07-12-extensia-concrete-storage-protocol.md)

## Обмеження

- Не додавати ordinary public upload/path/session/transaction API, content processing, P5 sync/indexes або P7 freeze.
- Не створювати external blob/journal path, direct SQL Core adapter або cleanup commit authority.
- Не стабілізувати public driver-author upload contract: capability internal і composition-owned.
- Після activation цей context незмінний.

## Умови зупинки

- Shared fake/SQLite capability вимагає різних consumer contracts або storage layout leakage.
- Atomic payload+metadata+journal publish потребує другої durability domain.
- Bounded transport неможливий без unbounded memory/transaction envelope.
- Measurements спростовують безпечний current-host profile і потребують product/owner limit decision.
- Open P0-P3 audit finding не може бути remediated у task boundary.

## Ризики й assumptions

- Assumption: current SQLite `payloads`/`payload_chunks` schema може represent-ити active staged bytes keyed opaque generation without schema migration; executable implementation має це довести або зупинити run для fixation/design decision.
- Synchronous `DatabaseSync` може блокувати event loop; accepted baseline потребує measured bounds, не async second path.
- Digest/length/chunk continuity must be driver-owned integrity, але cryptographic content identity/deduplication не вводиться.
- Cleanup incomplete bytes може бути lazy transaction-local/integrity-owned, але не має змінювати visible metadata без semantic operation.

## Activation

Run Status: active
Activation Source: explicit user decision 2026-07-17 to prepare and execute corrected RUN-002.
