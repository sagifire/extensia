# План owner gates фази 4 Extensia

Related Task: [TASK-07.26-0038](../../tasks/plan/TASK-07.26-0038-prepare-phase-4-owner-gates/task.md)
Related Run: [RUN-001](../../tasks/plan/TASK-07.26-0038-prepare-phase-4-owner-gates/RUN-001/index.md)
Task-local Research: [RSCH-001](../../tasks/plan/TASK-07.26-0038-prepare-phase-4-owner-gates/RSCH-001.md)
Date: 2026-07-12
Status: final for TASK-0038 human review

## Outcome

Phase 3 завершена й прийнята, тому owner-gate деталізація Phase 4 дозволена. Confidence достатня для двох паралельних design/research tasks, але недостатня для canonical implementation tasks.

## Canonical tasks now

1. `P4-DG1 / TASK-0039` — вибір concrete driver і physical protocol, що доводить outcome-definite commit, atomic/staged publication, locking, recovery, corruption і readonly semantics реальними process/crash evidence.
2. `P4-DG2 / TASK-0040` — exact Asset domain/API contracts: internal/external, validation, primary, `derived_from`, data limits, logical upload state machine, visibility, retry/recovery ownership.

Обидві задачі мають статус `backlog`, RUN-001 `prepared` і не активуються цим planning run.

## Dependency graph

`Phase 3 gate -> P4-DG1 -> approved/applied design -> P4-WP1 -> P4-VS1`

`Phase 3 gate -> P4-DG2 -> approved/applied design -> join before P4-VS2`

`P4-VS1 + applied P4-DG2 -> P4-VS2 -> P4-VS3 -> P4-STAB -> Phase 4 human gate`

P4-DG1 і P4-DG2 можна досліджувати паралельно. P4-WP1 не реалізує Asset persistence. P4-VS3 додатково залежить від driver staging primitives.

## Deferred task proposals

- `P4-WP1`: concrete driver metadata/files/journal/lock/recovery.
- `P4-VS1`: повтор Phase 3 Resource slices на real storage з restart/cut-point evidence.
- `P4-VS2`: Asset metadata lifecycle після join gate.
- `P4-VS3`: staged internal upload lifecycle.
- `P4-STAB`: complete crash/restart/cleanup/readonly/corruption/package audit.

Ці cards не створюються до owner gates, бо їх exact scope залежить від ще не прийнятих physical і Asset contracts.

## Architecture and risk gates

- ADR-0008 outcome-definite semantic commit не послаблюється під можливості driver; feasibility доводиться P4-DG1.
- Core/facade не отримують physical layout knowledge або callable transaction/session.
- Deterministic fake лишається contract harness, а не доказом physical durability.
- Incomplete Asset artifacts не можуть стати visible; exact logical policy належить P4-DG2, physical realization — driver/VS3.
- External sync, plugins/hooks, final compatibility freeze й restore/cascade/purge лишаються поза Phase 4 owner-gate planning.

## Validation target

Task packages мають однозначні scope/out-of-scope, acceptance, verification, activation gates, memory impact, language gate й architecture-pressure stop conditions. Перед human review enclosing planning task проходить independent audit без open P0-P3.
