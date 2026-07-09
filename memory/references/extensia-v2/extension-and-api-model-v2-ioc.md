# Extensia

## Extension and API Model v2

> Статус: draft  
> Призначення: зафіксувати модель розширення Extensia, публічні API-фасади, контракт плагінів, lifecycle extension layer і правила інтеграції з урахуванням runtime-composition через `@sagifire/ioc`.

---

# 1. Межі документа

Цей документ описує інтеграційний шар Extensia v2:

* як користувацький код взаємодіє з бібліотекою
* чому внутрішній API Core приховується за фасадами
* як plugins і system extensions розширюють функціонал Extensia
* як facades формують публічний API бібліотеки
* як extension descriptors оголошують залежності та надані можливості
* як facade registry створюється, публікується і заморожується
* як plugins підписуються на hooks
* як system extensions реєструють стандартні фасади
* як extension layer використовує internal IoC composition, не перетворюючи `@sagifire/ioc` на public API Extensia
* які правила мають виконувати розширення, щоб не ламати runtime-модель

Документ не описує детально:

* доменні сутності `Resource`, `Asset`, `Mark`, `KV`
* внутрішню реалізацію Core
* Storage Driver
* Hot Metadata Index
* Operation Journal
* Async Lock Queue
* External Change Sync
* фізичний формат зберігання файлів і метаданих
* конкретну реалізацію runtime modules
* повний низькорівневий API `@sagifire/ioc`

Ці теми належать до окремих документів:

* `domain-model-v2.md`
* `runtime-architecture-v2-ioc.md`

---

# 2. Загальна ідея API та розширення

Extensia є in-process бібліотекою. Вона запускається всередині процесу застосунку і надає набір публічних об’єктів для роботи з медіа-ресурсами.

Користувацький код не повинен напряму залежати від внутрішнього API Core або від internal IoC runtime. Core є runtime-координатором. `@sagifire/ioc` є composition layer. Жоден із цих шарів не є основною точкою інтеграції для прикладного коду.

Публічна взаємодія з Extensia будується через три механізми:

* **facades** — стабільні публічні об’єкти для commands, queries і службових сценаріїв
* **plugins** — модулі розширення, які можуть реєструвати фасади, підписуватись на hooks і додавати прикладну логіку
* **extension descriptors** — декларативний опис plugin / extension metadata, dependencies, provided facades і lifecycle policy

Внутрішня збірка runtime використовує:

* `@sagifire/ioc` composer
* typed tokens
* runtime modules
* explicit `requires` / `provides`
* adapter bindings
* multi-capability contributions
* diagnostics і graph inspection
* immutable composed runtime

У спрощеному вигляді:

```text
Application code
└─ Extensia Module
   ├─ public facade accessors
   │  ├─ storage()
   │  ├─ query()
   │  └─ facade(name)
   ├─ Facade Registry
   │  ├─ system facades
   │  └─ custom facades
   ├─ Extension Layer
   │  ├─ system extensions
   │  ├─ user plugins
   │  ├─ hook subscriptions
   │  └─ facade providers
   └─ Extensia Composition Root
      ├─ @sagifire/ioc composer
      ├─ runtime modules
      ├─ extension adapter modules
      └─ Core Extension Port
         └─ Core / runtime subsystems
```

Ключова ідея:

**фасади дають зручний API для користувача бібліотеки, plugins дають контрольовану точку розширення, а IoC composition layer детерміновано збирає runtime і extension graph без прямого розкриття Core.**

---

# 3. Основні принципи

## 3.1. Core is internal

Core є внутрішнім runtime-шаром Extensia.

Застосунок не повинен будувати інтеграцію на неформальних внутрішніх методах Core. Для цього існують:

* Extensia Module
* public facades
* plugin contract
* Core Extension Port
* hook system
* normalized result model

Core може змінювати свою внутрішню структуру без зміни предметної моделі, якщо public facades та extension contracts залишаються стабільними.

## 3.2. IoC is internal composition, not public API

`@sagifire/ioc` використовується Extensia Module як внутрішній composition layer.

Він відповідає за:

* реєстрацію runtime modules
* typed tokens для ports і capabilities
* validation composition graph
* adapter bindings між required ports і capabilities
* multi contributions для extension/facade catalogs
* створення immutable composed runtime
* test overrides до `compose()`
* diagnostics і safe graph inspection

Він не відповідає за:

* публічну форму Extensia API
* доменні правила Resource / Asset / Mark / KV
* operation pipeline
* security isolation plugins
* lifecycle policy plugins
* формат DTO і results

Користувацький код не повинен робити token-based access до Extensia як до service locator.

Небажано:

```ts
const storage = extensia.runtime.get(STORAGE_FACADE)
```

Бажано:

```ts
const storage = extensia.storage()
const query = extensia.query()
const preview = extensia.facade<IPreviewFacade>('preview')
```

## 3.3. Facade-first public API

Публічний API Extensia має бути організований через facades.

Facade — це об’єкт, який групує пов’язані можливості бібліотеки у зручну для користувача форму.

Приклади:

* `storage` — state-changing commands
* `query` — read-only queries
* `preview` — custom API для генерації preview
* `importer` — custom API для імпорту ресурсів
* `semanticSearch` — custom API для прикладного пошуку

Facade має приховувати Core і не має повторювати внутрішній дизайн runtime modules.

## 3.4. Plugins extend, facades expose

Plugin відповідає за розширення можливостей системи.

Facade відповідає за публічне представлення цих можливостей.

Plugin може:

* підписуватись на hooks
* реєструвати facade providers
* викликати дозволені операції Core через Core Extension Port
* використовувати інші фасади через контрольований facade registry
* додавати прикладну автоматизацію
* підтримувати власний прикладний стан, якщо це не порушує інваріанти Extensia

Facade має:

* надавати зручні методи користувацькому коду
* нормалізувати input
* повертати normalized result
* не обходити Core operation pipeline
* не мутувати private runtime state

## 3.5. Explicit extension points

Extensia не повинна заохочувати розширення через monkey-patching, пряме редагування внутрішніх структур, неявну залежність від приватних полів або імпорт internal tokens.

Розширення мають будуватися через явні точки:

* plugin contract
* extension descriptor
* facade provider
* facade registry
* hook system
* Core Extension Port
* public configuration
* experimental extension module API, якщо він явно увімкнений

## 3.6. Immutable public surface after startup

Після успішного startup public API має бути передбачуваним.

Базове правило v2:

* composition graph створюється до startup
* runtime graph стає immutable після `compose()`
* facade providers збираються під час startup
* facade registry заморожується до моменту, коли `start()` повертає success
* після `start()` нові фасади не реєструються, якщо dynamic extensions не увімкнені явно

Динамічна реєстрація extension після startup може бути майбутньою можливістю, але вона не є базовою частиною v2.

## 3.7. Trusted in-process plugins

Plugins виконуються в тому самому процесі, що й Extensia та застосунок.

Plugin system не є sandbox-механізмом і не є security boundary.

Це означає:

* plugins мають розглядатися як trusted code
* Extensia не гарантує ізоляцію від шкідливого або некоректного plugin
* відповідальність за вибір і підключення plugins належить застосунку
* IoC module boundaries не є security boundary

## 3.8. No service locator behavior

Extensia не повинна перетворювати public API на service locator.

Заборонена базова модель:

```ts
extensia.get(ANY_INTERNAL_TOKEN)
```

Дозволена public модель:

```ts
extensia.storage()
extensia.query()
extensia.facade('preview')
```

Advanced diagnostic / inspection APIs можуть існувати, але вони мають повертати safe metadata, а не provider instances або private tokens.

## 3.9. Normalized results for expected failures

Expected failures у public API мають повертатися через normalized result model.

Приклади expected failures:

* resource not found
* asset not found
* invalid input
* readonly storage write attempt
* plugin dependency missing
* facade already registered
* composition invalid
* hook registration failed

Unexpected programming errors можуть бути thrown, але public facades мають прагнути нормалізувати runtime і validation failures.

---

# 4. Ubiquitous Language

## 4.1. Extensia Module

**Extensia Module** — головний об’єкт бібліотеки, який створюється користувацьким кодом.

Він відповідає за:

* прийняття конфігурації
* створення Extensia Composition Root
* запуск runtime
* підключення system extensions і user plugins
* публікацію public facades
* надання користувацькому коду доступу до API Extensia
* коректний shutdown runtime і dispose composed runtime

## 4.2. Extensia Composition Root

**Extensia Composition Root** — внутрішній шар Extensia Module, який володіє `@sagifire/ioc` composer.

Він виконує:

* нормалізацію config
* реєстрацію runtime modules
* binding external dependencies
* адаптацію plugins у extension modules / contributions
* validation composition graph
* створення immutable composed runtime
* отримання runtime controller і extension manager capabilities

Composition Root не передається напряму користувацькому коду або plugins за базовим правилом.

## 4.3. Composed Runtime

**Composed Runtime** — immutable runtime, створений `@sagifire/ioc` після `compose()`.

Він використовується Extensia Module для:

* отримання exported runtime capabilities
* запуску runtime controller
* створення operation scopes
* disposal lifecycle
* safe diagnostics / inspection
* test harness integration

