# Read-model completeness і coherent generation contract

Status: accepted target contract
Accepted: 2026-07-17
Authority: P5-DG1 / TASK-07.26-0056 / approved FIX-002
Compatibility: existing reads `public-stable-candidate`; additions `experimental-phase-5`; internal seams `internal-versioned-by-task`
Detailed Design: [Exact read-model completeness і coherent generation contract](../reports/research/2026-07-17-extensia-read-model-completeness-query-contract.md)

## 1. Outcome

Extensia має один process-local read model із двома loading policies, але однією correctness semantics. `greedy` публікує повну generation до ready. `lazy` публікує selective generation і догружає exact point/closure observations. Внутрішній cache може бути partial; успішний query result — ніколи.

Completeness і freshness розділені. Completeness доводить, що result охоплює весь заявлений scope однієї coherent generation. Вона не доводить, що інший process не commit-нув новішу generation. Cursor, refresh, polling/notification, stale window, retries і actor ordering належать P5-DG2.

Public Phase 2 surface не розширюється speculative draft methods. `getResource` і one-level `getResourceTree` зберігають names, value shapes, missing semantics і detached snapshots. Phase 5 приймає internal query catalog, coherent projection schema, experimental loading config та mode visibility. Нові application-facing query methods лишаються окремими experimental slices після product need; P7 володіє final freeze.

## 2. Authority, facts і draft inputs

### 2.1. Accepted authority

- `REQ-RUN-008`: Hot Metadata Index є process-local derived view, не durable truth, і оновлюється після commit.
- `REQ-RUN-010`: External Change Sync застосовує committed changes у journal order; exact cursor/sync lifecycle не входить у цей design.
- `REQ-RUN-011`: `greedy` і `lazy` обов'язкові та мають різну completeness semantics.
- Storage Driver є durable authority; writes проходять Core/Operation Engine; public DTO є detached readonly snapshots.
- Resource hierarchy використовує `parent_id` як truth, children — projection. Asset globally unique, має одного owner, max one primary та hard same-Resource lineage.
- Existing accepted public reads: exact Resource point і direct-child tree; success-null missing та full draft catalog раніше відхилені як Phase 2 scope expansion.

### 2.2. Current facts

- Production index має одну immutable coherent generation з Resource/children, Asset owner/primary/lineage, exact Mark projections і generation-local coverage proofs.
- `greedy` full/readonly startup публікує complete generation; `lazy` після equivalent global integrity gate публікує empty/selective generation і догружає exact Resource point/one-level observations.
- Чинні public `getResource`/`getResourceTree` повертають success лише з exact coverage proof; negative proof зберігає missing semantics, unknown повертає typed storage read failure й не стає empty/partial success.
- Full/readonly semantic metadata adapters мають однакову claimed read semantics; readonly supported path виконує лише observation calls. Internal `asset.owner.get` повертає exact owner ID + Asset або proven absent з complete point metadata; `mark.resources.get` повертає exact sorted Resource IDs з complete storage-global metadata лише через exact selector capability, а без неї fail-ить query unavailable до implicit full scan. Public global query catalog не доданий.
- P5-VS2 реалізувала profile-owned `local-sqlite-v1` full+readonly coherent observation, remaining-budget/lexical-seek behavior, exact dual threshold, lifecycle-owned polling і rerunnable process characterization. Це не topology support: P5-STAB, P5-AUD1 та explicit human gate лишаються mandatory.

### 2.3. Draft-only inputs

Source specification names `resourceExists`, `assetExists`, `findResourceById`, `findResources`, `findAssetById`, `getResourceAssets`, `getPrimaryAsset`, `getChildren`, Mark catalogs/stats і `readAssetFile`. Exact filters, ordering, pagination, result metadata і public compatibility для них не прийняті. Conceptual `core.mode` також не є public authority: Core лишається internal.

## 3. Definitions

