# Пакет контексту: RUN-001

## Обов'язкове читання

- `memory/agent-start.md`
- `memory/README.md`
- `memory/state.md`
- `memory/memory-rules.md`
- `memory/agents/rules.md`
- `memory/tasks/plan/progress.md`
- `memory/knowledge/package-index.md`
- `memory/knowledge/packages/pdadm-mvp-reglament/package.md`
- `memory/knowledge/packages/pdadm-mvp-reglament/migration-from-0.4-to-0.5.md`

## Релевантний продуктовий контекст

Проєктна пам'ять підтримує поточну розробку Extensia `0.1.0`; зміст Product Memory не повинен змінитися через methodology migration.

## Релевантний доменний контекст

Current/target separation та Extensia-specific glossary мають зберегтися.

## Релевантний технічний контекст

Посилання на legacy `memory/memory-rules.md` треба перевести на `memory/reglament/` і `memory/project/` без зміни технічних рішень.

## Релевантні пакети знань

- `memory/knowledge/packages/pdadm-mvp-reglament/`

## Файли або модулі для перевірки

- `memory/`
- `.tmp/memory_mvp_0.5_ref/`
- `.tmp/backups/memory-before-mvp-0.5-2026-07-11.zip`

## Відомі ризики

- Втрата project-specific правил під час заміни root operational files.
- Випадкове переписування reviewed task history.
- Stale task/index links після переходу з `runs/RUN-*` на root-level `RUN-*`.
- Некоректне трактування prepared backlog `result.md` як activated work.

## Припущення

- Єдиними незавершеними pre-migration tasks є `TASK-0034…0036`; migration task `TASK-0037` обробляється окремо згідно з guide.
