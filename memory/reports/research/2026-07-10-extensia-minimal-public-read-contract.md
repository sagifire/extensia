# Мінімальний public read contract Extensia

Status: accepted
Date: 2026-07-10
Task: `TASK-07.26-0015 / BP2-01`
Research: `RSCH-001`

## 1. Рішення в одному абзаці

Для `P2-VS1` пропонується один side-effect-free factory `createExtensia(config)`, явні `start()` / `stop()`, dedicated nullable accessors `query()` / `storage()`, discriminated `ExtensiaResult`, два public reads `getResource()` / `getResourceTree()` і один тимчасовий readonly proof `storage.createResource(input: unknown)` із неможливим success type `never`. Facades публікуються тільки після повністю успішного startup і frozen Registry; `stop()` спочатку закриває та drain-ить read intake. Public API не містить Core, IoC, generic resolver, custom facade lookup, plugins, hooks, write DTO або final Storage Driver contract. Спільну consumer-owned internal seam materialize-ить окрема prerequisite BP2-01A, після чого BP2-02/BP2-03 можуть реалізовувати provider та facade сторони паралельно без shared-file race.

## 2. Джерела рішень та межі

Рішення спирається на accepted requirements `REQ-API-001..006`, `REQ-RUN-001..005`, `REQ-QLT-001..003`, ADR-0003/0004/0005/0006, canonical UUID/Timestamp/DTO baseline і фактичний Phase 1 lifecycle/composition kernel. Draft specifications використані як alternatives input, а не скопійовані як public contract.

Не стабілізуються successful writes, write inputs, final driver protocol, plugins/extensions, custom facades, hooks, lazy/global query semantics, Asset file reads, journal/recovery або compatibility policy всього release.

### 2.1. Простежуваність рішень

| Рішення | Authority / input | Статус у BP2-01 |
|---|---|---|
| Module як application entry, facades замість Core/IoC | `REQ-API-001/002`, ADR-0003/0004, API draft §3/§6 | Успадковане accepted constraint; exact factory/accessors є новим P2-DG1 choice |
| Reserved `query`/`storage`, freeze до ready | `REQ-API-003/006`, ADR-0004, API draft §9/§18 | Успадкована semantics; name pattern/provenance/publication point є новими P2-DG1 choices |
| Normalized expected failures | `REQ-API-004`, API draft §15, runtime draft §22 | Успадкована semantics; discriminated shape/error subset є новими P2-DG1 choices |
| Detached JSON-safe DTO | `REQ-API-005`, domain target/rules, accepted BP1-02 | Успадкований exact scalar/DTO contract; лише public export/read placement є P2-DG1 choice |
| Readonly rejection до mutation | `REQ-RUN-005`, technical rule 15, runtime draft §8.2/§20.4 | Успадкована invariant; temporary `never` proof method є новим experimental P2-DG1 choice |
| Greedy Resource/tree read slice | roadmap Phase 2, BP2-02/BP2-04 task contracts, runtime draft §13/§20 | Bounded P2 choice; full draft query catalog відхилено |
| Shared consumer-owned read port | technical rule 7, ADR-0003/0006, BP2-02/BP2-03 boundaries | Новий P2-DG1 internal contract із окремим materialization gate |

## 3. Матриця альтернатив

### 3.1. Створення module

| Варіант | Переваги | Недоліки | Рішення |
|---|---|---|---|
| `new Extensia(config)` | Знайомий object API | Public class shape і constructor semantics важче еволюціонувати; спокуса виконувати роботу в constructor | Відхилено |
| `createExtensia(config)` -> module | Side-effect-free construction; прихована implementation; зручні fresh instances у tests | На один import більше, ніж class | Обрано |
| `await startExtensia(config)` -> started handle | Неможливо побачити pre-start object | Змішує construction/start, ускладнює explicit lifecycle і rollback evidence | Відхилено |