| Term | Exact meaning |
|---|---|
| generation | Immutable process-local bundle всіх projection maps, coverage proofs і generation-local metadata, published одним pointer swap. |
| complete generation | Generation, побудована з coherent observation усього committed metadata scope і повністю validated. |
| selective generation | Generation, що містить лише exact observed aggregates/closures та negative proofs; відсутність key без proof означає unknown. |
| completeness | Доказ, що query result охоплює весь declared scope generation: point, one-level closure або storage-global. |
| freshness | Відношення generation до новіших commits інших actors/processes. Не визначається P5-DG1. |
| unavailable | Runtime/driver не може довести потрібний coverage scope; це failure, не empty/partial success. |
| invalidation | Видалення або downgrade coverage proof після committed change, якщо cached scope більше не доведений. |

`complete` не означає latest-across-processes. `selective` не дозволяє повертати subset як complete. Empty complete result є valid success лише з exact positive coverage proof.

## 4. Loading-mode config і lifecycle visibility

### 4.1. Public config proposal

```ts
type ReadModelLoadingMode = 'greedy' | 'lazy'

interface ExtensiaConfig {
  readonly storage: { readonly driver: ReadonlyResourceDriver | FullResourceDriver }
  readonly readModel?: {
    readonly loading?: ReadModelLoadingMode
    readonly synchronization?: ReadModelSynchronizationConfig
  }
}
```

- Default: `readModel` absent або `loading` absent → `greedy`.
- `core.mode` rejected: він відкриває internal Core vocabulary.
- Config envelope читається descriptor-safe за current rules. Accessor, unknown loading/synchronization value, non-object envelope або own key усередині `readModel`, крім `loading`/`synchronization`, → `CONFIG_INVALID` до driver open; synchronization nested validation визначає accepted P5-DG2 contract.
- Mode immutable для module lifetime. Runtime switching/reload відсутні.
- Compatibility label: `readModel.loading`, `readModel.synchronization` і new inspection fields — `experimental-phase-5`; existing default no-background behavior і two read value shapes лишаються current `public-stable-candidate`.

### 4.2. Inspection

`ExtensiaInspection` additive provisional field:

```ts
interface ReadModelInspection {
  readonly loading: 'greedy' | 'lazy'
  readonly lifecycle: 'not-started' | 'building' | 'ready' | 'stopping' | 'failed' | 'stopped'
  readonly coverage: 'none' | 'selective' | 'complete'
  readonly synchronization: SafeSynchronizationInspection
}
```

`inspect().read_model` є detached safe tooling; воно не містить generation IDs, resource/asset IDs, cursors, storage paths або driver values. `ready` module state означає published usable generation: complete у greedy, selective або complete у lazy.

### 4.3. Lifecycle matrix

| Event | Greedy | Lazy |
|---|---|---|
| construction | side-effect-free, mode captured | same |
| start validation | complete observation capability required | exact Resource point + one-level capability або complete-scan fallback required |
| startup integrity | coherent full metadata validation | same global integrity strength; adapter може stream/driver-prove й discard data |
| ready publication | only complete generation | empty/selective generation after integrity gate |
| stop | close intake, drain reads, clear generation | same |
| startup observation/integrity failure | `START_FAILED`, no facade publication | same |

Lazy does not promise faster startup. A generic adapter may require O(N) integrity validation and discard the data; a profile-specific integrity proof may optimize this only with equivalent executable evidence.

## 5. Query catalog and dispositions

### 5.1. Accepted Phase 5 semantic catalog

These are semantic Core read operations. Only the first two are current public methods.

| Query ID | Scope | Consumer/status | Exact result |
|---|---|---|---|
| `resource.get` | point aggregate | public current `getResource` | active `ResourceSnapshot`; invalid ID vs missing exact; complete point proof required. |
| `resource.tree.get` | one-level closure | public current `getResourceTree` | active Resource + all active direct child refs sorted `(order_index,id)`; not recursive. |
| `asset.owner.get` | global point identity | internal Phase 5 | exact active owner ID + Asset snapshot, or proven absent; Asset IDs global. |
| `resource.primary-asset.get` | aggregate point | internal Phase 5 | owning active Resource proven; one Asset or `null`; no-primary is success, missing Resource distinct. |
| `asset.lineage-dependents.get` | same-owner closure | internal Phase 5 | all same-Resource direct dependents sorted ID; recursive closure not implied. |
| `mark.resources.get` | storage-global | internal Phase 5 | all active Resource IDs containing exact Mark identity `type + name`, sorted ID; Mark value/stat aggregation absent; lazy requires an exhaustive selector or returns unavailable. |

