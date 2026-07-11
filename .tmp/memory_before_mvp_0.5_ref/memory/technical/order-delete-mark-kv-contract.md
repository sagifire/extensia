# Order, delete, Mark і KV contract

Status: accepted
Accepted: 2026-07-11
Authority: approved `P3-DG2 / TASK-07.26-0031 / FIX-001`, published `APP-07.26-0032-001`
Compatibility: `experimental-phase-3`

## Призначення і boundary

Цей документ є canonical compile-oriented contract для Resource hierarchy/order/move, leaf soft delete, Mark/KV writes, exact prepared write-set, batch index publication і typed runtime integrity fail-close. Він розширює, але не послаблює [write/journal/recovery contract](write-journal-recovery-contract.md) та ADR-0005/0008.

Storage Driver лишається durable authority. Hot Metadata Index є derived local projection. Усі writes проходять один public facade → consumer-owned Core port → Operation Engine → driver semantic commit pipeline. Public transaction, Core, IoC, session, journal та index handles відсутні.

## Базові визначення

- `active Resource`: `is_deleted === false`.
- `active sibling group`: усі active Resources з exact однаковим `parent_id`, включно з root group `parent_id = null`.
- `dense order`: для group size `n` значення `order_index` є exact permutation `0..n-1`.
- `tombstone`: soft-deleted Resource, який зберігається durable, але відсутній у default visible read model.
- `effective staged Resource`: snapshot, який реально відрізняється від latest committed snapshot через поточну semantic operation.

`order_index` є non-negative safe integer. Stored hierarchy є cycle-free; active non-root Resource має existing active parent. Parent `updated_at` не bump-иться лише через derived children projection.

## Public contract snapshot

```ts
interface MoveResourceInput {
  readonly parent_id: string | null
  readonly order_index: number
}

interface SetMarkInput {
  readonly type: string
  readonly name: string
  readonly value: number | null
}

interface StorageFacade {
  moveResource(id: string, input: MoveResourceInput): Promise<ResourceMoveResult>
  deleteResource(id: string): Promise<ResourceDeleteResult>
  setMarks(resourceId: string, marks: readonly SetMarkInput[]): Promise<ResourceMarksResult>
  setKV(resourceId: string, namespace: string, values: Readonly<Record<string, string>>): Promise<ResourceKVResult>
}

type ExtensiaErrorCode =
  | 'CONFIG_INVALID' | 'MODULE_BUSY' | 'MODULE_INVALID_STATE'
  | 'MODULE_NOT_READY' | 'START_FAILED' | 'STOP_FAILED'
  | 'INVALID_RESOURCE_ID' | 'RESOURCE_NOT_FOUND' | 'STORAGE_READONLY'
  | 'RESOURCE_INPUT_INVALID' | 'RESOURCE_NO_CHANGES'
  | 'RESOURCE_ID_GENERATION_FAILED' | 'STORAGE_LOCK_FAILED'
  | 'STORAGE_WRITE_FAILED' | 'STORAGE_INTEGRITY_FAILED'
  | 'RESOURCE_PARENT_NOT_FOUND' | 'RESOURCE_MOVE_CYCLE'
  | 'RESOURCE_ORDER_OUT_OF_RANGE' | 'RESOURCE_HAS_CHILDREN'
  | 'RESOURCE_ALREADY_DELETED'

type ErrorOf<TCode extends ExtensiaErrorCode> = ExtensiaError<TCode>

type ResourceMoveError =
  | ErrorOf<'MODULE_NOT_READY'> | ErrorOf<'STORAGE_READONLY'>
  | ErrorOf<'INVALID_RESOURCE_ID'> | ErrorOf<'RESOURCE_INPUT_INVALID'>
  | ErrorOf<'RESOURCE_NOT_FOUND'> | ErrorOf<'RESOURCE_PARENT_NOT_FOUND'>
  | ErrorOf<'RESOURCE_MOVE_CYCLE'> | ErrorOf<'RESOURCE_ORDER_OUT_OF_RANGE'>
  | ErrorOf<'RESOURCE_NO_CHANGES'> | ErrorOf<'STORAGE_LOCK_FAILED'>
  | ErrorOf<'STORAGE_WRITE_FAILED'> | ErrorOf<'STORAGE_INTEGRITY_FAILED'>

type ResourceDeleteError =
  | ErrorOf<'MODULE_NOT_READY'> | ErrorOf<'STORAGE_READONLY'>
  | ErrorOf<'INVALID_RESOURCE_ID'> | ErrorOf<'RESOURCE_NOT_FOUND'>
  | ErrorOf<'RESOURCE_HAS_CHILDREN'> | ErrorOf<'RESOURCE_ALREADY_DELETED'>
  | ErrorOf<'STORAGE_LOCK_FAILED'> | ErrorOf<'STORAGE_WRITE_FAILED'>
  | ErrorOf<'STORAGE_INTEGRITY_FAILED'>

type ResourceMarksError =
  | ErrorOf<'MODULE_NOT_READY'> | ErrorOf<'STORAGE_READONLY'>
  | ErrorOf<'INVALID_RESOURCE_ID'> | ErrorOf<'RESOURCE_INPUT_INVALID'>
  | ErrorOf<'RESOURCE_NOT_FOUND'> | ErrorOf<'RESOURCE_NO_CHANGES'>
  | ErrorOf<'STORAGE_LOCK_FAILED'> | ErrorOf<'STORAGE_WRITE_FAILED'>
  | ErrorOf<'STORAGE_INTEGRITY_FAILED'>

type ResourceKVError = ResourceMarksError

type ResourceWriteError =
  | ErrorOf<'MODULE_NOT_READY'> | ErrorOf<'INVALID_RESOURCE_ID'>
  | ErrorOf<'STORAGE_READONLY'> | ErrorOf<'RESOURCE_INPUT_INVALID'>
  | ErrorOf<'RESOURCE_NOT_FOUND'> | ErrorOf<'RESOURCE_NO_CHANGES'>
  | ErrorOf<'RESOURCE_ID_GENERATION_FAILED'> | ErrorOf<'STORAGE_LOCK_FAILED'>
  | ErrorOf<'STORAGE_WRITE_FAILED'> | ErrorOf<'STORAGE_INTEGRITY_FAILED'>

type ResourceMoveResult = ExtensiaResult<ResourceWriteSuccess, ResourceMoveError>
type ResourceDeleteResult = ExtensiaResult<ResourceWriteSuccess, ResourceDeleteError>
type ResourceMarksResult = ExtensiaResult<ResourceWriteSuccess, ResourceMarksError>
type ResourceKVResult = ExtensiaResult<ResourceWriteSuccess, ResourceKVError>
```

