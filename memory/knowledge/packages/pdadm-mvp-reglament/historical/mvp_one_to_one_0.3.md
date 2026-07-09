# Product Driven AI Development Methodology

## MVP 0.3 для однієї людини та агентської системи

Статус: Draft
Версія: MVP 0.3
Мова: Українська
Профіль застосування: Solo / 1.5 Human + AI Agent System
Призначення: Практична обкатка product-driven AI-assisted розробки з Project Memory, задачами в пам’яті, knowledge packages, мінімальною звітністю та контрольованою роботою агентів.

---

# 1. Призначення MVP

MVP-версія методології призначена для практичної перевірки роботи Product Driven AI Development у мінімальному складі:

* одна людина;
* одна або кілька AI-агентських систем;
* Project Memory як центральне місце взаємодії;
* задачі як частина Project Memory;
* knowledge packages як переносимий шар знань;
* мінімальний, але достатній регламент виконання задач;
* мінімальна кількість звітів;
* обов’язковий memory sync після виконання задач.

MVP не намагається реалізувати повну організаційну модель. Його задача — перевірити, чи допомагає така структура швидше, стабільніше і якісніше розробляти продукт за допомогою AI-агентів.

---

# 2. Основна ідея MVP

У MVP використовується така формула:

```text
Project Memory
  + Task Contract
  + Context Package
  + Task Runs
  + Result Report
  + Research Report
  + Knowledge Packages
  + Wiki Indexes
  = керована агентська розробка без ритуального спалення часу
```

Ключові принципи:

1. Project Memory є центральним джерелом істини.
2. Задачі живуть у Project Memory.
3. Агент не працює без явно вказаної ролі.
4. Людина бажано вказує свою рольову позицію на початку сесії.
5. Кожна задача має явно вказаний `Execution Mode`.
6. Задачі `autonomous-implementation` можуть мати кілька незалежних прогонів.
7. Один автономний прогон має власні уточнені вимоги, context package і result report.
8. Задачі `autonomous-research` мають власний дослідницький звіт і, за потреби, proposal на фіксацію знань у Project Memory.
9. Задачі `interactive-memory-update` фіксують зміни через `worklog.md` і `fixations/FIX-*.md`.
10. Knowledge packages мають сильний контур перевикористання.
11. Кожна папка Project Memory має `index.md`.
12. Кожна зміна структури пам’яті повинна оновлювати відповідні `index.md`.
13. Звітність мінімізована: `result.md` для autonomous implementation run, `research/RSCH-*.md` для autonomous research або `FIX-*.md` для контрольованої фіксації пам’яті замість набору окремих звітів.
14. Агент не закриває задачі самостійно: після self-review він переводить задачу в `review`, а `done` можливий тільки після явного task-level human review approval.

---

# 3. Межі MVP

## 3.1 У MVP є

* Project Memory;
* структура папок пам’яті;
* wiki indexes;
* задачі в пам’яті;
* task runs;
* context packages;
* мінімальний result report;
* research reports;
* knowledge packages;
* knowledge index;
* agent roles;
* session role declaration;
* memory sync;
* inbox;
* state file;
* templates.

## 3.2 У MVP немає

* повної матриці відповідальності;
* складного approval flow;
* чотирьох окремих контурів ревю;
* окремого release audit;
* складних правил merge для знань;
* формального governance process;
* жорсткої структури knowledge package;
* обов’язкових окремих execution / audit / operator / closure reports;
* інтеграції з зовнішніми task trackers як обов’язкової частини процесу.

---

# 4. Мінімальні ролі людини

Одна людина може виконувати всі ролі. Але при роботі бажано явно вказувати, з якої ролі вона діє.

## 4.1 Product Owner Hat

Використовується, коли людина визначає:

* навіщо потрібна зміна;
* яку продуктову цінність вона створює;
* які пріоритети важливіші;
* чи результат прийнятний з точки зору продукту.

## 4.2 Product Lead Hat

Використовується, коли людина:

* формує задачу;
* задає scope;
* приймає або відхиляє результат;
* вирішує, чи потрібен новий прогон;
* закриває задачу.

## 4.3 System Engineer Hat

Використовується, коли людина:

* перевіряє архітектурні наслідки;
* контролює технічну ентропію;
* приймає технічні рішення;
* оновлює ADR або technical memory.

## 4.4 Knowledge Engineer Hat

Використовується, коли людина:

* створює або оновлює knowledge packages;
* витягує повторно корисні знання із задач;
* оформлює good examples і anti-examples;
* підтримує knowledge index.

## 4.5 Agent Operator Hat

Використовується, коли людина:

* запускає агентську сесію;
* задає роль агента;
* передає агенту задачу;
* контролює виконання;
* читає result report;
* вирішує, чи запускати наступний прогон.

---

# 5. Мінімальні ролі агентів

На початку кожної агентської сесії роль агента повинна бути явно вказана.

Одна й та сама агентська система може виконувати різні ролі в різних сесіях, але не повинна змішувати їх без явної інструкції.

## 5.1 Agent Assistant

Роль для чат-режиму роботи з людиною.

Використовується для:

* обговорення ідей;
* підготовки правок до Project Memory;
* аналізу ризиків;
* пошуку суперечностей;
* уточнення вимог;
* підготовки чернеток задач;
* ведення задач `interactive-memory-update`;
* підготовки `worklog.md` і `fixations/FIX-*.md`;
* підготовки knowledge updates;
* аналізу структури пам’яті;
* допомоги з прийняттям рішень.

Agent Assistant може пропонувати зміни, але не повинен самостійно видавати обговорену ідею за прийняте рішення.

У задачі з `Execution Mode: interactive-memory-update` Agent Assistant може вносити зміни в Project Memory тільки після створення fixation package, self-review і явного запиту або підтвердження користувача на фіксацію.

Типовий старт роботи:

```text
Human Role: Product Lead Hat / Knowledge Engineer Hat / System Engineer Hat
Agent Role: Agent Assistant
Task / Topic: discussion, memory analysis або task preparation
```

## 5.2 Agent Executor

Роль для виконання задачі.

Використовується для:

* зміни коду;
* зміни дозволених частин пам’яті;
* виконання task run;
* виконання автономного дослідження;
* запуску тестів;
* підготовки `result.md`;
* підготовки `research/RSCH-*.md`.

Agent Executor працює тільки в межах task contract і run-specific context.

Після виконання своєї частини роботи Agent Executor не закриває задачу як `done`. Він готує результат, виконує self-review, переводить задачу в `review` і передає результат на human review.

## 5.3 Agent Reviewer

Роль для перевірки результату.

У MVP не створює окремий великий audit report, якщо це не потрібно. Результат ревю може бути секцією в `result.md` або окремою нотаткою в run folder для великих задач.

Agent Reviewer може підготувати review findings, але не замінює human approval. Навіть після агентського review задача переходить у `done` тільки після явного підтвердження людини.

Перевіряє:

* відповідність scope;
* out-of-scope зміни;
* acceptance criteria;
* ризики;
* потребу в memory sync;
* якість виконання.

## 5.4 Agent Knowledge Maintainer

Роль для роботи з knowledge packages.

Використовується для:

* створення чернеток knowledge package;
* додавання прикладів;
* додавання anti-examples;
* оновлення `knowledge/package-index.md`;
* пошуку знань, які варто перевикористати;
* адаптації знань під проект.

Не повинен без явної інструкції:

* масово переписувати package principles;
* змінювати сенс core rules;
* видаляти приклади;
* змінювати статус пакета;
* перебудовувати всю knowledge structure.

---

# 6. Правило запуску сесії

Кожна робоча сесія з агентом повинна починатися з явного визначення ролі агента, точки входу і очікуваного результату.

## 6.1 Обов’язкове для агента

Людина повинна вказати:

```text
Agent Role: ...
Task / Topic / Memory Area: ...
Expected Output: ...
```

`Mode` не є обов’язковим параметром запуску сесії.

Режим виконання задачі фіксується на рівні задачі як `Execution Mode` у `task.md`. Якщо сесія запускається для вже створеної задачі, агент повинен прочитати `task.md` і визначити workflow за `Execution Mode`, а не очікувати окремий session mode від людини.

## 6.2 Бажане для людини

Людина бажано вказує свою роль:

```text
Human Role: Product Lead Hat
```

або:

```text
Human Role: Knowledge Engineer Hat
```

## 6.3 Визначення роботи під час сесії

Агент самостійно визначає поточний робочий стан сесії за:

* роллю агента;
* наміром користувача;
* наявною задачею, якщо вона вказана;
* `Execution Mode` у `task.md`, якщо задача вже існує;
* правилами workflow у цьому регламенті.

Поточний робочий стан сесії може бути, наприклад: уточнення, обговорення, підготовка задачі, виконання автономного прогону, ревю, інтерактивна фіксація або memory sync.

Цей робочий стан не є заміною `Execution Mode`.

У межах однієї сесії агент може послідовно працювати з кількома задачами. Перед переходом до іншої задачі він повинен заново визначити task context, `Execution Mode` і потрібний workflow.

Одна задача може виконуватися в кількох сесіях. Нова сесія не створює новий `Execution Mode`, а відновлює його з `task.md` і поточного run/fixation context.

Якщо під час роботи стає зрозуміло, що задачі потрібен інший `Execution Mode`, агент повинен запропонувати зміну, пояснити причину і зафіксувати її в `task.md` та `tasks/plan/progress.md`.

Якщо змінюється тільки поточний робочий стан сесії, наприклад від обговорення до підготовки задачі або від виконання до review, змінювати `Execution Mode` не потрібно.

## 6.4 Приклад запуску сесії виконання

```text
Human Role: Agent Operator Hat / Product Lead Hat
Agent Role: Agent Executor
Task: project-memory/tasks/plan/TASK-06.26-0004-auth-flow/
Run: RUN-002
Expected Output:
- виконати задачу в межах RUN-002
- оновити runs/RUN-002/result.md
- запропонувати memory sync, якщо потрібно
```

## 6.5 Приклад запуску чат-сесії

```text
Human Role: Product Lead Hat
Agent Role: Agent Assistant
Topic: уточнення вимог до системи авторизації
Expected Output:
- знайти суперечності
- запропонувати уточнення
- підготувати чернетку task.md або run requirements
```

## 6.6 Якщо роль не вказана

Якщо роль агента не вказана, агент повинен попросити або самостійно припустити найбезпечнішу роль:

```text
Agent Role: Agent Assistant
Task / Topic: clarification
```

Агент не повинен починати зміну коду або canonical memory без явної ролі, зрозумілої точки входу і task context.

## 6.7 Startup protocol агента

На старті сесії агент не повинен самостійно досліджувати всю Project Memory або повний текст регламенту методології.

Першою точкою входу є:

```text
agent-start.md
```

`agent-start.md` задає короткий операційний boot packet: які файли прочитати, як знайти task-level `Execution Mode`, як визначити поточний робочий стан, де шукати уточнення і де зупинити стартове дослідження пам’яті.

Після прочитання boot packet агент повинен перейти до задачі, а не продовжувати огляд пам’яті “про всяк випадок”.

### 6.7.1 Default boot packet

За замовчуванням агент читає:

```text
agent-start.md
README.md
state.md
memory-rules.md
agents/rules.md
```

Цього має бути достатньо, щоб зрозуміти:

* як працює Project Memory;
* які правила роботи з пам’яттю обов’язкові;
* які правила роботи агентів діють у проекті;
* який поточний стан проекту;
* де шукати додаткові уточнення за потреби.

### 6.7.2 Startup profiles

Для обговорення або підготовки задачі без створеного task folder:

```text
agent-start.md
README.md
state.md
memory-rules.md
agents/rules.md
```

Для задачі з `Execution Mode: autonomous-implementation`:

```text
agent-start.md
README.md
state.md
memory-rules.md
agents/rules.md
tasks/plan/progress.md
task.md
runs/RUN-*/requirements.md
runs/RUN-*/context.md
```

Для задачі з `Execution Mode: autonomous-research`:

```text
agent-start.md
README.md
state.md
memory-rules.md
agents/rules.md
tasks/plan/progress.md
task.md
research/RSCH-*.md
fixations/FIX-*.md, якщо research пропонує фіксацію в Project Memory
knowledge/package-index.md
relevant memory files
```

Для задачі з `Execution Mode: interactive-memory-update`:

```text
agent-start.md
README.md
state.md
memory-rules.md
agents/rules.md
tasks/plan/progress.md
task.md
worklog.md
relevant target memory files
```

Для задачі з `Type: memory-migration`:

```text
agent-start.md
README.md
state.md
memory-rules.md
agents/rules.md
tasks/plan/progress.md
task.md
runs/RUN-*/requirements.md
runs/RUN-*/context.md
knowledge/package-index.md
knowledge/packages/pdadm-mvp-reglament/
target regulation / Starter Kit / migration guide
```

`knowledge/package-index.md` читається на старті тільки якщо задача може потребувати reusable knowledge або якщо це прямо вказано в task/run/fixation context.

### 6.7.3 Stop rule

Агент повинен зупинити startup reading після boot packet.

Додаткові документи читаються тільки якщо:

* task/run/fixation context прямо цього вимагає;
* `agent-start.md`, `memory-rules.md`, `agents/rules.md` або `index.md` явно вказують на потрібний файл;
* `knowledge/package-index.md` показує релевантний knowledge package;
* є конфлікт правил або нечіткість регламенту;
* без уточнення є ризик пошкодити Project Memory або зробити неправильну зміну;
* користувач явно просить дослідити глибше.

### 6.7.4 Повний регламент не є startup layer

`pdadm-mvp-reglament` і повний текст регламенту методології є reference layer.

Агент не читає їх на старті звичайної сесії.

Читання повного регламенту доречне, якщо:

* задача має тип `memory-migration`;
* задача змінює сам регламент;
* задача оновлює `pdadm-mvp-reglament`;
* є конфлікт або неясність правил;
* треба створити або оновити workflow, шаблони чи migration guide;
* користувач прямо просить читати регламент.

---

# 7. Рекомендована структура Project Memory MVP

```text
project-memory/
  index.md
  agent-start.md
  README.md
  state.md
  inbox.md
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
      ADR-0001-example.md

  tasks/
    index.md
    README.md
    plan/
      index.md
      progress.md
      TASK-06.26-0001-example/
        index.md
        task.md
        runs/
          index.md
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

  agents/
    index.md
    rules.md
    workflows.md
    prompts.md

  templates/
    index.md
    agent-start.md
    task.md
    run-requirements.md
    context.md
    result.md
    worklog.md
    fixation.md
    adr.md
    knowledge-package.md
    knowledge-example.md
    knowledge-anti-example.md

  reports/
    index.md
    periodic/
      index.md
```

---

# 8. Wiki indexes

## 8.1 Загальне правило

У кожній папці Project Memory повинен бути файл:

```text
index.md
```

`index.md` описує тільки прямі дочірні файли і папки поточного рівня.

Він не повинен дублювати повний зміст усієї вкладеної структури, бо тоді індекс перетвориться на ще одну істоту, яку треба годувати руками.

Кожен запис в `index.md` повинен містити wiki-посилання на відповідний файл або дочірню папку.

Для файлів посилання веде безпосередньо на файл:

```markdown
[Назва файлу](file.md)
```

Для дочірніх папок посилання веде на `index.md` цієї дочірньої папки:

```markdown
[Назва папки](subfolder/index.md)
```

Посилання тільки на назву папки без її `index.md` не використовується як стандартний формат.

## 8.2 Формат `index.md`

Рекомендований формат:

```markdown
# Index: Назва папки

## Purpose

Коротко: для чого ця папка.

## Folders

- [Назва дочірньої папки](subfolder/index.md)
  - Type: folder
  - Purpose: коротко, для чого ця папка.

## Files

- [Назва файлу](file.md)
  - Type: file
  - Purpose: коротко, що містить файл.
```

Таблиці в `index.md` не використовуються як стандартний формат. Списки простіше підтримувати вручну, легше доповнювати й менше ризикують ламатися під час агентських правок.

`index.md` не повинен мати секцію `Notes`, `Rules`, `Agent Notes` або локальні правила поведінки агентів чи людей.

Якщо для папки потрібні правила, вони мають бути винесені в спеціально відведене місце:

* `memory-rules.md` — правила роботи з Project Memory;
* `agents/rules.md` — правила роботи агентів;
* `technical/rules.md` — технічні правила;
* `domain/rules.md` — доменні правила;
* `knowledge/packages/...` — рекомендовані або ситуативні правила в межах knowledge package.

Індексний файл може коротко описувати призначення папки й давати навігацію, але не повинен ставати прихованим джерелом правил.

## 8.3 Правило оновлення індексів

Людина або агент, який:

* створює файл;
* видаляє файл;
* перейменовує файл;
* створює папку;
* видаляє папку;
* змінює призначення файлу або папки;

повинен оновити відповідний `index.md` у батьківській папці.

Якщо зміна зачіпає кілька рівнів структури, потрібно оновити всі релевантні `index.md`.

## 8.4 Автоматизація індексів

У майбутньому підтримка `index.md` може бути автоматизована на рівні утиліти пам’яті.

До появи такої автоматизації агенти, які працюють із Project Memory, повинні самостійно підтримувати індекси актуальними.

---

# 9. Головні файли верхнього рівня

## 9.1 `agent-start.md`

Перша точка входу агента в Project Memory.

Описує:

* короткий startup protocol;
* default boot packet;
* startup profiles для різних сценаріїв входу;
* stop rule для стартового читання;
* де шукати додаткові правила;
* коли читати `knowledge/package-index.md`;
* коли читати `pdadm-mvp-reglament` або повний регламент методології.

`agent-start.md` не повинен дублювати весь регламент. Його задача — дати агенту короткий операційний маршрут входу в пам’ять і зупинити зайве стартове дослідження.

У `agent-start.md` обов’язково фіксується версія PDADM MVP регламенту, за якою працює Project Memory.

Мінімальна структура:

```markdown
# Agent Start

PDADM MVP Version: 0.3

## Purpose

Коротко: як агент має входити в Project Memory.

## Default Boot Packet

- `README.md`
- `state.md`
- `memory-rules.md`
- `agents/rules.md`

## Startup Profiles

- discussion
- autonomous-implementation
- autonomous-research
- interactive-memory-update
- memory-migration

## Stop Rule

Коли агент має зупинити стартове читання і перейти до задачі.

## When to Read More

Умови для глибшого дослідження пам’яті або регламенту.
```

## 9.2 `README.md`

Описує:

* що таке Project Memory;
* як нею користуватися;
* базову структуру;
* основні правила навігації;
* посилання на `agent-start.md`, `memory-rules.md`, `state.md`, `tasks/`, `knowledge/`.

## 9.3 `state.md`

Короткий актуальний стан проекту.

Містить:

* поточний фокус;
* активні задачі;
* важливі останні рішення;
* поточні ризики;
* найближчі наступні кроки;
* важливі відкриті питання.

`state.md` повинен бути коротким. Це стартова панель, а не роман про страждання архітектури.

## 9.4 `inbox.md`

Місце для швидкого збору сирих думок.

Може містити:

* ідеї;
* проблеми;
* нотатки з чатів;
* спостереження агентів;
* майбутні задачі;
* фрагменти знань;
* невпорядковані питання.

Правило:

* `inbox.md` можна поповнювати швидко;
* його треба періодично розбирати;
* важливі елементи переносяться в задачі, domain memory, technical memory або knowledge packages.

## 9.5 `memory-rules.md`

Головний файл правил роботи з Project Memory.

Містить:

* правила створення задач;
* правила запуску агентських сесій;
* startup protocol і stop rule для стартового читання;
* правила оновлення `index.md`;
* правила роботи з task runs;
* правила memory sync;
* правила роботи з knowledge packages;
* заборонені дії агентів.

---

# 10. Product Memory

```text
product/
  index.md
  vision.md
  requirements.md
  roadmap.md
```

## 10.1 `vision.md`

Описує:

* що це за продукт;
* для кого він;
* яку проблему вирішує;
* ключову цінність;
* продуктові принципи.

## 10.2 `requirements.md`

Містить продуктові вимоги.

Рекомендовано давати вимогам ID:

```text
REQ-AUTH-001
REQ-EDITOR-002
REQ-BILLING-003
```

## 10.3 `roadmap.md`

Містить:

* найближчі продуктові напрями;
* заплановані етапи;
* високорівневі пріоритети;
* важливі обмеження.

---

# 11. Domain Memory

```text
domain/
  index.md
  glossary.md
  current/
    index.md
  target/
    index.md
  rules.md
  open-questions.md
```

## 11.1 `glossary.md`

Словник доменних понять.

## 11.2 `current/`

Містить документи, які описують поточний реалізований або прийнятий стан домену.

```text
domain/current/
  index.md
  ...
```

`current/` не є одним великим документом. Предметна область може бути розбита на окремі файли за bounded contexts, use cases, roles, capabilities, workflows, entities або іншою логікою, яка підходить конкретному проекту.

Як саме розбивати доменну пам’ять на документи, вирішує людина разом з Agent Assistant. Регламент не нав’язує універсальну схему декомпозиції.

`current/` не місце для планів, фантазій і “було б добре”. Для цього є `target/`, бо інакше агент прочитає бажання як факт і піде реалізовувати альтернативну реальність.

## 11.3 `target/`

Містить документи, які описують запланований доменний стан.

```text
domain/target/
  index.md
  ...
```

Може містити:

* заплановані правила;
* майбутні сценарії;
* зміни поведінки;
* цільову модель після реалізації задач.

`target/` також може бути розбитий на окремі документи за логікою, яка підходить проекту. Бажано, щоб структура `target/` допомагала зіставляти майбутній стан із відповідними частинами `current/`, але повної симетрії між папками не вимагається.

Якщо документ у `target/` переходить у реалізований або прийнятий стан, відповідний зміст треба перенести або відобразити в `current/`, а в `target/` залишити тільки актуальні майбутні зміни.

## 11.4 `rules.md`

Містить доменні правила.

## 11.5 `open-questions.md`

Містить відкриті питання, які ще не вирішені.

---

# 12. Technical Memory

```text
technical/
  index.md
  architecture.md
  stack.md
  rules.md
  decisions/
    index.md
```

## 12.1 `architecture.md`

Описує поточну архітектуру проекту.

## 12.2 `stack.md`

Описує технологічний стек і причини вибору.

## 12.3 `rules.md`

Містить технічні правила:

* стиль коду;
* структура модулів;
* тестування;
* залежності;
* правила роботи з доменом;
* правила роботи з інфраструктурою;
* заборонені патерни.

## 12.4 `decisions/`

Містить короткі ADR-like рішення.

Формат ADR для MVP:

```markdown
# ADR-0001: Назва рішення

Status: accepted
Date: YYYY-MM-DD

## Context

Чому виникло рішення.

## Decision

Що вирішено.

## Consequences

Що це означає.

## Alternatives

Що розглядалося, якщо важливо.
```

---

# 13. Task Memory

Задачі є частиною Project Memory і є основним джерелом істини для планування та виконання робіт.

```text
tasks/
  index.md
  README.md
  plan/
    index.md
    progress.md
    TASK-06.26-0001-short-name/
      index.md
      task.md
      runs/
        index.md
  archive/
    index.md
```

## 13.1 Статуси задач

У MVP використовуються такі статуси:

* `backlog`;
* `active`;
* `review`;
* `blocked`;
* `canceled`;
* `done`.

`archive` не є статусом виконання задачі. Це фізичне місце для задач, які вже не мають бути в операційному плані після завершення або скасування.

Фізично задача лежить у стабільному місці:

```text
tasks/plan/TASK-MM.YY-NNNN-short-name/
```

Зміна статусу не повинна переносити task folder між папками. Статус змінюється в `task.md` і в `tasks/plan/progress.md`.

`tasks/archive/` використовується тільки для задач, які вже не мають бути в операційному плані. Архівування є окремою дією після завершення або скасування задачі.

Статус також фіксується в `task.md`.

## 13.1.1 Правила переходів статусів

Агент не може самостійно закривати задачі як `done`.

Для агента завершення роботи над задачею означає:

1. виконати свою частину роботи;
2. виконати self-review;
3. зафіксувати результат, перевірки, ризики й рекомендації для людини;
4. перевести задачу в статус `review`;
5. запропонувати користувачеві ознайомитися з результатами self-review і прийняти рішення.

Статус `done` означає, що задача пройшла human review і явно прийнята людиною.

Задачу можна перевести в `done` тільки зі статусу `review` і тільки після явного підтвердження людини, що:

* результат перевірений;
* задача пройшла review;
* задачу можна закривати.

Мовчання користувача, відсутність заперечень або успішний self-review агента не є підтвердженням завершення задачі.

Заборонені переходи:

* `backlog -> done`;
* `active -> done`;
* `blocked -> done`;
* `canceled -> done`;
* будь-який перехід у `done` без попереднього статусу `review`;
* будь-який перехід у `done` без явного human approval.

Якщо робота над задачею припиняється без human review або без прийняття результату людиною, задача не може отримати статус `done`. У такому випадку вона переводиться в `canceled` із фіксацією причини.

Типова state machine:

```text
backlog -> active
active -> review
active -> blocked
active -> canceled
blocked -> active
blocked -> canceled
review -> active
review -> canceled
review -> done
done -> archive
canceled -> archive
```

Перехід `review -> active` використовується, якщо людина не прийняла результат і потрібен новий прогон, нова фіксація або доопрацювання.

Перехід `review -> canceled` використовується, якщо після review задачу вирішено не завершувати як прийняту роботу.

Після переходу статусу агент повинен оновити:

* `task.md`;
* `tasks/plan/progress.md`;
* `state.md`, якщо зміна важлива для поточного стану проекту.

## 13.1.2 Що вважається human review approval

Human review approval — це не будь-яке погодження людини в чаті.

Агент може вважати повідомлення користувача погодженням ревю задачі тільки якщо виконані всі умови:

1. задача вже має статус `review`;
2. агент явно повідомив, що задача готова до human review;
3. агент показав або вказав, де дивитися результат, self-review, перевірки, ризики й memory sync notes;
4. агент явно попросив одне з двох: погодження review для закриття задачі або інструкції для продовження роботи;
5. відповідь користувача явно стосується review всієї задачі, а не окремого варіанта, питання, фрагмента змісту або дозволу продовжити роботу.

Перед очікуванням human review approval агент повинен написати користувачу приблизно так:

```text
Задача готова до human review.

Я виконав self-review і зафіксував результат у:
- `...`

Будь ласка, перевір:
- результат;
- self-review;
- acceptance criteria або scope;
- ризики;
- memory sync notes.

Я очікую одне з рішень:
- approve review / прийняти результат і закрити задачу як done;
- request changes / продовжити роботу;
- reject / не приймати результат;
- cancel / скасувати задачу.
```

Погодженням human review можна вважати, наприклад:

* "review approved, close task as done";
* "результат перевірено, приймаю, закривай задачу";
* "ревю пройдено, можна переводити в done";
* "приймаю результат задачі, закривай";
* коротке "так" або "погоджую", якщо воно є прямою відповіддю на явний запит агента про task-level human review approval і в цьому запиті було прямо сказано, що позитивна відповідь означає закриття задачі як `done`.

Не можна вважати human review approval:

* погодження одного з варіантів відповіді;
* погодження формулювання, плану або проміжного рішення;
* дозвіл створити task folder, run або fixation package;
* дозвіл застосувати конкретну фіксацію;
* підтвердження, що агент правильно зрозумів одну вимогу;
* фрази "ок", "так", "погоджуюсь", "давай", якщо агент перед цим не поставив явний task-level review approval request;
* відсутність відповіді або відсутність заперечень.

Якщо відповідь користувача двозначна, агент не переводить задачу в `done`. Він уточнює:

```text
Уточни, будь ласка: це погодження review всієї задачі з дозволом закрити її як done, чи погодження тільки поточного варіанта / наступного кроку?
```

## 13.1.3 `tasks/plan/progress.md`

`progress.md` є головним операційним індексом задач.

Він містить:

* етапи або групи розробки;
* список усіх неархівних задач;
* wiki-посилання на `index.md` кожної task folder;
* поточний статус кожної задачі;
* `Type`;
* `Execution Mode`;
* короткий опис задачі;
* чекліст, у якому галочкою позначаються задачі зі статусом `done`.

Задачі зі статусом `canceled` не позначаються галочкою, бо вони не є прийнятим результатом роботи.

`progress.md` не повинен містити секцію `Notes` або локальні правила для агентів і людей. Якщо під час ведення задач з’являється правило, його треба перенести в `memory-rules.md`, `agents/rules.md`, профільний `rules.md` або відповідний knowledge package.

Формат:

```markdown
# Task Progress

## Етап або група

- [ ] [TASK-06.26-0001-auth-flow](TASK-06.26-0001-auth-flow/index.md)
  - Status: backlog
  - Type: feature
  - Execution Mode: autonomous-implementation
  - Summary: спроектувати flow авторизації.
  - Current: n/a

- [ ] [TASK-06.26-0002-auth-ui](TASK-06.26-0002-auth-ui/index.md)
  - Status: active
  - Type: feature
  - Execution Mode: autonomous-implementation
  - Summary: реалізувати UI авторизації.
  - Current: RUN-001

- [ ] [TASK-06.26-0003-auth-review](TASK-06.26-0003-auth-review/index.md)
  - Status: review
  - Type: feature
  - Execution Mode: autonomous-implementation
  - Summary: перевірити результат реалізації авторизації.
  - Current: RUN-001

- [ ] [TASK-06.26-0004-old-auth-spike](TASK-06.26-0004-old-auth-spike/index.md)
  - Status: canceled
  - Type: research
  - Execution Mode: autonomous-research
  - Summary: скасований spike, результат не прийнятий.
  - Current: RSCH-001

- [x] [TASK-06.26-0005-auth-docs](TASK-06.26-0005-auth-docs/index.md)
  - Status: done
  - Type: docs
  - Execution Mode: autonomous-implementation
  - Summary: оновити документацію авторизації.
  - Current: RUN-001
```

`progress.md` не замінює `task.md`. Він дає людині й агенту повну карту неархівних задач без агрегації інформації з різних папок.

Коли змінюється статус задачі, агент повинен оновити:

* `task.md`;
* `tasks/plan/progress.md`;
* `state.md`, якщо зміна важлива для поточного стану проекту.

## 13.2 Типи задач

Рекомендовані типи:

* `feature`;
* `bugfix`;
* `refactor`;
* `research`;
* `docs`;
* `knowledge`;
* `memory-update`;
* `memory-migration`;
* `chore`.

`research` використовується для задач, основний результат яких — дослідити питання, зібрати й проаналізувати інформацію, порівняти варіанти, сформувати рекомендацію або архітектурний/технічний висновок.

Якщо research-задача виконується автономно агентом, її типовий execution mode — `autonomous-research`, а не `autonomous-implementation`.

`memory-update` використовується для задач, основний результат яких — уточнення, фіксація або актуалізація Project Memory: бізнес-цінності, scope, product decisions, domain знання, technical knowledge, правила або інші змістовні записи пам’яті.

`knowledge` використовується для reusable knowledge packages. Якщо зміна стосується проектної пам’яті конкретного проекту, а не переносимого knowledge package, зазвичай краще використовувати `memory-update`.

`memory-migration` використовується для міграції вже розгорнутої Project Memory з однієї версії PDADM MVP регламенту на іншу.

Це окремий тип задачі, бо міграція версії регламенту не дорівнює розпаковці нового Starter Kit поверх існуючої пам’яті. У реальному проекті в `memory/` уже є накопичені product, domain, technical, task і knowledge записи. Їх треба зберегти, а структуру, правила, шаблони й індекси привести до нової версії регламенту.

Задача типу `memory-migration` повинна явно вказувати:

* поточну версію регламенту;
* цільову версію регламенту;
* джерело цільового регламенту або Starter Kit;
* які частини Project Memory можна змінювати;
* які накопичені дані не можна втрачати або переписувати;
* чи дозволено створювати резервну копію перед міграцією;
* критерії успішної міграції.

Під час такої задачі агент повинен:

1. прочитати поточні правила пам’яті проекту;
2. прочитати опис цільової версії регламенту;
3. порівняти структуру, правила, шаблони й індекси поточної пам’яті з цільовою версією;
4. підготувати план міграції перед змінами;
5. перенести тільки необхідні структурні й регламентні зміни;
6. зберегти накопичений зміст проектної пам’яті;
7. оновити відповідні `index.md`;
8. зафіксувати результат міграції в `result.md`.

Якщо агент бачить конфлікт між існуючим змістом пам’яті та новим регламентом, він не повинен мовчки вибирати одну сторону. Конфлікт треба зафіксувати в `result.md` або винести на уточнення людині.

## 13.2.1 Execution Mode

`Type` і `Execution Mode` є різними осями задачі.

`Type` відповідає на питання: що змінюється або досліджується.

`Execution Mode` відповідає на питання: як задача виконується.

`Execution Mode` є властивістю задачі, а не параметром запуску сесії.

Сесія може проходити через різні робочі стани: обговорення, уточнення, підготовку задачі, виконання, review або фіксацію результату. Агент визначає поточний робочий стан за роллю, task context, `Execution Mode` і наміром користувача.

Якщо в одній сесії виконуються кілька задач, агент повинен для кожної задачі окремо прочитати або визначити її `Execution Mode`. Якщо одна задача виконується в кількох сесіях, кожна нова сесія відновлює `Execution Mode` з `task.md`.

У MVP 0.3 використовуються такі execution modes:

* `autonomous-implementation`;
* `autonomous-research`;
* `interactive-memory-update`.

`autonomous-implementation` використовується для задач, де агент автономно виконує зміни в коді, документах, структурі проекту або інших артефактах за попередньо підготовленими вимогами й контекстом. Це режим, який включає повний автономний workflow: task contract, context package, task run, result report, review, memory sync.

`autonomous-research` використовується для задач типу `research`, де агент автономно збирає й аналізує інформацію, порівнює варіанти, формує дослідницький звіт і, якщо це потрібно, готує proposal на фіксацію отриманих знань у Project Memory. Це не режим імплементації: агент не повинен підміняти дослідження змінами в коді або пам’яті без окремого погодженого кроку.

`interactive-memory-update` використовується для задач, де основна робота відбувається в чаті між людиною й агентом-консультантом, а результатом є контрольована фіксація змісту в Project Memory. Для цього режиму не треба робити важкий `context.md` і `result.md` для кожного кроку обговорення. Замість цього агент веде структурований worklog і створює fixation package перед внесенням змін у пам’ять.

Якщо під час роботи стає зрозуміло, що задача потребує іншого execution mode, агент повинен явно запропонувати зміну режиму й зафіксувати її в `task.md` та `tasks/plan/progress.md`.

## 13.3 Структура задачі

Кожна задача має власну папку:

Для `autonomous-implementation`:

```text
tasks/plan/TASK-06.26-0001-short-name/
  index.md
  task.md
  runs/
    index.md
    RUN-001/
      index.md
      requirements.md
      context.md
      result.md
    RUN-002/
      index.md
      requirements.md
      context.md
      result.md
  closure.md
```

Для `autonomous-research`:

```text
tasks/plan/TASK-06.26-0002-short-name/
  index.md
  task.md
  research/
    index.md
    RSCH-001.md
    RSCH-002.md
  fixations/
    index.md
    FIX-001.md
  closure.md
```

`fixations/` для `autonomous-research` створюється тільки якщо research-задача пропонує фіксацію інформації в Project Memory.

Для `interactive-memory-update`:

```text
tasks/plan/TASK-06.26-0003-short-name/
  index.md
  task.md
  worklog.md
  fixations/
    index.md
    FIX-001.md
    FIX-002.md
  closure.md
```

Задача не повинна одночасно тягнути повну структуру обох режимів без потреби. Якщо задача почалась як інтерактивне оновлення пам’яті, але потім потребує автономної імплементації, краще або змінити `Execution Mode` з явним записом причини, або створити follow-up task.

## 13.4 `task.md`

`task.md` є головною карткою задачі.

Містить:

```markdown
# TASK-06.26-0001: Назва задачі

Status: active
Type: feature | bugfix | refactor | research | docs | knowledge | memory-update | memory-migration | chore
Execution Mode: autonomous-implementation | autonomous-research | interactive-memory-update
Created: YYYY-MM-DD
Owner Role: Product Lead Hat
Current Run: RUN-001 / n/a
Current Research: RSCH-001 / n/a
Current Fixation: FIX-001 / n/a

## Goal

Що треба зробити.

## Product Context

Навіщо це потрібно продукту.

## Scope

Що входить у задачу.

## Out of Scope

Що явно не робити.

## Acceptance Criteria

- [ ] Критерій 1
- [ ] Критерій 2

## Linked Memory

- `product/...`
- `domain/...`
- `technical/...`
- `knowledge/...`

## Runs

- [RUN-001](runs/RUN-001/index.md)
  - Status: active
  - Purpose: початковий прогон.
  - Result: pending

## Fixations

- [FIX-001](fixations/FIX-001.md)
  - Status: draft
  - Purpose: зафіксувати узгоджений зміст у пам’яті.
  - Result: pending

## Research

- [RSCH-001](research/RSCH-001.md)
  - Status: review-ready
  - Purpose: порівняти варіанти реалізації.
  - Result: pending human review

## Additional Context

Додатковий контекст задачі, якщо потрібен.

Ця секція не використовується для правил роботи агентів або людей.
```

