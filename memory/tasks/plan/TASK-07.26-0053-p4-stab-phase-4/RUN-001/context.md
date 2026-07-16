# Контекст виконання: RUN-001

Related Task: [P4-STAB / TASK-07.26-0053](../task.md)
Prepared: 2026-07-15
Prepared By: Agent Planner `/root/create_phase4_tasks`
Previous Run: none

## Мета run

Зібрати no-feature cross-Phase-4 evidence, провести architecture/public boundary і independent audits та підготувати explicit Phase 4 human gate.

## Effective requirements

1. P4-WP1 і P4-VS1…P4-VS3 мають бути completed/accepted до activation.
2. Stabilization не додає domain/API/driver features.
3. Shared conformance, crash/restart, readonly, corruption/failure, cleanup і packaging matrix охоплює весь Phase 4 path.
4. Support claims bounded exact executable environment evidence.
5. Upward consistency changes готуються як `FIX-*` і не застосовуються до approval.
6. Whole-task approval і Phase 4 human gate є окремими explicit decisions.

## Пов’язана пам’ять

- [P4-WP1](../../TASK-07.26-0049-p4-wp1-local-sqlite-driver/task.md)
- [P4-VS1](../../TASK-07.26-0050-p4-vs1-concrete-resource-durability/task.md)
- [P4-VS2](../../TASK-07.26-0051-p4-vs2-asset-metadata-lifecycle/task.md)
- [P4-VS3](../../TASK-07.26-0052-p4-vs3-internal-asset-upload/task.md)
- [Asset Contract](../../../../technical/asset-contract.md)
- [Write contract](../../../../technical/write-journal-recovery-contract.md)
- [ADR-0010](../../../../technical/decisions/ADR-0010-local-sqlite-storage-protocol.md)
- [Architecture](../../../../technical/architecture.md)
- [Rules](../../../../technical/rules.md)
- [Roadmap](../../../../product/roadmap.md)
- [Phase 4 owner-gate plan](../../../../reports/research/2026-07-12-extensia-phase-4-owner-gate-plan.md)

## Заплановані результати

1. Phase 4 evidence matrix і rerunnable environment record.
2. Full conformance/crash/recovery/cleanup/readonly/failure evidence.
3. Package reproducibility й public boundary audit.
4. Upward consistency disposition/proposals.
5. Self-review, independent audit і Phase 4 review request.

## Перевірки

- clean/full/package/consumer gates;
- fake-vs-SQLite shared conformance;
- metadata/payload/journal cut-point matrix;
- readonly and fault/corruption/lock matrix;
- double-pack hashes;
- architecture, memory, language і independent audit.

## Обмеження

- No-feature stabilization: жодних нових domain operations, driver families/certification або P5/P6/P7 work.
- Contract contradiction не виправляти workaround-ом.
- Після activation context незмінний.

## Умови зупинки

- Будь-який predecessor не completed/accepted.
- Required evidence environment недоступне або support claim неможливо bounded сформулювати.
- Finding потребує зміни accepted architecture/contract поза stabilization scope.
- Independent audit недоступний за чинними capability/rules — зафіксувати exact review limitation і не підміняти same-agent review.

## Ризики й assumptions

- Assumption: predecessor tasks залишають traceable executable evidence.
- Physical/profile limitations можуть зумовити conditional або failed gate.
- Required fixation може перевести run у finalizing після approval.

## Activation

Run Status: prepared
Activation: тільки після accepted predecessor chain та explicit рішення; package preparation не активує run.

