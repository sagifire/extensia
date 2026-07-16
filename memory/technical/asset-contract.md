# Asset semantic contract

Status: accepted target contract
Accepted: 2026-07-15
Authority: P4-DG2 / TASK-07.26-0040 / approved FIX-001
Compatibility: `experimental-phase-4`
Detailed Design: [Exact Asset semantic contract](../reports/research/2026-07-15-extensia-asset-contracts.md)

## 1. Рішення в одному абзаці

Asset лишається частиною aggregate snapshot owning Resource і має global UUID v4 identity, exact bounded metadata, same-Resource acyclic `derived_from`, explicit primary selection та staged-only initial internal lifecycle. External URL канонізується WHATWG parser-ом і обмежується `http:`/`https:` без credentials. `Asset.data` вимірюється canonical sorted-key UTF-8 JSON із depth/node/container/string/byte limits. Asset metadata, owning Resource timestamps, payload-state transition і рівно один journal entry commit-яться однією semantic operation; no-change/failure не відкривають transaction. Physical layout, bytes transport і staging mechanism лишаються P4-DG1/P4-VS3 owners.

## 2. Межа й терміни

- `active Resource` — Resource з `is_deleted === false`.
- `visible Asset` — Asset active Resource; tombstoned Resource та всі його aggregates приховані default reads.
- `ready representation` — external canonical URL або internal committed payload.
- `initial-uploading` — internal Asset із `is_on_uploading = true`, для якого ще немає committed payload.
- `ready` — internal Asset із `is_on_uploading = false` і рівно одним committed payload generation.
- `replacement-uploading` — internal Asset із `is_on_uploading = true`, старий committed payload лишається readable, а новий generation staged і невидимий.
- `effective transition` — наступний aggregate/file state відрізняється від latest committed state.

Public `AssetSnapshot` shape не розширюється. Різниця `initial-uploading`/`replacement-uploading`, upload generation та staging identity є internal durable state, не DTO і не public path/token.

## 3. Alternatives і rationale

| Тема | Прийнято | Відхилено / відкладено | Причина |
|---|---|---|---|
| Classifier strings | exact case-sensitive, без trim/normalization | silent trim/case fold | Вільні domain labels не мають прихованої equivalence. |
| MIME | lowercase essence без parameters | довільний string; parameterized MIME | Дає table-testable canonical value без content negotiation semantics. |
| Extension | lowercase ASCII token без leading dot | path suffix або case-preserving form | Не допускає path leakage та ambiguous equality. |
| URL | canonical WHATWG `http/https`, no credentials | довільна URI; `file:`, `data:`, credentials | External Asset не стає локальним path/security bypass. |
| Lineage | existing ready target того самого Resource, acyclic | cross-Resource weak links; dangling links | Локалізує lock/write-set і future indexing; integrity не залежить від чужого aggregate lifecycle. |
| Primary | explicit set/clear; delete leaves none | implicit auto-promotion; create auto-demotes | Приховані aggregate mutations і order-dependent winner заборонені. |
| Reassignment | atomic two-Resource move, lineage-free, non-primary | implicit lineage rewrite або primary transfer | Exact bounded write-set без cascading semantics. |
| Initial internal | staged-only | atomic ready-file create | Не стабілізує bytes transport і не створює альтернативний publication path. |
| Replacement | old payload readable до finish | hide old payload; publish staged bytes | Зберігає last committed visibility. |
| Data limit | canonical UTF-8 JSON envelope | лише JS object count; schema version у P4 | Однакова поведінка adapters/drivers; schema evolution лишається P7. |

## 4. Exact field contract

### 4.1 Descriptor-safe input

Кожен command input і patch є ordinary або null-prototype object з exact own enumerable data properties. Arrays, accessors, inherited/unknown/non-enumerable/symbol properties відхиляються. Readonly capability check передує будь-якому inspection input.

### 4.2 Scalar table

| Field | Accepted canonical value | Input normalization | Limit / failure | Equality |
|---|---|---|---|---|
| `id` | lowercase UUID v4 | existing `parseIDString` lowercases mixed case | generated internally; invalid raw lookup → `INVALID_ASSET_ID` | canonical string |
| `type` | string, `trim().length > 0` | none; original code units retained | `1..128` UTF-16 code units → `ASSET_INPUT_INVALID` | exact code units |
| `role` | same as `type` | none | `1..128` UTF-16 code units | exact code units |
| `mime` | `null` або lowercase ASCII `type/subtype` | none | `1..255`; regex `^[a-z0-9][a-z0-9!#$&^_.+-]*/[a-z0-9][a-z0-9!#$&^_.+-]*$`; parameters/space invalid | exact |
| `extension` | `null` або lowercase ASCII token без `.` prefix | none | `1..32`; regex `^[a-z0-9][a-z0-9_+-]*$` | exact |
| `url` external | canonical WHATWG URL string | `new URL(raw).href` | raw `1..4096`, canonical `<=4096` UTF-16 code units; only `http:`/`https:`; username/password empty; parse failure → `ASSET_URL_INVALID` | canonical href |
| `url` internal | exact `null` | none | non-null invalid | exact |
| `derived_from` | canonical UUID v4 або `null` | lowercase UUID parse | relation checks below | canonical string/null |
| `data` | detached JSON object або `null` | recursive clone; object keys sorted only for measure/fingerprint, not observable insertion order | bounded algorithm below | structural JSON equality, object-key-order insensitive, array-order sensitive |

