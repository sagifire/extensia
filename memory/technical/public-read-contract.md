# Мінімальний public read contract

Status: implemented by BP2-04 / RUN-001, independently reviewed and accepted by whole-task human review
Applied Artifact: `APP-07.26-0021-001` (published)
Source Decision: `BP2-01 / TASK-07.26-0015 / FIX-001`
Detailed Design: [Мінімальний public read contract Extensia](../reports/research/2026-07-10-extensia-minimal-public-read-contract.md)

## Межа

Цей документ фіксує рівно Phase 2 `P2-DG1` contract, реалізований у `BP2-04 / RUN-001` як bounded P2-VS1. Він не є claim про final Storage Driver або ширшу release compatibility freeze. Усі наведені public exports доступні тільки з root `@sagifire/extensia`; Phase 2 не створює subpath exports і не експортує Core, IoC, tokens чи internal seam.

## Root/type snapshot

```ts
declare const idStringBrand: unique symbol
declare const timestampBrand: unique symbol
export type IDString = string & { readonly [idStringBrand]: 'IDString' }
export type Timestamp = number & { readonly [timestampBrand]: 'Timestamp' }
export type JSONPrimitive = null | boolean | number | string
export type JSONValue = JSONPrimitive | JSONArray | JSONObject
export type JSONArray = readonly JSONValue[]
export interface JSONObject { readonly [key: string]: JSONValue }

export type ExtensiaModuleState =
  | 'created' | 'starting' | 'started' | 'stopping' | 'stopped' | 'failed'
export type ExtensiaErrorCode =
  | 'CONFIG_INVALID' | 'MODULE_BUSY' | 'MODULE_INVALID_STATE'
  | 'MODULE_NOT_READY' | 'START_FAILED' | 'STOP_FAILED'
  | 'INVALID_RESOURCE_ID' | 'RESOURCE_NOT_FOUND' | 'STORAGE_READONLY'
export interface ExtensiaError<TCode extends ExtensiaErrorCode = ExtensiaErrorCode> {
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
export interface MarkSnapshot { readonly type: string; readonly name: string; readonly value: number | null }
export type ResourceKVSnapshot = Readonly<Record<string, Readonly<Record<string, string>>>>
export interface AssetSnapshot {
  readonly id: IDString; readonly type: string; readonly role: string
  readonly mime: string | null; readonly extension: string | null
  readonly is_external: boolean; readonly is_primary: boolean; readonly is_on_uploading: boolean
  readonly url: string | null; readonly derived_from: IDString | null
  readonly created_at: Timestamp; readonly updated_at: Timestamp; readonly data: JSONObject | null
}
export interface ResourceDataSnapshot {
  readonly id: IDString; readonly created_at: Timestamp; readonly updated_at: Timestamp
  readonly locked: boolean; readonly hidden: boolean; readonly is_deleted: boolean
  readonly title: string; readonly description: string | null
  readonly parent_id: IDString | null; readonly order_index: number
}
export interface ResourceSnapshot {
  readonly data: ResourceDataSnapshot
  readonly assets: readonly AssetSnapshot[]
  readonly marks: readonly MarkSnapshot[]
  readonly kv: ResourceKVSnapshot
}
export interface ResourceChildRefSnapshot { readonly id: IDString; readonly order_index: number }
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
export interface ExtensiaConfig { readonly storage: { readonly driver: ReadonlyResourceDriver } }
type ModuleNotReadyError = ExtensiaError<'MODULE_NOT_READY'>
type InvalidResourceIDError = ExtensiaError<'INVALID_RESOURCE_ID'>
type ResourceNotFoundError = ExtensiaError<'RESOURCE_NOT_FOUND'>
type StorageReadonlyError = ExtensiaError<'STORAGE_READONLY'>
export interface QueryFacade {
  getResource(id: string): Promise<ExtensiaResult<ResourceSnapshot,
    ModuleNotReadyError | InvalidResourceIDError | ResourceNotFoundError>>
  getResourceTree(id: string): Promise<ExtensiaResult<ResourceTreeViewSnapshot,
    ModuleNotReadyError | InvalidResourceIDError | ResourceNotFoundError>>
}
export interface StorageFacade {
  createResource(input: unknown): Promise<ExtensiaResult<never,
    ModuleNotReadyError | StorageReadonlyError>>
}
export interface ExtensiaModule {
  getState(): ExtensiaModuleState
  start(): Promise<ExtensiaResult<void, ExtensiaError<
    'CONFIG_INVALID' | 'MODULE_BUSY' | 'MODULE_INVALID_STATE' | 'START_FAILED'>>>
  stop(): Promise<ExtensiaResult<void, ExtensiaError<'MODULE_BUSY' | 'STOP_FAILED'>>>
  query(): QueryFacade | null
  storage(): StorageFacade | null
  inspect(): ExtensiaInspection
}
export function createExtensia(config: ExtensiaConfig): ExtensiaModule
```

