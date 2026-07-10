# Деталізований design report: write, journal і recovery protocol Extensia

Related Task: `memory/tasks/plan/TASK-07.26-0023-bp3-01-write-journal-recovery-protocol/task.md`
Related Research Artifact: `memory/tasks/plan/TASK-07.26-0023-bp3-01-write-journal-recovery-protocol/research/RSCH-001.md`
Report Type: design
Created: 2026-07-10
Status: accepted

## 1. Питання і рекомендація

Потрібно визначити найменший exact protocol, який дозволить реалізувати Resource create/update через єдиний Core Operation Engine, deterministic fake full driver, committed journal publication boundary, recovery до ready й атомарний post-commit index update, не визначаючи physical layout першого concrete driver.

Рекомендація: використовувати driver-owned layout-neutral write session і transaction. Core володіє policy, operation plan, validation, locks та index delta; driver володіє storage-level session, staging, outcome-definite semantic commit, journal sequence і recovery mechanics. `transaction.commit(entryDraft)` є єдиним linearization point: після resolve Resource metadata й рівно один committed journal entry є committed state; rejection гарантує, що commit не відбувся. Окремі public/independent `writeResource()` та `appendJournalEntry()` не допускаються як write path.

Перший bounded API підтримує лише root Resource create і update власних `title`/`description`. Parent/order, `locked`/`hidden`, Mark/KV, delete/restore та Assets лишаються P3-DG2/P4/P6 gates.

## 2. Authority і межа

### Accepted authority

- REQ-RUN-003…009: єдиний Core write pipeline, Storage Driver source of truth, readonly/full modes, sequential result, committed journal publication, post-commit index, recovery до ready.
- REQ-API-003…005: commands у `storage`, normalized expected failures, detached DTO snapshots.
- ADR-0005: Core-driven writes, storage-level lock, committed publication і post-commit index.
- ADR-0007: чинний public lifecycle/result/facade boundary, experimental Phase 2 driver/create proof і close-and-drain semantics.

### Design inputs, не automatic freeze

- `runtime-architecture-v2-ioc.md` — conceptual operation/driver/journal/recovery sketches.
- `extension-and-api-model-v2-ioc.md` — conceptual `createResource`/`updateResource` і Core Extension Port.
- `domain-model-v2.md` — Resource fields та invariants.

### Не вирішується

- physical metadata/journal layout, fsync/rename/object-store strategy або concrete lock implementation;
- cross-process sync/cursor persistence implementation;
- move/sibling ordering, Mark/KV, delete/restore, Assets;
- plugin hooks і generic hook/plugin warning framework; bounded infrastructure warnings P3 визначає окремо;
- release-wide compatibility.

## 3. Фактичний baseline

- Public config приймає тільки `ReadonlyResourceDriver` із `mode: 'readonly'`, `open`, `close`, `listResources`.
- `storage.createResource(input: unknown)` повертає `STORAGE_READONLY` до inspection input.
- Core read runtime відкриває driver, будує greedy index і публікує shared read port.
- Resource index має лише `initialize`, `clear`, `getResource`, `getResourceTree`; mutation/publish seam відсутня.
- Facade Registry вже має atomic ready publication та operation intake close-and-drain.
- IoC composition підтримує explicit scopes, але operation-level providers/tokens ще не materialized.

Baseline зелений перед research: `npm run check`, 112/112 tests, package/publint/ATTW/packed consumer; production code не змінювався.

## 4. Критичні знахідки

### F-01. Два незалежні writes не утворюють commit protocol

Conceptual `writeResource(); appendJournalEntry()` лишає crash gap. Якщо metadata стали authoritative, а journal append не відбувся, committed publication і recovery interpretation суперечать одне одному. Тому semantic commit мусить включати обидві частини під одним transaction contract.

### F-02. Commit outcome має бути однозначним

Driver не може reject-ити `commit()` після того, як state фактично committed: Core повернув би failure і спровокував duplicate retry. Full capability contract вимагає outcome-definite commit. Underlying ambiguous I/O driver зобов'язаний resolve-ити outcome всередині transaction або fail startup/runtime як contract violation; Phase 4 доводить physical feasibility.

### F-03. Index delta треба підготувати під storage session до commit