`mime` не виводиться з `extension`, `extension` не виводиться з URL, а жодне з полів не перевіряється network/filesystem access-ом. `type`, `role`, `mime` і `extension` не мають registry semantics у `0.1.0`.

### 4.3 Canonical URL algorithm

1. Перевірити raw value як string довжини `1..4096` code units.
2. Побудувати `URL` через Node.js 24 WHATWG `new URL(raw)` без base URL.
3. Вимагати protocol `http:` або `https:` і порожні `username`/`password`.
4. Взяти `url.href`; вимагати довжину `<=4096` code units.
5. Зберегти exact `href`. Fragment і query дозволені та є частиною identity/equality; default ports, host case і percent encoding канонізує WHATWG implementation.

Зміна Node major або URL canonicalization behavior потребує compatibility test у P7. Runtime не dereference-ить URL під час validation.

### 4.4 `Asset.data` limits і measure

Accepted object має пройти чинний JSON-safe descriptor validator, а потім усі limits:

- root — object, не array; `null` окремо дозволений;
- maximum nesting depth `16`, де root object має depth `1`, а child container — parent + 1;
- maximum total value nodes `4096`, включно з root, кожним container і primitive/null; object keys не є nodes;
- maximum own keys одного object `256`;
- maximum length одного array `1024`;
- maximum object-key length `128` UTF-16 code units; empty key дозволений;
- maximum string value length `16_384` UTF-16 code units;
- maximum canonical encoded size `65_536` bytes.

Canonical measure/fingerprint serialization рекурсивно сортує object keys binary ECMAScript ascending, зберігає array order, використовує JSON primitive encoding і UTF-8 bytes `TextEncoder`. Non-finite numbers, sparse/accessor arrays, cycles, exotic prototypes, symbols і `undefined` invalid до measure. Перевищення будь-якого limit → `ASSET_DATA_INVALID`; schema versioning/migration не вводиться до P7-WP1.

## 5. Aggregate invariants

### 5.1 Ownership та storage-wide identity

1. Asset існує рівно в одному `ResourceSnapshot.assets`.
2. Asset IDs globally unique в storage, не лише в aggregate.
3. Persisted assets у кожному Resource canonical sorted binary ascending by lowercase Asset ID; array position не має domain semantics.
4. Asset command потребує active owner. Missing/tombstoned owner → `RESOURCE_NOT_FOUND` без disclosure tombstone.
5. Resource soft delete не змінює Assets, primary або lineage; aggregate зберігається у tombstone й default-hidden. Restore/cascade/purge лишаються deferred.
6. `deleteResource` відхиляється до mutation з `RESOURCE_ASSET_UPLOAD_ACTIVE`, якщо aggregate містить хоча б один internal Asset з active upload generation (`is_on_uploading = true`). Caller має finish/abort/delete такий Asset до Resource delete. Це additive Phase 4 refinement leaf-delete contract: воно не cascade-ить і не залишає unreachable staging.

### 5.2 Lineage

`derived_from`, якщо не `null`, повинен:

- посилатися на інший Asset того самого active Resource;
- не бути self-link;
- посилатися на Asset із ready representation: external або internal `ready`/`replacement-uploading`, але не `initial-uploading`;
- не створювати directed cycle.

Cross-Resource lineage hard-invalid. Delete target із direct/transitive dependents повертає `ASSET_HAS_DERIVATIVES`; автоматичне clear/cascade заборонене. Reassign Asset дозволений лише коли його `derived_from = null` і на нього ніхто не посилається; інакше `ASSET_LINEAGE_CONFLICT`. Startup/recovery знаходить self/cross-resource/dangling/cycle/not-ready-target relation як `ASSET_STORAGE_INTEGRITY`, не normalizes/repairs.

### 5.3 Primary

- Не більше одного primary у Resource.
- `setPrimaryAsset(resourceId, assetId)` явно demote-ить current primary і promote-ить target одним commit.
- `setPrimaryAsset(resourceId, null)` явно clear-ить primary.
- Repeating already selected/cleared state → `ASSET_NO_CHANGES`.
- Initial-uploading internal Asset не може бути primary → `ASSET_NOT_READY`; replacement-uploading із старим committed payload може лишатися/стати primary.
- Create з `is_primary = true` дозволений external Asset; internal create вимагає false. Existing primary при create → `ASSET_PRIMARY_CONFLICT`; ніхто implicit не demote-иться.
- Delete primary лишає Resource без primary; auto-promotion відсутня.
- Reassign завжди переносить Asset як `is_primary = false`; source може лишитися без primary, destination primary не змінюється.

### 5.4 Reassignment

`reassignAsset(sourceResourceId, assetId, destinationResourceId)` є atomic two-aggregate operation:

- обидва Resources існують і active;
- source і destination різні; same ID → `ASSET_NO_CHANGES`;
- Asset не має incoming/outgoing lineage;
- internal Asset не має active upload generation (`is_on_uploading = false`); external завжди eligible;
- Asset вилучається із source, додається canonical-sorted у destination, `is_primary` стає false;
- physical internal payload ownership лишається за logical Asset ID і не copy/move-иться public/Core path-ом.