Factory виконує side-effect-free safe extraction: через own data-property descriptors перевіряє, що raw config і `storage` є non-null objects, а `storage`/`driver` не є accessors. Для valid envelope він capture-ить exact driver object identity і створює новий frozen normalized envelope `{ storage: { driver } }`. Для missing/malformed/accessor envelope він зберігає internal invalid-config sentinel, не викликаючи getter і не кидаючи expected exception. `start()` спочатку перетворює sentinel або caught driver-shape access failure на `CONFIG_INVALID` до відкриття resources. Зовнішній config object і його nested envelope після construction не читаються, тому їхня подальша mutation не змінює module. Executable driver object не clone-иться і не freeze-иться: його identity навмисно shared як integration dependency. Driver не відкривається, composition не будується, facades не публікуються до `start()`.

### 3.2. Доступ до facade

| Варіант | Переваги | Недоліки | Рішення |
|---|---|---|---|
| Always-present facade properties | Простий call site | Публікує напівготову surface до startup; кожен call мусить симулювати readiness | Відхилено |
| Getter, який throws до startup | Простий success path | Expected lifecycle state стає exception path | Відхилено |
| `query()` / `storage()` -> facade або `null` | Не публікує facade до ready; no exception; узгоджено з frozen Registry | Потребує null check після `start()` | Обрано |
| Generic `facade(name)` | Готує custom extensions | Передчасно заморожує Phase 6 surface і typing policy | Deferred |

Після success `start()` обидва accessors повертають стабільні object identities до `stop()`. До startup, під час startup, після failed startup, під час/після stop вони повертають `null`. Уже отриманий facade object після stop не виконує роботу: його method повертає `MODULE_NOT_READY`.

### 3.3. Модель result

| Варіант | Переваги | Недоліки | Рішення |
|---|---|---|---|
| `{status, result|null, error|null}` з draft | Знайомий draft shape | Допускає незаконні комбінації; слабке narrowing | Відхилено |
| Exceptions для expected errors | Менше wrapper types | Суперечить accepted normalized-result boundary | Відхилено |
| Discriminated `{ok:true,value}` / `{ok:false,error}` | Неможливі invalid combinations; exhaustive narrowing | Потрібен wrapper | Обрано |

`message` не є machine compatibility key. Callers branch лише за `ok` і `error.code`.

### 3.4. Каталог query

| Варіант | Наслідок | Рішення |
|---|---|---|
| Повторити весь draft `IQueryFacade` | Заморожує Asset/Mark/search/lazy semantics до owner gates | Відхилено |
| `findResourceById(): Resource | null` і `getChildren()` | Missing змішаний із success-null; два calls можуть бачити різні snapshots | Відхилено |
| `getResource()` і one-level `getResourceTree()` | Покриває lookup/tree projection P2-VS1, explicit not-found і один detached tree snapshot | Обрано |

`getResourceTree()` не є recursive subtree. Він повертає Resource snapshot і безпосередні `children` refs, derived тільки з `parent_id`.

### 3.5. Доказ відмови storage

| Варіант | Наслідок | Рішення |
|---|---|---|
| Не експортувати `storage` до Phase 3 | Не доводить reserved system facade і readonly command boundary Phase 2 | Відхилено |
| Заморозити final `CreateResourceInput` зараз | Вирішує поза scope title/order/update policy | Відхилено |
| Generic `execute(command)` | Створює service-like command protocol і новий compatibility surface | Відхилено |
| Experimental `createResource(input: unknown): Result<never, ...>` | Реальний command call доводить failure-before-validation/mutation, не заявляючи write input contract | Обрано як Phase 2 proof |

Цей один method має status `experimental-phase-2`; його shape не є stabilized successful-write API. Після Phase 3 owner gate він або отримує exact input/success contract, або замінюється з migration note.

## 4. Точний public API/type snapshot proposal

Усі наведені exports розташовуються тільки в root `@sagifire/extensia`; нових subpath exports Phase 2 не створює.

