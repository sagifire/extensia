# TASK-07.26-0009: Підготувати BP1-04/BP1-05/BP1-06 до виконання

Status: done
Type: memory-update
Execution Mode: interactive-memory-update
Created: 2026-07-10
Owner Role: Product Lead Hat
Current Run: n/a
Current Research: n/a
Current Fixation: FIX-001

## Мета

Перетворити прийняті backlog proposals `BP1-04`, `BP1-05` і `BP1-06` на canonical tasks із достатніми контрактами виконання, залежностями, критеріями приймання, verification, architecture-pressure boundaries і memory sync, не запускаючи їх виконання.

## Продуктовий контекст

`BP1-01`, `BP1-02` і `BP1-03` завершені та прийняті людиною. Accepted rolling-wave plan визначає `BP1-04` як lifecycle architecture-enabling slice, `BP1-05` як стабілізацію Phase 1, а `BP1-06` як незалежний architecture/package audit перед human gate Phase 1. У Project Memory ці work packages ще не мають canonical task folders.

## Обсяг

- Створити canonical backlog task `BP1-04` для lifecycle controller і першого architecture-enabling slice.
- Створити canonical backlog task `BP1-05` для стабілізації Phase 1.
- Створити canonical backlog task `BP1-06` для незалежного architecture/package audit Phase 1.
- Для кожної задачі визначити scope, out of scope, dependencies, activation gates, acceptance criteria, verification, expected memory sync і architecture-pressure expectations.
- Явно зафіксувати послідовність `BP1-04 -> BP1-05 review-ready -> BP1-06 -> human gate Phase 1` і маршрут повернення findings до owner task або follow-up.
- Оновити прямі wiki-індекси, task progress і `state.md` відповідно до нових canonical backlog tasks.
- Виконати upward consistency check, language gate, незалежний pre-application audit і незалежний post-application audit.

## Поза обсягом

- Активація `BP1-04`, `BP1-05` або `BP1-06`, створення `RUN-001` чи `RSCH-001` для них.
- Зміни package/config/source/test files або виконання implementation/audit цих задач.
- Зміна accepted architecture, tooling, domain contracts чи IoC decisions.
- Стабілізація exact public config, facade/plugin API, Storage Driver protocol, journal/index/write semantics або Phase 2 contracts.
- Створення canonical задач Phase 2+.

## Критерії приймання

- [x] `BP1-04` має canonical stable ID, статус `backlog`, тип `feature`, режим `autonomous-implementation` і не має `RUN-001`.
- [x] `BP1-05` має canonical stable ID, статус `backlog`, тип `chore`, режим `autonomous-implementation` і не має `RUN-001`.
- [x] `BP1-06` має canonical stable ID, статус `backlog`, тип `research`, режим `autonomous-research` і не має `RSCH-001`.
- [x] Усі task cards простежуються до accepted planning report і чинної product/technical/task memory, не видають target-draft signatures за стабілізований API.
- [x] Dependency chain і review loop між BP1-04/05/06 однозначні; підготовка не трактується як activation або дозвіл Phase 2.
- [x] BP1-06 вимагає task-local `RSCH-*`, canonical detailed report у `reports/research/**`, незалежне відтворення evidence, bounded independent meta-review і рекомендацію для human gate; `reports/audits/**` може містити лише додатковий indexed summary/reference.
- [x] `progress.md`, plan index і `state.md` узгоджені з трьома новими backlog tasks.
- [x] Fixation пройшла незалежний аудит без незакритих blocker/high/medium findings; upward consistency, architecture pressure і language gate перевірені.

## Пов'язана пам'ять

- `memory/state.md`
- `memory/product/roadmap.md`
- `memory/tasks/plan/progress.md`
- `memory/reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md`
- `memory/technical/architecture.md`
- `memory/technical/rules.md`
- `memory/technical/open-questions.md`
- `memory/technical/decisions/ADR-0003-internal-ioc-composition.md`
- `memory/technical/decisions/ADR-0006-phase-1-tooling-and-ioc-baseline.md`
- `memory/tasks/plan/TASK-07.26-0007-bp1-02-pure-domain-contract-kernel/task.md`
- `memory/tasks/plan/TASK-07.26-0008-bp1-03-ioc-composition-skeleton/task.md`
- `memory/knowledge/packages/pdadm-mvp-reglament/package.md`
- `memory/knowledge/packages/pdadm-mvp-reglament/mvp_one_to_one_0.4.md`

## Прогони

Немає. Режим задачі — `interactive-memory-update`.

## Дослідження

Немає.

## Фіксації

- [FIX-001](fixations/FIX-001.md) - applied - Canonical preparation `BP1-04`/`BP1-05`/`BP1-06` застосована після незалежного аудиту.

## Додатковий контекст

Пряме доручення користувача від 2026-07-10 дозволяє підготувати tasks і запускати субагентів для review. Воно не є task-level human approval цієї enclosing task і не активує жодну з підготовлених задач.