## 6. Lifecycle state machine

| State | Public snapshot | Ready representation | Allowed transitions |
|---|---|---|---|
| absent | no Asset | no | create external → external-ready; create internal → initial-uploading |
| external-ready | `external=true`, `url!=null`, `uploading=false` | canonical URL | metadata update, primary set/clear, reassign, delete |
| initial-uploading | `external=false`, `url=null`, `uploading=true` | no | metadata update, finish → ready, abort → absent, delete → absent |
| ready | `external=false`, `url=null`, `uploading=false` | committed payload | metadata update, begin replacement, primary, reassign, delete |
| replacement-uploading | `external=false`, `url=null`, `uploading=true` | previous committed payload | metadata update, finish → ready(new), abort → ready(old), delete → absent |

Kind conversion internal↔external заборонена; caller створює інший Asset і explicit змінює primary/lineage/delete.

### 6.1 Initial internal policy

`createAsset(kind: 'internal')` одним metadata commit створює initial-uploading Asset та internal upload generation, але не ready file. Atomic ready-file creation відхилено для `0.1.0`. Public Asset metadata visible одразу з `is_on_uploading=true`; file read повертає `ASSET_FILE_NOT_READY`. Staged/incomplete bytes ніколи не visible.

### 6.2 Replacement policy

`asset.upload.begin` для ready internal Asset створює new upload generation і змінює flag на true. Старий committed payload лишається readable до successful finish. Finish атомарно publish-ить staged generation, видаляє/retire-ить old generation у тій самій driver transaction і встановлює flag false. Abort відкидає staging та повертає old ready state. Physical cleanup/recovery mechanism належить driver profile.

### 6.3 Retry/idempotency

- Кожен begin/create internal отримує internal UUID v4 `upload_id`; він не входить у `AssetSnapshot`.
- Upload-facing internal request містить exact `asset_id`, `upload_id` і operation ID.
- Same operation ID + identical draft/fingerprint використовує чинну driver idempotency й повертає existing committed result.
- Інший begin при active generation → `ASSET_UPLOAD_ALREADY_ACTIVE`.
- Finish/abort з unknown або stale generation → `ASSET_UPLOAD_NOT_ACTIVE`.
- Finish перевіряє driver-declared staged generation complete до semantic transaction; incomplete → `ASSET_UPLOAD_INCOMPLETE`, no metadata/journal change.
- Abort initial видаляє Asset metadata; abort replacement відновлює flag false без зміни old payload.
- Crash before commit не змінює visible state; crash after commit відновлює exact committed state до ready.

Transport, chunk API, streaming, hashing/deduplication, antivirus/transcoding і signed URL не визначаються. P4-VS3 materialize-ить internal Core↔driver upload port; ordinary application API для передачі bytes потребує окремого bounded design у межах P4-VS3 і не може розкрити path/session/transaction.

### 6.4 Exhaustive transition/payload matrix

Logical payload action є discriminated internal value:

```ts
type AssetPayloadAction =
  | { readonly kind: 'none' }
  | { readonly kind: 'generation.create'; readonly upload_id: IDString }
  | { readonly kind: 'generation.publish'; readonly upload_id: IDString; readonly replaces_committed: boolean }
  | { readonly kind: 'generation.discard'; readonly upload_id: IDString }
  | { readonly kind: 'payload.delete' }
  | { readonly kind: 'payload.delete-and-generation.discard'; readonly upload_id: IDString }
```

`generation.publish(replaces_committed=true)` атомарно робить new generation committed і retire/delete-ить previous committed payload; це одна compound driver action. `payload.delete-and-generation.discard` атомарно видаляє old committed payload та active staged generation. Driver не може розкласти compound action на окремі visible commits.

