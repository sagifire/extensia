# P5-HARD1 / TASK-07.26-0059: Реалізувати synchronization actor, bounded retry і lifecycle

Task Status: done
Type: implementation/hardening
Created: 2026-07-18
Owner Role: Concurrency Engineer / Runtime Engineer
Current Run: RUN-001

## Поточний стан

Run Status: completed
Progress: completed and accepted by whole-task human review.
Acceptance: 10/10; final independent `PASS / REVIEW_READY`, open P0–P3 `0`.
Blockers: немає; P5-WP1 completed і accepted.
Blocked Phase: n/a
Pending Decisions: немає.
Next Action: TASK-0060 може бути активована лише окремою explicit командою власника.

## Мета

Реалізувати внутрішній admission-epoch single-flight synchronization actor поверх foundation P5-WP1: bounded retry з activation-origin attempt-admission deadline та equal jitter, exact `coordinator-conflict`, `RuntimeFaultSink`, stop/intake/drain, independent caller cancellation і listener cleanup. Спочатку довести semantics на deterministic fake adapters; public refresh/config ще не експонувати.

## Залежності й activation gate

- [P5-WP1 / TASK-07.26-0058](../TASK-07.26-0058-p5-wp1-read-model-generation-coordinator-foundation/index.md) — має бути completed і whole-task accepted.
- Authority: [P5-DG1](../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/index.md) та [P5-DG2](../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/index.md) accepted/applied contracts.
- Створення package або completion P5-WP1 не активує RUN-001. Activation дозволена лише окремою explicit командою після перевірки dependency state.

## Обсяг

- Internal admission-epoch single-flight actor: один shared chain на cohort, scheduler closes cohort before first adapter invocation, post-invocation trigger отримує serialized trailing epoch.
- Activation-origin monotonic attempt-admission deadline: no new attempt після cutoff; вже admitted synchronous call може overshoot і це не видається за hard response timeout.
- Bounded attempts, exponential backoff, capped equal jitter, remaining-budget adapter timeout, deterministic injectable clock/random/scheduler.
- Exact retryable/exhaustion classification, including `coordinator-conflict`; deadline precedence на simultaneous deadline/attempt exhaustion.
- Separate lifecycle-only chain cancellation і caller waiters: pre-aborted caller не admitted; waiter cancellation не cancel-ить shared chain навіть якщо waiter один.
- Stop sequence intake close, scheduler/backoff cancellation, admitted work drain, listener/timer cleanup і post-intake `MODULE_NOT_READY`.
- `RuntimeFaultSink` integration для integrity/fatal fail-close; transient lock/unavailable лишаються bounded expected failures.
- Ambiguous COMMIT/reconciliation carve-out: actor ніколи не retry-ить staging/commit або outcome-unknown write.
- Deterministic fake adapter/barrier/fault matrices до будь-якого public exposure.

## Поза обсягом

- Public `query.refresh()`, synchronization config/inspection DTO або compatibility surface.
- Concrete SQLite observation, polling scheduler integration, live two-process topology чи support claim.
- Caller-hidden retry returned write lock failures; command pre-commit contention лишається caller-managed.
- Hard cancel of already running synchronous driver call або hard wall-clock response deadline.
- Durable cursor/checkpoint, notification, leader election, distributed/HA semantics.

## Критерії приймання