Composed Runtime не є public application API.

## 4.4. Public API

**Public API** — стабільний шар методів, через який користувацький код працює з Extensia.

Public API включає:

* методи Extensia Module
* system facades
* custom facades, зареєстровані plugins
* normalized result model
* documented extension contracts

Public API не включає private Core methods, private runtime tokens або arbitrary IoC provider access.

## 4.5. Facade

**Facade** — публічний об’єкт, який групує набір пов’язаних методів.

Facade може бути:

* **system facade** — постачається Extensia
* **custom facade** — надається plugin або extension

Facade не володіє durable state. Він викликає Core Extension Port, інші фасади або прикладні сервіси, але не обходить operation pipeline.

## 4.6. Facade Registry

**Facade Registry** — системний реєстр фасадів Extensia Module.

Він відповідає за:

* реєстрацію фасадів під час startup
* перевірку унікальності імен
* захист reserved names
* доступ до фасадів за іменем
* freeze після startup
* safe listing public surface

## 4.7. Facade Provider

**Facade Provider** — декларативний contribution, який описує створення одного facade.

Facade Provider може бути наданий:

* system extension
* user plugin adapter
* advanced extension module

Він не повинен створювати facade до того, як dependency graph і runtime state дозволяють це зробити.

## 4.8. Plugin

**Plugin** — клас або об’єкт розширення, який імплементує public plugin contract Extensia.

Plugin може додавати поведінку через:

* hooks
* facade providers
* lifecycle methods
* integration with external application services
* Core Extension Port

Plugin не зобов’язаний знати про `@sagifire/ioc`.

## 4.9. System Extension

**System Extension** — extension, що постачається разом із Extensia і забезпечує базову functionality public API.

Типовий system extension:

* реєструє `storage` facade
* реєструє `query` facade
* додає системні hook subscriptions
* надає extension diagnostics

System Extension може бути реалізований як internal IoC module.

## 4.10. User Plugin

**User Plugin** — plugin, який підключається застосунком через конфігурацію Extensia.

Він використовується для прикладних сценаріїв, які не мають бути частиною базового Core.

## 4.11. Extension Descriptor

**Extension Descriptor** — декларативний опис plugin або extension contribution.

Він може містити:

* stable name
* version
* enabled flag
* options
* required facades
* required plugins або capabilities
* provided facades
* lifecycle policy
* factory для створення plugin instance
* experimental IoC module contribution, якщо такий режим явно дозволений

## 4.12. Core Extension Port

**Core Extension Port** — контрольована програмна поверхня Core, доступна plugins і facades.

Це не весь внутрішній Core. Це стабільніший контракт, через який extension layer може:

* виконувати commands
* виконувати reads
* отримувати runtime mode і storage mode
* запускати дозволений refresh, якщо він підтриманий runtime

## 4.13. Hook

**Hook** — точка підписки або трансформації, яка дозволяє plugins реагувати на події Extensia або брати участь у pre-commit логіці.

Є два концептуальні типи hooks:

* **event hook** — повідомлення про подію
* **filter hook** — pre-commit або підготовча трансформація / перевірка

## 4.14. API Result

**API Result** — нормалізований результат виконання public API method або lifecycle method.

Він дозволяє клієнтському коду однаково обробляти success, expected failure, validation failure і warnings.

## 4.15. IoC Public Capability

**IoC Public Capability** — token/capability, оголошений у `provides` internal IoC module і доступний із composed runtime.

Це не обов’язково public application API.

Наприклад, `EXTENSIA_RUNTIME_CONTROLLER` може бути IoC public capability, але не має автоматично ставати user-facing API.

---

# 5. Public API vs Internal Composition Surface

## 5.1. Розділення поверхонь

Extensia v2 розрізняє кілька рівнів API.

| Рівень | Хто використовує | Стабільність | Приклад |
|---|---|---:|---|
| Domain contracts | Core, facades, plugins, application DTO code | висока | `IResource`, `IAsset`, `IMark` |
| Extensia public API | application code | висока | `extensia.storage()`, `extensia.query()` |
| Plugin API | plugin authors | висока / середня | `IExtensiaPlugin`, `IPluginContext` |
| Core Extension Port | facades, trusted plugins | середня | `core.execute()`, `core.read()` |
| IoC public capabilities | Extensia Module, runtime modules | internal | `EXTENSIA_RUNTIME_CONTROLLER` |
| Internal tokens/providers | implementation only | private | `OPERATION_PLANNER`, private adapters |

## 5.2. Public capability is not public API

У `@sagifire/ioc` module capability може бути exported capability composed runtime. У Extensia це означає тільки те, що capability доступна composition root або runtime modules.

Це не означає, що capability доступна кінцевому користувачу Extensia.

Правило:

```text
IoC provides != Extensia public API
```

Щоб capability стала public API Extensia, вона має бути явно представлена як:

* метод Extensia Module
* system facade
* custom facade
* documented plugin contract

## 5.3. Internal tokens are private by default

Будь-який IoC token вважається private, якщо він явно не позначений як public або experimental extension token.

Private tokens:

* не документуються як public integration surface
* не передаються plugins у context
* не гарантують backward compatibility
* можуть змінюватися між minor versions v2, якщо public API лишається сумісним

## 5.4. Experimental extension tokens

Якщо Extensia вирішить надати advanced integration з IoC-level extension modules, такі tokens мають бути позначені як experimental.

Experimental token має мати:

* stable namespaced id
* опис призначення
* compatibility warning
* safe diagnostics
* чітке правило, чи можна його використовувати user extensions

Приклад:

```ts
export const EXTENSIA_FACADE_PROVIDER_CONTRIBUTIONS = token<IFacadeProvider>(
    'extensia.experimental.facades.providers'
)
```

Назва token ID має явно сигналізувати experimental status, якщо compatibility ще не гарантована.

---

# 6. Extensia Module

## 6.1. Роль Extensia Module

Extensia Module є головною точкою входу для користувацького коду.

Його призначення:

* прийняти config
* нормалізувати extension descriptors
* створити Extensia Composition Root
* зареєструвати runtime modules
* підключити system extensions
* адаптувати user plugins
* провалідовати composition і extension graph
* створити immutable composed runtime
* запустити runtime controller
* створити і заморозити facade registry
* надати public API
* коректно зупинити runtime

## 6.2. Концептуальний контракт модуля

Це не фінальний TypeScript API, а контракт рівня можливостей.

```ts
type FacadeName = string
type IDString = string
type PromisedResult<T> = Promise<IExtensiaResult<T>>

interface IExtensiaModule {
    start(): PromisedResult<void>
    stop(): PromisedResult<void>

    storage(): IStorageFacade
    query(): IQueryFacade

    facade<TFacade = unknown>(name: FacadeName): TFacade | null
    facadeRequired<TFacade = unknown>(name: FacadeName): TFacade
    hasFacade(name: FacadeName): boolean
    listFacades(): FacadeName[]

    getState(): ExtensiaModuleState
    inspect?(): IExtensiaInspectionSnapshot
}

type ExtensiaModuleState =
    | 'created'
    | 'starting'
    | 'started'
    | 'stopping'
    | 'stopped'
    | 'failed'
```

`inspect()` є optional developer tooling API. Він має повертати safe metadata, а не private provider instances.

## 6.3. Configuration shape

Концептуальна форма config:

```ts
interface IExtensiaConfig {
    core: ICoreConfig
    storage: IStorageIntegrationConfig

    plugins?: IPluginDescriptor[]
    extensions?: IExtensiaExtensionDescriptor[]

    diagnostics?: IExtensiaDiagnosticsConfig
    dynamicExtensions?: false
}

interface IStorageIntegrationConfig {
    driver: IStorageDriver
}
```

`plugins` — простий public шлях для user plugins.

`extensions` — більш декларативний шлях для system/user extension descriptors.

Фінальний API може залишити тільки одне з цих полів, але архітектурно Extensia має мати нормалізований internal список extension descriptors.

## 6.4. Construction

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

На construction phase runtime ще не активний:

* Core не запущений
* Storage Driver не ініціалізований
* composed runtime ще не створений або не опублікований
* facade registry не доступний як stable public API

## 6.5. Start

`start()` виконує composition і startup.

Типовий flow:

```text
validate raw config
  ↓
normalize plugin / extension descriptors
  ↓
create Extensia Composition Root
  ↓
register runtime modules
  ↓
register system extension modules
  ↓
adapt user plugins into extension contributions
  ↓
bind external dependencies
  ↓
validate IoC graph
  ↓
validate Extensia extension graph
  ↓
compose immutable runtime
  ↓
start runtime controller
  ↓
create facade registry
  ↓
run plugin init / register hooks / collect facade providers
  ↓
create and register facades
  ↓
run plugin start
  ↓
freeze facade registry
  ↓
module started
```

Після success `start()`:

* runtime state is `started`
* Core initialized
* Storage Driver initialized
* system extensions initialized
* user plugins initialized
* standard facades registered
* custom facades registered
* facade registry frozen
* public API ready

## 6.6. Stop

`stop()` завершує роботу runtime.

Типовий flow:

```text
stop accepting new public operations
  ↓
run plugin stop in reverse lifecycle order
  ↓
release hook subscriptions owned by plugins
  ↓
stop system extensions
  ↓
stop runtime controller
  ↓
dispose composed runtime
  ↓
module stopped
```

Після `stop()` public facades не повинні приймати runtime-dependent operations.

## 6.7. Failure during start

Якщо startup завершується failure після створення composed runtime, Extensia Module має виконати cleanup:

```text
startup failure
  ↓
stop initialized plugins/extensions if needed
  ↓
stop runtime controller if started
  ↓
dispose composed runtime
  ↓
return failure result
```

Expected startup failures мають повертатися через `IExtensiaResult<void>`.

---

# 7. Configuration and Extension Descriptor Model

## 7.1. Plugin descriptor

Plugin descriptor описує user plugin і його policy.

```ts
interface IPluginDescriptor {
    plugin: IExtensiaPlugin | IPluginFactory
    options?: Record<string, unknown>
    enabled?: boolean

    requires?: IExtensionRequirement[]
    provides?: IExtensionProvision[]

    failurePolicy?: PluginFailurePolicy
}

type PluginFailurePolicy = 'required' | 'optional'

type IPluginFactory = (options: IPluginFactoryOptions) => IExtensiaPlugin

interface IPluginFactoryOptions {
    options?: Record<string, unknown>
    diagnostics?: IDiagnosticsPort
}
```

`enabled: false` означає, що plugin не створюється і не додається до extension graph.

`failurePolicy: 'required'` є базовим правилом. Якщо required plugin не ініціалізувався, startup Extensia Module завершується failure.

`failurePolicy: 'optional'` може дозволити продовжити startup з warning, але тільки якщо plugin не надав required public facade.

## 7.2. Extension descriptor

Extension descriptor є нормалізованою internal/public формою опису extension.

```ts
interface IExtensiaExtensionDescriptor {
    name: string
    version?: string
    enabled?: boolean

    kind?: 'system' | 'user'
    options?: Record<string, unknown>

    requires?: IExtensionRequirement[]
    provides?: IExtensionProvision[]

    plugin?: IExtensiaPlugin | IPluginFactory
    module?: IExtensiaExtensionModuleFactory

    failurePolicy?: PluginFailurePolicy
}
```

`module` — advanced / experimental шлях для extension, яка напряму надає IoC-aware contribution. Базові plugins не мають використовувати цей шлях.

## 7.3. Extension requirements

Extension requirements описують, від чого залежить plugin або extension.

```ts
type IExtensionRequirement =
    | IFacadeRequirement
    | IPluginRequirement
    | ICapabilityRequirement

interface IFacadeRequirement {
    kind: 'facade'
    name: FacadeName
    required?: boolean
}

interface IPluginRequirement {
    kind: 'plugin'
    name: string
    versionRange?: string
    required?: boolean
}

interface ICapabilityRequirement {
    kind: 'capability'
    name: string
    required?: boolean
    experimental?: boolean
}
```

Facade requirements є Extensia-level залежностями за іменем facade, а не raw IoC token dependencies.

## 7.4. Extension provisions

Extension provisions описують, що extension надає.

```ts
type IExtensionProvision =
    | IFacadeProvision
    | IHookProvision
    | ICapabilityProvision

interface IFacadeProvision {
    kind: 'facade'
    name: FacadeName
    system?: boolean
}

interface IHookProvision {
    kind: 'hook-subscriber'
    hook: HookName
}

interface ICapabilityProvision {
    kind: 'capability'
    name: string
    experimental?: boolean
}
```

`provides` використовується для validation, diagnostics, inspection і deterministic startup ordering.

## 7.5. Descriptor normalization

Перед composition Extensia Module нормалізує всі plugins і extensions у єдиний список descriptors.

Типовий процес:

```text
read config
  ↓
filter disabled descriptors
  ↓
create system extension descriptors
  ↓
normalize user plugin descriptors
  ↓
validate names and versions
  ↓
validate duplicate provisions
  ↓
build extension graph
  ↓
convert descriptors to internal adapter modules/contributions
```

## 7.6. Descriptor validation rules

Descriptor validation має перевіряти:

1. `name` є непорожнім і стабільним.
2. У межах одного Extensia Module немає двох enabled extensions з однаковим `name`.
3. Facade provisions не дублюються.
4. User plugins не надають reserved system facade names.
5. Required facade існує серед system або user provisions.
6. Required plugin існує і відповідає version policy, якщо policy задана.
7. Optional requirements можуть бути відсутні, але plugin має отримати це як explicit absence, а не як випадковий runtime failure.
8. Experimental capability requirements дозволені тільки якщо відповідна experimental policy увімкнена.

## 7.7. Descriptor examples

Приклад plugin descriptor:

```ts
const previewDescriptor: IPluginDescriptor = {
    plugin: previewPlugin,
    requires: [
        { kind: 'facade', name: 'query' },
        { kind: 'facade', name: 'storage' }
    ],
    provides: [
        { kind: 'facade', name: 'preview' },
        { kind: 'hook-subscriber', hook: 'asset.upload_finished' }
    ]
}
```

Приклад factory descriptor:

```ts
const importerDescriptor: IPluginDescriptor = {
    plugin: ({ options }) => createImporterPlugin(options),
    options: {
        defaultMarkType: 'source'
    },
    provides: [
        { kind: 'facade', name: 'importer' }
    ]
}
```

---

# 8. Composition and Extension Graph

## 8.1. Two graph layers

Extensia має два пов’язані, але різні graph layers.

```text
IoC composition graph
├─ runtime modules
├─ required ports
├─ provided capabilities
├─ adapter bindings
└─ multi contributions

Extensia extension graph
├─ plugins
├─ system extensions
├─ required facades
├─ provided facades
├─ hook subscriptions
└─ extension lifecycle order
```

IoC graph перевіряє technical composition runtime.

Extension graph перевіряє user-facing extension semantics.

Не кожна extension dependency має ставати IoC token. Наприклад, залежність plugin від facade `query` є Extensia-level dependency, яку краще валідувати як facade-name dependency.

## 8.2. IoC graph validation

IoC graph validation має відловити:

* missing required ports
* duplicate module ids
* duplicate single capabilities
* single/multi cardinality conflicts
* missing multi contributors для required multi ports
* invalid adapter sources
* module dependency cycles
* capability registration mismatch

Ці помилки нормалізуються в Extensia startup failure з code `COMPOSITION_INVALID` або більш конкретним code.

## 8.3. Extension graph validation

Extension graph validation має відловити:

* duplicate plugin names
* duplicate facade names
* missing required facades
* missing required plugins
* reserved facade name violation
* facade dependency cycles, якщо facade providers залежать один від одного
* lifecycle order conflicts
* unsupported experimental requirements

Ці помилки нормалізуються в Extensia startup failure.

## 8.4. Lifecycle ordering

Базовий lifecycle ordering:

1. Runtime modules.
2. System extensions.
3. User plugins without unsatisfied dependencies.
4. Facade provider creation in dependency order.
5. Plugin `start()` in initialization order.
6. Plugin `stop()` in reverse start order.

Якщо dependency graph задає порядок, він має перевагу над порядком config.

Якщо між plugins немає dependency relationship, порядок config використовується як deterministic tie-breaker.

## 8.5. Mapping extension descriptors to IoC contributions

Extensia може адаптувати descriptor у internal IoC module.

Концептуально:

```text
plugin descriptor
  ↓
validate descriptor
  ↓
create extension adapter module
  ↓
module contributes:
    - plugin lifecycle task
    - facade provider
    - hook subscription factory
    - diagnostics metadata
```

Ця адаптація є implementation detail.

Plugin author не повинен імпортувати `defineModule()` тільки для того, щоб написати звичайний plugin.

## 8.6. Multi contribution catalogs

Internal extension layer може використовувати multi capabilities для catalogs:

```ts
export const FACADE_PROVIDER_CONTRIBUTIONS = token<IFacadeProvider>(
    'extensia.facades.provider-contributions'
)

export const HOOK_SUBSCRIBER_CONTRIBUTIONS = token<IHookSubscriberContribution>(
    'extensia.hooks.subscriber-contributions'
)

export const EXTENSION_LIFECYCLE_CONTRIBUTIONS = token<IExtensionLifecycleContribution>(
    'extensia.extensions.lifecycle-contributions'
)
```

Modules, які надають такі catalogs, мають оголошувати `cardinality: 'multi'` у `provides` або `requires` відповідно до правил `@sagifire/ioc`.

## 8.7. Composition diagnostics as startup diagnostics

Extensia не має показувати користувачу raw stack traces як основну форму diagnostics.

IoC diagnostics мають бути перетворені у normalized Extensia diagnostics:

```ts
interface IExtensiaDiagnostic {
    code: string
    message: string
    severity: 'error' | 'warning' | 'info'
    source: 'composition' | 'extension' | 'runtime' | 'plugin'
    details?: Record<string, unknown>
}
```

Raw IoC error може бути доступний як `cause` для developer tooling, але public result має містити стабільний Extensia-level error code.

---

# 9. Facade Model

## 9.1. Призначення фасадів