| Command / source | Preconditions | Next / result Asset | Payload + generation mutation | Prepared Resources / timestamps | Visibility, journal і recovery |
|---|---|---|---|---|---|
| create external / absent | active owner, valid input/lineage, unique ID, primary rule | external-ready / created Asset | `none`; no generation | owner; Asset create/update=T, Resource update=T | URL visible after `asset.create` commit; pre-commit none, post-commit recovered external-ready |
| create internal / absent | active owner, valid input/lineage, unique ID, `is_primary=false` | initial-uploading / created Asset | `generation.create(new upload_id)` active-initial | owner; Asset create/update=T, Resource update=T | metadata flag visible after one `asset.create`; no payload readable; pre-commit no generation, post-commit generation recoverable |
| update / any existing state | kind-specific patch valid; effective | same lifecycle / updated Asset | `none`; generation unchanged | owner; target Asset update=T, Resource update=T | one `asset.update`; payload/file visibility unchanged |
| set/clear primary / eligible state | explicit target ready-representation; effective | same lifecycle / selected target or null | `none` | owner; changed old/new primary Assets update=T, Resource update=T | one `asset.primary.set`; `asset_changes`: clear=1, set with no old=1, switch old→new=2 sorted by Asset ID; file visibility unchanged |
| reassign / external-ready or ready internal | no lineage, no active generation, two active owners | same lifecycle, non-primary / moved Asset | `none`; internal payload remains keyed by Asset ID | source+destination sorted; moved Asset and both Resources update=T | one `asset.reassign`; both Resource snapshots publish atomically; payload unchanged |
| delete / external-ready | no dependents | absent / null | `none` | owner; Resource update=T | one `asset.delete`; URL metadata disappears at commit |
| delete / ready internal | no dependents | absent / null | `payload.delete` | owner; Resource update=T | metadata+committed payload disappear in one `asset.delete`; crash recovers both old or both absent |
| delete / initial-uploading | no dependents | absent / null | `generation.discard(active upload_id)` | owner; Resource update=T | metadata+staging disappear in one `asset.delete`; no orphan generation |
| delete / replacement-uploading | no dependents | absent / null | `payload.delete-and-generation.discard(active upload_id)` | owner; Resource update=T | metadata+old payload+staging disappear in one `asset.delete`; no partial visibility |
| begin / ready internal | no active generation | replacement-uploading / updated Asset + internal handle | `generation.create(new upload_id)` active-replacement | owner; Asset update=T, Resource update=T | old payload remains readable after one `asset.upload.begin`; crash recovers ready-old or replacement-active-old |
| finish / initial-uploading | matching active handle; staged generation complete | ready / updated Asset | `generation.publish(upload_id, false)`; active record becomes committed payload pointer | owner; Asset update=T, Resource update=T | payload becomes readable with flag false at one `asset.upload.finish` commit |
| finish / replacement-uploading | matching active handle; complete | ready / updated Asset | `generation.publish(upload_id, true)`; new committed, old retired | owner; Asset update=T, Resource update=T | reader sees old before commit/new after; one `asset.upload.finish`; crash recovers exactly one committed generation |
| abort / initial-uploading | matching active handle | absent / null | `generation.discard(upload_id)` | owner; Resource update=T | metadata+staging disappear in one `asset.upload.abort` |
| abort / replacement-uploading | matching active handle | ready-old / updated Asset | `generation.discard(upload_id)` | owner; Asset update=T, Resource update=T | old payload remains readable; flag false after one `asset.upload.abort` |
| delete Resource / any uploading Asset | any `is_on_uploading=true` | failure `RESOURCE_ASSET_UPLOAD_ACTIVE` | none | none | no transaction/persisted timestamp/journal; staged/old payload unchanged |

Для кожного row capability check precedes input/state inspection. Validation/conflict/no-change, readonly, lock/load failure before transaction мають payload action `none`, no persisted timestamp bump, no journal/index change. Commit reject proves metadata/payload/generation unchanged; commit resolve publishes exactly the row's whole action and one journal entry before index swap. Post-commit local fault returns committed warning and fail-close за P3 contract.

Exact local lock mapping: owning `resource:<owner>` є complete process-local aggregate lock для update/primary/delete/begin/finish/abort, включно з primary clear і discovered old-primary mutation. Create uses `resource:<owner>` + generated `asset:<candidate>` для global candidate collision serialization. Reassign uses both sorted `resource:<source|destination>`; окремий Asset lock не потрібен, бо ownership/Asset state serialized aggregate locks. Resource delete retains existing `resource-hierarchy` + target/caller-known locks. Every set freezes before session. Prepared Resources are exactly the table column; payload action is never a reason to add a hidden Resource. File visibility changes only at the same resolved commit as metadata; post-commit index swap has no file I/O.

## 7. Public metadata command contract

Compatibility label: `experimental-phase-4`; P7-WP1 вирішує release freeze.

