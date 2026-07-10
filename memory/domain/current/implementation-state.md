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
- Internal runtime host збирається через чинний fresh Composition Root і synchronous multi contributions; active-resource cleanup належить contribution `stop()`, а graph/provider cleanup — final `composition.dispose()` без duplicate ownership.
- Storage-shaped readonly fixture існує тільки в integration test і не визначає Storage Driver API, durability або recovery semantics.
- IoC conformance modules і storage-shaped lifecycle fixture є test-only probes; production subsystem module map поза мінімальним lifecycle capability не реалізовано, raw composer/runtime/tokens не відкриті через root або package subpaths.
- Core, Storage Driver, facades, plugins, Extensia Module/public lifecycle, operation pipeline, persistence, journal, indexes і recovery ще не реалізовані.
- Durable storage format і міграція даних попередньої версії не підтримуються; legacy memory/data не переносились.
- Три documents у `memory/references/extensia-v2/` є draft source specifications майбутнього стану, а не доказом реалізованої поведінки.

## Поточні гарантії

На internal implementation boundary фактично гарантуються canonical UUID v4 normalization/validation, safe-integer Timestamp у ECMAScript Date range, finite JSON-safe recursive values, deeply readonly type contracts, detached snapshot ownership, executable IoC composition conformance та internal lifecycle `compose -> start -> ready/failed -> stop/dispose`. Lifecycle failures містять тільки Extensia-owned codes, stages і optional validated safe contribution IDs; raw error details, provider values, config і runtime instances не серіалізуються. Root namespace лишається без exports, package не відкриває internal subpaths. Public lifecycle/API та durable guarantees відсутні, бо slice навмисно не визначає Extensia Module, Storage Driver чи operation pipeline. Цільові інваріанти ширших slices описані окремо в `memory/domain/target/model.md` і `memory/domain/rules.md`.

## Межа current/target

Resource/Asset/Mark/KV data-contract kernel, IoC composition/conformance skeleton та generic internal lifecycle host є current internal implementation після `BP1-02`/`BP1-03`/`BP1-04`. Це не означає наявність public Extensia Module/facade contract, Storage Driver semantics, durable guarantees або final public concurrency/retry policy. Operation pipeline, storage semantics і plugin API не можна позначати як current implementation до відповідних vertical slices та review. Після кожного implementation run цей документ треба синхронізувати з фактичним кодом і tests.

## Джерела

- `memory/tasks/plan/TASK-07.26-0001-prepare-extensia-v0-1-0-transition/runs/RUN-001/result.md`.
- Поточний `package.json`.
- `memory/tasks/plan/TASK-07.26-0005-bp1-01-esm-typescript-package-baseline/runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0007-bp1-02-pure-domain-contract-kernel/runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0008-bp1-03-ioc-composition-skeleton/runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0010-bp1-04-lifecycle-controller-slice/runs/RUN-001/result.md`.
- Фактична структура репозиторію станом на 2026-07-10.
