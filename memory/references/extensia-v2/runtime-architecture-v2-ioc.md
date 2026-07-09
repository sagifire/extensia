# Extensia

## Runtime Architecture v2

> Статус: draft  
> Орієнтир інтеграції: `@sagifire/ioc` `0.0.2`  
> Призначення: зафіксувати runtime-архітектуру Extensia v2 з урахуванням внутрішнього composition layer на базі `@sagifire/ioc`, без повторного опису чистої предметної моделі та без детального опису публічного API / плагінної моделі.

---

# 1. Межі документа

Цей документ описує runtime-архітектуру Extensia v2:

* як створюється, валідовується і запускається runtime Extensia
* як `@sagifire/ioc` використовується для композиції залежностей
* які runtime-модулі, токени, порти і capabilities існують на системному рівні
* як Core координує підсистеми виконання
* як Storage Driver ізолює Core від фізичного сховища
* як виконуються модифікаційні операції
* як працюють Hot Metadata Index, Operation Journal, Async Lock Queue і External Change Sync
* як runtime підтримує immutable composition boundary, operation scopes, diagnostics і test overrides

Документ не описує детально:

* доменні сутності `Resource`, `Asset`, `Mark`, `KV`
* публічні API-фасади бібліотеки
* повний контракт користувацьких плагінів
* детальний дизайн Facade Registry
* конкретний фізичний формат зберігання файлів і метаданих
* UI, серверний шар або мережеву доставку файлів

Ці теми належать до окремих документів:

* `domain-model-v2.md`
* `extension-and-api-model.md`

---

# 2. Архітектурна ідея

Extensia є embeddable runtime-бібліотекою. Вона запускається всередині процесу застосунку і надає ядро для керованої роботи з медіа-ресурсами.

Extensia не є окремим сервером. Вона не відкриває мережевий API сама по собі. Застосунок може побудувати сервер, CLI, desktop-інструмент, game tooling або інший продукт поверх Extensia, але сама бібліотека залишається in-process runtime-компонентом.

Ключова архітектурна ідея v2:

**Extensia Module використовує `@sagifire/ioc` як внутрішній composition layer для складання immutable runtime-графа, а Core залишається runtime-координатором усіх state-changing операцій.**

У спрощеному вигляді:

```text
Application process
└─ Extensia Module
   ├─ Extensia Composition Root
   │  ├─ @sagifire/ioc Composer
   │  ├─ runtime modules
   │  ├─ storage driver binding
   │  ├─ system extension modules
   │  ├─ user extension adapters
   │  └─ validate + compose
   │
   ├─ Composed Runtime (@sagifire/ioc)
   │  ├─ exported runtime capabilities
   │  ├─ module-private providers
   │  ├─ scopes
   │  └─ diagnostics / inspection
   │
   ├─ Extensia Runtime Controller
   │  └─ Core
   │     ├─ Hook System
   │     ├─ ID Generator
   │     ├─ Async Lock Queue
   │     ├─ Hot Metadata Index
   │     ├─ Operation Engine
   │     ├─ Operation Journal
   │     ├─ External Change Sync
   │     └─ Storage Driver
   │        └─ Physical storage
   │
   └─ Public facades / plugins
      └─ Core Extension Port
```

`@sagifire/ioc` не замінює Core. Він відповідає за створення, перевірку, ізоляцію і lifecycle-boundary залежностей. Core відповідає за runtime-семантику, інваріанти, операції, журнал, індекси, замки і recovery.

---

# 3. Основні архітектурні принципи

## 3.1. Core-first orchestration

Усі критичні state-changing операції проходять через Core.

Core не є контейнером залежностей. Він відповідає за:

* ініціалізацію runtime-підсистем
* виконання модифікаційних операцій
* підтримку доменних інваріантів
* координацію Storage Driver
* захоплення локальних і storage-level замків
* запис Operation Journal
* оновлення Hot Metadata Index
* запуск pre-commit і post-commit hooks
* recovery після crash або неповних staged-змін
* синхронізацію зовнішніх committed-змін

`@sagifire/ioc` може створити Core і передати йому залежності, але не виконує за Core операційну модель.

## 3.2. IoC as composition layer

`@sagifire/ioc` використовується як внутрішній composition layer Extensia Module.

Його роль:

* визначити typed tokens для runtime-портів і capabilities
* описати runtime-підсистеми як modules
* явно оголосити `requires` і `provides`
* зв’язати required ports через application-level bindings або adapter bindings
* провалідовати граф до старту runtime
* створити immutable composed runtime
* надати operation/request scopes
* забезпечити diagnostics та graph inspection
* дозволити test overrides до `compose()`

IoC layer не є публічним API Extensia для звичайного користувача. Користувацький код працює через Extensia Module, facades і plugins.

## 3.3. Immutable runtime boundary

Runtime має дві фази:

```text
mutable composition phase
  ↓
validate graph
  ↓
compose immutable runtime
  ↓
start Extensia runtime
```

До `compose()` можна додавати modules, bindings, adapters і test overrides.

Після `compose()` runtime-граф вважається immutable:

* providers не додаються
* providers не замінюються
* module graph не перебудовується
* facade registry публікується як stable surface після startup
* runtime-dependent operations виконуються тільки через уже складений graph

Динамічне підключення розширень після старту може бути майбутньою окремою можливістю, але воно не є базовим правилом v2.

## 3.4. Explicit tokens and ports

Усі системні залежності мають мати явні токени.

Токени не мають генеруватися всередині operation handlers, plugin hooks або request handlers. Вони мають бути стабільними і оголошеними на module boundary.

Приклад:

```ts
import { token } from '@sagifire/ioc'

export const EXTENSIA_CONFIG = token<IExtensiaRuntimeConfig>('extensia.config')
export const EXTENSIA_RUNTIME_CONTROLLER = token<IExtensiaRuntimeController>('extensia.runtime.controller')

export const CORE_EXTENSION_PORT = token<ICoreExtensionPort>('extensia.core.extension-port')
export const STORAGE_DRIVER = token<IStorageDriver>('extensia.storage.driver')
export const HOOK_REGISTRY = token<IHookRegistry>('extensia.hooks.registry')
export const ID_GENERATOR = token<IIdGenerator>('extensia.ids.generator')
export const ASYNC_LOCK_QUEUE = token<IAsyncLockQueue>('extensia.locks.async-queue')
export const HOT_METADATA_INDEX = token<IHotMetadataIndex>('extensia.index.hot-metadata')
export const OPERATION_ENGINE = token<IOperationEngine>('extensia.operations.engine')
export const OPERATION_JOURNAL = token<IOperationJournal>('extensia.operations.journal')
export const EXTERNAL_CHANGE_SYNC = token<IExternalChangeSync>('extensia.sync.external-changes')
export const DIAGNOSTICS = token<IDiagnosticsPort>('extensia.diagnostics')
```