```ts
type ExtensiaErrorCode =
  | 'CONFIG_INVALID' | 'MODULE_BUSY' | 'MODULE_INVALID_STATE'
  | 'MODULE_NOT_READY' | 'START_FAILED' | 'STOP_FAILED'
  | 'INVALID_RESOURCE_ID' | 'RESOURCE_NOT_FOUND' | 'STORAGE_READONLY'
  | 'RESOURCE_INPUT_INVALID' | 'RESOURCE_NO_CHANGES'
  | 'RESOURCE_ID_GENERATION_FAILED' | 'STORAGE_LOCK_FAILED'
  | 'STORAGE_WRITE_FAILED' | 'STORAGE_INTEGRITY_FAILED'
  | 'RESOURCE_PARENT_NOT_FOUND' | 'RESOURCE_MOVE_CYCLE'
  | 'RESOURCE_ORDER_OUT_OF_RANGE' | 'RESOURCE_HAS_CHILDREN'
  | 'RESOURCE_ALREADY_DELETED' | 'RESOURCE_ASSET_UPLOAD_ACTIVE'
  | 'INVALID_ASSET_ID' | 'ASSET_INPUT_INVALID' | 'ASSET_URL_INVALID'
  | 'ASSET_DATA_INVALID' | 'ASSET_NOT_FOUND' | 'ASSET_NO_CHANGES'
  | 'ASSET_ID_GENERATION_FAILED' | 'ASSET_PRIMARY_CONFLICT'
  | 'ASSET_NOT_READY' | 'ASSET_LINEAGE_INVALID'
  | 'ASSET_LINEAGE_CONFLICT' | 'ASSET_HAS_DERIVATIVES'
  | 'ASSET_UPLOAD_ALREADY_ACTIVE' | 'ASSET_UPLOAD_NOT_ACTIVE'
  | 'ASSET_UPLOAD_INCOMPLETE' | 'ASSET_FILE_NOT_READY'

type ErrorOf<TCode extends ExtensiaErrorCode> = ExtensiaError<TCode>

interface CreateAssetBaseInput {
  readonly type: string
  readonly role: string
  readonly mime: string | null
  readonly extension: string | null
  readonly derived_from?: string | null
  readonly data?: JSONObject | null
}
interface CreateExternalAssetInput extends CreateAssetBaseInput {
  readonly kind: 'external'
  readonly url: string
  readonly is_primary?: boolean
}
interface CreateInternalAssetInput extends CreateAssetBaseInput {
  readonly kind: 'internal'
  readonly is_primary?: false
}
type CreateAssetInput = CreateExternalAssetInput | CreateInternalAssetInput

interface UpdateAssetInput {
  readonly type?: string
  readonly role?: string
  readonly mime?: string | null
  readonly extension?: string | null
  readonly url?: string
  readonly derived_from?: string | null
  readonly data?: JSONObject | null
}

interface AssetWriteSuccess {
  readonly committed: true
  readonly operation_id: IDString
  readonly asset: AssetSnapshot | null
  readonly resources: readonly ResourceSnapshot[]
  readonly warnings: readonly ResourceWriteWarning[]
}

type AssetInfrastructureError =
  | ErrorOf<'MODULE_NOT_READY'> | ErrorOf<'STORAGE_READONLY'>
  | ErrorOf<'INVALID_RESOURCE_ID'> | ErrorOf<'RESOURCE_NOT_FOUND'>
  | ErrorOf<'STORAGE_LOCK_FAILED'>
  | ErrorOf<'STORAGE_WRITE_FAILED'> | ErrorOf<'STORAGE_INTEGRITY_FAILED'>
type AssetExistingError = AssetInfrastructureError
  | ErrorOf<'INVALID_ASSET_ID'> | ErrorOf<'ASSET_NOT_FOUND'>
type AssetCreateError = AssetInfrastructureError
  | ErrorOf<'INVALID_ASSET_ID'>
  | ErrorOf<'ASSET_INPUT_INVALID'> | ErrorOf<'ASSET_URL_INVALID'>
  | ErrorOf<'ASSET_DATA_INVALID'> | ErrorOf<'ASSET_ID_GENERATION_FAILED'>
  | ErrorOf<'ASSET_PRIMARY_CONFLICT'> | ErrorOf<'ASSET_LINEAGE_INVALID'>
type AssetUpdateError = AssetExistingError
  | ErrorOf<'ASSET_INPUT_INVALID'> | ErrorOf<'ASSET_URL_INVALID'>
  | ErrorOf<'ASSET_DATA_INVALID'> | ErrorOf<'ASSET_NO_CHANGES'>
  | ErrorOf<'ASSET_LINEAGE_INVALID'>
type AssetPrimaryError = AssetExistingError
  | ErrorOf<'ASSET_NO_CHANGES'> | ErrorOf<'ASSET_NOT_READY'>
type AssetReassignError = AssetExistingError
  | ErrorOf<'ASSET_NO_CHANGES'> | ErrorOf<'ASSET_LINEAGE_CONFLICT'>
  | ErrorOf<'ASSET_UPLOAD_ALREADY_ACTIVE'>
type AssetDeleteError = AssetExistingError | ErrorOf<'ASSET_HAS_DERIVATIVES'>

type AssetCreateResult = ExtensiaResult<AssetWriteSuccess, AssetCreateError>
type AssetUpdateResult = ExtensiaResult<AssetWriteSuccess, AssetUpdateError>
type AssetPrimaryResult = ExtensiaResult<AssetWriteSuccess, AssetPrimaryError>
type AssetReassignResult = ExtensiaResult<AssetWriteSuccess, AssetReassignError>
type AssetDeleteResult = ExtensiaResult<AssetWriteSuccess, AssetDeleteError>

interface StorageFacade {
  createAsset(resourceId: string, input: CreateAssetInput): Promise<AssetCreateResult>
  updateAsset(resourceId: string, assetId: string, patch: UpdateAssetInput): Promise<AssetUpdateResult>
  setPrimaryAsset(resourceId: string, assetId: string | null): Promise<AssetPrimaryResult>
  reassignAsset(sourceResourceId: string, assetId: string, destinationResourceId: string): Promise<AssetReassignResult>
  deleteAsset(resourceId: string, assetId: string): Promise<AssetDeleteResult>
}
```

`resources` містить усі effective owning aggregates sorted Resource ID; для one-owner operation — один snapshot, для reassign — source+destination. `asset` — committed target snapshot, а delete/abort-initial — `null`. Results detached/deep-readonly. Upload transition Core contracts internal у P4-VS3; вони не додаються ordinary `StorageFacade` цим gate.

`updateAsset` не змінює kind, primary або upload state. `url` allowed лише external; internal patch із `url` invalid. Empty patch invalid; canonical-equal patch → `ASSET_NO_CHANGES`.

### 7.1 Internal upload handoff

Operation Engine, а не caller, створює `operation_id`/Timestamp для кожної admitted transition. Begin handler створює `upload_id`; metadata facade його не повертає. У storage може бути лише одна active generation на Asset, тому trusted P4-VS3 transport adapter resolves handle by `(resource_id, asset_id)` після readiness/capability checks.

