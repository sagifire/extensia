# Архітектура Extensia

Status: target-draft
Target Release: `0.1.0`
Updated: 2026-07-10

## Статус реалізації

Цей документ описує цільову архітектуру зі draft-специфікацій. Фактично реалізовані internal pure domain contract kernel, internal IoC composition/conformance skeleton та strict internal lifecycle host/controller slice з generic synchronous contributions, Extensia-owned async startup/rollback/stop і final composed-runtime disposal. Extensia Module, Core, Storage Driver, production subsystem map та public facades відсутні. Детальний current state зафіксовано в `memory/domain/current/implementation-state.md`. Internal lifecycle names/results не є стабілізованим public contract; концептуальні TypeScript signatures і production module sketches потребують окремих design gates.

## Архітектурна ідея

Extensia є embeddable in-process runtime-бібліотекою. Extensia Module використовує `@sagifire/ioc` для явної composition dependencies, а Core координує runtime semantics і всі state-changing operations.

```text
Host application
└─ Extensia Module
   ├─ Public API
   │  ├─ system facades: storage, query
   │  ├─ custom facades
   │  └─ plugin contracts / descriptors
   ├─ Extension layer
   │  ├─ Facade Registry та providers
   │  ├─ system extensions
   │  ├─ user plugins
   │  └─ hooks
   └─ Extensia Composition Root
      ├─ @sagifire/ioc Composer
      ├─ runtime modules, tokens, ports, adapters
      ├─ validation та immutable Composed Runtime
      └─ Extensia Runtime Controller
         └─ Core
            ├─ Operation Engine та operation scopes
            ├─ Async Lock Queue
            ├─ Hook System
            ├─ Hot Metadata Index
            ├─ Operation Journal
            ├─ External Change Sync
            └─ Storage Driver
               └─ Physical durable storage
```

## Розподіл відповідальності

### Extensia Module

Application-facing lifecycle boundary. Приймає config, нормалізує extension descriptors, створює Composition Root, запускає runtime і extensions, публікує frozen facade surface та виконує shutdown/disposal.

### `@sagifire/ioc`

Internal composition layer для typed tokens, runtime modules, explicit `requires` / `provides`, adapter bindings, multi contributions, graph validation, scopes, diagnostics і test overrides до `compose()`.

IoC layer не визначає доменні правила, operation pipeline, public DTO/results, plugin security або application API.

### Core

Internal runtime coordinator. Він підтримує доменні інваріанти, управляє writes, locks, Storage Driver, journal, index publication, hooks, recovery і external synchronization. Core не є dependency container.

### Storage Driver

Port до durable state. Driver приховує physical layout, metadata/file persistence, staging, storage-level lock, journal persistence та recovery primitives. Core працює з logical asset IDs, а не physical paths.

### Extension/API layer

Facades представляють capabilities application code. Plugins додають trusted in-process behavior через descriptors, hooks, facade providers і Core Extension Port. Звичайний plugin не отримує Composed Runtime або private tokens.

## Public і internal surfaces

| Surface | Основний користувач | Очікувана стабільність | Статус |
|---|---|---|---|
| Domain data contracts | Core, facades, plugins, application DTO code | висока | target-draft |
| Extensia Module та facades | application code | висока | target-draft |
| Plugin API, descriptors, hooks | plugin authors | висока/середня | target-draft |
| Core Extension Port | facades, trusted plugins | середня | target-draft |
| IoC capabilities | Composition Root, runtime modules | internal | target-draft |
| Private tokens/providers | module implementation | private | target-draft |

Правило межі: `IoC provides` не дорівнює Extensia public API. Capability стає public application surface тільки через documented Extensia Module method, facade або plugin contract.

## Composition і lifecycle

### Construction

Створення Extensia Module з config не активує runtime і не публікує ready facades.

### Composition

1. Validate й normalize config та extension descriptors.
2. Зареєструвати config, diagnostics, hooks, IDs, locks, storage, journal, index, operations, sync, core і system-extension modules.
3. Адаптувати user plugins у extension contributions.
4. Прив'язати Storage Driver та consumer-owned ports/adapters.
5. Провалідувати IoC composition graph і окремий Extensia extension graph.
6. Викликати `compose()` і отримати immutable Composed Runtime.

### Startup

1. Запустити Runtime Controller і Storage Driver.
2. Виконати recovery до ready state.
3. Побудувати або підготувати Hot Metadata Index.
4. Запустити External Change Sync, якщо він enabled.
5. Ініціалізувати system extensions і user plugins у dependency order.
6. Створити system/custom facades через providers.
7. Виконати plugin `start()` і заморозити Facade Registry.
8. Публікувати module state `started` тільки після успіху всіх required stages.

Startup failure після composition вимагає reverse cleanup і disposal. Partially initialized public surface не публікується як ready.

### Shutdown

Нові operations припиняють прийматися; plugins і extensions зупиняються у reverse lifecycle order; subscriptions, sync, runtime resources, driver і Composed Runtime звільняються. Failure одного plugin stop не має назавжди блокувати cleanup інших resources.

## Runtime module map

