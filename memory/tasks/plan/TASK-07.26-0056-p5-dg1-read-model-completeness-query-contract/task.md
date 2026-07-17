# P5-DG1 / TASK-07.26-0056: Спроєктувати completeness, query та index contract

Task Status: backlog
Type: design
Created: 2026-07-17
Owner Role: Product Lead Hat / System Architect Hat
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Design contract і RUN-001 підготовлені; виконання не активоване.
Acceptance: 0/8
Blockers: none; completed Phase 4 перевіряється перед activation.
Blocked Phase: n/a
Pending Decisions: explicit activation RUN-001.
Next Action: Окремо активувати RUN-001; P5-DG1 може виконуватися паралельно з P5-RS1.

## Мета

Визначити exact `greedy`/`lazy` completeness, public/config/query behavior і один coherent read-model generation contract для Resource/tree/Mark/Asset projections без silently partial results, index-as-truth або передчасної P7 compatibility freeze.

## Залежності та паралельність

- [P4-STAB / TASK-0053](../TASK-07.26-0053-p4-stab-phase-4/index.md) completed/accepted.
- Може активуватися паралельно з [P5-RS1 / TASK-0055](../TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/index.md).
- Accepted/applied P5-DG1 разом з accepted P5-RS1 є prerequisites [P5-DG2 / TASK-0057](../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/index.md).

## Обсяг

- Exact semantics `greedy`/`lazy` для point get, existing one-level tree/closure та candidate global queries.
- Explicit complete/unavailable/completeness-metadata behavior; silently partial arrays або trees заборонені.
- Public/config/query compatibility wording для loading mode, result/failure і snapshot ownership без final P7 freeze.
- Exact coherent projection set: Resource by ID, children/tree, Mark lookup, Asset owner, primary Asset і lineage reverse лише відповідно до accepted query catalog.
- Rebuild generation, integrity validation, atomic publication, invalidation і local post-commit update rules.
- Narrow selective observation capabilities для lazy mode без raw session/transaction leakage.
- Representative fixtures і performance evidence methodology без SLA.
- Formal `RSCH-*`, detailed report, exact `FIX-*` proposals, self-review, independent audit і human review.

## Поза обсягом

- Production implementation, package/API export changes або Phase 5 task activation.
- Cursor, refresh/polling, stale-window і multi-instance lifecycle contract P5-DG2.
- Notification, retention/compaction, durable cache/checkpoint, direct mutation reconciliation.
- Final public compatibility/error catalog freeze P7.

## Критерії приймання

1. Query catalog класифікує point/tree/global reads і для кожного визначає exact behavior у `greedy` та `lazy` modes.
2. Жоден success не може маскувати partial result як complete; unavailable/completeness metadata й normalized failures мають exact wording.
3. Loading-mode config/public boundary, defaults, lifecycle visibility та compatibility label погоджені без accidental final freeze.
4. Projection schema й invariants охоплюють лише потрібні Resource/tree/Mark/Asset relations та публікуються однією coherent generation.
5. Full rebuild, integrity failure, local commit publication, lazy load/invalidation і snapshot detachment мають state/scenario matrices.
6. Selective storage observation seam зберігає driver-as-truth, readonly/full symmetry де потрібна й не відкриває raw transaction API.
7. Representative fixtures, memory/startup/lazy-first-read methodology й downstream boundaries визначені; implementation shells не активовані.
8. Formal research/report/FIX proposals, self-review та independent audit завершені без open P0–P3 і передані на human review.

## Ризики

- Global query може мовчки стати partial у lazy mode.
- Незалежні mutable maps можуть публікувати inconsistent projections.
- O(N) whole-generation rebuild на кожен write може створити architecture pressure.
- Lazy seam може дублювати full-driver read path або протекти в public API.
- Conceptual source signatures можуть бути помилково заморожені як final API.

## Пов’язана пам’ять

- [Phase 5 task-set plan](../../../reports/research/2026-07-17-extensia-phase-5-task-set-plan.md)
- [TASK-0054 / RSCH-001](../TASK-07.26-0054-prepare-phase-5-task-set/RSCH-001.md)
- [Roadmap](../../../product/roadmap.md)
- [Delivery plan](../../../reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md)
- [Public read contract](../../../technical/public-read-contract.md)
- [Technical architecture](../../../technical/architecture.md)

## Прогони

- [RUN-001](RUN-001/index.md) - prepared; activation не надана.

## Дослідження

Немає; створюються після activation.

## Фіксації

Немає; exact proposals готуються під час active run і не застосовуються без approval.

## Запити на рішення

- Поточне: explicit activation RUN-001.
- Після review-ready: `approve | request changes | cancel` для whole-task result і окремі рішення для `FIX-*`/follow-ups.

## Запропоновані follow-up задачі

- P5-DG2 після accepted P5-RS1 і accepted/applied P5-DG1.
- P5-WP1/VS1/VS2/STAB/AUD1 — proposals до завершення owner gates.

## Human Review

Status: not-ready
Requested: n/a
Reviewed: pending
Approval Source: n/a
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: pending
Decision Notes: Package preparation не є activation або design approval.

## Фінальний результат

Completed: pending
Final Run: pending
Summary: pending
Residual Risks: pending
