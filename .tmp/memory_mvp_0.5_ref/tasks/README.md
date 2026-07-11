# Task Memory

`task.md` є головним операційним документом задачі. Кожна задача виконується через один або кілька універсальних task runs.

## Task statuses

```text
backlog | active | review | blocked | canceled | done
```

- `backlog` - задача атомарно створена з prepared current run, але не запускалася;
- `active` - current run виконується;
- `review` - результат очікує human review або проходить approved finalization;
- `blocked` - продовження неможливе без зовнішнього рішення або зміни;
- `canceled` - роботу припинено без прийнятого результату;
- `done` - результат прийнято й finalization завершено.

`archive` не є status. Архівування відбувається окремо після `done` або `canceled`.

## Run statuses

```text
prepared | active | review-ready | finalizing | completed |
changes-requested | failed | blocked | canceled
```

Current pairs:

- `backlog` + `prepared`;
- `active` + `active`;
- `review` + `review-ready`;
- `review` + `finalizing`;
- `blocked` + `blocked|failed`;
- `done` + `completed`;
- `canceled` + `canceled`.

## Типи задач

`feature | bugfix | refactor | research | planning | design | docs | knowledge | memory-update | memory-migration | chore`

`Type` є описовим і не перемикає workflow. `Execution Mode` не використовується.

## Task folder

```text
tasks/plan/TASK-MM.YY-NNNN-short-name/
  index.md
  task.md
  RUN-001/
    index.md
    context.md
    result.md
  RUN-002/
    index.md
    context.md
    result.md
  RSCH-001.md
  FIX-001.md
```

У backlog-задачі `result.md` відсутній до активації run.

## Атомарне створення

Валідна нова задача одразу має:

1. унікальний task ID;
2. task `index.md`;
3. повний `task.md`;
4. `RUN-001/index.md`;
5. готовий `RUN-001/context.md`;
6. записи в `tasks/plan/index.md` і `progress.md`;
7. `Task Status: backlog` і `Run Status: prepared`.

Частково підготовлена задача не вважається створеною.

## Активація

Пряма інструкція виконати backlog-задачу за однозначно вказаним task ID або назвою автоматично:

1. переводить task у `active`;
2. переводить current run у `active`;
3. створює `RUN-*/result.md`;
4. заморожує `context.md`;
5. запускає виконання без повторного approval.

## Документи

### `task.md`

Dashboard, task contract, artifact registry, pending decisions, human review і final result.

### `context.md`

Повний snapshot effective requirements, scope, acceptance, task-specific reading, risks і assumptions. Єдиний стартовий документ run.

### `result.md`

Єдиний execution, verification, self-review та audit report run. Створюється під час активації й має основні показники на початку.

### `RSCH-*`

Короткий task-local результат formal research/planning/design із detailed report у `reports/research/`. Невеликі допоміжні перевірки живуть у `result.md` без окремого `RSCH-*`.

Перед `done` кожен завершений `RSCH-*` має disposition `final-result | incorporated | realized | superseded` у `task.md` або `result.md`.

### `FIX-*`

Exact proposal зміни canonical Project Memory. Готується під час active run і застосовується після human approval під час finalization.

## Заморожування

- `context.md` заморожується при активації.
- `result.md`, `RSCH-*`, detailed report і proposal body `FIX-*` можна виправляти під час execution/self-review/subagent review.
- Під час передачі в human review reviewed content заморожується.
- Після цього дозволені лише lifecycle metadata та append-only approval/application/finalization.
- Зміна reviewed content потребує нового run.

## Human review і finalization

Перед review агент виконує self-review або independent subagent review і закриває чи оформлює findings.

У Review Request показуються outcome, acceptance, verification, risks, `RSCH-*`, `FIX-*` із `required|optional`, follow-up proposals і recommended decision.

Task-level рішення: `approve | request changes | cancel`. `request changes` запускає новий run; `cancel` припиняє задачу без прийняття результату. Окремий task-level `reject` не використовується.

Після approval:

- без `FIX-*`: run `completed`, task `done`;
- із approved `FIX-*`: run `finalizing`, task лишається `review`; після exact application і verification - run `completed`, task `done`.

Якщо finalization не вдалася, exact retry без зміни reviewed content лишається в `review` + `finalizing`; зовнішній blocker переводить task/run у `blocked`; зміна reviewed content потребує нового active run.

Required або approved `FIX-*` має бути `applied` до `done`.

## Новий run

Новий run створюється для request changes, failed attempt із безпечним retry, суттєво змінених вимог/context або повторної спроби іншим агентом.

Старий run і reviewed artifacts не переписуються. Новий `context.md` містить `Зміни від попереднього run`.

Зміна сесії або context window не створює новий run сама по собі.

## Follow-up tasks

Out-of-scope робота спочатку записується як proposal у `task.md` і `result.md`. Канонічне створення відбувається після підтвердження користувача, бажано через subagent preparation.

## Indexes

Кожен task і кожен `RUN-*` folder має `index.md`. Task index перелічує прямі run folders, `task.md`, `RSCH-*` і `FIX-*`. Run index перелічує `context.md` і, після активації, `result.md`.