| Module | Головна відповідальність | Основні capabilities |
|---|---|---|
| `extensia.config` | validated runtime config | config, loading mode, actor, clock |
| `extensia.diagnostics` | normalized diagnostics | diagnostics port |
| `extensia.hooks` | event/filter registry | hook registry |
| `extensia.ids` | ID generation | ID generator |
| `extensia.locks` | process-local write synchronization | async lock queue |
| `extensia.storage` | binding/adapter до external driver | storage driver port |
| `extensia.journal` | journal service над driver | operation journal |
| `extensia.index` | process-local metadata read model | hot metadata index |
| `extensia.operations` | state-changing pipeline | operation engine |
| `extensia.sync` | journal-based external changes | external change sync |
| `extensia.core` | runtime coordination та extension boundary | runtime controller, Core Extension Port |
| `extensia.system-extensions` | default public API contributions | system extensions, facade providers |

Required ports мають бути consumer-owned, якщо module потребує вузького contract. Module-private providers не оголошуються у `provides` і не доступні поза module boundary.

## Operation model

State-changing operation має результат, еквівалентний послідовному виконанню, й проходить єдиний pipeline:

```text
public command / Core request
  → create operation ID and scope
  → build operation plan
  → validate input and driver capabilities
  → resolve affected entities
  → acquire ordered local locks
  → acquire storage-level write lock
  → load current committed state
  → run pre-commit filters
  → validate domain invariants
  → prepare staged changes
  → persist files / metadata
  → append committed journal entry
  → update local Hot Metadata Index
  → emit post-commit hooks
  → release locks/scope
  → return normalized result
```

Кожна operation має explicit scope для operation ID, actor, trace, warnings, cancellation та інших operation-local values. Scope не зберігає durable state і не замінює request або operation plan.

## Consistency model

- **Atomicity:** staged artifacts не стають visible final state до successful publication.
- **Consistency:** після success усі доменні інваріанти лишаються істинними.
- **Isolation through sequence:** process-local Async Lock Queue, storage-level write lock і journal sequence дають sequential write result.
- **Durability:** success означає stable metadata/files і committed journal entry, достатні для recovery.

`committed` journal entry є publication boundary. Hot Metadata Index оновлюється тільки після durable commit; post-commit hook failure не відкочує operation.

## Storage, index, journal і synchronization

- Storage Driver є durable source of truth і визначає capability mode `full` або `readonly`.
- `readonly` driver відхиляє writes до mutation, але підтримує reads.
- Hot Metadata Index є process-local і може бути full у `greedy` mode або partial у `lazy` mode.
- Поточний runtime забезпечує local read-after-write після index update.
- Інші processes бачать зміни після External Change Sync або explicit refresh; коротке stale window є допустимим baseline.
- External Change Sync читає journal after local cursor, застосовує тільки committed changes інших actors у sequence order та reload/invalidate affected entities.
- Direct external modification files/metadata в обхід Extensia не є базовим supported scenario.

## Facades, plugins і hooks

- `storage` є reserved system facade для commands; `query` — для read-only operations.
- Facade Registry приймає registrations тільки під час startup і заморожується до ready state.
- Custom facade має unique name, declared owner/dependencies і не обходить Core Extension Port.
- Required plugin/facade dependencies валідуються до ready state; config order є лише deterministic tie-breaker.
- Plugin Context містить controlled ports/registries, config і lifecycle info, але не container/get-by-token API.
- Pre-commit filters можуть normalize/validate/transform у межах contract без non-recoverable side effects.
- Post-commit events повідомляють про committed fact і не можуть rollback durable state.

## Errors, diagnostics і testing

Expected validation, lookup, capability, composition, extension і lifecycle failures повертаються як normalized results. Unexpected programming/invariant failures можуть бути thrown, але не маскуються як success.

Diagnostics розділяють composition, startup, operation, driver, sync і extension sources та не розкривають provider instances, secrets або private unsafe metadata.

Tests створюють fresh composition. Fakes й overrides застосовуються до `compose()`, а frozen production runtime не патчиться. Обов'язкові рівні перевірки: domain invariants, graph validation, lifecycle cleanup, readonly behavior, pipeline ordering, journal/index publication, recovery, extension dependencies, facade freeze та hook failure policy.

## Межі архітектури

Baseline не обіцяє dynamic extensions після startup, high-throughput distributed multi-writer model, automatic reconciliation direct storage edits, general-purpose DI access, network transport або untrusted plugin isolation.

## Architecture health

Фактичні Phase 1 kernel, composition skeleton і internal lifecycle slice поки не створюють істотного architecture pressure: вони використовують один Composition Root, не розширюють root API, розділяють ownership active-resource cleanup і graph disposal та не реалізують speculative production module map. Ризик design pressure лишається високим через широку цільову surface area. Implementation має йти вертикальними slices з dependency gates з `memory/product/roadmap.md`; спроба реалізувати всі підсистеми одним шаром буде сигналом для окремого architecture/design review.

## Джерела

- `memory/references/extensia-v2/runtime-architecture-v2-ioc.md`.
- `memory/references/extensia-v2/extension-and-api-model-v2-ioc.md`.
- `memory/references/extensia-v2/domain-model-v2.md` для доменних інваріантів, які runtime має підтримувати.