Private brands є declaration-only type identities, не runtime/public values. Snapshot повторює canonical deep-readonly JSON-safe domain contract без скорочення field shapes. `BP2-04 / RUN-001` експортує exact root value `createExtensia` і наведені type contracts; packed runtime/type consumer перевіряє цей surface.

## Construction, lifecycle та publication

`createExtensia(config)` є side-effect-free. Воно без виклику getters/accessors читає own data-property descriptor `storage` з raw config і own data-property descriptor `driver` зі storage envelope. Missing, malformed або accessor envelope зберігається як internal invalid-config sentinel. `start()` повторно перевіряє поточні `mode`/method data properties captured driver, включно з prototype methods, без accessor invocation і повертає `CONFIG_INVALID` до composition або відкриття resources. Valid construction capture-ить exact driver object identity у новий frozen normalized envelope `{ storage: { driver } }`. Caller envelope після construction не reread; його mutation не впливає на module. Driver object навмисно не clone-иться та не freeze-иться, тому його integration shape revalidate-иться на `start()`.

Module states: `created`, `starting`, `started`, `stopping`, `stopped`, `failed`. `start()` у `started` idempotent; під час transition повертає `MODULE_BUSY`; після `stopped` або `failed` повертає `MODULE_INVALID_STATE`. Failure open/scan/domain validation/composition/provider робить reverse cleanup, close та composition disposal, не публікує facade і переходить у `failed`. `stop()` у `created` або `stopped` idempotent; у `failed` не повторює already-attempted startup cleanup, залишає safe diagnostics і переходить у `stopped`.

Registry створюється під час startup, проходить validation і freeze до atomic ready publication. Лише після successful Runtime Controller startup, provider creation, validation та freeze state стає `started`; `query()` і `storage()` повертають stable identities. В усіх інших states accessors повертають `null`. `inspect()` повертає detached safe state, sorted published names і diagnostics без config values, driver objects, paths, credentials, raw errors, stacks, private token IDs або graph values.

Facade method спочатку бере read-intake lease лише у `started`. `stop()` atomically закриває intake, unpublish-ить accessors, а нові/stale calls повертають `MODULE_NOT_READY`; потім чекає natural settlement admitted reads і тільки після drain виконує cleanup/disposal. Cancellation/timeout не обіцяні у Phase 2.

## Read і readonly surface

`QueryFacade` містить лише `getResource(rawId)` і one-level `getResourceTree(rawId)`. Raw `string` нормалізується existing `parseIDString()` до lowercase UUID v4; compact/braced/non-v4/non-string runtime input повертає `INVALID_RESOURCE_ID` і не доходить до Core. Valid missing ID повертає `RESOURCE_NOT_FOUND`, не `null`. Tree містить лише direct children, derived з `parent_id` і sorted `(order_index, id)`; ready model відхиляє duplicate ID, cycle та invalid aggregate під час startup. Кожен success є новим detached deeply readonly JSON-safe snapshot; runtime freeze може бути aid, не guarantee. Unexpected Index/invariant defect є exception/diagnostic path, не speculative normalized read error.

`storage.createResource(input: unknown)` має compatibility label `experimental-phase-2`. У ready readonly mode воно виконує лише readiness і capability check та повертає `STORAGE_READONLY` до читання/validation/normalization `input`, Core write-port lookup, Journal/Index/driver mutation або hooks. Success type — `never`. Це не successful write API і не final driver contract.

## Registry, provenance та shared seam

Facade/owner names мають exact lowercase ASCII pattern `^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$` і 1..128 chars. Whitespace, uppercase та інші forms відхиляються без silent rewrite. `query` і `storage` reserved; їх реєструє лише Module-owned composition lease для allowlisted system extension `extensia.default-api`, не self-asserted boolean. Validation order: open lease/provenance, canonical name, reserved policy, owner/dependency shape, duplicate, provider creation, registration, freeze. Contributions — synchronous immutable multi descriptors; async creation виконує Extensia Runtime Controller. Provider не отримує raw resolver.

