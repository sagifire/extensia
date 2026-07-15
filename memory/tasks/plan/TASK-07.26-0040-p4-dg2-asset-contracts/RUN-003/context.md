# Контекст виконання: RUN-003

Related Task: [TASK-07.26-0040](../task.md)
Prepared: 2026-07-15
Previous Run: [RUN-002](../RUN-002/index.md)

## Мета run

Підготувати мінімальний exact corrective FIX-003 для findings фінального post-application audit RUN-002 без rollback або reinterpretation approved FIX-001/FIX-002.

## Effective scope

1. У чотирьох canonical summary/rule locations замінити ambiguous `existing ready Asset`/`ready-target` на normative `Asset з ready representation`/`ready-representation-target`.
2. У `memory/state.md` синхронізувати P4-DG2 lifecycle після approved/applied FIX-001/FIX-002 та активного corrective RUN-003.
3. Підготувати hash-pinned FIX-003, self-review й independent audit; canonical application лише після окремого human approval.

## Поза обсягом

- Перегляд normative `technical/asset-contract.md`, ADR-0011 або accepted Asset semantics.
- Code, API, driver, dependency, export, implementation або downstream activation.
- Інші canonical cleanup/refactor changes.

## Acceptance

1. FIX-003 exact, hash-pinned і mechanical; anchors unique.
2. Proposed canonical result не містить unqualified `existing ready Asset`/`ready-target` у P4-DG2 summary/rule docs.
3. `memory/state.md` відповідає actual fixation/application lifecycle і не заявляє task completion до final audit.
4. Self-review та independent audit завершені до human review.
