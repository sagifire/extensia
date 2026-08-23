# Контекст виконання: RUN-001

Related Task: [P5-STAB / TASK-07.26-0062](../task.md)
Prepared: 2026-07-18
Prepared By: Agent Task Planner `/root/create_p5_stab_aud`
Previous Run: none

## Мета run

Після accepted P5-WP1/HARD1/VS1/VS2 виконати незалежний від implementation optimism stabilization pass: повний package/process/correctness/performance evidence, architecture pressure і truthful support verdict для рівно двох same-host cooperating SQLite processes.

## Ефективні вимоги

1. TASK-0058..0061 мають бути completed/accepted до activation; completion не активує цей run автоматично.
2. Accepted P5-DG1/P5-DG2 contracts є authority; stabilization не перепроєктовує їх локальним workaround.
3. Full package, deterministic double-pack, packed fresh-process consumers і raw two-process evidence є обов’язковими gates.
4. `full/full` і designated-writer `full/readonly` оцінюються окремо; support claim не переноситься між topology.
5. Correctness proof і performance characterization розділені; configured timeout/admission deadline не стають hard SLA.
6. Raw environment, dataset, repetition і samples зберігаються разом з агрегатами.
7. Fairness/load evidence, а не roadmap aspiration, визначає verdict; недостатність звужує support до designated-writer `full/readonly` або лишає topology unsupported.
8. Нова feature/support expansion, multi-host/HA/arbitrary-count і notification/durable-cursor work заборонені.
9. Architecture-contract conflict або потрібна змістова canonical change зупиняє локальний workaround і повертається owning task/new run.
10. P5-AUD1 та human Phase 5 gate не активуються цим run.

## Обсяг

- Full repository/package/process regression.
- Double pack і packed consumers.
- Raw two-process correctness, retry/contention/fairness, polling, lifecycle і restart matrices.
- Event-loop, memory, catch-up/rebuild, stale-age і timeout-overshoot characterization.
- Cleanup, public/internal boundary, architecture pressure й topology verdict.
- Run result, evidence manifest, self-review і Review Request.

## Поза обсягом

- Новий functionality/design, hard SLA, broader platform/support claims, P5-AUD1 execution, human gate або Phase 6 activation.

## Критерії приймання run

- Виконані всі десять task acceptance criteria.
- Кожен topology verdict простежений до retained raw evidence.
- Package/process evidence використовує fresh consumers, не workspace-only imports.
- Відкриті correctness, cleanup або architecture findings не маскуються performance summary.
- Reviewed result містить supported/unsupported matrix і чесні residual risks.

## Обов’язкове task-specific читання

- Accepted results/evidence [P5-WP1](../../TASK-07.26-0058-p5-wp1-read-model-generation-coordinator-foundation/index.md), [P5-HARD1](../../TASK-07.26-0059-p5-hard1-sync-actor-retry-lifecycle/index.md), [P5-VS1](../../TASK-07.26-0060-p5-vs1-lazy-refresh-public-integration/index.md) і [P5-VS2](../../TASK-07.26-0061-p5-vs2-local-sqlite-multi-instance-sync/index.md).
- [P5-RS1](../../TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/index.md), [P5-DG1](../../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/index.md) і [P5-DG2](../../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/index.md).
- [Read-model completeness contract](../../../../technical/read-model-completeness-contract.md) і [multi-instance synchronization contract](../../../../technical/multi-instance-synchronization-contract.md).
- [Technical architecture](../../../../technical/architecture.md), [technical rules](../../../../technical/rules.md), [roadmap](../../../../product/roadmap.md) і Phase 5 implementation/test source через repository navigation.

## Заплановані результати

1. Full package/process verification record.
2. Deterministic double-pack manifest/hash evidence.
3. Packed fresh-process consumer matrix.
4. Raw two-process evidence manifest і reproducible commands.
5. Correctness/cleanup/performance/architecture findings.
6. Exact supported/unsupported topology matrix і recommendation.
7. RUN-001 result із self-review та Review Request.

## Перевірки

- Full checks; independent double pack; fresh consumer starts.
- Alternating/simultaneous full/full і full/readonly process orchestration.
- Manual refresh, polling herd/trailing epoch, retry exhaustion, cancellation, stop/drain і restart.
- Raw timing/load/event-loop/memory/stale-age collection з exact repetitions.
- Handle/storage cleanup, public export/privacy, link/UTF-8/diff і architecture-pressure review.

## Ризики

- Noisy host/scheduler може спотворити fairness і p95.
- Synchronous adapter call може overshoot admission deadline.
- Polling і instrumentation самі створюють read competition.
- Full/full може бути звужений після negative evidence; це дозволений outcome.
- Contract-changing remediation не поміщається в stabilization run без нового owner decision.

## Припущення

- Accepted dependency tasks нададуть rerunnable fixtures й exact package surface.
- Certified test root є local same-host SQLite profile, не network/sync filesystem.
- Людина приймає topology verdict після незалежного P5-AUD1, а не за агрегатом одного run.

## Умови зупинки

- Будь-яка dependency не completed/accepted або її reviewed result змінюється до activation.
- Потрібен новий protocol/support scope чи зміна accepted P5-DG1/P5-DG2 contract.
- Raw evidence не можна відтворити або attribution до topology/profile не доведений.
- Correctness/integrity/cleanup failure потребує remediation поза stabilization boundary.

## Activation

Run Status: prepared
Activation: лише після completed/accepted TASK-0058..0061 та окремого explicit owner рішення; package preparation нічого не запускає.
