# Контекст виконання: RUN-001

Related Task: [P5-HARD1 / TASK-07.26-0059](../task.md)
Prepared: 2026-07-18
Prepared By: Planning Agent `/root` із delegated package author `/root/create_p5_wp1_hard1`
Previous Run: none

## Agent Role

Concurrency Engineer / Runtime Engineer

## Мета run

Поверх accepted P5-WP1 foundation реалізувати й довести на deterministic fake adapters internal admission-epoch synchronization actor, bounded retry, cancellation ownership, stop/intake/drain та fault routing до того, як P5-VS1 експонує public refresh/config.

## Ефективні вимоги

1. [P5-WP1](../../TASK-07.26-0058-p5-wp1-read-model-generation-coordinator-foundation/task.md) має бути completed/accepted до activation.
2. [P5-DG2 synchronization contract](../../../../technical/multi-instance-synchronization-contract.md) є authority для epoch, deadline, retry, cancellation, stop і ambiguous-commit semantics.
3. Shared chain має lifecycle-only cancellation; caller waiters володіють лише своїм очікуванням.
4. Deadline вимірюється від activation origin і забороняє new attempt admission після cutoff, але не обіцяє hard response timeout.
5. Retry finite, capped і jittered; `coordinator-conflict` є exact completed attempt failure.
6. Scheduler closes cohort before first adapter invocation; later trigger не губиться, а утворює serialized trailing epoch.
7. Stop closes intake before cancellation/drain та очищає timers/listeners.
8. Ambiguous commit reconciliation ніколи не входить у ordinary retry actor.
9. Public API/config/inspection не змінюються.
10. Activation не активує P5-VS1 або concrete SQLite tasks.

## Обсяг

- Internal actor/admission epochs/single-flight and trailing work.
- Fake monotonic clock, equal-jitter random, scheduler/timer і barrier seams.
- Bounded retry, deadline/admission, conflict/exhaustion result and inspection-ready internal state.
- Caller/lifecycle cancellation, stop/intake/drain, fault sink integration and cleanup.
- Deterministic fault/interleaving evidence and same-contract production internal wiring where applicable.

## Поза обсягом

- Public refresh/config, lazy queries, concrete polling/SQLite observation, topology support.
- Hard cancellation of synchronous call, hidden retry for returned write lock failure, commit retry.

## Критерії приймання run

- Виконано всі 10 критеріїв task.md.
- Epoch linearization не має lost/parallel invocation.
- Retry/cancellation/stop semantics deterministic під fake time/barriers.
- Ambiguous commit і write pipeline boundary не послаблені.
- Self-review та незалежний audit не мають open P0–P3.

## Обов’язкове task-specific читання

- [P5-WP1 task](../../TASK-07.26-0058-p5-wp1-read-model-generation-coordinator-foundation/task.md) і completed result після його появи.
- [P5-DG1 task](../../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/task.md), [contract](../../../../technical/read-model-completeness-contract.md) і final result.
- [P5-DG2 task](../../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/task.md), [contract](../../../../technical/multi-instance-synchronization-contract.md) і [final result](../../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/RUN-001/result.md).
- [Technical architecture](../../../../technical/architecture.md), [rules](../../../../technical/rules.md), [roadmap](../../../../product/roadmap.md).
- P5-WP1 coordinator/fault seams і current runtime lifecycle/stop/intake/write reconciliation source/tests через repository navigation.

## Заплановані результати

1. Internal admission-epoch actor and state/result contracts.
2. Bounded retry/backoff/jitter/deadline implementation.
3. Caller/lifecycle cancellation and stop/intake/drain integration.
4. RuntimeFaultSink and ambiguous-commit boundary enforcement.
5. Deterministic fake barrier/fault evidence, repository gates, self-review and independent audit.

## Перевірки

- Cohort-close, first-invocation, trailing epoch and no-parallel-call barriers.
- Attempts/deadline/backoff/equal-jitter/exhaustion matrices with fake monotonic time.
- Options/caller/lifecycle cancellation ownership and listener/timer cleanup.
- Stop during admission/backoff/adapter/CAS and post-stop intake rejection.
- Coordinator conflict, transient/integrity/unexpected and ambiguous-commit carve-out matrix.
- Full repository/package/no-public-diff gates.

## Ризики

- Неправильна epoch boundary втратить trigger або допустить parallel work.
- Caller signal може випадково стати chain authority.
- Synchronous call overshoot може бути задокументований як неправдивий SLA.
- Cleanup race може лишити active timer/listener після stop.
- Надто загальний retry helper перетне write commit boundary.

## Припущення

- P5-WP1 надає один publication coordinator, `RuntimeFaultSink` і deterministic observation/fake seams.
- Internal actor можна довести без public API і concrete SQLite dependency.
- Caller-visible pre-commit write lock failure лишається поза runtime-managed retry.

## Умови зупинки

- P5-WP1 не completed/accepted або його reviewed contract змінюється.
- Потрібен public API/config change до доведення internal lifecycle.
- Cancellation потребує unsafe termination synchronous driver call.
- Реалізація торкається ambiguous COMMIT ordinary retry або створює infinite/tight retry.

## Activation

Run Status: prepared
Activation: лише після completed/accepted P5-WP1 та окремої explicit команди власника; dependency completion не активує run автоматично.
