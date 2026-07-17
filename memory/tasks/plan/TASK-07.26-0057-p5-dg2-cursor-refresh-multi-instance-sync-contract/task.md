# P5-DG2 / TASK-07.26-0057: Дослідити й спроєктувати multi-instance synchronization

Task Status: backlog
Type: research/design
Created: 2026-07-17
Owner Role: System Architect Hat / Concurrency Engineer Hat / Storage Engineer Hat
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Contract refined після accepted P5-RS1: process sync, refresh, cursor, retry/backoff, lock contention/fairness і downstream decomposition включені; RUN-001 не активований.
Acceptance: 0/11
Blockers: accepted/applied P5-DG1 contract; P5-RS1 accepted.
Blocked Phase: activation gate
Pending Decisions: accepted/applied P5-DG1, потім explicit activation RUN-001.
Next Action: Не активувати до accepted/applied P5-DG1; після gate окремо активувати research/design run.

## Мета

Порівняти й обрати цілісну архітектуру синхронізації кількох Extensia processes: journal observation, cursor, explicit refresh, polling/notification triggers, retry/backoff, lock-contention/fairness policy, stale boundary та local-vs-external publication; після owner review підготувати exact похідну implementation/stabilization task decomposition без distributed multiwriter assumptions.

## Залежності

- [P5-RS1 / TASK-0055](../TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/index.md) completed/accepted whole-task result: storage primitives conditionally feasible, current live coherent topologies infeasible.
- [P5-DG1 / TASK-0056](../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/index.md) accepted result і required fixations applied.
- Completed Phase 4 gate і concrete committed journal/profile evidence.
- Dependency completion не активує P5-DG2 автоматично.

## Обсяг

- Cursor ownership, initialization, advancement, runtime restart і relation до coherent index generation.
- Actor/sequence/order policy, including own entries, duplicates/gaps/regressions і cursor-ahead behavior.
- Порівняння topology/coordination strategies: symmetric `full/full`, `full/readonly`, designated writer/single-writer coordination та явне звуження unsupported variants відповідно до P5-RS1 evidence.
- Порівняння explicit refresh, background polling, driver notification і hybrid trigger strategies; exact owner disposition, stale window й diagnostics.
- Exact retry policy для transient lock/unavailable failures: caller-managed vs runtime-managed ownership, attempt/deadline budget, exponential backoff, jitter, cancellation, idempotency і exhaustion result без silent infinite retry.
- Lock/session policy: `busy_timeout` relation, session lifetime/batch size, reader-vs-writer contention, starvation/fairness indicators, thundering-herd prevention і polling coordination без зміни SQLite safety contract навмання.
- Transient storage/lock failure versus integrity fail-close; cursor не просувається без complete application.
- Startup catch-up, ready publication, concurrent refresh, stop/intake/drain і retry lifecycle.
- Єдиний process-local coordinator для local post-commit publication та external reload/invalidation batch.
- Narrow observation/change-feed seam для readonly/full capabilities без raw transaction leakage.
- Alternative comparison має містити correctness, complexity, latency/load characterization, failure blast radius, portability, operability і architecture-pressure trade-offs без premature SLA.
- Exact public/config/API wording, tests, formal `RSCH-*`, report, `FIX-*`, self-review, independent audit і human review.
- Exact downstream task map/contracts для обраного рішення: shared foundation/seam, refresh/query integration, multi-instance sync, retry/contention hardening, stabilization і independent phase audit; packages/activation лише за explicit owner decisions.

## Поза обсягом

- Production implementation або activation похідних P5-WP/VS/STAB/AUD tasks.
- Реалізація driver notification/watch subsystem; design gate зобов’язана порівняти notification alternative і явно її прийняти, відкласти або відхилити.
- Journal retention/compaction, durable cursor/index checkpoint або historical replay service.
- Direct external storage mutation reconciliation.
- Network/distributed/fine-grained multi-writer, multi-host чи HA topology.
- Final P7 compatibility freeze.

## Критерії приймання

