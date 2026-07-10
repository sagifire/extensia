# Поточний стан доменної реалізації

As Of: 2026-07-10
Status: current

## Фактичний стан

- `TASK-07.26-0005` реалізувала Node.js 24 ESM TypeScript tooling/package baseline з committed lockfile і повним package gate.
- `TASK-07.26-0007` реалізувала internal pure domain contract kernel у `src/domain/`: branded UUID v4 `IDString`, epoch-millisecond `Timestamp`, recursive JSON-safe types/validators/cloners та deeply readonly Resource/Asset/Mark/KV snapshots.
- Pure validators перевіряють canonical scalar/JSON shape, Asset internal/external combinations, Mark int32 value, KV shape, primary cardinality, duplicate Asset IDs у межах snapshot і Mark identity у межах Resource snapshot.
- Snapshot builders повертають detached nested arrays/records/`Asset.data` без залежності від runtime freeze; це підтверджено alias-mutation tests.
- Domain modules збираються як internal artifacts, але root `src/index.ts` не експортує domain API, а package `exports` не відкриває domain subpaths.
- `TASK-07.26-0008` реалізувала internal `src/composition/` skeleton на exact `@sagifire/ioc@0.0.2`: namespaced tokens, один fresh Composition Root, fail-fast graph validation, allowlisted capabilities, safe detached inspection/diagnostics, controlled scopes і disposal.
- `TASK-07.26-0010` реалізувала strict internal `src/runtime/lifecycle.ts`: immutable generic lifecycle contributions, validation safe ID/order до startup, sequential ordering за `(order, id)`, explicit state machine, resolved-start ledger, reverse rollback/stop, safe failure aggregates й at-most-once composed-runtime disposal.
- `TASK-07.26-0017 / RUN-001` розширила lifecycle synchronous `publishReady`/`unpublishReady` boundary: frozen facade surface публікується без `await` безпосередньо перед state `started`, а stop закриває intake й прибирає surface до cleanup.
- `TASK-07.26-0022` materialized один internal consumer-owned `CORE_RESOURCE_READ_PORT` contract/token без runtime implementation або package export.
- `TASK-07.26-0016 / RUN-001` реалізувала internal `src/core/` read-only slice: consumer-owned driver port, greedy Resource-by-id/parent-to-children index, exact shared Core read-port adapter і lifecycle contribution для open/scan/close.
- Greedy startup scan clone-ить і перевіряє canonical Resource aggregates, відхиляє duplicate IDs, parent cycles/self-cycles та orphan relations; children є лише reverse projection `parent_id`, deterministic sorted `(order_index, id)`.
- Кожен Core read success повторно clone-ить Resource/tree snapshot; missing ID повертає bounded `RESOURCE_NOT_FOUND`, а malformed loaded model лишається safe startup failure без raw driver details.
- `TASK-07.26-0017 / RUN-001` реалізувала internal shared Facade Provider/Registry у `src/runtime/facades.ts` і system extension `extensia.default-api`: synchronous contributions, trusted system provenance, exact names, reserved `query`/`storage`, duplicate/dependency/cycle validation, deterministic topological creation, freeze/publication, reverse rollback/disposal та safe inspection.
- Internal `query` adapter використовує exact `CORE_RESOURCE_READ_PORT`, нормалізує UUID v4 і розділяє `INVALID_RESOURCE_ID`/`RESOURCE_NOT_FOUND`; internal `storage.createResource` повертає `STORAGE_READONLY` без inspection input. Stale calls повертають `MODULE_NOT_READY`, а admitted reads drain-яться до Core cleanup.
- `TASK-07.26-0011 / RUN-001` повторно перевірила сукупний Phase 1 baseline: clean install і повний package gate зелені, 7 test files / 75 tests пройдені, 36 emitted `dist/**` artifacts відтворюються byte-identical, а packed allowlist містить 38 ESM/type/package files без accidental public surface.
- Internal runtime host збирається через чинний fresh Composition Root і synchronous multi contributions; active-resource cleanup належить contribution `stop()`, а graph/provider cleanup — final `composition.dispose()` без duplicate ownership.
- Production має мінімальний internal readonly driver port і Resource-only greedy index, але не final/public Storage Driver API, concrete durable driver, lazy mode, persistence або recovery semantics.
- IoC conformance probes лишаються test-only; production subsystem map тепер має bounded Core Resource read module, shared Facade Registry і `extensia.default-api`, raw composer/runtime/tokens не відкриті через root або package subpaths.
- `TASK-07.26-0018 / RUN-001` реалізувала root-only public Extensia Module read slice: `createExtensia`, descriptor-safe config capture, six-state lifecycle, normalized results, safe inspection і nullable stable `query`/`storage` accessors.
- Public Module створює один fresh production composition із accepted BP2-02/BP2-03 modules; facade publication лишається Registry-owned, stale calls використовують existing readiness gate, а cleanup/disposal лишаються Runtime Lifecycle Host-owned.
- Root public query надає лише exact Resource-by-id і one-level tree reads; public storage command є readonly proof із `never` success та не інспектує input. Packed Node.js 24 consumer доводить runtime/type surface й відсутність internal subpath exports.
- `TASK-07.26-0019 / RUN-001` повторно перевірила сукупний Phase 2 baseline: clean install, 10 test files / 112 tests, focused Core/Registry/public/lifecycle matrices, exact root runtime/type surface, packed Node.js 24 consumer і controlled build/pack reproducibility зелені; production code або dependencies не змінювалися, repeated independent audit `REVIEW_READY`, результат прийнятий whole-task human review.
- Plugins/custom facade API, writes/operation pipeline, persistence, journal, locks, sync і recovery ще відсутні.
- Durable storage format і міграція даних попередньої версії не підтримуються; legacy memory/data не переносились.
- Три documents у `memory/references/extensia-v2/` є draft source specifications майбутнього стану, а не доказом реалізованої поведінки.

