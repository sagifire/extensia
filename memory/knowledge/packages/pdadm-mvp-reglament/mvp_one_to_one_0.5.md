# Product Driven AI Development Methodology

## MVP 0.5 для однієї людини та агентської системи

Статус: Draft
Версія: MVP 0.5
Мова: Українська
Профіль застосування: Solo / 1.5 Human + AI Agent System
Призначення: Практична product-driven AI-assisted розробка з Project Memory, універсальним task run, контрольованими змінами пам'яті, мінімальною звітністю та human review.

---

# 1. Призначення MVP

PDADM MVP призначена для практичної роботи в мінімальному складі:

* одна людина, яка поєднує кілька рольових позицій;
* одна або кілька AI-агентських систем;
* Project Memory як довгоживучий проектний контекст;
* задачі як основна операційна одиниця планування;
* task runs як основна одиниця виконання;
* human review як контроль прийняття результату;
* knowledge packages як переносимий шар знань.

Методологія має робити роботу передбачуванішою без перетворення сесії на бюрократичний сценарій. Регламент визначає інваріанти задач, run та артефактів, але не режисує природний діалог людини з агентом.

---

# 2. Основна модель

```text
Project Memory
  + Task Contract
  + Task Run
  + Immutable Run Context
  + Run Result
  + Optional Research Artifacts
  + Controlled Memory Fixations
  + Human Review
  = керована агентська розробка
```

Ключові принципи:

1. Project Memory є довгоживучим проектним контекстом і джерелом проектних знань.
2. `task.md` є головним операційним документом задачі.
3. Кожна валідна задача створюється атомарно разом із підготовленим `RUN-001/context.md`.
4. Кожна задача виконується через один або кілька task runs.
5. Run є універсальним циклом виконання, а не окремим режимом задачі.
6. Усередині run можуть природно поєднуватися імплементація, дослідження, planning, design і підготовка memory fixation.
7. `Execution Mode` і окремі workflow за режимами не використовуються.
8. `context.md` є повним snapshot ефективного контракту конкретного run.
9. `result.md` створюється під час активації run і є єдиним execution/self-review звітом run.
10. Формальне дослідження створює task-local `RSCH-*` і detailed report; невелика допоміжна перевірка фіксується в `result.md`.
11. Зміни canonical Project Memory готуються через `FIX-*` і застосовуються тільки після human approval.
12. Кожна папка Project Memory має `index.md` без винятків.
13. Старі run та передані в human review артефакти не переписуються.
14. Агент не переводить задачу в `done` без task-level human approval.
15. Погоджений `FIX-*` не може залишитися незастосованим у задачі зі статусом `done`.
16. Зміна сесії не створює нову задачу або run сама по собі.
17. Агент не виходить за task boundary без явного рішення користувача.
18. Канонічна мова авторського тексту Project Memory — українська.
19. Agent self-review перевіряє якість, scope, ризики, language gate, memory impact і architecture pressure.
20. Project-specific правила можуть адаптувати регламент у межах конкретного проекту.

---

# 3. Межі MVP

## 3.1 У MVP є

* Project Memory;
* компактний operational layer регламенту;
* project-specific agent і memory rules;
* Product, Domain, Technical, Task і Knowledge Memory;
* wiki indexes;
* атомарне створення задач;
* універсальний task run;
* task-local `RSCH-*` і `FIX-*`;
* detailed research та audit reports;
* self-review і незалежний subagent audit, якщо доступний;
* human review і контрольована фіналізація;
* memory sync;
* inbox, state та project bootstrap guidance;
* прямі migration guides для підтримуваних source versions.

## 3.2 У MVP немає

* окремих workflow для implementation, research і interactive memory update;
* task-level `Execution Mode`;
* session modes або session state machine;
* обов'язкового `worklog.md`;
* окремого run `requirements.md`;
* обов'язкового `closure.md`;
* автоматичного закриття задачі без людини;
* повної enterprise governance-моделі;
* складної матриці відповідальності;
* історичного архіву всіх версій регламенту в Starter Kit;
* вимоги читати повний текст регламенту під час звичайного startup.

---

# 4. Рольова модель

Ролі є hats — способами дивитися на рішення. Вони не є session modes і не змушують людину створювати окрему сесію для кожної ролі.

## 4.1 Ролі людини

### Product Owner Hat

Відповідає за:

* цінність продукту;
* пріоритети;
* прийняття результату, запит змін або скасування задачі;
* рішення щодо scope і ризиків.

### Product Lead Hat

Відповідає за:

* task contract;
* acceptance criteria;
* узгодженість задачі з продуктом і roadmap;
* task-level human review.

### System Engineer Hat

Відповідає за:

* архітектурні межі;
* технічні ризики;
* quality gates;
* ADR, audit і refactor decisions.

### Knowledge Engineer Hat

Відповідає за:

* структуру й якість Project Memory;
* knowledge packages;
* memory migration;
* семантичну узгодженість знань.

### Agent Operator Hat

Відповідає за:

* запуск і координацію агентів;
* передачу task/run context;
* контроль меж доступу;
* перевірку звітів і артефактів.

Одна людина може виконувати всі hats.

## 4.2 Ролі агентів

### Agent Assistant

Допомагає:

* уточнювати намір користувача;
* формулювати task contract;
* готувати Decision Request;
* створювати task proposals;
* готувати `FIX-*`;
* орієнтувати користувача в доступних діях.

### Agent Executor

Виконує task run:

* читає `task.md` і `context.md`;
* змінює дозволені project artifacts;
* проводить потрібні дослідження;
* створює `result.md`, `RSCH-*` і `FIX-*`;
* запускає перевірки;
* готує результат до review.

### Agent Reviewer

Перевіряє:

* виконання task/run contract;
* якість результату;
* scope і acceptance criteria;
* ризики, компроміси та незаплановану роботу;
* memory impact, language gate і architecture pressure.

Якщо доступні субагенти, Agent Reviewer бажано виконувати окремою агентською сесією.

### Agent Knowledge Maintainer

Перевіряє й підтримує:

* структуру Project Memory;
* knowledge packages;
* індекси;
* migration tasks;
* відповідність operational rules поточній версії регламенту.

Агент повинен явно визначити свою роль перед активним виконанням run. Якщо роль не вказана, безпечний fallback — `Agent Assistant`; перед фактичним виконанням агент уточнює або декларує роль `Agent Executor`.

---

# 5. Основні поняття

## 5.1 Project Memory

Структурований довгоживучий контекст проекту, який містить продуктові, доменні, технічні, task, knowledge та operational документи.

## 5.2 Task

