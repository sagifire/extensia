# Архітектура Extensia

Status: target-draft
Target Release: `0.1.0`
Updated: 2026-08-23

## Статус реалізації

Цей документ описує цільову архітектуру зі draft-специфікацій. Фактично реалізовані internal pure domain contract kernel, IoC composition/conformance skeleton, strict internal lifecycle host/controller, одна coherent complete/selective read-model generation, shared Facade Provider/Registry, Operation Engine, deterministic full-driver fake/recovery, experimental public Resource/Asset lifecycle та bounded internal P4-VS3 upload bytes/finalization lifecycle. P5-WP1/P5-HARD1/P5-VS1 materialize-или один publication coordinator, один hardened synchronization actor/retry owner, `greedy`/`lazy` complete-only existing reads, descriptor-safe `readModel` config, explicit `query.refresh()` і safe frozen inspection через semantic full/readonly observation seams. Internal `embedded-transactional/local-sqlite-v1` durability driver лишається concrete Phase 4 profile; profile-specific/certified full+readonly observation, remaining-budget/lexical-seek behavior, production polling, two-process contention/visibility та topology support ще не реалізовані. Root package публікує `createExtensia`, opaque full-driver factory та bounded public contracts без internal Core/IoC/storage subpaths. Ordinary public upload/file API, public/default driver surface, P7 freeze і broader platform/performance/power-loss certification ще відсутні. Детальний current state зафіксовано в `memory/domain/current/implementation-state.md`.

## Архітектурна ідея

Extensia є embeddable in-process runtime-бібліотекою. Extensia Module використовує `@sagifire/ioc` для явної composition dependencies, а Core координує runtime semantics і всі state-changing operations.

```text
Host application
└─ Extensia Module
   ├─ Public API
   │  ├─ system facades: storage, query
   │  ├─ custom facades
   │  └─ plugin contracts / descriptors
   ├─ Extension layer
   │  ├─ Facade Registry та providers
   │  ├─ system extensions
   │  ├─ user plugins
   │  └─ hooks
   └─ Extensia Composition Root
      ├─ @sagifire/ioc Composer
      ├─ runtime modules, tokens, ports, adapters
      ├─ validation та immutable Composed Runtime
      └─ Extensia Runtime Controller
         └─ Core
            ├─ Operation Engine та operation scopes
            ├─ Async Lock Queue
            ├─ Hook System
            ├─ Hot Metadata Index
            ├─ Operation Journal
            ├─ External Change Sync
            └─ Storage Driver
               └─ Physical durable storage
```

## Розподіл відповідальності

### Extensia Module

Application-facing lifecycle boundary. Приймає config, нормалізує extension descriptors, створює Composition Root, запускає runtime і extensions, публікує frozen facade surface та виконує shutdown/disposal.

### `@sagifire/ioc`

Internal composition layer для typed tokens, runtime modules, explicit `requires` / `provides`, adapter bindings, multi contributions, graph validation, scopes, diagnostics і test overrides до `compose()`.

IoC layer не визначає доменні правила, operation pipeline, public DTO/results, plugin security або application API.

### Core

Internal runtime coordinator. Він підтримує доменні інваріанти, управляє writes, locks, Storage Driver, journal, index publication, hooks, recovery і external synchronization. Core не є dependency container.

### Storage Driver

Port до durable state. Driver приховує physical layout, metadata/file persistence, staging, storage-level lock, journal persistence та recovery primitives. Core працює з logical asset IDs, а не physical paths.

Extensia не є database engine. Storage Driver реалізує Core-owned semantic persistence port. Canonical physical families:

- `filesystem-native` — platform-bounded filesystem protocol із verified native lock/directory-durability primitives;
- `embedded-transactional` — in-process transactional engine; `local-sqlite-v1` є first/default concrete profile `0.1.0`;
- `client-server-transactional` — server-managed PostgreSQL/MySQL та інші vendor profiles.

Families поділяють semantic session/coherence, atomic commit, one committed journal, idempotency, recovery-before-ready, readonly, integrity та truthful outcome guarantees. Files/sidecars/native calls, SQL/schema/isolation, server topology, physical lock і recovery лишаються profile-local. Core і public API їх не бачать. SQLite є першим bounded implementation engine, а не universal physical Storage Driver model.