```ts
declare const idStringBrand: unique symbol
declare const timestampBrand: unique symbol

export type IDString = string & { readonly [idStringBrand]: 'IDString' }
export type Timestamp = number & { readonly [timestampBrand]: 'Timestamp' }

export type JSONPrimitive = null | boolean | number | string
export type JSONValue = JSONPrimitive | JSONArray | JSONObject
export type JSONArray = readonly JSONValue[]
export interface JSONObject {
  readonly [key: string]: JSONValue
}

export type ExtensiaModuleState =
  | 'created'
  | 'starting'
  | 'started'
  | 'stopping'
  | 'stopped'
  | 'failed'

export type ExtensiaErrorCode =
  | 'CONFIG_INVALID'
  | 'MODULE_BUSY'
  | 'MODULE_INVALID_STATE'
  | 'MODULE_NOT_READY'
  | 'START_FAILED'
  | 'STOP_FAILED'
  | 'INVALID_RESOURCE_ID'
  | 'RESOURCE_NOT_FOUND'
  | 'STORAGE_READONLY'

export interface ExtensiaError<
  TCode extends ExtensiaErrorCode = ExtensiaErrorCode,
> {
  readonly code: TCode
  readonly message: string
}

export type ExtensiaResult<T, TError extends ExtensiaError = ExtensiaError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: TError }

export interface SafeDiagnostic {
  readonly code: string
  readonly stage: 'config' | 'composition' | 'start' | 'stop' | 'facade'
  readonly subject?: string
}

export interface ExtensiaInspection {
  readonly state: ExtensiaModuleState
  readonly ready: boolean
  readonly facades: readonly ('query' | 'storage')[]
  readonly diagnostics: readonly SafeDiagnostic[]
}

export interface MarkSnapshot {
  readonly type: string
  readonly name: string
  readonly value: number | null
}

export type ResourceKVSnapshot = Readonly<
  Record<string, Readonly<Record<string, string>>>
>

export interface AssetSnapshot {
  readonly id: IDString
  readonly type: string
  readonly role: string
  readonly mime: string | null
  readonly extension: string | null
  readonly is_external: boolean
  readonly is_primary: boolean
  readonly is_on_uploading: boolean
  readonly url: string | null
  readonly derived_from: IDString | null
  readonly created_at: Timestamp
  readonly updated_at: Timestamp
  readonly data: JSONObject | null
}

export interface ResourceDataSnapshot {
  readonly id: IDString
  readonly created_at: Timestamp
  readonly updated_at: Timestamp
  readonly locked: boolean
  readonly hidden: boolean
  readonly is_deleted: boolean
  readonly title: string
  readonly description: string | null
  readonly parent_id: IDString | null
  readonly order_index: number
}

export interface ResourceSnapshot {
  readonly data: ResourceDataSnapshot
  readonly assets: readonly AssetSnapshot[]
  readonly marks: readonly MarkSnapshot[]
  readonly kv: ResourceKVSnapshot
}

export interface ResourceChildRefSnapshot {
  readonly id: IDString
  readonly order_index: number
}

export interface ResourceTreeViewSnapshot {
  readonly resource: ResourceSnapshot
  readonly children: readonly ResourceChildRefSnapshot[]
}

export interface ReadonlyResourceDriver {
  readonly mode: 'readonly'
  open(): Promise<void>
  close(): Promise<void>
  listResources(): AsyncIterable<ResourceSnapshot>
}

export interface ExtensiaConfig {
  readonly storage: {
    readonly driver: ReadonlyResourceDriver
  }
}

type ModuleNotReadyError = ExtensiaError<'MODULE_NOT_READY'>
type InvalidResourceIDError = ExtensiaError<'INVALID_RESOURCE_ID'>
type ResourceNotFoundError = ExtensiaError<'RESOURCE_NOT_FOUND'>
type StorageReadonlyError = ExtensiaError<'STORAGE_READONLY'>

export interface QueryFacade {
  getResource(
    id: string,
  ): Promise<ExtensiaResult<
    ResourceSnapshot,
    ModuleNotReadyError | InvalidResourceIDError |
      ResourceNotFoundError
  >>

  getResourceTree(
    id: string,
  ): Promise<ExtensiaResult<
    ResourceTreeViewSnapshot,
    ModuleNotReadyError | InvalidResourceIDError |
      ResourceNotFoundError
  >>
}

export interface StorageFacade {
  createResource(
    input: unknown,
  ): Promise<ExtensiaResult<never, ModuleNotReadyError | StorageReadonlyError>>
}

export interface ExtensiaModule {
  getState(): ExtensiaModuleState
  start(): Promise<ExtensiaResult<void,
    ExtensiaError<'CONFIG_INVALID' | 'MODULE_BUSY' |
      'MODULE_INVALID_STATE' | 'START_FAILED'>
  >>
  stop(): Promise<ExtensiaResult<void,
    ExtensiaError<'MODULE_BUSY' | 'STOP_FAILED'>
  >>
  query(): QueryFacade | null
  storage(): StorageFacade | null
  inspect(): ExtensiaInspection
}

export function createExtensia(config: ExtensiaConfig): ExtensiaModule
```