```ts
declare const assetUploadHandleBrand: unique symbol
interface AssetUploadHandle {
  readonly [assetUploadHandleBrand]: 'AssetUploadHandle'
  readonly resource_id: IDString
  readonly asset_id: IDString
  readonly upload_id: IDString
}
interface BeginAssetUploadRequest { readonly resource_id: IDString; readonly asset_id: IDString }
interface FinishAssetUploadRequest { readonly handle: AssetUploadHandle }
interface AbortAssetUploadRequest { readonly handle: AssetUploadHandle }
interface ResolveActiveAssetUploadRequest { readonly resource_id: IDString; readonly asset_id: IDString }
interface AssetUploadBeginSuccess { readonly write: AssetWriteSuccess; readonly handle: AssetUploadHandle }
type AssetUploadTransitionSuccess = AssetWriteSuccess
type AssetUploadError = AssetExistingError
  | ErrorOf<'ASSET_NOT_READY'> | ErrorOf<'ASSET_UPLOAD_ALREADY_ACTIVE'>
  | ErrorOf<'ASSET_UPLOAD_NOT_ACTIVE'> | ErrorOf<'ASSET_UPLOAD_INCOMPLETE'>
type AssetUploadBeginResult = ExtensiaResult<AssetUploadBeginSuccess, AssetUploadError>
type AssetUploadTransitionResult = ExtensiaResult<AssetUploadTransitionSuccess, AssetUploadError>
type AssetUploadHandleResult = ExtensiaResult<AssetUploadHandle, AssetUploadError>
```

`AssetUploadHandle` є opaque internal-versioned-by-task value: не root export, не facade DTO, не serializable application token і не physical path/session. `resolveActiveAssetUpload` повертає handle тільки trusted internal adapter; initial create handoff тому unambiguous without public `upload_id`. Finish/abort reject stale handle `ASSET_UPLOAD_NOT_ACTIVE`. Exact bytes write/chunk surface між handle acquisition і finish належить P4-VS3.

## 8. Failure vocabulary та precedence

Нові normalized codes:

- `INVALID_ASSET_ID`
- `ASSET_INPUT_INVALID`
- `ASSET_URL_INVALID`
- `ASSET_DATA_INVALID`
- `ASSET_NOT_FOUND`
- `ASSET_NO_CHANGES`
- `ASSET_ID_GENERATION_FAILED`
- `ASSET_PRIMARY_CONFLICT`
- `ASSET_NOT_READY`
- `ASSET_LINEAGE_INVALID`
- `ASSET_LINEAGE_CONFLICT`
- `ASSET_HAS_DERIVATIVES`
- `ASSET_UPLOAD_ALREADY_ACTIVE`
- `ASSET_UPLOAD_NOT_ACTIVE`
- `ASSET_UPLOAD_INCOMPLETE`
- `ASSET_FILE_NOT_READY` — normalized future file-read failure P4-VS3; не входить metadata write unions.
- `RESOURCE_ASSET_UPLOAD_ACTIVE` — Phase 4 `deleteResource` conflict before mutation.

Shared `MODULE_NOT_READY`, `STORAGE_READONLY`, `RESOURCE_NOT_FOUND`, `STORAGE_LOCK_FAILED`, `STORAGE_WRITE_FAILED`, `STORAGE_INTEGRITY_FAILED` зберігаються.

Internal proven invariant code `ASSET_STORAGE_INTEGRITY` охоплює duplicate global Asset ID, invalid stored field/data/state/generation, cross/dangling/cyclic lineage, multiple primary та payload/state mismatch. Operation Engine synchronously fail-close-ить intake й мапить current admitted command у public `STORAGE_INTEGRITY_FAILED`; code доступний лише safe diagnostic, не public expected-error union. Ordinary I/O ніколи не стає integrity.

| Priority | Check / result |
|---:|---|
| 1 | module intake → `MODULE_NOT_READY` |
| 2 | capability before input → `STORAGE_READONLY` |
| 3 | Resource IDs, then Asset ID → existing invalid Resource / `INVALID_ASSET_ID` |
| 4 | descriptor/field/data/url input-local validation |
| 5 | local lock acquire / session acquire |
| 6 | coherent storage load та proven integrity |
| 7 | owner/destination missing or tombstoned → `RESOURCE_NOT_FOUND` |
| 8 | Asset missing → `ASSET_NOT_FOUND` |
| 9 | lineage/primary/upload/reassign state conflicts |
| 10 | canonical no-change |
| 11 | begin/stage/commit ordinary failure → `STORAGE_WRITE_FAILED` |

Unexpected or corrupt persisted state maps only to typed integrity and fail-close. Expected conflict не маскується як storage failure.

## 9. Timestamps, locks, write-set і publication

### 9.1 Timestamp matrix

| Transition | Asset timestamps | Resource timestamps |
|---|---|---|
| create | `created_at = updated_at = T` | owner `updated_at = T` |
| effective metadata update | target `updated_at = T`; created unchanged | owner `updated_at = T` |
| primary set/clear | demoted/promoted Assets `updated_at = T` | owner `updated_at = T` |
| reassign | moved Asset `updated_at = T` | source і destination `updated_at = T` |
| delete | removed Asset has no resulting snapshot | owner `updated_at = T` |
| begin/finish/abort replacement | target `updated_at = T` | owner `updated_at = T` |
| abort initial | Asset removed | owner `updated_at = T` |
| no-change/failure | no persisted timestamp change | no persisted timestamp change |