Прийнятий target design для filesystem-native використовує profile-specific native helper для crash-released shared/exclusive OS locks, handle-relative path safety, immutable no-replace publication і directory durability. Immutable content-addressed graph має один atomically replaced/directory-synced `HEAD` як committed authority; shared readonly lease не перетинає незавершену writer publication, а sidecars/PID/time не є lock або takeover authority. Жоден filesystem-native profile ще не сертифікований; `linux-local-ext4-v1` лишається candidate, а physical details не виходять за opaque driver adapter.

Прийнятий target design для `client-server-transactional` має один semantic family contract і окремі PostgreSQL/MySQL physical profiles. V1 тримає exclusive runtime/migration advisory gate на dedicated pinned control connection від `open()` до ordered `close()` для full/readonly/migrator exclusion і допускає один active runtime на storage; кожна write transaction додатково lock-ить singleton control row. Network-ambiguous commit reconcile-иться за operation ID/fingerprint і verified durability lineage: match доводить commit, absence доводить not-committed лише на same lineage або під exact history-preservation certificate, а changed/unavailable/role-unknown lineage лишає settlement suspended. Vendor SQL, pool/reset ordering, DDL migration, durability settings і topology certificate не виходять за opaque adapter. Жоден client-server profile ще не implemented або certified; multi-instance lifecycle widening належить Phase 5.

### Extension/API layer

Facades представляють capabilities application code. Plugins додають trusted in-process behavior через descriptors, hooks, facade providers і Core Extension Port. Звичайний plugin не отримує Composed Runtime або private tokens.

## Public і internal surfaces

| Surface | Основний користувач | Очікувана стабільність | Статус |
|---|---|---|---|
| Domain data contracts | Core, facades, plugins, application DTO code | висока | target-draft |
| Extensia Module та facades | application code | висока | target-draft |
| Plugin API, descriptors, hooks | plugin authors | висока/середня | target-draft |
| Core Extension Port | facades, trusted plugins | середня | target-draft |
| IoC capabilities | Composition Root, runtime modules | internal | target-draft |
| Private tokens/providers | module implementation | private | target-draft |

Правило межі: `IoC provides` не дорівнює Extensia public API. Capability стає public application surface тільки через documented Extensia Module method, facade або plugin contract.

## Composition і lifecycle

### Construction

Створення Extensia Module з config не активує runtime і не публікує ready facades.

### Applied P2-DG1 read boundary

Phase 2 реалізувала exact root-only `createExtensia(config)` boundary і bounded reads. P3-DG1/BP3-01A визначили та materialize-или shared write seams; BP3-02 додала Operation Engine, а BP3-03 — deterministic full-driver fixture, semantic commit, journal і recovery. BP3-04 інтегрувала application-visible Resource create, а BP3-05 — exact own-metadata update через той самий Core port і Operation Engine: latest committed reload під serialized Resource lock, no-change без transaction, own `updated_at`, semantic update commit, prepared index publication, detached read-back і recovery. Applied P3-DG2 semantics реалізовані для hierarchy/order/move, full-replace Marks, namespace-replace/delete KV і leaf soft delete/default tombstone invisibility через той самий Core/Operation Engine/driver-owned commit/index pipeline. На межі завершення Phase 3 concrete driver ще не був реалізований; другого write path не виникло.

### Composition

1. Validate й normalize config та extension descriptors.
2. Зареєструвати config, diagnostics, hooks, IDs, locks, storage, journal, index, operations, sync, core і system-extension modules.
3. Адаптувати user plugins у extension contributions.
4. Прив'язати Storage Driver та consumer-owned ports/adapters.
5. Провалідувати IoC composition graph і окремий Extensia extension graph.
6. Викликати `compose()` і отримати immutable Composed Runtime.

### Startup

