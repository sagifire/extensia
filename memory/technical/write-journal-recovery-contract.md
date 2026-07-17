# Write, journal і recovery contract Phase 3

Status: accepted target contract
Compatibility: `experimental-phase-3`
Applied: 2026-07-10
Authority: `BP3-01 / P3-DG1`, ADR-0005, ADR-0008
Detailed Design: [Write, journal і recovery protocol Extensia](../reports/research/2026-07-10-extensia-write-journal-recovery-protocol.md)

## Межа

Цей документ визначає semantic contract першого Resource create/update slice. Він не є current implementation claim і не визначає physical metadata/journal layout, fsync/rename/object-store mechanism, P3-DG2, Assets, External Change Sync, hooks/plugins або release-wide compatibility.

## Ownership і semantic commit

- Core володіє command policy, validation, operation plan, locks і prepared index change; Storage Driver володіє exclusive session, staging, recovery, sequence allocation та transaction commit.
- `ResourceWriteTransaction.commit(entryDraft)` є єдиним linearization point: staged Resource metadata й рівно один committed journal entry фіксуються одним semantic commit.
- Resolve означає committed; reject гарантує not committed. Ambiguous expected outcome заборонений. Окремого append/write path немає.
- `stageResource` не змінює committed visibility; `abort` idempotent до commit і no-op після committed resolve.
- Operation ID та actor ID — internal UUID v4. Actor є runtime-local до sync gate.
- Core обчислює canonical SHA-256 fingerprint повного ordered staged write-set. Serialization має fixed schema order, UTF-8, JSON primitive encoding, sorted record keys та preserved array/write-set order; driver верифікує staged content.
- Повторний commit того самого operation ID повертає existing entry лише для identical draft і fingerprint; mismatch є integrity failure. Public idempotency/deduplication не обіцяється.

## Journal і cursor

- Persistent baseline journal містить тільки committed entries. Started/failed/rolled-back є runtime diagnostics або driver-private staging.
- `JournalSequence` — canonical positive decimal string. Перша sequence — `1`; allocation contiguous і gap-free під exclusive storage session. Порівняння виконується length + lexical, не JS `number` і не Timestamp.
- `readCommittedOperationsAfter(null)` повертає всі entries від `1`; existing cursor — strictly later entries; head — empty stream.
- Non-canonical, ahead або missing cursor, gap, duplicate чи regression є integrity failure й блокують ready. Compaction/retention у P3 відсутні.
- Committed entry schema version `1` містить sequence, operation/actor UUID, create/update type, affected Resource IDs, committed Timestamp, write-set fingerprint і logical `resource.upsert` hints. Metadata source of truth лишається Storage Driver.

## Session, recovery і lifecycle

- `acquireStorageSession()` надає один exclusive storage-level lease до `release()` і resolve-иться лише після driver-private recovery або повертає integrity failure.
- Full startup тримає ту саму recovery-clean session через recovery, committed Resource scan, greedy index build і journal-head capture; лише потім release та ready publication.
- Recovery завершує unambiguous committed state, rollback-ить provably incomplete private staging й fail-ить на ambiguous/corrupt/unknown-owned state. Safe report містить лише status/counts/codes.
- Intake close-and-drain не force-cancel-ить admitted operation. Cancellation діє під час lock wait і до staging; після початку commit outcome не змінюється.
- Local multi-key locks захоплюються атомарно за normalized lexical keys; conflicting FIFO зберігається, non-conflicting preparation може прогресувати. Global session визначає commit order.

## Concrete profile `local-sqlite-v1`

Accepted P4-DG1 profile реалізує цей semantic contract через одну SQLite durability domain (`node:sqlite`) для metadata, committed `journal` і bounded opaque staged/committed payload chunks. External filesystem blob publication та independent journal append у baseline заборонені.