1. Architecture options matrix порівнює щонайменше explicit refresh, polling, notification/hybrid triggers і допустимі role/topology variants за correctness, complexity, load, failure та portability; одна recommendation або explicit bounded alternatives мають owner-ready rationale.
2. Cursor state machine визначає startup head/catch-up, per-entry/batch advancement, restart і no-skip invariant відносно coherent index generation.
3. Sequence/actor policy проходить matrices own/external, empty, duplicate, gap, regression, ahead і replay без merge by guess.
4. Supported `full/full`, `full/readonly`, designated-writer і unsupported topology точно відповідають accepted P5-RS1 evidence; support claim не випереджає implementation/stabilization.
5. Refresh/trigger contract визначає explicit call, optional background behavior, stale visibility, coalescing, diagnostics, cancellation і lifecycle без прихованого success.
6. Retry/lock policy визначає ownership, retryable classes, attempt/deadline/backoff/jitter budget, idempotency, fairness/starvation handling, session lifetime й terminal normalized result; infinite/tight retries заборонені.
7. Transient unavailable/lock failure не просуває cursor; integrity failure fail-close-ить ready/intake за визначеним contract.
8. Startup/ready/refresh/stop/drain lifecycle і concurrent calls мають deterministic ownership та cleanup.
9. Local commit publication і external batch serialized одним coordinator; stale external state не перезаписує newer local view. Narrow driver observation seam підтримує required roles і не відкриває raw transaction API.
10. Result містить exact downstream task decomposition, dependencies, acceptance/evidence gates, parallelism і activation boundary для materialization, implementation, retry/contention hardening, stabilization й audit.
11. Formal research/report/FIX proposals, verification, self-review й independent audit завершені без open P0–P3 і передані на human review.

## Ризики

- Durable cursor без atomic durable index checkpoint може пропустити changes після restart.
- Actor filtering до cursor advancement може створити gaps.
- Tight SQLite polling може спричинити starvation через exclusive sessions.
- Runtime-managed retry може створити retry storm, latency amplification або приховати caller-visible contention.
- Designated-writer coordination може зменшити contention, але створити leader/availability complexity, непропорційну in-process V1.
- Symmetric full/full без exact fairness/deadline contract може мати scheduler-dependent starvation.
- External batch може race-нути local post-commit index publication.
- Background lifecycle може пережити stop або приховати stale/failure state.

## Пов’язана пам’ять

- [Phase 5 task-set plan](../../../reports/research/2026-07-17-extensia-phase-5-task-set-plan.md)
- [Write/journal/recovery contract](../../../technical/write-journal-recovery-contract.md)
- [Technical architecture](../../../technical/architecture.md)
- [P5-RS1](../TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/index.md)
- [P5-RS1 detailed evidence](../../../reports/research/2026-07-17-extensia-local-sqlite-multi-instance-feasibility.md)
- [P5-DG1](../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/index.md)

## Прогони

- [RUN-001](RUN-001/index.md) - prepared/refined після accepted P5-RS1; P5-DG1 dependency unresolved, activation не надана.

## Дослідження

Немає; створюються після dependency gate й activation.

## Фіксації

Немає; exact proposals готуються в active run і не застосовуються без approval.

## Запити на рішення

- Поточне: дочекатися dependency gate; потім окрема explicit activation.
- Після review-ready: `approve | request changes | cancel` і окремі рішення для `FIX-*`/follow-ups.

## Запропоновані follow-up задачі

- RUN-001 має запропонувати exact похідний task set. Preliminary boundaries: shared read-model/observation foundation, explicit refresh/query integration, multi-instance synchronization, retry/contention hardening, stabilization і independent Phase 5 audit. Exact IDs/packages створюються або активуються тільки за explicit owner decisions після review.

## Human Review

Status: not-ready
Requested: n/a
Reviewed: pending
Approval Source: n/a
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: pending
Decision Notes: 2026-07-17 contract refined за explicit user request після accepted P5-RS1. Refinement не є activation, design choice, support claim або downstream task creation.

## Фінальний результат

Completed: pending
Final Run: pending
Summary: pending
Residual Risks: pending