Якщо validation або побудова derived tree виконується після commit, ordinary domain/index failure вже не можна rollback. Якщо delta готується до global storage session, concurrent non-conflicting operation може publish-нути новіший index state, а stale full-map swap його загубить. Тому Core під storage session після committed-state load готує й перевіряє immutable index publication delta до driver commit. Після commit виконується synchronous no-fail reference swap. Unexpected violation є programming fault, committed state не відкочується.

### F-04. Recovery, greedy load і journal head capture є одним exclusive ready gate

Для full mode порядок має бути `open -> acquire exclusive storage session with recovery-before-resolve -> list committed resources -> build index/capture journal head -> release -> publish ready`. Якщо lock відпустити до scan, інший process може commit-нути посеред greedy load і створити mixed snapshot. Recovery failure або integrity ambiguity завершує session acquisition/startup failure і reverse cleanup; partial public facade не публікується. Те саме recovery-clean guarantee діє для кожної write session після можливого crash іншого writer.

### F-05. P3-DG2 не можна імпортувати у перший slice

Parent/sibling policy, Mark/KV, delete/restore та reserved flags мають власні unresolved semantics. Перший create створює root Resource з fixed defaults; update змінює лише власні `title`/`description`.

### F-06. Generic hook/plugin warning framework ще не існує

Historical P3 verification згадує hook ordering/failure, але hook contract належить P6-DG1. P3 реалізує publication point і internal extension slot лише як architecture ordering rule; public hook API, handlers і generic hook/plugin warnings не materialize-яться. Bounded infrastructure warnings для committed index/cleanup faults визначаються окремо в §10/13.

## 5. Порівняння commit alternatives

| Варіант | Суть | Переваги | Недоліки | Рішення |
|---|---|---|---|---|
| A | Core окремо викликає metadata write і journal append | Простий interface | Crash gap, ambiguity, Core знає staging order | Відхилено |
| B | Driver transaction commit атомарно/відновлювано фіксує metadata та committed entry | Layout-neutral, один linearization point, recovery owner чіткий | Вимагає сильного driver contract | Прийнято |
| C | Journal містить повний event і є єдиним source of truth | Природна event-sourcing модель | Змінює accepted Storage Driver source-of-truth model, ускладнює reads/migration | Відхилено |
| D | Hot Index є primary state, storage flush асинхронний | Простий read-after-write | Порушує REQ-RUN-004/008 і durability | Відхилено |

## 6. Ownership model

| Власник | Відповідальність | Не володіє |
|---|---|---|
| Storage facade adapter | descriptor-safe public input parse, normalized public result | locks, driver, journal, index mutation |
| Consumer-owned Core write port | typed create/update requests/results | physical persistence |
| Operation Engine | ID/scope, plan, capability check, intake, locks, session, pipeline, error mapping | physical layout |
| Resource operation handler | domain validation, next snapshot, affected IDs, index delta, journal change draft | storage lock implementation |
| Driver adapter/session | capability normalization, storage lock lifetime, committed reads, transaction creation | domain policy |
| Driver transaction | staging, outcome-definite commit/abort, sequence assignment, committed-entry uniqueness | public result semantics |
| Operation Journal service | typed committed entry contract/read cursor over driver | independent write path |
| Hot Resource Index | process-local immutable publication delta/read projections | durable truth |
| Recovery coordinator | startup policy й ready/fail decision | physical artifact cleanup implementation |

Journal service є adapter над driver transaction/read facilities. Він не має окремого append API, доступного facades/plugins/operation handlers.

## 7. Conceptual internal contracts

Наведені contracts exact для P3 proposal на semantic рівні; final source paths materialize-ить окрема prerequisite task після application.

