# Контекст виконання: RUN-003

Status: frozen
Activated: 2026-07-17
Agent Role: Agent Architect
Authority: post-application independent audit `CHANGES_REQUIRED` after approved/applied FIX-002

## Мета

Усунути три bounded findings без зміни accepted P5-DG1 semantics: підготувати exact FIX-003 для prospective roadmap wording, operationally synchronize P5-DG2 dependency state і resolved TASK-0056 decisions, повторити audit.

## Effective scope

- Створити required FIX-003, який замінює лише `окремо підготовлені` на prospective `окремо мають бути підготовлені` в Phase 5 roadmap wave line.
- Не застосовувати FIX-003 без окремого fixation-specific human approval.
- Синхронізувати P5-DG2 як `backlog + prepared`, dependencies satisfied, explicit activation pending; run не активувати.
- Позначити старі TASK-0056 decision requests resolved; FIX-001 superseded/not applied.
- Не змінювати accepted report, RSCH-001, read-model contract/ADR/architecture/rules/public semantics, production code або dependencies.

## Acceptance

1. FIX-003 має actual source hash, one exact anchor, one exact replacement і deterministic target hash.
2. Canonical correction є prospective і не стверджує існування downstream task packages.
3. P5-DG2 dashboard/context/index узгоджені: prerequisites satisfied, `backlog + prepared`, explicit activation pending.
4. TASK-0056 lifecycle і registries відображають RUN-003 active, FIX-002 applied, FIX-003 proposed; downstream inactive.
5. Self-review і independent audit не мають open P0–P3 перед corrective human review.

## Stop conditions

- Roadmap source hash або exact anchor не збігається.
- Correction потребує semantic redesign, новий downstream package або activation.
- FIX-003 application запитується без explicit human approval.