1. Запустити Runtime Controller і Storage Driver.
2. Виконати recovery до ready state.
3. Побудувати або підготувати Hot Metadata Index.
4. Ініціалізувати External Change Sync coordinator без background trigger; polling запускається тільки після publication module state `started`.
5. Ініціалізувати system extensions і user plugins у dependency order.
6. Створити system/custom facades через providers.
7. Виконати plugin `start()` і заморозити Facade Registry.
8. Публікувати module state `started` тільки після успіху всіх required stages.

Startup failure після composition вимагає reverse cleanup і disposal. Partially initialized public surface не публікується як ready.

### Shutdown

Нові operations припиняють прийматися; plugins і extensions зупиняються у reverse lifecycle order; subscriptions, sync, runtime resources, driver і Composed Runtime звільняються. Failure одного plugin stop не має назавжди блокувати cleanup інших resources.

## Runtime module map

| Module | Головна відповідальність | Основні capabilities |
|---|---|---|
| `extensia.config` | validated runtime config | config, loading mode, actor, clock |
| `extensia.diagnostics` | normalized diagnostics | diagnostics port |
| `extensia.hooks` | event/filter registry | hook registry |
| `extensia.ids` | ID generation | ID generator |
| `extensia.locks` | process-local write synchronization | async lock queue |
| `extensia.storage` | binding/adapter до external driver | storage driver port |
| `extensia.journal` | journal service над driver | operation journal |
| `extensia.index` | process-local metadata read model | hot metadata index |
| `extensia.operations` | state-changing pipeline | operation engine |
| `extensia.sync` | journal-based external changes | external change sync |
| `extensia.core` | runtime coordination та extension boundary | runtime controller, Core Extension Port |
| `extensia.system-extensions` | default public API contributions | system extensions, facade providers |

Required ports мають бути consumer-owned, якщо module потребує вузького contract. Module-private providers не оголошуються у `provides` і не доступні поза module boundary.

## Operation model

State-changing operation має результат, еквівалентний послідовному виконанню, й проходить єдиний pipeline:

```text
public command / Core request
  → create operation ID and scope
  → build operation plan
  → validate input and driver capabilities
  → resolve affected entities
  → acquire ordered local locks
  → acquire storage-level write lock
  → load current committed state
  → run pre-commit filters
  → validate domain invariants
  → prepare staged changes
  → stage metadata through driver transaction
  → outcome-definite semantic commit metadata + exactly one committed journal entry
  → publish prepared local Hot Metadata Index change
  → emit post-commit hooks
  → release locks/scope
  → return normalized result
```

Кожна operation має explicit scope для operation ID, actor, trace, warnings, cancellation та інших operation-local values. Scope не зберігає durable state і не замінює request або operation plan.

## Consistency model

- **Atomicity:** staged artifacts не стають visible final state до successful publication.
- **Consistency:** після success усі доменні інваріанти лишаються істинними.
- **Isolation through sequence:** process-local Async Lock Queue, storage-level write lock і journal sequence дають sequential write result.
- **Durability:** success означає stable metadata/files і committed journal entry, достатні для recovery.

`committed` journal entry є publication boundary. P3-DG1 уточнює її як driver-owned transaction commit: resolve означає committed, reject — not committed; independent append path заборонений. Core готує immutable index change під recovery-clean exclusive storage session до commit і publish-ить synchronous no-fail swap після resolve. Post-commit local fault не відкочує operation, а повертає committed success із bounded warning та fail-close runtime.

## Storage, index, journal і synchronization

- Storage Driver є durable source of truth і визначає capability mode `full` або `readonly`.
- `readonly` driver відхиляє writes до mutation, але підтримує reads.
- Full-mode ready gate утримує одну recovery-clean exclusive storage session через recovery, committed scan, index build і journal-head capture.
- Persistent journal містить лише committed entries з contiguous positive-decimal sequence від `1`; Timestamp не задає order.
- Full application config використовує opaque driver handle; callable transaction/session не входять у Module або facade boundary.
- Hot Metadata Index є process-local і може бути full у `greedy` mode або partial у `lazy` mode.
- Поточний runtime забезпечує local read-after-write після index update.
- Інші processes бачать зміни після successful External Change Sync/explicit refresh through captured head; у manual mode stale duration unbounded до refresh/restart, а polling cadence не є maximum stale SLA.
- External Change Sync читає journal after volatile local cursor, traversal-ить усі committed own/external entries у total sequence order і atomically reload/invalidate-ить affected entities з cursor+generation publication; actor filtering не змінює traversal.
- Direct external modification files/metadata в обхід Extensia не є базовим supported scenario.

