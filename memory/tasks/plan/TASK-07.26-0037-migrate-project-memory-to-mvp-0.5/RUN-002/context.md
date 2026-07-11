# Контекст виконання: RUN-002

Related Task: [TASK-07.26-0037](../task.md)
Prepared: 2026-07-11
Prepared By: primary agent
Previous Run: [Legacy RUN-001](../runs/RUN-001/index.md)

## Мета run

Завершити міграцію в target model: перевести незавершені задачі, перевірити structural/content integrity, закрити findings і передати TASK-0037 у human review.

## Ефективні вимоги

- Дотриматися direct migration guide MVP 0.4 -> 0.5 і target operational rules.
- Не переписувати frozen history `done` tasks.
- Мігрувати `TASK-0034…0036` однією послідовною групою через незалежного субагента без activation implementation.
- Зберегти project-specific Product, Domain, Technical, References, Reports і Knowledge content.
- Закрити або явно оформити всі verification/audit findings до Review Request.

## Обсяг

- `TASK-0034…0036`, root/task/report/index consistency, link/index/version/template verification, independent migration audit.

## Поза обсягом

- Product code, dependency changes, activation backlog tasks, переписування reviewed historical artifacts.

## Критерії приймання

- [ ] Version markers і operational rules відповідають Starter Kit 5.0 / PDADM MVP 0.5.
- [ ] `reglament/` і `project/` проіндексовані; legacy active rules/templates відсутні.
- [ ] `TASK-0034…0036` мають target dashboards і prepared root-level current runs зі збереженою legacy history.
- [ ] Root/task/report/knowledge navigation узгоджена з universal run model.
- [ ] Кожна folder у `memory/` має `index.md`; broken local links відсутні або є frozen historical references із поясненням.
- [ ] Product/Domain/Technical/References/Reports/Knowledge content не втрачено.
- [ ] Language gate, architecture pressure check і independent audit пройдені.

## Заплановані результати

- Імплементація: structural migration і verification evidence.
- Формальні дослідження: none.
- Memory fixation: not expected; migration authority задана прямою інструкцією користувача.

## Обов'язковий контекст задачі

- `memory/state.md`
- `memory/reglament/agents.md`
- `memory/reglament/memory-rules.md`
- `memory/project/agents.md`
- `memory/project/memory-rules.md`
- `memory/knowledge/packages/pdadm-mvp-reglament/migration-from-0.4-to-0.5.md`

## Вхідні файли та модулі

- `memory/`
- `.tmp/memory_mvp_0.5_ref/`
- `.tmp/backups/memory-before-mvp-0.5-2026-07-11.zip`

## Обмеження

- Legacy reviewed artifacts immutable.
- Backlog task migration не є activation.
- Subagent task group має містити 3–5 задач; фактична група містить рівно три.

## Перевірки

- Version/reference scans, task status/run invariants, all-folder index scan, Markdown local-link validation, content inventory comparison, independent subagent audit.

## Ризики

- Stale external navigation до legacy artifacts; accidental loss of project-specific content; prepared legacy `result.md` у backlog tasks.

## Припущення

- Legacy links усередині frozen history є дозволеними й не переписуються.

## Зміни від попереднього run

- Попередній run: legacy `runs/RUN-001`.
- Причина нового run: migration guide вимагає target-format run після operational cutover.
- Змінені вимоги: універсальний run без `Execution Mode`, root-level `RUN-*`, centralized result/audit.
- Оновлений контекст: target operational layer уже встановлений.
- Очікуване виправлення: повна target verification і review-ready migration task.
