# Agent Start

Starter Kit Version: 5.0
PDADM MVP Version: 0.5

## Призначення

Перша точка входу агента в Project Memory. Цей файл обмежує startup reading і маршрутизує читання task-specific та project-specific правил.

Усі шляхи вказані від кореня проекту.

## Default boot packet

Завжди прочитати:

- `memory/agent-start.md`
- `memory/reglament/agents.md`
- `memory/reglament/memory-rules.md`

Після цього зупинити базове читання й визначити task/topic.

## Project-specific routes

Прочитати `memory/project/agents.md`:

- перед активним виконанням task run;
- перед subagent delegation;
- коли project-specific правила можуть змінити поведінку агента.

Прочитати `memory/project/memory-rules.md`:

- перед змінами canonical Project Memory;
- перед підготовкою або застосуванням `FIX-*`;
- коли task context посилається на project-specific memory policy.

## Якщо задача не вказана

Fallback role:

```text
Agent Role: Agent Assistant
Task / Topic: clarification
```

Допомогти користувачу визначити мету, task boundary і наступну дію. Не змінювати project artifacts без задачі або прямого дозволеного task scope.

## Якщо задача вказана

Прочитати:

- `memory/tasks/plan/progress.md`;
- task `task.md`;
- current `RUN-*/context.md`;
- current `RUN-*/result.md`, якщо run вже активувався;
- пов'язані `RSCH-*` і `FIX-*`, якщо існують;
- task-specific memory links із `context.md`.

Task `Type` є описовим і не перемикає workflow. `Execution Mode` у PDADM MVP 0.5 не використовується.

## Додаткові маршрути

### Project Bootstrap

Прочитати `memory/product/`, `memory/domain/index.md`, `memory/technical/index.md`, `memory/state.md` і `memory/tasks/plan/progress.md`.

### Formal research / planning / design

Прочитати task/run context, `memory/knowledge/package-index.md`, якщо потрібні reusable knowledge, та релевантні джерела. Detailed report зберігати в `memory/reports/research/`.

### Memory migration

Прочитати task/run context, `memory/knowledge/packages/pdadm-mvp-reglament/package.md` і `memory/knowledge/packages/pdadm-mvp-reglament/migration-from-0.4-to-0.5.md`.

### Architecture audit

Прочитати task/run context, `memory/technical/architecture.md`, `memory/technical/rules.md`, релевантні ADR та пов'язаний report у `memory/reports/audits/`, якщо він існує.

## Stop rule

Не читати всю Project Memory після boot packet. Додаткові документи читати тільки якщо:

- `task.md` або `context.md` цього вимагає;
- index веде до потрібного документа;
- knowledge index показує релевантний package;
- є конфлікт або ризик пошкодити пам'ять;
- користувач прямо просить дослідити глибше.

## Повний регламент

`memory/knowledge/packages/pdadm-mvp-reglament/mvp_one_to_one_0.5.md` не входить у default boot packet.

Читати його для methodology audit, повного пояснення правила, зміни регламенту або migration.
