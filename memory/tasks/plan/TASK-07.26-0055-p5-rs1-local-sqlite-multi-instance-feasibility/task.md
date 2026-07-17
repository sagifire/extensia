# P5-RS1 / TASK-07.26-0055: Дослідити multi-instance здійсненність local-sqlite-v1

Task Status: done
Type: research
Created: 2026-07-17
Owner Role: Agent Systems Researcher
Current Run: RUN-001

## Поточний стан

Run Status: completed
Progress: Whole-task result approved; research accepted, RUN-001 completed, existing P5-DG2 selected for refined follow-up planning without activation.
Acceptance: 8/8 accepted and closed.
Blockers: none.
Blocked Phase: n/a
Pending Decisions: none for TASK-0055.
Next Action: none; P5-DG1 requires a separate activation, then refined P5-DG2 remains separately gated.

## Мета

Executable-доказами визначити фактичну multi-instance здійсненність чинного `embedded-transactional/local-sqlite-v1` для двох довгоживучих процесів у ролях `full/full` і `full/readonly`, не змінюючи production code, не обираючи design/public API та не створюючи support claim.

## Залежності та паралельність

- [P4-STAB / TASK-07.26-0053](../TASK-07.26-0053-p4-stab-phase-4/index.md) completed/accepted, explicit Phase 4 human gate пройдений.
- P5-RS1 може активуватися паралельно з [P5-DG1 / TASK-07.26-0056](../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/index.md) після окремого рішення для кожної задачі.
- Accepted result P5-RS1 є обов’язковим evidence gate для P5-DG2; він не активує P5-DG2 автоматично.

## Обсяг

- Зафіксувати точну current source/profile boundary `local-sqlite-v1`, Node/OS/filesystem/SQLite tuple і спосіб запуску двох довгоживучих процесів.
- Виконати `full/full` і `full/readonly` matrices на одному storage root із alternating session/commit та контрольованим interleaving.
- Перевірити journal observation через `readCommittedOperationsAfter(cursor)`, порядок sequence, visibility committed state та поведінку після cursor.
- Виміряти lock acquisition, timeout/contention, starvation indicators і session lifetime без зміни production locking policy.
- Зафіксувати restart/crash observations для writer/observer, reopen, cursor replay і post-crash visibility в межах недеструктивного process-level research.
- Визначити чесний verdict для candidate supported/unsupported topology, явно відділивши observation, inference і невідоме від support claim.
- Визначити representative fixture/workload methodology для P5-DG1/P5-DG2 і майбутньої stabilization без вигаданих SLA.
- Після activation створити task-local `RSCH-*`, detailed report у `memory/reports/research/`, self-review, незалежний audit і human review request.

## Поза обсягом

- Production source/tests/package/dependency changes або новий runtime harness у shipped package.
- Exact completeness, cursor, refresh, polling, stale-window, sync чи public/config/query design.
- Зміна `local-sqlite-v1` protocol/locking, новий driver profile або certification.
- Notification, retention/compaction, durable checkpoint чи direct external mutation reconciliation.
- Декларація підтримки multi-instance topology на основі research observations.
- Активація P5-DG1, P5-DG2 або будь-якої downstream Phase 5 task.

## Критерії приймання

1. Exact environment/profile/source boundary, fixture data, process harness, commands і raw outputs зафіксовані так, щоб representative scenarios можна було повторити.
2. Два довгоживучі процеси проходять контрольовану `full/full` matrix: alternating session/commit, visibility, sequence observation, contention/timeout і session release мають явні результати.
3. `full/readonly` matrix перевіряє visibility committed changes, journal-after-cursor capability boundary, reopen/restart behavior і відсутність неявного write/cleanup у readonly ролі.
4. Restart/crash observations відділяють confirmed behavior від недоведених crash/power-loss guarantees; ambiguous completion і post-reopen state явно записані.
5. Lock contention/timeout/starvation evidence прив’язане до чинної implementation і exact environment; workaround або production policy change не використані.
6. Result містить чесний feasible/conditional/infeasible verdict для кожної candidate topology, supported/unsupported constraints і явне застереження, що це не support claim.
7. Representative fixture methodology охоплює topology, data volume, journal distance, contention, catch-up burst, restart і вимірювання без premature SLA; downstream не активований.
8. Formal `RSCH-*` і detailed report завершені, research disposition записаний, self-review та незалежний audit не мають відкритих P0–P3, а whole-task result переданий на human review.