1. Admission-epoch actor coalesces pre-invocation cohort в одну shared chain і серіалізує post-invocation triggers як trailing epoch без lost wakeup чи parallel adapter call.
2. Retry має finite attempts, activation-origin monotonic admission deadline, exponential capped equal jitter і remaining-budget timeout; no new attempt починається після cutoff.
3. Already-admitted synchronous call may overshoot deadline, але після settlement не запускається нова attempt; evidence окремо відрізняє admission deadline від hard response timeout.
4. Exhaustion reason deterministic: deadline wins, якщо cutoff досягнуто після failure/backoff навіть одночасно з max attempts; інакше max attempts; `coordinator-conflict` враховується як completed failed attempt.
5. Pre-aborted caller повертає canceled без admission; options signal, caller waiters і lifecycle signal мають розділене ownership, а waiter cancellation ніколи не cancel-ить shared chain.
6. Stop закриває intake, cancel-ить lifecycle/backoff/scheduler, drain-ить admitted work, завершує unresolved admitted waiters canceled, видаляє listeners/timers; нові calls повертають `MODULE_NOT_READY`.
7. CAS/coordinator conflict, transient lock/unavailable, integrity fault і generic unexpected fault проходять exact matrix; integrity/fatal route-яться в `RuntimeFaultSink` і не masquerade-яться як retryable.
8. Ambiguous COMMIT і будь-яка staging/commit write phase не входять у actor retry; outcome-definite reconciliation contract не послаблено.
9. Deterministic fake barrier tests покривають cohort close, trailing epochs, options/caller cancellation ownership, stop during backoff/adapter/CAS, listener cleanup, deadline overshoot і simultaneous exhaustion boundaries.
10. Немає infinite/tight retry, unbounded listener/timer growth, public API/config diff або test-only parallel architecture; repository/package gates і independent audit проходять без open P0–P3.

## Перевірки

- Fake-clock/random/scheduler tests для attempt/backoff/jitter/admission-deadline matrices.
- Barrier interleavings: pre/post first invocation, trailing epoch, stop-before-admission, stop-in-backoff, stop-in-adapter, stop-at-CAS.
- Options-aborted, caller-aborted, multiple waiters, sole waiter, lifecycle cancellation і listener/timer leak assertions.
- Exhaustion precedence, coordinator-conflict accounting, final-call overshoot і no-new-attempt after cutoff.
- Fault matrix для transient/integrity/unexpected/ambiguous commit carve-out.
- Full repository typecheck/lint/test/build/package gates, no-public-snapshot diff і `git diff --check`.

## Ризики

- Помилкове cancellation ownership може зупинити shared work через одного caller або лишити waiter unresolved.
- Deadline може ненавмисно стати неправдивим hard latency SLA для synchronous SQLite call.
- Trigger після first invocation може загубитися через нечітку epoch linearization.
- Retry storm/tight loop або jitter без deterministic seam зробить behavior flaky і unfair.
- Generic retry wrapper навколо write commit зламає outcome-definite semantics.

## Пов’язана пам’ять

- [Read-model completeness contract](../../../technical/read-model-completeness-contract.md)
- [Multi-instance synchronization contract](../../../technical/multi-instance-synchronization-contract.md)
- [Technical architecture](../../../technical/architecture.md)
- [Technical rules](../../../technical/rules.md)
- [Product roadmap](../../../product/roadmap.md)
- [Phase 5 task-set plan](../../../reports/research/2026-07-17-extensia-phase-5-task-set-plan.md)
- [P5-DG1 final result](../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/RUN-003/result.md)
- [P5-DG2 final result](../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/RUN-001/result.md)

## Прогони

- [RUN-001](RUN-001/index.md) - completed and accepted implementation/hardening run.

## Дослідження

Немає.

## Фіксації

Немає; canonical/public changes потребують окремого design/FIX decision.

## Запити на рішення

- Resolved: користувач явно активував `P5-HARD1 / TASK-07.26-0059 / RUN-001` 2026-08-23 і дозволив субагентів.
- Resolved: користувач схвалив whole-task result 2026-08-23; canonical fixation не потрібна, downstream не активовано.

## Downstream

- [P5-VS1 / TASK-07.26-0060](../TASK-07.26-0060-p5-vs1-lazy-refresh-public-integration/index.md) - наступна послідовна task; public lazy/refresh/config може бути активована лише після completed/accepted P5-HARD1 й окремої explicit команди.

## Human Review

Status: approved
Requested: 2026-08-23
Reviewed: 2026-08-23
Approval Source: explicit user command `Task approve`
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: none
Decision Notes: whole-task result approved; canonical fixation not-needed; downstream activation не надана.

## Фінальний результат

Completed: 2026-08-23
Final Run: RUN-001
Summary: internal admission-epoch synchronization actor, bounded retry, exact fault taxonomy і lifecycle integration реалізовані; 346-test full gate та independent audit зелені.
Residual Risks: concrete SQLite remaining-budget timeout, polling, live topology evidence і support claim належать P5-VS2; public lazy/refresh/config integration належить P5-VS1.
