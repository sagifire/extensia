# Архітектура Extensia

Status: target-draft
Target Release: `0.1.0`
Updated: 2026-07-10

## Статус реалізації

Цей документ описує цільову архітектуру зі draft-специфікацій. Фактично реалізовані internal pure domain contract kernel, IoC composition/conformance skeleton, strict internal lifecycle host/controller, bounded BP2-02 Core Resource read module, BP2-03 shared Facade Provider/Registry із system `query`/`storage` adapters та BP2-04 public Extensia Module read slice; BP2-05 незалежно повторно перевірила й стабілізувала цей сукупний baseline без production code changes, результат прийнятий whole-task human review. Registry має trusted provenance, dependency-aware build, freeze, atomic ready publication, intake drain і reverse cleanup; root package публікує `createExtensia` та bounded Phase 2 type contracts. Final Storage Driver, successful writes, journal і recovery відсутні. Детальний current state зафіксовано в `memory/domain/current/implementation-state.md`. Internal lifecycle/driver/index/facade names не є package API; ширші conceptual signatures і subsystem sketches потребують окремих design gates.

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

### Applied P2-DG1 read boundary

Phase 2 реалізувала exact root-only `createExtensia(config)` boundary: construction side-effect-free, safe descriptor extraction не викликає getters, invalid/accessor config зберігається sentinel і дає `CONFIG_INVALID` до resources; factory capture-ить driver identity у frozen envelope й не reread-ить caller envelope. Module має dedicated nullable `query()`/`storage()` і лише `getResource`/`getResourceTree`. Shared consumer-owned read-port/token seam materialized у BP2-01A, BP2-02 реалізувала provider над greedy Resource index, BP2-03 реалізувала internal Registry/system adapters із freeze, atomic ready publication, intake close-and-drain та readonly rejection proof, а BP2-04 інтегрувала їх в один application-visible lifecycle. P3-DG1 прийняв target [write/journal/recovery contract](write-journal-recovery-contract.md), а BP3-01A materialize-ила його shared source-only seams: driver/session/transaction/journal contracts, consumer-owned default API Core write port, operation identity/clock tokens і prepared greedy-index change. BP3-02 додала internal atomic normalized multi-key lock queue та generic Operation Engine foundation: conflicting FIFO/non-conflicting progress, explicit disposable scopes, cancellation до staging, close-and-drain і committed warning/fail-close outcome. Resource handlers, driver runtime wiring і public successful writes ще не реалізовані; другий read або write contract не допускається.

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
  → stage metadata through driver transaction
  → outcome-definite semantic commit metadata + exactly one committed journal entry
  → publish prepared local Hot Metadata Index change
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

`committed` journal entry є publication boundary. P3-DG1 уточнює її як driver-owned transaction commit: resolve означає committed, reject — not committed; independent append path заборонений. Core готує immutable index change під recovery-clean exclusive storage session до commit і publish-ить synchronous no-fail swap після resolve. Post-commit local fault не відкочує operation, а повертає committed success із bounded warning та fail-close runtime.

## Storage, index, journal і synchronization

- Storage Driver є durable source of truth і визначає capability mode `full` або `readonly`.
- `readonly` driver відхиляє writes до mutation, але підтримує reads.
- Full-mode ready gate утримує одну recovery-clean exclusive storage session через recovery, committed scan, index build і journal-head capture.
- Persistent journal містить лише committed entries з contiguous positive-decimal sequence від `1`; Timestamp не задає order.
- Full application config використовує opaque driver handle; callable transaction/session не входять у Module або facade boundary.
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

Фактичні Phase 1 foundations і bounded BP2-02/BP2-03/BP2-04 slices не створюють істотного architecture pressure: вони використовують один Composition Root, один consumer-owned shared read seam, один Facade Provider/Registry mechanism і один lifecycle host. Public Module лише bind-ить readonly driver та мапить application lifecycle/results; index лишається derived від driver, а facade/Core cleanup і graph disposal мають розділене ownership. Lifecycle отримав generic synchronous ready-publication hook замість facade-specific wiring. BP2-05 risk-based scan і executable matrices не виявили duplicate wiring, hidden write/Journal path, accidental public Core/IoC surface або потребу в workaround. Ризик design pressure лишається високим через широку цільову surface area. Implementation має йти вертикальними slices з dependency gates з `memory/product/roadmap.md`; спроба додати lazy completeness, writes, plugin API або public Core/IoC через ці internal modules буде сигналом для окремого architecture/design review.

## Джерела

- `memory/references/extensia-v2/runtime-architecture-v2-ioc.md`.
- `memory/references/extensia-v2/extension-and-api-model-v2-ioc.md`.
- `memory/references/extensia-v2/domain-model-v2.md` для доменних інваріантів, які runtime має підтримувати.