Non-exported `idStringBrand` / `timestampBrand` declarations входять у emitted declaration як private type identity, а не runtime/public values. Snapshot literal повторює чинний recursive JSON-safe contract без скорочень.

## 5. Точна семантика

### 5.1. Нормалізація ID

Facade приймає raw `string`, використовує чинний `parseIDString()` і нормалізує mixed-case UUID v4 до lowercase. Compact/braced/non-v4/не-string на runtime boundary повертає `INVALID_RESOURCE_ID`; Core port ніколи не отримує неканонічний ID.

### 5.2. Відокремлені DTO

Кожний success повертає новий deeply readonly JSON-safe snapshot без mutable aliases із driver, Index, Core або попереднім result. `getResourceTree()` detaches і `resource`, і `children`. Runtime `Object.freeze()` дозволений як development aid, але не є public guarantee.

### 5.3. Проєкція дерева

`children` містить тільки direct children, відсортовані за `(order_index, id)` для deterministic result. Він обчислюється reverse lookup за `parent_id`; driver-provided `children` ігнорується/не існує. Cycle, duplicate resource ID або інший invalid loaded aggregate робить startup failure, тому ready read model не повертає partial invalid tree.

### 5.4. Відсутній Resource та неочікуваний дефект читання

Valid canonical ID без entity повертає failure `RESOURCE_NOT_FOUND`, а не success `null`. У bounded greedy Phase 2 driver scan і validation завершуються до ready, тому окремого expected `RESOURCE_READ_FAILED` немає. Unexpected in-memory Index/invariant/programming defect не нормалізується передчасно: він може бути thrown після safe diagnostic record і ніколи не маскується як valid data. Майбутній lazy/driver-backed read error catalog належить його owner gate.

### 5.5. Порядок readonly command

Для отриманого ready `storage` facade `createResource(input)` виконує рівно readiness check і capability check. У Phase 2 він повертає `STORAGE_READONLY` до validation/normalization `input`, до Core write-port lookup, Journal/Index/driver mutation або hook execution. `input` не читається. Success branch має `never`.

## 6. Матриця public failures

| Operation / condition | Result | State / side effect |
|---|---|---|
| `start()` із valid readonly driver | `ok(void)` | Registry frozen, state `started`, facades published |
| Invalid config/driver shape | `CONFIG_INVALID` | state `failed`; active resources відсутні/cleaned |
| Driver open / scan / domain validation / composition / provider failure | `START_FAILED` | reverse cleanup + close + composition dispose; no facade publication; state `failed` |
| `start()` while `started` | `ok(void)` | idempotent, same facade identities |
| `start()` while `starting` або `stopping` | `MODULE_BUSY` | no second lifecycle flow |
| `start()` after `stopped` або `failed` | `MODULE_INVALID_STATE` | no restart in baseline |
| `stop()` in `created` | `ok(void)` | state `stopped`; driver never opened |
| `stop()` in `started` | success або `STOP_FAILED` | intake closed; all cleanup attempted; state `stopped` |
| `stop()` in `stopped` | `ok(void)` | idempotent |
| `stop()` while transition active | `MODULE_BUSY` | active transition remains owner |
| Valid read while started, entity exists | `ok(detached snapshot)` | no Journal/write side effect |
| Invalid raw ID | `INVALID_RESOURCE_ID` | Core port not called |
| Valid missing ID | `RESOURCE_NOT_FOUND` | no mutation |
| Stale facade called after stop | `MODULE_NOT_READY` | no Core/driver call |
| `createResource(anything)` while started | `STORAGE_READONLY` | input not inspected; no mutation/Journaling |
| `stop()` у `failed` | `ok(void)` | startup уже виконав at-most-once rollback/disposal; retained diagnostics не очищуються; state `stopped` |