Internal operations are `internal-versioned-by-task`; they do not create package exports or application compatibility. Public exposure requires a separate vertical slice and `experimental-phase-5` result contract.

### 5.2. Draft public candidates

| Candidate | Disposition |
|---|---|
| `resourceExists`, `assetExists` | deferred; duplicate lookup semantics and extra API surface not justified. |
| `findResourceById` | superseded by current `getResource`; success-null missing remains rejected. |
| broad `findResources(query)` | unavailable/deferred: filter, ordering, pagination and result DTO undefined. |
| `findAssetById` | public exposure deferred; internal `asset.owner.get` accepted. |
| `getResourceAssets` | deferred as redundant with complete Resource aggregate. |
| `getPrimaryAsset` | public exposure deferred; internal projection accepted. |
| `getChildren(id)` | superseded by one-level tree; `id=null` would be a different storage-global query. |
| `getMarkList`, `getMarkStatListByType` | deferred; catalog/stat aggregation semantics absent. |
| `readAssetFile` | out of scope; ordinary public bytes/file API owner remains separate. |

No absent method is simulated by a partial array. A later accepted global method must follow section 6 before it can return success.

## 6. Completeness and failure contract

### 6.1. Public existing methods

`getResource` і `getResourceTree` keep exact success value shapes; no wrapper or metadata field is added. Their contract itself states that every success is complete for point/one-level scope. Lazy cache coverage is never visible or inferable from missing map entries.

Lazy call-time observation adds opt-in experimental error categories:

- `STORAGE_READ_FAILED`: ordinary observation could not complete; no cache publication from that attempt.
- `STORAGE_INTEGRITY_FAILED`: observation/proof violated canonical invariants; runtime fail-close begins before further reads.

Missing remains `RESOURCE_NOT_FOUND`; it is returned only from an exact negative proof. Capability absence required for these current methods is detected at start and yields `START_FAILED`, not a runtime partial result.

### 6.2. Internal/new global operations

Every internal query result carries:

```ts
interface ReadCompleteness {
  readonly status: 'complete'
  readonly scope: 'point' | 'one-level' | 'storage-global'
}
```

Internal failure `READ_MODEL_QUERY_UNAVAILABLE` means required coverage cannot be proven by current adapter. A future public experimental mapping uses code `QUERY_UNAVAILABLE`. `STORAGE_READ_FAILED` and `STORAGE_INTEGRITY_FAILED` remain distinct. There is no `partial`, `estimated`, `best-effort` or warning-success variant.

### 6.3. Mode matrix

| Scope | Greedy | Lazy cold | Lazy warm |
|---|---|---|---|
| Resource point | generation lookup; exact present/missing | exact point observation, then atomic selective publish | use point proof; unknown triggers observation |
| one-level tree | complete children projection | exact one-level observation or full-scan fallback | use closure proof; unknown triggers observation |
| Asset global point | Asset map | exact owner observation with negative proof; otherwise unavailable | use Asset point proof |
| aggregate primary/lineage | aggregate-derived maps | exact owner aggregate observation | use owner coverage proof |
| exact Mark global | complete Mark projection | exhaustive Mark selector or unavailable/failure | only complete proof for this Mark key may answer |
| future broad global | only if exact catalog contract exists | exhaustive selector or unavailable | never selective subset |

## 7. Coherent generation schema

Conceptual internal structure, not package API:

```ts
interface ReadModelGeneration {
  readonly observationStamp: opaque // equality-only, non-durable, non-orderable
  readonly coverage: GenerationCoverage
  readonly resourcesById: ReadonlyMap<IDString, ResourceSnapshot>
  readonly childrenByParent: ReadonlyMap<IDString | null, readonly ResourceChildRefSnapshot[]>
  readonly assetById: ReadonlyMap<IDString, AssetSnapshot>
  readonly assetOwnerById: ReadonlyMap<IDString, IDString>
  readonly primaryAssetByResource: ReadonlyMap<IDString, IDString>
  readonly lineageDependentsByAsset: ReadonlyMap<IDString, readonly IDString[]>
  readonly resourcesByMark: ReadonlyMap<MarkIdentityKey, readonly IDString[]>
}
```

`GenerationCoverage` містить:

- `kind: complete | selective`;
- exact positive/negative Resource point proofs;
- exact one-level closure proofs per parent;
- exact positive/negative Asset global-point proofs;
- owner aggregates whose Asset/primary/lineage relations are complete;
- exact global-selector proofs keyed by accepted query + canonical selector, зокрема `mark.resources.get(type,name)`;
- unrestricted `storage-global` proof only for complete generation.

`observationStamp` лише доводить, що selective entries можна безпечно зібрати в одну coherent generation. Це не journal cursor, revision API або ordering primitive. Якщо нова observation не має equality proof із current selective generation, builder відкидає несумісні cached proofs замість змішування snapshots із різних моментів.

Selective generation може повністю відповісти на один exact global selector, не стаючи complete для інших selectors або всього storage. Proof key включає query ID і canonical input; loaded projection entries без такого proof не є global result authority.

Map absence without corresponding proof is `unknown`, not missing.

### 7.1. Invariants

1. One builder validates canonical Resource, hierarchy, dense active order, Mark uniqueness, global Asset identity, owner, primary, lifecycle/readiness and same-Resource acyclic lineage.
2. `childrenByParent` derives only from active Resource `parent_id`; no map is write authority.
3. Asset/owner/primary/lineage/Mark maps derive only from the same accepted Resource snapshots.
4. Tombstoned Resources may remain in internal validation material but are absent from default active query projections.
5. All arrays sort deterministically: children `(order_index,id)`, Asset/Resource IDs binary lexical.
6. Generation and coverage publish with one synchronous no-fail pointer swap. Independent map publication is forbidden.
7. Public returns are rebuilt detached snapshots; callers never receive generation maps, coverage sets or mutable aliases.

## 8. Observation port

One consumer-owned internal `CoreMetadataObservationPort` is bound by full/readonly adapters. It exposes semantic requests, not driver sessions:

- `resource-point(id)` — exact Resource present/absent;
- `resource-one-level(id)` — exact parent present/absent plus all active direct children;
- `asset-owner(assetId)` — exact globally unique Asset present/absent plus complete owner aggregate;
- `mark-resources(type,name)` — optional exhaustive selector для exact Mark identity;
- `storage-complete` — coherent complete metadata observation;
- `storage-integrity` — equivalent global validation proof, which may be optimized by a profile.

Each response is detached, immutable, tagged with exact coverage scope та має opaque equality-only observation stamp. The port does not expose transaction, write lock, journal cursor, SQL/path/layout, session lifetime or arbitrary predicates. Adapter може реалізувати point/closure request через bounded coherent scan, але query-triggered `storage-complete` fallback для lazy global operations не є default: відсутність exhaustive selector повертає unavailable.

Full і readonly capability modes have identical read semantics when they claim a request. Capability absence is explicit. Readonly performs no recovery, cleanup, cache checkpoint або hidden write. Current generic readonly `listResources` can back complete-scan fallback; current full session can back point/full observations behind the adapter. Concrete concurrency/topology support remains P5-DG2/P5-STAB evidence.

## 9. Generation lifecycle

### 9.1. Full rebuild

