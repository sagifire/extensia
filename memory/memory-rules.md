# Memory Rules

Starter Kit Version: 4.0
PDADM MVP Version: 0.4

Це головний файл правил роботи з `memory/`.

## Мова пам'яті

Канонічна мова авторського тексту цієї Project Memory - українська.

- Усі канонічні файли пам'яті, wiki indexes, задачі, execution artifacts, reports, knowledge packages і нотатки ведуться українською.
- Назви файлів і папок, API, команди, package names, library names, schema keys, protocol fields, enum values, technical IDs і короткі зовнішні терміни можна залишати мовою джерела.
- Прямі цитати й source/reference documents можна залишати мовою джерела, якщо вони явно позначені як джерело або reference.
- Якщо джерело не українською, для reusable knowledge треба додати український короткий опис, висновок або інструкцію використання.
- Self-review для змін у Project Memory має містити language gate: агент перевіряє, чи немає англомовного авторського тексту без дозволеної причини.
- Якщо агент не впевнений, чи можна залишити фрагмент не українською, він перекладає або українізує авторський текст, ставить уточнення користувачу або фіксує blocker/follow-up.

## Startup rules

1. Кожна агентська сесія повинна мати явну `Agent Role`.
2. Якщо роль або задача не вказані, агент працює як `Agent Assistant` у режимі `Methodology Navigator`.
3. На старті агент читає `memory/agent-start.md` і відповідний boot packet.
4. Після boot packet агент зупиняє startup reading і переходить до задачі або пояснення доступних наступних кроків.
5. Повний `pdadm-mvp-reglament` не читається на старті звичайної сесії без явної потреби.
6. `Execution Mode` є властивістю задачі в `task.md`, а не режимом запуску сесії.
7. Якщо задача вказана, агент визначає workflow за `task.md`, task context і правилами регламенту.
8. Agent Assistant має пояснювати користувачу поточний workflow state, причину наступного кроку, доступні варіанти дій і місця, де потрібен human review або approval.

## Task boundary

1. Агент не змінює код, canonical Project Memory, project docs або project artifacts поза task boundary.
2. Якщо задача потрібна і scope/risk зрозумілі, агент може автономно створити задачу, але має повідомити користувача про task id, type, execution mode, scope, out of scope і acceptance criteria.
3. Якщо scope/risk неясні або зміна може мати високий вплив, агент готує draft task або ставить уточнювальне питання.
4. Дрібний виняток для trivial edits не поширюється на зміни з архітектурним, продуктовим, memory або security impact.

## Task rules

1. Кожна задача має `task.md`.
2. Кожна задача має `Type` і `Execution Mode`.
3. Допустимі типи задачі: `feature`, `bugfix`, `refactor`, `research`, `planning`, `design`, `docs`, `knowledge`, `memory-update`, `memory-migration`, `chore`.
4. Усі неархівні задачі живуть у `tasks/plan/`.
5. Статуси задач фіксуються в `task.md` і `memory/tasks/plan/progress.md`.
6. Допустимі статуси задачі: `backlog`, `active`, `review`, `blocked`, `canceled`, `done`.
7. `archive` не є статусом задачі, а лише фізичним місцем для задач, які більше не потрібні в операційній навігації.
8. Task folder не переноситься між `backlog`, `active`, `review`, `blocked`, `canceled` і `done`.
9. Агент не може самостійно переводити задачу в `done`.
10. Після завершення своєї роботи агент виконує self-review, переводить задачу в `review` і просить task-level human review decision.
11. `done` можливий тільки зі статусу `review` після явного human approval.
12. Погодження варіанта, проміжного рішення, плану або fixation proposal не є human review approval задачі.
13. Якщо робота припиняється без human review або без прийняття результату, задача переводиться в `canceled`, а не в `done`.
14. `autonomous-implementation` не починається без task folder і task run.
15. Кожен autonomous implementation run має власні `requirements.md`, `context.md`, `result.md`.
16. `autonomous-research` використовується для `research`, `planning` і `design`; це не implementation mode.
17. `autonomous-research` не завершується без `research/RSCH-*.md` і деталізованого звіту в `reports/research/**`.
18. Якщо research пропонує фіксацію в Project Memory, вона оформлюється через `fixations/FIX-*.md` і застосовується тільки після human approval.
19. `interactive-memory-update` не змінює Project Memory без `fixations/FIX-*.md` і self-review.
20. Старі run, research або fixation files не переписуються так, ніби попередньої спроби або проблеми не було.

## Self-review rules

1. Якщо агент може запускати субагентів, self-review виконує незалежний субагент-аудитор в окремій сесії.
2. Якщо субагенти недоступні, агент виконує same-agent review і явно фіксує `Review Limitation`.
3. Self-review має оцінити completion quality, scope discipline, shortcuts, risks, unplanned work, follow-up tasks і додаткові зауваження для human review.
4. Не можна подавати `result.md`, `RSCH-*` або `FIX-*` як review-ready, якщо findings не закриті, не прийняті як risk або не винесені у follow-up/blocker.
5. Для Project Memory self-review обов'язково містить language gate.
6. Для implementation, research, planning і design self-review перевіряє architecture pressure.

