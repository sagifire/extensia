# P5-DG2 / TASK-07.26-0057: Дослідити й спроєктувати multi-instance synchronization

Task Status: done
Type: research/design
Created: 2026-07-17
Owner Role: System Architect Hat / Concurrency Engineer Hat / Storage Engineer Hat
Current Run: RUN-001

## Поточний стан

Run Status: completed
Progress: Whole-task approved; FIX-001 applied exactly; independent post-application audit `PASS` with P0/P1/P2/P3 = 0/0/0/0. Downstream plan accepted without package creation/activation.
Acceptance: 11/11; `REVIEW_READY`.
Blockers: none; prerequisites satisfied.
Blocked Phase: n/a
Pending Decisions: none for this task; downstream package preparation/activation remains separately gated.
Next Action: none; a separate explicit owner command is required to prepare or activate any accepted downstream package.

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

- [RUN-001](RUN-001/index.md) - completed research/design run; FIX-001 applied and post-application audit `PASS`.

## Дослідження

- [RSCH-001](RSCH-001.md) - completed / `final-result`; exact synchronization design і downstream task map підготовлені.

## Фіксації

- [FIX-001](FIX-001.md) - required / proposed / not applied; exact canonical contract, ADR і consistency updates потребують окремого approval.

## Запити на рішення

- Поточне: RUN-001 `REVIEW_READY` 2026-07-18; whole-task, required FIX-001 і downstream proposal decisions requested.
- Після review-ready: `approve | request changes | cancel` і окремі рішення для `FIX-*`/follow-ups.

## Запропоновані follow-up задачі

- Exact proposed chain: `P5-WP1` generation/coordinator/seams -> `P5-HARD1` internal retry/single-flight/lifecycle -> `P5-VS1` lazy + public explicit refresh/config -> `P5-VS2` concrete multi-instance sync/polling/contention -> `P5-STAB` -> `P5-AUD1` -> human Phase 5 gate.
- Packages не створені й не активовані; кожна preparation/activation потребує окремого explicit owner decision після accepted/applied P5-DG2.

## Human Review

Status: approved
Requested: 2026-07-18
Reviewed: 2026-07-18
Approval Source: user message `task: approve; FIX-001: approve; accept plan`
Approved Fixations: FIX-001
Rejected Fixations: none
Follow-up Decisions: exact downstream plan accepted; packages remain absent and require separate explicit preparation/activation decisions.
Decision Notes: Whole-task result and required FIX-001 explicitly approved 2026-07-18. Plan acceptance does not create or activate `P5-WP1/P5-HARD1/P5-VS1/P5-VS2/P5-STAB/P5-AUD1`.

## Фінальний результат

Completed: 2026-07-18
Final Run: RUN-001
Summary: Exact multi-instance synchronization/cursor/refresh contract accepted; required FIX-001 applied exactly; final independent post-application audit `PASS`; downstream plan accepted without package creation/activation.
Residual Risks: Same-host `full/full`/`full/readonly` support remains gated by implementation, P5-STAB/P5-AUD1 and human gate; synchronous SQLite contention/fairness, O(distance+storage) rebuild, ambiguous COMMIT drain, experimental public names and broader topology remain explicit future owners.
