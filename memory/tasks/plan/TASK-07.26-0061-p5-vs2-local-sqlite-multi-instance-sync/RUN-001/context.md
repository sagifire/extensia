# Контекст виконання: RUN-001

Related Task: [P5-VS2 / TASK-07.26-0061](../task.md)
Prepared: 2026-07-18
Prepared By: Agent Planner `/root/create_p5_vs1_vs2`
Previous Run: none

## Agent Role

Storage Engineer / Concurrency Engineer

## Мета run

Матеріалізувати P5-DG2 contract у concrete `local-sqlite-v1`: coherent full/readonly observation, volatile cursor, bounded delta/rebuild, opt-in polling і rerunnable two-process synchronization/contention evidence без support claim.

## Умови активації

1. [P5-VS1 / TASK-07.26-0060](../../TASK-07.26-0060-p5-vs1-lazy-refresh-public-integration/task.md) completed і accepted.
2. [P5-RS1 / TASK-07.26-0055](../../TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/task.md) accepted як feasibility baseline.
3. Applied [P5-DG1](../../../../technical/read-model-completeness-contract.md) та [P5-DG2](../../../../technical/multi-instance-synchronization-contract.md) contracts лишаються authority.
4. Потрібне окреме explicit activation рішення; package creation не активує run або P5-STAB.

## Ефективні вимоги

1. Один consumer-owned coherent semantic observation seam симетричний для full/readonly і не відкриває SQLite internals.
2. Cursor volatile й публікується atomically з generation; restart завжди rebuild + same-observation head capture.
3. Sequence є єдиною order authority; own/external entries traverse одну contiguous chain.
4. Delta candidate має одночасно `entry_count <= 256` і `distinct_resource_count <= 256`; інакше full rebuild.
5. SQLite busy timeout обмежений remaining attempt-admission budget; hard response deadline не заявляється.
6. Polling opt-in, coalesced і lifecycle-bounded; notification не correctness authority.
7. Full/full та full/readonly лишаються experimental candidates до stabilization/audit/human gate.

## Обсяг

- concrete full/readonly committed-change observation;
- readonly zero-write proof;
- volatile cursor/startup/restart semantics;
- 256/256 delta і 257 rebuild boundary;
- remaining-budget busy timeout;
- opt-in polling coordinator integration;
- two-process external sync/contention diagnostics.

## Поза обсягом

- topology support declaration;
- durable cursor, notification correctness, multi-host/HA/arbitrary process count;
- hidden write retry або ambiguous-COMMIT semantic change;
- raw driver/session/layout public or Core seam;
- P5-STAB/P5-AUD1 execution.

## Критерії приймання run

1. Coherent detached full/readonly observation without raw seam.
2. Readonly zero durable writes.
3. Restart rebuild and same-observation head capture.
4. Contiguous sequence and fail-close anomalies.
5. Exact 0/1/32/256/257 delta/rebuild matrix.
6. Remaining-budget timeout and measured overshoot.
7. Coalesced jittered polling lifecycle.
8. Two-process full/full and full/readonly sync/contention.
9. Resource/Asset/Mark coverage plus safe raw diagnostics.
10. Full gates/audit green; support remains unclaimed.

## Пов’язана пам’ять

- [P5-VS1](../../TASK-07.26-0060-p5-vs1-lazy-refresh-public-integration/task.md)
- [P5-RS1](../../TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/task.md)
- [P5-DG1](../../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/task.md)
- [P5-DG2](../../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/task.md)
- [Read-model completeness contract](../../../../technical/read-model-completeness-contract.md)
- [Multi-instance synchronization contract](../../../../technical/multi-instance-synchronization-contract.md)
- [Architecture](../../../../technical/architecture.md)
- [Rules](../../../../technical/rules.md)
- [Roadmap](../../../../product/roadmap.md)

## Заплановані результати

1. Concrete adapter/seam implementation і traceability matrix.
2. Threshold, cursor, restart, polling та readonly conformance evidence.
3. Rerunnable two-process process harness і raw contention diagnostics.
4. Package/full-gate evidence, self-review та independent audit.

## Перевірки

- observation/cursor/sequence unit and integration fixtures;
- readonly snapshot diff;
- 0/1/32/256/257 threshold matrix;
- child-process full/full і full/readonly harness;
- timeout overshoot, writer/poller/herd and stop/drain barriers;
- package smoke, `npm run check` і повний repository gate.

## Умови зупинки

- Потрібна зміна accepted P5-DG1/P5-DG2/P5-VS1 semantics.
- Coherent readonly observation неможливий без durable mutation або raw SQLite leakage.
- Correctness вимагає hidden command retry, leader election чи durable cursor.
- Delta/rebuild не можна publish-ити atomically з cursor/generation.
- Required two-process environment/evidence недоступні.

## Ризики й припущення

- Assumption: P5-VS1 надає accepted public/lazy surface над hardened coordinator.
- `DatabaseSync` final admitted call може overshoot-нути admission deadline; це вимірюється, а не маскується.
- Full/full fairness може не пройти stabilization і support буде звужено до designated-writer full/readonly.

## Activation

Run Status: prepared
Activation: тільки explicit рішення після dependency gate; підготовка package не активує run.