## Facades, plugins і hooks

- `storage` є reserved system facade для commands; `query` — для read-only operations.
- Facade Registry приймає registrations тільки під час startup і заморожується до ready state.
- Custom facade має unique name, declared owner/dependencies і не обходить Core Extension Port.
- Required plugin/facade dependencies валідуються до ready state; config order є лише deterministic tie-breaker.
- Plugin Context містить controlled ports/registries, config і lifecycle info, але не container/get-by-token API.
- Pre-commit filters можуть normalize/validate/transform у межах contract без non-recoverable side effects.
- Post-commit events повідомляють про committed fact і не можуть rollback durable state.

## Errors, diagnostics і testing

Expected validation, lookup, capability, composition, extension і lifecycle failures повертаються як normalized results. Unexpected programming/invariant failures можуть бути thrown, але не маскуються як success.

Diagnostics розділяють composition, startup, operation, driver, sync і extension sources та не розкривають provider instances, secrets або private unsafe metadata.

Tests створюють fresh composition. Fakes й overrides застосовуються до `compose()`, а frozen production runtime не патчиться. Обов'язкові рівні перевірки: domain invariants, graph validation, lifecycle cleanup, readonly behavior, pipeline ordering, journal/index publication, recovery, extension dependencies, facade freeze та hook failure policy.

## Межі архітектури

Baseline не обіцяє dynamic extensions після startup, high-throughput distributed multi-writer model, automatic reconciliation direct storage edits, general-purpose DI access, network transport або untrusted plugin isolation.

## Architecture health

Фактичні Phase 1 foundations і bounded BP2-02/BP2-03/BP2-04 slices не створюють істотного architecture pressure: вони використовують один Composition Root, один consumer-owned shared read seam, один Facade Provider/Registry mechanism і один lifecycle host. Public Module лише bind-ить readonly driver та мапить application lifecycle/results; index лишається derived від driver, а facade/Core cleanup і graph disposal мають розділене ownership. Lifecycle отримав generic synchronous ready-publication hook замість facade-specific wiring. BP2-05 risk-based scan і executable matrices не виявили duplicate wiring, hidden write/Journal path, accidental public Core/IoC surface або потребу в workaround. Ризик design pressure лишається високим через широку цільову surface area. Implementation має йти вертикальними slices з dependency gates з `memory/product/roadmap.md`; спроба додати lazy completeness, writes, plugin API або public Core/IoC через ці internal modules буде сигналом для окремого architecture/design review.

P3-STAB1 повторно підтвердила один consumer-owned Core write port, один Operation Engine, driver-owned semantic commit/journal, prepared index publication і opaque experimental full-driver boundary. Stabilization усунула create parser asymmetry на існуючій facade normalization boundary і generated tarball hygiene defect без нового layer/path. На межі P3-STAB1 `P3-DG2`, concrete durability, hooks і sync ще лишалися окремими gates.

P3-VS3 materialize-ила applied P3-DG2 shared foundation: dense active order; coarse hierarchy lock до session; hierarchy-aware root append; exact sorted prepared write-set після coherent load; one semantic commit/journal entry і atomic batch index для move. Typed storage/index integrity synchronously close-ить intake/facades до cleanup через bounded no-throw fault seam. Delete і Mark/KV лишаються owners P3-VS5/P3-VS4; broad shared VS3 ownership не split-илась.

P3-VS4 розширила той самий Core/Operation Engine pipeline operation kinds `resource.marks.set` і `resource.kv.set`: one-Resource lock, coherent latest-state replacement/no-change, one semantic commit/journal entry, exact fingerprint, existing batch index publication і detached read-back. Descriptor-safe facade parsing, canonical Mark/key ordering та resulting KV limits не створюють другого write authority. На межі P3-VS4 delete лишався owner scope P3-VS5, а concrete Storage Driver, Mark/KV query/index API та plugin semantics ще не були заявлені.

