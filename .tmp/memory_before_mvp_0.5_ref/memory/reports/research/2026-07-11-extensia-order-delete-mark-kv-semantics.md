# Деталізований design report: order, delete, Mark і KV semantics Extensia

Related Task: `memory/tasks/plan/TASK-07.26-0031-p3-dg2-order-delete-mark-kv-semantics/task.md`
Related Research Artifact: `memory/tasks/plan/TASK-07.26-0031-p3-dg2-order-delete-mark-kv-semantics/research/RSCH-001.md`
Report Type: design
Created: 2026-07-11
Status: accepted

## 1. Питання і рекомендація

Потрібно визначити exact semantics Resource hierarchy/order, soft delete, Mark і KV writes поверх accepted P3 journal-backed foundation так, щоб наступні vertical slices не створили другого write path, partial sibling update або facade-direct access до driver/index.

Рекомендація:

- canonical active sibling group має dense zero-based order `0..n-1`; `moveResource` явно задає destination `parent_id` і insertion `order_index`;
- hierarchy-aware create після P3-VS3 додає новий root у кінець active root group замість історичного bounded `order_index = 0`;
- move/delete reindex-ять усі active siblings, чиї `order_index` реально змінюються, одним ordered multi-Resource semantic commit;
- Phase 3 delete є leaf-only soft delete; deleted tombstone прихований зі звичайних queries, зберігає parent/order/flags/aggregates, а restore deferred і не входить у public API;
- `setMarks` повністю замінює набір Marks Resource; `setKV` повністю замінює один namespace, а empty values видаляє namespace;
- кожна effective mutation reload-ить latest committed state під чинною exclusive session, готує batch index change до commit, commit-ить один journal entry і повертає detached committed Resource;
- hierarchy operations у Phase 3 використовують coarse process-local key `resource-hierarchy` та target `resource:<id>`; це усуває небезпечне lock replanning після stale preflight, а global storage session лишається total commit order;
- proposal застосовується лише окремою owner fixation task після human approval; production і downstream tasks цією design task не активуються.

## 2. Authority та межі

### Accepted authority

- `REQ-DOM-001`, `REQ-DOM-003`, `REQ-DOM-005`, `REQ-DOM-006` задають Resource aggregate, tree, Mark identity/value і KV shape.
- `REQ-API-003…005` задають storage/query facades, normalized failures і detached snapshots.
- `REQ-RUN-003…009`, ADR-0005 і ADR-0008 задають один Core pipeline, driver source of truth, sequential result, one semantic commit, committed journal publication, post-commit index і recovery-before-ready.
- Canonical P3 contract задає outcome-definite driver transaction, full ordered write-set fingerprint, contiguous journal, prepared index publication, committed warnings і opaque application boundary.
- Factual P3-STAB1 evidence підтверджує один Core write port, Operation Engine, full-driver session/transaction, deterministic fake, create/update і no duplicate write path.

### Design inputs, не automatic freeze

- Draft domain source задає поля, tree, `type + name`, int32 Mark value і KV dictionary.
- Draft API source пропонує conceptual names `moveResource`, `deleteResource`, `setMarks`, `setKV` і забороняє facade-direct driver/index/journal access.
- Draft runtime source задає normalized lock ordering, affected entity planning і one operation pipeline, але його historical separate append wording superseded ADR-0008.

### Поза рішенням

- Assets, upload, primary asset і file semantics;
- physical layout, concrete durability, leases, compaction і retention;
- External Change Sync implementation, lazy completeness, plugins/hooks;
- generic batch API, public transaction/session, release-wide compatibility;
- schema/data migration для persisted experimental pre-P3-DG2 data.

## 3. Factual baseline і architecture pressure

Current source підтримує single-Resource create/update, `stageResource()` багато разів у transaction, fingerprint масиву Resource snapshots, ordered atomic multi-key locks і prepared single-upsert index swap. Journal type union та index prepared seam поки single-operation/single-upsert shaped. Domain validator навмисно приймає будь-який finite `order_index`; Mark/KV limits і canonical ordering відсутні.

Multi-Resource hierarchy mutation виражається чинним transaction contract без нового storage primitive: кілька `stageResource()` + один fingerprint + один `commit()`. Потрібне bounded розширення protocol unions, batch index preparation та operation handlers, а не другий engine або journal writer.

Critical pressure point — визначення exact sibling lock set до storage session. Exact committed sibling list може відрізнятися від local index через майбутнє external sync window. Захоплення нових local locks уже під storage session створило б lock inversion, а release/replan потребувало б unbounded retry policy. Тому Phase 3 використовує один normalized hierarchy key. Fine-grained sibling-group locks можуть бути окремим performance refinement лише після sync/completeness gate; correctness від них не залежить.

## 4. Alternatives і decision register