## 13.5 Task Runs

Задача з `Execution Mode: autonomous-implementation` може виконуватися за кілька прогонів.

Новий прогон створюється, якщо:

* результат попереднього незадовільний;
* вимоги були уточнені;
* контекст змінився;
* агент пішов не туди, куди його послали, тобто зробив звичну агентську прогулянку в ліс;
* потрібно повторити виконання іншим агентом;
* потрібно виконати часткову переробку.

Кожен прогон має незалежні файли:

```text
RUN-002/
  index.md
  requirements.md
  context.md
  result.md
```

Це дозволяє зберегти історію спроб без переписування минулого.

## 13.6 `requirements.md` прогону

Описує уточнені вимоги саме для цього прогону.

Містить:

```markdown
# Run Requirements: RUN-001

Status: active
Agent Role: Agent Executor
Execution Mode: autonomous-implementation
Created: YYYY-MM-DD

## Goal for This Run

Що саме має зробити цей прогон.

## Clarified Requirements

Уточнені вимоги.

## Scope for This Run

Що входить у цей прогон.

## Out of Scope for This Run

Що не робити.

## Acceptance Criteria for This Run

- [ ] Критерій 1
- [ ] Критерій 2

## Changes from Previous Run

Для RUN-002 і далі: що змінилося порівняно з попереднім прогоном.
```

## 13.7 `context.md` прогону

Містить context package саме для цього прогону.

```markdown
# Context Package: RUN-001

## Required Reading

- `project-memory/state.md`
- `project-memory/memory-rules.md`
- `project-memory/agents/rules.md`
- ...

## Relevant Product Context

Коротко.

## Relevant Domain Context

Коротко.

## Relevant Technical Context

Коротко.

## Relevant Knowledge Packages

- `knowledge/packages/...`

## Files / Modules to Inspect

- `src/...`

## Known Risks

- ...

## Assumptions

- ...
```

## 13.8 `result.md` прогону

Єдиний обов’язковий звіт автономного прогону.

Замінює окремі execution report, agent self-review report і memory sync report для задач `autonomous-implementation`.

`result.md` не замінює `closure.md` і не є human approval на закриття задачі.

```markdown
# Result: RUN-001

Status: review-ready | failed | blocked
Prepared For Review: YYYY-MM-DD
Agent Role: Agent Executor
Task Status After Run: review | active | blocked

## Summary

Що зроблено.

## Changed Files

- `src/...`

## Verification

- [ ] Тести запущені
- [ ] Manual check виконано
- [ ] Acceptance criteria перевірені

## Acceptance Criteria Check

- [ ] Критерій 1
- [ ] Критерій 2

## Agent Self-Review

- [ ] Scope виконано
- [ ] Out-of-scope зміни відсутні або явно пояснені
- [ ] Acceptance criteria перевірені
- [ ] Ризики й обмеження зафіксовані
- [ ] Потреба в memory sync перевірена
- [ ] Вплив на документи загального рівня перевірений
- [ ] Рекомендації для human review сформульовані

## Human Review

Status: pending | approved | changes-requested | rejected
Reviewer Role: Product Lead Hat / Agent Operator Hat / інша відповідальна роль
Reviewed: YYYY-MM-DD або pending
Approval Scope: whole-task-review | run-only | changes-requested | rejected | n/a
Approval Source: явне повідомлення користувача / pending

Коротка оцінка людини.

Ця секція не заповнюється агентом як approval. Агент може підготувати питання або чекліст для людини, але не може самостійно підтвердити human review.

`Status: approved` дозволений тільки для task-level human review approval. Погодження окремого варіанта, плану, проміжного рішення або дозволу продовжити роботу не записується як `approved`.

## Memory Sync

- [ ] Product memory updated / not needed
- [ ] Domain memory updated / not needed
- [ ] Technical memory updated / not needed
- [ ] Knowledge updated / not needed
- [ ] Task memory updated / not needed
- [ ] Index files updated / not needed
- [ ] General-level memory documents checked / updated / not needed / proposed / blocked

## Memory Sync Notes

Що оновлено, що не потребує оновлення, що запропоновано окремо і чому.

## Knowledge Updates

- Updated: ...
- Proposed: ...
- Not needed: reason

## Follow-up Tasks

- ...
```

## 13.8.1 `research/RSCH-*.md`

`RSCH-*.md` є основним артефактом задачі з `Execution Mode: autonomous-research`.

Він не є implementation result report і не означає закриття задачі.

```markdown
# Research Report: RSCH-001

Status: draft | review-ready | changes-requested | rejected | accepted
Created: YYYY-MM-DD
Agent Role: Agent Executor / Agent Assistant / інша призначена роль
Task Status After Research: review | active | blocked

## Research Question

Що саме досліджується.

## Scope

Що входить у дослідження.

## Out of Scope

Що явно не досліджується.

## Sources / Inputs

- `memory/...`
- code paths або external docs, якщо вони дозволені task context
- user-provided context

## Findings

Ключові факти й спостереження.

## Options

### Option A

- Description:
- Pros:
- Cons:
- Risks:

### Option B

- Description:
- Pros:
- Cons:
- Risks:

## Recommendation

Рекомендований варіант або висновок.

## Rationale

Чому саме така рекомендація.

## Memory Fixation Proposal

Status: not-needed | proposed | approved | applied | rejected
Related Fixation: `fixations/FIX-001.md` або n/a
General-Level Memory Impact: not-needed | proposed | included-in-fixation | blocked

Що варто зафіксувати в Project Memory, якщо це потрібно.

Якщо потрібна зміна Project Memory, агент має створити або оновити відповідний `fixations/FIX-*.md` як proposal. Proposal має явно показувати, чи потрібне оновлення документів загального рівня. Застосовувати зміни в пам’ять до human review не можна.

## Agent Self-Review

- [ ] Research question відповідає task scope
- [ ] Джерела й припущення вказані
- [ ] Варіанти порівняні чесно
- [ ] Рекомендація випливає з аналізу
- [ ] Ризики й невизначеності зафіксовані
- [ ] Потреба в memory fixation перевірена
- [ ] Вплив research findings на документи загального рівня перевірений
- [ ] Якщо memory fixation потрібна, proposal підготовлений і не застосований без approval

## Human Review

Status: pending | approved | changes-requested | rejected
Reviewer Role: Product Lead Hat / System Engineer Hat / Knowledge Engineer Hat / інша відповідальна роль
Reviewed: YYYY-MM-DD або pending
Approval Scope: research-report-only | research-and-memory-fixation | changes-requested | rejected | n/a
Approval Source: явне повідомлення користувача / pending

`Status: approved` означає, що людина прийняла research result. Якщо є memory fixation proposal, окремо має бути зрозуміло, чи approval поширюється на застосування `FIX-*`.

## Follow-up

- ...
```

## 13.9 `worklog.md` для `interactive-memory-update`

`worklog.md` є стислим робочим журналом інтерактивної задачі.

Він не повинен бути повним transcript чату. У ньому фіксуються тільки структуровані проміжні результати:

* намір користувача;
* ключові уточнення;
* прийняті проміжні рішення;
* відкриті питання;
* запити на фіксацію;
* посилання на `FIX-*`.

```markdown
# Worklog: TASK-06.26-0002

Status: active
Execution Mode: interactive-memory-update

## Intent

Що користувач хоче зафіксувати або оновити в Project Memory.

## Discussion Notes

- YYYY-MM-DD: короткий структурований підсумок обговорення.

## Open Questions

- ...

## Fixations

- `fixations/FIX-001.md` — draft / applied / rejected
```

## 13.10 `fixations/FIX-*.md`

`FIX-*.md` є пакетом змін для контрольованої фіксації змісту в Project Memory.

Він створюється перед внесенням змін у цільові файли пам’яті.

`FIX-*` використовується в `interactive-memory-update` і може використовуватися в `autonomous-research`, якщо дослідження пропонує зафіксувати отримані знання в Project Memory.

```markdown
# Fixation: FIX-001

Status: draft | review-failed | applied | rejected
Created: YYYY-MM-DD
Agent Role: Agent Assistant
Task Status After Fixation: active | review
Related Research: `research/RSCH-001.md` або n/a

## Purpose

Що саме фіксується.

## Source Summary

Стислий підсумок обговорення або вхідного матеріалу.

## Target Memory Files

- `product/...`
- `domain/...`
- `technical/...`
- `knowledge/...`

## Proposed Changes

Структурований опис змін, які агент планує внести.

## Rationale

Чому ці зміни потрібні.

## General-Level Memory Impact

- `state.md`: updated / not needed / proposed / blocked — reason
- Product overview docs: updated / not needed / proposed / blocked — reason
- Domain overview docs: updated / not needed / proposed / blocked — reason
- Technical overview docs: updated / not needed / proposed / blocked — reason
- Knowledge indexes/packages: updated / not needed / proposed / blocked — reason
- Relevant `index.md`: updated / not needed / proposed / blocked — reason

## Self-Review

- [ ] Нема очевидних протиріч з існуючою Project Memory
- [ ] Нема втрати важливого контексту
- [ ] Scope змін відповідає задачі
- [ ] Цільові файли визначені коректно
- [ ] Вплив на документи загального рівня перевірений
- [ ] Потрібні оновлення документів загального рівня включені в proposal або явно винесені у follow-up/blocker
- [ ] Потрібні `index.md` визначені

## Review Findings

- ...

## Human Review

Status: pending | approved | changes-requested | rejected
Reviewer Role: Product Lead Hat / Knowledge Engineer Hat / інша відповідальна роль
Reviewed: YYYY-MM-DD або pending
Approval Scope: whole-task-review | fixation-only | changes-requested | rejected | n/a
Approval Source: явне повідомлення користувача / pending

Ця секція фіксує людську перевірку інтерактивної фіксації. Агент не може самостійно заповнити її як approved.

`Status: approved` у цій секції означає approval review всієї задачі тільки якщо користувач явно прийняв результат задачі й дозволив закрити її як `done`. Погодження конкретної фіксації або варіанта змісту саме по собі не є approval закриття задачі.

## Applied Changes

- `file.md` — що змінено.

## Memory Sync

- Product memory: updated / not needed
- Domain memory: updated / not needed
- Technical memory: updated / not needed
- Knowledge memory: updated / not needed
- Task memory: updated / not needed
- Wiki indexes: updated / not needed
- State file: updated / not needed
- General-level memory documents: updated / not needed / proposed / blocked

## Memory Sync Notes

Коротке пояснення.

## Follow-up

- ...
```

Якщо self-review не пройдено, агент не вносить зміни в основні файли Project Memory. Він фіксує проблеми в `Review Findings` і повертається до інтерактивного обговорення з користувачем.

## 13.11 `closure.md`

Створюється або оновлюється при закритті задачі.

```markdown
# Closure: TASK-06.26-0001

Status: done | canceled
Closed: YYYY-MM-DD
Closed By Role: Product Lead Hat / Agent Operator Hat / інша відповідальна роль
Closed From Task Status:
- for done: review
- for canceled: backlog | active | blocked | review

## Final Summary

Коротко: що в результаті зроблено.

## Final Run / Fixation

RUN-001 / RUN-002 / ... або RSCH-001 / RSCH-002 / ... або FIX-001 / FIX-002 / ...

## Accepted Result

Чому результат прийнятий.

Для `Status: done` ця секція обов’язково має містити посилання на явне human approval.

Для `Status: canceled` ця секція не використовується як прийняття результату. Замість цього треба заповнити секцію `Cancellation Reason`.

## Human Approval

- Review status before closure: review
- Approved by:
- Approval source: явне повідомлення користувача / інший зафіксований канал
- Approval scope: whole-task-review
- Approval summary:

## Cancellation Reason

Чому задачу скасовано, якщо вона не закривається як `done`.

## Remaining Risks

- ...

## Follow-up Tasks

- ...

## Memory Sync Final Check

- [ ] Task state updated
- [ ] Relevant memory updated
- [ ] Knowledge updates handled
- [ ] Index files updated
- [ ] General-level memory documents checked / updated / not needed / proposed / blocked
```

---

# 14. Knowledge Memory

Knowledge Memory призначена для накопичення і перевикористання знань між задачами та проектами.

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
      ...
  adaptations/
    index.md
