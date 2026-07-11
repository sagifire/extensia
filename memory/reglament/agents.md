# Agent Rules

Starter Kit Version: 5.0
PDADM MVP Version: 0.5

## Startup

1. Почати з `memory/agent-start.md`.
2. Завжди прочитати `memory/reglament/agents.md` і `memory/reglament/memory-rules.md`.
3. Прочитати `memory/project/*.md` за маршрутами `agent-start.md`.
4. Після boot packet зупинити startup reading.
5. Повний регламент не читати без methodology, audit або migration потреби.

## Роль і природна сесія

1. Перед активним run явно визначити Agent Role.
2. Якщо роль або задача не задані, fallback - `Agent Assistant` для clarification.
3. Роль не є session mode.
4. Зміна сесії не створює нову задачу або run.
5. Нова сесія відновлює роботу за `task.md`, current run та його артефактами.
6. Не створювати `Work Report` або `worklog.md`; давати природні проміжні оновлення за потреби.

## Task boundary

1. Не змінювати project artifacts поза task boundary.
2. Обговорення без змін може відбуватися без task folder.
3. Пряма інструкція створити задачу або створення, яке є explicit deliverable поточного scope, не потребує додаткового approval.
4. Out-of-scope follow-up спочатку оформлювати як proposal й створювати після підтвердження користувача.
5. Не виносити in-scope роботу в follow-up task через context window або нову сесію.

## Створення задачі

1. Створення задачі є універсальною операційною дією й не потребує іншої задачі.
2. Створювати задачу атомарно: task folder, `index.md`, `task.md`, `RUN-001/index.md`, `RUN-001/context.md`, plan index і `progress.md`.
3. Нова задача має `Task Status: backlog`, `Run Status: prepared`.
4. Не звітувати про задачу як створену до validation gate.
5. Якщо доступний субагент, головний агент резервує ID і task contract, субагент створює package, головний агент перевіряє.
6. Якщо субагент недоступний, головний агент створює package самостійно.

## Активація й run

1. Пряма команда виконати backlog-задачу автоматично активує її, якщо користувач однозначно вказав task ID або назву задачі.
2. Під час активації створити `RUN-*/result.md` зі статусом `active`.
3. `context.md` після активації заморозити.
4. Виконувати implementation, research, planning, design і fixation preparation в межах одного універсального run.
5. Task `Type` є описовим; `Execution Mode` не використовується.
6. Для нової спроби створювати новий run; не переписувати старий.

## Research і fixation

1. Формальне research/planning/design створює task-local `RSCH-*` і detailed report у `memory/reports/research/`.
2. Невелику допоміжну перевірку фіксувати в `result.md` без зайвого `RSCH-*`.
3. Змістові зміни canonical Project Memory готувати в `FIX-*`.
4. Не застосовувати `FIX-*` до human approval.
5. Task/run/index/state operational updates не потребують рекурсивного fixation package.
6. Перед `done` кожен завершений `RSCH-*` повинен мати в `task.md` або `result.md` disposition `final-result | incorporated | realized | superseded`.

## Self-review і audit

1. Перед human review виконати self-review всього run та артефактів.
2. Якщо доступний незалежний субагент-аудитор, делегувати йому review.
3. До human review виправляти findings у `result.md`, `RSCH-*`, detailed report і proposal body `FIX-*`.
4. Не передавати задачу в review з неоформленими findings.
5. Перевірити scope, acceptance, verification, risks, compromises, memory impact, language gate і architecture pressure.

## Human review і finalization

1. Агент не переводить задачу в `done` самостійно.
2. Передати задачу в `review`, заморозити reviewed content і надіслати лаконічний Review Request.
3. Погодження варіанта або одного артефакту не є task-level approval.
4. Після approval без fixations завершити run і задачу.
5. Після approval із fixations перевести run у `finalizing`, застосувати exact approved proposals, перевірити й тільки тоді закрити задачу.
6. Не закривати задачу з required або approved `FIX-*`, який не має статусу `applied`.
7. Якщо exact approved proposal можна повторно застосувати без зміни reviewed content, лишити `review` + `finalizing`; якщо потрібне зовнішнє рішення, перейти в `blocked` + `blocked`; якщо треба змінити reviewed content, створити новий active run.

## Review Request

Показати: outcome, current run, acceptance, verification, risks, result/self-review link, `RSCH-*`, кожен `FIX-*` із `required|optional`, follow-up proposals і рекомендоване рішення.

Запросити одне з рішень: `approve | request changes | cancel` та окремі рішення для fixations і follow-up proposals. `request changes` продовжує роботу в новому run; `cancel` припиняє задачу без прийняття результату.

## Decision Request

Коротко вказати потрібне рішення, причину, рекомендацію, варіанти з наслідками, task/run state і чи справді робота заблокована.

## Заборонено

- просити дозвіл створити задачу після прямої команди її створити;
- створювати частково підготовлену валідну задачу;
- змінювати reviewed content після human review;
- переписувати старий run як нову спробу;
- застосовувати непогоджені memory changes;
- замовчувати ризики або architecture pressure;
- читати всю пам'ять без task-specific причини.
