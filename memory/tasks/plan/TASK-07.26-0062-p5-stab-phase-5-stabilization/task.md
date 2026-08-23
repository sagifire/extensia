# P5-STAB / TASK-07.26-0062: Стабілізувати повний executable scope фази 5

Task Status: done
Type: stabilization
Created: 2026-07-18
Owner Role: Agent Stabilizer / Performance Engineer
Current Run: RUN-001

## Поточний стан

Run Status: completed
Progress: whole-task approved; RUN-001 completed, no fixations, P5-AUD1 не активована.
Acceptance: 10/10.
Blockers: немає; TASK-07.26-0058, TASK-07.26-0059, TASK-07.26-0060 і TASK-07.26-0061 завершені та прийняті людиною.
Blocked Phase: none.
Pending Decisions: separate activation decision for P5-AUD1.
Next Action: за окремою explicit командою можна активувати P5-AUD1; зараз вона лишається backlog/prepared.

## Мета

Виконати phase-wide correctness, package, fresh-process, raw two-process, performance і architecture stabilization реалізованого Phase 5 scope та сформулювати правдивий supported/unsupported topology verdict. Якщо fairness/load evidence для симетричного `full/full` недостатній, support має бути звужений до designated-writer `full/readonly`, а не розширений припущенням або прихованим retry.

## Залежності й activation gate

- [P5-WP1 / TASK-0058](../TASK-07.26-0058-p5-wp1-read-model-generation-coordinator-foundation/index.md) має бути `done` із прийнятим generation/coordinator/observation foundation.
- [P5-HARD1 / TASK-0059](../TASK-07.26-0059-p5-hard1-sync-actor-retry-lifecycle/index.md) має бути `done` із прийнятим retry/single-flight/lifecycle hardening.
- [P5-VS1 / TASK-0060](../TASK-07.26-0060-p5-vs1-lazy-refresh-public-integration/index.md) має бути `done` із прийнятим lazy/public refresh integration.
- [P5-VS2 / TASK-0061](../TASK-07.26-0061-p5-vs2-local-sqlite-multi-instance-sync/index.md) має бути `done` із прийнятим concrete SQLite synchronization/polling/contention slice.
- Dependency completion не активує P5-STAB автоматично; потрібне окреме explicit owner decision.

## Обсяг

- Повний build/typecheck/lint/test/package gate реалізованого Phase 5 scope без вибіркового пропуску regression suites.
- Детермінований подвійний `npm pack`, archive/hash comparison і перевірка package surface.
- Fresh-process consumer scenarios для greedy/lazy, explicit refresh, polling, retry exhaustion, restart і readonly zero-write boundary.
- Raw two-process evidence на одному certified local SQLite root для рівно двох cooperating processes у candidate topologies `full/full` і `full/readonly`.
- Journal-order visibility, observed-through cursor/stale-age, local read-after-write, gap/integrity fail-close, startup/stop/drain і retry/cancellation matrices.
- Contention, fairness, configured timeout versus actual overshoot, polling herd/backoff і long-session characterization без перетворення вимірювань на SLA.
- Event-loop delay, memory, catch-up/rebuild time, retry/load і stale-observation age з exact environment, dataset, repetitions і raw samples.
- Package/process cleanup: handles, timers, temp storage, failed startup, stop during refresh і fresh restart.
- Architecture pressure review: один coordinator, Storage Driver authority, zero-write readonly, no raw session/cursor leakage, no hidden retry/write path, no index-as-truth.
- Truthful support verdict і exact supported/unsupported topology matrix; support звужується, якщо evidence не закриває fairness/load risk.

## Поза обсягом

- Нові product features, новий sync protocol або виправлення, що змінює accepted P5-DG1/P5-DG2 contract.
- Винахід hard SLA, p95 budget, broader platform certificate або support expansion без достатнього executable evidence.
- Multi-host/HA, arbitrary instance count, non-cooperating mutation, network/removable/sync/FUSE roots.
- Durable cursor/checkpoint, journal retention/compaction, notification implementation або leader election.
- Independent Phase 5 audit і human phase gate; їх власники — P5-AUD1 і людина після аудиту.
- Автоматична активація P5-AUD1 чи Phase 6.

## Критерії приймання

