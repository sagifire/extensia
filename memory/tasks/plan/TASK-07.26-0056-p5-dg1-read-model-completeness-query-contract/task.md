# P5-DG1 / TASK-07.26-0056: Спроєктувати completeness, query та index contract

Task Status: done
Type: design
Created: 2026-07-17
Owner Role: Product Lead Hat / System Architect Hat
Current Run: RUN-003

## Поточний стан

Run Status: completed
Progress: Whole-task and corrective result approved; FIX-002/FIX-003 applied exactly; final repeated audit `PASS`.
Acceptance: original 8/8 and corrective 5/5 accepted and closed.
Blockers: none; P4-STAB і P5-RS1 dependencies satisfied.
Blocked Phase: n/a
Pending Decisions: none; downstream activation not requested.
Next Action: none; P5-DG2 requires separate explicit activation.

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

- [RUN-001](RUN-001/index.md) - failed post-freeze exact-manifest validation; design body frozen.
- [RUN-002](RUN-002/index.md) - review-ready corrective run для FIX-002.
- [RUN-003](RUN-003/index.md) - completed corrective run; final post-application audit `PASS`.

## Дослідження

- [RSCH-001](RSCH-001.md) - completed / `final-result`; detailed exact contract підготовлений.

## Фіксації

- [FIX-001](FIX-001.md) - superseded / not applied; frozen proposal має invalid source hash.
- [FIX-002](FIX-002.md) - required / approved / applied 2026-07-17; exact application verified.
- [FIX-003](FIX-003.md) - required / approved / applied 2026-07-18; final repeated audit `PASS`.

## Запити на рішення

- Resolved: RUN-002 whole-task approved; FIX-002 approved/applied; FIX-001 superseded/not applied; downstream not activated.
- Resolved: corrective RUN-003 approved; required FIX-003 approved/applied; no pending decisions.

## Запропоновані follow-up задачі

- P5-DG2 після accepted P5-RS1 і accepted/applied P5-DG1.
- P5-WP1/VS1/VS2/STAB/AUD1 — proposals до завершення owner gates.

## Human Review

Status: approved-completed
Requested: 2026-07-17 (corrective RUN-003)
Reviewed: RUN-002 approved 2026-07-17; corrective RUN-003 approved 2026-07-18
Approval Source: explicit user decisions `Whole-task: approve` and `RUN-003: approve`
Approved Fixations: FIX-002 (`Required FIX-002: approve`); FIX-003 (`FIX-003: approve`)
Rejected Fixations: none
Follow-up Decisions: P5-DG2 remains backlog/prepared; no downstream activation.
Decision Notes: RUN-002/FIX-002 approval/application retained. RUN-003/FIX-003 approved/applied exactly; final repeated audit `PASS`. P5-DG2 remains inactive.

## Фінальний результат

Completed: 2026-07-18
Final Run: RUN-003
Summary: Exact complete-only greedy/lazy read-model contract, coherent generation, coverage/query semantics and narrow observation boundary accepted/applied through FIX-002; truthful prospective roadmap correction applied through FIX-003; final repeated audit `PASS`.
Residual Risks: Cursor/refresh/retry/stale-window/topology/fairness and exact downstream implementation packages remain owned by separately activated P5-DG2 and later implementation/stabilization gates.
