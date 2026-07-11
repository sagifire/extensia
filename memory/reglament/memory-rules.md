# Memory Rules and Reglament Glossary

Starter Kit Version: 5.0
PDADM MVP Version: 0.5

## Glossary

| Термін | Значення |
|---|---|
| Project Memory | Структурований довгоживучий контекст проекту в `memory/`. |
| Task | Операційна одиниця планування з contract, status та історією run. |
| Task run | Ізольована спроба виконати task contract за конкретним context snapshot. |
| Документ регламенту Starter Kit | Документ у `reglament/`, відведений для operational rules PDADM. |
| Пам'ятка регламенту | Конкретна інформація про регламент у документі пам'яті. |
| Пам'ятка агента | Конкретна інформація, записана в пам'ять агентом. |
| Пам'ятка користувача | Конкретна інформація, записана в пам'ять людиною. |
| Запит користувача | Повідомлення користувача в сесії. |
| Інструкція користувача | Конкретна вказівка, вимога або обмеження в запиті. |
| Інструкція пам'яті | Запис інструкції в Project Memory; додаткові metadata вказуються за потреби. |
| Formal research | Research/planning/design зі самостійним `RSCH-*` і detailed report. |
| Memory fixation | Контрольований proposal зміни canonical Project Memory у `FIX-*`. |
| Wiki index | `index.md` з прямими дочірніми folders і files. |
| Architecture pressure | Ознаки, що архітектура створює неприродне тертя, workaround або зростання blast radius. |

## Мова пам'яті

1. Канонічний авторський текст Project Memory ведеться українською.
2. Назви файлів, API, команд, бібліотек, schema keys, enum values, IDs і сталі зовнішні терміни можна залишати мовою джерела.
3. Цитати й source/reference documents можна залишати мовою джерела з українським описом або інструкцією використання.
4. Self-review для memory changes містить language gate.
5. Сумнівний іншомовний авторський текст треба перекласти, уточнити або позначити blocker.

## Wiki indexes

1. Кожна папка Project Memory має `index.md` без винятків.
2. Формат: `Призначення`, `Папки`, `Файли`.
3. Використовувати однорядкові wiki links із коротким описом.
4. Якщо елементів немає, писати `Немає`.
5. Не зберігати rules або великі summaries в index.
6. При структурній зміні оновити всі безпосередньо пов'язані indexes у межах тієї самої операції.

## Task і run statuses

Task statuses:

```text
backlog | active | review | blocked | canceled | done
```

Run statuses:

```text
prepared | active | review-ready | finalizing | completed |
changes-requested | failed | blocked | canceled
```

Current state pairs:

- `backlog` + `prepared`;
- `active` + `active`;
- `review` + `review-ready`;
- `review` + `finalizing`;
- `blocked` + `blocked|failed`;
- `done` + `completed`;
- `canceled` + `canceled`.

## Task structure

```text
TASK-.../
  index.md
  task.md
  RUN-001/
    index.md
    context.md
    result.md
  RSCH-001.md
  FIX-001.md
```

У backlog-задачі `result.md` ще немає. Він створюється при активації run.

`task.md` - dashboard, task contract, artifact registry, pending decisions, human review і final result.

`context.md` - повний snapshot effective requirements, scope, acceptance, task-specific reading, risks і assumptions. Після активації він незмінний.

`result.md` - єдиний run execution, verification, self-review та audit report з основними показниками на початку й append-only finalization.

## Artifact rules

1. `result.md`, `RSCH-*`, detailed report і `FIX-*` можна виправляти під час execution/self-review/subagent review.
2. Під час передачі задачі в human review reviewed content заморожується.
3. Після freeze дозволені лише lifecycle metadata та append-only approval/application/finalization.
4. Зміна reviewed content потребує нового run і, за потреби, нового `RSCH-*` або `FIX-*`.
5. Кожен `RSCH-*` і `FIX-*` посилається на Related Task і Related Run.
6. Кожен formal research має detailed report у `reports/research/`.
7. Self-review централізований у run `result.md` і охоплює всі пов'язані artifacts.
8. Перед `done` кожен завершений `RSCH-*` має явний disposition `final-result | incorporated | realized | superseded` у `task.md` або `result.md`.

## Memory fixation

`FIX-*` потрібен для змістових змін у `product/`, `domain/`, `technical/`, `knowledge/`, `project/` та інших canonical documents.

Не потребують рекурсивного `FIX-*`:

- task status і dashboard updates;
- run artifacts;
- `tasks/plan/progress.md`;
- task/run indexes;
- короткий `state.md`, який прямо відображає task lifecycle.

Перед review `FIX-*` має target files, exact proposed changes, rationale, impact, risks і consistency check.

Після approval agent застосовує тільки exact proposal. Required або approved fixation має бути `applied` до `done`.

## Upward consistency

Перевірити вплив на `state.md`, Product overview, Domain current/target/rules, Technical architecture/rules/ADR, Knowledge packages, project-specific rules та indexes.

Для кожної релевантної області вказати `included | not-needed | blocked`.

## Knowledge і reports

1. Knowledge packages читаються через `knowledge/package-index.md` лише за потреби.
2. Повний reglament package не входить у startup.
3. `reports/research/` містить detailed formal research.
4. `reports/audits/` містить довгоживучі audit findings.
5. `reports/periodic/` містить періодичні огляди.
6. Reports не замінюють task-local `result.md`, `RSCH-*` або `FIX-*`.

## Architecture pressure

Self-review перевіряє workaround, duplication, coupling, blast radius, brittle tests, невідповідність domain model, застарілі architecture/ADR та потребу в audit/refactor/design.

Не маскувати architecture pressure локальним workaround без явного risk record.

## Заборонено

- створювати task без prepared current run;
- переписувати історичні run;
- змінювати reviewed artifact body;
- застосовувати memory changes без approved `FIX-*`;
- закривати задачу без task-level human approval;
- закривати задачу із завершеним `RSCH-*` без явного disposition;
- закривати задачу з required/approved fixation не в `applied`;
- змішувати current і target state;
- додавати rules в indexes;
- масово переписувати memory без task-specific причини;
- порушувати language gate.