```

## 14.1 Головний принцип

Knowledge package не має жорсткої структури файлів.

Обов’язковим є тільки:

```text
package.md
```

Решта файлів визначаються потребами пакета.

## 14.2 Рекомендовані файли knowledge package

```text
package.md
principles.md
examples.md
anti-examples.md
workflows.md
prompts.md
checklists.md
patterns.md
changelog.md
```

Це рекомендований набір, а не обов’язкова тюрма для думок. Бо знання іноді має форму принципів, іноді прикладів, а іноді просто “не роби так, бо буде боляче”.

## 14.3 `package.md`

Є вхідною точкою knowledge package.

Містить:

```markdown
# Knowledge Package: Назва

Status: active | draft | deprecated
Version: X.Y
Scope: architecture | frontend | backend | agents | domain | process | other
Reusable: true

## Purpose

Для чого цей пакет.

## When to Use

Коли агент або людина повинні його застосовувати.

## When Not to Use

Коли цей пакет не доречний.

## Core Ideas

Ключові ідеї.

## Core Rules

- ...

## Recommended Reading

- `principles.md`
- `examples.md`
- `anti-examples.md`

## Related Task Types

- feature
- refactor
- research
- knowledge

## Related Packages

- ...
```

## 14.4 `package-index.md`

Окремий індексний файл із коротким описом усіх knowledge packages.

Він працює подібно до індексу скілів: допомагає агенту швидко зрозуміти, які пакети знань доречно застосувати.

Формат:

```markdown
# Knowledge Package Index

## Packages

- [Domain-driven architecture](packages/domain-driven-architecture/index.md)
  - Status: active
  - Scope: architecture
  - When to Use: коли задача стосується доменної моделі, use cases, boundaries.

- [SolidJS UI](packages/solidjs-ui/index.md)
  - Status: active
  - Scope: frontend
  - When to Use: коли задача стосується SolidJS UI, компонентів, форм, стану.

- [AI agent development](packages/ai-agent-development/index.md)
  - Status: active
  - Scope: agents
  - When to Use: коли задача стосується agent workflows, prompts, memory rules.
```

`package-index.md` є індексним файлом, тому він також використовує список із wiki-посиланнями, а не таблицю.

Посилання на package веде на `index.md` відповідного package folder.

`package-index.md` не повинен містити приховані обов’язкові правила роботи агентів. Він може вказувати, коли пакет знань доречно читати, але самі правила мають бути або в package, або в централізованих rules-файлах Project Memory.

## 14.5 Правило читання knowledge index

Агенти в ролях:

* Agent Assistant;
* Agent Executor;
* Agent Reviewer;
* Agent Knowledge Maintainer;

повинні ознайомитися з:

```text
knowledge/package-index.md
```

якщо задача може потребувати спеціальних знань.

Agent Executor повинен перевірити `package-index.md` перед виконанням задачі, якщо в `context.md` явно не вказано, що релевантні knowledge packages уже підібрані.

## 14.6 Knowledge package регламенту PDADM MVP

Для проектів, які використовують PDADM MVP, рекомендовано мати окремий knowledge package:

```text
knowledge/packages/pdadm-mvp-reglament/
```

Його призначення — бути операційною, агент-орієнтованою точкою входу до поточної версії PDADM MVP регламенту всередині конкретного проекту.

Цей package не замінює заморожений регламент версії і не є окремим джерелом істини для методології. Він є адаптованим для агента робочим шаром знань: які правила застосовувати в цьому проекті, які workflow читати, які шаблони використовувати і як виконувати міграцію Project Memory на новішу версію.

Мінімально він має вказувати:

* яку версію PDADM MVP регламенту він описує;
* коли агент повинен його читати;
* які правила регламенту є критичними для виконання задач;
* які workflow і шаблони пов’язані з регламентом;
* як мігрувати Project Memory з іншої підтримуваної версії на цю версію;
* які перевірки підтверджують успішну міграцію.

Для міграцій версії регламенту цей package повинен містити чітку інструкцію для агента. Наприклад:

```text
knowledge/packages/pdadm-mvp-reglament/
  index.md
  package.md
  rules.md
  workflows.md
  migration.md
  changelog.md
```

Або, якщо підтримується кілька шляхів міграції:

```text
knowledge/packages/pdadm-mvp-reglament/
  migrations/
    index.md
    from-source-version-to-target-version.md
```

Перед міграцією Project Memory на нову версію треба спочатку зробити доступною для агента цільову версію `pdadm-mvp-reglament` з інструкцією міграції.

У строгому режимі це окрема підготовча задача типу `knowledge`. У спрощеному режимі це може бути перший прогон задачі `memory-migration`, якщо в `requirements.md` явно сказано, що спочатку оновлюється тільки package регламенту, без зміни решти Project Memory.

Після оновлення `pdadm-mvp-reglament` треба оновити `knowledge/package-index.md`, щоб агент міг знайти актуальний package перед виконанням міграційної задачі.

## 14.7 Правила оновлення knowledge packages у MVP

Агент може:

* створити draft нового package;
* додати приклад;
* додати anti-example;
* додати уточнення;
* запропонувати новий workflow;
* оновити `package-index.md`;
* додати changelog note.

Агент не повинен без явної інструкції:

* масово переписувати package;
* змінювати core rules;
* видаляти приклади;
* змінювати статус package;
* переносити package в deprecated;
* змінювати сенс пакета.

## 14.8 Knowledge update після задачі

Після кожного автономного implementation task run у `result.md` потрібно вказати:

```markdown
## Knowledge Updates

- Updated: ...
- Proposed: ...
- Not needed: reason
```

Для `autonomous-research` це фіксується у відповідному `research/RSCH-*.md`, а конкретні зміни Project Memory — у `fixations/FIX-*.md`, якщо вони потрібні.

Для `interactive-memory-update` це фіксується у відповідному `fixations/FIX-*.md`.

Якщо знання не оновлювалося, це теж треба зафіксувати.

---

# 15. Agents Memory

```text
agents/
  index.md
  rules.md
  workflows.md
  prompts.md
```

## 15.1 `rules.md`

Містить правила агентів.

Мінімальні правила:

1. Не починати роботу без визначеної Agent Role.
2. На старті сесії читати `agent-start.md` і відповідний boot packet.
3. Якщо задача вказана, читати `task.md` і визначати workflow за task-level `Execution Mode`, а не за session mode.
4. Агент не може самостійно переводити задачу в `done`.
5. Після завершення своєї роботи агент виконує self-review, переводить задачу в `review` і пропонує людині перевірити результат.
6. Переводити задачу в `done` можна тільки зі статусу `review` і тільки після явного human approval.
7. Погодження варіанта, проміжного рішення, плану або дозволу продовжити роботу не є human review approval задачі.
8. Якщо відповідь користувача на review-запит двозначна, уточнювати її перед зміною статусу на `done`.
9. Якщо робота припиняється без human review або без прийняття результату, задача переводиться в `canceled`, а не в `done`.
10. Зупиняти startup reading після boot packet, якщо немає явної причини читати глибше.
11. Не читати повний `pdadm-mvp-reglament` на старті звичайної сесії без потреби.
12. Для задач `autonomous-implementation` читати `task.md`, run `requirements.md`, run `context.md`.
13. Для задач `autonomous-research` читати `task.md`, `research/RSCH-*.md`, релевантну пам’ять і `knowledge/package-index.md`, якщо дослідження може потребувати reusable knowledge.
14. Для задач `interactive-memory-update` вести `worklog.md` і створювати `fixations/FIX-*.md` перед змінами Project Memory.
15. Не виходити за scope.
16. Не змінювати out-of-scope файли без явної потреби і фіксації причини.
17. Не змішувати current і target state.
18. Оновлювати `result.md` після виконання автономного прогону.
19. Оновлювати `research/RSCH-*.md` після автономного дослідження.
20. Оновлювати `FIX-*.md` після інтерактивної або research-driven фіксації.
21. Перевіряти потребу в memory sync.
22. Перед пропозицією або застосуванням змін у Project Memory виконувати upward consistency check для документів загального рівня.
23. У `result.md`, `research/RSCH-*.md` або `fixations/FIX-*.md` фіксувати стан документів загального рівня як `updated`, `not needed`, `proposed` або `blocked`.
24. Не подавати memory fixation або research result як review-ready, якщо вплив на документи загального рівня не перевірений.
25. Оновлювати `index.md` при зміні структури пам’яті.
26. В `index.md`, `package-index.md` і `tasks/plan/progress.md` використовувати списки з wiki-посиланнями, а не таблиці.
27. Не додавати локальні правила або секцію `Notes` в `index.md` чи `tasks/plan/progress.md`; правила мають бути в централізованих rules-файлах або knowledge packages.
28. Перевіряти `knowledge/package-index.md`, якщо задача може потребувати reusable knowledge.
29. Не переписувати великі memory documents без явної інструкції.

## 15.2 `workflows.md`

Описує типові робочі стани агента.

Це не task-level `Execution Mode`, а короткі операційні сценарії, які агент може використовувати всередині сесії:

* assistant;
* discussion;
* task-preparation;
* implementation;
* review;
* memory-update;
* knowledge-update;
* research.

## 15.3 `prompts.md`

Містить шаблони запуску агентів.

Приклад:

```markdown
## Agent Executor Prompt

Human Role: Agent Operator Hat / Product Lead Hat
Agent Role: Agent Executor
Task: `project-memory/tasks/plan/TASK-.../`
Run: RUN-...

Read:
- `project-memory/agent-start.md`
- `project-memory/memory-rules.md`
- `project-memory/agents/rules.md`
- task `task.md`, including its `Execution Mode`
- current run `requirements.md`
- current run `context.md`
- relevant knowledge packages

Execute only the current run scope.
Update current run `result.md`.
Update related `index.md` files if memory structure changes.
Do not change out-of-scope files unless required; if required, explain why in `result.md`.
```

---

# 16. Templates

```text
templates/
  index.md
  task.md
  run-requirements.md
  context.md
  result.md
  research-report.md
  worklog.md
  fixation.md
  adr.md
  knowledge-package.md
  knowledge-example.md
  knowledge-anti-example.md
```

Шаблони потрібні, щоб людина і агент не вигадували формат кожного разу заново. Повторне вигадування форматів — це, звісно, давня людська традиція, але MVP має шанс бути трохи розумнішим.

---

# 17. Мінімальний workflow MVP

У MVP 0.3 немає одного універсального workflow для всіх задач.

Є спільний старт задачі, а далі задача виконується за своїм `Execution Mode`:

* `autonomous-implementation`;
* `autonomous-research`;
* `interactive-memory-update`.

Окремо описується спеціальний workflow для `memory-migration`.

## 17.1 Обговорення ідеї або виявлення наміру

Типовий старт:

```text
Human Role: Product Owner Hat / Product Lead Hat / System Engineer Hat / Knowledge Engineer Hat
Agent Role: Agent Assistant
Task / Topic: discussion, memory analysis або task preparation
```

Результат:

* уточнення ідеї;
* ризики;
* суперечності;
* можливий draft задачі;
* запропонований `Type`;
* запропонований `Execution Mode`;
* записи в `inbox.md`, `product/`, `domain/` або `tasks/plan/progress.md`.

Якщо користувач проявляє намір змінити Project Memory, агент-консультант повинен запропонувати створити задачу типу `memory-update` або `knowledge` з execution mode `interactive-memory-update`.

## 17.2 Створення задачі

Створюється папка:

```text
tasks/plan/TASK-MM.YY-NNNN-short-name/
```

Обов’язково створюються:

```text
index.md
task.md
```

У `task.md` фіксуються:

* `Status`;
* `Type`;
* `Execution Mode`;
* `Goal`;
* `Scope`;
* `Out of Scope`;
* `Acceptance Criteria`, якщо вони вже зрозумілі.

Оновлюється:

```text
tasks/plan/index.md
tasks/plan/progress.md
```

Якщо користувач не підтверджує виконання задачі зараз, задача залишається зі статусом `backlog`.

Якщо користувач підтверджує виконання зараз, задача переходить у `active`, але task folder не переноситься.

## 17.3 Вибір execution mode

`autonomous-implementation` обирається, якщо:

* агент має автономно змінити код, документи, структуру проекту або інші артефакти;
* потрібні попередньо уточнені вимоги;
* потрібен context package;
* потрібен result report;
* очікується review виконаних змін.

`autonomous-research` обирається, якщо:

* основна робота полягає в автономному зборі й аналізі інформації;
* треба порівняти технічні, архітектурні, продуктові або процесні варіанти;
* результатом має бути research report, а не безпосередня зміна коду чи пам’яті;
* може знадобитися proposal на фіксацію знайденої інформації в Project Memory;
* потрібен self-review дослідження і human review перед прийняттям результату.

`interactive-memory-update` обирається, якщо:

* основна робота полягає в обговоренні з людиною;
* треба зафіксувати бізнес-цінність, scope, рішення, правила, domain або technical знання;
* результатом є зміни в Project Memory;
* важливо уникнути зайвої бюрократії `RUN-*` для кожного кроку діалогу;
* перед внесенням змін потрібен контрольований fixation package і self-review.

Якщо execution mode не очевидний, агент повинен уточнити режим у людини перед виконанням.

## 17.4 Workflow: `autonomous-implementation`

Це workflow для автономної роботи агента-імплементатора.

Він є окремим режимом для повного автономного workflow.

### 17.4.1 Підготовка першого прогону

Створюється:

```text
runs/RUN-001/
  index.md
  requirements.md
  context.md
  result.md