Операційна одиниця планування з метою, вимогами, scope, acceptance criteria, поточним станом і історією run.

## 5.3 Task run

Ізольована спроба виконати task contract за конкретним snapshot контексту.

## 5.4 Формальне дослідження

Окрема дослідницька, planning або design діяльність, яка є вимогою run або створює самостійний довгоживучий результат. Вона створює `RSCH-*` і detailed report.

## 5.5 Memory fixation

Контрольований proposal змін canonical Project Memory у `FIX-*`, який застосовується тільки після human approval.

## 5.6 Документ регламенту Starter Kit

Документ Starter Kit, спеціально відведений для operational rules PDADM.

## 5.7 Пам'ятка регламенту

Конкретна інформація про регламент, записана в документі пам'яті, зазвичай у `reglament/`.

## 5.8 Пам'ятка агента

Конкретна інформація, записана в документ пам'яті агентом.

## 5.9 Пам'ятка користувача

Конкретна інформація, записана в документ пам'яті людиною.

## 5.10 Запит користувача

Повідомлення користувача в сесії.

## 5.11 Інструкція користувача

Конкретна вказівка, обмеження або вимога в запиті користувача.

## 5.12 Інструкція пам'яті

Запис інструкції в Project Memory. Scope, priority, актуальність або інші metadata зазначаються лише за потреби.

---

# 6. Operational layer і startup

## 6.1 Постійне застосування регламенту

Якщо проект підключив PDADM через project-level instructions і `agent-start.md`, дотримання регламенту є постійною властивістю проекту, а не режимом окремої сесії.

Тимчасове послаблення можливе лише за явною інструкцією користувача зі зрозумілим scope. Воно не скасовує task history, human review або інші критичні інваріанти мовчки.

## 6.2 Default boot packet

На початку роботи з підключеною Project Memory агент завжди читає:

```text
agent-start.md
reglament/agents.md
reglament/memory-rules.md
```

`agent-start.md` маршрутизує читання project-specific правил:

```text
project/agents.md
project/memory-rules.md
```

Він має коротко пояснювати, коли читати один або обидва project-specific файли. Перед змінами Project Memory агент повинен прочитати релевантні project memory rules. Перед активним виконанням run — релевантні project agent rules.

## 6.3 Подальше читання

Після boot packet агент читає тільки те, що потрібно для поточної роботи:

* `task.md` і `RUN-*/context.md`, якщо виконується задача;
* `state.md`, якщо потрібен актуальний стан проекту;
* релевантні Product, Domain і Technical Memory;
* `knowledge/package-index.md`, якщо можуть знадобитися reusable knowledge packages;
* конкретні knowledge packages за їхніми `When to Use`;
* повний пакет регламенту тільки для methodology audit, пояснення повного правила або migration.

Повний регламент не є startup layer.

## 6.4 Природність сесії

Сесія не має регламентного статусу й не визначає task lifecycle.

Зміна, завершення або переповнення контексту сесії:

* не створює нову задачу;
* не створює новий run;
* не змінює task status;
* не є причиною виносити in-scope роботу у follow-up task.

Нова сесія відновлює роботу за `task.md`, `Current Run`, `context.md`, `result.md` та пов'язаними артефактами.

Проміжні повідомлення агента залишаються природною частиною взаємодії й не потребують окремого `Work Report` або `worklog.md`.

---

# 7. Рекомендована структура Project Memory

```text
memory/
  index.md
  agent-start.md
  human-start.md
  README.md
  state.md
  inbox.md

  reglament/
    index.md
    agents.md
    memory-rules.md

  project/
    index.md
    agents.md
    memory-rules.md

  product/
    index.md
    vision.md
    requirements.md
    roadmap.md

  domain/
    index.md
    glossary.md
    current/
      index.md
    target/
      index.md
    rules.md
    open-questions.md

  technical/
    index.md
    architecture.md
    stack.md
    rules.md
    decisions/
      index.md

  tasks/
    index.md
    README.md
    plan/
      index.md
      progress.md
    archive/
      index.md

  knowledge/
    index.md
    README.md
    package-index.md
    packages/
      index.md
    adaptations/
      index.md

  templates/
    index.md
    agent-start.md
    human-start.md
    task.md
    context.md
    result.md
    research-report.md
    research-detailed-report.md
    fixation.md
    audit-report.md
    adr.md
    knowledge-package.md
    knowledge-example.md
    knowledge-anti-example.md

  reports/
    index.md
    periodic/
      index.md
    research/
      index.md
    audits/
      index.md
```

`run-requirements.md`, `worklog.md` і `closure.md` не входять до структури MVP 0.5.

## 7.1 Розподіл operational rules

`reglament/agents.md` містить компактні правила поведінки агентів за PDADM.

`reglament/memory-rules.md` містить:

* правила структури й оновлення Project Memory;
* task/run invariants;
* index rules;
* memory fixation і memory sync rules;
* language gate;
* глосарій регламенту;
* заборонені дії.

`project/agents.md` і `project/memory-rules.md` містять project-specific правила й можуть адаптувати загальні правила до конкретного проекту. Адаптація має бути явною, локалізованою й не повинна маскувати фактичне відхилення від регламенту.

---

# 8. Wiki indexes

## 8.1 Єдине правило

Кожна папка Project Memory має `index.md`. Винятків для task або run folders немає.

`index.md` є навігаційним документом і містить:

```markdown
# Індекс: Назва

## Призначення

Коротке призначення папки.

## Папки

- [Назва](folder/index.md) — однорядковий опис.

## Файли

- [Назва](file.md) — однорядковий опис.
```

Якщо дочірніх папок або файлів немає, використовується явне `Немає`.

Індекси не містять локальних правил, великих summaries або довільних notes. Правила живуть у rules-файлах, а зміст — у цільових документах.

## 8.2 Оновлення індексів

При створенні, видаленні, перейменуванні або перенесенні файлів і папок агент оновлює всі безпосередньо пов'язані `index.md` у межах тієї самої операції.

Майбутня автоматизація індексів допустима, але не змінює їхній єдиний формат і семантику.

---

# 9. Головні файли й шари пам'яті

## 9.1 `agent-start.md`

Коротка точка входу агента. Містить:

* version marker PDADM;
* default boot packet;
* маршрути читання `project/*.md`;
* правило читання task/run context;
* stop rule для подальшого читання;
* умови читання knowledge packages і повного регламенту.

## 9.2 `human-start.md`

Пояснює людині:

* як почати роботу;
* як створити або виконати задачу;
* що означає human review;
* як відповідати на Review Request і Decision Request.

## 9.3 `state.md`

Короткий operational snapshot:

* current focus;
* активні або заблоковані задачі;
* recent decisions;
* current risks;
* next steps;
* open questions.

`state.md` не дублює roadmap, task contracts або повні звіти.

## 9.4 `inbox.md`

Містить сирі ідеї й сигнали, які ще не оформлені як task, decision або canonical knowledge. Inbox регулярно розбирається; він не є довгоживучим джерелом істини.

## 9.5 Product Memory

`product/vision.md` описує цінність, користувачів, проблеми й продуктові принципи.

`product/requirements.md` містить стабільні продуктові вимоги й обмеження.

`product/roadmap.md` показує фази, залежності й decision gates.

## 9.6 Domain Memory

`domain/glossary.md` визначає проектні доменні поняття.

`domain/current/` описує фактичний поточний стан.

`domain/target/` описує цільовий стан.

`domain/rules.md` містить доменні правила.

`domain/open-questions.md` містить невирішені доменні питання.

Current і target не змішуються в одному твердженні без явного маркування.

## 9.7 Technical Memory

`technical/architecture.md` описує актуальну архітектуру, межі, data flow та відомі обмеження.

`technical/stack.md` описує технологічний стек.

`technical/rules.md` містить технічні інваріанти й quality rules.

`technical/decisions/ADR-*.md` фіксує значущі архітектурні рішення:

```markdown
# ADR-NNNN: Назва

Status: proposed | accepted | superseded | rejected

## Контекст
## Рішення
## Наслідки
## Альтернативи
```

---

# 10. Task Memory

Task Memory є основною операційною поверхнею планування та виконання.

## 10.1 Статуси задачі

```text
backlog | active | review | blocked | canceled | done
```

* `backlog` — задача атомарно створена й підготовлена, але жоден run ще не активувався;
* `active` — поточний run виконується;
* `review` — результат очікує task-level human review або проходить погоджену фіналізацію;
* `blocked` — без зовнішнього рішення або зміни неможливо продовжувати;
* `canceled` — роботу припинено без прийняття результату;
* `done` — результат прийнято й фіналізацію завершено.

Task folder має стабільний шлях:

```text
tasks/plan/TASK-MM.YY-NNNN-short-name/
```

Зміна статусу не переносить folder. Архівування є окремою дією після `done` або `canceled`.

## 10.2 Статуси run

```text
prepared | active | review-ready | finalizing | completed |
changes-requested | failed | blocked | canceled
```

* `prepared` — `context.md` готовий, але run ще не запускався;
* `active` — run виконується, `result.md` існує й оновлюється;
* `review-ready` — виконання та self-review завершено, артефакти передані людині;
* `finalizing` — approval отримано, агент застосовує погоджені `FIX-*`;
* `completed` — run прийнятий і фіналізований;
* `changes-requested` — human review вимагає нового run;
* `failed` — спроба завершилась невдачею;
* `blocked` — run тимчасово не може продовжуватися;
* `canceled` — run припинено.

## 10.3 Узгодженість task і current run

| Task Status | Current Run Status | Значення |
|---|---|---|
| `backlog` | `prepared` | задача готова до першої активації |
| `active` | `active` | виконується current run |
| `review` | `review-ready` | очікується human review |
| `review` | `finalizing` | застосовуються погоджені fixations |
| `blocked` | `blocked` | current run тимчасово заблокований |
| `blocked` | `failed` | остання спроба невдала й без рішення не можна підготувати новий run |
| `done` | `completed` | фінальний run прийнято й завершено |
| `canceled` | `canceled` | задача припинена |

Попередні run зберігають власні terminal statuses, але не визначають поточний Task Status. `Current Run` у `task.md` вказує на єдиний run, який керує поточним станом.

Якщо run заблоковано, `task.md` фіксує `Blocked Phase: execution | finalization`. Після усунення блокера задача повертається відповідно в `active` або `review`.

## 10.4 Дозволені переходи

```text
backlog -> active
active -> review
active -> blocked
active -> canceled
blocked -> active
blocked -> review
blocked -> canceled
review -> active
review -> blocked
review -> done
review -> canceled
done -> archive
canceled -> archive
```

Перехід у `done` із `backlog`, `active`, `blocked` або `canceled` заборонений.

### 10.4.1 Типи задач

`Type` описує призначення задачі, але не перемикає workflow:

* `feature` — нова продуктова поведінка;
* `bugfix` — виправлення дефекту;
* `refactor` — покращення внутрішньої структури без запланованої зміни зовнішньої поведінки;
* `research` — дослідницький результат є головною метою;
* `planning` — план, послідовність або декомпозиція є головною метою;
* `design` — продуктовий, доменний або технічний design є головною метою;
* `docs` — зміна проектної документації поза canonical Project Memory;
* `knowledge` — створення або розвиток reusable knowledge;
* `memory-update` — змістова актуалізація Project Memory;
* `memory-migration` — контрольована зміна структури або версії Project Memory;
* `chore` — службова робота, яка не підходить до інших типів.

Одна задача може містити різні види діяльності незалежно від `Type`.

### 10.4.2 `tasks/plan/progress.md`

`progress.md` є короткою картою неархівних задач і не дублює повний task contract.

```markdown
# Прогрес задач

## Етап або група

- [ ] **[Backlog]** [TASK-...](TASK-.../index.md) — короткий опис.
- [ ] **[Active]** [TASK-...](TASK-.../index.md) — короткий опис.
- [ ] **[Review]** [TASK-...](TASK-.../index.md) — короткий опис.
- [ ] **[Blocked]** [TASK-...](TASK-.../index.md) — короткий опис.
- [x] **[Done]** [TASK-...](TASK-.../index.md) — короткий опис.
```

`canceled` не позначається як виконана робота. `progress.md` оновлюється разом із кожною зміною Task Status і не містить локальних правил або довгих notes.

## 10.5 Структура задачі

```text
TASK-MM.YY-NNNN-short-name/
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
  RSCH-002.md
  FIX-001.md
  FIX-002.md
```

У backlog-задачі `result.md` ще відсутній. Він створюється в момент першої активації відповідного run.

Task-local index:

```markdown
# Індекс: TASK-...

## Призначення

Коротка мета задачі.

## Папки

- [RUN-001](RUN-001/index.md) — current — prepared.

## Файли

- [Task](task.md) — task contract і поточний операційний стан.
- [RSCH-001](RSCH-001.md) — completed — короткий результат дослідження.
- [FIX-001](FIX-001.md) — proposed — memory fixation.
```

Run index:

```markdown
# Індекс: RUN-001

## Призначення

Перший прогон задачі TASK-....

## Папки

Немає.

## Файли

- [Context](context.md) — незмінний execution contract.
- [Result](result.md) — результат і self-review run.
```

До активації рядок `Result` у run index відсутній.

## 10.6 Атомарне створення задачі

Створення задачі є універсальною операційною дією й не потребує існування іншої задачі.

Валідна операція створення включає:

1. унікальний task ID;
2. task folder;
3. `index.md` задачі;
4. повний `task.md`;
5. `RUN-001/index.md`;
6. готовий `RUN-001/context.md`;
7. оновлення `tasks/plan/index.md` і `tasks/plan/progress.md`;
8. validation gate.

До проходження всіх кроків задача не вважається створеною й не подається користувачу як валідна. Частковий результат треба завершити, відкотити або явно відновити до звіту.

Після створення:

```text
Task Status: backlog
Current Run: RUN-001
Run Status: prepared
```

Ситуація «задача створена, але не підготовлена» заборонена.

### Право на створення

Додатковий дозвіл не потрібен, якщо:

* користувач прямо наказав створити задачу;
* створення конкретних задач прямо входить у scope поточної задачі.

Дозвіл потрібен, якщо створення виходить за scope. Знайдені під час виконання follow-up tasks спочатку оформлюються як proposals і показуються в Review Request.

### Делегування субагенту

Якщо доступний субагент, головний агент:

1. визначає та резервує task ID;
2. формує погоджений текст `task.md`;
3. передає субагенту task ID, task contract, додаткові вимоги, інструкції та релевантні memory links;
4. доручає створити й підготувати повний task package;
5. перевіряє результат і validation gate;
6. звітує користувачу.

Субагент не змінює task ID або task contract довільно. Якщо субагент недоступний, головний агент виконує операцію самостійно.

## 10.7 Автоматична активація

Пряма інструкція користувача на кшталт `виконай TASK-...` або однозначне посилання на назву задачі є достатнім дозволом:

1. змінити Task Status з `backlog` на `active`;
2. змінити Run Status з `prepared` на `active`;
3. створити `RUN-001/result.md` зі статусом `active`;
4. оновити run/task indexes і `progress.md`;
5. почати виконання без додаткового approval loop.

## 10.8 `task.md`

`task.md` є актуальним task contract, dashboard та локальним реєстром артефактів.

```markdown
# TASK-MM.YY-NNNN: Назва задачі

Task Status: backlog | active | review | blocked | canceled | done
Type: feature | bugfix | refactor | research | planning | design | docs | knowledge | memory-update | memory-migration | chore
Created: YYYY-MM-DD
Owner Role: ...
Current Run: RUN-001

## Поточний стан

Run Status: prepared | active | review-ready | finalizing | ...
Progress: короткий поточний результат
Acceptance: 0/N
Blockers: none | ...
Blocked Phase: n/a | execution | finalization
Pending Decisions: none | ...
Next Action: ...

## Мета
## Продуктовий контекст
## Вимоги
## Обсяг
## Поза обсягом
## Критерії приймання
## Пов'язана пам'ять
## Прогони
## Дослідження
## Фіксації
## Запити на рішення
## Запропоновані follow-up задачі
## Human Review
## Фінальний результат
```

`Type` є описовим і не перемикає workflow або структуру задачі.

Основні показники в `Поточний стан` завжди оновлюються разом зі зміною current run.

Списки артефактів мають однорядковий формат:

```markdown
## Прогони

- [RUN-001](RUN-001/index.md) — active — поточний run.

## Дослідження

- [RSCH-001](RSCH-001.md) — completed — disposition: realized — короткий висновок.

## Фіксації

- [FIX-001](FIX-001.md) — proposed — required — короткий опис.
```

Task-level review record:

```markdown
## Human Review

Status: not-ready | pending | approved | changes-requested | canceled
Requested: YYYY-MM-DD | n/a
Reviewed: YYYY-MM-DD | pending
Approval Source: повідомлення користувача | n/a
Approved Fixations: FIX-001 | none
Rejected Fixations: FIX-002 | none
Follow-up Decisions: ...
Decision Notes: ...

## Фінальний результат

Completed: YYYY-MM-DD | pending
Final Run: RUN-... | pending
Summary: ...
Residual Risks: ...
```

## 10.9 `RUN-*/context.md`

`context.md` є єдиним стартовим документом run і замінює окремий `requirements.md`.

```markdown
# Контекст виконання: RUN-001

Related Task: [TASK-...](../task.md)
Prepared: YYYY-MM-DD
Prepared By: agent / subagent
Previous Run: none | [RUN-...](../RUN-.../index.md)

## Мета run
## Ефективні вимоги
## Обсяг
## Поза обсягом
## Критерії приймання
## Заплановані результати
## Обов'язковий контекст задачі
## Вхідні файли та модулі
## Обмеження
## Перевірки
## Ризики
## Припущення
## Зміни від попереднього run
```

`context.md` містить повний snapshot ефективних вимог, scope й acceptance criteria, навіть якщо частина інформації повторює актуальний `task.md`. Це зберігає історичну достовірність run.

Базові operational files, які вже входять у boot packet, не дублюються в кожному `context.md`. Тут перелічується task-specific читання.

Після активації run `context.md` заморожується.

## 10.10 `RUN-*/result.md`

`result.md` створюється під час активації run і є єдиним execution, verification, self-review та audit report run.

```markdown
# Результат виконання: RUN-001

Status: active | review-ready | finalizing | completed | changes-requested | failed | blocked | canceled
Related Task: [TASK-...](../task.md)
Started: YYYY-MM-DD
Prepared For Review: pending | YYYY-MM-DD
Completed: pending | YYYY-MM-DD
Agent Role: ...
Review Method: pending | independent-subagent | same-agent
Auditor: pending | ...
Review Limitation: pending | none | subagent-unavailable | ...

## Основні показники

Outcome: pending | success | partial | failed | blocked
Summary: ...
Acceptance: 0/N
Verification: pending | passed | partial | failed
Memory Fixation: pending | not-needed | proposed | finalizing | applied | blocked
Open Risks: none | ...
Next Action: ...

## Виконана робота
## Змінені файли
## Створені артефакти
## Перевірки
## Критерії приймання
## Відхилення від контракту
## Ризики
## Вплив на Project Memory
## Self-review та audit
## Запропоновані follow-up задачі
## Фокус human review
## Фіналізація
```

Task-level approval не зберігається як канонічний стан у `result.md`; він живе в `task.md`. Секція `Фіналізація` після human approval оновлюється append-only і посилається на task-level decision.

## 10.11 Формальне дослідження і `RSCH-*`

