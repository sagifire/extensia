# Agent Start

Starter Kit Version: 4.0
PDADM MVP Version: 0.4

## Призначення

Цей файл є першою точкою входу агента в Project Memory.

Він обмежує стартове читання пам'яті, щоб агент швидко зрозумів правила роботи й перейшов до задачі без зайвого дослідження всього репозиторію пам'яті.

Усі шляхи в цьому файлі вказані від кореня проекту.

## Default boot packet

За замовчуванням агент читає:

- `memory/README.md`
- `memory/state.md`
- `memory/memory-rules.md`
- `memory/agents/rules.md`

Після цього агент зупиняє startup reading і переходить до задачі або пояснення наступних регламентних кроків.

## Default role fallback

Якщо користувач не задав роль, задачу або workflow:

```text
Agent Role: Agent Assistant
Working Mode: Methodology Navigator
Task / Topic: clarification
```

У цьому режимі агент пояснює стан роботи, пропонує можливі наступні кроки й не змінює код або Project Memory без task boundary.

## Startup profiles

Startup profile є операційною підказкою для читання контексту. Це не task-level `Execution Mode`.

Якщо задача вказана, агент бере `Execution Mode` з `task.md`.

### methodology-navigator

Читати:

- default boot packet;
- `memory/human-start.md`, якщо користувач просить пояснити регламент або наступні кроки;
- `memory/tasks/plan/progress.md`, якщо треба пояснити стан задач.

### project-bootstrap

Читати:

- default boot packet;
- `memory/product/vision.md`;
- `memory/product/requirements.md`;
- `memory/product/roadmap.md`;
- `memory/domain/index.md`;
- `memory/technical/index.md`;
- `memory/tasks/plan/progress.md`.

### discussion / task-preparation

Читати:

- default boot packet;
- `memory/tasks/plan/progress.md`, якщо обговорення може перейти в задачу.

### autonomous-implementation

Читати:

- default boot packet;
- `memory/tasks/plan/progress.md`;
- task `task.md`;
- current run `requirements.md`;
- current run `context.md`.

### autonomous-research

Читати:

- default boot packet;
- `memory/tasks/plan/progress.md`;
- task `task.md`;
- current `research/RSCH-*.md`, якщо існує;
- related detailed report у `memory/reports/research/`, якщо існує;
- `memory/knowledge/package-index.md`, якщо research, planning або design може потребувати reusable knowledge;
- релевантні knowledge packages.

### interactive-memory-update

Читати:

- default boot packet;
- `memory/tasks/plan/progress.md`;
- task `task.md`;
- `worklog.md`, якщо існує;
- current `fixations/FIX-*.md`, якщо існує;
- цільові memory files, які явно потрібні для фіксації.

### memory-migration

Читати:

- default boot packet;
- `memory/tasks/plan/progress.md`;
- task `task.md`;
- current run `requirements.md`;
- current run `context.md`;
- `memory/knowledge/package-index.md`;
- `memory/knowledge/packages/pdadm-mvp-reglament/package.md`;
- відповідний migration guide.

### architecture-audit

Читати:

- default boot packet;
- task `task.md`, якщо audit оформлений як задача;
- `memory/technical/architecture.md`;
- `memory/technical/rules.md`;
- релевантні ADR у `memory/technical/decisions/`;
- related report у `memory/reports/audits/`, якщо існує.

## Stop rule

Агент повинен зупинити стартове дослідження після boot packet або startup profile.

Додаткові документи читаються тільки якщо:

- task/run/fixation context прямо цього вимагає;
- `index.md` явно вказує на потрібний файл;
- `memory/knowledge/package-index.md` показує релевантний package;
- є конфлікт або неясність правил;
- без додаткового читання є ризик пошкодити Project Memory;
- користувач прямо просить дослідити глибше.

## Full reglament as reference layer

Повний регламент `memory/knowledge/packages/pdadm-mvp-reglament/` не читається на старті звичайної сесії.

Його читати, коли:

- задача має тип `memory-migration`;
- задача змінює регламент, workflow або шаблони;
- треба уточнити конфлікт правил;
- користувач прямо просить читати регламент.