| ID | Питання | Обране рішення | Відхилені варіанти і причина |
|---|---|---|---|
| D-01 | Sibling order | Dense active order `0..n-1` | Sparse/fractional keys ускладнюють canonical equality, overflow і recovery; `(order,id)` fallback приховує duplicates |
| D-02 | Requested move index | Insertion index after removing target, range `0..destinationCount` | Clamp приховує caller defect; swap semantics не узагальнюються на cross-parent move |
| D-03 | Root behavior | `parent_id = null` є ordinary root sibling group | Special un-ordered roots суперечать tree projection і create consistency |
| D-04 | Hierarchy locks | `resource-hierarchy` + target resource key, lexical atomic acquire | Preflight-derived sibling locks можуть бути stale; locks under storage session створюють inversion |
| D-05 | Delete children | Soft-delete лише active leaf | Cascade створює unbounded hidden write-set; promotion змінює hierarchy implicit; parent-with-children delete без policy створює invisible subtree |
| D-06 | Restore | Deferred; public method відсутній | Exact restore target/conflict semantics не потрібні для deletion correctness і розширюють P3-VS5 |
| D-07 | Marks | Full replacement | Patch потребує separate delete vocabulary і складнішу duplicate/no-change semantics; conceptual `setMarks` природно означає replace |
| D-08 | KV | Replace одного namespace; empty map deletes namespace | Whole-KV replacement має надто широкий conflict scope; generic patch потребує sentinel/delete ambiguity |
| D-09 | Timestamps | Кожний реально staged Resource отримує one operation timestamp | Parent aggregate bump без field mutation створює artificial writes; only target bump приховує sibling reindex changes |
| D-10 | Deleted visibility | Default reads/tree трактують tombstone як not found | Public include-deleted option і restore catalog виходять за bounded slice |

## 5. Canonical hierarchy/order invariants

1. Sibling group визначається exact `parent_id`, включно з root group `null`.
2. Active group містить лише Resources із `is_deleted = false`.
3. У кожній active group `order_index` є safe integer і exact permutation `0..n-1`; duplicates, gaps, negative, fractional і unsafe values є integrity failure після P3-VS3 gate.
4. Deleted tombstone не входить у active ordering invariant і зберігає останні `parent_id`/`order_index` як historical metadata без promise автоматичного restore.
5. Кожний active Resource із non-null `parent_id` має active parent. Усі stored parent relations, включно з tombstones, посилаються на existing Resource і не утворюють cycle.
6. `children[]` лишається derived projection і містить тільки active direct children sorted by `order_index`; ID tie-breaker більше не є нормальним resolution path.
7. Parent Resource `updated_at` не змінюється лише через зміну derived children projection. Timestamp змінюється тільки в snapshots, чиї own fields/aggregates реально staged.
8. Один operation timestamp застосовується до всіх staged Resources; Timestamp не визначає journal або sibling order.

### Compatibility refinement create

Після P3-VS3 successful create під `resource-hierarchy` lock і storage session завантажує active root group та присвоює новому Resource `order_index = rootCount`. Existing title/description/default semantics не змінюються. Це intentional refinement experimental Phase 3 behavior; previous always-zero root default не переноситься у stabilized hierarchy contract.

## 6. Exact move contract

```ts
export interface MoveResourceInput {
  readonly parent_id: string | null
  readonly order_index: number
}

export interface StorageFacade {
  moveResource(
    id: string,
    input: MoveResourceInput,
  ): Promise<ExtensiaResult<ResourceWriteSuccess, ResourceMoveError>>
}
```

Input є ordinary/null-prototype object з exact own enumerable data properties `parent_id` і `order_index`; обидва required. Accessors, symbols, arrays, inherited/unknown/non-enumerable fields відхиляються як `RESOURCE_INPUT_INVALID`. `id` і string parent normalizуються existing UUID v4 parser; invalid будь-якого ID повертає `INVALID_RESOURCE_ID`. `order_index` має бути non-negative safe integer.

Під session Core завантажує coherent Resource set, а не покладається на Hot Index як authority:

1. target мусить існувати й бути active, інакше `RESOURCE_NOT_FOUND`;
2. non-null destination parent мусить існувати й бути active, інакше `RESOURCE_PARENT_NOT_FOUND`;
3. parent не може дорівнювати target або бути його descendant за stored parent chain, інакше `RESOURCE_MOVE_CYCLE`;
4. target видаляється із current active source group;
5. destination group визначається після removal target; допустимий requested range `0..destinationGroup.length` inclusive;
6. out-of-range дає `RESOURCE_ORDER_OUT_OF_RANGE` без transaction;
7. target вставляється в requested position, source і destination groups reindex-яться `0..n-1`;
8. якщо parent і final position target не змінилися та жоден sibling index не змінюється, повертається `RESOURCE_NO_CHANGES` без transaction/journal/timestamp;
9. кожний Resource зі зміненим `parent_id` або `order_index` staged з one operation `updated_at`; інші snapshots не переписуються.

Move root-to-root, child-to-root, root-to-child і same-parent reorder використовують той самий algorithm. Cross-parent move нормалізує обидві groups; same-parent move нормалізує одну group один раз.

## 7. Move examples

| Before | Request | After | Staged IDs |
|---|---|---|---|
| `A0 B1 C2`, move B to 0 | `(same,0)` | `B0 A1 C2` | B, A |
| `A0 B1 C2`, move B to 2 | `(same,2)` | `A0 C1 B2` | B, C |
| source `A0 B1`, dest `X0 Y1`, move A to 1 | `(dest,1)` | source `B0`; dest `X0 A1 Y2` | A, B, Y |
| `A0 B1`, move B to 1 | `(same,1)` | unchanged | none; `RESOURCE_NO_CHANGES` |
| dest has 2 items, request 3 | `(dest,3)` | unchanged | none; `RESOURCE_ORDER_OUT_OF_RANGE` |