Кожний result є `ExtensiaResult<ResourceWriteSuccess, Resource*Error>` з чинною detached readonly success/failure shape і committed warning union. Move/Marks/KV success повертає committed active target snapshot; delete success повертає detached committed tombstone snapshot лише у success payload.

`SafeDiagnostic.stage` включає `operation`. Integrity diagnostic містить safe code `RESOURCE_STORAGE_INTEGRITY` або `RESOURCE_INDEX_INTEGRITY`, validated operation ID і не містить snapshots, paths, secrets або raw cause.

### Error precedence

| Priority | Move | Delete | setMarks | setKV |
|---:|---|---|---|---|
| 1 | `MODULE_NOT_READY` | same | same | same |
| 2 | `STORAGE_READONLY` before input inspection | same | same | same |
| 3 | target `INVALID_RESOURCE_ID` | same | same | same |
| 4 | shape/scalars `RESOURCE_INPUT_INVALID`, then parent UUID `INVALID_RESOURCE_ID` | — | array/elements/standalone limits `RESOURCE_INPUT_INVALID` | namespace/record/standalone limits `RESOURCE_INPUT_INVALID` |
| 5 | typed acquire integrity / other lock reject | same | same | same |
| 6 | typed load/prepare integrity / ordinary I/O | same | same | same |
| 7 | stored/index/journal integrity | same | same | same |
| 8 | missing/deleted target `RESOURCE_NOT_FOUND` | missing not-found; tombstone `RESOURCE_ALREADY_DELETED` | missing/deleted not-found | missing/deleted not-found |
| 9 | missing/deleted parent, cycle, then range | active children | resulting aggregate validation | resulting namespace/resource count/total validation |
| 10 | `RESOURCE_NO_CHANGES` | — | no-change | no-change |
| 11 | ordinary begin/stage/commit `STORAGE_WRITE_FAILED` | same | same | same |