`STOP_FAILED` агрегує safe diagnostics через `inspect()`, але cleanup продовжується для всіх resolved contributions і composition disposal; public error не містить raw causes.

## 7. Таблиця lifecycle/publication

| Module state | Registry phase | `query()` / `storage()` | Operations |
|---|---|---|---|
| `created` | absent | `null` | unavailable |
| `starting` before providers | `created/registering` internal | `null` | unavailable |
| `starting` after provider creation | `registering/frozen` internal | `null` | still unavailable |
| `started` | `frozen` | stable facade objects | accepted |
| `stopping` | `frozen`, unpublished | `null` | stale facade returns `MODULE_NOT_READY` |
| `stopped` | disposed | `null` | stale facade returns `MODULE_NOT_READY` |
| `failed` | rolled back/disposed | `null` | unavailable |

Publication point — atomic transition після successful Runtime Controller startup, provider creation, duplicate/reserved validation і Registry freeze; лише потім state стає `started` і accessors бачать facades.

### 7.1. Приймання operations та stop race

Кожний facade method спочатку намагається отримати internal read-intake lease. Lease видається тільки у state `started`; після видачі method входить до admitted in-flight set. `stop()` атомарно закриває intake, переводить state у `stopping`, одразу робить module accessors непублічними та змушує нові/stale calls повертати `MODULE_NOT_READY`. Потім `stop()` чекає natural settlement усіх admitted reads без примусової cancellation, і лише після drain запускає reverse contribution cleanup, driver close та composition disposal. Lease звільняється у `finally` кожного call. Phase 2 не обіцяє cancellation/timeout; hung driver/index call означає hung graceful stop і потребує майбутньої окремої policy, а не unsafe disposal під активним read.

Startup failure робить best-effort reverse cleanup та final composition disposal at most once до повернення `START_FAILED`. State `failed` зберігає safe diagnostics. Наступний `stop()` не повторює вже attempted cleanup, переводить module у `stopped` і повертає success; це відтворює прийнятий current internal lifecycle baseline без прихованого retry.

## 8. Контракт Registry/provider

### 8.1. Володіння та імена

- Registry належить Extensia Module lifecycle, не Core і не application.
- Обидва providers належать system extension `extensia.default-api`.
- Canonical facade/owner name: 1..128 ASCII chars, pattern `^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$`.
- Normalization не переписує user input: whitespace, uppercase та інші forms відхиляються. Це усуває приховані collision rules.
- Reserved names Phase 2: exact `query`, `storage`; їх може надати лише composition-owned system registration lease, виданий Module конкретному owner `extensia.default-api`.
- Duplicate name, invalid name, wrong reserved owner або late registration fail before publication.

`system` не є self-asserted boolean provider descriptor. Registry отримує trusted provenance з internal registration channel: Module створює system lease для allowlisted built-in extension; майбутній user/custom channel отримує окремий non-system lease й не може зареєструвати reserved name незалежно від spoofed owner fields. Validation order: lease open/provenance -> canonical name -> reserved policy -> owner/dependency shape -> duplicate -> provider creation -> registration -> freeze.

### 8.2. Фаза contributions

IoC збирає synchronous immutable provider descriptors як multi contributions. Async facade creation виконує Extensia-owned Runtime Controller під час startup після Core read port ready. Provider не отримує raw resolver: Query provider отримує тільки `CoreResourceReadPort` і readiness gate; Storage provider — readiness/capability gate. Registry registration lease закривається після freeze.

### 8.3. Безпечна діагностика

Safe inspection містить state, ready flag, sorted published facade names та detached diagnostics. Diagnostic `subject` може містити лише validated public-safe module/facade/contribution ID. Driver object, config values, file paths, credentials, provider/facade instances, raw errors, stacks, private token IDs і graph values заборонені.

## 9. Спільна internal read-port/adapter seam

Цей snapshot є internal contract для спільного використання BP2-02/BP2-03. Він не експортується з package root або subpath. Canonical application task фіксує його як stable design artifact, але не створює production source. До паралельної activation потрібна окрема bounded `autonomous-implementation` prerequisite task `BP2-01A`, яка materialize-ить єдиний source module контракту й проходить package gate; BP2-02 і BP2-03 залежать від її `done` artifact. Це усуває race «хто першим створює shared file».