Формальне дослідження створюється, якщо:

* воно прямо передбачене `context.md`;
* research/planning/design є самостійним deliverable;
* потрібен довгоживучий аналіз варіантів і рекомендація.

Невелике допоміжне дослідження, потрібне лише для виконання run, фіксується в `result.md` без окремого `RSCH-*`.

Формальне дослідження створює:

```text
TASK-.../RSCH-001.md
reports/research/YYYY-MM-DD-short-name.md
```

`RSCH-*` є коротким task-local операційним результатом:

```markdown
# Research: RSCH-001

Status: draft | completed | superseded
Type: research | planning | design
Related Task: [TASK-...](task.md)
Related Run: [RUN-001](RUN-001/index.md)
Detailed Report: [Назва](../../../reports/research/....md)
Created: YYYY-MM-DD
Review Status: pending | passed | findings-resolved
Review Record: [RUN-001 result](RUN-001/result.md)

## Питання або мета
## Обсяг
## Ключові знахідки
## Розглянуті варіанти
## Рекомендація
## Обгрунтування
## Вплив на поточний run
## Вплив на Project Memory
## Ризики й відкриті питання
```

Detailed report містить:

```markdown
# Деталізований звіт: Назва

Status: draft | completed | superseded
Type: research | planning | design
Related Task: ...
Related Run: ...
Related Research: ...
Created: YYYY-MM-DD

## Питання або мета
## Контекст
## Джерела й припущення
## Знахідки
## Варіанти
## Рекомендація
## Обгрунтування
## Ризики й обмеження
```

Research є діяльністю всередині поточного run. Воно не створює окремий task workflow і не вимагає проміжного approval, якщо без рішення користувача можна безпечно продовжити в межах task contract.

Перед `done` кожен завершений `RSCH-*` має явний disposition у `task.md` або `result.md`:

```text
final-result | incorporated | realized | superseded
```

## 10.12 `FIX-*`

`FIX-*` є proposal зміни canonical Project Memory.

Він потрібен для змістових змін у:

* `product/`;
* `domain/`;
* `technical/`;
* `knowledge/`;
* `project/agents.md` і `project/memory-rules.md`;
* інших canonical memory documents.

Операційні оновлення `task.md`, run artifacts, `tasks/plan/progress.md`, task/run indexes і короткого `state.md`, які безпосередньо відображають task lifecycle, не потребують рекурсивного `FIX-*`.

```markdown
# Fixation: FIX-001

Status: draft | proposed | approved | applied | rejected | blocked | superseded
Requirement: required | optional
Related Task: [TASK-...](task.md)
Related Run: [RUN-001](RUN-001/index.md)
Related Research: none | [RSCH-001](RSCH-001.md)
Created: YYYY-MM-DD
Review Status: pending | passed | findings-resolved
Review Record: [RUN-001 result](RUN-001/result.md)

## Призначення
## Джерело рішення
## Цільові файли
## Запропоновані зміни
## Обгрунтування
## Вплив і узгодженість
## Ризики

---

## Approval

Status: pending | approved | rejected
Reviewed: pending | YYYY-MM-DD
Approval Source: pending | повідомлення користувача
Approval Notes: ...

## Застосування

Applied: pending | YYYY-MM-DD
Applied Files: ...
Verification: ...
Deviations From Approved Proposal: none | ...
Result: pending | applied | blocked
```

У Review Request кожен `FIX-*` позначається як `required` або `optional`.

Обов'язковий за task contract `FIX-*` не можна відхилити й одночасно закрити задачу як успішну. Optional fixation можна відхилити з явною фіксацією рішення.

Задача не може перейти в `done`, якщо обов'язковий або погоджений `FIX-*` не має статусу `applied`.

## 10.13 Заморожування артефактів

* `context.md` заморожується під час активації run.
* `result.md`, `RSCH-*`, detailed report і proposal body `FIX-*` можна виправляти під час виконання, self-review та subagent review.
* Під час переходу задачі в `review` переглянутий зміст заморожується.
* Після цього дозволені тільки lifecycle metadata та append-only секції approval, application і finalization.
* Якщо після human review треба змінити зміст proposal або результату, створюється новий run і, за потреби, новий `RSCH-*` або `FIX-*`.

Старі артефакти не переписуються так, ніби попередньої спроби не було.

## 10.14 Self-review і незалежний audit

Перед `review-ready` агент виконує self-review всього run і пов'язаних артефактів.

Якщо доступний субагент, self-review бажано делегувати незалежному Agent Reviewer. Він може створювати findings і вимагати виправлень. До human review агент може виправляти `result.md`, `RSCH-*`, detailed report і `FIX-*`.

Якщо субагент недоступний, Agent Executor виконує same-agent review і фіксує limitation.

Self-review перевіряє:

* виконання effective requirements і acceptance criteria;
* scope та out of scope;
* якість перевірок;
* ризики, спрощення й компроміси;
* незаплановану роботу;
* research quality;
* memory impact і повноту `FIX-*`;
* language gate;
* architecture pressure;
* потребу у follow-up proposals;
* status усіх audit findings.

Findings мають один зі станів:

```text
closed | accepted-risk | follow-up-proposed | blocker
```

`review-ready` заборонений, якщо findings не перевірені або мають неоформлений відкритий стан.

## 10.15 Follow-up tasks

Нова сесія, заповнення context window або продовження in-scope роботи не є причиною створювати follow-up task.

Якщо під час run виявлена робота поза scope, агент:

1. формує proposal у `result.md` і `task.md`;
2. пояснює причину, scope і рекомендацію;
3. показує proposal у Review Request;
4. створює задачу тільки після підтвердження користувача.

Після підтвердження задача створюється атомарно за загальним правилом, бажано через субагента.

---

# 11. Універсальний workflow задачі

## 11.1 Обговорення без задачі

Обговорення, аналіз і уточнення можуть відбуватися природно без task folder, поки агент не змінює project artifacts або canonical Project Memory.

Результатом можуть бути:

* уточнений намір;
* варіанти;
* ризики;
* task proposal;
* inbox note за прямою інструкцією.

## 11.2 Створення й підготовка

Коли потрібна задача, фіксація і підготовка виконуються однією атомарною операцією. Задача одразу отримує `RUN-001/context.md` і статус `backlog`.

## 11.3 Активація

Коли користувач прямо доручає виконати задачу, агент автоматично активує current run, створює `result.md` і починає роботу.

## 11.4 Виконання run

Агент:

1. читає boot packet, `task.md` і `context.md`;
2. перевіряє task boundary;
3. виконує потрібні зміни;
4. проводить формальні дослідження, якщо вони передбачені або потрібні як самостійний результат;
5. створює `FIX-*` для потрібних змін canonical Project Memory;
6. запускає перевірки;
7. оновлює `result.md` і task dashboard;
8. виконує self-review або subagent review;
9. виправляє findings до human review.

## 11.5 Передача в human review

Якщо результат готовий:

1. Run Status стає `review-ready`;
2. Task Status стає `review`;
3. `result.md`, `RSCH-*`, detailed reports і proposal body `FIX-*` заморожуються;
4. оновлюються task/run indexes і `progress.md`;
5. агент надсилає Review Request.

## 11.6 Review Request

Review Request є інформаційним контрактом, а не жорсткою дослівною формою.

Мінімальний зміст:

```text
Задача TASK-... готова до human review.

Результат: success | partial | failed
Run: RUN-... — review-ready
Критерії: N/N
Перевірки: passed | partial | failed
Відкриті ризики: none | ...
Результат і self-review: `.../RUN-.../result.md`

Додаткові матеріали:
- RSCH-... — ...
- FIX-... — required | optional — ...
- запропоновані follow-up tasks — ...

Потрібне рішення:
1. approve;
2. request changes;
3. cancel.

При approve також підтвердь:
- застосувати або відхилити кожен FIX-*;
- створити або відхилити follow-up proposals.

Рекомендоване рішення: ...
```

Якщо є один required fixation, агент може запропонувати одну природну дію: прийняти результат, застосувати конкретний `FIX-*` і закрити задачу після успішної фіналізації без відхилень.

## 11.7 Що є human approval

Approval є валідним, якщо:

1. задача має `Task Status: review`;
2. агент явно надіслав task-level Review Request;
3. користувач явно прийняв результат усієї задачі;
4. для required/optional fixations є однозначні рішення;
5. користувач дозволив закриття після успішної фіналізації або окремо підтвердив closure.

`request changes` означає, що результат ще не прийнято, але робота продовжується в новому run. `cancel` означає припинення задачі без прийняття результату та переводить task і current run у `canceled`. Окремий task-level варіант `reject` не використовується, бо його зміст повністю покривають ці два рішення.

Погодження варіанта, формулювання, одного `RSCH-*`, окремої ідеї або наступного кроку не є task-level approval.

Коротке `так` або `погоджую` є достатнім лише як пряма відповідь на однозначний Review Request, у якому позитивна відповідь явно означає прийняття задачі та визначених fixations.

За неоднозначності агент ставить Decision Request і не закриває задачу.

## 11.8 Фіналізація

### Без fixations

Після approval:

```text
Run Status: completed
Task Status: done
```

Агент оновлює `task.md`, `result.md`, indexes, `progress.md` і, якщо потрібно, `state.md`.

### З погодженими fixations

Після approval:

```text
Run Status: finalizing
Task Status: review
```

Агент:

1. застосовує тільки погоджені зміни `FIX-*`;
2. оновлює цільові memory documents та indexes;
3. виконує verification;
4. append-only заповнює `FIX-*` і `result.md`;
5. перевіряє відсутність відхилень;
6. переводить fixations у `applied`;
7. переводить run у `completed`, а задачу — у `done`.

Повторний human review не потрібен, якщо застосування точно відповідає погодженому proposal.

Якщо виникли відхилення, конфлікт або невдала перевірка, агент не закриває задачу:

* якщо exact approved proposal можна безпечно повторно застосувати без зміни reviewed content, задача лишається `review`, а run — `finalizing`;
* якщо потрібне зовнішнє рішення або зміна, task і run переходять у `blocked` з `Blocked Phase: finalization`; після усунення блокера вони повертаються в `review` + `finalizing`;
* якщо треба змінити reviewed content, поточний run отримує `changes-requested`, а продовження виконується в новому автоматично активованому run; task переходить у `active` тільки разом із цим новим run.

## 11.9 Request changes і новий run

Якщо human review вимагає змін:

1. поточний run отримує `changes-requested`;
2. старі review artifacts лишаються замороженими;
3. агент атомарно створює `RUN-002/index.md` і `RUN-002/context.md`;
4. `task.md` вказує `Current Run: RUN-002`;
5. оскільки `request changes` уже є інструкцією продовжувати, новий run автоматично активується;
6. створюється `RUN-002/result.md`;
7. Task Status стає `active`.

Новий run також створюється, якщо:

* попередній run failed і безпечна нова спроба входить у scope;
* суттєво змінилися вимоги або context snapshot;
* потрібна ізоляція нової спроби;
* роботу треба повторити іншим агентом.

У `context.md` нового run обов'язково є `Зміни від попереднього run`.

## 11.10 Failed, blocked і canceled

`failed` є результатом конкретного run, а не task status.

Після failed run:

* якщо безпечна повторна спроба входить у scope — створюється новий run, задача лишається `active`;
* якщо без зовнішнього рішення продовжити неможливо — задача переходить у `blocked`;
* якщо роботу припинено — задача переходить у `canceled`.

`blocked` використовується тільки коли агент справді не може робити корисну in-scope роботу. Просте неблокувальне питання не змінює Task Status.

`canceled` не означає успішне завершення й не позначається як виконане в `progress.md`.

## 11.11 Decision Request

Decision Request також є інформаційним контрактом:

```text
Потрібне рішення: ...

Причина: чому агент не може безпечно обрати сам.
Рекомендація: ...

Варіанти:
1. ... — наслідок.
2. ... — наслідок.

Стан: TASK-... / RUN-...
Без рішення: можу продовжити ... | робота заблокована.
```

Для простих питань зайві поля опускаються.

## 11.12 User Guidance Layer

Агент допомагає людині користуватися регламентом без вимоги спочатку прочитати весь документ.

У ключових точках він коротко пояснює:

* чи потрібна задача;
* який task boundary застосовується;
* що зараз є current run;
* чи потрібне рішення або human review;
* які доступні наступні дії;
* яку дію рекомендує агент і чому.

Guidance має бути пропорційним досвіду користувача й складності рішення. Агент не повторює базовий регламент у кожному повідомленні.

---

# 12. Memory fixation і memory sync

## 12.1 Двоетапна модель

Зміна canonical Project Memory виконується у два етапи:

1. під час active run агент готує й перевіряє `FIX-*`;
2. після human approval агент застосовує exact approved proposal під час finalization.

До approval цільові canonical memory files не змінюються.

## 12.2 Upward consistency check

Кожен `FIX-*` перевіряє вплив на:

* `state.md`;
* продуктові оглядові документи;
* domain current/target і rules;
* technical architecture, rules і ADR;
* knowledge packages;
* project-specific rules;
* пов'язані indexes.