Move stage 4 validates exact object/required data descriptors, parent UUID, then non-negative safe integer. KV input-local limits are stage 4; current-state total/count limits are stage 9. Integrity maps only to `STORAGE_INTEGRITY_FAILED`; commit-resolved faults return committed success with warning. Repeated delete є єдиною tombstone distinction; other writes/reads do not reveal it.

## Create refinement і move

Після P3-VS3 root create визначає `order_index = activeRootCount` під `resource-hierarchy` lock і latest coherent storage session. Existing create defaults і three-candidate collision policy зберігаються.

`moveResource(id, {parent_id, order_index})` задає exact destination parent і insertion index:

- target removal відбувається conceptually до destination count/range evaluation;
- допустимий index `0..destinationCount`; clamp або negative/fractional/unsafe values заборонені;
- same-parent move видаляє target, inserts at requested index і densely renumbers group;
- cross-parent move densely closes source group і inserts target у destination group;
- root/non-root переходи використовують ті самі правила;
- target не може стати власним parent/descendant; destination parent має exist і бути active;
- exact same resulting parent/order повертає `RESOURCE_NO_CHANGES` без transaction/journal/timestamp.

Operation stages target і лише siblings, чиї `parent_id`/`order_index` реально змінилися. Усі effective snapshots отримують один operation timestamp; staging order canonical by Resource ID.

## Delete і visibility

`deleteResource(id)` дозволений лише для active Resource без active children.

Effective delete:

- зберігає `parent_id`, `order_index`, `locked`, `hidden`, Marks, KV та інші aggregates;
- встановлює `is_deleted = true` і bump-ить target `updated_at` common operation timestamp;
- densely reindex-ить лише changed active siblings тим самим timestamp;
- commit-ить target і siblings одним prepared write-set/journal entry;
- повертає tombstone snapshot у command success.

Missing target → `RESOURCE_NOT_FOUND`; tombstone → `RESOURCE_ALREADY_DELETED`; active children → `RESOURCE_HAS_CHILDREN`. `locked` і `hidden` не блокують delete та не змінюються.

Default `getResource`, list, children і tree projections не показують tombstones; lookup tombstone повертає existing not-found read outcome. Active child з deleted/missing parent є integrity defect. Restore, include-deleted, cascade, purge і retention не входять у Phase 3 API.

## Mark replacement

`setMarks(resourceId, marks)` приймає exact ordinary descriptor-safe dense array і повністю замінює Marks:

- максимум 256 entries;
- кожен entry є ordinary або null-prototype object з exact own enumerable data properties `type`, `name`, `value`; extra/accessor/inherited fields відхиляються;
- `type` і `name` — exact nonblank strings length `1..128` code units;
- `value` — `null` або int32;
- identity — exact pair `(type,name)`; duplicate identity invalid;
- canonical order — binary ECMAScript ascending `type`, потім `name`;
- empty array clears all Marks;
- canonical equality повертає `RESOURCE_NO_CHANGES` без transaction.

## KV namespace replacement

`setKV(resourceId, namespace, values)` повністю замінює один namespace:

- namespace і keys — exact nonblank strings length `1..128` code units;
- values — ordinary або null-prototype exact own enumerable data record; accessor/symbol/array/inherited/non-enumerable fields заборонені;
- maximum 256 keys per namespace і 256 namespaces per Resource;
- кожне value є string максимум 16,384 code units;
- total `sum(namespace.length + key.length + value.length)` для всіх resulting entries максимум 1,048,576 UTF-16 code units;
- empty record deletes namespace;
- equality ignores property insertion order; canonical fingerprint serialization sorts keys binary ECMAScript order;
- equal effective namespace state повертає `RESOURCE_NO_CHANGES`.

## Locking і coherent planning

- Move, delete і hierarchy-aware root create acquire process-local `resource-hierarchy` плюс caller-known target/candidate keys у canonical lock order.
- Mark/KV acquire `resource:<id>`.
- Lock keys freeze-яться до storage session; заборонено acquire/replan local locks під session.
- Coarse hierarchy lock є process-local stale-plan prevention, не cross-process authority; exclusive storage session і journal sequence визначають total durable commit order.

```ts
interface ResourceOperationPlan {
  readonly operation_id: IDString
  readonly actor_id: IDString
  readonly type: ResourceOperationType
  readonly resource_hints: readonly IDString[]
  readonly lock_keys: readonly string[]
}

interface PreparedResourceWriteSet {
  readonly resources: readonly ResourceSnapshot[]
  readonly resource_ids: readonly IDString[]
  readonly fingerprint: WriteSetFingerprint
  readonly changes: readonly CommittedResourceChange[]
}
```