Exact source path для BP2-01A: `src/system-extensions/default-api/resource-read-port.ts`.

```ts
import type { Token } from '@sagifire/ioc'

import { createExtensiaInternalNamespace } from '../../composition/tokens.js'
import type { IDString } from '../../domain/scalars.js'
import type {
  ResourceSnapshot,
  ResourceTreeViewSnapshot,
} from '../../domain/snapshots.js'

const defaultApiTokens = createExtensiaInternalNamespace(
  'system-extensions.default-api',
)

// Exact internal token id:
// extensia.internal.system-extensions.default-api.core-resource-read-port
export const CORE_RESOURCE_READ_PORT: Token<CoreResourceReadPort> =
  defaultApiTokens.token<CoreResourceReadPort>('core-resource-read-port')

export interface GetResourceReadRequest {
  readonly type: 'resource.get'
  readonly id: IDString
}

export interface GetResourceTreeReadRequest {
  readonly type: 'resource.tree.get'
  readonly id: IDString
}

export interface CoreReadFailure {
  readonly code: 'RESOURCE_NOT_FOUND'
}

export type CoreReadResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: CoreReadFailure }

export interface CoreResourceReadPort {
  read(request: GetResourceReadRequest): Promise<CoreReadResult<ResourceSnapshot>>
  read(request: GetResourceTreeReadRequest): Promise<CoreReadResult<ResourceTreeViewSnapshot>>
}

```

`ResourceFacadeAdapter` не входить у shared source artifact: його concrete implementation і public `QueryFacade` mapping належать BP2-03. Shared module export-ить тільки request/result/port/token contract, якого достатньо provider і consumer sides.

Seam ownership:

- `BP2-01A` materialize-ить exact requests/results/interface та consumer-owned required-port token у одному internal source module; жодної runtime implementation не додає.
- Consumer module `extensia.default-api` (BP2-03) є semantic owner required-port token/contract; його facade adapter імпортує цей source module й не оголошує дубль.
- Provider module BP2-02 реалізує port, greedy readonly source adapter, Index і detached outputs та bind/adapt-ить implementation до consumer-owned token; власного token/contract не створює.
- BP2-04 зв'язує обидві implementations через один Composition Root і public module.
- Read request не містить arbitrary payload, generic type parameter від caller, driver handle, resolver або mutation capability.
- Public adapter є єдиним місцем raw-ID normalization і mapping internal failure до public typed error.

## 10. Приклади для consumer

### 10.1. Start, read і stop

```ts
import { createExtensia } from '@sagifire/extensia'

const extensia = createExtensia({
  storage: { driver: readonlyDriver },
})

const started = await extensia.start()
if (!started.ok) {
  console.error(started.error.code)
} else {
  const query = extensia.query()
  if (query === null) throw new Error('Invariant: started module has query facade')

  const resource = await query.getResource(rawResourceId)
  if (resource.ok) {
    console.log(resource.value.data.title)
  } else if (resource.error.code === 'RESOURCE_NOT_FOUND') {
    console.log('missing')
  }
}

const stopped = await extensia.stop()
if (!stopped.ok) console.error(stopped.error.code)
```

### 10.2. Tree snapshot та безпека aliases

```ts
const query = extensia.query()
if (query === null) throw new Error('not started')

const tree = await query.getResourceTree(rawResourceId)
if (tree.ok) {
  const childIds = tree.value.children.map((child) => child.id)
  // Compile-time readonly; runtime correctness також не залежить від freeze.
  console.log(childIds)
}
```

### 10.3. Явна readonly command

```ts
const storage = extensia.storage()
if (storage === null) throw new Error('not started')

const attempted = await storage.createResource({ title: 'ignored in Phase 2' })
if (!attempted.ok) {
  // Narrowed to MODULE_NOT_READY | STORAGE_READONLY; while started => STORAGE_READONLY.
  console.log(attempted.error.code)
}
```

## 11. Статус сумісності