```

Оновлюється:

```text
task.md
runs/index.md
```

### 17.4.2 Активація задачі

Task folder не переноситься.

Задача залишається за стабільним шляхом:

```text
tasks/plan/TASK-MM.YY-NNNN-short-name/
```

Оновлюються:

```text
task.md
tasks/plan/progress.md
state.md
```

У `task.md` і `progress.md` статус змінюється на `active`.

### 17.4.3 Виконання прогону

Типовий старт прогону:

```text
Human Role: Agent Operator Hat
Agent Role: Agent Executor
Task: ...
Run: RUN-001
```

Агент бере `Execution Mode` з `task.md`. Для цього workflow очікується `Execution Mode: autonomous-implementation`.

Агент читає:

* `memory-rules.md`;
* `agents/rules.md`;
* `task.md`;
* `runs/RUN-001/requirements.md`;
* `runs/RUN-001/context.md`;
* `knowledge/package-index.md`;
* релевантні knowledge packages.

Агент виконує задачу і оновлює:

```text
runs/RUN-001/result.md
```

Після виконання агент зобов’язаний виконати self-review і заповнити в `result.md` секції:

* `Verification`;
* `Acceptance Criteria Check`;
* `Agent Self-Review`;
* `Memory Sync`;
* `Knowledge Updates`;
* `Follow-up Tasks`, якщо потрібні.

Якщо self-review показує, що результат можна передавати людині на перевірку, агент:

1. ставить `Status: review-ready` у `result.md`;
2. переводить задачу в `review` у `task.md`;
3. оновлює `tasks/plan/progress.md`;
4. повідомляє користувачу, що задача готова до human review;
5. пропонує користувачу ознайомитися з self-review, diff, acceptance criteria і залишковими ризиками;
6. явно просить одне з рішень: approve review, request changes, reject або cancel.

Агент не може після виконання автономного прогону самостійно перевести задачу в `done`.

### 17.4.4 Review результату

Людина перевіряє:

* diff;
* `result.md`;
* acceptance criteria;
* memory sync section;
* knowledge updates;
* чи треба новий прогон.

Можливі рішення після human review:

* `approved` — результат прийнятий, задачу можна закривати як `done`;
* `changes-requested` — потрібен новий прогон або доопрацювання, задача повертається в `active`;
* `rejected` — результат не прийнятий, задача повертається в `active` для нового прогону або переходить у `canceled`, якщо продовжувати її не треба;
* `canceled` — задачу більше не треба завершувати.

Тільки явне рішення `approved`, яке відповідає правилам `13.1.2 Що вважається human review approval`, дозволяє перейти до закриття задачі як `done`.

Якщо користувач у review-стані погоджує лише окремий варіант, уточнення або наступний крок, агент не вважає це прийняттям задачі. У такому випадку задача лишається `review` або повертається в `active`, залежно від змісту відповіді.

### 17.4.5 Новий прогон

Якщо результат незадовільний, створюється:

```text
runs/RUN-002/
  index.md
  requirements.md
  context.md
  result.md
```

У `requirements.md` нового прогону фіксується:

* що було не так;
* які вимоги уточнено;
* що змінено порівняно з попереднім прогоном;
* що треба зробити тепер.

Попередній прогон не переписується.

### 17.4.6 Memory Sync

Перед передачею задачі в `review` агент перевіряє й, якщо це входить у scope прогону, оновлює потрібні частини пам’яті:

* `product/`;
* `domain/`;
* `technical/`;
* `knowledge/`;
* `tasks/...`;
* документи загального рівня, на які впливає локальна зміна;
* відповідні `index.md`.

Якщо оновлення не потрібне, це фіксується в `result.md`.

Якщо локальна зміна створює потребу оновити документи загального рівня, але це виходить за scope прогону або потребує рішення людини, агент не замовчує це. Він фіксує `proposed` або `blocked` у `result.md` і створює follow-up task або виносить питання на human review.

### 17.4.7 Закриття задачі

Закриття задачі виконується тільки після human review.

Перед закриттям мають бути виконані умови:

* задача має статус `review`;
* `result.md` містить заповнений self-review;
* користувач явно підтвердив task-level human review approval;
* у `result.md` або `closure.md` зафіксовано human approval.

Створюється або оновлюється:

```text
closure.md
```

Task folder залишається в `tasks/plan/`.

Оновлюються:

```text
task.md
tasks/plan/progress.md
state.md
```

У `task.md` статус змінюється з `review` на `done`, а в `progress.md` задача позначається галочкою.

Якщо роботу припинено без human approval, задача переводиться не в `done`, а в `canceled`. У `closure.md` фіксується причина скасування.

Архівування виконується окремо, коли задача більше не потрібна в операційному плані:

```text
tasks/plan/TASK-MM.YY-NNNN-short-name/ -> tasks/archive/TASK-MM.YY-NNNN-short-name/
```

При архівуванні оновлюються:

```text
tasks/plan/index.md
tasks/plan/progress.md
tasks/archive/index.md
tasks/index.md
```

## 17.5 Workflow: `autonomous-research`

Це workflow для автономного дослідження технічних, архітектурних, продуктових або процесних питань.

Він використовується, коли агент має не імплементувати рішення, а зібрати інформацію, проаналізувати варіанти, сформувати висновки й рекомендації.

Типові задачі:

* дослідити кілька варіантів реалізації;
* порівняти архітектурні підходи;
* знайти ризики в технічному рішенні;
* підготувати recommendation перед implementation-задачею;
* зібрати знання, які потім треба зафіксувати в Project Memory.

### 17.5.1 Підготовка дослідження

Створюється:

```text
research/
  index.md
  RSCH-001.md
```

Якщо research-задача потенційно може завершитися фіксацією знань у Project Memory, також може бути створено:

```text
fixations/
  index.md
  FIX-001.md