Facade існує для того, щоб user-facing API не повторював internal Core design.

Core може мати методи, зручні для runtime orchestration. Facade має мати методи, зручні для користувача бібліотеки.

Це дозволяє:

* змінювати Core без постійного ламання public API
* групувати commands і queries у зрозумілі об’єкти
* розділяти read і write scenarios
* додавати custom API через plugins
* зберігати межу між runtime і integration layer

## 9.2. System facades

Базова поставка Extensia має містити щонайменше два system facades:

* `storage`
* `query`

Ці імена є reserved.

User plugins не повинні реєструвати фасади з такими іменами.

## 9.3. Custom facades

Plugin може зареєструвати custom facade.

Приклади:

* `preview`
* `importer`
* `exporter`
* `gameAssets`
* `mediaPipeline`
* `semanticSearch`

Custom facade має мати унікальне ім’я в межах одного Extensia Module.

## 9.4. Facade naming rules

Facade name має бути:

* стабільним
* непорожнім
* унікальним у межах module instance
* case-sensitive або case-normalized за єдиним правилом implementation
* не reserved, якщо facade не system

Рекомендований формат:

```text
storage
query
preview
importer
gameAssets
semanticSearch
vendor.feature
```

Для plugin ecosystem бажано використовувати namespaced names, якщо є ризик collision.

## 9.5. Facade registry contract

Концептуальний контракт:

```ts
interface IFacadeRegistry {
    register<TFacade>(
        name: FacadeName,
        facade: TFacade,
        options?: IFacadeRegistrationOptions
    ): IExtensiaResult<void>

    get<TFacade = unknown>(name: FacadeName): TFacade | null
    getRequired<TFacade = unknown>(name: FacadeName): TFacade
    has(name: FacadeName): boolean
    list(): FacadeName[]

    freeze(): void
    isFrozen(): boolean
}

interface IFacadeRegistrationOptions {
    system?: boolean
    owner?: string
    override?: false
}
```

За базовим правилом `override` не підтримується.

Якщо facade з таким іменем уже зареєстрований, registration має завершитися failure.

## 9.6. Registry write/read phases

Facade Registry має різні phases:

```text
created
  ↓
registering
  ↓
frozen
```

Під час `registering` system extensions і plugins можуть реєструвати facades через дозволений context.

Після `frozen` registration заборонена.

Read access після `frozen` дозволений через Extensia Module і Plugin Context.

## 9.7. Freeze registry

Facade Registry заморожується до завершення `start()`.

Це забезпечує:

* передбачуваний public API після startup
* відсутність випадкової зміни surface API під час runtime
* простіше тестування
* простішу роботу агентських систем із доступними фасадами
* узгодженість із immutable composed runtime boundary

Dynamic registration після startup не є базовим правилом v2.

## 9.8. Facade access from application code

Application code має отримувати facades через Extensia Module:

```ts
const storage = extensia.storage()
const query = extensia.query()
const preview = extensia.facade<IPreviewFacade>('preview')
```

Application code не має отримувати facades через IoC tokens.

## 9.9. Facade access from plugins

Plugin може отримувати facades через `context.facades`.

```ts
const query = context.facades.getRequired<IQueryFacade>('query')
```

Якщо plugin залежить від facade, він має оголосити це в descriptor `requires`.

Runtime lookup без descriptor declaration допустимий тільки для optional capability і має обробляти відсутність facade явно.

---

# 10. Facade Provider Model

## 10.1. Призначення Facade Provider

Facade Provider відокремлює опис facade від моменту його фактичного створення.

Це потрібно для:

* validation перед startup
* dependency-aware ordering
* diagnostics
* test overrides
* підтримки system extensions і user plugins через один механізм
* уникнення випадкової реєстрації після freeze

## 10.2. Концептуальний контракт

```ts
interface IFacadeProvider<TFacade = unknown> {
    readonly name: FacadeName
    readonly owner: string
    readonly system?: boolean

    readonly requires?: IFacadeProviderRequirement[]

    create(context: IFacadeFactoryContext): PromisedResult<TFacade>
}

interface IFacadeProviderRequirement {
    kind: 'facade' | 'port' | 'service'
    name: string
    required?: boolean
}

interface IFacadeFactoryContext {
    readonly core: ICoreExtensionPort
    readonly facades: IFacadeRegistry
    readonly hooks: IHookRegistry
    readonly diagnostics?: IDiagnosticsPort
    readonly options?: Record<string, unknown>
}
```

`create()` має повертати готовий facade object або failure result.

## 10.3. Provider registration flow

Типовий flow:

```text
collect facade providers
  ↓
validate unique facade names
  ↓
validate reserved names
  ↓
validate provider requirements
  ↓
sort providers by dependency order
  ↓
create facade instance
  ↓
registry.register(name, facade)
  ↓
freeze registry
```

## 10.4. System facade provider example

Концептуальний приклад:

```ts
const storageFacadeProvider: IFacadeProvider<IStorageFacade> = {
    name: 'storage',
    owner: 'extensia.default-api',
    system: true,

    async create(context) {
        return ok(createStorageFacade({
            core: context.core,
            diagnostics: context.diagnostics
        }))
    }
}
```

## 10.5. Custom facade provider example

```ts
const previewFacadeProvider: IFacadeProvider<IPreviewFacade> = {
    name: 'preview',
    owner: 'extensia.preview',
    requires: [
        { kind: 'facade', name: 'query' },
        { kind: 'facade', name: 'storage' }
    ],

    async create(context) {
        const query = context.facades.getRequired<IQueryFacade>('query')
        const storage = context.facades.getRequired<IStorageFacade>('storage')

        return ok(createPreviewFacade({ query, storage }))
    }
}
```

## 10.6. Facade providers as IoC multi contributions

Internal implementation may represent facade providers as IoC multi contributions.

Conceptual module:

```ts
import { defineModule } from '@sagifire/ioc'

export const defaultApiExtensionModule = defineModule({
    id: 'extensia.default-api',

    requires: [
        { token: CORE_EXTENSION_PORT },
        { token: FACADE_REGISTRY_PORT }
    ],

    provides: [
        {
            token: FACADE_PROVIDER_CONTRIBUTIONS,
            kind: 'custom',
            cardinality: 'multi'
        }
    ],

    setup(ctx) {
        ctx.add(FACADE_PROVIDER_CONTRIBUTIONS).toFactory(({ get }) => {
            return createStorageFacadeProvider({
                core: get(CORE_EXTENSION_PORT)
            })
        })

        ctx.add(FACADE_PROVIDER_CONTRIBUTIONS).toFactory(({ get }) => {
            return createQueryFacadeProvider({
                core: get(CORE_EXTENSION_PORT)
            })
        })
    }
})
```

Цей sketch є implementation-level прикладом. Public plugin authors не зобов’язані писати такі modules.

## 10.7. Provider failures

Якщо facade provider не може створити facade:

* startup має повернути failure, якщо provider required
* diagnostics мають містити owner, facade name і error code
* partially created facade registry не має публікуватися як ready
* created facades мають бути disposed, якщо вони підтримують disposal і startup rollback потрібен

---

# 11. Default API Facades

## 11.1. Default API Extension

Базова поставка Extensia має містити system extension `extensia.default-api`.

Його роль:

* надати `storage` facade
* надати `query` facade
* оголосити ці facades як system provisions
* підключитися через той самий extension/facade provider mechanism, що й user extensions

Це означає, що system API не є окремим ручним винятком.

## 11.2. Storage Facade

`storage` facade групує state-changing commands.

Він відповідає за operations, які змінюють стан Resource, Asset, Mark або KV.

Концептуальний контракт:

```ts
interface IStorageFacade {
    createResource(input: ICreateResourceInput): PromisedResult<IResourceDTO>
    updateResource(id: IDString, patch: IUpdateResourceInput): PromisedResult<IResourceDTO>
    deleteResource(id: IDString): PromisedResult<IResourceDTO>
    moveResource(id: IDString, input: IMoveResourceInput): PromisedResult<IResourceDTO>

    createAsset(resourceId: IDString, input: ICreateAssetInput): PromisedResult<IAssetDTO>
    updateAsset(resourceId: IDString, assetId: IDString, patch: IUpdateAssetInput): PromisedResult<IAssetDTO>
    setPrimaryAsset(resourceId: IDString, assetId: IDString | null): PromisedResult<IResourceDTO>

    uploadAssetPart(resourceId: IDString, assetId: IDString, part: IAssetUploadPart): PromisedResult<IAssetUploadProgress>
    finishAssetUpload(resourceId: IDString, assetId: IDString): PromisedResult<IAssetDTO>
    abortAssetUpload(resourceId: IDString, assetId: IDString): PromisedResult<IAssetDTO>

    setMarks(resourceId: IDString, marks: IMarkDTO[]): PromisedResult<IResourceDTO>
    setKV(resourceId: IDString, namespace: string, values: Record<string, string>): PromisedResult<IResourceDTO>
}
```

Назви методів є концептуальними. Фінальний API може уточнювати їх, але роль `storage` facade залишається сталою: **змінювати state через Core operation pipeline**.

## 11.3. Storage Facade rules

`storage` facade має:

* validate user input на рівні public API
* викликати Core Extension Port для state-changing operations
* не обходити Async Lock Queue, Operation Journal або Storage Driver
* повертати normalized result
* відхиляти state-changing methods, якщо storage driver працює в `readonly` mode
* передавати operation-local metadata через дозволений runtime mechanism, а не global mutable state

`storage` facade не повинен:

* напряму писати файли в physical storage
* напряму змінювати Hot Metadata Index
* напряму редагувати Operation Journal
* змінювати domain DTO в обхід Core
* отримувати internal runtime services через private IoC tokens

## 11.4. Query Facade

`query` facade групує read-only operations.

Він відповідає за пошук, перевірки наявності і читання стану.

Концептуальний контракт:

```ts
interface IQueryFacade {
    resourceExists(id: IDString): PromisedResult<boolean>
    assetExists(assetId: IDString): PromisedResult<boolean>

    findResourceById(id: IDString): PromisedResult<IResourceDTO | null>
    findResources(query: IResourceQuery): PromisedResult<IResourceDTO[]>

    findAssetById(assetId: IDString): PromisedResult<IAssetLookupResult | null>
    getResourceAssets(resourceId: IDString): PromisedResult<IAssetDTO[]>
    getPrimaryAsset(resourceId: IDString): PromisedResult<IAssetDTO | null>

    getChildren(resourceId: IDString | null): PromisedResult<IResourceChildRef[]>

    getMarkList(type?: string): PromisedResult<IMarkDescriptor[]>
    getMarkStatListByType(type: string): PromisedResult<IMarkStat[]>

    readAssetFile(assetId: IDString): PromisedResult<ReadableAssetStream>
}
```

## 11.5. Query Facade rules

`query` facade має:

* не змінювати durable state
* використовувати Core Extension Port read API
* використовувати Hot Metadata Index, lazy loading або driver reads відповідно до runtime mode
* повертати результат, узгоджений із read model Extensia
* не записувати Operation Journal
* не запускати hidden state-changing side effects

`query` facade може повертати дані з process-local Hot Metadata Index.

У multi-process scenarios видимість external changes залежить від External Change Sync або explicit refresh API, якщо такий буде наданий runtime layer.

---

# 12. Plugin Model

## 12.1. Призначення plugins

Plugin — основна public одиниця розширення Extensia.

Plugins потрібні для сценаріїв, які не мають бути вбудовані в базовий Core.

Типові сценарії:

* генерація preview або thumbnail після upload asset
* імпорт медіа з external source
* експорт resource pack
* автоматичне проставлення marks
* додатковий прикладний search
* integration із зовнішнім індексатором
* custom facade для конкретного product
* domain-specific automation у gamedev або media applications

## 12.2. Plugin identity

Кожен plugin має мати унікальний `name` у межах одного Extensia Module.

```ts
interface IPluginIdentity {
    readonly name: string
    readonly version?: string
}
```

`name` має бути стабільним і не залежати від мінливих деталей збірки.

Не рекомендується покладатися на `constructor.name` як на єдине джерело identity plugin, бо minification, bundling або refactoring можуть змінити його без зміни суті plugin.

## 12.3. Концептуальний контракт plugin

```ts
interface IExtensiaPlugin {
    readonly name: string
    readonly version?: string

    init(context: IPluginContext): PromisedResult<void>

    start?(context: IPluginContext): PromisedResult<void>
    stop?(context: IPluginContext): PromisedResult<void>
}
```

Мінімальна вимога до plugin — реалізувати `init()`.

`start()` і `stop()` є optional lifecycle methods для plugins, які мають власні активні ресурси:

* timers
* watchers
* external connections
* background tasks inside application process
* caches
* queues

## 12.4. Plugin Context

Plugin Context надає plugin контрольований доступ до можливостей Extensia.

```ts
interface IPluginContext {
    readonly pluginName: string
    readonly pluginVersion?: string

    readonly core: ICoreExtensionPort
    readonly hooks: IHookRegistry
    readonly facades: IFacadeRegistry

    readonly config: Record<string, unknown>
    readonly diagnostics?: IDiagnosticsPort

    readonly lifecycle: IPluginLifecycleInfo
}

interface IPluginLifecycleInfo {
    readonly phase: 'init' | 'start' | 'stop'
    readonly moduleState: ExtensiaModuleState
}
```

Plugin Context не є IoC container.

Заборонено додавати в базовий context:

```ts
readonly container: ComposedRuntime
readonly get: <T>(token: Token<T>) => T
```

Якщо advanced plugin потребує IoC-level integration, це має бути окремий experimental extension module API.

## 12.5. Plugin init

`init(context)` виконується під час startup після запуску core runtime і до freeze facade registry.

У `init()` plugin може:

* зареєструвати hooks
* зареєструвати facade providers або facades через дозволений registry API
* перевірити optional dependencies
* підготувати internal state
* додати diagnostics metadata

У `init()` plugin не повинен:

* запускати довготривалі background tasks, якщо для цього є `start()`
* мутувати private Core internals
* створювати власний transaction layer
* реєструвати facades, не оголошені у descriptor `provides`, якщо strict validation mode увімкнений

## 12.6. Plugin start

`start(context)` виконується після успішного `init()` і після реєстрації потрібних facades, але до завершення module `start()`.

У `start()` plugin може:

* запускати watchers
* відкривати external connections
* запускати internal queues
* виконувати warmup для власних services

`start()` не має змінювати facade registry, якщо registry уже переходить у freeze phase.

## 12.7. Plugin stop

`stop(context)` виконується під час shutdown у reverse lifecycle order.

Plugin має:

* звільнити subscriptions, якщо вони не managed registry
* зупинити timers/watchers
* закрити external connections
* flush власні queues, якщо це потрібно
* повернути warnings/errors через normalized result

Failure в `stop()` не має блокувати весь shutdown назавжди.

## 12.8. Plugin lifecycle order

Типовий lifecycle:

```text
normalize descriptor
  ↓
create plugin instance
  ↓
validate plugin identity
  ↓
validate declared dependencies
  ↓
create plugin context
  ↓
plugin.init(context)
  ↓
register hooks / facade providers
  ↓
create registered facades
  ↓
plugin.start?(context)
  ↓
runtime ready
  ↓
plugin.stop?(context) during shutdown
```

## 12.9. Plugin dependencies

Plugin dependencies мають бути декларативними.

Базовий plugin не повинен вручну виявляти required facade тільки під час `init()` як основний механізм dependency validation.

Небажано як основна модель:

```ts
if (!context.facades.has('preview')) {
    return fail('PLUGIN_DEPENDENCY_MISSING', 'preview facade is required')
}
```

Бажано:

```ts
const descriptor: IPluginDescriptor = {
    plugin: myPlugin,
    requires: [
        { kind: 'facade', name: 'preview' }
    ]
}
```

Plugin все одно може перевіряти optional dependencies runtime-time, але required dependencies мають бути видимі extension graph до startup.

## 12.10. Plugin factory

Plugin factory використовується, коли plugin потребує config-dependent construction.

```ts
const descriptor: IPluginDescriptor = {
    plugin: ({ options }) => createPreviewPlugin({
        outputRole: String(options?.outputRole ?? 'thumbnail')
    }),
    options: {
        outputRole: 'preview'
    }
}
```

Factory має бути deterministic і не має запускати runtime side effects, які належать `init()` або `start()`.

---

# 13. Core Extension Port

## 13.1. Призначення

Core Extension Port є стабільнішим контрактом, ніж internal Core class.

Plugins і facades мають використовувати саме цей port для доступу до runtime functionality.

## 13.2. Концептуальний контракт

```ts
interface ICoreExtensionPort {
    readonly mode: CoreLoadingMode
    readonly storageMode: StorageCapabilityMode

    execute<T>(operation: ICoreOperationRequest): PromisedResult<T>
    read<T>(request: ICoreReadRequest): PromisedResult<T>

    refresh?(): PromisedResult<void>
}
```

Фінальна форма контракту може відрізнятися.

Ключове правило: **Core Extension Port не дозволяє обходити operation pipeline для state-changing actions.**

## 13.3. Command access

State-changing behavior має викликатися через `execute()` або typed command wrappers над ним.

Facade може приховати низькорівневу форму operation request:

```ts
async function createResource(input: ICreateResourceInput) {
    return core.execute<IResourceDTO>({
        type: 'resource.create',
        payload: input
    })
}
```

## 13.4. Read access

Read-only behavior має викликатися через `read()` або typed read wrappers.

```ts
async function findResourceById(id: IDString) {
    return core.read<IResourceDTO | null>({
        type: 'resource.find_by_id',
        payload: { id }
    })
}
```

## 13.5. Port boundaries

Core Extension Port не повинен надавати:

* direct Storage Driver instance
* direct Hot Metadata Index mutation API
* direct Operation Journal writer
* private lock queue access
* arbitrary internal service resolver
* raw IoC composed runtime

---

# 14. Hook Integration Model

## 14.1. Призначення hooks для plugins

Hooks дозволяють plugins реагувати на lifecycle і domain/runtime events без переписування базових facades.

Plugins можуть використовувати hooks для:

* реакції на створення Resource
* реакції на створення Asset
* запуску automation після upload finished
* додаткової pre-commit validation
* нормалізації input
* оновлення зовнішнього index після committed operation
* diagnostic logging

## 14.2. Концептуальний контракт hook registry

```ts
type HookName = string

interface IHookRegistry {
    on<TEvent>(name: HookName, handler: IEventHookHandler<TEvent>): IHookSubscription
    filter<TPayload>(name: HookName, handler: IFilterHookHandler<TPayload>): IHookSubscription
}

type IEventHookHandler<TEvent> = (event: TEvent) => void | Promise<void>

type IFilterHookHandler<TPayload> = (payload: TPayload) => TPayload | Promise<TPayload>

interface IHookSubscription {
    unsubscribe(): void
}
```

## 14.3. Event hooks

Event hooks повідомляють про факт події.

Вони не повинні змінювати already committed state.

Типові event hooks:

```text
runtime.started
runtime.stopping
runtime.stopped
plugin.initialized
plugin.started
plugin.stopped
operation.committed
resource.created
resource.updated
resource.deleted
asset.created
asset.upload_finished
marks.changed
kv.changed
external_changes.synchronized
```

Назви є концептуальними і можуть бути уточнені фінальною реалізацією.

## 14.4. Filter hooks

Filter hooks можуть виконуватися до commit stage.

Вони можуть:

* нормалізувати input
* додати application validation
* відхилити operation через validation error
* трансформувати operation payload у межах дозволеного contract

Filter hooks не повинні створювати side effects, які неможливо відкотити, якщо operation не буде committed.

## 14.5. Hook subscriber contributions

Internal implementation may represent hook subscriptions as contributions.

```ts
interface IHookSubscriberContribution {
    readonly owner: string
    readonly hook: HookName
    readonly kind: 'event' | 'filter'
    register(context: IHookRegistrationContext): IExtensiaResult<IHookSubscription>
}
```

Це дозволяє:

* inspect hook subscriptions до startup
* validate hook names
* cleanup subscriptions during stop
* test hook registration окремо від full runtime

## 14.6. Hook failure policy

Політика помилок залежить від типу hook.

Базове правило:

* failure pre-commit filter може зупинити operation
* failure post-commit event не повинен відкочувати durable operation
* post-commit failures можуть бути returned as warnings, recorded in diagnostics або handled by plugin policy

## 14.7. Subscription ownership

Plugin є власником своїх hook subscriptions.

Якщо Hook Registry підтримує managed subscriptions by owner, Extensia може автоматично звільняти їх під час plugin stop.

Якщо plugin створює зовнішні subscriptions поза Hook Registry, він має звільнити їх самостійно.

---

# 15. API Result Model

## 15.1. Призначення result model

Public API має надавати передбачувану модель результатів.

Expected errors не повинні вимагати від користувацького коду ловити exceptions як основний сценарій.

Методи facades і plugin lifecycle концептуально повертають `IExtensiaResult<T>`.

## 15.2. Концептуальний контракт

```ts
interface IExtensiaResult<T> {
    status: boolean
    result: T | null
    error: IExtensiaError | null
    warnings?: IExtensiaWarning[]
}

interface IExtensiaError {
    code: string
    message: string
    details?: Record<string, unknown>
    cause?: unknown
}

interface IExtensiaWarning {
    code: string
    message: string
    details?: Record<string, unknown>
}
```

## 15.3. Success result

Успішний результат має мати:

```text
status: true
result: value
error: null
```

## 15.4. Failure result

Помилковий результат має мати:

```text
status: false
result: null
error: object
```

## 15.5. Expected errors

Expected errors — це помилки, які є частиною нормальної роботи API.

Приклади:

* resource not found
* asset not found
* duplicate mark
* invalid external asset url
* readonly storage modification attempt
* plugin initialization failure
* plugin dependency missing
* facade name already registered
* composition graph invalid
* extension graph invalid

Такі errors мають повертатися через result model.

## 15.6. Unexpected exceptions

Unexpected exceptions можуть бути thrown у випадках programming error, порушення internal contract або аварійного стану, який не може бути коректно нормалізований.

Public facades мають прагнути нормалізувати runtime і validation failures у `IExtensiaResult<T>`.

---

# 16. Command and Query Separation

## 16.1. Commands

Command — API method, який змінює state Extensia.

Commands мають проходити через Core operation pipeline.

Приклади:

* `createResource`
* `updateResource`
* `deleteResource`
* `createAsset`
* `uploadAssetPart`
* `finishAssetUpload`
* `setMarks`
* `setKV`

Commands мають:

* validate input
* підтримувати domain invariants
* повертати normalized result
* не публікувати partially successful state
* не обходити Core Extension Port

## 16.2. Queries

Query — API method, який читає state Extensia і не змінює durable state.

Приклади:

* `findResourceById`
* `findResources`
* `resourceExists`
* `assetExists`
* `getPrimaryAsset`
* `getChildren`
* `readAssetFile`

Queries не записуються в Operation Journal.

## 16.3. Mixed operations

API methods не повинні непомітно змішувати read і write behavior.

Якщо method змінює durable state, він є command навіть тоді, коли повертає дані як query.

## 16.4. Facade naming clarity

Facade method names мають відображати command/query nature.

Небажано:

```ts
query.ensurePreview(resourceId)
```

Якщо method створює preview, він має бути command і належати `storage`, `preview`, `mediaPipeline` або іншому command-capable facade.

---

# 17. Public API Input Rules

## 17.1. DTO boundaries

Public API може приймати input DTO і повертати result DTO, але не повинен дозволяти користувачу напряму мутувати internal runtime state.

DTO, повернуті з query facade, мають трактуватися як data snapshots.

Зміна такого об’єкта в користувацькому коді не повинна змінювати стан Extensia без explicit command call.

## 17.2. Partial updates

Оновлення Resource або Asset має відбуватися через explicit patch/input DTO.

Не рекомендується використовувати повний `IResourceDTO` як універсальний input для всіх update operations, бо це підвищує ризик випадкової заміни похідних або службових полів.

## 17.3. `children[]` rule

`children[]` є похідною projection.

Public API не повинен використовувати `children[]` як основний input для зміни hierarchy.

Для переміщення resource має використовуватися explicit command, яка змінює `parent_id` і `order_index` через Core operation pipeline.

## 17.4. External asset input

Під час створення external asset API має перевіряти:

```text
is_external: true
url: not null
is_on_uploading: false
```

## 17.5. Internal asset input

Під час створення internal asset API має перевіряти:

```text
is_external: false
url: null
```

Якщо файл ще не завантажений, asset може бути створений із:

```text
is_on_uploading: true
```

## 17.6. Reserved fields

Public input DTO не мають дозволяти довільне встановлення fields, які належать runtime lifecycle або domain invariants.

Наприклад:

* `created_at`
* `updated_at`
* journal sequence
* upload staged state
* internal driver paths
* private metadata used by runtime

Такі поля мають задаватися Core або runtime layer.

---

# 18. System Extensions and Default Facades

## 18.1. Призначення system extensions

System extensions потрібні для того, щоб базова functionality public API підключалася через той самий extension mechanism, що й user plugins.

Це спрощує модель:

* facades завжди реєструються через Facade Registry
* system API не є ручним винятком
* default facades можуть тестуватися як extension contributions
* user plugins працюють у тій самій extension model

## 18.2. Default API Extension

Базова поставка Extensia має містити system extension, який надає:

* `storage` facade
* `query` facade

Концептуальний descriptor:

```ts
const defaultApiExtension: IExtensiaExtensionDescriptor = {
    name: 'extensia.default-api',
    kind: 'system',
    provides: [
        { kind: 'facade', name: 'storage', system: true },
        { kind: 'facade', name: 'query', system: true }
    ]
}
```

## 18.3. Default API as internal module

Default API Extension може бути реалізований як internal IoC module.

```ts
export const defaultApiModule = defineModule({
    id: 'extensia.default-api',

    requires: [
        { token: CORE_EXTENSION_PORT },
        { token: FACADE_REGISTRY_PORT }
    ],

    provides: [
        {
            token: FACADE_PROVIDER_CONTRIBUTIONS,
            kind: 'custom',
            cardinality: 'multi'
        }
    ],

    setup(ctx) {
        ctx.add(FACADE_PROVIDER_CONTRIBUTIONS).toFactory(({ get }) => {
            return {
                name: 'storage',
                owner: 'extensia.default-api',
                system: true,
                create() {
                    return ok(createStorageFacade(get(CORE_EXTENSION_PORT)))
                }
            }
        })

        ctx.add(FACADE_PROVIDER_CONTRIBUTIONS).toFactory(({ get }) => {
            return {
                name: 'query',
                owner: 'extensia.default-api',
                system: true,
                create() {
                    return ok(createQueryFacade(get(CORE_EXTENSION_PORT)))
                }
            }
        })
    }
})
```

Цей module є internal implementation detail. Public API лишається `extensia.storage()` і `extensia.query()`.

## 18.4. Reserved facade names

Такі імена є reserved:

```text
storage
query
```

Майбутні system facades також мають бути внесені до reserved list.

User plugins не повинні реєструвати facades з reserved names.