1. Obtain one coherent `storage-complete` observation after recovery/startup authority.
2. Clone/validate snapshots into a private builder.
3. Build every accepted projection and complete coverage.
4. Freeze next generation.
5. Publish one pointer swap; old readers retain old immutable generation until their read lease settles.
6. Dispose old generation after ownership permits; no public snapshot alias depends on it.

Failure before step 5 leaves old generation unchanged. Integrity failure fail-close-ить runtime. Rebuild does not own or advance a journal cursor in P5-DG1.

### 9.2. Lazy point/closure load

1. Capture current generation and check exact coverage proof.
2. If unknown, perform narrow observation outside generation mutation.
3. Build next generation with observation merged only when observation stamp is compatible. Otherwise retain authoritative local committed overlays, drop unrelated selective proofs and rebuild from the new observation without time-skewed maps.
4. Compare-and-publish through one process-local publication coordinator. If current generation changed, discard/re-observe or rebase only with an exact compatible proof; never overwrite a newer generation blindly.
5. Return detached result from the published or equivalently newer generation.

The coordinator shape is P5-DG1; ordering against external journal batches is completed by P5-DG2.

### 9.3. Local committed publication

- Before commit, Core prepares an immutable next-generation change from coherent latest state and staged write-set.
- Durable commit resolves first.
- The prepared change publishes synchronously/no-fail before success and post-commit hooks.
- Complete generation stays complete and updates every affected projection.
- Selective generation inserts committed changed aggregates for local read-after-write and invalidates stale proofs for source/destination parents, Asset identity/owner, primary, lineage and Marks.
- Ordinary local publication must scale with changed aggregates/keys through structural sharing or equivalent persistent overlays. O(N) is reserved for explicit full rebuild/integrity work, not every small write. A shallow `new Map(old)` clone still counts as O(N) and does not satisfy this boundary; implementation must measure changed-set vs total-set scaling.

### 9.4. Invalidation matrix

| Change | Required projection update/invalidation |
|---|---|
| Resource create/update | Resource point; parent closure; Mark keys; all contained Asset relations. |
| move | source and destination parent closures; moved Resource point. |
| soft delete | Resource active point, parent closure, all contained public Asset/primary/Mark visibility. |
| Marks replace | old and new exact Mark keys. |
| Asset create/update/delete | Asset point/owner, owner primary, old/new lineage reverse, Mark unaffected. |
| primary set/clear | owner primary and changed Asset snapshots. |
| reassign | source/destination owner aggregates, Asset owner, both primary maps, lineage proof. |
| upload transition | Asset/owner snapshots; lineage readiness validation; payload bytes are not read-model data. |

## 10. Scenario matrix

| Scenario | Required outcome |
|---|---|
| greedy cold start, empty storage | complete empty generation; global Mark query complete empty. |
| greedy corrupt relation | no ready publication; `START_FAILED`/integrity diagnostic. |
| lazy cold Resource hit | exact observation, selective atomic publish, detached success. |
| lazy cold Resource miss | negative point proof, `RESOURCE_NOT_FOUND`; no inference from map absence. |
| lazy tree with cached parent only | observation required; cached subset cannot succeed. |
| lazy global Mark query | exhaustive Mark selector and complete result, or unavailable/read failure; never implicit full hydration or subset. |
| concurrent lazy loads | coordinator rebase; no older generation overwrites newer. |
| local commit while selective | committed aggregates visible before command success; related proofs invalidated. |
| observation ordinary failure | old generation retained; typed failure; retry policy not invented. |
| observation integrity failure | intake/facades fail-close; no partial publish. |
| snapshot mutated by caller | no generation/storage mutation; later read unaffected. |
| external process commit | current generation may be stale; no false claim of latest; P5-DG2 owns refresh. |

## 11. Fixtures and performance evidence methodology

### 11.1. Correctness fixtures