```ts
export type StorageCapabilityMode = 'readonly' | 'full'
declare const journalSequenceBrand: unique symbol
declare const writeSetFingerprintBrand: unique symbol
export type JournalSequence = string & {
  readonly [journalSequenceBrand]: 'JournalSequence'
}
export type WriteSetFingerprint = string & {
  readonly [writeSetFingerprintBrand]: 'WriteSetFingerprint'
}

export interface ResourceRecoveryReport {
  readonly status: 'clean' | 'recovered'
  readonly rolled_back_operations: number
  readonly completed_operations: number
}

export interface CommittedResourceChange {
  readonly kind: 'resource.upsert'
  readonly resource_id: IDString
}

export interface CommittedOperationEntry {
  readonly schema_version: 1
  readonly sequence: JournalSequence
  readonly operation_id: IDString
  readonly actor_id: IDString
  readonly type: 'resource.create' | 'resource.update'
  readonly affected_resources: readonly IDString[]
  readonly committed_at: Timestamp
  readonly write_set_fingerprint: WriteSetFingerprint
  readonly changes: readonly CommittedResourceChange[]
}

export interface CommittedOperationDraft {
  readonly schema_version: 1
  readonly operation_id: IDString
  readonly actor_id: IDString
  readonly type: 'resource.create' | 'resource.update'
  readonly affected_resources: readonly IDString[]
  readonly committed_at: Timestamp
  readonly write_set_fingerprint: WriteSetFingerprint
  readonly changes: readonly CommittedResourceChange[]
}

export interface ResourceWriteTransaction {
  stageResource(resource: ResourceSnapshot): Promise<void>
  commit(entry: CommittedOperationDraft): Promise<CommittedOperationEntry>
  abort(): Promise<void>
}

export interface ResourceStorageSession {
  readonly recovery: ResourceRecoveryReport
  listResources(): AsyncIterable<ResourceSnapshot>
  readResource(id: IDString): Promise<ResourceSnapshot | null>
  begin(operationId: IDString): Promise<ResourceWriteTransaction>
  readCommittedOperationsAfter(
    cursor: JournalSequence | null,
  ): AsyncIterable<CommittedOperationEntry>
  release(): Promise<void>
}

interface FullResourceDriverRuntime {
  readonly mode: 'full'
  open(): Promise<void>
  close(): Promise<void>
  acquireStorageSession(signal?: AbortSignal): Promise<ResourceStorageSession>
}
```

Contract rules:

1. `acquireStorageSession` утримує один exclusive storage-level lease до `release` і не resolve-иться, доки driver-private recovery не завершилася або не повернула integrity failure.
2. Session reads/scans/journal бачать один recovery-clean committed view; startup тримає session протягом recovery, greedy scan, index build і journal-head capture.
3. `stageResource` не змінює committed visibility.
4. `commit` під storage lease призначає наступний sequence і фіксує staged metadata + рівно один entry як один semantic commit.
5. Resolve означає committed; reject означає not committed. Driver не повертає ambiguous expected result.
6. `operation_id` unique. Core обчислює `write_set_fingerprint` як SHA-256 canonical JSON serialization повного ordered staged write-set, включно з усіма Resource snapshot fields. Повторний internal commit того самого ID повертає existing committed entry лише коли всі draft fields і fingerprint збігаються; mismatch draft/fingerprint або staged content, що не відповідає fingerprint, є integrity failure.
7. `abort` idempotent і required у pre-commit cleanup; після committed resolve він є no-op.
8. Sequence є canonical positive decimal string; numeric comparison виконується length + lexical comparison, не Timestamp і не JS `number`. P3 journal починається з `1`, allocation contiguous і gap-free; compaction/deletion не підтримуються.
9. Baseline durable journal містить тільки committed entries. Started/failed/rolled-back є runtime diagnostics або driver-private staging records.
10. `changes` містить logical reload hints, а не duplicated full Resource snapshot; fingerprint доводить idempotency identity без перетворення journal на metadata source of truth.

Canonical serialization використовує fixed schema order, UTF-8, JSON primitive encoding, sorted object keys для records і array order для arrays/write-set. Driver повторно обчислює або перевіряє fingerprint staged data перед commit; Core-provided string не є trusted proof сам по собі.

## 8. Operation plan, identity і scope

```ts
interface ResourceOperationPlan {
  readonly operation_id: IDString
  readonly actor_id: IDString
  readonly type: 'resource.create' | 'resource.update'
  readonly affected_resources: readonly IDString[]
  readonly lock_keys: readonly string[]
}
```

- Operation ID генерується один раз на admitted command і використовується для scope, staging та journal uniqueness.
- Actor ID є internal UUID v4 identity runtime instance; public actor config deferred до sync gate.
- ID generator і clock є injected internal capabilities для deterministic tests; public API їх не експонує.
- Scope містить operation/actor ID, abort signal, diagnostics і майбутній warning collector, але не durable data або hidden command payload.
- Public idempotency key не входить у P3. Internal commit retry idempotent за operation ID; повторний application command після втраченої відповіді не має promised deduplication і це explicit experimental limitation.