## 18.5. System extension failure

Failure system extension зазвичай має зупиняти startup, бо без default API Extensia Module не може надати базовий public contract.

---

# 19. Custom Facade Design

## 19.1. Коли потрібен custom facade

Custom facade доречний, коли plugin надає набір methods, якими має напряму користуватися application.

Приклади:

* `preview.generate(resourceId)`
* `importer.importFolder(path)`
* `gameAssets.buildPack(options)`
* `semanticSearch.findSimilar(resourceId)`

Якщо plugin лише реагує на hooks і не має public API, custom facade не потрібен.

## 19.2. Правила custom facade

Custom facade має:

* мати unique name
* бути declared у extension descriptor, якщо strict mode увімкнений
* бути registered під час startup до registry freeze
* використовувати Core Extension Port або дозволені facades
* повертати normalized results
* не обходити operation pipeline для state-changing actions
* мати clear command/query semantics

Custom facade не повинен:

* змінювати internal Core structures напряму
* реєструватися після registry freeze
* override system facades
* приховано запускати state-changing operation у method, який виглядає як pure query
* отримувати private runtime dependencies через IoC container

## 19.3. Facade composition

Custom facade може використовувати інші facades, якщо вони declared як dependencies і available під час creation.

Наприклад, `preview` facade може використовувати:

* `query` для отримання Resource і Asset
* `storage` для створення нового derived Asset
* hooks для reaction на upload finished

Facade composition не повинна створювати cycles, які неможливо ініціалізувати deterministic.

## 19.4. Facade dependency declaration

Custom facade dependencies мають бути declared:

```ts
const previewDescriptor: IPluginDescriptor = {
    plugin: previewPlugin,
    requires: [
        { kind: 'facade', name: 'query' },
        { kind: 'facade', name: 'storage' }
    ],
    provides: [
        { kind: 'facade', name: 'preview' }
    ]
}
```

Facade provider також може мати власний `requires`, якщо facade dependency точніша за plugin dependency.

## 19.5. Facade disposal

Якщо custom facade володіє disposable resource, він має або:

* делегувати lifecycle plugin `stop()`
* реалізувати optional disposal interface
* зареєструвати lifecycle contribution

Концептуально:

```ts
interface IDisposableFacade {
    dispose(): void | Promise<void>
}
```

Extensia Module може викликати disposal під час stop, якщо facade registry знає owner і lifecycle contract.

---

# 20. Advanced IoC Extension Module API

## 20.1. Статус

Advanced IoC Extension Module API є optional / experimental capability.

Базовий plugin author не повинен використовувати `@sagifire/ioc` напряму.

Цей API потрібен тільки для cases, де extension має складну internal dependency graph і хоче надати contributions на composition layer.

## 20.2. Призначення

Advanced module може бути доречний для:

* storage-driver packages
* official system extensions
* large plugin packages із власними internal services
* integration packages, які мають кілька facades і lifecycle resources
* testkit modules

## 20.3. Концептуальний контракт

```ts
interface IExtensiaExtensionModuleFactory {
    (context: IExtensiaExtensionModuleFactoryContext): IExtensiaExtensionModule
}

interface IExtensiaExtensionModuleFactoryContext {
    readonly extensionName: string
    readonly options?: Record<string, unknown>
    readonly experimental: boolean
}

interface IExtensiaExtensionModule {
    readonly name: string
    readonly module: unknown
    readonly provides?: IExtensionProvision[]
    readonly requires?: IExtensionRequirement[]
}
```

Фінальна форма має бути уточнена після стабілізації runtime token policy.

## 20.4. Restrictions

Advanced module не повинен:

* expose private Core tokens як public API
* resolve arbitrary internal providers
* override system providers without explicit testing policy
* register providers after compose
* create global containers
* depend on private token IDs from Extensia implementation

## 20.5. Public token policy

Якщо extension module needs a token, Extensia має надати public або experimental extension token.

Не можна вимагати від plugin author імпортувати internal tokens із path на кшталт:

```ts
import { HOT_METADATA_INDEX } from '@extensia/core/internal'
```

Allowed public/experimental tokens мають бути documented окремо.

## 20.6. Testing modules

Test modules можуть мати ширший доступ до composition layer, але тільки в test harness.

Test overrides мають застосовуватися до `compose()`.

Frozen production runtime не патчиться.

---

# 21. Plugin Error and Diagnostics Model

## 21.1. Initialization failure

Якщо plugin не може ініціалізуватися, він має повернути failure result з явним error code.

Приклади:

* `PLUGIN_CONFIG_INVALID`
* `PLUGIN_DEPENDENCY_MISSING`
* `PLUGIN_INIT_FAILED`
* `FACADE_ALREADY_REGISTERED`
* `HOOK_REGISTRATION_FAILED`

За базовим правилом initialization failure зупиняє startup Extensia Module.

## 21.2. Composition failure

Composition failure означає, що internal IoC graph не може бути складений.

Приклади:

* missing required port
* duplicate capability
* module dependency cycle
* invalid adapter source
* cardinality mismatch
* declared capability not registered

Extensia має повертати normalized error:

```ts
{
    code: 'COMPOSITION_INVALID',
    message: 'Extensia composition graph is invalid.',
    details: {
        diagnostics: []
    }
}
```

## 21.3. Extension graph failure

Extension graph failure означає, що plugin/facade dependency model невалідна.

Приклади:

* duplicate facade name
* reserved facade name used by user plugin
* missing required facade
* duplicate plugin name
* facade dependency cycle

Possible codes:

```text
EXTENSION_GRAPH_INVALID
EXTENSION_DEPENDENCY_MISSING
FACADE_DUPLICATE
FACADE_RESERVED_NAME
PLUGIN_DUPLICATE
FACADE_DEPENDENCY_CYCLE
```

## 21.4. Hook failure

Поведінка залежить від type hook:

* pre-commit filter failure може зупинити operation
* post-commit event failure не повинен rollback committed operation

## 21.5. Facade method failure

Errors facade method мають повертатися через `IExtensiaResult<T>`.

Facade method не повинен приховувати failure як success із некоректними даними.

## 21.6. Plugin stop failure

Failure під час `stop()` не повинен залишати Extensia Module в стані, де shutdown неможливо завершити.

Такі errors мають бути:

* normalized
* recorded in diagnostics
* returned as stop result або warnings
* isolated from cleanup of other plugins, якщо можливо

## 21.7. Diagnostics safety

Diagnostics не мають розкривати:

* provider values
* private runtime instances
* secret config values
* file credentials
* private tokens, якщо вони не потрібні для debugging і не marked safe

Diagnostics можуть містити:

* plugin name
* facade name
* extension name
* public token id
* error code
* lifecycle phase
* safe graph path

---

# 22. Testing Extension/API Layer

## 22.1. Test composition

Extension/API layer має тестуватися через fresh composition.

Test overrides застосовуються до `compose()`, а не до frozen runtime.

Це дозволяє:

* замінити Storage Driver на fake
* замінити diagnostics sink
* підключити fake plugins
* перевірити extension graph validation
* перевірити facade registry freeze
* перевірити startup failure cleanup

## 22.2. Conceptual test harness

```ts
interface IExtensiaTestHarnessOptions {
    config?: Partial<IExtensiaConfig>
    plugins?: IPluginDescriptor[]
    extensions?: IExtensiaExtensionDescriptor[]
    overrides?: ITestCompositionOverride[]
}

interface IExtensiaTestHarness {
    start(): PromisedResult<IExtensiaModule>
    inspectComposition(): IExtensiaInspectionSnapshot
    expectFacade(name: FacadeName): void
    expectNoFacade(name: FacadeName): void
    stop(): PromisedResult<void>
}
```

## 22.3. What to test

Extension/API tests мають покривати:

* default `storage` / `query` facades registered
* registry rejects duplicate facade names
* registry rejects user plugin reserved facade names
* plugin dependency missing returns startup failure
* optional plugin failure returns warning if policy allows
* plugin stop is called during shutdown
* hook subscriptions are cleaned up
* custom facade cannot mutate state outside operation pipeline
* readonly storage rejects commands through storage facade
* query facade does not write journal entries

## 22.4. Test-only overrides

Test-only overrides не повинні ставати production behavior.

Наприклад, у tests можна override `STORAGE_DRIVER`, але production runtime не має дозволяти зміну storage driver після compose.

## 22.5. Fake plugins

Fake plugins мають використовувати той самий public plugin contract, що й production plugins.

Це важливо, щоб test harness не створював паралельну extension model, яка працює тільки в tests.

---

# 23. Versioning and Compatibility

## 23.1. Plugin version

Plugin може оголошувати власну version:

```ts
readonly version?: string
```

Version потрібна для:

* diagnostics
* compatibility checks
* migration policy
* plugin dependency ranges
* developer tooling

## 23.2. Public API compatibility

Public facades мають бути стабільнішими за internal Core API.

Breaking changes у facades мають вважатися дорожчими, ніж зміни internal runtime implementation.

## 23.3. Extension contract compatibility

Обережно мають змінюватися:

* `IExtensiaPlugin`
* `IPluginContext`
* hook names
* facade registry behavior
* result model
* extension descriptor format
* Core Extension Port

