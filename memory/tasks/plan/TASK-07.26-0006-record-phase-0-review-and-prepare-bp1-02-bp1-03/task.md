# TASK-07.26-0006: Зафіксувати review фази 0 та підготувати BP1-02/BP1-03

Status: done
Type: memory-update
Execution Mode: interactive-memory-update
Created: 2026-07-10
Owner Role: Product Lead Hat
Current Run: n/a
Current Research: n/a
Current Fixation: FIX-001

## Мета

Зафіксувати явне підтвердження користувача, що фаза 0 «Базовий стан проекту» пройшла human review і завершена, а також створити canonical backlog tasks `BP1-02` та `BP1-03` з документами, достатніми для подальшої безпечної активації після gate `BP1-01`.

## Продуктовий контекст

Фаза 0 вже позначена `done` у roadmap і складається із завершених задач, але користувач окремо підтвердив phase-level review. Accepted rolling-wave plan визначає `BP1-02` і `BP1-03` як наступні паралельні work packages після tooling gate `BP1-01`; вони досі існують лише як backlog proposals у planning report.

## Обсяг

- Зафіксувати у загальній пам'яті phase-level human review і завершення фази 0 без зміни її фактичного scope.
- Створити canonical backlog task `BP1-02` для pure domain contract kernel.
- Створити canonical backlog task `BP1-03` для IoC composition skeleton.
- Для обох задач визначити scope, out-of-scope, dependencies, acceptance criteria, verification, architecture-pressure expectations і memory sync.
- Оновити прямі wiki-індекси, task progress і `state.md` відповідно до нових canonical backlog tasks.
- Виконати upward consistency check, language gate та незалежний аудит fixation.

## Поза обсягом

- Активація `BP1-01`, `BP1-02` або `BP1-03`; створення їхніх `RUN-001`.
- Зміни package/config/source/test files або виконання implementation.
- Послаблення правила, що `BP1-02` і `BP1-03` не активуються до зеленого gate `BP1-01`.
- Зміна accepted domain, tooling чи IoC decisions; закриття відкритих domain/API/lifecycle питань.
- Створення `BP1-04+` або задач фаз 2-7.

## Критерії приймання

- [x] Phase-level human review фази 0 явно зафіксований у релевантних загальних документах без дублювання або суперечності з `TASK-07.26-0002`.
- [x] `BP1-02` має canonical stable ID, статус `backlog`, тип `feature`, режим `autonomous-implementation` і не має `RUN-001`.
- [x] `BP1-03` має canonical stable ID, статус `backlog`, тип `feature`, режим `autonomous-implementation` і не має `RUN-001`.
- [x] Обидві task cards простежуються до accepted planning report і відповідних domain/technical decisions, містять повний scope, boundaries, dependencies, acceptance, verification та memory sync.
- [x] В обох задачах явно зафіксовано gate `BP1-01`; підготовка не трактується як дозвіл на activation або паралельну implementation до tooling gate.
- [x] `progress.md`, plan index і `state.md` узгоджені з двома новими backlog tasks.
- [x] Fixation пройшла незалежний аудит без незакритих blocker/high/medium findings; upward consistency і language gate виконані.

## Пов'язана пам'ять

- `memory/product/roadmap.md`
- `memory/tasks/plan/progress.md`
- `memory/state.md`
- `memory/reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md`
- `memory/domain/target/model.md`
- `memory/domain/rules.md`
- `memory/domain/open-questions.md`
- `memory/technical/architecture.md`
- `memory/technical/rules.md`
- `memory/technical/open-questions.md`
- `memory/technical/decisions/ADR-0003-internal-ioc-composition.md`
- `memory/technical/decisions/ADR-0006-phase-1-tooling-and-ioc-baseline.md`
- `memory/knowledge/packages/pdadm-mvp-reglament/package.md`

## Прогони

Немає. Режим задачі — `interactive-memory-update`.

## Дослідження

Немає.

## Фіксації

- [FIX-001](fixations/FIX-001.md) - applied - Завершення phase-level review фази 0 та canonical preparation `BP1-02`/`BP1-03` застосовані після незалежного аудиту.

## Додатковий контекст

Пряме доручення користувача від 2026-07-10 дозволяє створити task cards раніше зеленого `BP1-01`, але не скасовує accepted dependency gate для їх активації.