## 9. Locks, intake і shutdown

- Facade intake lease лишається outer application admission boundary.
- Operation Engine має власний close-and-drain gate для майбутніх internal consumers.
- Local lock request атомарно захоплює всі unique normalized keys у lexical order.
- Create використовує `resource:<generated-id>`; update — `resource:<id>`.
- Queue зберігає FIFO між conflicting requests; non-conflicting request може виконуватися паралельно до storage session acquisition.
- Storage session серіалізує commit-critical portion глобально для одного storage.
- Cancellation діє під час local/storage lock wait і до transaction staging. Після початку commit cancellation не змінює outcome.
- P3 public API не задає timeout. Stop закриває facade й engine intake, не force-cancel-ить admitted operations, чекає natural drain, після чого recovery/index/driver lifecycle cleanup продовжується.
- Lock/session/transaction/scope cleanup виконується `finally`; release/abort failures потрапляють у safe diagnostics і можуть fail-close runtime, але не переписують committed outcome.

## 10. Public create/update contract

Phase 2 `ExtensiaResult` shape не змінюється. Driver/config і commands мають compatibility label `experimental-phase-3`; root stable-candidate reads/lifecycle не розширюють promise.

```ts
type ExtensiaErrorCode =
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

interface ExtensiaConfig {
  readonly storage: {
    readonly driver: ReadonlyResourceDriver | FullResourceDriver
  }
}

interface CreateResourceInput {
  readonly title: string
  readonly description?: string | null
}

interface UpdateResourceInput {
  readonly title?: string
  readonly description?: string | null
}

type ResourceWriteWarningCode =
  | 'LOCAL_INDEX_PUBLICATION_FAILED'
  | 'POST_COMMIT_CLEANUP_FAILED'

interface ResourceWriteWarning {
  readonly code: ResourceWriteWarningCode
  readonly message: string
}

interface ResourceWriteSuccess {
  readonly committed: true
  readonly operation_id: IDString
  readonly resource: ResourceSnapshot
  readonly warnings: readonly ResourceWriteWarning[]
}

type ResourceWriteError =
  | ExtensiaError<'MODULE_NOT_READY'>
  | ExtensiaError<'INVALID_RESOURCE_ID'>
  | ExtensiaError<'STORAGE_READONLY'>
  | ExtensiaError<'RESOURCE_INPUT_INVALID'>
  | ExtensiaError<'RESOURCE_NOT_FOUND'>
  | ExtensiaError<'RESOURCE_NO_CHANGES'>
  | ExtensiaError<'RESOURCE_ID_GENERATION_FAILED'>
  | ExtensiaError<'STORAGE_LOCK_FAILED'>
  | ExtensiaError<'STORAGE_WRITE_FAILED'>

interface StorageFacade {
  createResource(
    input: CreateResourceInput,
  ): Promise<ExtensiaResult<ResourceWriteSuccess, ResourceWriteError>>

  updateResource(
    id: string,
    patch: UpdateResourceInput,
  ): Promise<ExtensiaResult<ResourceWriteSuccess, ResourceWriteError>>
}
```

Phase 3 root type snapshot розширює `ExtensiaErrorCode` рівно codes із `ResourceWriteError`, `ResourceWriteWarningCode`, `ResourceWriteWarning`, `ResourceWriteSuccess`, create/update inputs і opaque full-driver handle. `ExtensiaConfig.storage.driver` стає union `ReadonlyResourceDriver | FullResourceDriver`; readonly interface і runtime behavior не змінюються.

Public config не приймає callable runtime driver/session object. Full driver входить як opaque handle:

```ts
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
```

`defineFullResourceDriver` snapshot-ить callbacks у private WeakMap і повертає frozen opaque handle без `open`, `close`, session, transaction або unwrap methods. Лише internal Storage Driver Adapter має private resolver до captured definition. Звичайне application code отримує від driver package opaque handle й не має type/runtime-supported direct commit path; driver-author definition є окремою `experimental-driver-author` compatibility boundary. Trusted code, яке саме реалізує driver і зберігає власний definition object, фізично може змінювати власне storage, але це не supported Extensia application API й не обхід, який надає facade/config handle.

