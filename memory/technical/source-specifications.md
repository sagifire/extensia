# Джерела технічної та доменної моделі

Status: accepted source policy
Effective: 2026-07-09

## Канонічні source files поточного етапу

| Файл | Статус джерела | Використання |
|---|---|---|
| `memory/references/extensia-v2/domain-model-v2.md` | authoritative draft | Чиста предметна модель, data contracts, relations та invariants. |
| `memory/references/extensia-v2/extension-and-api-model-v2-ioc.md` | authoritative draft | Extensia Module, facades, plugins, descriptors, hooks, results і public/internal boundary. |
| `memory/references/extensia-v2/runtime-architecture-v2-ioc.md` | authoritative draft | IoC composition, runtime modules, Core, operations, storage, index, journal, recovery і sync. |

`authoritative draft` означає: документ є єдиним design source для відповідної теми на поточному етапі, але conceptual signatures та unresolved policies ще можуть пройти окрему стабілізацію.

## Видалені obsolete files

| Файл | Статус | Причина |
|---|---|---|
| `v2/extension-and-api-model.md` | deleted in RUN-002 | Попередня модель без зовнішньої IoC dependency; не відповідає обраній архітектурній основі. |
| `v2/runtime-architecture.md` | deleted in RUN-002 | Попередня runtime architecture без `@sagifire/ioc`; не використовується в цьому проекті. |

Ці files фізично видалені. Їх не можна відновлювати як нормативні sources, використовувати для пропущених contracts, порівнювати як рівноправні alternatives або неявно додавати до актуальної моделі.

## Прийнята інтерпретація

1. Цільовий package release має version `0.1.0`.
2. `v2` є внутрішньою назвою етапу повного redesign, а не публічною version line.
3. Майбутня implementation обов'язково використовує `@sagifire/ioc` як internal composition layer.
4. Application public API залишається facade-first; IoC runtime не стає service locator для host application або normal plugins.
5. Project Memory стисло структурує рішення й статуси; detailed source references зберігаються в `memory/references/extensia-v2/`.

## Відоме source inconsistency

`memory/references/extensia-v2/runtime-architecture-v2-ioc.md` містить кілька stale references на видалений `extension-and-api-model.md`, зокрема в секціях меж документа та `6.12`. Відповідно до явної source policy для extension/API layer використовується тільки `memory/references/extensia-v2/extension-and-api-model-v2-ioc.md`. Reference content під час relocation не редагувався.

## Правило traceability

Accepted product requirements позначають джерела як `DM`, `API`, `RUN`, `USER` або `PKG`. У разі суперечності:

1. явне рішення користувача про scope/source/version має пріоритет;
2. відповідний authoritative draft визначає design baseline своєї теми;
3. Project Memory не посилює conceptual examples до stable contracts;
4. ambiguity переноситься в `domain/open-questions.md` або `technical/open-questions.md`.