`resource_hints` є non-authoritative diagnostics/planning hints. Після coherent latest load та повної validation handler один раз будує immutable prepared set: IDs unique/sorted, resources/changes one-to-one, fingerprint над exact sorted snapshots. Staging і journal `affected_resources`/`changes` походять лише з нього.

Operation kinds: `resource.create`, `resource.update`, `resource.move`, `resource.delete`, `resource.marks.set`, `resource.kv.set`.

## Semantic commit і index publication

Для кожної effective operation:

1. latest coherent Resource set loaded під exclusive session;
2. full next snapshots/invariants validated до transaction;
3. batch index delta prepared над full next maps до staging;
4. exact snapshots staged canonical ID order;
5. full write-set fingerprint і journal changes derived from prepared set;
6. exactly one driver semantic commit records all Resources і one committed entry з common `committed_at`;
7. prepared index performs only-once synchronous no-I/O atomic swap after resolved commit;
8. detached target/tombstone result returned.

No-change та validation failure не відкривають transaction, не пишуть journal і не bump-ять timestamps. Crash after commit/before publish відновлюється fresh startup rebuild/revalidation, а не replay semantic move/delete logic.

Batch preparation перевіряє cycle-free graph, active-parent relation, dense active groups і tombstone invisibility. Partial sibling commit або partial index publication заборонені.

## Typed integrity fail-close

```ts
type ResourceRuntimeIntegrityCode =
  | 'RESOURCE_STORAGE_INTEGRITY'
  | 'RESOURCE_INDEX_INTEGRITY'

class ResourceRuntimeIntegrityError extends Error {
  readonly code: ResourceRuntimeIntegrityCode
}

interface RuntimeFaultPort {
  failIntegrity(input: {
    readonly code: ResourceRuntimeIntegrityCode
    readonly operation_id: IDString
  }): void
}

type OperationEngineIntegrityFailure = {
  readonly ok: false
  readonly code: 'OPERATION_INTEGRITY_FAILED'
  readonly committed: false
  readonly fail_closed: true
}
```

Extensia-owned driver/session/read/journal validators класифікують лише proven storage invariant defects; raw driver I/O rejection не стає integrity error. Batch index validation класифікує deterministic tree/order/visibility divergence як index integrity.

Operation Engine catch-ить typed integrity окремо і в одному synchronous no-await turn close-ить intake та викликає no-throw lifecycle-owned `RuntimeFaultPort.failIntegrity()` до awaited abort/session/lock cleanup. Port записує safe diagnostic, unpublish-ить facades і переводить Module `started → failed`. Current admitted command після cleanup отримує `STORAGE_INTEGRITY_FAILED`; stale/new calls уже під delayed cleanup отримують `MODULE_NOT_READY`. Same Module не restart-иться; fresh composition проходить recovery/revalidation before ready.

Ordinary acquire/read/begin/stage/commit reject з proven uncommitted state лишається lock/write failure. Після commit publication/cleanup faults зберігають committed success, bounded warning і existing fail-close semantics.

## Required verification matrix

- Root/same-parent/cross-parent move, first/last/no-change/range/cycle/orphan/deleted-parent cases.
- Exact staged IDs, common timestamps, one entry/fingerprint і batch atomic visibility.
- Mark hostile descriptors/sparse arrays/duplicates/int32/count/string boundaries.
- KV hostile records, insertion-order equality, empty delete, key/namespace/value/total limits.
- Delete missing/repeated/children/flags/root/sibling reindex/default-not-found cases.
- Two moves; move+delete; create+move; sibling aggregate+hierarchy; same-Resource Mark+KV schedules.
- Acquire/read/journal/index integrity injection distinct from ordinary I/O; delayed cleanup race; no same-instance restart.
- Commit cuts, post-commit warnings, crash/fresh recovery і corrupted graph/order ready-block.
- Packed root API/type proof, readonly-before-inspection, detached snapshots і no internal exports.

## Deferred scope

Restore/include-deleted/cascade/purge/retention, Mark queries/stats, global/lazy completeness, Assets, concrete storage layout/durability, External Change Sync, hooks/plugins та release compatibility freeze мають окремих future owners.