Root runtime values у P3: existing `createExtensia` (`public-stable-candidate`) і `defineFullResourceDriver` (`experimental-driver-author`). Session/transaction runtime objects ніколи не повертаються root factory, Module, facade або configured opaque handle.

Construction зберігає ADR-0007 descriptor-safe capture без method calls. `start()` revalidate-ить readonly `open/close/listResources` як раніше; full handle перевіряється private brand/WeakMap membership і resolve-иться лише internal adapter. Full definition/session/transaction return shapes перевіряються adapter-ом на runtime boundary до використання, а mismatch нормалізується як startup/operation driver failure без raw object leakage. Recovery report counts є non-negative safe integers.

Input rules:

- exact own data properties only; accessors, arrays, null, inherited payload fields і unknown keys відхиляються;
- readonly capability check перед inspection input зберігає Phase 2 `STORAGE_READONLY` behavior;
- `title` є string із `trim().length > 0`; значення не trim-иться і не normalizе-иться;
- `description` є string або `null`; omitted create description стає `null`;
- update patch має містити хоча б одну allowed own data property;
- effective no-change patch повертає `RESOURCE_NO_CHANGES` і не створює transaction/journal entry;
- create не приймає ID, timestamps, parent/order, flags, assets, marks або KV;
- update не приймає parent/order/flags/aggregate children.

Generated create snapshot:

```text
id = ID generator UUID v4
created_at = updated_at = operation clock
locked = false
hidden = false
is_deleted = false
parent_id = null
order_index = 0
assets = []
marks = []
kv = {}
```

Update змінює тільки provided `title`/`description`; `updated_at` береться з validated operation clock. Timestamp не є total order і journal ordering ним не визначається.

Expected public codes bounded P3:

- `MODULE_NOT_READY`;
- `INVALID_RESOURCE_ID` для update raw ID;
- `STORAGE_READONLY` до input inspection;
- `RESOURCE_INPUT_INVALID`;
- `RESOURCE_NOT_FOUND`;
- `RESOURCE_NO_CHANGES`;
- `RESOURCE_ID_GENERATION_FAILED`;
- `STORAGE_LOCK_FAILED`;
- `STORAGE_WRITE_FAILED`.

ID collision після generated create ID обробляється максимум трьома candidates/attempts total до transaction; collision третього candidate повертає `RESOURCE_ID_GENERATION_FAILED` без mutation. Driver/integrity/recovery ambiguity не маскується generic success.

Normal success містить detached committed Resource, operation ID і empty warnings. Після committed resolve жодна наступна internal failure не перетворює result на failure або throw: current command resolve-иться `ok(ResourceWriteSuccess)` із відповідним warning. Це запобігає unsafe retry committed operation.

## 11. Create pipeline

```text
facade lease
→ engine lease
→ capability check (readonly fails before input inspection)
→ descriptor-safe input parse/validate
→ generate Resource ID, operation ID, actor/time
→ build plan and prepared initial snapshot
→ acquire local resource lock
→ acquire storage write session
→ verify generated ID absent in committed storage
→ prepare validated immutable index delta against current local index state
→ begin transaction
→ stage Resource snapshot
→ compute/verify full staged write-set fingerprint
→ commit draft; driver returns sequence-bearing committed entry
→ publish prepared index delta synchronously
→ release transaction/session/local locks/scope
→ return committed ResourceWriteSuccess
```

ID absence перевіряється під storage session. Collision не починає transaction: Core release-ить storage session, потім old local lock, генерує новий candidate/lock plan і повторює весь attempt у тому самому operation scope/operation ID. Новий local lock ніколи не захоплюється під storage session. Budget — at most three candidates/attempts total; collision третього candidate одразу повертає `RESOURCE_ID_GENERATION_FAILED`.

## 12. Update pipeline

```text
facade lease
→ engine lease
→ capability check
→ parse raw ID and patch
→ acquire local resource lock
→ acquire storage write session
→ load latest committed Resource from driver
→ not found / no effective changes fail before transaction
→ build validated next snapshot and prepared index delta
→ begin, stage, semantic commit
→ publish prepared index delta
→ cleanup
→ return committed ResourceWriteSuccess
```

