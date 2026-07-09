# Migration Guide: PDADM MVP 0.2 -> PDADM MVP 0.3

Source PDADM MVP Version: 0.2
Target PDADM MVP Version: 0.3
Target Starter Kit Version: 3.0
Recommended Task Type: memory-migration
Recommended Execution Mode: autonomous-implementation
Agent Role: Agent Executor

---

# 1. Purpose

Ця інструкція описує, як агент має мігрувати вже розгорнуту Project Memory з PDADM MVP 0.2 на PDADM MVP 0.3 без втрати накопичених даних проекту.

У Starter Kit 4.0 цей guide не є фінальним migration target. Після нього обов'язково застосувати `from-0.3-to-0.4.md`.

Міграція не є розпаковкою нового Starter Kit поверх існуючої `memory/`.

Starter Kit 3.0 є еталоном структури, правил і шаблонів. Existing Project Memory є джерелом проектних даних, які треба зберегти.

# 2. Non-Negotiable Rules

1. Не видаляти project-specific content.
2. Не переписувати великі документи загального рівня без явної потреби й пояснення в `result.md`.
3. Не змінювати статус задачі на `done`; після роботи агент переводить задачу в `review`.
4. `done` дозволений тільки зі статусу `review` після явного task-level human review approval.
5. Якщо роботу припинено без review або без прийняття результату, задача переходить у `canceled`, а не `done`.
6. Не переносити task folders між статусами. Неархівні задачі лишаються в `tasks/plan/`.
7. Не використовувати попередній регламент як джерело чинних правил після міграції.
8. Кожен змінений або створений `index.md`, `package-index.md` і `tasks/plan/progress.md` має бути списком із wiki-посиланнями, не таблицею.
9. Не додавати секцію `Notes`, `Rules` або `Agent Notes` у `index.md` чи `tasks/plan/progress.md`.
10. Перед review виконати upward consistency check для документів загального рівня.

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
- цей migration guide.

Після цього агент читає тільки ті project-specific файли, які потрібні для міграції конкретної Project Memory.

# 4. Migration Scope

Обов'язково перевірити й за потреби оновити:

- version markers у `README.md`, `state.md`, `agent-start.md`, `memory-rules.md`;
- `agents/rules.md`;
- `agents/prompts.md`;
- `agents/workflows.md`, якщо там описані режими роботи;
- `templates/task.md`;
- `templates/result.md`;
- `templates/fixation.md`;
- `templates/run-requirements.md`;
- `templates/agent-start.md`;
- `templates/index.md`;
- `templates/research-report.md`;
- `tasks/README.md`;
- `tasks/plan/progress.md`;
- усі `index.md`;
- `knowledge/package-index.md`;
- `knowledge/packages/pdadm-mvp-reglament/`;
- `domain/glossary.md`;
- top-level documents загального рівня, якщо вони згадують MVP 0.2 або Starter Kit 2.0.

# 5. Step-by-Step Migration

## 5.1 Підготувати migration task

1. Переконатися, що існує задача `Type: memory-migration`.
2. Переконатися, що `Execution Mode: autonomous-implementation`.
3. Створити або оновити current run:
   - `runs/RUN-001/requirements.md`;
   - `runs/RUN-001/context.md`;
   - `runs/RUN-001/result.md`.
4. Зафіксувати scope і out of scope.

## 5.2 Оновити version markers

Оновити:

- `Starter Kit Version: 3.0`;
- `PDADM MVP Version: 0.3`.

Мінімально перевірити:

- `memory/README.md`;
- `memory/state.md`;
- `memory/agent-start.md`;
- `memory/memory-rules.md`;
- `memory/templates/agent-start.md`.

Якщо в downstream-проекті є інші version markers, оновити або пояснити, чому вони лишаються історичними.

## 5.3 Виправити Execution Mode і session workflow

У MVP 0.3 `Execution Mode` є властивістю задачі, а не параметром запуску сесії.

Агент має:

1. прибрати standalone `Mode:` з startup prompts і run templates, якщо він використовується як режим сесії;
2. лишити `Execution Mode` у `task.md`, `requirements.md`, `result.md`, `RSCH-*` або `FIX-*`, де це описує задачу або artifact;
3. додати `autonomous-research` до допустимих execution modes;
4. для задач типу `research`, які не імплементують зміни, використовувати `Execution Mode: autonomous-research`.

## 5.4 Посилити review і task closure

Оновити правила й шаблони так, щоб:

1. агент не міг самостійно переводити задачу в `done`;
2. після завершення роботи агент виконував self-review і переводив задачу в `review`;
3. `done` був можливий тільки зі статусу `review`;
4. потрібен явний task-level human review approval;
5. погодження варіанта, плану, проміжного рішення або fixation proposal не вважалось approval всієї задачі;
6. якщо роботу припинено без review, задача ставала `canceled`, а не `done`;
7. `archive` не використовувався як task status.

Оновити мінімально:

- `memory-rules.md`;
- `agents/rules.md`;
- `tasks/README.md`;
- `templates/task.md`;
- `templates/result.md`;
- `templates/fixation.md`;
- `tasks/plan/progress.md`.

## 5.5 Додати autonomous research

Додати підтримку:

- `Execution Mode: autonomous-research`;
- `research/RSCH-*.md`;
- `templates/research-report.md`;
- optional `fixations/FIX-*.md` для research-driven memory proposal.

Оновити:

- `agent-start.md`;
- `agents/rules.md`;
- `agents/prompts.md`;
- `tasks/README.md`;
- `templates/task.md`;
- `templates/index.md`;
- `knowledge/package-index.md`, якщо package використовується для research/migration rules.

## 5.6 Оновити index format

Усі `index.md`, `package-index.md` і `tasks/plan/progress.md` треба привести до формату списків із wiki-посиланнями.

Заборонено:

- markdown tables для індексних записів;
- секція `Notes`;
- локальні правила в `index.md` або `progress.md`.

Для дочірніх папок посилання має вести на `child/index.md`.

Приклад:

```markdown
- [Tasks](tasks/index.md)
  - Type: folder
  - Purpose: Пам'ять задач, прогонів і закриття робіт.
```

## 5.7 Додати upward consistency check

Оновити правила й шаблони так, щоб кожна memory fixation або research-driven memory proposal перевіряла документи загального рівня.

Документи загального рівня:

- `state.md`;
- top-level `README.md`, `index.md`;
- загальні product documents;
- загальні domain documents;
- загальні technical documents;
- `knowledge/package-index.md`;
- relevant knowledge package indexes;
- `tasks/plan/progress.md`, якщо зміна впливає на задачі.

Для кожної релевантної групи агент фіксує:

- `updated`;
- `not needed`;
- `proposed`;
- `blocked`.

Не можна подавати `result.md`, `RSCH-*` або `FIX-*` як review-ready без цієї перевірки.

## 5.8 Оновити knowledge package

У `knowledge/packages/pdadm-mvp-reglament/`:

1. встановити `Version: 3.0`;
2. встановити `PDADM MVP Version: 0.3`;
3. додати або оновити `mvp_one_to_one_0.3.md` для package 3.0 або використовувати `historical/mvp_one_to_one_0.3.md` як історичну копію в package 4.0;
4. додати `migrations/from-0.2-to-0.3.md`;
5. оновити `index.md` і `migrations/index.md` на link-based списки;
6. оновити `knowledge/package-index.md`.

# 6. Required Self-Review

Перед передачею migration task у `review` агент перевіряє:

- [ ] version markers оновлені до Starter Kit 3.0 / PDADM MVP 0.3;
- [ ] старий регламент не використовується як чинне джерело правил;
- [ ] `Execution Mode` є task-level параметром;
- [ ] standalone session `Mode:` прибраний із шаблонів запуску;
- [ ] `autonomous-research` підтриманий у rules, startup і templates;
- [ ] `templates/research-report.md` існує;
- [ ] review/done правила оновлені;
- [ ] `done` можливий тільки після task-level human review approval;
- [ ] `canceled` використовується для припинення без прийнятого review;
- [ ] `index.md`, `package-index.md` і `progress.md` використовують списки з wiki-посиланнями;
- [ ] у `index.md` і `progress.md` немає секції `Notes`;
- [ ] upward consistency check доданий у rules і templates;
- [ ] документи загального рівня перевірені;
- [ ] changed files і residual risks зафіксовані в `result.md`.

# 7. Human Review Request

Після міграції агент:

1. оновлює `result.md`;
2. переводить задачу в `review`;
3. оновлює `tasks/plan/progress.md`;
4. повідомляє людині, що migration task готова до review;
5. показує self-review і список змінених документів;
6. явно просить task-level decision:
   - approve review і дозволити закрити як `done`;
   - request changes;
   - reject;
   - cancel.

Поки такого approval немає, задача не переходить у `done`.