## 8. Delete state machine

### Exact public contract

```ts
export interface StorageFacade {
  deleteResource(
    id: string,
  ): Promise<ExtensiaResult<ResourceWriteSuccess, ResourceDeleteError>>
}
```

Delete завантажує target і current active children під storage session.

| Current state | Condition | Result |
|---|---|---|
| missing | — | `RESOURCE_NOT_FOUND` |
| tombstone | `is_deleted = true` | `RESOURCE_ALREADY_DELETED`; no transaction |
| active | має хоча б одну active child | `RESOURCE_HAS_CHILDREN`; no transaction |
| active leaf | — | effective soft delete |

Effective delete:

- ставить target `is_deleted = true`, зберігає `parent_id`, `order_index`, `locked`, `hidden`, title/description/assets/marks/KV і `created_at`;
- target `updated_at` стає operation timestamp;
- active source siblings після removal reindex-яться densely; changed siblings отримують той самий `updated_at`;
- parent Resource snapshot і його `updated_at` не змінюються;
- `locked` і `hidden` не блокують delete і не змінюються: accepted baseline визначає їх independent reserved flags без Core behavior;
- commit повертає tombstone як one-time detached `ResourceWriteSuccess.resource`; normal `getResource`/`getResourceTree` після commit повертають `RESOURCE_NOT_FOUND`;
- default active index/tree не публікує tombstone; internal durable state і recovery його зберігають.

Active parent може бути deleted лише після delete його active children. Deleted children не блокують delete parent, але stored relation та existence/cycle integrity зберігаються. Active child з deleted parent є integrity failure й блокує ready.

### Restore decision

Restore deferred із Phase 3 і `0.1.0` bounded surface: немає `restoreResource`, include-deleted query або implicit undelete через update/move/setMarks/setKV. Tombstone location зберігається лише для provenance; майбутній owner gate мусить вимагати explicit active target parent/order і вирішити conflicts, а не обіцяти автоматичне повернення у historical slot.

## 9. Mark contract

```ts
export interface SetMarkInput {
  readonly type: string
  readonly name: string
  readonly value: number | null
}

export interface StorageFacade {
  setMarks(
    resourceId: string,
    marks: readonly SetMarkInput[],
  ): Promise<ExtensiaResult<ResourceWriteSuccess, ResourceMarksError>>
}
```

Semantics — full replacement. Empty array clears all Marks.

Validation:

- outer input — dense ordinary Array, максимум 256 elements; дозволені лише own `length` і canonical index data properties, а sparse slots, інші own keys/symbols та accessor indices відхиляються;
- кожний element — ordinary/null-prototype object з exact own enumerable data properties `type`, `name`, `value`;
- `type` і `name` — strings, `trim().length > 0`, length `1..128` ECMAScript UTF-16 code units; values зберігаються exact, без trim/case/Unicode normalization;
- `value` — `null` або signed int32 `[-2147483648, 2147483647]`;
- duplicate exact `(type,name)` відхиляється як `RESOURCE_INPUT_INVALID`, навіть якщо value однаковий;
- deleted/missing Resource для звичайного command surface повертає `RESOURCE_NOT_FOUND`.

Canonical state сортує Marks binary ECMAScript string order by `(type,name)` без locale. No-change порівнює canonical arrays; identical replacement повертає `RESOURCE_NO_CHANGES` без timestamp/transaction/journal. Effective replacement змінює лише `marks` і Resource own `updated_at`.

## 10. KV contract

```ts
export interface StorageFacade {
  setKV(
    resourceId: string,
    namespace: string,
    values: Readonly<Record<string, string>>,
  ): Promise<ExtensiaResult<ResourceWriteSuccess, ResourceKVError>>
}
```

Semantics — full replacement одного namespace. Empty `values` видаляє namespace; empty replacement absent namespace є `RESOURCE_NO_CHANGES`.

Validation:

- namespace — string, `trim().length > 0`, length `1..128` UTF-16 code units, exact preserved;
- values — ordinary/null-prototype exact own enumerable data record; accessors, symbols, arrays, inherited/non-enumerable fields відхиляються;
- кожний key має `trim().length > 0`, length `1..128`; кожне value є string length `0..16384`; strings не normalizуються;
- maximum 256 keys у replaced namespace;
- resulting Resource має максимум 256 namespaces;
- sum `namespace.length + key.length + value.length` для всіх resulting entries не перевищує 1,048,576 UTF-16 code units; перевищення дає `RESOURCE_INPUT_INVALID`;
- missing/deleted Resource повертає `RESOURCE_NOT_FOUND`.

No-change порівнює mapping за exact key/value, не property insertion order. Fingerprint serialization сортує record keys existing canonical serializer-ом; public record enumeration order не є compatibility guarantee. Effective replacement змінює тільки target namespace/remove та Resource own `updated_at`.

## 11. Public errors і compatibility snapshot

