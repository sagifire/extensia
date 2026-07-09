# Пакет знань: PDADM MVP Reglament

Status: draft
Version: 4.0
Scope: process
Reusable: true
Reglament Status: Draft

## Призначення

Надати агентам операційний регламент PDADM MVP 0.4 для роботи з Project Memory, задачами, knowledge packages, звітами, self-review і міграцією пам'яті між версіями.

Цей package є робочим шаром знань для агентів. Повний текст регламенту є reference layer, а не обов'язковий startup layer.

## Коли використовувати

Використовувати цей пакет, коли потрібно:

- уточнити правила PDADM MVP 0.4;
- виконати або перевірити `memory-migration`;
- оновити Starter Kit;
- створити або змінити workflow, шаблони чи правила пам'яті;
- підготувати planning, design або research task у режимі `autonomous-research`;
- провести architecture health review або зафіксувати architecture pressure;
- розібрати конфлікт або неясність між правилами;
- підготувати агенту інструкцію міграції з MVP 0.3 на MVP 0.4 або з попередньої підтримуваної версії через chain migration.

## Коли не використовувати

- На старті звичайної сесії без явної потреби. Для старту читати `memory/agent-start.md`.
- Коли достатньо project-specific правил з `memory/memory-rules.md` або `memory/agents/rules.md`.
- Коли задача стосується конкретного продуктового рішення з `product/`.
- Коли задача стосується фактичного доменного стану з `domain/current/`.
- Коли користувач просить виконати конкретну задачу і task/run/fixation context уже достатній.

## Ключові ідеї

- Project Memory є центральним джерелом істини.
- Агент починає з `memory/agent-start.md`, boot packet і stop rule.
- Якщо роль або задача не визначені, агент працює як `Agent Assistant` у режимі `Methodology Navigator`.
- Агент не змінює код, canonical Project Memory, project docs або project artifacts поза task boundary.
- Кожна задача має `Type` і task-level `Execution Mode`.
- Типи `planning`, `design` і `research` можуть виконуватися через `Execution Mode: autonomous-research`.
- `autonomous-research` має створювати task-local `research/RSCH-*.md` і деталізований звіт у `reports/research/**`.
- `autonomous-implementation` використовує `RUN-*`, `requirements.md`, `context.md`, `result.md`.
- `interactive-memory-update` використовує `worklog.md` і `fixations/FIX-*.md`.
- Якщо доступні субагенти, self-review виконує незалежний субагент-аудитор.
- Неархівні задачі живуть у `memory/tasks/plan/`, а `memory/tasks/plan/progress.md` є операційним індексом.
- `index.md`, `package-index.md` і `tasks/plan/progress.md` використовують однорядкові записи з wiki-посиланнями.
- Domain Memory масштабується через `domain/current/` і `domain/target/`.
- Knowledge packages є шаром повторного використання знань.
- Reports мають окремі підпапки для periodic reports, research reports і audits.

## Ключові правила

- Не починати роботу без явної Agent Role або без fallback у `Agent Assistant` / `Methodology Navigator`.
- Не читати повний регламент на старті звичайної сесії без причини.
- Не змінювати код або Project Memory поза задачею; якщо агент автономно створює задачу, він повідомляє користувача про її type, execution mode, scope, out of scope і acceptance criteria.
- Не починати `autonomous-implementation` без task folder і task run.
- Не запускати autonomous task run без `requirements.md` і `context.md`.
- Не завершувати research, planning або design task у режимі `autonomous-research` без `research/RSCH-*.md` і деталізованого звіту в `reports/research/**`.
- Не змінювати Project Memory у `interactive-memory-update` без `fixations/FIX-*.md` і self-review.
- Не подавати memory fixation, research result або implementation result як review-ready без upward consistency check для документів загального рівня.
- Не переводити задачу в `done` без task-level human review approval зі статусу `review`.
- Не змішувати current і target state.
- Після autonomous run фіксувати memory sync у `result.md`.
- Після autonomous research фіксувати task-local result у `RSCH-*`, а довгоживучий звіт у `reports/research/**`.
- Після interactive або research-driven fixation фіксувати memory sync у `FIX-*.md`.
- Перед задачами зі спеціальними знаннями перевіряти `memory/knowledge/package-index.md`.
- При зміні структури пам'яті оновлювати відповідні `index.md`.
- У canonical Project Memory авторський текст вести українською, крім чітко визначених технічних або source-reference винятків.
- Під час self-review перевіряти architecture pressure і потребу в architecture audit, design task або refactor task.

## Рекомендоване читання

- `mvp_one_to_one_0.4.md`
- `migrations/from-0.3-to-0.4.md`
- `historical/mvp_one_to_one_0.3.md` тільки як історичний референс для ланцюгової міграції
- `migrations/from-0.2-to-0.3.md`, якщо проект спочатку треба довести до MVP 0.3
- `migrations/from-0.1-to-0.3.md`, якщо проект мігрує з MVP 0.1
- `migrations/from-0.1-to-0.2.md` тільки як історичний або chain-only reference, не як фінальний target для Starter Kit 4.0

## Пов'язані типи задач

- feature
- bugfix
- refactor
- research
- planning
- design
- docs
- knowledge
- memory-update
- memory-migration
- chore

## Пов'язані пакети

- Немає.
