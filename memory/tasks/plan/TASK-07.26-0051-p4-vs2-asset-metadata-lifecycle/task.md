# P4-VS2 / TASK-07.26-0051: Asset metadata lifecycle

Task Status: backlog
Type: implementation
Created: 2026-07-15
Owner Role: Agent Implementer
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Canonical package підготовлено; run не активований.
Acceptance: 0/9; verification не розпочата.
Blockers: activation заблокована до completed/accepted P4-VS1.
Blocked Phase: activation gate
Pending Decisions: підтвердження predecessor gate й explicit activation RUN-001.
Next Action: після gate реалізувати metadata slice exact `technical/asset-contract.md` sections 4–10.

## Мета

Реалізувати accepted P4-DG2 Asset metadata lifecycle: strict validators, global UUID/invariants, external/internal metadata operations, lineage, primary/reassign/delete conflicts, initial staged internal metadata, Resource timestamp propagation, один semantic commit/journal і startup integrity — без bytes transport або payload finalization.

## Продуктовий контекст

P4-DG2 задає exact Asset semantics, а P4-VS1 має спершу довести production Resource durability path. P4-VS2 приєднує Asset metadata до того самого aggregate/Core/Operation Engine pipeline. Поточна public `AssetSnapshot` shape лишається незмінною; дозволений internal seam не може розкрити physical path, upload session чи transaction token.

## Залежності та activation gate

- [P4-VS1 / TASK-07.26-0050](../TASK-07.26-0050-p4-vs1-concrete-resource-durability/task.md) має бути completed/accepted.
- [P4-DG2 / TASK-07.26-0040](../TASK-07.26-0040-p4-dg2-asset-contracts/task.md) accepted/applied; її exact contract є authority.
- Підготовка package не активує RUN-001; потрібне окреме explicit рішення після predecessor gate.
- P4-VS3 не активується цією задачею.

## Обсяг

- Strict field, MIME, extension, canonical HTTP(S) URL і bounded canonical JSON `data` validators.
- Global Asset UUID та aggregate invariants.
- External/internal metadata create, update, explicit set/clear primary, reassign і delete.
- Same-Resource acyclic lineage, ready target rules, primary/delete/reassign/active-upload conflicts.
- Initial internal Asset лише у staged metadata state; без bytes або ready publication.
- Common Asset/Resource Timestamp і owner Resource timestamp propagation.
- Один Core/Operation Engine semantic commit, exact `asset_changes`, один journal entry і post-commit atomic publication.
- Startup Asset integrity validation і Resource delete conflict при active upload.

## Поза обсягом

- Bytes transport, chunking/streaming або physical staging writes.
- Generation `finish`/`abort` implementation чи payload finalization/publication.
- Phase 5 global/derived Asset indexes і external sync.
- Public compatibility freeze або final P7 API decision.
- Physical path/session/transaction leakage; зміна current public `AssetSnapshot` shape.

## Критерії приймання

1. Asset field/MIME/extension/URL/data validators точно реалізують `asset-contract.md` sections 4–5, включно з descriptor-safe bounded input, canonical HTTP(S) і canonical JSON limits.
2. Global UUID, ownership, type/lifecycle, timestamp і aggregate invariants застосовуються однаково на command validation, coherent load і startup integrity scan.
3. External/internal metadata create/update повертають detached snapshots; initial internal Asset залишається staged і ніколи не заявляє ready payload без P4-VS3.
4. `setPrimary`, reassign і delete точно реалізують explicit primary, lineage-free/non-primary reassignment, active-upload, ownership і primary/delete conflict rules.
5. `derived_from` є same-Resource, acyclic, non-self, non-dangling і спрямований на allowed ready representation target; conflicts не створюють partial state.
6. Кожний effective transition використовує common Asset/Resource Timestamp, оновлює owning Resource timestamp, один prepared aggregate/payload action, один semantic commit і один journal entry з exact `asset_changes`; no-change/failure нічого не мутує.
7. Startup Asset integrity fail-close і Resource delete active-upload conflict інтегровані в чинний runtime integrity/error mapping без automatic repair.
8. Verification matrix contract sections 4–10 покрита table/property/integration/concurrency/failure/restart tests; current public `AssetSnapshot` shape незмінна, internal seam не розкриває path/session/transaction.
9. Focused/full/package gates, self-review, architecture/memory/language review та незалежний audit завершені без open P0-P3; whole-task human approval обов’язковий перед `done`.

## Перевірки

- validator tables і property tests для URL/data/lineage/cycles;
- integration matrix create/update/primary/reassign/delete;
- journal `asset_changes`, timestamp і post-commit publication assertions;
- startup corruption/integrity та Resource-delete conflict fixtures;
- concurrency/lock/failure/no-change/readonly tests;
- full repository, packed consumer й double-pack gates.

## Ризики

- Asset aggregate logic може дублювати Resource pipeline; це неприйнятне architecture pressure, а не привід для parallel engine.
- Cycle/global UUID validation може вимагати coherent broader load; lock/read-set повинен лишатися exact і bounded.
- Internal staged seam легко випадково видати за completed upload API; state/visibility boundary має бути explicit у tests і docs.

## Пов’язана пам’ять

- [P4-VS1 / TASK-07.26-0050](../TASK-07.26-0050-p4-vs1-concrete-resource-durability/task.md)
- [P4-DG2 / TASK-07.26-0040](../TASK-07.26-0040-p4-dg2-asset-contracts/task.md)
- [P4-WP1 / TASK-07.26-0049](../TASK-07.26-0049-p4-wp1-local-sqlite-driver/task.md)
- [Asset Contract](../../../technical/asset-contract.md)
- [Write, Journal і Recovery Contract](../../../technical/write-journal-recovery-contract.md)
- [ADR-0010](../../../technical/decisions/ADR-0010-local-sqlite-storage-protocol.md)
- [Technical Architecture](../../../technical/architecture.md)
- [Technical Rules](../../../technical/rules.md)
- [Roadmap](../../../product/roadmap.md)
- [Asset contract report](../../../reports/research/2026-07-15-extensia-asset-contracts.md)
- [Delivery plan](../../../reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md)
- [Phase 4 owner-gate plan](../../../reports/research/2026-07-12-extensia-phase-4-owner-gate-plan.md)

## Прогони

- [RUN-001](RUN-001/index.md) - prepared; не активований.

## Дослідження

Немає; formal research ще не виконувалося.

## Фіксації

Немає; canonical fixation proposals ще не готувалися.

## Запити на рішення

- Після completed/accepted P4-VS1 — explicit activation RUN-001.

## Запропоновані follow-up задачі

- [P4-VS3 / TASK-07.26-0052](../TASK-07.26-0052-p4-vs3-internal-asset-upload/task.md) - лише після accepted P4-VS2 і executable staging capability gate.

## Human Review

Status: not-ready
Requested: n/a
Reviewed: n/a
Approval Source: n/a
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: none
Decision Notes: Package preparation не є activation або approval.

## Фінальний результат

Completed: n/a
Final Run: n/a
Summary: n/a
Residual Risks: n/a

