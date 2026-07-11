# Migration Guide: PDADM MVP 0.4 -> MVP 0.5

Status: active
Source Version: PDADM MVP 0.4 / Starter Kit 4.0
Target Version: PDADM MVP 0.5 / Starter Kit 5.0
Agent Role: Agent Executor

## Призначення

Пряма самодостатня інструкція оновлення розгорнутої Project Memory 0.4 до 0.5 без ланцюгових migration guides і без втрати project-specific content.

Цей guide не вимагає повного тексту регламенту 0.4 як джерела чинних правил.

## Ключові зміни target state

- `Execution Mode` і окремі workflow видалені.
- Кожна задача використовує універсальний task run.
- Нова задача атомарно створюється з `RUN-001/context.md` у корені task folder.
- `result.md` створюється під час активації run.
- `requirements.md`, `worklog.md` і `closure.md` більше не є активними artifacts.
- `RSCH-*` і `FIX-*` живуть у корені task folder.
- Operational rules живуть у `reglament/`, project adaptations - у `project/`.
- Canonical memory changes застосовуються через approved `FIX-*` під час finalization.
- Knowledge package містить тільки current full reglament і цей direct guide.

## Непорушні обмеження

1. Не розпаковувати Starter Kit поверх наявної Project Memory без inventory і merge plan.
2. Не втрачати Product, Domain, Technical, Task або Knowledge content проекту.
3. Не переписувати completed/canceled/archived task artifacts лише заради нового формату.
4. Не змінювати reviewed `result.md`, `RSCH-*`, `FIX-*` або `closure.md` старих задач.
5. Не видаляти project-specific правила зі старих `memory-rules.md` або `agents/*.md` до їх класифікації й перенесення.
6. Не закривати migration task без verification і human review.

## Передумови

- Користувач явно дозволив migration.
- Source version підтверджена як 0.4 / Starter Kit 4.0.
- Є backup або інший перевірений rollback path.
- Migration має task boundary, scope, exclusions і acceptance criteria.

Якщо migration task створена за source rules 0.4, її legacy run не переписується. Після operational cutover створюється наступний root-level `RUN-N/` за правилами 0.5 для final verification і review.

## 1. Зафіксувати source inventory

Записати в migration result або окремий inventory:

- version markers у `README.md`, `state.md`, `agent-start.md`;
- наявні root `memory-rules.md` та `agents/`;
- project-specific правила всередині цих файлів;
- всі task folders і їх statuses;
- active/review/blocked tasks і current artifacts;
- historical completed/canceled/archive tasks;
- наявні custom templates;
- knowledge packages та adaptations;
- reports і indexes;
- Product/Domain/Technical files із реальним project content.

## 2. Підготувати rollback

- Створити backup Project Memory.
- Перевірити, що backup читається й містить повну структуру.
- Зафіксувати шлях і спосіб restore в migration result.
- Не використовувати ZIP release artifact як єдиний backup наявного project content.

## 3. Розділити operational і project-specific правила

Створити target folders:

```text
memory/reglament/
  index.md
  agents.md
  memory-rules.md

memory/project/
  index.md
  agents.md
  memory-rules.md
```

Класифікувати старий зміст:

- загальні правила PDADM замінити target файлами `reglament/`;
- project-specific agent rules перенести в `project/agents.md`;
- project-specific memory policy перенести в `project/memory-rules.md`;
- конфлікти зафіксувати й винести на рішення, не вирішувати мовчки.

Тільки після перевірки перенесення видалити active root `memory-rules.md` та active `agents/`.

## 4. Оновити startup і root navigation

Оновити:

- `memory/index.md`;
- `memory/README.md`;
- `memory/agent-start.md`;
- `memory/human-start.md`;
- `memory/state.md`;
- `memory/inbox.md`.

Target default boot packet:

```text
memory/agent-start.md
memory/reglament/agents.md
memory/reglament/memory-rules.md
```

`agent-start.md` має маршрутизувати читання `memory/project/*.md`.

## 5. Оновити Task Memory rules і templates

Оновити `memory/tasks/README.md`, tasks indexes, `progress.md` і templates.

Видалити active templates:

```text
templates/run-requirements.md
templates/worklog.md
```

Додати або оновити:

- `templates/task.md`;
- `templates/context.md`;
- `templates/result.md`;
- `templates/research-report.md`;
- `templates/research-detailed-report.md`;
- `templates/fixation.md`;
- `templates/audit-report.md`;
- `templates/agent-start.md`;
- `templates/human-start.md`;
- `templates/index.md`.

## 6. Не переписувати historical task artifacts