```

`FIX-001.md` на цьому етапі має статус `draft` і є proposal. Агент не застосовує його до human review.

У `task.md` фіксується:

```text
Execution Mode: autonomous-research
Current Research: RSCH-001
Current Fixation: FIX-001 / n/a
```

### 17.5.2 Виконання дослідження

Агент бере `Execution Mode` з `task.md`. Для цього workflow очікується `Execution Mode: autonomous-research`.

Агент читає:

* `agent-start.md`;
* `memory-rules.md`;
* `agents/rules.md`;
* `task.md`;
* релевантну Project Memory;
* `knowledge/package-index.md`, якщо можуть знадобитися reusable knowledge packages;
* релевантні knowledge packages;
* дозволені зовнішні або передані користувачем джерела, якщо вони входять у task context.

Агент автономно:

1. збирає інформацію;
2. аналізує джерела й припущення;
3. порівнює варіанти;
4. формує висновки;
5. формує рекомендацію;
6. визначає, чи треба фіксувати отримані знання в Project Memory.

Результат дослідження фіксується в:

```text
research/RSCH-001.md
```

### 17.5.3 Proposal на фіксацію в Project Memory

Якщо задача вимагає або дослідження показує потребу зафіксувати інформацію в Project Memory, агент готує proposal:

```text
fixations/FIX-001.md
```

Proposal має містити:

* target memory files;
* proposed changes;
* rationale;
* зв’язок із research findings;
* ризики;
* вплив на документи загального рівня;
* memory sync notes;
* self-review.

До human review агент не змінює target memory files.

Якщо фіксація не потрібна, у `research/RSCH-001.md` в секції `Memory Fixation Proposal` ставиться `Status: not-needed` з поясненням.

### 17.5.4 Self-review дослідження

Перед передачею задачі в `review` агент виконує self-review.

Мінімальна перевірка:

* чи відповідає research question scope задачі;
* чи достатньо явно вказані джерела й припущення;
* чи не підмінено дослідження імплементацією;
* чи чесно порівняні варіанти;
* чи рекомендація випливає з findings;
* чи зафіксовані ризики й невизначеності;
* чи коректно визначено потребу в memory fixation;
* чи перевірено вплив findings і proposed memory changes на документи загального рівня;
* чи не застосовано memory changes без approval.

Якщо self-review пройдено, агент:

1. ставить `Status: review-ready` або еквівалентний review-ready стан у `research/RSCH-001.md`;
2. переводить задачу в `review`;
3. оновлює `tasks/plan/progress.md`;
4. повідомляє користувачу, що research-задача готова до human review;
5. показує або вказує research report і, якщо є, `FIX-001.md`;
6. явно просить рішення: approve research, request changes, reject або cancel;
7. якщо є memory fixation proposal, окремо просить погодити або відхилити його застосування.

### 17.5.5 Human review research-задачі

Людина перевіряє:

* research question і scope;
* джерела й припущення;
* findings;
* порівняння варіантів;
* recommendation;
* risks;
* self-review;
* memory fixation proposal, якщо він є.

Можливі рішення:

* `approved` — research result прийнятий, memory fixation не потрібна або не входить у це approval;
* `approved with memory fixation` — research result прийнятий і proposal на фіксацію можна застосувати;
* `approved with memory fixation and closure` — research result прийнятий, proposal можна застосувати, і якщо застосування проходить без відхилень від погодженого proposal, задачу можна закрити як `done`;
* `changes-requested` — потрібне доопрацювання або новий research artifact;
* `rejected` — результат не прийнятий;
* `canceled` — задачу більше не треба завершувати.

Погодження research result не означає автоматичного погодження memory fixation proposal, якщо агент явно не попросив і користувач явно не дав approval на застосування `FIX-*`.

Погодження memory fixation proposal не означає автоматичного дозволу закрити задачу, якщо агент не попросив task-level closure approval і користувач явно його не дав.

### 17.5.6 Застосування погодженої memory fixation

Якщо memory fixation proposal є і користувач явно погодив його застосування, агент застосовує тільки погоджені зміни.

Агент оновлює:

* target memory files;
* документи загального рівня, які були погоджені в `FIX-001.md`;
* відповідні `index.md`;
* `state.md`, якщо зміна важлива для поточного стану проекту;
* `fixations/FIX-001.md`;
* `research/RSCH-001.md`;
* `task.md`;
* `tasks/plan/progress.md`.

Якщо під час застосування proposal виникає конфлікт, потреба змінити scope або відхилення від погодженого тексту, агент не закриває задачу. Він фіксує проблему й повертає задачу в `review` або `active` для уточнення.

Якщо memory fixation не потрібна або явно відхилена, це фіксується в `research/RSCH-001.md` і `closure.md`.

### 17.5.7 Закриття research-задачі

Research-задача закривається за загальним правилом `review -> done`.

Перед закриттям мають бути виконані умови:

* задача має статус `review`;
* `research/RSCH-001.md` містить self-review;
* користувач явно підтвердив task-level human review approval;
* якщо memory fixation була потрібна, вона або застосована після approval, або явно відхилена/відкладена користувачем;
* у `closure.md` зафіксовано human approval і стан memory fixation.

Після цього агент може перевести задачу з `review` у `done` і створити або оновити `closure.md`.

Якщо research припинено без human review або без прийняття результату, задача переводиться в `canceled`, а не в `done`.

## 17.6 Workflow: `interactive-memory-update`

Це workflow для задач, де зміст формується через інтерактивний чат людини з агентом-консультантом, а потім контрольовано фіксується в Project Memory.

Типові задачі:

* зафіксувати бізнес-цінність;
* уточнити scope етапу;
* узгодити product decision;
* оновити domain або technical memory;
* зафіксувати архітектурні знання;
* сформувати або уточнити правила проекту.

### 17.6.1 Виявлення наміру

Якщо користувач відповідної ролі пише, що хоче зафіксувати або оновити знання в Project Memory, цього достатньо для створення задачі.

Агент-консультант:

1. коротко формулює задачу;
2. пропонує `Type: memory-update` або `Type: knowledge`;
3. пропонує `Execution Mode: interactive-memory-update`;
4. створює task folder і запис у `tasks/plan/progress.md`;
5. питає, чи виконувати задачу зараз.

Якщо користувач не погоджується виконувати задачу зараз, задача лишається зафіксованою зі статусом `backlog`.

### 17.6.2 Інтерактивне виконання

Якщо користувач підтверджує виконання зараз, задача переходить у `active`.

Типовий старт інтерактивної роботи:

```text
Human Role: Product Owner Hat / Product Lead Hat / System Engineer Hat / Knowledge Engineer Hat
Agent Role: Agent Assistant
Task: ...
```

Агент бере `Execution Mode` з `task.md`. Для цього workflow очікується `Execution Mode: interactive-memory-update`.

Агент не зберігає повний transcript чату в Project Memory.

Замість цього агент підтримує `worklog.md` як структурований журнал:

* що користувач хоче зафіксувати;
* які уточнення вже прийняті;
* які питання лишаються відкритими;
* які fixation packages створені.

### 17.6.3 Запит на фіксацію

Коли користувач просить зафіксувати проміжний або завершений стан, агент переходить у стадію фіксації.

Створюється:

```text
fixations/FIX-001.md
```

У fixation package агент фіксує:

* що саме треба внести в Project Memory;
* з якого обговорення або вхідного матеріалу це взято;
* які файли пам’яті треба змінити;
* які зміни пропонуються;
* чому ці зміни коректні;
* які ризики або відкриті питання залишаються.

### 17.6.4 Self-review перед змінами пам’яті

До внесення змін у Project Memory агент виконує self-review fixation package.

Мінімальна перевірка:

* чи немає протиріч з існуючою Project Memory;
* чи не втрачається важливий контекст;
* чи відповідає scope задачі;
* чи правильно визначені target memory files;
* чи треба оновити `index.md`;
* чи треба оновити `state.md`;
* чи треба оновити інші документи загального рівня;
* чи зафіксовано для кожного документа загального рівня статус `updated`, `not needed`, `proposed` або `blocked`;
* чи треба створити follow-up task.

Якщо self-review не пройдено, агент:

1. не змінює цільові документи пам’яті;
2. фіксує проблеми в `FIX-001.md`;
3. повідомляє користувачу про проблеми;
4. пропонує варіанти уточнення або виправлення.

### 17.6.5 Застосування змін

Якщо self-review пройдено, агент вносить зміни в цільові документи Project Memory.

Оновлюються:

* target memory files;
* документи загального рівня, які входять у погоджений fixation package;
* відповідні `index.md`;
* `state.md`, якщо зміна важлива для поточного стану проекту;
* `task.md`;
* `worklog.md`;
* `fixations/FIX-001.md`;
* `tasks/plan/progress.md`.

У `FIX-001.md` статус змінюється на `applied`.

Після застосування фіксації агент не закриває задачу як `done`.

Якщо ціль інтерактивної задачі, на думку агента, досягнута, агент:

1. оновлює `worklog.md` і `FIX-001.md`;
2. переводить задачу в статус `review`;
3. оновлює `tasks/plan/progress.md`;
4. повідомляє користувачу, що задача готова до human review;
5. пропонує користувачу перевірити applied changes, self-review і memory sync notes;
6. явно просить одне з рішень: approve review, request changes, reject або cancel.

### 17.6.6 Продовження або закриття

Якщо потрібні додаткові уточнення, задача лишається `active`, а наступна фіксація створюється як `FIX-002`.

Якщо після human review користувач просить доопрацювання, задача повертається в `active`, а наступна фіксація створюється як `FIX-002`.

Якщо користувач явно підтверджує task-level human review approval:

* створюється або оновлюється `closure.md`;
* `task.md` змінює статус з `review` на `done`;
* у `tasks/plan/progress.md` задача позначається галочкою;
* unresolved risks і follow-up tasks фіксуються в `closure.md`.

Якщо інтерактивну задачу припинено без human review або без прийняття результату, вона переводиться в `canceled`, а не в `done`.

## 17.7 Workflow: `memory-migration`

Міграція версії Project Memory виконується як окрема задача типу `memory-migration`.

Вона має власний workflow, бо змінює не тільки зміст пам’яті, а й правила, шаблони, структуру та індекси.

Базовий механізм міграції:

1. у Project Memory робиться доступною цільова версія knowledge package `pdadm-mvp-reglament`;
2. у цьому package є чітка інструкція міграції з поточної версії регламенту на цільову;
3. агенту ставиться задача типу `memory-migration`;
4. агент виконує міграцію згідно з регламентом, `pdadm-mvp-reglament` і task/run context.

Якщо `pdadm-mvp-reglament` ще не оновлений до цільової версії, це треба зробити перед основними змінами Project Memory: окремою `knowledge`-задачею або першим прогоном `memory-migration`.

Типовий запуск:

```text
Human Role: Product Lead Hat / System Engineer Hat
Agent Role: Agent Executor
Task Type: memory-migration
From PDADM MVP: current-version
To PDADM MVP: target-version
```

Агент бере `Execution Mode` з `task.md`. Для цього workflow зазвичай використовується `Execution Mode: autonomous-implementation`.

У `requirements.md` такого прогону треба явно зафіксувати:

* з якої версії регламенту виконується міграція;
* на яку версію регламенту виконується міграція;
* де лежить поточна Project Memory проекту;
* де лежить цільовий регламент, Starter Kit або migration guide;
* яка версія `pdadm-mvp-reglament` має бути використана;
* чи оновлення `pdadm-mvp-reglament` уже виконане, чи входить у цей прогон;
* які файли й папки пам’яті вважаються накопиченими даними проекту;
* які структурні або регламентні зміни очікуються;
* чи треба робити резервну копію перед змінами;
* що вважається успішною міграцією.

У `context.md` треба надати або вказати:

* поточний `memory-rules.md`;
* поточні top-level `README.md`, `state.md` та `index.md`, якщо вони є;
* поточні `index.md` ключових папок;
* релевантні шаблони з `templates/`;
* поточний або цільовий `knowledge/packages/pdadm-mvp-reglament/`;
* опис цільової версії регламенту;
* архів або розпаковану копію цільового Starter Kit у staging-локації, якщо він використовується для порівняння.

Цільовий Starter Kit не можна розпаковувати поверх існуючої `memory/`.

Правильний порядок роботи:

1. створити або перевірити резервну копію, якщо це дозволено задачею;
2. переконатися, що агент має доступ до цільової версії `pdadm-mvp-reglament`;
3. прочитати поточну Project Memory як живу систему з накопиченими даними;
4. прочитати цільову версію регламенту, `pdadm-mvp-reglament` і Starter Kit як еталон структури;
5. скласти план міграції з переліком файлів, які будуть додані, змінені або залишені без змін;
6. внести структурні зміни без втрати project-specific content;
7. оновити правила, шаблони й індекси відповідно до цільового регламенту;
8. перевірити, що накопичені product, domain, technical, task і knowledge записи не були перезаписані;
9. зафіксувати в `result.md` фактичні зміни, перевірки, конфлікти й залишкові ризики.

Якщо цільовий регламент вимагає змінити формат файлу, в якому вже є проектний зміст, агент повинен виконати міграцію змісту у новий формат, а не замінити файл шаблоном.

Мінімальні acceptance criteria для `memory-migration`:

* Project Memory вказує нову версію регламенту там, де версія фіксується;
* `pdadm-mvp-reglament` оновлений до цільової версії або має явно зафіксований виняток;
* `knowledge/package-index.md` вказує на актуальний `pdadm-mvp-reglament`;
* структура пам’яті відповідає цільовому регламенту або має явно зафіксовані винятки;
* накопичені дані проекту збережені;
* відповідні `index.md` оновлені;
* `result.md` містить список змінених файлів, перевірки й невирішені конфлікти;
* для невирішених конфліктів створені follow-up tasks або запити до людини.

---

# 18. Правила кількох прогонів і research-ітерацій задачі

Цей розділ стосується задач з `Execution Mode: autonomous-implementation` і `Execution Mode: autonomous-research`.

Для `interactive-memory-update` аналогом прогону є fixation package `FIX-*`.

## 18.1 Коли створювати новий прогон

Новий прогон створюється, якщо:

* попередній результат failed;
* попередній результат `review-ready`, але після human review потребує суттєвої переробки;
* змінився context package;
* уточнилися вимоги;
* змінився агент або режим виконання;
* потрібно ізолювати нову спробу;
* результат попередньої спроби частково корисний, але не прийнятий.

## 18.2 Що не можна робити

Не можна переписувати `requirements.md`, `context.md` і `result.md` старого прогону так, ніби помилки не було.

Старі прогони є історією виконання. Переписування історії — це зручно тільки диктаторам і поганим CI pipeline.

## 18.3 Як фіксувати зв’язок між прогонами

У `requirements.md` нового прогону має бути секція:

```markdown
## Changes from Previous Run

- Previous run: RUN-001
- Problem:
- Updated requirement:
- Updated context:
- Expected correction:
```

У `task.md` список `Runs` оновлюється після кожного прогону.

## 18.4 Кілька research-ітерацій для `autonomous-research`

Новий `RSCH-*` створюється, якщо:

* після human review потрібно суттєво переробити дослідження;
* змінився research question або scope;
* з’явилися нові джерела або обмеження;
* попередня рекомендація не прийнята;
* потрібно порівняти додатковий варіант;
* memory fixation proposal потребує суттєвої переробки.

Старі `RSCH-*` не переписуються так, ніби попереднього аналізу або помилок не було.

У `task.md` список `Research` оновлюється після кожної research-ітерації.

## 18.5 Кілька фіксацій для `interactive-memory-update`

Новий `FIX-*` створюється, якщо:

* користувач просить зафіксувати новий проміжний стан;
* попередній fixation package був застосований, але обговорення продовжилось;
* self-review попередньої фіксації виявив проблеми, які потребують нового пакета змін;
* змінився scope фіксації;
* потрібно відокремити незалежні зміни в різних частинах Project Memory.

Старі `FIX-*` не переписуються так, ніби попередніх рішень або проблем не було.

---

# 19. Memory Sync MVP

Memory Sync у MVP не є окремим великим звітом.

Для `autonomous-implementation` він фіксується в `result.md` кожного прогону і фінально перевіряється в `closure.md`.

Для `autonomous-research` він фіксується в `research/RSCH-*.md`. Якщо дослідження пропонує зміни в Project Memory, конкретні зміни оформлюються як `fixations/FIX-*.md` і застосовуються тільки після human approval.

Для `interactive-memory-update` він фіксується у відповідному `fixations/FIX-*.md` і фінально перевіряється в `closure.md`.

Документи загального рівня — це документи, які узагальнюють стан, навігацію, правила або ключові рішення ширше за одну локальну зміну.

Приклади:

* `state.md`;
* top-level `README.md`, `index.md` і відповідні folder-level `index.md`;
* загальні продуктові документи: vision, strategy, roadmap, requirements overview;
* загальні domain-документи: current state, target state, domain rules;
* загальні technical-документи: architecture overview, stack, technical rules, ADR index;
* `knowledge/package-index.md` і `index.md` релевантних knowledge packages;
* `tasks/plan/progress.md`, якщо зміна впливає на стан задач.

## 19.1 Що перевіряти

* Чи змінився product state?
* Чи змінився domain current state?
* Чи змінився domain target state?
* Чи змінились technical rules?
* Чи потрібен ADR?
* Чи з’явилося reusable knowledge?
* Чи потрібно оновити knowledge package?
* Чи локальна зміна робить неактуальними документи загального рівня?
* Чи всі потрібні оновлення документів загального рівня включені в поточну зміну, proposal або follow-up?
* Чи оновлені `index.md`?
* Чи оновлений `state.md`?
* Чи треба створити follow-up task?

## 19.2 Формат у `result.md`

```markdown
## Memory Sync

- Product memory: updated / not needed
- Domain memory: updated / not needed
- Technical memory: updated / not needed
- Knowledge memory: updated / not needed
- Task memory: updated / not needed
- Wiki indexes: updated / not needed
- State file: updated / not needed
- General-level memory documents: updated / not needed / proposed / blocked

## Memory Sync Notes