## Domain rules

1. Поточний доменний стан фіксується в `domain/current/`.
2. Цільовий або бажаний доменний стан фіксується в `domain/target/`.
3. Поточний і цільовий стан не змішуються.
4. Декомпозицію доменних документів визначає людина разом з Agent Assistant.

## Wiki index rules

1. Кожна папка Project Memory повинна мати `index.md`.
2. `index.md` описує тільки прямі дочірні папки й файли.
3. Після створення, видалення, перейменування або зміни призначення файлу чи папки треба оновити відповідний `index.md`.
4. Якщо зміна зачіпає кілька рівнів, оновлюються всі релевантні індекси.
5. `index.md`, `package-index.md` і `tasks/plan/progress.md` використовують списки з wiki-посиланнями, а не таблиці.
6. Навігаційний запис має бути однорядковим: `[Назва](path.md) - короткий опис`.
7. Для дочірньої папки посилання веде на її `index.md`.
8. `index.md` і `tasks/plan/progress.md` не містять секцію `Notes`, локальні правила або agent notes.

## Reports rules

1. `reports/periodic/` містить періодичні огляди стану Project Memory.
2. `reports/research/` містить деталізовані звіти research, planning і design tasks у режимі `autonomous-research`.
3. `reports/audits/` містить audit reports, включно з architecture health audits.
4. Reports не замінюють task-local artifacts: `result.md`, `research/RSCH-*.md` і `fixations/FIX-*.md`.
5. Якщо report має довгоживучу цінність, його треба індексувати через відповідний `index.md`.

## Knowledge rules

1. Перед задачами, де можуть знадобитися reusable knowledge, агент перевіряє `memory/knowledge/package-index.md`.
2. Knowledge package повинен мати `package.md`.
3. `knowledge/packages/pdadm-mvp-reglament/` є reference layer регламенту, а не startup layer.
4. Агент може створювати draft пакета, додавати приклади, уточнення й changelog notes.
5. Агент не повинен без явної інструкції масово переписувати core rules, змінювати статус пакета або видаляти приклади.

## Memory sync rules

Після autonomous implementation run у `result.md` треба зафіксувати:

- чи змінювалась product memory;
- чи змінювалась domain memory;
- чи змінювалась technical memory;
- чи змінювалась knowledge memory;
- чи оновлені task memory і wiki indexes;
- чи потрібно оновити `memory/state.md`;
- чи перевірено документи загального рівня;
- чи потрібна follow-up task.

Після autonomous research результат фіксується у `research/RSCH-*.md`, а деталізований звіт - у `reports/research/**`.

Після interactive або research-driven memory fixation memory sync фіксується у `fixations/FIX-*.md`.

Документи загального рівня включають `state.md`, top-level `README.md` і `index.md`, загальні product/domain/technical документи, `knowledge/package-index.md`, relevant package indexes і `tasks/plan/progress.md`, якщо зміна впливає на задачі.

Для документів загального рівня агент фіксує один зі станів: `updated`, `not needed`, `proposed` або `blocked`.

Не можна подавати `result.md`, `RSCH-*` або `FIX-*` як review-ready, якщо вплив на документи загального рівня не перевірений.

## Architecture health

Агент перевіряє architecture pressure під час implementation, research, planning і design tasks.

Сигнали architecture pressure:

- нові фічі потребують обхідних шляхів або дублювання;
- зміни регулярно зачіпають надто багато модулів;
- поточні abstractions не відповідають доменній моделі;
- tests стають крихкими через архітектурну зв'язаність;
- ADR або architecture notes не відповідають фактичному коду;
- користувач уникає refactor через страх щось зламати.

Якщо architecture pressure істотний, агент має запропонувати architecture audit у `reports/audits/**`, design/research task, ADR або refactor task з контрольованим scope.

## Forbidden actions for agents

- Починати роботу без явної ролі або fallback у `Agent Assistant` / `Methodology Navigator`.
- Продовжувати startup reading після boot packet без явної причини.
- Змінювати код, Project Memory або project artifacts поза task boundary.
- Починати `autonomous-implementation` без task run.
- Закривати задачу як `done` без task-level human review approval.
- Вважати погодження проміжного рішення approval всієї задачі.
- Змінювати Project Memory у `interactive-memory-update` без fixation package.
- Завершувати `autonomous-research` без `research/RSCH-*.md` і `reports/research/**`.
- Застосовувати research-driven memory proposal без human approval.
- Подавати memory fixation як review-ready без upward consistency check.
- Змішувати `domain/current/` і `domain/target/`.
- Масово переписувати великі memory documents без явної інструкції.
- Ігнорувати out-of-scope обмеження задачі.
- Міняти структуру пам'яті без оновлення індексів.