Existing `ResourceWriteSuccess`, warnings і expected errors зберігаються. Error code union розширюється:

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
  | 'STORAGE_INTEGRITY_FAILED'
  | 'RESOURCE_PARENT_NOT_FOUND'
  | 'RESOURCE_MOVE_CYCLE'
  | 'RESOURCE_ORDER_OUT_OF_RANGE'
  | 'RESOURCE_HAS_CHILDREN'
  | 'RESOURCE_ALREADY_DELETED'

type ErrorOf<TCode extends ExtensiaErrorCode> = ExtensiaError<TCode>

export type ResourceMoveError =
  | ErrorOf<'MODULE_NOT_READY'>
  | ErrorOf<'STORAGE_READONLY'>
  | ErrorOf<'INVALID_RESOURCE_ID'>
  | ErrorOf<'RESOURCE_INPUT_INVALID'>
  | ErrorOf<'RESOURCE_NOT_FOUND'>
  | ErrorOf<'RESOURCE_PARENT_NOT_FOUND'>
  | ErrorOf<'RESOURCE_MOVE_CYCLE'>
  | ErrorOf<'RESOURCE_ORDER_OUT_OF_RANGE'>
  | ErrorOf<'RESOURCE_NO_CHANGES'>
  | ErrorOf<'STORAGE_LOCK_FAILED'>
  | ErrorOf<'STORAGE_WRITE_FAILED'>
  | ErrorOf<'STORAGE_INTEGRITY_FAILED'>

export type ResourceDeleteError =
  | ErrorOf<'MODULE_NOT_READY'>
  | ErrorOf<'STORAGE_READONLY'>
  | ErrorOf<'INVALID_RESOURCE_ID'>
  | ErrorOf<'RESOURCE_NOT_FOUND'>
  | ErrorOf<'RESOURCE_HAS_CHILDREN'>
  | ErrorOf<'RESOURCE_ALREADY_DELETED'>
  | ErrorOf<'STORAGE_LOCK_FAILED'>
  | ErrorOf<'STORAGE_WRITE_FAILED'>
  | ErrorOf<'STORAGE_INTEGRITY_FAILED'>

export type ResourceMarksError =
  | ErrorOf<'MODULE_NOT_READY'>
  | ErrorOf<'STORAGE_READONLY'>
  | ErrorOf<'INVALID_RESOURCE_ID'>
  | ErrorOf<'RESOURCE_INPUT_INVALID'>
  | ErrorOf<'RESOURCE_NOT_FOUND'>
  | ErrorOf<'RESOURCE_NO_CHANGES'>
  | ErrorOf<'STORAGE_LOCK_FAILED'>
  | ErrorOf<'STORAGE_WRITE_FAILED'>
  | ErrorOf<'STORAGE_INTEGRITY_FAILED'>

export type ResourceKVError = ResourceMarksError

export type ResourceWriteError =
  | ErrorOf<'MODULE_NOT_READY'>
  | ErrorOf<'INVALID_RESOURCE_ID'>
  | ErrorOf<'STORAGE_READONLY'>
  | ErrorOf<'RESOURCE_INPUT_INVALID'>
  | ErrorOf<'RESOURCE_NOT_FOUND'>
  | ErrorOf<'RESOURCE_NO_CHANGES'>
  | ErrorOf<'RESOURCE_ID_GENERATION_FAILED'>
  | ErrorOf<'STORAGE_LOCK_FAILED'>
  | ErrorOf<'STORAGE_WRITE_FAILED'>
  | ErrorOf<'STORAGE_INTEGRITY_FAILED'>

