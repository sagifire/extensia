# Agent Start

Starter Kit Version: 4.0
PDADM MVP Version: 0.4

## Призначення

Коротко: як агент має входити в Project Memory.

Усі шляхи в цьому файлі вказані від кореня проекту.

## Default boot packet

- `memory/README.md`
- `memory/state.md`
- `memory/memory-rules.md`
- `memory/agents/rules.md`

## Default role fallback

```text
Agent Role: Agent Assistant
Working Mode: Methodology Navigator
Task / Topic: clarification
```

## Startup profiles

Startup profile є операційною підказкою для читання контексту. Якщо задача вказана, `Execution Mode` береться з `task.md`.

### methodology-navigator

- default boot packet
- `memory/human-start.md`, якщо користувач просить пояснити регламент
- `memory/tasks/plan/progress.md`, якщо треба пояснити стан задач

### project-bootstrap

- default boot packet
- `memory/product/vision.md`
- `memory/product/requirements.md`
- `memory/product/roadmap.md`
- `memory/domain/index.md`
- `memory/technical/index.md`
- `memory/tasks/plan/progress.md`

### discussion / task-preparation

- default boot packet

### autonomous-implementation

- default boot packet
- `memory/tasks/plan/progress.md`
- task `task.md`
- current run `requirements.md`
- current run `context.md`

### autonomous-research

- default boot packet
- `memory/tasks/plan/progress.md`
- task `task.md`
- current `research/RSCH-*.md`, якщо існує
- related detailed report у `memory/reports/research/`, якщо існує
- `memory/knowledge/package-index.md`, якщо research, planning або design може потребувати reusable knowledge
- relevant knowledge packages

### interactive-memory-update

- default boot packet
- `memory/tasks/plan/progress.md`
- task `task.md`
- `worklog.md`
- current `fixations/FIX-*.md`, якщо існує
- relevant target memory files

### memory-migration

- default boot packet
- task/run context
- `memory/knowledge/package-index.md`
- `memory/knowledge/packages/pdadm-mvp-reglament/package.md`
- relevant migration guide

### architecture-audit

- default boot packet
- task `task.md`, якщо audit оформлений як задача
- `memory/technical/architecture.md`
- `memory/technical/rules.md`
- relevant ADR у `memory/technical/decisions/`
- related report у `memory/reports/audits/`, якщо існує

## Stop rule

Після boot packet або startup profile агент переходить до задачі.

Додаткові документи читати тільки за явною потребою.

## Коли читати повний регламент

- `memory-migration`
- зміна регламенту, workflow або шаблонів
- конфлікт правил
- пряма вказівка користувача
