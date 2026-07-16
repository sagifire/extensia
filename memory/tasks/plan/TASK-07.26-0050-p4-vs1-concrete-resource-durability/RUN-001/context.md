# Контекст виконання: RUN-001

Related Task: [P4-VS1 / TASK-07.26-0050](../task.md)
Prepared: 2026-07-15
Prepared By: Agent Planner `/root/create_phase4_tasks`
Previous Run: none

## Мета run

Повторити повну accepted Phase 3 Resource parity на production composition із `local-sqlite-v1` та зібрати restart/cut-point/process evidence без Asset scope або parallel architecture.

## Effective requirements

1. Єдиний path: public/internal production composition → Core/Operation Engine → чинний concrete adapter.
2. Semantic oracle — accepted Phase 3 fake behavior; implementation не створює нових Resource semantics.
3. Усі effective writes мають один semantic commit, один journal entry і post-commit index publication.
4. Readonly, recovery, COMMIT reconciliation, idempotency та fail-close guarantees не послаблюються.
5. Evidence охоплює fresh process, restart і relevant cut points, а не лише in-memory unit tests.
6. P4-VS2/P4-VS3/P4-STAB не активуються цим run.

## Пов’язана пам’ять

- [P4-WP1](../../TASK-07.26-0049-p4-wp1-local-sqlite-driver/task.md)
- [Write contract](../../../../technical/write-journal-recovery-contract.md)
- [ADR-0010](../../../../technical/decisions/ADR-0010-local-sqlite-storage-protocol.md)
- [Architecture](../../../../technical/architecture.md)
- [Rules](../../../../technical/rules.md)
- [Roadmap](../../../../product/roadmap.md)
- [Delivery plan](../../../../reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md)
- [Phase 4 owner-gate plan](../../../../reports/research/2026-07-12-extensia-phase-4-owner-gate-plan.md)

## Заплановані результати

1. Traceability matrix Phase 3 operation/invariant → shared production seam → concrete evidence.
2. Full Resource parity integration на SQLite.
3. Restart, cut-point, readonly, corruption та reconciliation matrix.
4. Packed/default composition evidence і full gates.
5. Self-review, independent audit і human review request.

## Перевірки

- shared conformance/property/integration tests;
- child-process restart/crash/cut-point harness;
- readonly snapshot diff і corruption fixtures;
- package consumer та deterministic double pack;
- full repository gate.

## Обмеження

- Не додавати Asset writes/upload, public driver API/layout, restore/cascade/purge або P5 sync.
- Не послаблювати accepted contracts заради SQLite implementation convenience.
- Після activation context незмінний; зміна effective requirements потребує нового run.

## Умови зупинки

- Потрібна зміна accepted Phase 3/P4-WP1 semantic contract або другий write path.
- Production composition не може використати чинний concrete adapter без public/layout leakage.
- COMMIT outcome чи corruption не можна класифікувати без false settlement.
- Required environment для process evidence недоступне.

## Ризики й assumptions

- Assumption: accepted P4-WP1 foundation лишається executable на target Node/filesystem profile.
- Process-crash proof не дорівнює arbitrary power-loss certification.
- Architecture pressure від synchronous transaction envelope має бути виміряний і явно зафіксований.

## Activation

Run Status: prepared
Activation: тільки explicit рішення користувача; підготовка цього package не активує run.

