# Контекст виконання: RUN-001

Related Task: [P4-VS2 / TASK-07.26-0051](../task.md)
Prepared: 2026-07-15
Prepared By: Agent Planner `/root/create_phase4_tasks`
Previous Run: none

## Мета run

Materialize-ити exact accepted Asset metadata slice на shared production pipeline після P4-VS1, зберігши current public snapshot shape і виключивши bytes/payload finalization.

## Effective requirements

1. `technical/asset-contract.md` sections 4–10 і verification matrix є normative authority.
2. P4-VS1 має бути completed/accepted до activation.
3. Один shared Core/Operation Engine і один semantic commit/journal path; Asset-only parallel engine заборонений.
4. Initial internal Asset metadata staged-only; payload visibility не симулюється.
5. Current public `AssetSnapshot` shape незмінна; internal seam не містить physical path/session/transaction token.
6. Readonly/no-change/failure не створюють mutation, timestamp або journal entry.

## Пов’язана пам’ять

- [P4-VS1](../../TASK-07.26-0050-p4-vs1-concrete-resource-durability/task.md)
- [P4-DG2](../../TASK-07.26-0040-p4-dg2-asset-contracts/task.md)
- [Asset Contract](../../../../technical/asset-contract.md)
- [Write contract](../../../../technical/write-journal-recovery-contract.md)
- [Architecture](../../../../technical/architecture.md)
- [Rules](../../../../technical/rules.md)
- [Roadmap](../../../../product/roadmap.md)
- [Asset contract report](../../../../reports/research/2026-07-15-extensia-asset-contracts.md)
- [Phase 4 owner-gate plan](../../../../reports/research/2026-07-12-extensia-phase-4-owner-gate-plan.md)

## Заплановані результати

1. Contract-to-code/test traceability для sections 4–10.
2. Pure strict validators і startup aggregate validation.
3. External/internal metadata command lifecycle через shared pipeline.
4. Exact lineage/primary/reassign/delete/conflict semantics.
5. Journal/timestamp/publication/restart evidence, full gates і review.

## Перевірки

- table/property tests;
- aggregate integration/concurrency/failure tests;
- restart/startup integrity matrix;
- public shape and internal leakage negative assertions;
- full/package/double-pack gate.

## Обмеження

- Жодного bytes transport, finish/abort payload implementation, P5 indexes або P7 compatibility freeze.
- Не розширювати scope фізичним upload API.
- Після activation context незмінний.

## Умови зупинки

- P4-VS1 не completed/accepted.
- Accepted Asset contract потребує зміни або має executable contradiction.
- Реалізація вимагає другого semantic pipeline чи physical leakage.
- Exact global UUID/lineage/startup integrity неможливо забезпечити в чинній durability domain без нового owner decision.

## Ризики й assumptions

- Assumption: P4-VS1 залишає production composition і recovery gates доступними для aggregate extension.
- Broader coherent loads можуть створити latency/lock pressure; виміряти до review.
- Staged metadata не є доказом upload readiness.

## Activation

Run Status: prepared
Activation: тільки після completed/accepted P4-VS1 та explicit рішення; package preparation не активує run.