## 3.5. Public capability is not public application API

`@sagifire/ioc` має поняття module capabilities, які доступні з composed runtime. Це не те саме, що публічний API Extensia для застосунку.

Extensia має розрізняти:

* **IoC public capability** — capability, яку може отримати Extensia Module або інший runtime module з composed runtime
* **Extensia public API** — facade або метод Extensia Module, доступний користувацькому коду

Наприклад, `EXTENSIA_RUNTIME_CONTROLLER` може бути IoC capability, але він не має автоматично ставати user-facing API.

## 3.6. Module-private providers by default

Провайдери, які не оголошені у `provides`, мають бути module-private.

Це правило потрібне для того, щоб:

* не розкривати внутрішні implementation details
* не перетворити runtime на service locator
* не дозволити extension modules напряму діставати приватні Core-підсистеми
* зберегти можливість рефакторингу runtime без ламання plugin/facade API

## 3.7. Operation scopes for operation-local state

Operation-specific дані не мають зберігатися у глобальному singleton state.

Для даних, які живуть у межах однієї operation, використовується explicit scope:

* `operation_id`
* `actor_id`
* trace / diagnostic context
* cancellation signal
* warning collector
* operation-local unit of work
* temporary policy overrides, якщо вони явно дозволені

Operation scope не замінює operation pipeline. Він лише передає operation-local контекст у провайдери, яким цей контекст потрібен.

## 3.8. Storage-driver abstraction

Core не залежить від конкретної файлової системи, S3, NFS, packed-storage формату або іншого фізичного носія.

Фізичне зберігання делегується Storage Driver.

Driver відповідає за:

* metadata persistence
* asset files
* upload staging
* journal persistence
* storage-level write lock
* low-level recovery primitives
* driver-specific reconciliation, якщо вона підтримується

## 3.9. Sequential write model

Модифікаційні операції мають давати результат, еквівалентний послідовному виконанню.

Для цього використовуються два рівні синхронізації:

* локальна Async Lock Queue в межах одного процесу
* storage-level write lock на рівні Storage Driver для multi-process сценаріїв

Fine-grained distributed locking не є базовою моделлю Extensia v2.

## 3.10. Journal-backed synchronization

Operation Journal є runtime-механізмом коректності.

Він використовується для:

* durability-публікації committed operations
* recovery після аварійного завершення
* синхронізації process-local індексів між кількома екземплярами Extensia
* діагностики incomplete або failed operations

Журнал не є доменною моделлю і не є public API.

---

# 4. Головні runtime-поняття

## 4.1. Extensia Module

**Extensia Module** — головний об’єкт бібліотеки, який створюється користувацьким кодом.

Його відповідальність:

* прийняти конфігурацію
* створити Extensia Composition Root
* зареєструвати runtime modules
* прив’язати Storage Driver та інші зовнішні залежності
* провалідовати composition graph
* створити immutable composed runtime
* запустити Extensia Runtime Controller
* підключити system extensions і user extensions
* надати public facades
* коректно зупинити runtime і dispose composed runtime

## 4.2. Extensia Composition Root

**Extensia Composition Root** — внутрішній шар Extensia Module, який володіє `@sagifire/ioc` composer.

Composition Root виконує:

```text
read config
  ↓
create composer
  ↓
register runtime modules
  ↓
bind external dependencies
  ↓
register extension adapter modules
  ↓
validate graph
  ↓
compose immutable runtime
  ↓
resolve runtime controller
```

Жодна runtime-підсистема не має самостійно створювати глобальний контейнер.

## 4.3. Composed Runtime

**Composed Runtime** — immutable runtime, який повертає `@sagifire/ioc` після `compose()`.

Він використовується Extensia Module для:

* отримання exported runtime capabilities
* створення operation scopes
* lifecycle disposal
* diagnostics / inspection у developer tooling
* test harness інтеграції

Composed Runtime не передається напряму користувацьким плагінам за базовим правилом. Плагіни отримують Plugin Context і Core Extension Port.

## 4.4. Extensia Runtime Controller

**Extensia Runtime Controller** — системний capability, який керує lifecycle runtime.

Він є тонким orchestration-об’єктом над Core і системними підсистемами.

Концептуальний контракт:

```ts
interface IExtensiaRuntimeController {
    start(): Promise<IExtensiaResult<void>>
    stop(): Promise<IExtensiaResult<void>>
    getState(): ExtensiaRuntimeState
}

type ExtensiaRuntimeState =
    | 'created'
    | 'starting'
    | 'started'
    | 'stopping'
    | 'stopped'
    | 'failed'
```

Controller може бути IoC capability, але не є user-facing API.

## 4.5. Core

**Core** — внутрішнє системне ядро Extensia.

Core координує runtime-підсистеми і є головним виконавцем операційної моделі.

Користувацький код не має напряму залежати від внутрішнього Core. Для інтеграції використовуються facades, plugins і Core Extension Port.

## 4.6. Runtime Module

**Runtime Module** — `@sagifire/ioc` module, який описує одну частину runtime-графа.

Module може:

* оголошувати required ports
* оголошувати provided capabilities
* реєструвати private providers
* реєструвати lifecycle resources
* надавати adapters між capabilities і consumer-owned ports

Runtime Module не має виконувати operation logic у `setup()`. `setup()` реєструє providers, а не запускає runtime.

## 4.7. Storage Driver

**Storage Driver** — реалізація абстрактного контракту фізичного сховища.

Driver приховує від Core конкретний спосіб зберігання metadata, files, staged artifacts і journal.

## 4.8. Operation

**Operation** — модифікаційна runtime-дія, яка змінює durable state Extensia.

Read-only запити не є operation у цьому сенсі і не записуються в Operation Journal.

## 4.9. Hot Metadata Index

**Hot Metadata Index** — process-local індекс metadata, який використовується для швидкого пошуку, перевірок і побудови похідних представлень.

Він не є джерелом довговічного стану.

## 4.10. Operation Journal

**Operation Journal** — append-only журнал committed-змін, який підтримує durability publication, recovery і multi-process synchronization.

## 4.11. External Change Sync

**External Change Sync** — підсистема, яка читає Operation Journal і актуалізує process-local Hot Metadata Index, коли інші екземпляри Extensia виконали committed operations.

---

# 5. IoC token and capability model

## 5.1. Категорії токенів

Runtime-токени поділяються на кілька категорій.

### Configuration tokens

Використовуються для validated config values:

```ts
EXTENSIA_CONFIG
CORE_LOADING_MODE
ACTOR_ID
RUNTIME_CLOCK
```

### External dependency ports

Залежності, які надає застосунок або driver package:

```ts
STORAGE_DRIVER
STORAGE_DRIVER_FACTORY
ASSET_STREAM_FACTORY
```