- Proposed boundary: Windows 11 local NTFS, one host/one full writer; certification лише після P4-WP1 crash/lock proof. Linux ext4/XFS candidate; network/removable/sync/FUSE/direct mutation unsupported.
- Rollback journal + `synchronous=EXTRA`; dedicated `locking_mode=EXCLUSIVE` connection тримає lease від session acquire через recovery/scan/COMMIT/Core publication до release.
- `journal` є єдиним committed authority. Sequence — arbitrary-length canonical decimal TEXT з length+lexical comparison. Idempotency — unique `operation_id`; fingerprint не globally unique.
- COMMIT error класифікується через `isTransaction`, rollback/retry і query by `operation_id`. Resolve/reject truth не змінюється, але persistent unavailable durability domain може призупинити settlement/runtime: safety guarantee не є termination guarantee.
- Full recovery відбувається before-ready; readonly не виконує recovery/cleanup writes і fail-close, якщо mutation потрібна.
- Driver-owned DB path, format/application/version markers, schema/quick-check і canonical content integrity перевіряються до ready; corrupt/unknown state fail-close.

P4-VS3 stage bytes є invisible non-journal SQLite transaction, а begin/finish/abort лишаються semantic operations чинного Core/Operation Engine. Publish/discard/delete виконуються driver-owned compound actions тієї самої metadata/journal transaction; committed visibility ніколи не має independent payload commit authority. Startup recovery/integrity перевіряє payload digest, length, exact contiguous chunk set і generation ownership до ready.

Profile використовує незмінений opaque `FullResourceDriverAdapter`; SQLite schema, pragmas, paths і recovery implementation не просочуються в Core/public API. Asset semantics не визначаються цим profile.

## Index publication

- Core reload-ить latest committed Resource під storage session і до transaction готує validated immutable `PreparedResourceIndexChange`.
- `publish()` є only-once synchronous no-I/O/no-validation reference swap після committed resolve; storage session утримується до publication.
- Publish до commit заборонений. Unexpected post-commit publication/cleanup fault не rollback-ить commit: команда повертає committed success із `LOCAL_INDEX_PUBLICATION_FAILED` або `POST_COMMIT_CLEANUP_FAILED`, engine закриває intake, Module unpublish-ить facades і переходить у `failed`; `stop()` виконує cleanup і переходить у `stopped`.

## Bounded public contract

`ExtensiaConfig.storage.driver` є discriminated union readonly/full. Full application config приймає тільки frozen opaque `FullResourceDriver` handle, створений `defineFullResourceDriver(definition)`; callable `open/close/session/transaction` callbacks snapshot-яться в private WeakMap і доступні лише internal adapter. Driver-author definition має label `experimental-driver-author`; raw session/transaction не повертаються config, Module або facade.

Root Phase 3 snapshot додає exact detached deeply readonly union/signatures поверх незмінених Phase 2 snapshot types:

```ts
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
  | 'RESOURCE_INPUT_INVALID'
  | 'RESOURCE_NO_CHANGES'
  | 'RESOURCE_ID_GENERATION_FAILED'
  | 'STORAGE_LOCK_FAILED'
  | 'STORAGE_WRITE_FAILED'

export interface ReadonlyResourceDriver {
  readonly mode: 'readonly'
  open(): Promise<void>
  close(): Promise<void>
  listResources(): AsyncIterable<ResourceSnapshot>
}

declare const fullResourceDriverBrand: unique symbol
export interface FullResourceDriver {
  readonly mode: 'full'
  readonly [fullResourceDriverBrand]: 'FullResourceDriver'
}

export interface FullResourceDriverDefinition {
  open(): Promise<void>
  close(): Promise<void>
  acquireStorageSession(signal?: AbortSignal): Promise<ResourceStorageSession>
}

export function defineFullResourceDriver(
  definition: FullResourceDriverDefinition,
): FullResourceDriver

export interface ExtensiaConfig {
  readonly storage: {
    readonly driver: ReadonlyResourceDriver | FullResourceDriver
  }
}

export interface CreateResourceInput {
  readonly title: string
  readonly description?: string | null
}

export interface UpdateResourceInput {
  readonly title?: string
  readonly description?: string | null
}

export type ResourceWriteWarningCode =
  | 'LOCAL_INDEX_PUBLICATION_FAILED'
  | 'POST_COMMIT_CLEANUP_FAILED'

export interface ResourceWriteWarning {
  readonly code: ResourceWriteWarningCode
  readonly message: string
}

export interface ResourceWriteSuccess {
  readonly committed: true
  readonly operation_id: IDString
  readonly resource: ResourceSnapshot
  readonly warnings: readonly ResourceWriteWarning[]
}

export type ResourceWriteError =
  | ExtensiaError<'MODULE_NOT_READY'>
  | ExtensiaError<'INVALID_RESOURCE_ID'>
  | ExtensiaError<'STORAGE_READONLY'>
  | ExtensiaError<'RESOURCE_INPUT_INVALID'>
  | ExtensiaError<'RESOURCE_NOT_FOUND'>
  | ExtensiaError<'RESOURCE_NO_CHANGES'>
  | ExtensiaError<'RESOURCE_ID_GENERATION_FAILED'>
  | ExtensiaError<'STORAGE_LOCK_FAILED'>
  | ExtensiaError<'STORAGE_WRITE_FAILED'>

export interface StorageFacade {
  createResource(
    input: CreateResourceInput,
  ): Promise<ExtensiaResult<ResourceWriteSuccess, ResourceWriteError>>

  updateResource(
    id: string,
    patch: UpdateResourceInput,
  ): Promise<ExtensiaResult<ResourceWriteSuccess, ResourceWriteError>>
}
```