## Перевірки

- clean current package/profile identification;
- isolated two-process harness для `full/full` і `full/readonly`;
- alternating commit/observe/reopen matrix;
- journal-after-cursor gaps/duplicates/order observation;
- lock timeout/contention і process termination/restart cases;
- readonly before/after storage snapshot там, де це потрібно для zero-write evidence;
- independent rerun representative cases та audit inference/support boundaries.

## Ризики

- Current SQLite exclusive session policy може робити довгоживучі instances формально можливими, але practically starved або непридатними для polling.
- Test harness може ненавмисно серіалізувати процеси й приховати contention або stale visibility.
- Readonly interface може не мати journal observation capability, тому `full/readonly` viability для sync не можна вивести лише з resource visibility.
- Process-level observation може бути помилково розширена до platform, durability або support claim.
- Environment scheduling і filesystem cache можуть робити latency observation нестабільною; методологія має відділити correctness від characterization.

## Пов’язана пам’ять

- [Phase 5 task-set plan](../../../reports/research/2026-07-17-extensia-phase-5-task-set-plan.md)
- [TASK-0054 / RSCH-001](../TASK-07.26-0054-prepare-phase-5-task-set/RSCH-001.md)
- [P4-STAB](../TASK-07.26-0053-p4-stab-phase-4/index.md)
- [P4-WP1 local-sqlite-v1](../TASK-07.26-0049-p4-wp1-local-sqlite-driver/index.md)
- [ADR-0010](../../../technical/decisions/ADR-0010-local-sqlite-storage-protocol.md)
- [Write, Journal і Recovery Contract](../../../technical/write-journal-recovery-contract.md)
- [Technical Architecture](../../../technical/architecture.md)
- [Technical Rules](../../../technical/rules.md)

## Прогони

- [RUN-001](RUN-001/index.md) - completed; executable research accepted whole-task review.

## Дослідження

- [RSCH-001](RSCH-001.md) - completed / `final-result`; detailed executable feasibility report підготовлений.

## Фіксації

Немає; production/canonical design changes поза scope. Якщо research виявить потребу в canonical change, вона лише пропонується окремо й не застосовується цією задачею без explicit approval.

## Запити на рішення

Немає; whole-task result approved.

## Запропоновані follow-up задачі

- [P5-DG2 / TASK-07.26-0057](../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/index.md) - activation лише після accepted P5-RS1 та accepted/applied P5-DG1 contracts.

## Human Review

Status: approved
Requested: 2026-07-17
Reviewed: 2026-07-17
Approval Source: explicit user message in current Codex task: `все добре - approve`
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: existing P5-DG2 selected for refinement as separate Phase 5 research/design task; no activation.
Decision Notes: Approval accepts conditional/infeasible evidence without creating a support claim. P5-DG2 remains gated by accepted/applied P5-DG1 and requires separate activation.

## Фінальний результат

Completed: 2026-07-17
Final Run: RUN-001
Summary: Three-run `full/full`/`full/readonly` executable research accepted: storage primitives conditionally feasible, current live coherent topologies infeasible without Phase 5 sync/refresh/cursor/retry design; production and support boundary unchanged.
Residual Risks: Scheduler-sensitive lock contention, stale process-local indexes, readonly journal-seam absence, higher-volume/fairness/cross-platform/power-loss/SLA uncertainty remain owners of refined P5-DG2 and later stabilization/certification.