Current committed state завжди reload-иться під storage session; Hot Index не є write authority.

## 13. Atomic index publication

Index extension має надати internal two-phase API:

```ts
interface PreparedResourceIndexChange {
  readonly resource: ResourceSnapshot
  publish(): void
}

interface MutableGreedyResourceIndex extends GreedyResourceIndex {
  prepareUpsert(resource: ResourceSnapshot): PreparedResourceIndexChange
}
```

`prepareUpsert` викликається під storage session після latest committed-state load, clone-ить current maps, валідує ID/tree/derived children і створює detached next state до durable commit. Global storage session лишається утриманою до `publish()`, тому інша local operation не може commit/publish між prepare і swap. `publish()` виконує only-once synchronous swap prepared maps; воно не виконує I/O, async hooks або domain validation. Publish до committed resolve заборонений.

Unexpected publish contract violation після commit:

- committed storage/journal не rollback-яться;
- Operation Engine atomically закриває власний intake, сигналізує Runtime Fault Controller, а Extensia Module unpublish-ить facades і переходить `started -> failed`; нові/stale calls повертають `MODULE_NOT_READY`;
- safe diagnostic містить code/stage/operation ID без snapshot/driver leakage;
- in-flight command повертає committed `ok(ResourceWriteSuccess)` із detached staged Resource та warning `LOCAL_INDEX_PUBLICATION_FAILED`; ordinary normalized `STORAGE_WRITE_FAILED` або throw не повертається як твердження про rollback;
- `stop()` у `failed` виконує at-most-once host cleanup/driver close, зберігає safe diagnostics і переходить у `stopped`; restart не дозволений чинним lifecycle contract;
- це programming fault, який P3-STAB має зробити practically unreachable executable tests.

P3 warning catalog bounded лише двома post-commit infrastructure warnings і не є public hook framework. `POST_COMMIT_CLEANUP_FAILED` так само зберігає committed success і fail-close, якщо session/lock cleanup не можна довести safe. P6 окремо вирішує hook warnings. Для normal P3 path warnings empty, publish/cleanup no-fail.

## 14. Journal і recovery

### Committed-only journal

Baseline persistent journal містить лише committed entries. Reasons:

- External Sync потребує тільки committed facts;
- started/failed phases не повинні споживати global sequence або створювати false publication;
- physical incomplete state краще описує driver-private staging manifest;
- public Journal format не зв'язується з diagnostics framework.

Sequence/cursor rules:

- first committed sequence — `1`; кожний наступний committed entry має exactly previous + 1;
- `readCommittedOperationsAfter(null)` повертає всі entries від `1` у ascending contiguous order;
- cursor, що дорівнює existing sequence, повертає entries strictly after it; head cursor повертає empty stream;
- cursor > head, non-canonical cursor або cursor усередині `1..head`, для якого entry відсутній, є integrity/cursor failure;
- будь-який gap, duplicate або regression у stored/read stream є integrity failure й блокує ready; compaction/retention не входять у P3.

### Startup order full mode

```text
driver.open
→ acquire exclusive storage session; recovery completes before resolve
→ scan committed Resource snapshots through the same session
→ build greedy index and capture journal head/cursor under the session
→ release session
→ continue lifecycle
→ freeze/publish facades ready
```

Readonly mode зберігає Phase 2 flow без write recovery.

### Recovery rules

| Durable observation | Recovery action | Ready result |
|---|---|---|
| Немає staging, committed state валідний | Session acquisition returns clean view | ready allowed |
| Staging є, committed entry відсутній | Rollback/delete staging | ready after proof |
| Committed entry є, final metadata потребує driver finalization | Complete finalization, validate | ready after proof |
| Staging cleanup failure, committed state still unambiguous | Retry bounded; далі fail startup | no ready on unresolved cleanup |
| Duplicate operation ID з різними payloads | Integrity failure | startup failed |
| Non-canonical/duplicate/regressing/gapped sequence або unknown cursor | Journal integrity failure | startup failed |
| Entry посилається на missing/corrupt committed Resource | Integrity failure | startup failed |
| Unknown artifact без safe ownership proof | Не видаляти автоматично | startup failed |

Recovery report є safe internal data: counts/codes, без paths, content або credentials.