### Core subsystem tokens

Внутрішні runtime-підсистеми:

```ts
HOOK_REGISTRY
ID_GENERATOR
ASYNC_LOCK_QUEUE
HOT_METADATA_INDEX
OPERATION_ENGINE
OPERATION_JOURNAL
EXTERNAL_CHANGE_SYNC
```

### Runtime lifecycle tokens

Системні lifecycle capabilities:

```ts
EXTENSIA_RUNTIME_CONTROLLER
RUNTIME_STARTUP_TASKS
RUNTIME_STOP_TASKS
```

### Extension boundary tokens

Контрольовані поверхні для extension/API layer:

```ts
CORE_EXTENSION_PORT
FACADE_REGISTRY_PORT
SYSTEM_EXTENSION_CONTRIBUTIONS
```

### Operation scope tokens

Operation-local дані:

```ts
OPERATION_ID
OPERATION_ACTOR_ID
OPERATION_TRACE
OPERATION_WARNINGS
OPERATION_ABORT_SIGNAL
```

## 5.2. Naming convention

Token IDs мають бути стабільними і namespaced:

```text
extensia.config
extensia.core.extension-port
extensia.storage.driver
extensia.operations.engine
extensia.operation.id
```

Правила:

1. Token ID не має залежати від runtime config.
2. Token ID не має генеруватися динамічно.
3. Internal tokens мають бути задокументовані як internal.
4. Public extension tokens мають бути явно позначені як public або experimental.
5. Storage-driver-specific tokens мають мати власний namespace driver-а.

## 5.3. Provides / requires

Кожен runtime module має явно оголошувати, що він потребує і що надає.

Приклад:

```ts
import { defineModule } from '@sagifire/ioc'

export const operationModule = defineModule({
    id: 'extensia.operations',

    requires: [
        { token: STORAGE_DRIVER, description: 'Physical storage port' },
        { token: ASYNC_LOCK_QUEUE, description: 'Process-local operation locks' },
        { token: OPERATION_JOURNAL, description: 'Durability publication journal' },
        { token: HOT_METADATA_INDEX, description: 'Process-local metadata index' },
        { token: HOOK_REGISTRY, description: 'Runtime hooks' }
    ],

    provides: [
        { token: OPERATION_ENGINE, kind: 'shared-service' }
    ],

    setup(ctx) {
        ctx.bind(OPERATION_ENGINE).toFactory(({ get }) => {
            return createOperationEngine({
                storage: get(STORAGE_DRIVER),
                locks: get(ASYNC_LOCK_QUEUE),
                journal: get(OPERATION_JOURNAL),
                index: get(HOT_METADATA_INDEX),
                hooks: get(HOOK_REGISTRY)
            })
        }).singleton()
    }
})
```

## 5.4. Required ports are consumer-owned

Якщо module потребує залежність у вузькому вигляді, він має оголосити власний required port, а composition root має адаптувати його з іншої capability.

Це зменшує coupling між modules.

Приклад:

```ts
export const SYNC_JOURNAL_READER = token<IJournalReader>('extensia.sync.journal-reader')

export const externalSyncModule = defineModule({
    id: 'extensia.sync',
    requires: [
        { token: SYNC_JOURNAL_READER, description: 'Journal reader shaped for external sync' },
        { token: HOT_METADATA_INDEX }
    ],
    provides: [
        { token: EXTERNAL_CHANGE_SYNC, kind: 'shared-service' }
    ],
    setup(ctx) {
        ctx.bind(EXTERNAL_CHANGE_SYNC).toFactory(({ get }) => {
            return createExternalChangeSync({
                journal: get(SYNC_JOURNAL_READER),
                index: get(HOT_METADATA_INDEX)
            })
        }).singleton()
    }
})
```

Composition root може задовольнити `SYNC_JOURNAL_READER` через adapter над `OPERATION_JOURNAL`.

## 5.5. Private providers

Module-private providers використовуються для implementation details.

Приклад:

```ts
const OPERATION_PLANNER = token<IOperationPlanner>('extensia.operations.private.planner')

export const operationModule = defineModule({
    id: 'extensia.operations',
    provides: [
        { token: OPERATION_ENGINE, kind: 'shared-service' }
    ],
    setup(ctx) {
        ctx.bind(OPERATION_PLANNER).toFactory(() => createOperationPlanner()).singleton()

        ctx.bind(OPERATION_ENGINE).toFactory(({ get }) => {
            return createOperationEngine({
                planner: get(OPERATION_PLANNER)
            })
        }).singleton()
    }
})
```

`OPERATION_PLANNER` не має бути доступним через Extensia public API або Plugin Context.

---

# 6. Runtime module map

Базова runtime-композиція Extensia v2 складається з таких modules.

## 6.1. `extensia.config`

Відповідає за validated runtime config.

Provides:

* `EXTENSIA_CONFIG`
* `CORE_LOADING_MODE`
* `ACTOR_ID`
* `RUNTIME_CLOCK`, якщо clock налаштовується

## 6.2. `extensia.diagnostics`

Відповідає за diagnostics channel і normalized runtime reports.

Provides:

* `DIAGNOSTICS`

## 6.3. `extensia.hooks`

Відповідає за Hook Registry.

Provides:

* `HOOK_REGISTRY`

## 6.4. `extensia.ids`

Відповідає за генерацію IDs.

Provides:

* `ID_GENERATOR`

## 6.5. `extensia.locks`

Відповідає за process-local Async Lock Queue.

Provides:

* `ASYNC_LOCK_QUEUE`

## 6.6. `extensia.storage`

Відповідає за binding або adapter до Storage Driver.

Provides або binds:

* `STORAGE_DRIVER`

У базовій конфігурації Storage Driver може бути application-level binding, а не module capability.

## 6.7. `extensia.journal`

Відповідає за Operation Journal service над Storage Driver.

Requires:

* `STORAGE_DRIVER`
* `ID_GENERATOR`
* `RUNTIME_CLOCK`

Provides:

* `OPERATION_JOURNAL`

## 6.8. `extensia.index`

Відповідає за Hot Metadata Index.

Requires:

* `CORE_LOADING_MODE`
* `STORAGE_DRIVER`
* `OPERATION_JOURNAL`
* `DIAGNOSTICS`

Provides:

* `HOT_METADATA_INDEX`

## 6.9. `extensia.operations`

Відповідає за Operation Engine.

Requires:

* `STORAGE_DRIVER`
* `ASYNC_LOCK_QUEUE`
* `HOT_METADATA_INDEX`
* `OPERATION_JOURNAL`
* `HOOK_REGISTRY`
* `ID_GENERATOR`
* `DIAGNOSTICS`

Provides:

* `OPERATION_ENGINE`

## 6.10. `extensia.sync`

Відповідає за External Change Sync.

Requires:

* `STORAGE_DRIVER`
* `OPERATION_JOURNAL`
* `HOT_METADATA_INDEX`
* `HOOK_REGISTRY`
* `DIAGNOSTICS`

Provides:

* `EXTERNAL_CHANGE_SYNC`

## 6.11. `extensia.core`

Відповідає за створення Core і Core Extension Port.

Requires:

* `STORAGE_DRIVER`
* `HOOK_REGISTRY`
* `ID_GENERATOR`
* `ASYNC_LOCK_QUEUE`
* `HOT_METADATA_INDEX`
* `OPERATION_ENGINE`
* `OPERATION_JOURNAL`
* `EXTERNAL_CHANGE_SYNC`
* `DIAGNOSTICS`

Provides:

* `CORE_EXTENSION_PORT`
* `EXTENSIA_RUNTIME_CONTROLLER`

Core object сам по собі може бути private provider всередині `extensia.core`.

## 6.12. `extensia.system-extensions`

Відповідає за системні extension contributions, які потрібні для default API layer.

Runtime document описує тільки boundary. Детальний контракт system plugins і facades належить до `extension-and-api-model.md`.

Provides можуть включати:

* `SYSTEM_EXTENSION_CONTRIBUTIONS`
* `FACADE_REGISTRY_PORT`, якщо registry створюється на runtime-рівні

---

# 7. Концептуальний runtime config

Фінальний TypeScript API може бути іншим. Цей контракт описує capabilities, які runtime має отримати під час composition phase.

```ts
type CoreLoadingMode = 'greedy' | 'lazy'
type StorageCapabilityMode = 'full' | 'readonly'

interface IExtensiaRuntimeConfig {
    core: {
        mode: CoreLoadingMode
        actorId?: string
    }

    storage: {
        driver: IStorageDriver
    }

    sync?: {
        enabled?: boolean
        pollIntervalMs?: number
        autoRefreshOnRead?: boolean
    }

    diagnostics?: {
        level?: 'silent' | 'error' | 'warning' | 'debug'
    }
}
```

Config validation має відбутися до `compose()` або під час dedicated config module setup.

Помилки config validation мають зупиняти startup до створення активних runtime resources.

---

# 8. Режими роботи

## 8.1. Core loading mode

Core loading mode визначає, як Extensia завантажує metadata у Hot Metadata Index.

```ts
type CoreLoadingMode = 'greedy' | 'lazy'
```

### Greedy mode

У `greedy` режимі Core під час startup завантажує metadata всіх доступних resources і будує повний Hot Metadata Index.

Переваги:

* швидкий пошук після старту
* повна process-local картина сховища
* простіша робота з глобальними індексами
* передбачувані перевірки наявності ресурсів, assets і marks

Недоліки:

* довший старт
* більше використання пам’яті
* потреба актуалізувати повний індекс при external changes

### Lazy mode

У `lazy` режимі Core не завантажує всі metadata одразу.

Metadata завантажуються тоді, коли потрібні для конкретної operation або read request.

Переваги:

* швидший startup
* менше використання пам’яті
* краще підходить для великих сховищ, де потрібна лише частина resources

Недоліки:

* перше звернення до resource може бути повільнішим
* глобальні пошукові операції можуть вимагати додаткового проходу по сховищу
* Hot Metadata Index може бути частковим

## 8.2. Storage capability mode

Storage capability mode визначає, чи driver підтримує модифікацію state.

```ts
type StorageCapabilityMode = 'full' | 'readonly'
```

Цей режим не має конфігуруватися користувачем напряму. Він визначається Storage Driver.

### Full storage mode

У `full` режимі driver підтримує:

* читання metadata
* читання files
* запис metadata
* staged upload і фіналізацію files
* append journal entries
* storage-level write lock
* recovery primitives
* external change synchronization primitives

### Read-only storage mode

У `readonly` режимі driver підтримує тільки безпечне читання.

Core має відхиляти всі state-changing operations до будь-якої модифікації state.

## 8.3. Composition mode

Composition mode не є runtime mode Core, але може використовуватися Extensia Module для вибору composition policy.

```ts
type ExtensiaCompositionMode = 'production' | 'test'
```

У `production` режимі:

* system modules реєструються стандартно
* overrides заборонені після `compose()`
* diagnostics можуть бути обмежені safe metadata

У `test` режимі:

* можуть використовуватися fake modules
* allowed overrides застосовуються до `compose()`
* graph assertions можуть перевіряти expected dependencies

---

# 9. Composition lifecycle

## 9.1. Construction phase

Користувацький код створює Extensia Module і передає config.

```ts
const extensia = new Extensia({
    core: {
        mode: 'greedy'
    },
    storage: {
        driver: storageDriver
    },
    plugins: [
        previewPlugin,
        importPlugin
    ]
})
```

На цьому етапі runtime ще не активний.

## 9.2. Composition phase

Extensia Module створює `@sagifire/ioc` composer.

Типовий flow:

```text
create composer
  ↓
use config module
  ↓
use diagnostics module
  ↓
use hooks module
  ↓
use ids module
  ↓
use locks module
  ↓
use journal module
  ↓
use index module
  ↓
use operations module
  ↓
use sync module
  ↓
use core module
  ↓
use system extension modules
  ↓
use user extension adapter modules
  ↓
bind storage driver
  ↓
bind required adapters
  ↓
validate graph
  ↓
compose immutable runtime
```

Концептуальний sketch:

```ts
import { createComposer, formatDiagnostics } from '@sagifire/ioc'

async function createExtensiaRuntime(config: IExtensiaRuntimeConfig) {
    const composer = createComposer()
        .use(configModule(config))
        .use(diagnosticsModule)
        .use(hookModule)
        .use(idModule)
        .use(lockModule)
        .use(journalModule)
        .use(indexModule)
        .use(operationModule)
        .use(syncModule)
        .use(coreModule)

    composer.bind(STORAGE_DRIVER).toValue(config.storage.driver)

    const report = composer.validate()

    if (!report.ok) {
        return fail('COMPOSITION_INVALID', formatDiagnostics(report))
    }

    const runtime = await composer.compose()
    const controller = runtime.get(EXTENSIA_RUNTIME_CONTROLLER)

    return ok({ runtime, controller })
}
```

## 9.3. Startup phase

Після успішного `compose()` Extensia Module запускає Runtime Controller.

```text
resolve runtime controller
  ↓
controller.start()
  ↓
init storage driver
  ↓
run recovery
  ↓
build or prepare Hot Metadata Index
  ↓
start External Change Sync if enabled
  ↓
init system extensions / default facades
  ↓
init user extensions
  ↓
freeze facade registry
  ↓
runtime started
```

`compose()` створює immutable dependency graph. `start()` переводить Extensia runtime у started state.

## 9.4. Stop phase

Типовий stop flow:

```text
stop accepting new operations
  ↓
wait for active operations or cancel safely
  ↓
stop user extensions
  ↓
stop system extensions
  ↓
stop External Change Sync
  ↓
flush pending journal writes
  ↓
release locks
  ↓
close Storage Driver
  ↓
controller stopped
  ↓
dispose composed runtime
```

`runtime.dispose()` викликається після runtime stop або у `finally`, якщо startup завершився помилкою після створення composed runtime.

---

# 10. Core subsystem architecture

## 10.1. Hook System

Hook System реалізує внутрішній механізм подій і фільтрів.

Він потрібен для:

* runtime lifecycle events
* post-commit operation events
* extension integration
* pre-commit validation або normalization
* diagnostics hooks

Є два концептуальні типи hooks:

* **event hooks** — повідомляють про факт події
* **filter hooks** — дозволяють трансформувати або перевірити дані до commit

Hook Registry є runtime subsystem і може бути IoC capability.

## 10.2. ID Generator

ID Generator створює унікальні `IDString` для resources, assets і службових operation objects.

Поточна архітектурна модель допускає 64-bit hex string:

* перші 32 біти — timestamp component
* другі 32 біти — random або entropy component

Конкретний алгоритм може бути замінений, якщо зберігаються вимоги до унікальності та стабільності `IDString`.

## 10.3. Async Lock Queue

Async Lock Queue синхронізує state-changing operations у межах одного process.

Вона потрібна для:

* атомарного замикання resources і assets
* очікування в черзі, якщо потрібні lock keys зайняті
* уникнення intra-process write conflicts
* детермінованого порядку захоплення locks

Operation Engine має нормалізувати lock keys і захоплювати їх у стабільному порядку.

## 10.4. Storage Driver Adapter

Storage Driver Adapter — внутрішній шар, який нормалізує driver capabilities для Core.

Він може:

* перевіряти `full` / `readonly` mode
* перетворювати driver errors у normalized runtime errors
* приховувати optional low-level driver methods за явними capabilities
* адаптувати storage lock API
* адаптувати journal read/write API

Цей adapter може бути private provider або shared-service capability залежно від final implementation.

## 10.5. Hot Metadata Index

Hot Metadata Index зберігає process-local metadata view.

Можливі індекси:

* resource by id
* asset by id
* asset -> resource
* parent -> children
* mark type/name -> resources
* resource primary asset
* resource deletion state
* hidden / locked states
* driver-specific metadata cache, якщо вона не порушує runtime boundaries

Index не є durable storage.

## 10.6. Operation Engine

Operation Engine виконує всі state-changing operations.

Він відповідає за:

* створення operation scope
* побудову operation plan
* input validation
* capability validation
* resolving affected resources / assets
* local async locks
* storage-level write lock
* current state loading
* domain invariant validation
* staged changes
* persistence
* committed journal entry
* hot index update
* post-commit hooks
* normalized errors і warnings

## 10.7. Operation Journal

Operation Journal є append-only mechanism для committed state changes.

Він підтримує:

* operation ordering
* durability publication
* recovery
* external change synchronization
* diagnostics of incomplete operations

## 10.8. External Change Sync

External Change Sync читає Operation Journal після local cursor і застосовує committed-зміни від інших actors до Hot Metadata Index.

Він не виконує merge-конфлікти на власний розсуд. Порядок journal sequence визначає порядок застосування змін.

## 10.9. Diagnostics

Diagnostics subsystem збирає composition і runtime diagnostics.

Він має розрізняти:

* composition diagnostics
* startup diagnostics
* operation diagnostics
* driver diagnostics
* sync diagnostics
* plugin/extension diagnostics

Diagnostics не повинні розкривати приватні provider values або небезпечні секрети.

---

# 11. Operation scope model

## 11.1. Призначення operation scope

Operation scope використовується для operation-local context.

Типові значення:

```ts
export const OPERATION_ID = token<IDString>('extensia.operation.id')
export const OPERATION_ACTOR_ID = token<string>('extensia.operation.actor-id')
export const OPERATION_TRACE = token<IOperationTrace>('extensia.operation.trace')
export const OPERATION_WARNINGS = token<IWarningCollector>('extensia.operation.warnings')
export const OPERATION_ABORT_SIGNAL = token<AbortSignal>('extensia.operation.abort-signal')
```

## 11.2. Scope usage

Operation Engine або Core створює scope для кожної state-changing operation.

Концептуально:

```ts
import { scopeValue } from '@sagifire/ioc'

await runtime.withScope({
    values: [
        scopeValue(OPERATION_ID, operationId),
        scopeValue(OPERATION_ACTOR_ID, actorId),
        scopeValue(OPERATION_WARNINGS, warnings)
    ]
}, async (scope) => {
    const engine = scope.get(OPERATION_ENGINE)

    return engine.execute(request)
})
```

## 11.3. Scope boundaries

Operation scope не має використовуватись для:

* зберігання durable state
* прихованої передачі Core internals у plugins
* global current-context API
* обходу явного operation request
* заміни operation plan

Scope існує для контексту, а не для прихованої бізнес-логіки.

---

# 12. Storage Driver

## 12.1. Призначення

Storage Driver відповідає за фізичне зберігання і читання runtime-даних Extensia.

Core не повинен знати:

* де лежить файл
* як організовані директорії
* чи використовується локальна file system
* чи використовується object storage
* чи сховище запаковане в один файл
* як реалізовано atomic rename, temp files або multipart upload

## 12.2. Зони відповідальності driver-а

Driver відповідає за:

* initialization і shutdown
* resource metadata reads
* resource metadata writes у `full` mode
* asset file reads
* staged upload writes
* asset upload finalization
* incomplete staged artifact cleanup
* journal append
* journal reads after cursor
* storage-level write lock
* storage integrity checks
* optional direct-change reconciliation

## 12.3. Концептуальний contract

Це не фінальний TypeScript API, а runtime capability contract.

```ts
interface IStorageDriver {
    readonly mode: StorageCapabilityMode

    init(): Promise<void>
    close(): Promise<void>

    listResourceIds(): AsyncIterable<IDString>
    readResource(id: IDString): Promise<IResourceDTO | null>
    readAssetFile(assetId: IDString): Promise<ReadableAssetStream>

    acquireStorageWriteLock?(info: IStorageLockInfo): Promise<IStorageLockHandle>

    writeResource?(resource: IResourceDTO): Promise<void>
    removeResourceMetadata?(resourceId: IDString): Promise<void>

    createAssetUpload?(assetId: IDString, info: IAssetUploadInfo): Promise<void>
    writeAssetUploadPart?(assetId: IDString, part: IAssetUploadPart): Promise<void>
    finishAssetUpload?(assetId: IDString): Promise<void>
    abortAssetUpload?(assetId: IDString): Promise<void>

    appendJournalEntry?(entry: IOperationJournalEntry): Promise<void>
    readJournalAfter?(cursor: IJournalCursor): AsyncIterable<IOperationJournalEntry>

    recoverStagedArtifacts?(context: IRecoveryContext): Promise<IRecoveryReport>
}
```

