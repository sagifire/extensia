# Migration Guide: PDADM MVP 0.1 -> PDADM MVP 0.3

Source PDADM MVP Version: 0.1
Target PDADM MVP Version: 0.3
Target Starter Kit Version: 3.0
Recommended Task Type: memory-migration
Recommended Execution Mode: autonomous-implementation
Agent Role: Agent Executor

---

# 1. Purpose

Ця інструкція описує, як агент має мігрувати вже розгорнуту Project Memory з PDADM MVP 0.1 одразу до PDADM MVP 0.3 без фіксації проміжного стану Starter Kit 2.0 як чинного.

У Starter Kit 4.0 цей guide не є фінальним migration target. Після нього обов'язково застосувати `from-0.3-to-0.4.md`.

Не розпаковувати Starter Kit 3.0 поверх існуючої `memory/`. Треба перенести структуру, правила й шаблони без втрати project-specific content.

# 2. Strategy

Міграція виконується як chain migration:

1. застосувати структурні ідеї міграції 0.1 -> 0.2;
2. одразу застосувати правила й шаблони 0.2 -> 0.3;
3. проміжний стан має бути Starter Kit 3.0 / PDADM MVP 0.3;
4. фінальний стан для актуального package має бути Starter Kit 4.0 / PDADM MVP 0.4 після застосування `from-0.3-to-0.4.md`.

Guide `from-0.1-to-0.2.md` можна читати як історичний reference для розуміння змін структури, але не можна завершувати міграцію станом `Version: 2.0` або активним `mvp_one_to_one_0.2.md`.

# 3. Required Reading

Агент читає:

- `memory/agent-start.md`;
- `memory/memory-rules.md`;
- `memory/agents/rules.md`;
- task `task.md`;
- current run `requirements.md`;
- current run `context.md`;
- `memory/knowledge/package-index.md`;
- `memory/knowledge/packages/pdadm-mvp-reglament/package.md`;
- `memory/knowledge/packages/pdadm-mvp-reglament/historical/mvp_one_to_one_0.3.md` як історична копія регламенту MVP 0.3 у package 4.0;
- `memory/knowledge/packages/pdadm-mvp-reglament/migrations/from-0.1-to-0.2.md` як historical reference;
- `memory/knowledge/packages/pdadm-mvp-reglament/migrations/from-0.2-to-0.3.md`;
- цей migration guide.

# 4. Non-Negotiable Final State

Після міграції:

- `Starter Kit Version: 3.0`;
- `PDADM MVP Version: 0.3`;
- `knowledge/packages/pdadm-mvp-reglament/package.md` має `Version: 3.0`;
- активний full reglament у package 3.0: `mvp_one_to_one_0.3.md`; у package 4.0 історична копія лежить у `historical/mvp_one_to_one_0.3.md`;
- `mvp_one_to_one_0.2.md` не використовується як чинний reference layer;
- `Execution Mode` є task-level полем у `task.md`;
- `autonomous-research` підтриманий у rules, startup profiles і templates;
- `done` можливий тільки зі статусу `review` після task-level human review approval;
- `canceled` використовується для припинення роботи без прийнятого review;
- `index.md`, `package-index.md` і `tasks/plan/progress.md` використовують списки з wiki-посиланнями;
- `index.md` і `tasks/plan/progress.md` не містять секцію `Notes`;
- memory fixation і research result містять upward consistency check.

# 5. Step-by-Step Migration

## 5.1 Підготувати migration task

1. Створити або знайти задачу `Type: memory-migration`.
2. Встановити `Execution Mode: autonomous-implementation`.
3. Створити run artifacts:
   - `runs/RUN-001/requirements.md`;
   - `runs/RUN-001/context.md`;
   - `runs/RUN-001/result.md`.
4. Зафіксувати project-specific content, який не можна втратити.

## 5.2 Перенести структуру з MVP 0.1 до базової task/memory моделі

Використати `from-0.1-to-0.2.md` тільки як reference для таких змін:

- перейти до `tasks/plan/` для всіх неархівних задач;
- завести `tasks/archive/` для архіву;
- розділити `domain/current/` і `domain/target/`;
- додати або оновити `knowledge/package-index.md`;
- додати `agents/`, `templates/`, `reports/`, якщо їх не було;
- не втратити існуючі project-specific documents.

Не виконувати як фінальний крок інструкції, які залишають package у `Version: 2.0`.

## 5.3 Одразу застосувати MVP 0.3 rules

Застосувати `from-0.2-to-0.3.md` повністю:

- version markers 3.0 / 0.3;
- task-level `Execution Mode`;
- review/done gate;
- `autonomous-research`;
- `templates/research-report.md`;
- link-based indexes;
- no `Notes` in `index.md` і `tasks/plan/progress.md`;
- upward consistency check;
- package `pdadm-mvp-reglament` version 3.0.

## 5.4 Оновити package references

У `knowledge/packages/pdadm-mvp-reglament/` фінально мають бути:

- `package.md` з `Version: 3.0`;
- `index.md` з `PDADM MVP Version: 0.3`;
- `mvp_one_to_one_0.3.md` для package 3.0 або `historical/mvp_one_to_one_0.3.md` як історична копія в package 4.0;
- `migrations/from-0.1-to-0.3.md`;
- `migrations/from-0.2-to-0.3.md`;
- `migrations/from-0.1-to-0.2.md` тільки як historical/chain reference.

`knowledge/package-index.md` має вказувати на package version 3.0.

# 6. Required Self-Review

Перед передачею задачі в `review` агент перевіряє:

- [ ] project-specific content збережений;
- [ ] не залишено активних правил MVP 0.1 або MVP 0.2;
- [ ] version markers оновлені до Starter Kit 3.0 / PDADM MVP 0.3;
- [ ] package `pdadm-mvp-reglament` не регресував до `Version: 2.0`;
- [ ] `mvp_one_to_one_0.2.md` не використовується як чинний reference layer;
- [ ] `Execution Mode` є task-level полем;
- [ ] `autonomous-research` підтриманий;
- [ ] review/done gate підтриманий;
- [ ] indexes/progress мають link-based формат;
- [ ] upward consistency check виконаний;
- [ ] residual risks зафіксовані в `result.md`.

# 7. Human Review Request

Після міграції агент переводить задачу в `review` і явно просить task-level decision:

- approve review і дозволити закрити як `done`;
- request changes;
- reject;
- cancel.
