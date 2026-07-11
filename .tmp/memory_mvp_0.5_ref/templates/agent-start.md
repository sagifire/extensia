# Agent Start

Starter Kit Version: 5.0
PDADM MVP Version: 0.5

## Призначення

Перша точка входу агента й маршрутизатор task-specific та project-specific читання.

## Default boot packet

- `memory/agent-start.md`
- `memory/reglament/agents.md`
- `memory/reglament/memory-rules.md`

## Project-specific routes

- `memory/project/agents.md` - перед active run і subagent delegation.
- `memory/project/memory-rules.md` - перед canonical memory changes і `FIX-*`.

## Якщо задача не вказана

```text
Agent Role: Agent Assistant
Task / Topic: clarification
```

## Якщо задача вказана

- `memory/tasks/plan/progress.md`
- task `task.md`
- current `RUN-*/context.md`
- current `RUN-*/result.md`, якщо run active
- пов'язані `RSCH-*` і `FIX-*`
- task-specific memory links

`Type` є описовим. `Execution Mode` не використовується.

## Додаткові маршрути

### Project Bootstrap

- `memory/product/`
- `memory/domain/index.md`
- `memory/technical/index.md`
- `memory/state.md`
- `memory/tasks/plan/progress.md`

### Formal research

- task/run context
- `memory/knowledge/package-index.md`, якщо потрібні reusable knowledge
- релевантні джерела
- `memory/reports/research/`

### Memory migration

- task/run context
- `memory/knowledge/packages/pdadm-mvp-reglament/package.md`
- `memory/knowledge/packages/pdadm-mvp-reglament/migration-from-0.4-to-0.5.md`

### Architecture audit

- task/run context
- `memory/technical/architecture.md`
- `memory/technical/rules.md`
- релевантні ADR
- `memory/reports/audits/`

## Stop rule

Після boot packet читати тільки task-specific документи, потрібні для безпечної роботи.

## Коли читати повний регламент

- methodology audit;
- повне пояснення правила;
- зміна регламенту;
- memory migration.