У `readonly` mode методи модифікації можуть бути відсутні або мають відхилятися.

Core не повинен запускати state-changing operation, якщо driver не підтримує потрібні write capabilities.

## 12.4. Internal asset descriptor

Для `internal asset` ідентифікатор asset є логічним дескриптором файлу.

Core передає `assetId` driver-у. Driver вирішує, як знайти або записати відповідний фізичний файл.

## 12.5. External asset

Для `external asset` файл не зберігається у сховищі Extensia.

Runtime має підтримувати інваріанти:

```text
is_external: true
url: not null
is_on_uploading: false
```

---

# 13. Hot Metadata Index

## 13.1. Призначення

Hot Metadata Index потрібен для швидкого доступу до metadata і побудови derived views.

Він використовується для:

* перевірки існування resource
* перевірки існування asset
* пошуку asset за id
* визначення resource, якому належить asset
* побудови children projection
* пошуку за marks
* пошуку primary asset
* фільтрації за службовими станами

## 13.2. Джерело істини

Hot Metadata Index не є durable source of truth.

Джерелом довговічного state є Storage Driver.

Index має актуалізуватися після:

* successful local committed operation
* external committed journal entry
* recovery або reconciliation під час startup

## 13.3. Greedy index

У `greedy` mode index будується повністю під час startup.

Flow:

```text
init Storage Driver
  ↓
run Recovery
  ↓
read resource ids
  ↓
read resource metadata
  ↓
validate basic domain invariants
  ↓
build resource / asset / tree / mark indexes
  ↓
store journal cursor
```

## 13.4. Lazy index

У `lazy` mode index може бути частковим.

Resource metadata завантажуються тоді, коли потрібні для operation або query.

Global read operations можуть:

* виконати scan через driver
* догрузити потрібні resources
* повернути результат із partial index, якщо це явно дозволено API contract

## 13.5. Index update rule

Після successful state-changing operation порядок має бути таким:

```text
persist changes
  ↓
append committed journal entry
  ↓
update local hot index
  ↓
emit post-commit hooks
```

Index не має публікувати новий state до durable commit.

---

# 14. Operation model

## 14.1. Що є operation

Operation — це будь-яка дія, яка модифікує durable state Extensia.

Приклади:

* `resource.create`
* `resource.update`
* `resource.delete`
* `resource.move`
* `asset.create`
* `asset.update`
* `asset.upload_part`
* `asset.finish_upload`
* `asset.abort_upload`
* `asset.set_primary`
* `marks.set`
* `kv.set`

Read-only operations не проходять повний write pipeline і не записуються в Operation Journal.

## 14.2. Обов’язкові властивості operation

Кожна state-changing operation має забезпечити:

* atomicity
* consistency
* isolation through sequence
* durability

Ці властивості забезпечуються комбінацією:

* Core
* Operation Engine
* Async Lock Queue
* Storage Driver
* storage-level write lock
* Operation Journal
* Recovery Model
* Hot Metadata Index update rules

## 14.3. Atomicity

Operation має бути застосована повністю або не має бути опублікована як successful committed state.

Для файлових змін використовується staged-підхід:

* temp files або chunks не є готовим asset file
* upload finalization є окремою publication action
* metadata переводиться у фінальний стан тільки після успішної підготовки files

## 14.4. Consistency

Після successful operation усі domain invariants мають залишатися істинними.

Приклади:

* asset належить рівно одному resource
* у resource не більше одного primary asset
* external asset має non-null `url`
* internal asset має `url: null`
* marks не мають дублікатів `type + name` в межах resource
* `children[]` не використовується як source of truth

## 14.5. Isolation through sequence

State-changing operations мають давати результат, еквівалентний послідовному виконанню.

У межах одного process це забезпечує Async Lock Queue.

Між кількома process це забезпечує storage-level write lock і journal sequence.

## 14.6. Durability

Якщо operation повернула success, її зміни мають бути збережені як stable committed state.

Це включає:

* metadata changes
* file changes, якщо operation змінювала files
* committed journal entry
* можливість recovery після restart

---

# 15. Operation pipeline

State-changing operation проходить через єдиний pipeline.

```text
public command / core operation request
  ↓
create operation id
  ↓
create operation scope
  ↓
build operation plan
  ↓
validate input and storage capabilities
  ↓
resolve affected resources/assets
  ↓
acquire local async locks
  ↓
acquire storage write lock
  ↓
load current committed state
  ↓
run pre-commit filters
  ↓
validate domain invariants
  ↓
prepare staged changes
  ↓
persist files / metadata
  ↓
append committed journal entry
  ↓
update local Hot Metadata Index
  ↓
emit post-commit hooks
  ↓
release locks and scope resources
  ↓
return normalized result
```

## 15.1. Create operation scope

Operation Engine створює scope і додає operation-local values.

Це дає diagnostics, hooks, journal і nested services доступ до operation context без глобального mutable state.

## 15.2. Build operation plan

Operation plan містить:

* operation type
* operation id
* actor id
* affected resources
* affected assets
* required lock keys
* expected invariants
* staged change description
* journal payload

## 15.3. Validate capabilities

Core перевіряє driver capabilities до будь-якої state mutation.

Якщо driver у `readonly` mode, write operation має завершитися failure result.

## 15.4. Resolve affected entities

Core визначає resources і assets, які будуть зачеплені.

Це потрібно для:

* locks
* invariant validation
* journal affected lists
* index update
* external sync optimization

## 15.5. Acquire local locks

Lock keys мають бути нормалізовані і захоплені у детермінованому порядку.

## 15.6. Acquire storage write lock

Для full-driver write operations Core отримує storage-level write lock.

Базова модель передбачає один global writer для одного storage.

## 15.7. Load current state

Core завантажує актуальний committed state.

У `greedy` mode це зазвичай Hot Metadata Index із перевіркою актуальності.

У `lazy` mode Core може догрузити потрібні resources через Storage Driver.

## 15.8. Run pre-commit filters

Pre-commit filters можуть:

* нормалізувати input
* додати application validation
* відхилити operation
* змінити operation payload у межах дозволеного contract

Pre-commit filters не повинні створювати non-recoverable side effects.

## 15.9. Prepare staged changes

Core і driver готують staged changes.

Для metadata це може бути новий resource DTO.

Для files це можуть бути:

* temp files
* multipart chunks
* staged object keys
* shadow-copy files
* driver-specific staging mechanism

До committed stage ці artifacts не є visible final state.

## 15.10. Persist and commit

Driver застосовує staged changes.