P3-VS5 розширила той самий Core/Operation Engine pipeline operation kind `resource.delete`: coarse hierarchy lock, coherent leaf eligibility, exact sorted target+sibling prepared set зі спільною timestamp, one semantic commit/journal entry/fingerprint, existing batch index publication і detached tombstone result. Default get/tree приховують tombstone, а update/move/Marks/KV використовують existing not-found semantics; startup/recovery повторно використовують active-parent і dense-order integrity validation. На межі P3-VS5 restore/include-deleted/cascade/purge/retention, concrete Storage Driver, sync та plugins ще лишалися deferred; другого write authority або pipeline не створено.

P3-STAB свіжо перевірила Phase 3 на Node.js `v24.17.0` / npm `11.13.0`: focused API/semantic/protocol/recovery/concurrency/integrity matrices, full 20-file / 202-test package gate і два byte-identical 126-path tarballs зелені. Production correctness defect не знайдено; packed type probe доповнено move/delete public types. Source scan підтвердив один Core write runtime, один driver session boundary, prepared batch index publication і відсутність independent journal runtime/service або реалізованих deferred restore/undelete/plugin/hook/sync paths. Нового architecture pressure чи workaround не додано.

P4-WP1 materialize-ила `local-sqlite-v1` як один internal adapter за чинним `FullResourceDriverAdapter`: SQLite schema/path/pragma/lock/recovery лишаються profile-local, Resource canonical JSON використовує shared storage codec, а Core/Operation Engine/public root не отримали SQL або physical layout knowledge. Один SQLite transaction є authority для Resource rows, operation idempotency і committed journal; external blob, independent journal, PID lock, ORM/dependency або parallel write path не додані. Exact schema/integrity/readonly gates, COMMIT reconciliation, cross-process contention і crash rollback мають executable evidence; ширші support claims лишаються окремими gates. Нового істотного architecture pressure або workaround не виявлено.

P4-VS1 materialize-ила один internal production composition owner `createLocalSqliteExtensia`, який вибирає full/readonly concrete adapter і передає його незміненому `createExtensia` composition path. Shared fake-vs-SQLite matrix доводить create/update/move/dense order/Marks/KV/leaf-delete parity, а packed і fresh-process probes — durable read-back, contiguous journal, readonly no-write, outcome-definite pre/post-COMMIT cut points і відсутність public physical-layout leakage. Root exports, package subpaths, Core contracts, Operation Engine, index publication і journal authority не розширені; другого write path або test-only architecture не створено.

P4-VS2 materialize-ила Asset metadata lifecycle без parallel engine або publication path: default facade передає normalized command у Core Asset port, який використовує той самий runtime-owned Operation Engine, identity source, Resource index і driver session/transaction. Effective transition готує canonical sorted Resource snapshots та exact sorted `asset_changes`, а driver atomically commit-ить metadata, generation/payload action і один journal row до batch-index publication. Coherent command loads і startup scan fail-close перевіряють storage-wide Asset/payload invariants. Generic public readonly boundary fail-close відхиляє ambiguous uploading lineage target, а concrete SQLite readonly driver надає Core token-free readiness proof через internal symbol capability зі strict-validated payload state. Initial internal create materialize-ить opaque staged generation; root runtime values та public `AssetSnapshot` shape не змінені.

P4-VS3 materialize-ила storage-issued adapter-epoch-scoped opaque handle та один shared capability map для deterministic fake і `local-sqlite-v1`. Trusted non-root composition resolver передає internal Core upload port; root exports, ordinary `StorageFacade`, `AssetSnapshot` і public full-driver author contract не розширені. Stage копіює caller bytes, fixed-chunk materialize-ить їх invisible в окремій SQLite transaction без journal, а finish/abort/begin проходять чинний Operation Engine semantic commit. Driver-owned `generation.publish` atomically видаляє old committed payload за replacement, переносить staged chunks під Asset ID, видаляє generation і commit-ить metadata + exact `asset_changes` + one journal row в одній durability domain. Startup scan fail-close перевіряє digest/length/chunk continuity; old runtime handle не має authority після adapter reopen. Synchronous 16 MiB envelope виміряний, але не є SLA або universal support claim.