Для кожної релевантної області використовується один стан:

```text
included | not-needed | blocked
```

Задачу не можна подавати як review-ready, якщо вплив на документи загального рівня не перевірено.

## 12.3 Memory impact у `result.md`

До review `result.md` фіксує:

```markdown
## Вплив на Project Memory

Status: not-needed | proposed
Fixations: none | FIX-...
General-Level Impact: checked | blocked
Notes: ...
```

Після finalization append-only додається фактичний результат застосування.

## 12.4 Task Memory updates

Оновлення task status, current run, result, progress, task/run indexes та короткого state snapshot є частиною task lifecycle й не потребує окремого `FIX-*`.

Змістові зміни проектних правил, product/domain/technical/knowledge documents потребують `FIX-*`.

---

# 13. Knowledge Memory

## 13.1 Призначення

Knowledge Memory зберігає reusable знання, які мають цінність за межами однієї задачі.

```text
knowledge/
  index.md
  README.md
  package-index.md
  packages/
    index.md
    package-name/
      index.md
      package.md
  adaptations/
    index.md
```

## 13.2 Knowledge package

Мінімальний `package.md`:

```markdown
# Пакет знань: Назва

Status: draft | active | deprecated
Version: ...

## Призначення
## Коли використовувати
## Коли не використовувати
## Ключові ідеї
## Ключові правила
## Рекомендоване читання
## Пов'язані типи задач
## Пов'язані пакети
```

`knowledge/package-index.md` містить однорядкові посилання, статус і коротке `When to Use`.

Агент читає knowledge index тільки коли задача може потребувати reusable knowledge або коли це прямо вказано в context.

## 13.3 Package регламенту PDADM MVP

Пакет регламенту є компактним reference і migration package поточної версії, а не operational startup document і не історичний архів усіх релізів.

Для MVP 0.5:

```text
knowledge/packages/pdadm-mvp-reglament/
  index.md
  package.md
  mvp_one_to_one_0.5.md
  migration-from-0.4-to-0.5.md
```

Він містить:

* повний точний текст поточної версії;
* metadata поточної версії;
* прямі migration guides тільки з реально підтримуваних source versions.

Він не містить:

* повних історичних регламентів попередніх версій;
* надлишкових migration chains із непідтримуваних версій;
* дублюючих operational `rules.md` або `workflows.md`.

`package.md` вказує, що пакет читається для methodology audit, повного пояснення правила або migration і не входить у default boot packet.

Мінімальний `package.md` для цього пакета:

```markdown
# Knowledge Package: PDADM MVP Reglament

Current Version: 0.5
Supported Migration Source: 0.4
Operational Rules: `../../../reglament/`
Full Reglament: `mvp_one_to_one_0.5.md`
Migration Guide: `migration-from-0.4-to-0.5.md`

## Призначення
## Коли читати
## Коли не читати
## Правила оновлення
```

Для наступної версії залишаються тільки direct migration guides із версій, які реально підтримуються як source. Якщо всі проекти вже оновлені, застарілі guides видаляються зі Starter Kit.

## 13.4 Knowledge updates

Якщо run створює reusable knowledge, агент готує відповідний `FIX-*`. До human approval knowledge package не змінюється.

---

# 14. Reports, audits і architecture health

## 14.1 Reports

`reports/research/**` містить detailed research/planning/design reports.

`reports/audits/**` містить довгоживучі audit findings, які мають цінність за межами одного run.

`reports/periodic/**` містить періодичні огляди.

Кожен report оновлює відповідний `index.md`.

Мінімальний audit report містить:

```markdown
# Звіт аудиту: Назва

Status: draft | completed | superseded
Related Task: ...
Related Run: ...
Created: YYYY-MM-DD

## Мета
## Обсяг
## Вхідні матеріали
## Findings
## Ризики
## Рекомендація
## Follow-up proposals
```

## 14.2 Architecture pressure

Агент перевіряє architecture pressure для implementation, design і research діяльності.

Сигнали:

* кожна зміна потребує все більше обхідних правок;
* нова поведінка дублює наявну логіку;
* важко додати або оновити тести;
* доменні поняття не відповідають коду;
* `technical/architecture.md` або ADR не відповідають фактичній системі;
* нові вимоги погано вкладаються в межі модулів;
* зростає coupling або blast radius;
* з'являються незаплановані спрощення й workaround-и.

Агент не замовчує такі сигнали. У `result.md` він фіксує:

* де виникло тертя;
* який ризик воно створює;
* чи потрібен refactor, design, audit або ADR;
* чи є це blocker, accepted risk або follow-up proposal.

Для суттєвого тиску рекомендований шлях:

1. architecture audit;
2. design research;
3. ADR або proposal;
4. refactor у межах погодженого task contract;
5. incremental implementation;
6. verification і human review.

Великий rewrite не є автоматично правильним рішенням.

---

# 15. Language gate

Канонічний авторський текст Project Memory пишеться українською.

Дозволені винятки:

* назви файлів, папок, API, команд, бібліотек і технічних ідентифікаторів;
* status values, schema keys і protocol keys;
* сталі зовнішні терміни, якщо переклад погіршує точність;
* прямі цитати;
* source/reference materials мовою джерела.

Неукраїнський source/reference material має бути явно позначений і супроводжуватися українським описом або інструкцією використання.

Self-review для змін Project Memory перевіряє:

* авторський текст українською;
* усі неукраїнські фрагменти є дозволеними винятками;
* source/reference має український контекст;
* у canonical memory немає випадкових іншомовних розділів.

Якщо агент не впевнений, він перекладає авторський текст, ставить питання або фіксує blocker; він не залишає проблему мовчки.

---

# 16. Project Bootstrap Guidance

Якщо проект починається з сирої ідеї або майже порожнього контексту, агент не стрибає одразу до реалізації. Він допомагає пройти достатню частину такого порядку:

1. Product framing:
   * продукт;
   * користувачі;
   * проблема;
   * цінність;
   * принципи.
2. Scope framing:
   * перша версія;
   * out of scope;
   * обмеження.
3. Domain framing:
   * ролі;
   * сутності;
   * workflows;
   * current і target state.
4. Technical framing:
   * архітектурні припущення;
   * інтеграції;
   * обмеження;
   * ризики.
5. MVP slicing:
   * мінімальний корисний результат;
   * перший vertical slice;
   * критерії успіху.
6. Roadmap:
   * фази;
   * залежності;
   * decision gates.
7. Task backlog:
   * атомарно підготовлені задачі;
   * описові task types;
   * acceptance criteria.

