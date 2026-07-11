# TASK-07.26-0004: Упорядкувати task progress і підготувати BP1-01

Status: done
Type: memory-update
Execution Mode: interactive-memory-update
Created: 2026-07-10
Owner Role: Product Lead Hat
Current Run: n/a
Current Research: n/a
Current Fixation: FIX-001

## Мета

Перетворити `tasks/plan/progress.md` на фазовий операційний індекс і створити детально підготовлену canonical task `BP1-01` для реалізації ESM TypeScript package baseline, не починаючи її implementation run.

## Продуктовий контекст

`TASK-07.26-0003` уже прийняв rolling-wave план release `0.1.0` і визначив `BP1-01` найближчим tooling/package gate. Поточний progress index не має фазової структури, а `BP1-01` існує тільки як backlog proposal у planning report.

## Обсяг

- Додати до `progress.md` секції планування, позапланових задач і фаз 0-7 відповідно до прийнятого roadmap.
- Розмістити наявні неархівні задачі в коректних операційних секціях без переміщення їхніх папок.
- Створити canonical task `TASK-07.26-0005` для proposal `BP1-01` з ясним scope, dependencies, acceptance criteria, verification і memory-sync expectations.
- Оновити прямі wiki-індекси та `state.md`, якщо створення canonical task змінює операційний стан.
- Оформити worklog, fixation package, upward consistency check, language gate та незалежне review.

## Поза обсягом

- Зміна `package.json`, lockfile, `.gitignore`, TypeScript/Vitest/ESLint/Prettier конфігурацій, source code або tests.
- Активація `BP1-01` чи створення `RUN-001`: це відбувається тільки за окремим дорученням на implementation.
- Створення наступних BP1/BP2 задач або деталізація віддалених фаз поза прийнятим rolling-wave gate.
- Зміна roadmap, ADR, product/domain/technical contracts або регламенту PDADM MVP.

## Критерії приймання

- [x] `progress.md` має окремі технічні секції `Позапланові задачі` і `Планування` та фазові секції 0-7, узгоджені з `product/roadmap.md`.
- [x] Усі чинні неархівні задачі присутні в `progress.md` один раз із правильним статусом і wiki-посиланням.
- [x] `BP1-01` оформлена як canonical `TASK-07.26-0005` зі статусом `backlog`, типом `chore` та режимом `autonomous-implementation`.
- [x] Картка `BP1-01` містить достатній scope, out-of-scope, dependencies, acceptance criteria, verification і memory-sync expectations для безпечного старту окремого `RUN-001`.
- [x] Прямі wiki-індекси й `state.md` узгоджені з новою навігацією та task status.
- [x] Fixation має незалежне review без незакритих blocker/high/medium findings; language gate та upward consistency check пройдені.

## Пов'язана пам'ять

- `memory/tasks/plan/progress.md`
- `memory/tasks/plan/index.md`
- `memory/product/roadmap.md`
- `memory/state.md`
- `memory/reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md`
- `memory/technical/decisions/ADR-0006-phase-1-tooling-and-ioc-baseline.md`
- `memory/knowledge/packages/pdadm-mvp-reglament/package.md`

## Прогони

Немає. Режим задачі — `interactive-memory-update`.

## Дослідження

Немає.

## Фіксації

- [FIX-001](fixations/FIX-001.md) - applied - Фазова навігація task progress і canonical preparation `BP1-01` застосовані після незалежного review.

## Додатковий контекст

Користувач прямо визначив цю роботу як задачу на Project Memory і дозволив запуск незалежних субагентів для review.
