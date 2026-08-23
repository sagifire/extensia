# P5-VS1 / TASK-07.26-0060: Lazy refresh public integration

Task Status: backlog
Type: implementation
Created: 2026-07-18
Owner Role: Agent Implementer / API Engineer
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Task package підготовлено; implementation не розпочато.
Acceptance: 0/10; execution ще не активовано.
Blockers: немає; P5-HARD1 / TASK-07.26-0059 completed і accepted.
Blocked Phase: n/a
Pending Decisions: explicit activation RUN-001.
Next Action: окремою explicit командою власника активувати RUN-001.

## Мета

Реалізувати lazy coverage/load semantics і над уже hardened fake/full/readonly semantic runtime експонувати exact descriptor-safe experimental surface `query.refresh()`, `readModel.synchronization` та `inspect().read_model.synchronization`, не допускаючи partial query success і не вводячи concrete SQLite polling/multi-process support.

## Залежності та activation gate

- [P5-HARD1 / TASK-07.26-0059](../TASK-07.26-0059-p5-hard1-sync-actor-retry-lifecycle/task.md) має бути completed і accepted до активації RUN-001.
- [P5-DG1 / TASK-07.26-0056](../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/task.md) та [P5-DG2 / TASK-07.26-0057](../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/task.md) completed/accepted і задають canonical contract.
- Підготовка package не активує RUN-001 і не активує P5-VS2.
- Якщо P5-HARD1 змінює accepted coordinator/retry/lifecycle semantics, activation зупиняється до явної синхронізації цього task contract.

## Обсяг

- Lazy point, one-level tree/closure і storage-global coverage/load semantics на єдиній immutable coherent generation.
- Complete-only read behavior: unknown coverage не стає missing, empty або partial success.
- Exact experimental `query.refresh()` поверх hardened single-flight coordinator для supported full/readonly semantic adapters.
- Descriptor-safe validation public `readModel.loading` і `readModel.synchronization`, включно з options, retry, deadline/exhaustion та coordinator-conflict semantics.
- Safe frozen inspection через `inspect().read_model.synchronization` без runtime instance, storage seam, secrets або mutable references.
- Legacy `static-unsupported` branch із exact manual behavior без cursor/head/sync actor та без удаваної freshness.
- Listener/cancellation/start-stop lifecycle, result/failure matrices, type/config/API snapshots і packed-consumer smoke.
- Shared fake/full/readonly semantic conformance без concrete local SQLite multi-process claim.

## Поза обсягом

- Concrete `local-sqlite-v1` committed-change observation, SQLite busy-timeout tuning або physical schema/layout.
- Opt-in production polling scheduler, two-process integration, contention/fairness та topology support claim.
- Notification transport, multi-host, HA/leader election, arbitrary instance count або direct external mutation.
- Новий broad public query catalog: point/tree/global completeness перевіряється лише для вже accepted/internal semantic selectors.
- Зміна command/write semantics, journal authority або durable cursor.

## Критерії приймання

1. Lazy point, one-level closure і storage-global selectors повертають success лише з exact coverage proof однієї coherent generation; unknown не маскується як missing/empty/partial.
2. Greedy behavior і чинні public Resource read names/value shapes/missing semantics не регресують; loading mode immutable протягом module lifetime.
3. `query.refresh()` є exact experimental descriptor-safe facade method, використовує один hardened single-flight actor і повертає canonical success, exhausted, canceled, unavailable, integrity та coordinator-conflict outcomes.
4. `readModel.synchronization` config envelope і nested options/retry/deadline fields валідовуються descriptor-safe до driver open, мають canonical defaults/cross-field constraints і не запускають concrete polling у цьому slice.
5. `inspect().read_model.synchronization` повертає detached frozen safe snapshot exact branch/state/options/last outcome, не читає accessors і не розкриває actor IDs, cursor internals, runtime/listener/storage objects або unsafe config.
6. Full і readonly semantic adapters мають однакові supported refresh semantics; readonly path не виконує durable write, recovery, cleanup або hidden mutation.
7. Legacy manual `static-unsupported` branch не має cursor/head/sync actor, не симулює refresh або freshness і зберігає exact backward-compatible failure/inspection contract.
8. Explicit callers, shared-chain cancellation, listener registration/removal та module start/stop/drain проходять deterministic lifecycle matrix без orphan listeners, hidden retries або post-stop publication.
9. Public/type/config snapshots, point/tree/global completeness matrices, refresh/retry/exhaustion/conflict matrices, fake/full/readonly conformance й package smoke зелені; concrete polling/SQLite multi-process evidence відсутнє й не заявляється.
10. Focused і full repository gates зелені; scope, architecture pressure, memory impact і language gate проходять self-review та independent audit без open P0-P3 до human review.

## Перевірки

- descriptor/accessor/unknown-key config і facade argument matrices;
- compile-time public type snapshots та runtime frozen inspection snapshots;
- greedy/lazy point, tree/closure, global positive/negative/unknown coverage fixtures;
- explicit refresh success/exhaustion/cancel/unavailable/integrity/coordinator-conflict matrices;
- fake/full/readonly semantic conformance та readonly mutation sentinel;
- listener registration, abort, stop/drain, restart і post-stop barriers;
- packed consumer/API smoke, focused tests, `npm run check` і повний repository gate.

## Ризики

- Public surface може передчасно стабілізувати internal coordinator vocabulary; усі additions лишаються `experimental-phase-5` і snapshot-яться exact.
- Lazy selectors легко випадково повертають loaded subset як complete; coverage proofs мусять бути generation-local authority.
- Inspection може витекти mutable runtime/config або створити descriptor side effects; потрібні explicit DTO builders і accessor rejection.
- Розміщення polling у цьому slice змішало б semantic API gate з concrete contention owner; це architecture stop condition для P5-VS2.

## Пов’язана пам’ять

- [Read-model completeness contract](../../../technical/read-model-completeness-contract.md)
- [Multi-instance synchronization contract](../../../technical/multi-instance-synchronization-contract.md)
- [P5-RS1 / TASK-07.26-0055](../TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/task.md)
- [P5-DG1 / TASK-07.26-0056](../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/task.md)
- [P5-DG2 / TASK-07.26-0057](../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/task.md)
- [Technical Architecture](../../../technical/architecture.md)
- [Technical Rules](../../../technical/rules.md)
- [Roadmap](../../../product/roadmap.md)

## Прогони

- [RUN-001](RUN-001/index.md) - prepared; activation pending dependency gate й explicit рішення.

## Дослідження

Немає; formal research не виконувалося.

## Фіксації

Немає; змістові canonical memory changes під час execution потребуватимуть окремого FIX proposal.

## Запити на рішення

- Активувати RUN-001 лише після completed/accepted P5-HARD1.

## Запропоновані follow-up задачі

- `P5-VS2 / TASK-07.26-0061` — concrete `local-sqlite-v1` multi-instance synchronization; activation лише після completed/accepted P5-VS1.

## Human Review

Status: not-requested
Requested: n/a
Reviewed: n/a
Approval Source: n/a
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: pending
Decision Notes: RUN-001 ще не активовано.

## Фінальний результат

Completed: n/a
Final Run: n/a
Summary: pending execution, verification, audit і human approval.
Residual Risks: pending.