| Surface | Status після approval/application | Причина |
|---|---|---|
| Root factory, module lifecycle/state, facade publication rule | `public-stable-candidate` for `0.1.0` | Потрібні P2-VS1 та facade-first boundary |
| `ExtensiaResult`, error discrimination, bounded Phase 2 error codes | `public-stable-candidate` | Type narrowing і expected failure semantics без speculative read code |
| Canonical scalar/Resource/tree snapshot exports | `public-stable-candidate` | Уже accepted/implemented internal contract; public export ще проходить application gate |
| `QueryFacade.getResource/getResourceTree` | `public-stable-candidate` | Мінімальний P2-VS1 catalog |
| `ReadonlyResourceDriver` та config driver shape | `experimental-phase-2` | Concrete/final driver protocol належить P4-DG1 |
| `StorageFacade.createResource(input: unknown)` | `experimental-phase-2` | Лише readonly rejection proof; successful write gate P3-DG1 |
| `inspect()` exact diagnostic catalog | `provisional-safe-tooling` | Safety shape потрібна зараз, compatibility catalog закриває P7-WP1 |
| Registry/provider/read-port/adapter seam | `internal-versioned-by-task` | BP2-01A materialized shared contract, не package API |
| Custom facade lookup, plugins/hooks, advanced IoC | `deferred` | Phase 6 owner gates |

## 12. Перевірка

Виконано під час research: self-contained strict TypeScript 6.0.3 probe успішно перевірив narrowing `ok`, exact recursive readonly JSON types, readonly Resource/tree snapshots, відсутність `value` у failure branch і `never` success storage command. Окремий seam probe скомпілював literal BP2-01A token/source snapshot проти actual `@sagifire/ioc`, internal namespace і current domain types із explicit Node type environment. Перший public invocation без `--ignoreConfig` очікувано отримав TS5112, а перший isolated seam invocation без `--types node` — лише missing `node:crypto` declarations; повторні correct invocations зелені. Local Markdown link check також зелений.

Для implementation waves обов'язкові такі gates:

- Type-only/package snapshot перевіряє exact root exports і відсутність Core/IoC exports.
- Application integration перевіряє construction без effects, successful start, identity accessors, two reads, missing/invalid ID, readonly command, stop і stale facade.
- Failure injection перевіряє config/open/scan/invalid aggregate/provider/freeze/stop/dispose failures, повний rollback, stop-after-failed і admitted-read drain перед disposal.
- Registry tests перевіряють name pattern, reserved ownership, duplicates, deterministic sorting, freeze й late registration.
- Driver/index tests перевіряють duplicate/cycle rejection, deterministic children order, one-level projection і detached aliases.
- Package snapshot дозволяє тільки exact root names цього report та `./package.json`; `@sagifire/ioc`, Core tokens і internal subpaths не резолвляться.

## 13. Архітектурний тиск

Proposal не потребує plugin API, raw resolver, production write pipeline, Journal, full Storage Driver, Asset files, lazy global queries або broad draft facade catalog. Істотний pressure локалізовано у temporary public driver/proof surfaces; тому вони явно experimental і мають owner gates P3/P4. Якщо BP2-02 або BP2-03 потребуватиме другого read contract, generic resolver чи test-only facade wiring, implementation слід зупинити й повернути на design correction, а не дублювати seam.

## 14. Відхилені скорочення шляху

- Не використовувати lifecycle types Phase 1 як public aliases без mapping: вони internal і мають інший failure shape.
- Не повертати driver/index objects як DTO.
- Не дозволяти Registry registration після ready навіть у tests.
- Не робити `getResourceTree()` двома незв'язаними public reads.
- Не валідовувати placeholder write input перед readonly capability check.
- Не експортувати `@sagifire/ioc`, tokens, `CoreResourceReadPort` або wildcard `dist/*` paths.

## 15. Межа пам'яті та застосування

Цей report і task-local `RSCH-001` є research artifacts. Canonical product/domain/technical documents не змінені цим рішенням. `FIX-001` пропонує окремій owner `interactive-memory-update` task створити canonical public-read contract/ADR, синхронізувати open questions і підготувати bounded BP2-01A materialization task лише після task-level human approval та окремого fixation approval. BP2-02/BP2-03 залишаються blocked до stable application artifact і `done` BP2-01A source artifact.