Для `done`, `canceled` та archived tasks:

- залишити legacy `runs/`, `research/`, `fixations/`, `worklog.md`, `closure.md` і їхні internal links як історичні artifacts;
- не видаляти `Execution Mode` або старі metadata з frozen history;
- не переносити файли лише заради нової форми;
- оновити тільки зовнішню навігацію, якщо без цього task недоступна.

Legacy history не є active template і не порушує target rules для нових run.

## 7. Обробити незавершені задачі

### Backlog

- Перевірити task contract.
- Видалити active `Execution Mode` із `task.md`.
- Створити наступний root-level `RUN-N/index.md` і `RUN-N/context.md`.
- Встановити `Current Run: RUN-N`, Task Status `backlog`, Run Status `prepared`.
- Старі невиконані legacy artifacts не видаляти мовчки; позначити superseded або пояснити в task history.

### Active або blocked

- Зафіксувати стан legacy current run без переписування історії.
- Створити наступний root-level `RUN-N/` з повним target `context.md`.
- Оновити `task.md` до 0.5 dashboard і current run.
- Відновити як `active` або `blocked` відповідно до фактичного blocker.

### Review

- Не змінювати reviewed artifacts.
- Або завершити review за source contract до structural cutover, або після `request changes` створити новий target run.
- Не трактувати migration як implicit approval.

У всіх випадках зберегти посилання на legacy artifacts у task history.

## 8. Оновити reports, glossary і technical links

- Перенести PDADM glossary з project `domain/glossary.md` у `reglament/memory-rules.md`.
- Залишити `domain/glossary.md` для понять реального проекту.
- Оновити Technical посилання зі старого `memory/memory-rules.md` на `reglament/` і `project/`.
- Оновити `reports/index.md` і `reports/research/index.md` під universal run model.
- Не переписувати існуючі detailed reports без змістової причини.

## 9. Оновити knowledge package регламенту

Target package:

```text
knowledge/packages/pdadm-mvp-reglament/
  index.md
  package.md
  mvp_one_to_one_0.5.md
  migration-from-0.4-to-0.5.md
```

Видалити з active Starter Kit:

- `historical/`;
- старі `migrations/`;
- `mvp_one_to_one_0.4.md`;
- дублюючі operational rules/workflows пакета.

Не видаляти інші project knowledge packages або adaptations.

## 10. Перевірити index integrity

Для кожної folder у `memory/` має існувати `index.md`.

Перевірити:

- root index;
- `reglament/` і `project/`;
- tasks, task folders і run folders;
- templates;
- reports;
- knowledge package;
- direct links після видалення legacy folders.

## 11. Завершити migration task у target model

Після operational cutover створити наступний root-level migration run, якщо current migration task була source-format:

```text
TASK-.../
  RUN-N/
    index.md
    context.md
    result.md
```

У `context.md` зафіксувати target verification contract. Під час активації створити `result.md`.

Виконати self-review або independent subagent review, потім передати migration task у human review.

## Verification checklist

- [ ] `README.md`, `state.md`, `agent-start.md` мають Starter Kit 5.0 / MVP 0.5.
- [ ] `reglament/` і `project/` існують та проіндексовані.
- [ ] Active root `memory-rules.md` і active `agents/` відсутні.
- [ ] Project-specific правила перенесені без втрати.
- [ ] `Execution Mode` відсутній в active rules, startup, task docs і templates.
- [ ] `templates/run-requirements.md` і `templates/worklog.md` відсутні.
- [ ] Нові task templates використовують root-level `RUN-*`, `RSCH-*`, `FIX-*`.
- [ ] `result.md` створюється під час run activation.
- [ ] Reviewed historical tasks не переписані.
- [ ] Кожна незавершена task має визначений target current run або явний migration decision.
- [ ] Canonical memory changes використовують `FIX-*` і finalization.
- [ ] Knowledge package містить тільки current reglament і direct guide.
- [ ] Product/Domain/Technical project content не втрачено.
- [ ] Усі folders мають `index.md`.
- [ ] Broken links і legacy active references відсутні.
- [ ] Language gate та architecture pressure перевірені.

## Rollback

Якщо verification не пройдено або втрачено project-specific content:

1. не подавати migration task як review-ready;
2. зафіксувати blocker і affected files;
3. відновити Project Memory із перевіреного backup або застосувати контрольований repair;
4. повторити migration тільки після уточнення причини.

## Очікуваний результат

Project Memory використовує compact operational layer 0.5, universal task run, нові templates і current-only reglament package, зберігаючи project-specific content та frozen task history 0.4.