Current SQLite physical schema має `user_version=2`, exact `asset_upload_generations`, `payloads` і `payload_chunks`. Upload IDs key-ять invisible staged rows, Asset IDs — committed rows, а generation row є atomic ownership bridge; schema-version increment для P4-VS3 не потрібний. Full owner після strict validation атомарно мігрує єдиний accepted legacy version `1` лише з порожнім legacy payload seam; readonly version `1` валідовується без mutation. Unknown/corrupt/nonempty unsupported legacy state fail-close; migration не є automatic repair.

## Джерела

- `memory/references/extensia-v2/runtime-architecture-v2-ioc.md`.
- `memory/references/extensia-v2/extension-and-api-model-v2-ioc.md`.
- `memory/references/extensia-v2/domain-model-v2.md` для доменних інваріантів, які runtime має підтримувати.

## Applied P4-DG2 target

Asset operations розширюють той самий facade → Core port → Operation Engine → driver semantic commit pipeline. Full sorted Resource snapshots, exact logical Asset change, compound payload action і one journal entry формують один prepared write-set; reassign atomically stages two Resources. Driver generation state не є public DTO/path. Index batch publish-иться post-commit; P5 indexes derived. Separate staged-file publication, cross-Resource lineage cascade або facade/direct-driver upload write є architecture stop condition.

## Applied P5-DG1 target

Read model має одну immutable coherent generation з Resource/children, Asset owner, primary, same-Resource lineage reverse, exact Mark lookup і coverage proofs. `greedy` ready потребує complete generation; `lazy` допускає selective internal coverage, але кожний success complete для declared scope. Unknown cache key не є missing/empty. Full/readonly adapters використовують один consumer-owned semantic observation port без raw session/transaction/cursor leakage. Local commit публікує structural-sharing/delta generation одним synchronous no-fail root swap; ordinary write не rebuild-ить O(N) maps. Completeness не заявляє cross-process freshness; external ordering/refresh лишаються P5-DG2.

## Applied P5-DG2 target

External Change Sync має один process-local publication coordinator для immutable read-model generation, volatile committed journal cursor, local post-commit delta, lazy load і external refresh. Supported sync і legacy manual `static-unsupported` є tagged branches; legacy branch не має cursor/head/sync actor. Explicit `query.refresh()` є correctness primitive; default manual, opt-in polling лише admission-epoch coalesced bounded trigger, notification deferred як optional wake hint. Full/readonly adapters використовують internal coherent committed-change observation без raw session/layout; readonly zero-write. Sequence є єдиною order authority, actor/timestamp diagnostic-only. Restart supported branch rebuild-ить generation і capture-ить head з тієї самої observation; durable cursor без atomic durable checkpoint заборонений. Initial support candidates лишаються gated executable stabilization/audit/human gate.

## P5-VS1 materialization

P5-VS1 bind-ить public query/config/inspection до того самого runtime-owned P5-HARD1 actor і P5-WP1 coordinator. Lazy observation виконує I/O поза mutation section, захоплює revision до I/O, publish-ить лише через compare-and-publish і re-observe-ить stale candidate. Selective local overlays зберігають local read-after-write, але identical або closure-subsumed tombstone authority не руйнує щойно доведений one-level coverage. Local journal sequence jump atomically залишає cursor позаду й робить safe freshness `unknown`; malformed observation/build contradiction fail-close-ить через existing RuntimeFaultSink. Supported readonly seam виконує лише startup/change observations і zero durable writes. Duplicate actor/coordinator/journal, hidden polling scheduler та accidental Core/storage export відсутні; concrete SQLite sync/polling лишається architecture stop boundary P5-VS2.

Storage-global Mark query не має implicit complete-read fallback: exact selector capability публікує selective subset з opaque stamp, а generic full/readonly seams без такої capability повертають query unavailable до acquisition/listing.