export interface SafeDiagnostic {
  readonly code: string
  readonly stage:
    | 'config'
    | 'composition'
    | 'start'
    | 'stop'
    | 'facade'
    | 'operation'
  readonly subject?: string
}
```

Наведений snapshot compile-орієнтований разом з already-exported `ExtensiaError<TCode>`, `ExtensiaResult<T,E>` і `ResourceWriteSuccess`. Public methods у sections 6, 8–10 використовують рівно ці unions. Existing create/update продовжують використовувати `ResourceWriteError`, який тепер exact включає `STORAGE_INTEGRITY_FAILED`; `SafeDiagnostic.stage` bounded розширюється `operation`. `STORAGE_INTEGRITY_FAILED` означає detected durable/index invariant defect до commit; це не alias ordinary I/O failure.

Error ownership:

| Condition | Code |
|---|---|
| malformed shape/limit/value | `RESOURCE_INPUT_INVALID` |
| malformed target або parent UUID | `INVALID_RESOURCE_ID` |
| missing/deleted target for move/Marks/KV або missing target delete | `RESOURCE_NOT_FOUND` |
| missing/deleted destination parent | `RESOURCE_PARENT_NOT_FOUND` |
| self/descendant destination | `RESOURCE_MOVE_CYCLE` |
| valid integer outside insertion range | `RESOURCE_ORDER_OUT_OF_RANGE` |
| effective state identical | `RESOURCE_NO_CHANGES` |
| delete active non-leaf | `RESOURCE_HAS_CHILDREN` |
| repeated delete tombstone | `RESOURCE_ALREADY_DELETED` |
| readonly before any command input inspection | `STORAGE_READONLY` |
| lock/session/write expected failure | existing `STORAGE_LOCK_FAILED` / `STORAGE_WRITE_FAILED` |
| durable hierarchy/order/journal/index invariant defect before commit | `STORAGE_INTEGRITY_FAILED` + fail-close |

### Error precedence

Facade/operation checks мають exact precedence; пізніший stage не виконується після earlier failure:

| Priority | Move | Delete | setMarks | setKV |
|---:|---|---|---|---|
| 1 | facade lease: `MODULE_NOT_READY` | same | same | same |
| 2 | readonly capability: `STORAGE_READONLY`, без inspection ID/input | same | same | same |
| 3 | target raw ID: `INVALID_RESOURCE_ID` | same | same | same |
| 4 | exact input shape/scalars: `RESOURCE_INPUT_INVALID`; потім parent UUID: `INVALID_RESOURCE_ID` | — | exact array/elements/standalone limits: `RESOURCE_INPUT_INVALID` | namespace, values shape/standalone limits: `RESOURCE_INPUT_INVALID` |
| 5 | local/storage acquire: typed integrity → `STORAGE_INTEGRITY_FAILED` + fail-close; other acquire reject → `STORAGE_LOCK_FAILED` | same | same | same |
| 6 | coherent load/prepare: typed integrity → `STORAGE_INTEGRITY_FAILED` + fail-close; ordinary driver I/O → `STORAGE_WRITE_FAILED` | same | same | same |
| 7 | detected stored/index/journal invariant defect not already classified: `STORAGE_INTEGRITY_FAILED` + fail-close | same | same | same |
| 8 | target missing/deleted: `RESOURCE_NOT_FOUND` | missing: `RESOURCE_NOT_FOUND`; tombstone: `RESOURCE_ALREADY_DELETED` | target missing/deleted: `RESOURCE_NOT_FOUND` | target missing/deleted: `RESOURCE_NOT_FOUND` |
| 9 | parent missing/deleted, cycle, then requested range | active children | resulting Mark aggregate validation | resulting namespace/resource count/total-size validation |
| 10 | exact no-change: `RESOURCE_NO_CHANGES` | — | `RESOURCE_NO_CHANGES` | `RESOURCE_NO_CHANGES` |
| 11 | begin/stage/commit ordinary reject: `STORAGE_WRITE_FAILED` | same | same | same |

Structural move input validates `order_index` as non-negative safe integer before parent UUID parsing only after exact property/type checks; exact precedence within stage 4 is target ID → object shape/required data descriptors → parent UUID → integer constraint. For KV, input-local key/value/count limits are stage 4; limits that depend on current namespaces/total Resource size are stage 9 after latest-state load. Commit-resolved faults never use failure precedence: they return committed success with existing warning and fail-close.

New methods, exact inputs і new errors мають label `experimental-phase-3`; existing lifecycle/reads/create/update не втрачають свої labels. `updateResource` на deleted Resource після P3-VS5 повертає `RESOURCE_NOT_FOUND`. No callable Core/driver/session/transaction або generic execute додається. Repeated delete є єдиною bounded command-specific tombstone distinction; default reads та інші writes не розкривають tombstone existence.

## 12. Operation, lock, write-set і journal contracts

| Operation | Local lock keys | Staged write-set |
|---|---|---|
| hierarchy-aware create | `resource-hierarchy`, generated `resource:<id>` | new root only |
| move | `resource-hierarchy`, target `resource:<id>` | target + every active source/destination sibling with changed own fields |
| delete | `resource-hierarchy`, target `resource:<id>` | tombstone target + changed active source siblings |
| setMarks | target `resource:<id>` | target only |
| setKV | target `resource:<id>` | target only |

Keys normalizуються/deduplicate-яться й атомарно захоплюються existing lexical queue. Hierarchy key серіалізує всі local create/move/delete, але Mark/KV можуть prepare concurrently; exclusive recovery-clean storage session і latest reload визначають committed order та запобігають lost update.

Transaction rules для кожної effective operation:

1. coherent latest Resource set завантажується під session;
2. next snapshots повністю валідовані до transaction;
3. staged snapshots sort-яться canonical Resource ID order;
4. `affected_resources` і `resource.upsert` hints містять exact same sorted IDs без duplicates;
5. full write-set fingerprint обчислюється над exact sorted staged snapshots;
6. operation type — `resource.create`, `resource.update`, `resource.move`, `resource.delete`, `resource.marks.set` або `resource.kv.set`;
7. `committed_at` — common operation timestamp;
8. рівно один transaction commit фіксує всі staged Resources і one committed entry;
9. retry same operation ID дозволений лише existing exact draft/fingerprint idempotency rule.

### Pre-session hints vs exact write-set

Current `ResourceOperationPlan.affected_resources` freeze-иться до storage session і тому не може бути authority для move/delete sibling set. P3-VS3 виконує bounded internal semantic rename/extension:

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

`resource_hints` містить лише caller-known primary IDs для diagnostics/planning і ніколи не копіюється автоматично в journal. Після coherent session load та повної validation handler до `begin/stage` один раз будує immutable `PreparedResourceWriteSet`: resources та IDs exact, unique й sorted by canonical ID; changes one-to-one у тому ж order; fingerprint рахується з exact resources. Transaction staging та `CommittedOperationDraft.affected_resources`/`changes` беруться тільки з цього prepared set. Existing create/update adapters переходять на `resource_hints` без public behavior change. Lock keys лишаються finalized before session; write-set discovery не набуває права replan/acquire local locks під session.

No extra hierarchy/Mark/KV payload потрібен для correctness: Storage Driver є metadata authority, а journal hints наказують sync/recovery reload exact affected Resources. Physical journal layout лишається deferred.

## 13. Batch index publication і read-back

P3-VS3 розширює single `prepareUpsert` до internal batch seam, концептуально:

```ts
interface PreparedResourceIndexChange {
  readonly resources: readonly ResourceSnapshot[]
  publish(): void
}

