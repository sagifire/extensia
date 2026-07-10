# Контекст RUN-001

Preparation Status: prepared
Execution Status: completed
Status: review-ready
Started: 2026-07-10

## Роль і режим

- Agent Role: Agent Implementer.
- Execution Mode: `autonomous-implementation`.
- User activation: «Виконай задачу BP2-04 / TASK-07.26-0018. Я дозволяю запуск субагентів для ревю.»

## Канонічні джерела

- `technical/public-read-contract.md` і ADR-0007 визначають exact root contract, config extraction, lifecycle/publication, facade methods, failures, inspection та compatibility boundaries.
- `src/core/resource-read-runtime.ts` є прийнятим BP2-02 provider над readonly driver/greedy index.
- `src/runtime/facades.ts` і `src/system-extensions/default-api/facades.ts` є прийнятим BP2-03 Registry/system provider path.
- `src/runtime/lifecycle.ts` є єдиним accepted runtime startup/rollback/stop/disposal host.
- `domain/scalars.ts`, `domain/json.ts` і `domain/snapshots.ts` є canonical public type/data-contract sources.
- `technical/rules.md` забороняє facade/Core bypass, hidden write, public IoC leakage та unsafe diagnostics.

## Початковий factual state

- BP2-02 і BP2-03 мають status `done`, memory synchronized і whole-task human approval.
- Internal read port, Core index, Registry, `query`/`storage` adapters та publication/drain semantics реалізовані; root `src/index.ts` ще порожній.
- Worktree містить прийняті, але не committed артефакти BP2-02/BP2-03; RUN-001 зберігає їх і будує public integration поверх них.

## Exact integration boundary

- Extensia Module є єдиним public owner composition і не дублює internal host/state machines.
- Public accessors показують лише Registry-created stable facades після successful startup; stop приховує accessors до cleanup, stale references використовують existing gate.
- Config envelope читається через own data descriptors; caller envelope не reread після construction, driver object не clone-иться й не freeze-иться.
- Public inspection агрегує тільки Extensia-owned safe codes/stages/validated subjects, без config, driver, raw errors, stack або private token IDs.
- Production instrumentation для zero-write proof обмежена public readonly driver boundary; потреба у Journal/write test double є architecture blocker.

## Відомі ризики

- Public lifecycle wrapper може випадково створити другу state machine замість thin application mapping existing host; реалізація має зберігати єдине resource ownership/cleanup.
- Facade publication у internal host передує resolution public `start()` promise; public accessors/inspection мають лишатися hidden до module state `started`.
- Packed declaration surface може випадково відкрити internal names або omit exact public types; package consumer і root export snapshot є обов'язковими.