- `F0-empty`: no Resources.
- `F1-relations`: roots, ordered siblings, grandchild, tombstone, Marks/KV, external/internal Assets, no-primary/primary, same-owner lineage chain and independent owners.
- `F2-negative`: missing Resource/Asset, empty children, no primary, exact Mark with zero matches.
- `F3-integrity`: duplicate IDs, orphan/cycle, sparse sibling order, duplicate Mark, duplicate Asset ID, primary conflict, cross-owner/dangling/cyclic lineage, invalid readiness.
- `F4-invalidation`: each local operation kind with old/new parent, Mark, owner, primary and lineage keys.
- `F5-interleaving`: concurrent lazy point/tree/global builds and local committed publication.

Every fixture runs against fake and concrete adapters where supported, in greedy/lazy and full/readonly read capability modes. Expected projection content and coverage proofs are property-checked against a simple full-scan oracle, not production maps.

### 11.2. Characterization, not SLA

Record exact Node/OS/driver/storage tuple, repeat count, warmup, dataset cardinalities and raw samples for:

- greedy integrity/build/startup time and peak/retained heap;
- lazy startup validation, cold Resource/tree/Asset read, warm read and first global query;
- generation build vs pointer-publication time;
- local write cost across changed set `{1,2,16}` and increasing total Resource/Asset/Mark cardinality;
- event-loop delay and synchronous blocking;
- selective-to-complete upgrade and invalidation/rebuild cost.

Use at least small/current parity, medium and pressure ladders chosen by implementation task; publish cardinalities rather than naming them “production”. Median/p95 may characterize repeats but are not budgets. P5-STAB sets or rejects budgets after executable baseline.

## 12. Compatibility and boundaries

- Existing configs default to greedy and keep behavior.
- Existing public method names/value shapes/missing semantics remain unchanged.
- Lazy-only call-time storage/integrity errors and `readModel` config/inspection are experimental Phase 5; P7 may freeze names after evidence.
- Internal query IDs, observation port and generation schema are not package exports.
- No raw Core/IoC/session/transaction/cursor/path/SQL becomes application API.
- Query reads perform no durable write, journal append, cache checkpoint or hidden cleanup.
- P5-DG2 owns cursor, refresh trigger, actor/order, stale window, retries/backoff, lock contention/fairness and local/external publication serialization.
- Notification, retention/compaction, durable cache/checkpoint, direct mutation reconciliation and hard SLA are deferred.

## 13. Alternatives

| Alternative | Decision |
|---|---|
| Partial arrays/trees with warning | rejected: second consumer consistency model and false-completeness risk. |
| Every public success gets new wrapper | rejected: weakens current two-read compatibility without need. |
| Accept full draft query facade now | rejected: product/filter/ordering/pagination semantics absent. |
| Expose `core.mode` | rejected: leaks internal architecture into public config. |
| Independent projection maps | rejected: transient cross-map inconsistency. |
| Index as write/read truth | rejected: non-durable authority. |
| Lazy skips global integrity validation | rejected: readiness would be weaker than greedy/current baseline. |
| Raw driver session for selective reads | rejected: storage lifecycle/layout leak. |
| Implicit full scan/hydration on lazy global query | rejected: surprising O(N) behavior collapses lazy into greedy; future explicit hydrate operation needs a separate contract. |
| Whole generation rebuild on every write as required design | rejected: unbounded O(N) write amplification; full rebuild remains explicit maintenance/startup path only. |
| Durable generation/checkpoint in Phase 5 | deferred: creates second durability/recovery/cursor contract. |

## 14. Downstream contract

`P5-WP1`, `P5-HARD1`, `P5-VS1` і `P5-VS2` materialized та accepted у TASK-0058/0059/0060/0061; відповідні required fixations applied. `P5-STAB` -> `P5-AUD1` лишаються prepared, inactive й потребують separate explicit activation. P5-VS2 acceptance/application не активує downstream packages.

## 15. Memory impact

P5-VS1 current/materialization sync застосовано через TASK-0060/FIX-001; P5-VS2 current/materialization sync застосовується exact через TASK-0061/FIX-001 у domain current state, architecture, P5 contracts і roadmap. Product requirements, target domain invariants і normative completeness rules не змінюються.
