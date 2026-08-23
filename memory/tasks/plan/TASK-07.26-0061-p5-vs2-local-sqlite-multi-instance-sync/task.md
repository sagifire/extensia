# P5-VS2 / TASK-07.26-0061: Local SQLite multi-instance synchronization

Task Status: backlog
Type: implementation
Created: 2026-07-18
Owner Role: Storage Engineer / Concurrency Engineer
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Task package підготовлено; implementation не розпочато.
Acceptance: 0/10; execution ще не активовано.
Blockers: activation gate не виконаний, доки P5-VS1 / TASK-07.26-0060 не completed/accepted.
Blocked Phase: n/a
Pending Decisions: explicit activation після виконання dependency gate.
Next Action: після completed/accepted P5-VS1 окремо активувати RUN-001.

## Мета

Реалізувати concrete `local-sqlite-v1` coherent full/readonly committed-change observation, remaining-budget busy timeout, volatile cursor, thresholded delta/rebuild та opt-in polling, а також отримати rerunnable two-process synchronization/contention evidence без передчасного support claim.

## Залежності та activation gate

- [P5-VS1 / TASK-07.26-0060](../TASK-07.26-0060-p5-vs1-lazy-refresh-public-integration/task.md) має бути completed і accepted до активації RUN-001.
- [P5-RS1 / TASK-07.26-0055](../TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/task.md) completed/accepted і є baseline feasibility evidence.
- [P5-DG1 / TASK-07.26-0056](../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/task.md) та [P5-DG2 / TASK-07.26-0057](../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/task.md) completed/accepted і задають canonical contract.
- Підготовка package не активує RUN-001 або P5-STAB.
- Support claim для `full/full` чи `full/readonly` заборонений до completed P5-STAB, independent P5-AUD1 і explicit human Phase 5 gate.

## Обсяг

- Один internal consumer-owned `local-sqlite-v1` coherent committed-change observation seam для full і readonly без raw session/transaction/layout exposure.
- Same-observation metadata/head capture на startup і refresh; readonly path має zero durable writes.
- Volatile process-local cursor, atomic cursor+generation publication і full restart rebuild; durable cursor не вводиться.
- Contiguous sequence traversal власних і зовнішніх entries; gap/duplicate/regression/ahead/malformed fail-close.
- Exact incremental thresholds: до 256 journal entries і до 256 distinct changed Resources включно — delta candidate; 257 або більше за будь-яким dimension — coherent full rebuild.
- Remaining admission budget передається в SQLite busy timeout; synchronous final call може мати виміряний overshoot, але новий attempt після deadline не стартує.
- Opt-in polling scheduler із admission-epoch coalescing, capped jitter/backoff, trailing observation і stop/drain semantics.
- Rerunnable two-process `full/full` та `full/readonly` external sync/contention diagnostics для 0/1/32/256/257 distance, restart, writer/poller/herd і readonly zero-write.

## Поза обсягом

- Support declaration або stabilization decision для будь-якої live topology.
- Multi-host, HA/leader election, arbitrary instance count, network/removable/sync/FUSE roots або non-cooperating mutation.
- Notification correctness transport, durable cursor/checkpoint або cross-process in-memory coordination.
- Hidden command retry, retry через staging/COMMIT або зміна ambiguous-COMMIT reconciliation.
- Raw SQLite connection/session/schema/path exposure в Core, public API чи tests.

## Критерії приймання

1. Full і readonly `local-sqlite-v1` adapters реалізують один coherent committed-change observation contract з detached semantic snapshots і без raw connection/session/transaction/layout leakage.
2. Readonly startup/refresh/polling на існуючому storage виконує zero durable mutation; filesystem/DB/schema/journal snapshots до/після exact, а missing initialization fail-close-ить без repair.
3. Startup/restart rebuild-ить generation і capture-ить journal head в одній coherent observation; volatile cursor ніколи не переживає process restart окремо від generation.
4. Own/external entries проходять одну contiguous `JournalSequence`; gap, duplicate, regression, cursor-ahead або malformed authority fail-close без cursor advance чи partial publication.
5. Distances 0/1/32/256 застосовують exact no-op/delta path, якщо distinct changed Resources також `<=256`; 257 entries або 257 Resources примусово обирають coherent full rebuild, без partial-to-head publication.
6. Кожний SQLite attempt отримує busy timeout не більший за remaining admission budget/profile cap; жодний новий attempt не стартує після deadline, а configured timeout, actual wait і synchronous overshoot вимірюються окремо.
7. Opt-in polling coalesce-ить trigger cohort до first adapter call, серіалізує trailing observation, використовує capped jitter/backoff і не створює tight loop, overlapping chain, orphan timer або post-stop publication.
8. Two-process `full/full` і designated-writer `full/readonly` matrices доводять eventual visibility після successful explicit refresh/poll, local read-after-write, restart catch-up, writer+poller/herd behavior і caller-visible contention failures без hidden command retry.
9. Create/update/move/delete та Asset/Mark change families мають external-sync coverage; diagnostics містять session/lock/retry/catch-up/rebuild/event-loop/stale-age raw samples без secrets або unsupported SLA claim.
10. Focused, process, package й full repository gates зелені; self-review та independent audit не мають open P0-P3, а результат явно залишає topology support unclaimed до P5-STAB/P5-AUD1/human gate.

## Перевірки

- full/readonly coherent-observation conformance та corruption/sequence fail-close fixtures;
- readonly DB/filesystem byte/schema/journal snapshot diff;
- 0/1/32/256/257 entry і distinct-Resource distance matrix;
- child-process `full/full` і `full/readonly` create/update/move/delete/Asset/Mark sync harness;
- startup/restart, explicit refresh, polling, trailing trigger, cancellation і stop/drain barriers;
- remaining-budget busy timeout та actual overshoot instrumentation;
- asymmetric writer, writer+poller, synchronized herd і long-session contention samples;
- package smoke, `npm run check` і повний repository gate.

## Ризики

- Synchronous `DatabaseSync` call не має hard cancellation: final admitted call може завершитися після deadline; evidence має відділяти admission guarantee від response-time claim.
- Symmetric `full/full` може мати неприйнятну fairness/load pressure; P5-STAB має право звузити підтримку до designated-writer `full/readonly`.
- Polling додає read competition до single-writer SQLite profile; hidden retries або leader election не є допустимим лікуванням.
- Delta/rebuild threshold легко реалізувати по одному dimension і пропустити інший; entries та distinct Resources перевіряються незалежно.
- Tests можуть випадково використати raw SQLite seam; executable consumer-owned observation contract є mandatory boundary.

## Пов’язана пам’ять

- [P5-RS1 / TASK-07.26-0055](../TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/task.md)
- [P5-DG1 / TASK-07.26-0056](../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/task.md)
- [P5-DG2 / TASK-07.26-0057](../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/task.md)
- [Read-model completeness contract](../../../technical/read-model-completeness-contract.md)
- [Multi-instance synchronization contract](../../../technical/multi-instance-synchronization-contract.md)
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

- Активувати RUN-001 лише після completed/accepted P5-VS1.

## Запропоновані follow-up задачі

- `P5-STAB / TASK-07.26-0062` — phase-wide stabilization і truthful topology decision; activation лише після completed/accepted P5-VS2 та інших Phase 5 implementation owners.

## Human Review

Status: not-requested
Requested: n/a
Reviewed: n/a
Approval Source: n/a
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: pending
Decision Notes: RUN-001 ще не активовано; support claim відсутній.

## Фінальний результат

Completed: n/a
Final Run: n/a
Summary: pending execution, process evidence, stabilization/audit gates і human approval.
Residual Risks: pending.