## 15. Failure-cut matrix

| Cut point | Committed state | Journal | Index | Public/lifecycle effect |
|---|---|---|---|---|
| До facade/engine admission | old | unchanged | old | `MODULE_NOT_READY`/canceled |
| Readonly capability check | old | unchanged | old | `STORAGE_READONLY`, input uninspected |
| Input/ID/plan validation | old | unchanged | old | normalized validation failure |
| Local lock wait/acquire failure | old | unchanged | old | lock failure/cancel |
| Storage session acquire failure | old | unchanged | old | `STORAGE_LOCK_FAILED` |
| Current-state load failure | old | unchanged | old | `STORAGE_WRITE_FAILED` |
| Index-delta preparation failure | old | unchanged | old | validation/programming failure before transaction |
| Begin/stage failure | old | unchanged | old | abort + write failure |
| Commit rejects | old | unchanged | old | abort + write failure; rejection guarantees not committed |
| Commit resolves | new | exactly one committed entry | old until immediate publish | operation is irrevocably committed |
| Crash після commit до index publish | new/recoverable | committed | process-local lost/stale | restart recovery + rebuild yields new |
| Index publish unexpected fault | new | committed | invalid/stale | committed success + `LOCAL_INDEX_PUBLICATION_FAILED`; module failed/unpublished |
| Cleanup failure після commit | new | committed | new/unknown-local health | committed success + `POST_COMMIT_CLEANUP_FAILED`; diagnostic/fail-close |
| Response delivery lost після success | new | committed | new | public deduplication not promised in P3 |

## 16. Concurrency properties

- Local overlapping Resource operations are linearized by conflicting keys.
- Non-overlapping validation/preparation may proceed concurrently, але committed order визначає storage session/journal sequence.
- Update reloads current committed Resource after storage lock, тому queued operations не overwrite-ять stale index snapshot.
- Journal sequence, not Timestamp, defines total committed order.
- One process cannot publish index ahead of its committed sequence.
- Multi-process index refresh лишається Phase 5; Phase 3 гарантує лише local read-after-write current runtime.

## 17. Deterministic fake contract

Fake є contract-faithful full driver, не concrete durability proof. Він має:

- isolated per-instance storage state і optional shared backing state для multi-session ordering tests;
- deterministic ID/clock/sequence injection;
- explicit cut-point failure plan без patching production runtime;
- private staging manifests й committed-only journal;
- exclusive recovery-clean storage sessions, coherent startup scan, outcome-definite commit і idempotent operation ID;
- crash simulation, яка відкидає process-local state, зберігає configured durable observations і запускає fresh composition/recovery;
- safe inspection тільки для tests через test-owned fixture API, не package/Core contract;
- contract suite reusable для Phase 4 driver, але fake helpers не стають public durability claim.

## 18. Task-ready decomposition

### BP3-01A — materialize shared write protocol seam

- Type/mode: `chore / autonomous-implementation`.
- Scope: exact internal source modules для driver/session/transaction/journal entries, Core create/update request/result port, operation identity/clock tokens та index prepared-change interface; no runtime behavior.
- Acceptance: one semantic owner per seam; strict compile/type tests; no root/subpath export; no duplicate test-only contract.
- Dependencies: approved BP3-01 result + approved/applied FIX-001 stable artifact.

### BP3-02 / P3-WP1 — locks, scopes й Operation Engine skeleton

- Type/mode: `feature / autonomous-implementation`.
- Scope: engine intake, atomic multi-key queue, deterministic ordering, cancellation-before-commit, scope lifecycle, pipeline state machine and safe failures; use protocol seams, no fake persistence implementation.
- Acceptance: conflicting FIFO, non-conflicting progress, close/drain, all cleanup paths, no global context, no public API expansion.
- Dependencies: done BP3-01A.
- Parallel: BP3-03 after shared seam.

### BP3-03 / P3-WP2 — deterministic full fake/journal/recovery

- Type/mode: `feature / autonomous-implementation`.
- Scope: full driver adapter/runtime module, fake session/transaction, committed-only journal, recovery coordinator and startup order; no Resource public success.
- Acceptance: every cut point, outcome-definite commit, sequence/idempotency/integrity, crash/fresh-composition recovery, readonly/full capability contract.
- Dependencies: done BP3-01A.
- Parallel: BP3-02, із disjoint source ownership.

