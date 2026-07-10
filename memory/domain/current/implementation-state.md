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
- IoC modules у conformance coverage є test-only probes; production `extensia.*` subsystem module map не реалізовано, raw composer/runtime/tokens не відкриті через root або package subpaths.
- Core, Storage Driver, facades, plugins, Extensia lifecycle controller, operation pipeline, persistence, journal, indexes і recovery ще не реалізовані.
- Durable storage format і міграція даних попередньої версії не підтримуються; legacy memory/data не переносились.
- Три documents у `memory/references/extensia-v2/` є draft source specifications майбутнього стану, а не доказом реалізованої поведінки.

## Поточні гарантії

На internal implementation boundary фактично гарантуються canonical UUID v4 normalization/validation, safe-integer Timestamp у ECMAScript Date range, finite JSON-safe recursive values, deeply readonly type contracts, detached snapshot ownership та executable IoC composition conformance. Composition diagnostics/inspection не серіалізують raw error details, provider values, module metadata або runtime instances. Runtime lifecycle/API та durable guarantees відсутні, бо kernels навмисно не підключені до public root або operation pipeline. Цільові інваріанти ширших slices описані окремо в `memory/domain/target/model.md` і `memory/domain/rules.md`.

## Межа current/target

Resource/Asset/Mark/KV data-contract kernel і IoC composition/conformance skeleton є current internal implementation після `BP1-02`/`BP1-03`, але це не означає наявність production runtime behavior, public facade contract, lifecycle semantics або durable guarantees. Operation pipeline, storage semantics і plugin API не можна позначати як current implementation до відповідних vertical slices та review. Після кожного implementation run цей документ треба синхронізувати з фактичним кодом і tests.

## Джерела

- `memory/tasks/plan/TASK-07.26-0001-prepare-extensia-v0-1-0-transition/runs/RUN-001/result.md`.
- Поточний `package.json`.
- `memory/tasks/plan/TASK-07.26-0005-bp1-01-esm-typescript-package-baseline/runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0007-bp1-02-pure-domain-contract-kernel/runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0008-bp1-03-ioc-composition-skeleton/runs/RUN-001/result.md`.
- Фактична структура репозиторію станом на 2026-07-10.