Planning і design виконуються як діяльність усередині звичайного task run та, якщо формальні, створюють `RSCH-*` і detailed report.

---

# 17. Memory migration guidance

Migration Project Memory є окремою задачею з task run, `context.md`, `result.md`, verification і human review.

Migration не є простою розпаковкою Starter Kit поверх проекту.

Перед міграцією агент:

* визначає source і target version;
* читає direct migration guide;
* інвентаризує project-specific content;
* готує backup або rollback path;
* фіксує scope, exclusions і acceptance criteria;
* не переписує зміст виконаних історичних задач без окремої причини.

Migration повинна зберігати project-specific знання й явно розв'язувати конфлікти між новою структурою та наявним змістом.

Детальний direct migration guide є окремим migration artifact і не замінюється посиланням на попередній регламент.

---

# 18. Мінімальні правила агентів

1. На старті читати `agent-start.md`, `reglament/agents.md` і `reglament/memory-rules.md`.
2. Читати `project/*.md` за маршрутами `agent-start.md`.
3. Перед активним виконанням run визначити Agent Role.
4. Не змінювати project artifacts поза task boundary.
5. Не створювати валідну задачу без повного атомарного preparation package.
6. За прямою інструкцією виконати backlog-задачу активувати її без додаткового approval loop.
7. Не використовувати `Execution Mode` або окремі workflow за видом діяльності.
8. Не виконувати run без `context.md`.
9. Створювати `result.md` під час активації run.
10. Не змінювати заморожений `context.md`.
11. Не переписувати старий run для нової спроби.
12. Для формального research створювати `RSCH-*` і detailed report.
13. Для змістових змін canonical Project Memory готувати `FIX-*`.
14. Не застосовувати `FIX-*` до human approval.
15. Перед human review виконувати self-review або незалежний subagent review.
16. До human review виправляти findings; після human review не змінювати заморожений reviewed content.
17. Не переводити задачу в `done` без task-level human approval.
18. Не залишати погоджений required `FIX-*` незастосованим у done-задачі.
19. Не створювати follow-up task лише через зміну сесії або заповнення context window.
20. Виносити out-of-scope follow-up proposals у Review Request і створювати їх після approval.
21. Оновлювати всі пов'язані `index.md` при зміні структури.
22. Перевіряти memory impact, language gate і architecture pressure.
23. Не читати повний регламент або всі knowledge packages без причини.
24. Не змішувати current і target state.
25. Не переписувати великі memory documents без явної потреби й task scope.

---

# 19. Заборонені дії

Агенту заборонено:

* створювати task folder без підготовленого current run;
* просити дозвіл створити задачу, якщо користувач уже прямо наказав її створити;
* самостійно створювати out-of-scope follow-up tasks без підтвердження;
* редагувати старий run як нову спробу;
* змінювати reviewed proposal після human review;
* застосовувати непогоджені memory changes;
* вважати проміжне погодження task-level approval;
* закривати задачу з невиконаним required fixation;
* використовувати `blocked` для будь-якого простого питання;
* створювати нову задачу тільки через технічну межу сесії;
* масово читати або переписувати пам'ять без task-specific причини;
* замовчувати відомі ризики, компроміси або architecture pressure;
* додавати локальні rules у `index.md`;
* порушувати canonical language gate.

---

# 20. Рекомендований періодичний review

Раз на тиждень або після великої задачі бажано перевірити:

* актуальність `state.md`;
* backlog, blocked і review tasks;
* завислі follow-up proposals;
* наявність погоджених, але не застосованих fixations;
* актуальність Product, Domain і Technical Memory;
* knowledge packages;
* architecture pressure;
* цілісність indexes;
* language gate.

Результат за потреби фіксується в:

```text
reports/periodic/YYYY-MM-DD-review.md
```

---

# 21. Критерії успішності MVP

MVP 0.5 працює успішно, якщо:

1. агент природно працює в сесії без session workflow bureaucracy;
2. кожна нова задача одразу атомарно підготовлена;
3. пряма команда виконати задачу запускає її без зайвого approval loop;
4. кожна виконувана задача має current run і `result.md`;
5. попередні run не переписуються;
6. research, implementation і memory fixation природно поєднуються в одній задачі;
7. `task.md` дає зрозумілий операційний стан без читання всіх артефактів;
8. `context.md` достатній як єдиний стартовий контракт run;
9. `result.md` показує основні показники на початку;
10. formal research має `RSCH-*` і detailed report без дублювання self-review;
11. canonical memory changes проходять через `FIX-*` і human approval;
12. done-задачі не містять погоджених незастосованих fixations;
13. follow-up tasks не плодяться через session boundaries;
14. startup layer компактний і відділений від project-specific rules;
15. knowledge package регламенту містить лише актуальний reference і підтримувану migration інформацію;
16. human review зберігає контроль людини без подвійного approval loop;
17. language gate, architecture pressure і index integrity реально перевіряються.

---

# 22. Що відкладено

Поза поточною реалізацією регламенту MVP 0.5 залишаються:

* фізичне оновлення editable Starter Kit у `memory/`;
* створення прямого migration guide до MVP 0.5;
* упаковка й замороження release ZIP;
* автоматичний генератор або валідатор indexes;
* автоматичний task ID allocator;
* повна multi-agent orchestration model;
* enterprise governance і розширена матриця відповідальності.

Ці пункти не змінюють чинні правила цього документа.

---

# 23. Коротке резюме MVP 0.5

PDADM MVP 0.5 використовує одну універсальну модель:

* задача атомарно створюється разом із prepared `RUN-001/context.md`;
* пряма інструкція виконати задачу автоматично активує current run;
* `result.md` створюється при активації;
* implementation, research, planning, design і fixation preparation є діяльностями всередині run;
* формальні дослідження створюють `RSCH-*` та detailed reports;
* canonical memory changes готуються в `FIX-*` і застосовуються після human approval;
* `task.md` є dashboard, task contract, artifact registry і task-level review record;
* review artifacts заморожуються перед human review;
* required fixations застосовуються під час `finalizing` до переходу в `done`;
* новий run створюється для нової спроби, а не через нову сесію;
* follow-up tasks поза scope створюються після підтвердження користувача;
* operational rules живуть у `reglament/`, project-specific adaptations — у `project/`;
* повний регламент у knowledge package є reference, а не startup document;
* індекси, language gate, self-review, architecture pressure і human control залишаються обов'язковими.

Ключова ідея: регламент підлаштовується під природну роботу сесії, але жорстко зберігає межі задачі, історію run, контрольованість пам'яті та відповідальність за прийняття результату.
