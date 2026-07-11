# Task Memory

Задачі є частиною Project Memory і основним джерелом істини для виконання робіт.

## Статуси

- `backlog`
- `active`
- `review`
- `blocked`
- `canceled`
- `done`

`archive` не є статусом задачі. Це фізична папка для задач, які більше не потрібні в операційній навігації.

## Типи задач

- `feature`
- `bugfix`
- `refactor`
- `research`
- `planning`
- `design`
- `docs`
- `knowledge`
- `memory-update`
- `memory-migration`
- `chore`

`planning`, `design` і `research` можуть виконуватися через `Execution Mode: autonomous-research`.

## Task folder

Усі неархівні задачі живуть у `tasks/plan/`.

```text
tasks/plan/TASK-MM.YY-NNNN-short-name/
  index.md
  task.md
  runs/                  # для autonomous-implementation
  research/              # для autonomous-research
  worklog.md             # для interactive-memory-update
  fixations/             # для interactive-memory-update або research-driven memory proposal
  closure.md
```

## Правила

- Task folder не переноситься між `backlog`, `active`, `review`, `blocked`, `canceled` і `done`.
- Статус задачі змінюється в `task.md` і `tasks/plan/progress.md`.
- `tasks/plan/progress.md` використовує однорядковий checklist format.
- Агент не переводить задачу в `done` самостійно.
- Після завершення роботи агент виконує self-review і переводить задачу в `review`.
- Якщо доступні субагенти, self-review виконує незалежний субагент-аудитор.
- `done` можливий тільки зі статусу `review` після явного task-level human review approval.
- Якщо робота припиняється без прийнятого review, задача переходить у `canceled`.
- Не починати `autonomous-implementation` без task folder і task run.
- Кожен autonomous run має власні `requirements.md`, `context.md`, `result.md`.
- Для `autonomous-research` потрібен `research/RSCH-*.md`.
- Для `autonomous-research` потрібен detailed report у `reports/research/**`.
- Research-driven memory proposal оформлюється через `fixations/FIX-*.md` і не застосовується без human approval.
- Для `interactive-memory-update` перед змінами Project Memory потрібен `fixations/FIX-*.md` із self-review.
- Попередні runs, research і fixations не переписуються для приховування помилок або змін вимог.
- Після autonomous run треба виконати memory sync і зафіксувати його в `result.md`.
- Після autonomous research треба зафіксувати результат у `RSCH-*` і `reports/research/**`.
- Після interactive або research-driven fixation треба виконати memory sync і зафіксувати його в `FIX-*.md`.
- Перед review треба перевірити вплив на документи загального рівня.
- Перед review треба перевірити language gate для змін Project Memory.
- Перед review треба перевірити architecture pressure для implementation, research, planning і design tasks.
