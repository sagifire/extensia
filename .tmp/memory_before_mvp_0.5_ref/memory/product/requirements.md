# Продуктові вимоги

Updated: 2026-07-09
Target Release: `0.1.0`

## Статус

Усі зафіксовані нижче вимоги мають статус `accepted` на підставі явного рішення користувача від 2026-07-09.

`accepted` означає, що вимога є прийнятою частиною product/domain/runtime target. Це не робить conceptual TypeScript examples автоматично stabilized public signatures і не закриває явно зафіксовані domain/technical open questions.

## Джерела

- `USER` — явні інструкції користувача від 2026-07-09.
- `PKG` — поточний `package.json`.
- `DM` — `memory/references/extensia-v2/domain-model-v2.md`.
- `API` — `memory/references/extensia-v2/extension-and-api-model-v2-ioc.md`.
- `RUN` — `memory/references/extensia-v2/runtime-architecture-v2-ioc.md`.

## Ідентичність і позиціювання

| ID | Вимога | Статус | Джерело |
|---|---|---|---|
| REQ-ID-001 | Публічна версія нового релізу Extensia має бути `0.1.0`. | accepted | USER, PKG |
| REQ-ID-002 | `v2` має використовуватись лише як внутрішнє позначення етапу повного редизайну, а не як release version. | accepted | USER |
| REQ-POS-001 | Extensia має бути in-process бібліотекою, яку host application запускає у власному процесі. | accepted | API, RUN |
| REQ-POS-002 | Extensia не має автоматично ставати server, network API, CMS, DI framework, distributed database або sandbox для plugins. | accepted | API, RUN |

## Домен

| ID | Вимога | Статус | Джерело |
|---|---|---|---|
| REQ-DOM-001 | `Resource` має бути центральним агрегатом із metadata, assets, marks, KV та optional parent relation. | accepted | DM |
| REQ-DOM-002 | `Asset` має належати рівно одному `Resource` і представляти internal file descriptor або external URL. | accepted | DM |
| REQ-DOM-003 | `Resource` hierarchy має бути деревом; `parent_id` є source of truth, а `children[]` — лише похідною projection. | accepted | DM |
| REQ-DOM-004 | У межах `Resource` допускається не більше одного primary asset. | accepted | DM |
| REQ-DOM-005 | `Mark` має забезпечувати унікальність `type + name`, а `value` — бути `null` або 32-bit signed integer. | accepted | DM |
| REQ-DOM-006 | `KV` має зберігати довільні рядкові атрибути у формі `namespace -> key -> string value`. | accepted | DM |
| REQ-DOM-007 | External asset має мати `url != null` та `is_on_uploading = false`; internal asset має мати `url = null`. | accepted | DM |

## Public API та extensions

| ID | Вимога | Статус | Джерело |
|---|---|---|---|
| REQ-API-001 | Extensia Module має бути головною точкою construction, startup, facade access, shutdown і runtime disposal. | accepted | API, RUN |
| REQ-API-002 | Application code має працювати через system/custom facades, а не через Core або raw IoC token lookup. | accepted | API |
| REQ-API-003 | Базова поставка має надавати reserved system facades `storage` для commands і `query` для reads. | accepted | API |
| REQ-API-004 | Public facade methods мають повертати normalized result для expected failures. | accepted | API, RUN |
| REQ-API-005 | Повернуті DTO мають бути snapshots; durable state змінюється тільки explicit command. | accepted | API |
| REQ-API-006 | Facade Registry має збиратися під час startup і заморожуватися до successful return із `start()`. | accepted | API |
| REQ-EXT-001 | Plugins мають розширювати систему через descriptors, lifecycle, hooks, facade providers і Core Extension Port. | accepted | API |
| REQ-EXT-002 | Required plugin/facade/capability dependencies мають бути задекларовані й перевірені до ready state. | accepted | API |
| REQ-EXT-003 | Plugins мають вважатися trusted in-process code; plugin system не є security boundary. | accepted | API, RUN |
| REQ-EXT-004 | Звичайний Plugin Context не має бути IoC container або arbitrary service locator. | accepted | API |
| REQ-EXT-005 | Pre-commit filter failure може зупинити operation; post-commit event failure не має відкочувати committed state. | accepted | API, RUN |

## Runtime та зберігання

| ID | Вимога | Статус | Джерело |
|---|---|---|---|
| REQ-RUN-001 | Runtime composition має будуватися на `@sagifire/ioc` як internal dependency, не як public application API. | accepted | USER, API, RUN |
| REQ-RUN-002 | Composition graph має бути validated до startup та immutable після `compose()`. | accepted | API, RUN |
| REQ-RUN-003 | Усі state-changing operations мають проходити через Core operation pipeline. | accepted | API, RUN |
| REQ-RUN-004 | Storage Driver має бути durable source of truth і приховувати physical storage layout від Core. | accepted | RUN |
| REQ-RUN-005 | Runtime має підтримувати `full` і `readonly` storage capability modes; writes у `readonly` mode відхиляються до mutation. | accepted | API, RUN |
| REQ-RUN-006 | Write model має бути еквівалентною послідовному виконанню через process-local locks, storage-level write lock і journal ordering. | accepted | RUN |
| REQ-RUN-007 | Кожна committed operation має мати journal entry; `committed` entry є publication boundary. | accepted | RUN |
| REQ-RUN-008 | Hot Metadata Index має бути process-local read model, а не durable source of truth, і оновлюватися тільки після commit. | accepted | RUN |
| REQ-RUN-009 | Recovery має завершуватися до ready state й відновлювати останній коректний committed state. | accepted | RUN |
| REQ-RUN-010 | External Change Sync має застосовувати committed journal changes до process-local index у journal order. | accepted | RUN |
| REQ-RUN-011 | Runtime має підтримувати `greedy` і `lazy` metadata loading modes із явно різною completeness semantics. | accepted | RUN |
| REQ-RUN-012 | Operation-local state має передаватися через explicit operation scopes, а не global mutable context. | accepted | RUN |

## Якість і сумісність

| ID | Вимога | Статус | Джерело |
|---|---|---|---|
| REQ-QLT-001 | Composition, lifecycle, extension graph, operation invariants, recovery та failure cleanup мають бути testable через fresh composition і pre-compose overrides. | accepted | API, RUN |
| REQ-QLT-002 | Diagnostics мають бути normalized і не розкривати private provider instances, secrets або unsafe config. | accepted | API, RUN |
| REQ-QLT-003 | Public facade API, plugin contract, hook API, Core Extension Port та internal IoC contracts мають мати різні compatibility boundaries. | accepted | API |

## Accepted requirements і stabilization gates

Усі 37 requirements прийняті. Конкретні TypeScript signatures у reference specifications переважно позначені як conceptual. Остаточні method names, config shape, hook names, token catalog, exact result types, Storage Driver methods і Advanced IoC Extension Module API уточнюються без зміни прийнятої суті requirements та проходять окремі design/review gates.
