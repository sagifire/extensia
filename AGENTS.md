# Extensia - інструкція для агентів

Extensia є in-process бібліотекою. Вона запускається всередині процесу застосунку і надає набір публічних об’єктів для роботи з медіа-ресурсами.

## Project Memory

У цьому проекті використовується Project Memory — довготривала wiki-like пам'ять проекту, розташована в папці:

```text
memory/
```

Project Memory є основним місцем зберігання продуктового контексту, вимог, задач, рішень, доменної й технічної пам'яті, reusable knowledge packages, правил роботи агентів та іншого контексту, необхідного для розробки.

Очікувана версія структури пам'яті:

```text
Starter Kit Version: 4.0
PDADM MVP Version: 0.4
```

Завжди явно читай документи пам'яті в кодувані UTF-8

## Agent Startup

Перед будь-якою змістовною роботою агент повинен почати з:

```text
memory/agent-start.md
```

`memory/agent-start.md` є першою точкою входу в Project Memory. Він визначає boot packet, startup profiles і правило зупинки стартового читання.

За замовчуванням агент читає тільки документи, вказані в boot packet або відповідному startup profile, після чого зупиняє startup reading і переходить до задачі.

Агент не повинен на старті сесії самостійно читати всю `memory/`, весь knowledge package `pdadm-mvp-reglament` або повний регламент методології, якщо цього прямо не вимагає задача.

## Agent Role

Кожна агентська сесія повинна мати явну `Agent Role`.

Якщо роль не вказана, агент працює як `Agent Assistant` у режимі clarification:

- уточнює намір користувача;
- допомагає підготувати або знайти задачу;
- не змінює canonical Project Memory або код без достатнього контексту й підтвердженого режиму роботи.

## Task And Memory Rules

Після startup агент повинен працювати згідно з правилами в:

```text
memory/memory-rules.md
memory/agents/rules.md
```

Для задач використовується структура:

```text
memory/tasks/plan/
memory/tasks/plan/progress.md
memory/tasks/archive/
```

Усі неархівні задачі мають стабільний шлях у `memory/tasks/plan/`. Зміна статусу задачі не повинна переносити task folder між `backlog`, `active`, `review`, `blocked` і `done`; статус фіксується в `task.md` і `tasks/plan/progress.md`.

Якщо задача виконується як `autonomous-implementation`, агент повинен працювати через task folder і task run з `requirements.md`, `context.md` та `result.md`, якщо тільки користувач явно не дозволив дрібну правку поза повним task workflow.

Якщо задача стосується фіксації або актуалізації Project Memory через діалог, вона має виконуватися як `interactive-memory-update`: агент веде `worklog.md`, готує `fixations/FIX-*.md`, виконує self-review і тільки після цього вносить зміни в canonical memory.

## Domain And Knowledge Rules

Domain Memory ведеться у папках:

```text
memory/domain/current/
memory/domain/target/
```

Поточний доменний стан і цільовий або бажаний стан не змішуються.

Reusable knowledge packages знаходяться в:

```text
memory/knowledge/
memory/knowledge/package-index.md
```

`memory/knowledge/packages/pdadm-mvp-reglament/` є reference layer регламенту PDADM MVP, а не startup layer. Його треба читати тільки коли задача стосується правил методології, workflow, шаблонів, memory migration або коли є конфлікт чи неясність правил.

## Missing Or Broken Memory

Якщо `memory/agent-start.md` відсутній, пошкоджений або не дає достатніх інструкцій для старту, агент повинен перевірити:

```text
memory/README.md
memory/memory-rules.md
memory/agents/rules.md
```

Якщо ці документи теж відсутні, пошкоджені або суперечливі, агент повинен зупинитися і повідомити користувача, що Project Memory не готова до безпечного використання.

Агент не повинен самостійно "відновлювати" або переписувати структуру Project Memory без явно поставленої задачі на memory migration або memory update.

## Independent Self-Review And Subagents

Для задач, де регламент вимагає self-review або independent audit, агент не має мовчки
підміняти незалежний review same-agent review.

Перед тим як зафіксувати `subagent-unavailable`, агент повинен перевірити доступність
subagent / multi-agent capability через tool discovery, якщо `tool_search` доступний у
поточній сесії.

Якщо subagent capability знайдена, але політика інструмента вимагає explicit delegation
request або human confirmation, агент повинен зупинитись і прямо попросити підтвердження на запуск
незалежного субагента-аудитора, якщо це підтвердження не отримано, то тоді фіксується як
`delegation-not-confirmed`, а не як `subagent-unavailable`.

`subagent-unavailable` можна фіксувати тільки коли discovery виконано і capability справді
недоступна, або коли `tool_search` недоступний і це явно записано в `Review Limitation`.