`FullResourceDriverDefinition`, `ResourceStorageSession` і transaction types є `experimental-driver-author`, а не ordinary application handles; їх exact semantic shape визначена internal contract section detailed report і materialized як internal source-only seams BP3-01A. Root runtime values — existing `createExtensia` та майбутній `defineFullResourceDriver`; raw session/transaction objects ніколи не повертаються root factory, Module, facade або opaque handle. Materialization не є runtime implementation або public export.

Input parse приймає exact own data properties; accessors, arrays, null, inherited/unknown keys відхиляються. Readonly capability failure відбувається до inspection input. `title` має `trim().length > 0`, але не trim/normalize-иться; description — string або null. Update потребує allowed property й effective change.

Create генерує root Resource: UUID v4 ID; `created_at = updated_at = operation clock`; `locked = hidden = is_deleted = false`; `parent_id = null`; `order_index = 0`; empty assets/marks/KV. Він не приймає ID, timestamps, parent/order/flags або aggregates. Collision budget — максимум три candidates/attempts: release storage session, release old local lock, regenerate/replan; collision третього candidate дає `RESOURCE_ID_GENERATION_FAILED`.

Update змінює лише own `title`/`description`, reload-ить latest committed state під session і оновлює own `updated_at`. Parent/order/flags/aggregates лишаються deferred.

## Pipeline ordering

Capability check -> descriptor-safe parse -> operation plan/UUID/time -> local locks -> recovery-clean storage session -> latest-state read -> validated next snapshot та prepared index change -> transaction stage -> fingerprint verify -> outcome-definite commit -> index publish -> cleanup -> detached committed result.

BP3-02 materialized internal foundation для normalized atomic local locks, explicit disposable operation scopes, engine intake close-and-drain, pre-staging cancellation та post-commit warning/fail-close result. BP3-03 materialized internal deterministic full-driver fixture, canonical fingerprint/integrity helpers, exclusive recovery-clean session/transaction runtime, committed-only journal, generation-safe crash recovery та coherent startup scan coordinator. Resource-specific pipeline handler, application wiring, index publication wiring і public success лишаються наступними bounded tasks.

## Compatibility і stop conditions

Full driver та successful create/update мають label `experimental-phase-3`; existing `createExtensia` lifecycle/reads не послаблюються. Зміна semantic commit, callable raw transaction через application config, independent journal append, concrete layout, P3-DG2 behavior або index-before-commit потребує окремого design/ADR gate.

## P4-DG2 Asset refinement

Asset operations reuse unchanged outcome-definite semantic commit. Prepared fingerprint binds sorted full Resource snapshots, exact logical Asset change and discriminated compound payload action/upload generation without path leakage. Metadata, payload action and exactly one journal row commit atomically; independent file publication remains forbidden. This does not retroactively widen bounded P3 public Resource commands.
