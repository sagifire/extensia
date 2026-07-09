# Migration Guide: PDADM MVP 0.1 -> PDADM MVP 0.2

Status: draft
Source PDADM MVP Version: 0.1
Target PDADM MVP Version: 0.2
Target Starter Kit Version: 2.0
Agent Role: Agent Executor
Task Type: memory-migration
Execution Mode: autonomous-implementation

Historical Status: chain-only reference for package 4.0

У Starter Kit 4.0 цей guide не є фінальним migration target. Якщо проект треба мігрувати з MVP 0.1 до актуальної версії, використовувати `from-0.1-to-0.3.md`, а потім `from-0.3-to-0.4.md`.

Якщо цей guide використовується як проміжний reference, після нього обов'язково застосувати `from-0.2-to-0.3.md` і `from-0.3-to-0.4.md`; не залишати `knowledge/packages/pdadm-mvp-reglament/` у стані `Version: 2.0` або `Version: 3.0`.

## Purpose

Ця інструкція описує, як агент має мігрувати вже розгорнуту Project Memory з PDADM MVP 0.1 на PDADM MVP 0.2 без втрати накопичених даних проекту.

Міграція не є розпаковкою нового Starter Kit поверх існуючої `memory/`.

## Required Inputs

Перед початком агент повинен мати:

- task folder для задачі `memory-migration`;
- `runs/RUN-*/requirements.md`;
- `runs/RUN-*/context.md`;
- доступ до поточної Project Memory проекту;
- доступ до цільового Starter Kit 2.0 або його структури;
- цей migration guide;
- актуальний `knowledge/packages/pdadm-mvp-reglament/package.md`.

## Safety Rules

1. Не перезаписувати накопичені project-specific файли шаблонами.
2. Не видаляти зміст product, domain, technical, task або knowledge memory без явної інструкції.
3. Перед зміною формату файлу зберегти й перенести його зміст у нову структуру.
4. Якщо є конфлікт між поточним змістом і цільовим регламентом, зафіксувати його в `result.md` і попросити уточнення.
5. Після зміни структури оновити всі релевантні `index.md`.
6. У `result.md` зафіксувати changed files, verification, unresolved conflicts і follow-up tasks.

## Recommended Migration Order

### 1. Підготовка

1. Якщо `memory/agent-start.md` існує, прочитати його й виконати startup profile для `memory-migration`.
2. Якщо `memory/agent-start.md` відсутній, не вважати це помилкою для MVP 0.1. У такому випадку прочитати fallback startup documents:
   - `memory/README.md`, якщо існує;
   - `memory/state.md`, якщо існує;
   - `memory/memory-rules.md`, якщо існує;
   - `memory/agents/rules.md`, якщо існує.
3. Прочитати task `requirements.md` і `context.md`.
4. Перевірити, чи дозволена резервна копія. Якщо так, створити її способом, погодженим у задачі.
5. Зафіксувати у `result.md` початковий стан: source version, target version, основні папки, наявність або відсутність `memory/agent-start.md` і потенційні ризики.

### 2. Оновити startup layer

1. Додати або оновити top-level `agent-start.md`.
2. У `agent-start.md` зафіксувати:
   - `PDADM MVP Version: 0.2`;
   - `Starter Kit Version: 2.0`, якщо проект використовує версію Starter Kit;
   - default boot packet;
   - startup profiles;
   - stop rule;
   - правило, що повний регламент є reference layer.
3. Оновити `README.md`, щоб він посилався на `agent-start.md`.
4. Оновити `index.md`, якщо додано новий файл.

### 3. Оновити Task Memory

1. Створити `tasks/plan/` і `tasks/plan/progress.md`, якщо їх немає.
2. Перенести неархівні задачі з:
   - `tasks/backlog/`;
   - `tasks/active/`;
   - `tasks/done/`;
   до `tasks/plan/`.
3. Не змінювати зміст task folders без потреби.
4. У кожному `task.md` додати або уточнити:
   - `Type`;
   - `Execution Mode`;
   - `Current Run` або `Current Fixation`.
5. Побудувати `tasks/plan/progress.md` як структурований чекліст:
   - галочка;
   - назва директорії задачі;
   - статус;
   - короткий опис.