Один operation Timestamp використовується всіма effective snapshots. Timestamp не є ordering primitive.

### 9.2 Locks і coherent plan

- Single-owner metadata/upload operation: complete aggregate lock `resource:<ownerId>`; primary clear/set safely mutates discovered old/new Assets under this lock. Create additionally locks generated candidate Asset ID.
- Reassign: source/destination Resource keys in normalized lexical acquisition; these aggregate locks cover the moved Asset.
- Candidate collision використовує P3 three-candidate policy: release session/locks, regenerate/replan; third collision → `ASSET_ID_GENERATION_FAILED`.
- Lock keys freeze before exclusive storage session. Relation/primary checks виконуються на latest coherent aggregate under session.
- No P5 global index є authority; driver lookup/uniqueness check є durable authority.

Prepared Asset write-set містить unique sorted Resource snapshots, exact logical Asset changes і exact `AssetPayloadAction` bound to opaque upload generation. Fingerprint canonicalizes full Resource snapshots plus the full discriminated payload action and IDs; it does not expose path або bytes. Driver verifies generation identity/completeness and commits metadata, compound payload action та exactly one journal entry atomically.

### 9.3 Journal/index/readonly

Operation kinds:

- `asset.create`
- `asset.update`
- `asset.primary.set`
- `asset.reassign`
- `asset.delete`
- `asset.upload.begin`
- `asset.upload.finish`
- `asset.upload.abort`

Кожна effective operation має один semantic commit і один committed journal entry. `affected_resources` та logical changes походять лише з prepared set. Hot Metadata Index отримує atomic prepared batch swap post-commit; P5 додає derived asset/primary indexes, але не змінює write authority. Resource snapshot/index бачить uploading flag тільки після commit. File reader бачить лише last committed ready generation. `readonly` завершує command до parse, upload staging, timestamp/ID generation або mutation.

Journal entry має exact field `asset_changes: readonly AssetLogicalChange[]`, де кожен element є `{ asset_id, owner_before, owner_after, state_before, state_after, payload_action }`; `owner_*`/`state_*` nullable, Resource IDs/enum strings canonical, array unique і binary-sorted by `asset_id`. Create/update/reassign/delete/begin/finish/abort мають exactly one change. Primary clear має one demoted change; set without old primary — one promoted change; switch — two changes (demoted old + promoted new) sorted by ID. Fingerprint binds the whole sorted array, full Resource snapshots and each exact payload action. Full snapshot/payload generation source of truth лишається driver state, а journal payload є deterministic logical change hint. Resource delete conflict `RESOURCE_ASSET_UPLOAD_ACTIVE` перевіряється під existing delete locks/latest coherent aggregate before transaction; precedence after `RESOURCE_HAS_CHILDREN` і before transaction (active children лишаються first domain conflict).

P3-compatible ordering може створити operation ID/clock Timestamp до coherent no-change/conflict determination. “No timestamp” у матрицях означає no persisted `updated_at` bump і no journal `committed_at`, а не гарантію відсутності clock invocation. Asset ID collision retry створює new candidate plan; operation timestamp може бути reused як у чинному handler contract, але лише successful effective snapshots persist it.

## 10. Compatibility review

### Current `AssetSnapshot`

Shape збережено. `P4-VS2 / TASK-07.26-0051 / RUN-001` materialize-ила це intentional tightening під `experimental-phase-4`: pure validators тепер перевіряють exact nonempty classifiers, canonical URL, bounded data й local aggregate shape, а coherent command/startup scan — global ownership/lifecycle/timestamp/primary/lineage invariants. Readiness proof concrete SQLite driver передає лише через internal symbol capability; public readonly DTO/method не додається. Bytes transport і upload finalization лишаються P4-VS3; P7 compatibility freeze не заявлений.

### P3 pipeline

Asset state лишається всередині full Resource snapshot; one Core/Operation Engine, driver-owned commit, full write-set fingerprint, post-commit index і fail-close не змінюються. Reassign використовує existing atomic multi-Resource prepared-set pattern. Другий journal/file publication path заборонений.

### P4-DG1

`local-sqlite-v1` може зберігати opaque payload chunks у тій самій SQLite durability domain. P4-DG2 вимагає capability `stage/publish/discard/delete opaque generation atomically with semantic transaction`, але не визначає tables, SQL, chunk size, pragmas чи path.

### P5/P7

P5 будує `assetId→resourceId`, primary та lineage reverse indexes із committed snapshots і journal sequence; indexes не потрібні для correctness P4 writes. P7 фіксує DTO/error/method compatibility, URL behavior і `Asset.data` schema evolution; P4 limits вже executable й не deferred.

## 11. Downstream slicing