### BP3-04 / P3-VS1 — create Resource

- Type/mode: `feature / autonomous-implementation`.
- Scope: exact public input/errors, create handler, prepared index upsert, system storage facade adapter, packed create/read-back on fake.
- Acceptance: readonly before inspection, generated defaults, exactly one commit, post-commit index, crash recovery, detached result, no P3-DG2 fields.
- Dependencies: done BP3-02 and BP3-03.

### BP3-05 / P3-VS2 — update Resource

- Type/mode: `feature / autonomous-implementation`.
- Scope: title/description patch, load-under-storage-lock, no-change behavior, same pipeline, packed update/read-back.
- Acceptance: missing/invalid/no-change, serialized concurrent updates, exactly one commit per effective change, recovery and detached read-back.
- Dependencies: done BP3-04.

### Після P3-VS2

- Окремий risk-based stabilization create/update foundation перед P3-DG2.
- P3-DG2 design task для hierarchy/order, Mark/KV, delete/restore.
- Жодна follow-up task не активується approval BP3-01 автоматично.

## 19. Verification matrix

| Concern | Design evidence | Implementation gate |
|---|---|---|
| Atomicity | one semantic transaction commit | failure injection every cut |
| Consistency | next snapshot + prepared index delta before commit | validators/property matrices |
| Isolation | local keys + global session + sequence | deterministic concurrent schedules |
| Durability semantics | committed entry in transaction | fake crash/recovery; concrete proof deferred P4 |
| Readonly | capability before input inspection | accessor/spy negative tests |
| Lifecycle | recovery before ready, close/drain | startup/stop failure matrices |
| API | exact create/update and errors | strict type/API/packed consumer snapshot |
| Encapsulation | consumer-owned ports, private driver transaction | export/source dependency probes |
| Memory | FIX-only canonical proposal | upward consistency/language/index audit |

## 20. Architecture pressure

Pressure лишається критичним, але proposal його локалізує:

- один commit path замість metadata/journal dual-write;
- один consumer-owned Core write seam;
- driver transaction приховує layout;
- index prepare/publish не стає storage authority;
- public API не отримує generic execute, raw transactions або IoC;
- root-only create/update обмежують P3-DG2 leakage;
- hooks/sync/concrete durability не симулюються fake implementation.

Stop conditions: independent journal append path, facade direct driver access, post-commit domain validation, index write before commit, callable raw transaction/session через application config/facade/Module, test-only operation engine або concrete filesystem assumptions. Opaque full-driver handle і окрема experimental driver-author definition boundary дозволені.

## 21. Risks і explicit limitations

- Physical driver може не реалізувати outcome-definite semantic commit; це P4-DG1 blocker, а не причина послаблювати P3 contract.
- Public idempotency/deduplication не підтримується; create retry після lost response може створити інший Resource.
- Title/description limits, Unicode normalization і schema versioning лишаються experimental/release gates; P3 фіксує лише bounded structural validation.
- Runtime fail-close transition після unexpected post-commit index fault потребує implementation design у BP3-02/04; ordinary path має зробити його unreachable.
- Actor identity є runtime-local UUID до Phase 5 sync contract.
- Full driver interface є experimental Phase 3 і може змінитися в P4-DG1.

## 22. Memory fixation proposal

FIX-001 має запропонувати:

- новий `technical/write-journal-recovery-contract.md`;
- ADR-0008 про driver transaction semantic commit і committed-only journal;
- bounded updates technical architecture/rules/open questions;
- bounded domain create/update defaults/validation notes;
- roadmap/state/progress/task preparation лише після окремої application;
- prepared BP3-01A/BP3-02…05 task contracts без activation.

Accepted requirements і ADR-0005 semantics не змінюються. Production code/current implementation не змінюються research task.

## 23. Подальші дії

1. Independent architecture/protocol і memory/workflow audit цього report, RSCH-001 та FIX-001.
2. Закрити material findings і перевести BP3-01 у review.
3. Human review research result окремо від fixation approval.
4. Лише після fixation approval — окрема owner `interactive-memory-update` application task.
5. Implementation task activation починається не раніше stable application artifact і окремого user decision.
