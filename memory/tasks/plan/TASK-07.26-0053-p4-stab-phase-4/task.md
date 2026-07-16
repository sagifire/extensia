# P4-STAB / TASK-07.26-0053: Phase 4 stabilization

Task Status: backlog
Type: stabilization/audit
Created: 2026-07-15
Owner Role: Agent Stabilizer
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Canonical package підготовлено; run не активований.
Acceptance: 0/9; stabilization evidence не збиралася.
Blockers: activation потребує completed/accepted P4-VS1, P4-VS2 і P4-VS3.
Blocked Phase: activation gate
Pending Decisions: predecessor acceptance та explicit activation RUN-001.
Next Action: після gate виконати no-feature cross-Phase-4 stabilization і independent audit.

## Мета

Провести no-feature stabilization й audit across P4-WP1 + P4-VS1…P4-VS3: conformance, metadata/payload/journal crash-restart matrix, cleanup, readonly, corruption/failure/lock evidence, reproducible packaging, architecture/public boundary audit та підготувати Phase 4 human gate.

## Продуктовий контекст

P4-STAB не розширює домен чи API. Вона перевіряє, що concrete driver, full Resource parity, Asset metadata і upload lifecycle утворюють один production durability path із чесними bounded support claims. Лише accepted stabilization result може бути поданий на explicit Phase 4 human gate.

## Залежності та activation gate

- [P4-WP1 / TASK-07.26-0049](../TASK-07.26-0049-p4-wp1-local-sqlite-driver/task.md) completed/accepted.
- [P4-VS1 / TASK-07.26-0050](../TASK-07.26-0050-p4-vs1-concrete-resource-durability/task.md), [P4-VS2 / TASK-07.26-0051](../TASK-07.26-0051-p4-vs2-asset-metadata-lifecycle/task.md) і [P4-VS3 / TASK-07.26-0052](../TASK-07.26-0052-p4-vs3-internal-asset-upload/task.md) мають бути completed/accepted.
- Підготовка package не активує RUN-001; потрібне окреме explicit рішення.
- Phase 4 human gate є наступним окремим owner decision і не виконується автоматично.

## Обсяг

- Clean/full/package gates і deterministic fake-vs-SQLite conformance.
- Resource/Asset metadata/payload/journal crash-restart/cut-point matrix.
- Incomplete upload cleanup, stale/retry/last-ready та no-orphan visibility evidence.
- Readonly before/after snapshot diff.
- Corruption, disk-full, permission, I/O, malformed state і lock contention.
- Deterministic/reproducible double pack і packed consumer.
- Architecture/public boundary audit: один write path, no layout/token leakage, package exports.
- Upward consistency review і exact fixation proposals лише якщо evidence доведе потребу.
- Independent audit та Phase 4 human gate request.

## Поза обсягом

- Нові Resource/Asset/domain features або API expansion.
- Нові driver families чи broader platform/power-loss certification.
- Phase 5 sync/indexes, Phase 6 plugins або Phase 7 compatibility/release work.
- Workaround, що змінює accepted contract замість окремого owner decision.

## Критерії приймання

1. Clean checkout/full repository/package/packed-consumer gates зелені на supported profile; evidence команди, версії й environment rerunnable.
2. Deterministic fake та `local-sqlite-v1` проходять shared Resource/Asset semantic conformance без parallel test-only contract або divergent normalized failures.
3. Metadata, payload compound actions і рівно один journal entry покриті complete crash/restart/cut-point matrix для initial/replacement/delete й committed-before-receipt/publication cases.
4. Incomplete/stale generations детерміновано abort/cleanup/recover-яться; last-ready payload і committed metadata не втрачаються, orphan bytes не visible.
5. Readonly before/after filesystem/DB snapshot diff доводить zero writes/cleanup/timestamps/journal mutation, включно з recovery-required negative state.
6. Corruption, disk-full, I/O, permission, malformed schema/content, lock contention/timeout/crash-release доводять rollback, outcome reconciliation або fail-close без partial publication.
7. Two independent packs byte-identical або мають documented accepted deterministic boundary; package exports/public surface не розкривають driver layout, path, handle, session чи transaction.
8. Architecture/public boundary і upward consistency audit не знаходять second write path, duplicated contracts або stale canonical claims; потрібні зміни оформлені exact `FIX-*` proposals і не застосовані без approval.
9. Self-review та незалежний audit завершені без open P0-P3, residual risks/support limits явні, а explicit whole-task approval і Phase 4 human gate запитані окремо перед `done`/переходом до Phase 5.

## Перевірки

- clean install/check/test/package/consumer;
- shared fake-vs-SQLite conformance;
- child-process crash/restart/cut-point matrix;
- readonly snapshot diff;
- corruption/fault/permission/lock contention matrix;
- deterministic double pack/hash comparison;
- architecture/export/memory consistency review;
- independent audit.

## Ризики

- Stabilization може виявити design contradiction, яку не можна лікувати локальним workaround; тоді потрібен blocker/new owner decision.
- Environment-specific permission/lock/disk-full evidence може бути непереносною; support claim слід звузити, а не екстраполювати.
- Upward memory inconsistency може вимагати required fixation і finalizing після human approval.

## Пов’язана пам’ять

- [P4-WP1 / TASK-07.26-0049](../TASK-07.26-0049-p4-wp1-local-sqlite-driver/task.md)
- [P4-VS1 / TASK-07.26-0050](../TASK-07.26-0050-p4-vs1-concrete-resource-durability/task.md)
- [P4-VS2 / TASK-07.26-0051](../TASK-07.26-0051-p4-vs2-asset-metadata-lifecycle/task.md)
- [P4-VS3 / TASK-07.26-0052](../TASK-07.26-0052-p4-vs3-internal-asset-upload/task.md)
- [P4-DG2 / TASK-07.26-0040](../TASK-07.26-0040-p4-dg2-asset-contracts/task.md)
- [Asset Contract](../../../technical/asset-contract.md)
- [Write, Journal і Recovery Contract](../../../technical/write-journal-recovery-contract.md)
- [ADR-0010](../../../technical/decisions/ADR-0010-local-sqlite-storage-protocol.md)
- [Technical Architecture](../../../technical/architecture.md)
- [Technical Rules](../../../technical/rules.md)
- [Roadmap](../../../product/roadmap.md)
- [Delivery plan](../../../reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md)
- [Phase 4 owner-gate plan](../../../reports/research/2026-07-12-extensia-phase-4-owner-gate-plan.md)
- [Asset contract report](../../../reports/research/2026-07-15-extensia-asset-contracts.md)
- [Concrete storage protocol report](../../../reports/research/2026-07-12-extensia-concrete-storage-protocol.md)

## Прогони

- [RUN-001](RUN-001/index.md) - prepared; не активований.

## Дослідження

Немає; formal research ще не виконувалося.

## Фіксації

Немає; canonical fixation proposals ще не готувалися.

## Запити на рішення

- Після accepted P4-VS1/P4-VS2/P4-VS3 — explicit activation RUN-001.
- Після review-ready result — окремі whole-task і Phase 4 human gate decisions.

## Запропоновані follow-up задачі

- Немає; Phase 5 work не створюється й не активується цією задачею.

## Human Review

Status: not-ready
Requested: n/a
Reviewed: n/a
Approval Source: n/a
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: none
Decision Notes: Package preparation не є activation, approval або Phase 4 gate.

## Фінальний результат

Completed: n/a
Final Run: n/a
Summary: n/a
Residual Risks: n/a