One shared internal seam не є package API. BP2-01A materialized `src/system-extensions/default-api/resource-read-port.ts`: typed `resource.get`/`resource.tree.get` requests, `CoreReadResult`, overload-based `CoreResourceReadPort` і `CORE_RESOURCE_READ_PORT` token ID `extensia.internal.system-extensions.default-api.core-resource-read-port`. Only expected internal failure — `RESOURCE_NOT_FOUND`. Consumer `extensia.default-api` є semantic owner token; BP2-02 materialized internal provider над readonly driver/greedy Resource index, BP2-03 materialized facade adapter і shared Registry, а BP2-04 поєднала їх через єдиний public-owned composition/lifecycle path без duplicate contract або subpath export.

## Failure matrix і compatibility

| Condition | Result / effect |
|---|---|
| valid readonly start | `ok(void)`; frozen registry, published facades |
| invalid config/driver | `CONFIG_INVALID`; `failed`, no active resources |
| startup dependency failure | `START_FAILED`; cleanup/disposal, no publication |
| invalid raw ID / valid missing ID | `INVALID_RESOURCE_ID` / `RESOURCE_NOT_FOUND` |
| stale facade after stop | `MODULE_NOT_READY`; no Core/driver call |
| `createResource(anything)` while started | `STORAGE_READONLY`; input uninspected, no mutation |

Root factory/module/result/scalars/snapshots and two reads are `public-stable-candidate` for `0.1.0`; driver shape and readonly command are `experimental-phase-2`; `inspect()` is `provisional-safe-tooling`; Registry/provider/read-port seam is `internal-versioned-by-task`; custom facades, plugins/hooks and advanced IoC are `deferred`. Final error catalog and release compatibility policy remain open.

## P4-DG2 compatibility note

Public `AssetSnapshot` field shape is unchanged. Accepted target valid values/aggregate relations are tightened by [Asset semantic contract](asset-contract.md). P4 metadata methods/errors remain `experimental-phase-4` until implementation and P7 compatibility freeze; Phase 2 implemented reads are not rewritten by this note.

## P5-DG1 compatibility note

Existing `getResource` і one-level `getResourceTree` names, success value shapes, invalid/missing semantics та detached ownership незмінні; default existing config behavior є `greedy`. Optional `readModel.loading` і additive safe inspection/errors є `experimental-phase-5`. Lazy cache miss ніколи не мапиться в `RESOURCE_NOT_FOUND` без exact negative proof, а cached children subset не може стати tree success. Нові draft public query methods не прийняті цією note; final config/error/API freeze лишається P7.

## P5-DG2 compatibility note

Experimental Phase 5 adds optional `readModel.synchronization`, exact `inspect().read_model.synchronization` safe inspection and `query.refresh()`. Default is `manual`, so existing configs do not create background work. `refresh(options)` is descriptor-safe; invalid options/fake signal return `READ_MODEL_REFRESH_OPTIONS_INVALID`, and admitted AbortSignal listeners are removed on every terminal path. Refresh success means coherent observation through a journal head captured after caller admission, not permanent global currentness; `changed` means query-visible content changed, not cursor movement. Public result/inspection exposes no cursor, head, generation/actor/resource ID, storage path or raw driver error. Opt-in polling invokes the same admission-epoch refresh with bounded retry/backoff/capped jitter. Existing `getResource`/`getResourceTree` shapes remain unchanged; final names/error catalog/config freeze belongs to P7.

## P5-VS1 materialization note

`P5-VS1 / TASK-07.26-0060 / RUN-001` реалізувала optional descriptor-safe `readModel.loading`/`readModel.synchronization`, exact frozen `inspect().read_model` і `query.refresh(options?)` як `experimental-phase-5`. Existing `getResource`/`getResourceTree` names, value shapes, invalid/missing semantics і detached ownership не змінилися; lazy success потребує exact coverage proof. Default config лишається `greedy` + `manual` без background polling. Semantic full/readonly supported paths використовують один internal actor/coordinator; legacy driver повертає refresh unavailable. Packed root/API surface не експортує observation, cursor, actor, storage session або internal subpaths. Concrete SQLite sync/polling і P7 compatibility freeze не заявляються.