Після успішного persistence Core додає committed journal entry.

Committed journal entry є publication boundary.

## 15.11. Update local index

Після committed journal entry поточний process оновлює Hot Metadata Index.

Це забезпечує read-after-write consistency в межах одного runtime instance.

## 15.12. Emit post-commit hooks

Post-commit hooks запускаються після durable commit і local index update.

Помилка post-commit hook не відкочує committed operation.

---

# 16. Asset upload architecture

## 16.1. Створення internal asset

Створення internal asset і завантаження його file є різними operations.

Коли створюється internal asset без готового file:

```text
is_external: false
url: null
is_on_uploading: true
```

## 16.2. Upload parts

Для великих files upload може виконуватися частинами.

Кожна частина записується driver-ом у staged area.

`asset.upload_part` є state-changing operation і має бути journal-backed.

## 16.3. Finish upload

`asset.finish_upload` фіналізує staged file.

Після success:

```text
is_on_uploading: false
```

File має бути доступний через Storage Driver як готовий internal asset file.

## 16.4. Abort upload

`asset.abort_upload` прибирає staged artifacts або позначає upload як скасований відповідно до driver capabilities.

Operation має бути idempotency-aware, тому повторне abort після partial failure не повинно ламати storage state.

## 16.5. External asset

External asset не проходить upload pipeline.

Для нього завжди:

```text
is_external: true
url: not null
is_on_uploading: false
```

---

# 17. Operation Journal

## 17.1. Призначення

Operation Journal потрібен для runtime-коректності:

* operation ordering
* durability publication
* recovery
* synchronization між process instances
* diagnostics

## 17.2. Append-only модель

Journal має бути append-only.

Старі entries не редагуються. Якщо потрібно зафіксувати новий phase або correction, додається новий entry.

## 17.3. Концептуальна структура entry

```ts
interface IOperationJournalEntry {
    sequence: string | number
    operation_id: IDString
    actor_id: string

    phase: 'started' | 'committed' | 'failed' | 'rolled_back'
    type: string

    affected_resources: IDString[]
    affected_assets: IDString[]

    created_at: Timestamp
    committed_at: Timestamp | null

    payload: Record<string, unknown> | null
}
```

## 17.4. Committed entry

`committed` entry є сигналом, що operation стала частиною durable state.

External Change Sync має орієнтуватися саме на committed entries.

## 17.5. Started / failed / rolled_back entries

`started`, `failed` і `rolled_back` entries можуть використовуватися для recovery і diagnostics.

Вони не є підставою для оновлення Hot Metadata Index в інших processes.

## 17.6. Journal cursor

Кожен runtime instance тримає cursor останнього обробленого journal entry.

External Sync читає entries after cursor і застосовує committed external changes.

---

# 18. Recovery model

## 18.1. Коли потрібен recovery

Recovery потрібен після:

* process crash
* crash під час operation
* неповної фіналізації upload
* невдалого metadata update
* розриву між staged artifacts і committed journal state
* driver-level partial failure

## 18.2. Recovery під час startup

Під час startup Core виконує recovery до того, як runtime стане ready.

Типовий flow:

```text
init Storage Driver
  ↓
read recent journal state
  ↓
find incomplete operations
  ↓
inspect staged artifacts
  ↓
rollback or complete recoverable artifacts
  ↓
restore committed state view
  ↓
build or refresh Hot Metadata Index
```

## 18.3. Committed state as source of recovery

Після recovery система має відповідати останньому коректному committed state.

Incomplete staged artifacts не мають ставати visible final files або final metadata changes.

## 18.4. Driver responsibility

Driver надає low-level recovery primitives:

* пошук staged artifacts
* видалення incomplete artifacts
* перевірка final files
* читання journal entries
* перевірка metadata integrity
* driver-specific cleanup

Core координує recovery policy, driver виконує storage-specific work.

---

# 19. External Change Synchronization

## 19.1. Проблема

Кілька екземплярів Extensia можуть працювати з одним storage.

Кожен process має власний Hot Metadata Index. Ці indexes треба актуалізувати після committed changes від інших actors.

## 19.2. Джерело змін

Основним джерелом зовнішніх змін є Operation Journal.

Коли інший runtime instance завершує operation, він додає committed journal entry.

Інші instances читають entry і оновлюють власний Hot Metadata Index.

## 19.3. Sync flow

```text
sync tick / storage notification
  ↓
read journal entries after local cursor
  ↓
filter committed entries from other actors
  ↓
load affected resources from storage
  ↓
update or invalidate Hot Metadata Index entries
  ↓
emit external sync hooks
  ↓
advance cursor
```

## 19.4. Stale index window

Hot Metadata Index є process-local view.

Інші processes можуть мати коротке відставання до sync tick або notification.

Якщо application потребує strict cross-process read-after-write, вона має викликати explicit refresh або використовувати driver-specific synchronization policy.

## 19.5. Conflicts

Конфліктні committed entries не зливаються через merge-логіку Hot Metadata Index.

Journal sequence визначає порядок застосування змін.

## 19.6. Direct external modification

Пряме редагування files або metadata в обхід Extensia не є базовим підтримуваним сценарієм.

Driver може підтримувати scan/reconcile як додаткову capability, але correctness базової архітектури спирається на Operation Journal.

---

# 20. Read model

## 20.1. Read operations

Read operations не змінюють durable state.

Вони можуть використовувати:

* Hot Metadata Index
* Storage Driver reads
* lazy metadata loading
* cached projections

Read operations не записуються в Operation Journal.

## 20.2. Read-after-write

Після successful operation поточний runtime instance має бачити новий state через Hot Metadata Index.

Це дає read-after-write consistency в межах одного instance.

## 20.3. Reads in other processes

Інші processes бачать зміни після External Change Sync або explicit refresh.

## 20.4. Read-only storage

У read-only storage read operations залишаються доступними.

State-changing operations мають завершуватися normalized failure result.

---

# 21. Hook System

## 21.1. Призначення

Hook System дозволяє runtime і extensions реагувати на події Extensia.

Приклади events:

* `runtime.starting`
* `runtime.started`
* `runtime.stopping`
* `runtime.stopped`
* `operation.committed`
* `resource.created`
* `resource.updated`
* `resource.deleted`
* `asset.created`
* `asset.upload_finished`
* `marks.changed`
* `kv.changed`
* `external_changes.synchronized`

## 21.2. Event hooks

Event hooks повідомляють про факт події.

Вони не повинні змінювати already committed state.

## 21.3. Filter hooks

Filter hooks можуть виконуватися до commit.

Вони можуть:

* нормалізувати input
* виконати additional validation
* розширити operation plan у дозволених межах
* відхилити operation через normalized failure

## 21.4. Hook failure policy

Базове правило:

* pre-commit filter failure може зупинити operation
* post-commit event failure не відкочує committed operation
* post-commit failures можуть піти у diagnostics або warnings

---

# 22. Error and diagnostics model

## 22.1. Runtime error principle

Runtime errors не мають залишати систему у partially successful visible state.

Якщо operation не може завершитися:

* вона повертає failure result
* не публікує committed state
* звільняє locks
* dispose-ить operation scope resources
* залишає recovery-достатню інформацію, якщо failure стався після staged changes

## 22.2. Composition diagnostics

Composition diagnostics виникають до startup.

Приклади:

* missing required port
* duplicate module id
* duplicate capability
* invalid binding for token that no module requires
* module dependency cycle
* declared capability not registered during setup

Такі помилки мають зупинити startup до активного runtime state.

## 22.3. Runtime diagnostics

Runtime diagnostics виникають після composition.

Приклади:

* storage init failure
* recovery failure
* driver capability mismatch
* readonly write attempt
* journal append failure
* lock acquisition failure
* hot index integrity failure
* external sync failure
* post-commit hook failure

## 22.4. Normalized result

Public facades і Core Extension Port мають повертати normalized result для expected errors.

Концептуально:

```ts
interface IExtensiaResult<T> {
    status: boolean
    result: T | null
    error: IExtensiaError | null
    warnings?: IExtensiaWarning[]
}
```

## 22.5. Unexpected exceptions

Unexpected exceptions можуть виникати через programming errors або unrecoverable states.

Runtime boundary має прагнути нормалізувати known failure modes, але не має приховувати invariant violations як success.

---

# 23. Testing architecture

## 23.1. Test composition

Tests мають створювати fresh composition config.

Allowed patterns:

* fake Storage Driver
* fake Operation Journal
* fake Hook Registry
* fake External Change Sync
* deterministic ID Generator
* in-memory Hot Metadata Index
* diagnostics assertions
* module graph assertions

Overrides застосовуються тільки до `compose()`.

Frozen production runtime не патчиться.

## 23.2. Runtime test harness

`@extensia/testkit` може надати helper:

```ts
interface IExtensiaTestRuntime {
    readonly extensia: IExtensiaModule
    readonly runtime: unknown
    readonly diagnostics: IDiagnosticsPort

    stop(): Promise<void>
}
```

Його responsibility:

* створити composer
* додати стандартні runtime modules
* застосувати test overrides
* validate graph
* compose runtime
* start Extensia Runtime Controller
* dispose runtime after test

## 23.3. What to test at composition level

Composition-level tests мають перевіряти:

* усі required runtime ports satisfied
* Storage Driver binding присутній
* readonly driver блокує write operations
* system modules expose expected capabilities
* private providers не доступні як public capabilities
* fake modules не просочуються в production composition

---

# 24. Архітектурні інваріанти

## 24.1. Composition invariants

1. Extensia Module є єдиним production composition root.
2. Runtime graph має бути validated до startup.
3. Після `compose()` runtime graph immutable.
4. Test overrides дозволені тільки до `compose()`.
5. Звичайні plugins не отримують прямий доступ до Composed Runtime або private tokens.
6. IoC tokens не є public application API, якщо це явно не задокументовано.

## 24.2. Core invariants

1. Усі state-changing operations проходять через Core.
2. Core не є IoC container.
3. Core не публікує зміни в Hot Metadata Index до durable commit.
4. Core відхиляє write operations у `readonly` storage mode.
5. Core підтримує domain invariants після кожної successful operation.
6. Core запускає recovery до ready state.

## 24.3. Storage invariants

1. Storage Driver є source of durable state.
2. Driver приховує фізичну організацію files від Core.
3. Full driver підтримує metadata writes, file writes, journal append і storage-level write lock.
4. Read-only driver не дозволяє state mutation.
5. Driver надає recovery primitives для власного storage format.

## 24.4. Operation invariants

1. Кожна state-changing operation має operation id.
2. Кожна operation має operation scope.
3. Кожна committed operation має journal entry.
4. Operation захоплює потрібні locks до mutation.
5. Operation оновлює Hot Metadata Index тільки після durable commit.
6. Post-commit hook failure не відкочує committed operation.

## 24.5. Journal invariants

1. Journal append-only.
2. `committed` entry є publication boundary.
3. Journal sequence визначає sync ordering.
4. External Sync застосовує тільки committed external changes.
5. Incomplete journal state обробляється recovery.

## 24.6. Index invariants

1. Hot Metadata Index є process-local view.
2. Hot Metadata Index не є durable source of truth.
3. Hot Metadata Index оновлюється після local committed operation.
4. Hot Metadata Index синхронізується через journal для external changes.
5. У `lazy` mode Hot Metadata Index може бути partial.

## 24.7. Scope invariants

1. Operation-local state передається через explicit operation scope.
2. Scope не є прихованим global context.
3. Scope не замінює operation request або operation plan.
4. Scoped resources мають dispose-итися після завершення operation.

---

# 25. Межі архітектури

Extensia runtime не обіцяє:

* бути готовим file server
* надавати HTTP або RPC API
* бути distributed database
* підтримувати високонавантажені multi-writer сценарії як базову модель
* автоматично підтримувати ручні зміни files у storage в обхід operation pipeline
* замінювати CDN, object storage provider або media transformation service
* бути dependency injection framework загального призначення для застосунку
* бути sandbox для недовірених plugins

Extensia runtime обіцяє:

* in-process ядро для керування media resources
* explicit composition через `@sagifire/ioc`
* immutable runtime graph після composition
* Core-driven operation pipeline
* driver-based storage abstraction
* sequential write model
* Hot Metadata Index для швидкого read model
* journal-backed durability, recovery і synchronization
* operation scopes для operation-local context
* diagnostics і inspectable composition graph
* основу для extension/API layer через plugins і facades

---

# 26. Короткий підсумок

Runtime-архітектура Extensia v2 має два різні, але пов’язані шари:

```text
composition layer
  @sagifire/ioc composer, modules, tokens, scopes, diagnostics

@runtime layer
  Core, operations, storage, locks, index, journal, sync, hooks
```

`@sagifire/ioc` відповідає за те, щоб runtime був зібраний явно, перевірено і детерміновано.

Core відповідає за те, щоб state-changing operations були атомарними, узгодженими, ізольованими через послідовність і durable.

Storage Driver приховує фізичне сховище від Core.

Hot Metadata Index забезпечує швидкий process-local read model.

Async Lock Queue і storage-level write lock забезпечують sequential write model.

Operation Journal є publication boundary для committed changes і основою recovery та external synchronization.

External Change Sync підтримує актуальність process-local indexes між кількома runtime instances.

Головний архітектурний фокус v2: **Extensia лишається компактним runtime для media asset management, але отримує чіткий, inspectable і testable composition layer на базі `@sagifire/ioc`.**
