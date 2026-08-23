# Контекст виконання: RUN-001

Related Task: [P5-VS1 / TASK-07.26-0060](../task.md)
Prepared: 2026-07-18
Prepared By: Agent Planner `/root/create_p5_vs1_vs2`
Previous Run: none

## Agent Role

Agent Implementer / API Engineer

## Мета run

Реалізувати complete-only lazy coverage/load semantics і exact experimental public refresh/config/inspection surface поверх already hardened P5-HARD1 runtime без concrete SQLite polling/multi-process support.

## Умови активації

1. [P5-HARD1 / TASK-07.26-0059](../../TASK-07.26-0059-p5-hard1-sync-actor-retry-lifecycle/task.md) completed і accepted.
2. Applied [P5-DG1](../../../../technical/read-model-completeness-contract.md) та [P5-DG2](../../../../technical/multi-instance-synchronization-contract.md) contracts лишаються authority.
3. Потрібне окреме explicit activation рішення; package creation не активує run або P5-VS2.

## Ефективні вимоги

1. Одна immutable coherent generation містить projections і coverage proofs; selective cache state не дозволяє partial success.
2. Existing greedy reads не регресують, а lazy point/closure/global selectors мають exact positive/negative coverage semantics.
3. `query.refresh()` делегує hardened single-flight actor і не дублює retry, cancellation, lifecycle чи publication coordinator.
4. `readModel.synchronization` config і `inspect().read_model.synchronization` є exact descriptor-safe experimental contracts.
5. Full/readonly semantic refresh parity не дозволяє readonly mutation; `static-unsupported` не отримує fake cursor/head/sync actor.
6. Concrete SQLite observation, polling і topology claim лишаються P5-VS2.

## Обсяг

- lazy coverage/load integration;
- exact explicit refresh public facade;
- descriptor-safe loading/synchronization config;
- detached frozen synchronization inspection;
- complete-only point/tree/global semantic tests;
- fake/full/readonly refresh and lifecycle matrices;
- public/type/config snapshots і package smoke.

## Поза обсягом

- `local-sqlite-v1` physical observation/polling/contention;
- two-process support evidence або topology claim;
- broad new public query catalog;
- durable cursor, notification transport, multi-host чи HA;
- change of accepted command/write/journal semantics.

## Критерії приймання run

1. Lazy positive/negative/unknown coverage complete-only.
2. Greedy/public compatibility unchanged.
3. Exact `query.refresh()` outcomes over one actor.
4. Descriptor-safe config/default/cross-field validation.
5. Safe frozen inspection with no private leakage.
6. Full/readonly parity and readonly zero-write.
7. Exact legacy `static-unsupported` boundary.
8. Listener/cancellation/start-stop/drain correctness.
9. Snapshot/conformance/package matrices green without concrete support claim.
10. Full gates, self-review та independent audit green before human review.

## Пов’язана пам’ять

- [P5-HARD1](../../TASK-07.26-0059-p5-hard1-sync-actor-retry-lifecycle/task.md)
- [P5-RS1](../../TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/task.md)
- [P5-DG1](../../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/task.md)
- [P5-DG2](../../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/task.md)
- [Read-model completeness contract](../../../../technical/read-model-completeness-contract.md)
- [Multi-instance synchronization contract](../../../../technical/multi-instance-synchronization-contract.md)
- [Architecture](../../../../technical/architecture.md)
- [Rules](../../../../technical/rules.md)
- [Roadmap](../../../../product/roadmap.md)

## Заплановані результати

1. Lazy coverage/load implementation з traceability matrix.
2. Public/config/type/inspection implementation і snapshots.
3. Refresh/lifecycle/full-readonly conformance evidence.
4. Package/full-gate evidence, self-review та independent audit.

## Перевірки

- focused coverage/config/refresh/lifecycle tests;
- accessor/unknown-key and frozen snapshot matrices;
- fake/full/readonly conformance та readonly mutation sentinel;
- type/API/package consumer snapshots;
- `npm run check` і повний repository gate.

## Умови зупинки

- Потрібна зміна accepted P5-DG1/P5-DG2 contract або P5-HARD1 semantics.
- Public integration потребує parallel coordinator, hidden refresh або partial-success path.
- Inspection/config не можна реалізувати без private runtime/storage leakage.
- Concrete polling/SQLite scope стає передумовою semantic public API.

## Ризики й припущення

- Assumption: P5-HARD1 надає accepted stable internal retry/single-flight/lifecycle seams.
- Experimental surface ще може змінитися до P7 compatibility freeze.
- Global completeness може вимагати exhaustive semantic selector, але не implicit cache-only subset.

## Activation

Run Status: prepared
Activation: тільки explicit рішення після dependency gate; підготовка package не активує run.
