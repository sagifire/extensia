# Extensia — інструкція для агентів

Extensia є in-process бібліотекою. Вона запускається всередині процесу застосунку й надає facade-first API для роботи з медіаресурсами.

## Project Memory

Основний довготривалий контекст проекту розташований у `memory/`.

```text
Starter Kit Version: 5.0
PDADM MVP Version: 0.5
```

Документи Project Memory завжди читати явно в UTF-8.

## Agent Startup

Перед будь-якою змістовною роботою почати з:

```text
memory/agent-start.md
```

`memory/agent-start.md` визначає обов’язковий boot packet, project-specific routes, task-specific reading і stop rule. Не читати всю `memory/` або повний reglament package без task-specific причини.

## Agent Role і task boundary

- Кожна активна task/run сесія має явну `Agent Role`.
- Якщо роль або задача не задані, працювати як `Agent Assistant` у clarification і не змінювати project artifacts.
- Не змінювати код або canonical Project Memory поза task boundary.
- Пряма команда створити або виконати задачу є достатнім дозволом для відповідної task operation; downstream activation не виводиться неявно.

## Чинні правила

Operational rules:

```text
memory/reglament/agents.md
memory/reglament/memory-rules.md
```

Project-specific adaptations читати за маршрутами `memory/agent-start.md`:

```text
memory/project/agents.md
memory/project/memory-rules.md
```

Universal task/run structure:

```text
memory/tasks/plan/TASK-.../
  index.md
  task.md
  RUN-001/
    index.md
    context.md
    result.md   # створюється під час activation
  RSCH-001.md   # якщо потрібне formal research
  FIX-001.md    # якщо потрібна canonical memory fixation
```

- Нова задача створюється атомарно як `backlog + prepared`.
- Пряма команда виконати однозначно визначену задачу активує її current run.
- Після activation `context.md` заморожується; execution, verification, self-review та audit ведуться в `result.md`.
- Formal research/planning/design створює task-local `RSCH-*` і detailed report у `memory/reports/research/`.
- Змістові зміни canonical Product/Domain/Technical/Knowledge/Project Memory готуються в `FIX-*` і застосовуються тільки після explicit human approval.
- Task/run/index/progress/state lifecycle updates є operational і не потребують рекурсивного `FIX-*`.
- Агент не переводить задачу в `done` без whole-task human approval.

## Domain і knowledge boundaries

Поточний і цільовий доменний стан не змішувати:

```text
memory/domain/current/
memory/domain/target/
```

Reusable knowledge відкривати через `memory/knowledge/package-index.md`. Повний `pdadm-mvp-reglament` package є reference layer і читається лише для methodology audit, migration або конфлікту правил.

## Missing або broken memory

Якщо `memory/agent-start.md` відсутній, пошкоджений або недостатній, перевірити:

```text
memory/README.md
memory/reglament/agents.md
memory/reglament/memory-rules.md
```

Якщо ці джерела теж відсутні або суперечливі, зупинитися й повідомити користувача. Не відновлювати Project Memory без окремої migration/update task.

## Self-review і independent audit

- Перед human review виконати self-review всього run і пов’язаних artifacts.
- Коли регламент вимагає independent audit і доступний субагент, використовувати окремого аудитора; same-agent review не видавати за незалежний.
- Findings усунути або явно оформити до передачі task у review.
- Review має охопити scope, acceptance, verification, risks, compromises, memory impact, language gate й architecture pressure.