| Owner | Prerequisites | Deliverables | Gate proof |
|---|---|---|---|
| P4-WP1 | applied P4-DG1 | concrete Resource durability + opaque future payload capability seam, без Asset semantics | profile conformance/crash proof |
| P4-VS1 | P4-WP1 | P3 Resource parity on concrete driver | restart/cut-point matrix |
| P4-VS2 | P4-VS1 + approved/applied P4-DG2 | field/data/url validators; external/internal metadata create/update/primary/reassign/delete; startup Asset integrity; no payload finalization | table/property/integration/concurrency/failure tests |
| P4-VS3 | P4-VS2 + driver opaque staging primitives | internal upload generation begin/finish/abort/retry; last-ready visibility; atomic payload actions | incomplete/retry/crash/recovery matrix |
| P5 | accepted Phase 4 | derived global asset/primary/lineage indexes and sync | rebuild/cursor/multi-instance proof |
| P7 | all gates | public compatibility/schema freeze | packed type/runtime and migration report |

P4-VS2 може materialize internal metadata state seam, але не оголошує bytes transport. P4-VS3 не може стартувати з conceptual methods: потрібен executable driver capability і exact adapter boundary.

## 12. Verification matrix

### Field/data

- type/role empty, whitespace-only, 1/128/129, case-sensitive no-change;
- MIME valid tokens, uppercase/parameters/spaces/slash boundaries;
- extension 1/32/33, dot/uppercase/path separators;
- URL parse, scheme, credentials, default port/host case normalization, raw/canonical 4096 boundary, query/fragment equality;
- data depth 16/17, nodes 4096/4097, keys 256/257, arrays 1024/1025, key/string/UTF-8 65536 boundaries, hostile descriptors/cycles/order-insensitive objects.

### Aggregate

- global duplicate Asset ID; sorted assets; active/tombstoned owners;
- lineage self/cross/missing/not-ready/cycle; delete with dependents; lineage-free reassign;
- create primary conflict; explicit demote/promote/clear; no-change; internal initial not-ready; delete/reassign primary leaves none/no transfer;
- reassign missing/deleted destination, active upload, same owner, two-resource atomicity.
- Resource delete with initial/replacement active upload returns `RESOURCE_ASSET_UPLOAD_ACTIVE` after child check and before transaction; finish/abort/delete Asset then permits existing leaf delete.

### Lifecycle/pipeline

- external never uploading; internal create only initial-uploading;
- initial finish/abort/delete; replacement begin/finish/abort/delete; old payload visibility; stale generation and repeated operation ID;
- every effective transition common timestamps, exact locks/write-set, one journal entry, post-commit batch publication;
- readonly-before-inspection; validation/no-change no transaction/journal або persisted timestamp bump (clock invocation не constrained);
- ordinary I/O versus typed integrity; commit cut points; crash/restart; post-commit warning/fail-close;
- detached snapshots, no upload/path/session/SQL leakage, packed public types.

## 13. Traceability U-21..U-24

| Question | Exact disposition | Acceptance / downstream proof |
|---|---|---|
| U-21 relation/primary lifecycle | same-Resource ready-target acyclic lineage; no dangling; explicit primary; delete none; constrained non-primary reassign | AC3, VS2 aggregate matrix, VS3 readiness cases |
| U-22 fields/URL | exact descriptors, limits, MIME/extension regex, canonical HTTP(S) URL | AC2, table tests |
| U-23 data limits/schema | exact depth/node/container/string/canonical UTF-8 limits; schema evolution P7 only | AC2/6, property/boundary tests |
| U-24 initial internal | staged-only; no atomic ready create; internal state distinguishes initial/replacement; old ready payload remains visible | AC4/5, VS3 crash/retry matrix |

## 14. Risks and architecture pressure

- `AssetSnapshot` boolean недостатній для recovery distinction initial/replacement; internal durable generation state є необхідним, але не public DTO.
- Reassign і lineage могли б створити global lock/index blast radius; same-Resource lineage та lineage-free reassign свідомо локалізують його.
- Public internal create до bytes transport є experimental capability; P7 може змінити facade packaging, але semantic state/result не повинен розійтися.
- URL canonicalization залежить від Node major; pinned Node 24 tests і P7 compatibility review required.
- 64 KiB `data` envelope та SQLite payload strategy потребують performance evidence, але не послаблюють correctness.
- Будь-яка спроба publish staged bytes окремо від metadata+journal або додати external filesystem blob path є architecture stop condition.

## 15. Upward consistency

- `product/requirements.md`: preserved; REQ-DOM-002/004/007 fully refined.
- `product/roadmap.md`: needs target-design status note only after approval/application.
- `domain/rules.md`, `domain/target/model.md`, `domain/open-questions.md`: required exact fixation.
- `domain/current/implementation-state.md`: design-only note after application; no current capability claim.
- `technical/architecture.md`, `technical/rules.md`, `technical/open-questions.md`: required exact fixation.
- new `technical/asset-contract.md` and ADR-0011: required.
- `technical/public-read-contract.md`: shape unchanged; add cross-link only, not rewrite implemented Phase 2 contract.
- `write-journal-recovery-contract.md`: add Asset refinement cross-link; P3 truth preserved.
- `state.md` and indexes: lifecycle/structural updates during approved application.
- Knowledge packages: not needed.
- Language gate: passed; canonical author text український, identifiers retained in English.

## 16. Recommendation

Погодити contract і required FIX-001. Не додавати atomic ready create, cross-Resource lineage або implicit primary promotion: кожне з них збільшує semantic/locking/recovery ambiguity без необхідності для Phase 4 vertical slices.