Саме на них спирається зовнішня інтеграція.

## 23.4. Composition contract compatibility

Extensia має розрізняти:

* public facade API
* plugin API
* hook API
* Core Extension Port API
* internal IoC token/module API

Internal IoC tokens не є public API, якщо явно не позначені як public або experimental.

## 23.5. Experimental APIs

Якщо частина extension API experimental, це має бути явно позначено в documentation або types.

Experimental APIs можуть змінюватися швидше, але мають мати clear migration notes, якщо ними вже користуються official packages.

## 23.6. Reserved names compatibility

Reserved facade names мають змінюватися обережно.

Додавання нового reserved name може зламати plugin, який уже використовував це ім’я.

Тому бажано:

* заздалегідь документувати proposed system facade names
* рекомендувати user plugins використовувати namespaced names
* давати diagnostics із чітким migration path

---

# 24. Типові сценарії розширення

## 24.1. Preview generation plugin

Plugin слухає `asset.upload_finished` і створює preview / thumbnail для uploaded asset.

Descriptor:

```ts
const previewPluginDescriptor: IPluginDescriptor = {
    plugin: previewPlugin,
    requires: [
        { kind: 'facade', name: 'query' },
        { kind: 'facade', name: 'storage' }
    ],
    provides: [
        { kind: 'facade', name: 'preview' },
        { kind: 'hook-subscriber', hook: 'asset.upload_finished' }
    ]
}
```

Типова behavior:

1. Отримати event про finish upload.
2. Прочитати Resource і Asset через query/Core read API.
3. Згенерувати preview file у application/plugin code.
4. Створити derived Asset через storage/Core command.
5. Позначити новий Asset відповідними `type`, `role`, `derived_from`.

## 24.2. Import plugin

Plugin реєструє custom facade `importer`.

Facade може надавати methods:

* `importFile`
* `importFolder`
* `importManifest`

Усередині він створює Resource і Asset через standard commands.

Descriptor:

```ts
const importPluginDescriptor: IPluginDescriptor = {
    plugin: importPlugin,
    requires: [
        { kind: 'facade', name: 'storage' }
    ],
    provides: [
        { kind: 'facade', name: 'importer' }
    ]
}
```

## 24.3. Game asset pack plugin

Plugin додає custom facade для підготовки resource pack.

Він може:

* читати Resource через query facade
* filter assets by marks
* build manifest
* працювати з readonly або packed storage scenario

Descriptor:

```ts
const gameAssetsDescriptor: IPluginDescriptor = {
    plugin: gameAssetsPlugin,
    requires: [
        { kind: 'facade', name: 'query' }
    ],
    provides: [
        { kind: 'facade', name: 'gameAssets' }
    ]
}
```

## 24.4. Mark automation plugin

Plugin використовує hooks або custom commands для автоматичного проставлення marks.

Наприклад:

* позначати asset як `quality:approved`
* додавати `source:imported`
* оновлювати weighted marks після external analysis

Якщо plugin змінює durable state, він має робити це через Core Extension Port або `storage` facade.

## 24.5. Semantic search plugin

Plugin може надати facade `semanticSearch`.

Він може:

* слухати committed resource/asset events
* оновлювати external vector index
* надавати read-only search API
* повертати Resource IDs або DTO snapshots через query facade

Якщо semantic index є external state, plugin має документувати consistency model між Extensia journal і external index.

---

# 25. Rules for developers and agent systems

Цей розділ фіксує короткі правила інтерпретації, щоб developers і agent systems не вигадували власну Extensia в кожному другому реченні.

## 25.1. Treat Extensia as a library

Extensia слід трактувати як library, що запускається всередині process application.

Не слід трактувати Extensia як готовий server або network API.

## 25.2. Use facades for application integration

Application має використовувати public facades, а не internal Core API.

## 25.3. Use plugins for extension

Нову прикладну behavior слід додавати через plugins, hooks і custom facades.

Не слід розширювати Extensia через monkey-patching internal objects.

## 25.4. Do not use IoC runtime as public API

Application і normal plugins не повинні отримувати dependencies через raw IoC tokens.

`@sagifire/ioc` є internal composition mechanism Extensia Module.

## 25.5. Do not bypass operation pipeline

Будь-яка зміна Resource, Asset, Mark або KV має проходити через command / operation pipeline.

## 25.6. Do not treat plugins as isolated code

Plugins є trusted in-process code.

Не слід припускати, що Extensia isolates plugin від application або інших plugins.

## 25.7. Do not infer CMS behavior

Extensia не надає CMS-level behavior автоматично.

Plugins можуть допомогти побудувати CMS-like scenarios, але це не базова роль бібліотеки.

## 25.8. Do not register unknown public API implicitly

Будь-який custom facade має бути явно registered in Facade Registry.

Не слід вважати method частиною public API, якщо він не доступний через Extensia Module або registered facade.

## 25.9. Treat returned DTOs as snapshots

DTO, отримані з query facade, слід трактувати як snapshots.

Для зміни state потрібен explicit command.

## 25.10. Declare plugin dependencies

Якщо plugin потребує facade, plugin або capability, ця dependency має бути declared у descriptor.

Runtime probing через `hasFacade()` не має бути основним mechanism для required dependencies.

---

# 26. Інваріанти extension/API моделі

## 26.1. Module invariants

1. Extensia Module є головною точкою входу користувацького коду.
2. Extensia Module створює Composition Root.
3. Extensia Module запускає runtime controller.
4. Extensia Module відповідає за system extensions і user plugins.
5. Extensia Module публікує facades тільки після successful startup.
6. Після `stop()` facades не повинні приймати нові runtime-dependent operations.

## 26.2. Composition invariants

1. Runtime graph створюється до startup.
2. Runtime graph immutable після `compose()`.
3. Test overrides застосовуються до `compose()`, а не після нього.
4. Internal IoC public capability не є автоматично Extensia public API.
5. Private providers не доступні plugins або application code.
6. Composition diagnostics мають бути normalized в Extensia diagnostics.

## 26.3. Facade invariants

1. Кожен facade має unique name у межах Extensia Module.
2. `storage` і `query` є reserved system facade names.
3. Facade не повинен обходити Core operation pipeline.
4. Query facade не повинен змінювати durable state.
5. Storage facade має виконувати state-changing commands тільки через Core Extension Port.
6. Facade Registry має бути frozen після startup, якщо dynamic extensions не підтримані явно.
7. Custom facade має бути owned by plugin/extension.

## 26.4. Plugin invariants

1. Кожен plugin має unique `name`.
2. Plugin має реалізувати `init()`.
3. Plugin має використовувати Plugin Context для доступу до Extensia.
4. Plugin не повинен напряму мутувати Core, Hot Index, Journal або physical storage.
5. Plugin має register hooks і facades під час дозволеного lifecycle phase.
6. Required plugin dependencies мають бути declared.
7. Plugin є trusted in-process code, а не sandboxed extension.
8. Plugin Context не є IoC container.

## 26.5. Hook invariants

1. Event hook не повинен rollback committed operation.
2. Pre-commit filter може зупинити operation через failure result.
3. Hook handler має дотримуватися failure policy свого hook type.
4. Plugin є owner своїх subscriptions.
5. Post-commit handlers бажано робити idempotent.

## 26.6. Result invariants

1. Expected errors мають повертатися через normalized result.
2. Failure result має містити error object.
3. Success result не повинен містити active error.
4. Public facade не повинен mask failure as success із некоректним result.

## 26.7. Extension graph invariants

1. Extension graph має бути validated до facade registry freeze.
2. Duplicate facade provisions заборонені.
3. Missing required facade має зупинити startup.
4. Optional dependencies мають бути explicit.
5. Facade dependency cycles мають бути detected.
6. Reserved facade names можуть надавати тільки system extensions.

---

# 27. Межі extension/API моделі

Extension/API model не робить Extensia:

* server
* HTTP API
* RPC framework
* authorization system
* sandbox для untrusted plugins
* CMS
* workflow engine
* general-purpose dependency injection framework
* marketplace platform для plugins
* distributed plugin runtime
* browser extension system

Вона визначає, як Extensia інтегрується в application і як functionality може controlled way розширюватися.

`@sagifire/ioc` у цій моделі є internal composition layer, а не новий public abstraction для application code.

---

# 28. Стислий підсумок

Extension/API model Extensia v2 будується навколо п’яти понять:

* **Extensia Module** — головна точка входу library
* **facades** — public API для commands, queries і custom scenarios
* **plugins** — controlled mechanism для extension functionality
* **extension descriptors** — декларативний опис dependencies і provisions
* **internal IoC composition** — deterministic assembly runtime і extension graph через `@sagifire/ioc`

Core залишається internal runtime coordinator.

Application працює з facades.

Plugins додають behavior через hooks, facade providers і Core Extension Port.

Extensia Composition Root використовує `@sagifire/ioc` для typed tokens, modules, validation, diagnostics, multi contributions і immutable runtime, але не робить IoC container public API бібліотеки.

Така модель дозволяє Extensia v2 залишатися embeddable media asset management library із гнучким runtime, контрольованими extension points і стабільною public integration surface.