Коротке пояснення.
```

## 19.3 Формат у `fixations/FIX-*.md`

```markdown
## Memory Sync

- Product memory: updated / not needed
- Domain memory: updated / not needed
- Technical memory: updated / not needed
- Knowledge memory: updated / not needed
- Task memory: updated / not needed
- Wiki indexes: updated / not needed
- State file: updated / not needed
- General-level memory documents: updated / not needed / proposed / blocked

## Memory Sync Notes

Коротке пояснення.
```

## 19.4 Upward consistency check

Кожна пропозиція або застосування змін у Project Memory має містити upward consistency check: агент перевіряє, чи локальна зміна не потребує оновлення документів загального рівня.

Для кожної релевантної групи документів агент фіксує один зі станів:

* `updated` — документ оновлено в межах поточної зміни;
* `not needed` — оновлення не потрібне, коротко пояснено чому;
* `proposed` — оновлення потрібне, але має бути погоджене або виконане окремою задачею;
* `blocked` — оновлення потрібне, але бракує рішення, контексту або права на зміну.

Агент не повинен позначати `FIX-*`, `RSCH-*` або `result.md` як review-ready, якщо вплив на документи загального рівня не перевірений і не зафіксований.

Якщо локальна зміна застосована без відповідного оновлення загального документа, `Memory Sync Notes` має пояснити, чому це не створює неузгодженості або який follow-up її закриває.

---

# 20. Мінімальні правила для людей і агентів

## 20.1 Нема implementation без задачі

Агент не повинен змінювати код або проектні артефакти без task folder.

Для `autonomous-implementation` потрібен task run.

Для `autonomous-research` потрібен research artifact `research/RSCH-*.md`.

Для `interactive-memory-update` потрібен fixation package перед змінами Project Memory.

Виняток: дуже дрібна правка, явно дозволена людиною. Але якщо дрібна правка переростає в задачу — створити задачу.

## 20.2 Нема прогону без role declaration

На початку кожної сесії треба вказати Agent Role.

## 20.3 Нема autonomous task run без `requirements.md` і `context.md`

Кожен прогон у `autonomous-implementation` має власні:

* `requirements.md`;
* `context.md`;
* `result.md`.

## 20.4 Один прогон — один result report

Для задач `autonomous-implementation` не створювати окремі execution/audit/review reports.

## 20.4.1 Нема autonomous research без research report

Для задач `autonomous-research` агент повинен створити або оновити `research/RSCH-*.md`.

Research-задача не повинна завершуватися тільки повідомленням у чаті.

Якщо дослідження виявило знання, які треба зафіксувати в Project Memory, агент створює `fixations/FIX-*.md` як proposal і не застосовує його без human approval.

## 20.4.2 Нема memory fixation без fixation package

Для задач `interactive-memory-update` агент не повинен змінювати цільові документи Project Memory без `fixations/FIX-*.md`.

Перед застосуванням змін fixation package має містити:

* target memory files;
* proposed changes;
* rationale;
* general-level memory impact;
* self-review;
* review findings, якщо вони є.

Якщо self-review не пройдено, зміни в основні файли Project Memory не вносяться.

## 20.4.3 Нема memory fixation без перевірки документів загального рівня

Агент, який пропонує або застосовує зміни в Project Memory, відповідає не тільки за локальні target files, а й за узгодженість документів загального рівня.

Перед human review агент повинен явно зафіксувати:

* які документи загального рівня перевірені;
* які з них оновлені;
* для яких оновлення не потрібне і чому;
* які оновлення запропоновані окремо;
* які оновлення заблоковані й що треба вирішити.

Не можна подавати memory fixation як готову до review, якщо після локальної зміни `state.md`, загальні продуктові, domain, technical або knowledge-документи можуть стати неактуальними, а агент не зафіксував це як `updated`, `not needed`, `proposed` або `blocked`.

## 20.4.4 Нема `done` без human review

Агент не може самостійно закривати задачу як `done`.

Для будь-якого типу задачі й будь-якого `Execution Mode` фінальний стан роботи агента — це не `done`, а передача задачі в `review`.

Перед переведенням задачі в `review` агент повинен:

* виконати self-review;
* зафіксувати, що було зроблено;
* зафіксувати перевірки;
* зафіксувати ризики й відкриті питання;
* зафіксувати потребу в memory sync або факт його виконання;
* запропонувати людині ознайомитися з результатом self-review.

Коли задача готова до review, агент повинен явно сказати, що очікує task-level human review decision, а не загальне погодження. Він має попросити користувача обрати один із варіантів:

* approve review / прийняти результат і закрити як `done`;
* request changes / продовжити виконання;
* reject / не приймати результат;
* cancel / скасувати задачу.

Задача може перейти в `done` тільки якщо:

* поточний статус задачі — `review`;
* людина явно підтвердила task-level human review approval;
* в `closure.md` або відповідному result/fixation artifact зафіксовано human approval.

Погодження окремого варіанта, відповіді на питання, плану, фіксації або наступного кроку не є human review approval задачі.

Якщо відповідь користувача двозначна, агент уточнює її і не переводить задачу в `done`.

Задача не може перейти в `done` зі статусів `backlog`, `active`, `blocked` або `canceled`.

Якщо робота над задачею припиняється без human review або без прийняття результату, задача отримує статус `canceled`. `canceled` не означає успішне завершення і не позначається галочкою в `tasks/plan/progress.md`.

## 20.5 Knowledge index треба читати

Перед задачами, де можуть знадобитися reusable knowledge, агент перевіряє:

```text
knowledge/package-index.md
```

## 20.6 Index files треба оновлювати

Будь-яка зміна структури Project Memory вимагає оновлення відповідних `index.md`.

Індексні записи мають бути списками з wiki-посиланнями.

Для дочірньої папки посилання веде на її `index.md`, наприклад:

```markdown
- [Tasks](tasks/index.md)
```

Таблиці, секція `Notes` і локальні правила в `index.md` не використовуються.

## 20.7 Task folder має стабільний шлях

Зміна статусу задачі не повинна переносити її папку між статусними станами `backlog`, `active`, `review`, `blocked`, `canceled` або `done`.

Усі неархівні задачі живуть у `tasks/plan/`. Статус задачі змінюється в `task.md` і `tasks/plan/progress.md`.

Task folder переноситься тільки під час архівування:

```text
tasks/plan/... -> tasks/archive/...
```

## 20.8 Current і target не змішувати

Поточний стан і цільовий стан мають бути розділені.

## 20.9 Великі зміни знань — окрема задача

Якщо потрібно суттєво переписати knowledge package, це має бути окрема задача типу `knowledge`.

## 20.10 Inbox треба розбирати

`inbox.md` не повинен ставати вічним болотом. Його треба періодично розбирати в задачі, знання або доменну пам’ять.

## 20.11 `state.md` має бути коротким

`state.md` не повинен перетворюватися на дубль усієї Project Memory.

## 20.12 Міграція регламенту не є розпаковкою архіву

При оновленні вже розгорнутої Project Memory на нову версію PDADM MVP не можна просто розпакувати новий Starter Kit поверх існуючої `memory/`.

Starter Kit є еталоном структури й стартових файлів, але існуюча Project Memory містить накопичені дані конкретного проекту. Для такого оновлення потрібна окрема задача типу `memory-migration` з явним планом, перевіркою збереження даних і оновленням відповідних `index.md`.

Перед основними змінами Project Memory агент повинен мати доступ до цільової версії `knowledge/packages/pdadm-mvp-reglament/` з інструкцією міграції. Якщо такого package немає або він не відповідає цільовій версії, спочатку треба оновити його як підготовчу knowledge-зміну, а потім виконувати міграцію решти пам’яті.

---

# 21. Рекомендований цикл тижневої підтримки

Раз на тиждень або після великої задачі бажано виконати легкий review.

Перевірити:

* `state.md`;
* `inbox.md`;
* `tasks/plan/progress.md`;
* `tasks/plan/`;
* `tasks/archive/`;
* `knowledge/package-index.md`;
* незавершені memory sync notes;
* follow-up tasks;
* застарілі або суперечливі записи.

За потреби створити:

```text
reports/periodic/YYYY-MM-DD-weekly-review.md
```

Це не обов’язковий ритуал. Це прибирання. Теж неприємно, але інакше потім у пам’яті заводяться архітектурні таргани.

---

# 22. Критерії успішності MVP

MVP вважається корисним, якщо після 2-4 тижнів практики:

1. Агентські задачі запускаються швидше.
2. Менше часу витрачається на повторне пояснення контексту.
3. Результати агентів стають стабільнішими.
4. Кілька прогонів задачі не створюють хаосу.
5. Знання реально перевикористовуються через `knowledge/package-index.md`.
6. `index.md` полегшують навігацію.
7. `result.md` достатній для автономних implementation-прогонів, `research/RSCH-*.md` достатній для автономних досліджень, а `FIX-*.md` достатній для контрольованих фіксацій пам’яті.
8. `state.md` допомагає швидко повернутися в проект.
9. `inbox.md` зменшує втрату ідей.
10. Підтримка Project Memory не забирає більше часу, ніж економить.

---

# 23. Що відкласти після MVP

Не впроваджувати на старті:

* складну authority matrix;
* окремі контури ревю як окремі документи;
* формальний release audit;
* складний merge protocol для knowledge;
* автоматичні dashboards;
* повну інтеграцію з task trackers;
* складне versioning knowledge packages;
* формальну governance model;
* обов’язковий entropy review;
* надмірну типізацію всіх документів.

Це можна додати після перевірки, що базова схема не викликає бажання закопати її поруч із невдалими agile-трансформаціями.

---

# 24. Мінімальний набір шаблонів для старту

Для MVP треба підготувати такі шаблони:

1. `templates/agent-start.md`
2. `templates/task.md`
3. `templates/run-requirements.md`
4. `templates/context.md`
5. `templates/result.md`
6. `templates/research-report.md`
7. `templates/worklog.md`
8. `templates/fixation.md`
9. `templates/adr.md`
10. `templates/knowledge-package.md`
11. `templates/knowledge-example.md`
12. `templates/knowledge-anti-example.md`
13. `templates/index.md`

---

# 25. Коротке резюме MVP 0.3

MVP 0.3 зводить повну методологію до практичного мінімуму:

* одна людина працює в різних role hats;
* агент завжди запускається в конкретній ролі;
* Agent Assistant використовується для чат-роботи з пам’яттю, ідеями, ризиками і задачами;
* `agent-start.md` є першою точкою входу агента в Project Memory;
* startup reading обмежується boot packet і stop rule;
* повний `pdadm-mvp-reglament` є reference layer, а не обов’язковим startup layer;
* задачі живуть у Project Memory;
* кожна задача має `Type` і `Execution Mode`;
* кожна неархівна задача має стабільний task folder у `tasks/plan/`;
* `tasks/plan/progress.md` є єдиним операційним індексом неархівних задач, їхніх груп і статусів;
* повний автономний workflow винесений у режим `autonomous-implementation`;
* задачі `autonomous-implementation` можуть мати кілька незалежних task runs;
* кожен autonomous run має власні `requirements.md`, `context.md`, `result.md`;
* автономні research-задачі виконуються через `Execution Mode: autonomous-research` і мають власні `research/RSCH-*.md`;
* research-задачі можуть готувати `fixations/FIX-*.md` як proposal на фіксацію знань у Project Memory;
* задачі `interactive-memory-update` виконуються через чат з Agent Assistant, `worklog.md` і `fixations/FIX-*.md`;
* звітність зведена до одного `result.md` на autonomous implementation run, одного `research/RSCH-*.md` на autonomous research або одного `FIX-*.md` на контрольовану фіксацію;
* knowledge packages мають гнучку структуру, але обов’язковий `package.md`;
* `knowledge/package-index.md` є центральним індексом reusable knowledge;
* кожна папка має `index.md`;
* агенти зобов’язані підтримувати `index.md` при зміні структури пам’яті;
* `memory-rules.md` є головним файлом правил роботи з пам’яттю;
* `state.md` показує поточний стан проекту;
* `inbox.md` збирає сирі думки;
* memory sync є обов’язковим, але легким;
* міграція вже розгорнутої Project Memory між версіями PDADM MVP виконується окремою задачею типу `memory-migration`, а не перезаписом `memory/` новим Starter Kit.

Це не повна методологія, а робочий протокол для щоденного використання. Його ціль — дати агентам достатньо структури, щоб вони були корисними, але не стільки регламентів, щоб одна людина почала працювати секретарем у власної автоматизації.