## Поточні гарантії

На current implementation boundary фактично гарантуються canonical UUID v4 normalization/validation, safe-integer Timestamp у ECMAScript Date range, finite JSON-safe recursive values, deeply readonly type contracts, detached snapshot ownership, executable IoC composition conformance, lifecycle `compose -> start -> ready/failed -> stop/dispose`, bounded greedy Resource read model і frozen Facade Registry з atomic ready publication. Public Extensia Module мапить ці guarantees у normalized application results та safe inspection; lifecycle/facade failures містять тільки Extensia-owned codes, stages і validated safe subjects, без raw error details, provider values, config або runtime instances. Resource reads використовують exact shared consumer-owned port; readonly storage adapter не читає input і не додає write/journal dependency. Root namespace містить лише runtime value `createExtensia` та exact public type exports, package не відкриває internal subpaths. Durable guarantees, final Storage Driver і operation pipeline відсутні. Цільові інваріанти ширших slices описані окремо в `memory/domain/target/model.md` і `memory/domain/rules.md`.

## Межа current/target

Resource/Asset/Mark/KV data-contract kernel, IoC composition/conformance skeleton, generic internal lifecycle host, bounded readonly Core Resource index, shared internal Facade Registry, default system facade adapters і bounded public Extensia Module read contract є current implementation. Це не означає наявність final Storage Driver semantics, successful write API, durable guarantees, plugin/custom facade API або public concurrency/retry policy. Operation pipeline, durable storage semantics і plugin API не можна позначати як current implementation до відповідних vertical slices та review. Після кожного implementation run цей документ треба синхронізувати з фактичним кодом і tests.

## Джерела

- `memory/tasks/plan/TASK-07.26-0001-prepare-extensia-v0-1-0-transition/runs/RUN-001/result.md`.
- Поточний `package.json`.
- `memory/tasks/plan/TASK-07.26-0005-bp1-01-esm-typescript-package-baseline/runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0007-bp1-02-pure-domain-contract-kernel/runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0008-bp1-03-ioc-composition-skeleton/runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0010-bp1-04-lifecycle-controller-slice/runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0011-bp1-05-phase-1-stabilization/runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0022-bp2-01a-materialize-read-port/runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0016-bp2-02-read-only-core-index/runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0017-bp2-03-facade-registry-system-facades/runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0018-bp2-04-public-resource-read-slice/runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0019-bp2-05-phase-2-stabilization/runs/RUN-001/result.md`.
- Фактична структура репозиторію станом на 2026-07-10.