interface MutableGreedyResourceIndex {
  prepareUpserts(resources: readonly ResourceSnapshot[]): PreparedResourceIndexChange
}
```

Preparation clone-ить full next maps, перевіряє stored tree, active-parent і dense active-order invariants, будує visible map/tree без tombstones та створює only-once synchronous no-I/O swap. Воно виконується під storage session до transaction; publish — одразу після resolved commit, до release session.

Move/Marks/KV success повертає committed active target snapshot. Delete повертає committed tombstone лише в command result. Sibling snapshots не додаються до public success; application читає їх окремо через query після atomic index publication. Post-commit publish/cleanup failures зберігають existing committed warning/fail-close semantics.

## 14. Failure і recovery matrix

| Cut/condition | Durable state | Journal | Local index/public result |
|---|---|---|---|
| invalid input/ID/range/cycle/children/no-change | old | unchanged | normalized failure, no timestamp |
| local lock/session failure | old | unchanged | lock/write failure |
| latest-state/invariant validation failure | old | unchanged | no transaction; integrity defect не маскується success |
| batch prepare failure | old | unchanged | fail before staging |
| stage/commit reject | old | unchanged | abort; `STORAGE_WRITE_FAILED` |
| commit resolve | full new write-set | exactly one entry | irrevocably committed |
| crash after commit before publish | new | committed | fresh startup rebuilds exact dense/visible state |
| publish fault | new | committed | committed target/tombstone success + `LOCAL_INDEX_PUBLICATION_FAILED`; fail-close |
| cleanup fault | new | committed | committed success + `POST_COMMIT_CLEANUP_FAILED`; fail-close |
| fresh recovery sees incomplete staging | old or proven committed | committed-only baseline | rollback/complete existing recovery rules |
| entry/write-set mismatch, duplicate/gap/corrupt tree/order | ambiguous/corrupt | integrity defect | ready blocked |

### Runtime integrity disposition

Ordinary driver acquire/read/begin/stage/commit rejection із proven uncommitted outcome повертає existing lock/write failure й не обов'язково закриває runtime. Натомість будь-який detected durable hierarchy/order/journal fingerprint defect, active-parent violation або divergence між committed state та prepared local index contract до commit:

1. не починає staging або abort-ить uncommitted transaction;
2. повертає current admitted command normalized `STORAGE_INTEGRITY_FAILED`;
3. записує safe diagnostic code `RESOURCE_STORAGE_INTEGRITY`, stage `operation`, validated operation ID без snapshots/paths/raw cause;
4. atomically close-ить Operation Engine intake, Runtime Fault Controller unpublish-ить facades і переводить Module `started -> failed`;
5. stale/new calls повертають `MODULE_NOT_READY`; in-flight cleanup/stop виконується at-most-once existing lifecycle path;
6. same Module не restart-иться. Лише fresh composition може пройти recovery/rebuild; якщо durable defect лишився, startup повертає `START_FAILED` і ready не публікується.

Unexpected programming/index-preparation defect, який не можна безпечно класифікувати як ordinary caller/driver failure, використовує той самий fail-close boundary; safe diagnostic може мати narrower Extensia-owned code, але public current command не повертає `STORAGE_WRITE_FAILED` як твердження, що runtime healthy. Після commit діє existing committed warning/fail-close contract, не `STORAGE_INTEGRITY_FAILED`.

### Typed integrity propagation seam

P3-VS3 materialize-ить bounded internal distinction, якого current engine не має:

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

- Full-driver adapter запускає Extensia-owned session/read/journal/recovery-clean validators, які кидають exact internal `ResourceStorageIntegrityError`, і мапить лише цей class у `ResourceRuntimeIntegrityError('RESOURCE_STORAGE_INTEGRITY')`; raw driver-author acquire/read/I/O rejection без цього internal class не перекласифіковується.
- Batch index validation/preparation мапить deterministic stored-tree/order/active-visibility divergence у `RESOURCE_INDEX_INTEGRITY`; ordinary caller validation відбувається раніше й не використовує цей error.
- Operation Engine catch-ить typed integrity окремо від generic callback failure і в тому самому synchronous no-await turn спочатку close-ить engine intake, одразу викликає no-throw `RuntimeFaultPort.failIntegrity()` для facade unpublication/Module failed, а лише потім await-ить abort/session/lock cleanup; після cleanup current admitted call отримує `OPERATION_INTEGRITY_FAILED`.
- Runtime Fault Port належить lifecycle/Module boundary: записує safe `operation` diagnostic, unpublish-ить facades і переводить started Module у failed. Він не містить snapshot/path/raw cause і не є public export.
- Core write adapter мапить лише `OPERATION_INTEGRITY_FAILED` у public `STORAGE_INTEGRITY_FAILED`; generic uncommitted engine/driver failures лишаються existing `STORAGE_WRITE_FAILED`/`STORAGE_LOCK_FAILED`.
- Existing create/update handlers переходять на той самий mapping, бо їх session acquire/read/index preparation може виявити integrity defect. Це не змінює ordinary success/error semantics.

Fail-close не залежить від того, чи facade встигла map-нути result: engine intake close та Runtime Fault Port invocation відбуваються без `await` до cleanup window. Facade повертає admitted current result після cleanup, а будь-які stale/new calls, включно з concurrent call під час delayed abort/session release, бачать unpublished surface/`MODULE_NOT_READY`, а не generic write failure.

Recovery не replay-ить semantic move/delete logic із payload. Воно відновлює/валідує driver-owned committed snapshots, committed journal integrity та rebuild-ить active index. Це зменшує versioned replay coupling.

## 15. Concurrency schedules

| Schedule | Required outcome |
|---|---|
| two moves | local `resource-hierarchy` FIFO; second reloads first committed result |
| move + delete | hierarchy FIFO; delete eligibility/order evaluated після first commit |
| create + move/delete | hierarchy FIFO; root dense order не має duplicates/gaps |
| move/delete reindexes sibling + setKV sibling | storage session serializes; later operation reloads latest snapshot and preserves earlier order/KV |
| setMarks + setKV same Resource | same `resource:<id>` FIFO; second preserves first aggregate change |
| setMarks/KV different Resources | local preparation may overlap; journal sequence/session defines commits |
| external writer between local operations | exclusive session gives latest state; hierarchy coarse local lock не використовується як cross-process authority |
| stop during admitted operation | existing close-and-drain; no force cancellation after staging/commit start |

## 16. Downstream task-ready decomposition

### P3-VS3 — Resource hierarchy/order і move

- Type/mode: `feature / autonomous-implementation`.
- Scope: order validator/invariants, hierarchy-aware create append, exact move facade/Core request/errors, `resource-hierarchy` lock discipline, coherent hierarchy load, dense normalization, multi-stage transaction, journal union/fingerprint ordering, batch prepared index, typed driver/index integrity classification, Operation Engine integrity fail-close, internal Runtime Fault Port, public `operation` diagnostic stage та create/update/new-method `STORAGE_INTEGRITY_FAILED` mapping.
- Dependencies: approved P3-DG2 result + approved/applied FIX-001 artifact; done P3-STAB1.
- Acceptance: root/same/cross-parent examples, range/cycle/orphan/deleted-parent checks, no-change zero journal, exact staged IDs/timestamps, concurrent schedules, crash/fresh recovery, readonly-before-inspection, packed API/type proof; acquire/read/index injected integrity maps to exact normalized failure, safe diagnostic, engine intake close, facade unpublication, Module failed/no restart, while ordinary acquire/I/O remains lock/write failure and post-commit faults remain committed warnings; delayed cleanup race доводить, що concurrent stale/new call після integrity detection уже отримує `MODULE_NOT_READY`.
- Out: delete visibility, Marks/KV, restore, fine-grained hierarchy locks.

### P3-VS4 — Mark і KV writes

- Type/mode: `feature / autonomous-implementation`.
- Scope: exact `setMarks`/`setKV` parsing, limits, canonicalization, replace/delete/no-change, single-Resource pipeline, public types/errors and packed read-back.
- Dependencies: done P3-VS3 to reuse stabilized protocol unions/batch index/public surface without overlapping seam edits.
- Acceptance: hostile descriptors/prototypes/sparse arrays, boundary lengths/counts/int32, duplicates, empty clears/deletes, property-order-insensitive no-change, serialized same-Resource schedules, journal/fingerprint/recovery/detached snapshots.
- Out: mark queries/stats/indexes, patch APIs, Asset.data, plugins/hooks.

### P3-VS5 — Resource soft delete

- Type/mode: `feature / autonomous-implementation`.
- Scope: exact delete errors/state machine, leaf-only eligibility, source reindex, tombstone commit result, default read/tree visibility, startup/recovery integrity.
- Dependencies: done P3-VS3 and P3-VS4; VS3 owns hierarchy/batch foundation.
- Acceptance: missing/repeated/children/flags/root cases, sibling reindex, deleted query not found, active-parent invariant, delete concurrent with hierarchy/aggregate writes, crash/recovery and committed warnings.
- Out: restore/include-deleted/cascade/purge/retention.

### Final P3-STAB

- Type/mode: `chore / autonomous-implementation`.
- Dependencies: done P3-VS3…VS5.
- Scope: whole Phase 3 clean/package/API/architecture, order/delete/Marks/KV failure/recovery/concurrency matrices, compatibility and source-boundary scans, reproducibility, independent audit.
- Acceptance: no second write/journal path, all committed operations exactly one entry, dense order and visibility invariants green, root exports exact, full/focused/package gates green, memory sync and no open P0-P3.

No task/run is created or activated by this report. Sequential ownership is intentional because VS3/VS4/VS5 touch the same public facade, Core port and protocol unions.

## 17. Traceability matrix

| Requirement/gate | Design coverage |
|---|---|
| REQ-DOM-001/003 | sections 5–8: aggregate/tree/source-of-truth/order/delete |
| REQ-DOM-005 | section 9: exact identity/int32/replace/order/limits |
| REQ-DOM-006 | section 10: namespace/key/string/replace/delete/limits |
| REQ-API-003/004/005 | sections 6, 8–11, 13: storage methods, normalized results, detached read-back |
| REQ-RUN-003/004 | sections 3, 12: one Core pipeline, driver authority |
| REQ-RUN-005 | sections 11, 16: readonly before inspection |
| REQ-RUN-006 | sections 12, 15: local keys + exclusive session + sequence |
| REQ-RUN-007/008 | sections 12–14: one committed entry, prepared post-commit index |
| REQ-RUN-009 | sections 13–14: rebuild/validate before ready |
| REQ-RUN-012 | existing Operation Scope unchanged; no global mutable request state |
| ADR-0005/0008 | one semantic multi-upsert commit, committed-only journal, fail-close warnings |
| task move/order AC | sections 5–7, 12–15 |
| task delete/restore AC | section 8 plus matrices |
| task Mark/KV AC | sections 9–10, 12–15 |
| downstream readiness | section 16 |

## 18. Verification plan

- Compile/type snapshots для exact root methods/input/result/error unions і no internal handles.
- Domain/property matrices для dense group normalization, cycles, active/deleted relations, Mark/KV boundaries.
- Deterministic concurrent schedules з asserted staged IDs, common timestamps, fingerprint order і journal sequence.
- Failure injection at acquire/read/prepare/begin/stage/commit/publish/cleanup і crash/fresh recovery.
- Typed integrity probes окремо від ordinary rejection: driver acquire/read/journal, batch index prepare, engine result, Runtime Fault Port diagnostic/unpublication/failed state, existing create/update union; barrier-controlled delayed abort/session cleanup перевіряє synchronous no-await unpublication до cleanup.
- Readonly negative tests before inspection hostile inputs.
- Packed consumer create append/move/setMarks/setKV/delete/read-back/not-found scenario.
- Source scans: no facade-direct driver/index/journal, no independent append, no new generic execute, no Assets/hooks/sync leakage.
- Full package gate й independent audit у кожній activated downstream task.

## 19. Risks і explicit limitations

- Coarse hierarchy lock знижує local concurrency, але current global storage session already serializes commits; correctness-first trade-off прийнятний для Phase 3. Performance refinement потребує окремих measurements/sync-aware design.
- Experimental create order refinement може бути incompatible з pre-gate persisted data. Project наразі не гарантує durable format/migration; final P3/P4/P7 мають явно перевірити migration stance.
- Leaf-only delete не задовольняє cascade use cases; це deliberate bounded behavior, а не прихована відсутність.
- Restore deferred: soft delete зберігає tombstone, але не обіцяє public recovery workflow.
- Chosen Mark/KV limits є product safety baseline; зміна після public freeze потребуватиме compatibility decision.
- Mark queries/stats і lazy/global indexing deferred до Phase 5.

## 20. Memory fixation proposal

FIX-001 має запропонувати:

- новий canonical `technical/order-delete-mark-kv-contract.md`;
- ADR-0009 для dense active ordering, leaf soft delete, replace Marks/namespace KV і coarse hierarchy lock;
- bounded updates domain target/rules/open questions, technical architecture/rules/open questions, product roadmap;
- окрему owner application task, яка створить stable application artifact і лише підготує P3-VS3/P3-VS4/P3-VS5/final P3-STAB tasks без activation;
- factual task/state/progress sync після application.

Accepted requirements, ADR-0005/0008 і current implementation не змінюються цією research task. Proposal не applied без окремого human approval/application workflow.

## 21. Independent audit і recommendation state

Review Method: independent-subagent
Auditor: `/root/p3_dg2_independent_audit`
Initial Verdict: `NOT_REVIEW_READY` — P0 0 / P1 0 / P2 3 / P3 0
R2 Verdict: `NOT_REVIEW_READY` — P0 0 / P1 0 / P2 2 / P3 0
R3 Verdict: `NOT_REVIEW_READY` — P0 0 / P1 0 / P2 1 / P3 0
Final R4 Verdict: `REVIEW_READY` — open P0-P3 none

Audit remediation закрила exact public unions/error precedence, pre-commit integrity normalized fail-close, dynamic `resource_hints` vs prepared write-set semantics, public diagnostic/create-update coverage, typed adapter→engine→fault-port propagation і cleanup-window unpublication race. Final reviewer підтвердив report/FIX/RSCH alignment та відсутність нових P0-P3.

Open owner choices не залишено: restore explicitly deferred, children policy leaf-only, limits і compatibility labels exact. Recommendation готова до task-level human review; canonical application і downstream activation не виконані.