6. Залишити `tasks/archive/` для задач, які більше не мають бути в операційному плані.
7. Видаляти старі `backlog/`, `active/`, `done/` тільки після перевірки, що задачі перенесені й індекси оновлені.

### 4. Оновити Domain Memory

1. Створити `domain/current/` і `domain/target/`.
2. Якщо існує `domain/current.md`, перенести його зміст у відповідний файл або набір файлів у `domain/current/`.
3. Якщо існує `domain/target.md`, перенести його зміст у відповідний файл або набір файлів у `domain/target/`.
4. Не нав'язувати універсальну схему декомпозиції домену.
5. Якщо декомпозиція не очевидна, створити нейтральні стартові файли або залишити зміст у одному перенесеному документі, наприклад:
   - `domain/current/overview.md`;
   - `domain/target/overview.md`.
6. Оновити `domain/index.md`, `domain/current/index.md`, `domain/target/index.md`.
7. Оновити посилання в `memory-rules.md`, `agents/rules.md`, task contexts і knowledge packages, якщо вони вказували на `current.md` або `target.md`.

### 5. Оновити execution model

1. У правилах і шаблонах розвести:
   - `Type`;
   - `Execution Mode`.
2. Додати тип `memory-update`.
3. Додати execution modes:
   - `autonomous-implementation`;
   - `interactive-memory-update`.
4. Для `autonomous-implementation` зберегти `RUN-*`, `requirements.md`, `context.md`, `result.md`.
5. Для `interactive-memory-update` додати:
   - `worklog.md`;
   - `fixations/`;
   - `fixations/FIX-*.md`.
6. Заборонити застосування змін у Project Memory без fixation package і self-review для інтерактивних задач.

### 6. Оновити templates

Перевірити й оновити:

- `templates/agent-start.md`;
- `templates/task.md`;
- `templates/run-requirements.md`;
- `templates/context.md`;
- `templates/result.md`;
- `templates/worklog.md`;
- `templates/fixation.md`;
- `templates/index.md`;
- knowledge package templates.

## 7. Оновити knowledge package регламенту

1. Оновити `knowledge/packages/pdadm-mvp-reglament/package.md` до `Version: 2.0`.
2. Додати або оновити `mvp_one_to_one_0.2.md`.
3. Додати або оновити `migrations/from-0.1-to-0.2.md`.
4. Оновити `knowledge/packages/pdadm-mvp-reglament/index.md`.
5. Оновити `knowledge/package-index.md`.

### 8. Нейтралізувати Starter Kit placeholders

Якщо пам'ять є Starter Kit або щойно розгорнутою пам'яттю нового проекту:

1. Перевірити `product/vision.md`, `product/requirements.md`, `product/roadmap.md`.
2. Переконатися, що вони не описують Product Driven AI Development Methodology як продукт downstream-проекту.
3. Замінити misleading content на neutral placeholders.
4. Явно позначити приклади як examples, якщо вони лишаються.

Для живого проекту не замінювати реальний product context placeholders без явної інструкції.

### 9. Verification

Після міграції перевірити:

- `agent-start.md` існує і містить версію регламенту;
- `tasks/plan/progress.md` містить усі неархівні задачі;
- неархівні task folders не лежать у `tasks/backlog/`, `tasks/active/`, `tasks/done/`;
- `domain/current/` і `domain/target/` існують;
- старі `domain/current.md` і `domain/target.md` або перенесені, або явно залишені як виняток у `result.md`;
- `knowledge/package-index.md` вказує на актуальний `pdadm-mvp-reglament`;
- усі змінені папки мають актуальні `index.md`;
- `state.md` не перетворився на дубль усієї пам'яті;
- `result.md` містить список змінених файлів і unresolved conflicts.

## Completion Criteria

Міграція вважається завершеною, якщо:

- Project Memory працює за PDADM MVP 0.2;
- Starter Kit або проектна пам'ять має структуру Starter Kit 2.0 або явні винятки;
- накопичені project-specific дані не втрачені;
- агент може стартувати через `agent-start.md` без читання повного регламенту;
- нові задачі створюються в `tasks/plan/`;
- memory updates можуть виконуватися через `interactive-memory-update`;
- domain memory розкладена в `domain/current/` і `domain/target/` або має зафіксований план декомпозиції.