1. Full clean package gate проходить typecheck/build/lint/tests і package checks для всього Phase 5 scope; пропуски або flaky exclusions відсутні чи явно блокують verdict.
2. Два незалежні pack runs є детермінованими за archive content і hash або розбіжність пояснена й усунена до review.
3. Fresh-process consumers доводять public greedy/lazy, explicit refresh, polling, retry/lifecycle і readonly behavior без test-only parallel architecture.
4. Raw two-process harness відтворює `full/full` та designated-writer `full/readonly` на одному certified local SQLite root із exact environment, commands, datasets, repetitions і retained raw evidence.
5. Correctness matrix доводить journal-order visibility, local read-after-write, cursor/observed-through boundary, restart, gap/integrity fail-close, transient exhaustion і no partial publication.
6. Contention/fairness/polling evidence характеризує wait, retry, timeout overshoot, herd/load, starvation indicators і long-session behavior; silent infinite retry та invented SLA відсутні.
7. Event-loop delay, memory, catch-up/rebuild duration і stale-observation age виміряні raw samples із median/p95 лише як characterization, не як support promise.
8. Cleanup/process gate доводить відсутність leaked handles/timers/storage sessions після success, failed startup, cancellation, stop-during-refresh і fresh restart.
9. Architecture-pressure review не знаходить другого write/publication path, index-as-truth, readonly mutation, raw storage leakage або workaround проти accepted contracts; будь-який conflict повертається owning task/new run.
10. Result містить exact supported/unsupported topology matrix і recommendation: `full/full` підтримується лише за достатнього fairness/load evidence, інакше support явно звужений до designated-writer `full/readonly`; self-review завершений до human review.

## Перевірки

- Чисті repository checks і full package matrix з recorded commands/versions.
- Подвійний pack у незалежних temporary roots, archive manifest і SHA-256 comparison.
- Packed fresh-process consumers для greedy/lazy/manual/polling/full/readonly profiles.
- Raw two-process matrices: alternating і simultaneous commands, writer+poller, synchronized poll herd, long session, restart, failure/cancellation.
- Structured samples: session/lock wait, retries, catch-up/rebuild, event-loop delay, memory і stale age.
- Source/contract traceability, public/export/privacy review, architecture pressure і UTF-8/link/diff checks для memory artifacts.

## Ризики

- Scheduler/OS variance може створити оманливий одноразовий pass; потрібні raw repetitions, а не один агрегат.
- Synchronous SQLite call може завершитися після admission deadline; configured timeout не є hard response SLA.
- Instrumentation може змінити contention або event-loop profile.
- `full/full` може бути correctness-valid, але operationally неприйнятним через fairness/load; це законний negative verdict.
- Package consumer може випадково використовувати workspace internals замість packed public surface.
- Stabilization fix може непомітно розширити scope; contract-changing remediation потребує owning task/new run.

## Пов’язана пам’ять

- [P5-RS1](../TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/index.md)
- [P5-DG1](../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/index.md)
- [P5-DG2](../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/index.md)
- [Read-model completeness contract](../../../technical/read-model-completeness-contract.md)
- [Multi-instance synchronization contract](../../../technical/multi-instance-synchronization-contract.md)
- [Technical architecture](../../../technical/architecture.md)
- [Technical rules](../../../technical/rules.md)
- [Phase 5 roadmap](../../../product/roadmap.md)
- [Phase 5 task-set plan](../../../reports/research/2026-07-17-extensia-phase-5-task-set-plan.md)

## Прогони

- [RUN-001](RUN-001/index.md) - completed після whole-task human approval; reviewed content preserved.

## Дослідження

Немає; raw evidence і stabilization analysis належать active RUN-001 result/evidence artifacts.

## Фіксації

Немає; required canonical memory changes, якщо їх виявить execution, мають бути оформлені окремим `FIX-*` до review.

## Запити на рішення

- Activation: виконано 2026-08-23 за explicit командою користувача після accepted TASK-0058..0061.
- Після review-ready: `approve | request changes | cancel` та окремі рішення для можливих `FIX-*`.

## Запропоновані follow-up задачі

- [P5-AUD1 / TASK-0063](../TASK-07.26-0063-p5-aud1-independent-phase-5-audit/index.md) - незалежний Phase 5 audit; може бути активований лише після accepted P5-STAB.
- Human Phase 5 gate відбувається після P5-AUD1 і не активує Phase 6 автоматично.

## Human Review

Status: approved
Requested: 2026-08-23
Reviewed: 2026-08-23
Approval Source: explicit user command `approve`
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: P5-AUD1 not-decided; remains backlog/prepared
Decision Notes: whole-task result approved without fixations; approval does not activate downstream tasks.

## Фінальний результат

Completed: 2026-08-23
Final Run: RUN-001
Summary: Phase 5 stabilization accepted with designated-writer `full/readonly` as the only recommended support candidate; symmetric `full/full` and broader topologies remain unsupported, canonical support unclaimed pending P5-AUD1/human Phase 5 gate.
Residual Risks: synchronous SQLite/event-loop pressure, no hard timeout/stale/fairness SLA, manual unbounded staleness, task-run `syncBacked: false` attestation and ambiguous-COMMIT safety-over-liveness wait.
