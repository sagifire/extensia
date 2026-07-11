# TASK-07.26-0010: BP1-04 — Реалізувати internal lifecycle controller slice

Status: done
Type: feature
Execution Mode: autonomous-implementation
Created: 2026-07-10
Owner Role: Product Lead Hat / System Engineer Hat
Current Run: RUN-001
Current Research: n/a
Current Fixation: n/a

## Мета

Реалізувати internal architecture-enabling slice `compose -> start -> ready/failed -> stop/dispose` поверх прийнятих domain та IoC foundations без нового public root API, facade/plugin surface або Storage Driver integration contract.

## Продуктовий контекст

`BP1-01`, `BP1-02` і `BP1-03` створили зелений tooling/package baseline, pure domain contract kernel та internal IoC composition/conformance skeleton. Owner decision у `TASK-07.26-0013/FIX-001` звузив BP1-04 до internal `P1-WP4`: lifecycle correctness доводиться internal integration harness, root package лишається без runtime/domain exports, а original public `P1-VS1` successful host scenario deferred до owner gate public config/storage integration.

## Обсяг

- Реалізувати internal Runtime Controller і lifecycle host, який володіє composed-runtime disposal.
- Реалізувати immutable generic internal lifecycle contribution descriptor: safe `id`, deterministic `order`, async `start()`/`stop()`.
- Реалізувати pre-start descriptor validation, sequential deterministic startup, resolved-start cleanup ledger і reverse cleanup.
- Реалізувати explicit internal lifecycle state machine та normalized Extensia-owned results/diagnostics.
- Гарантувати local partial-start cleanup ownership contribution-ом, at-most-once contribution stop і at-most-once composed-runtime disposal.
- Реалізувати deterministic failure aggregation без raw errors, causes, instances, secrets або unsafe config.
- Додати readonly storage-shaped lifecycle fixture як test-only contribution без Storage Driver semantics.
- Перевірити construction/start/failure/rollback/stop/disposal тільки internal integration harness із fresh composition per scenario.
- Посилити packed package boundary smoke без construction/start runtime: import, bounded no-side-effects, zero exports, unchanged exports map, no CJS та exhaustive internal subpath rejection.

## Поза обсягом

- Public Extensia Module factory/class/config/result/state/inspection contract або successful public start.
- Будь-які нові root/subpath runtime, lifecycle, domain, testkit, driver чи plugin exports.
- `storage`/`query` facades, Facade Registry, plugin/extension API, hooks або dynamic extensions.
- Public/full Storage Driver contract, durable persistence, journal, index, recovery, locks або external sync.
- Resource/Asset/Mark/KV read/write behavior і Core operation pipeline.
- Restart/retry, lifecycle operation waiting/cancellation або final public concurrency policy.
- Production subsystem module map поза мінімумом internal lifecycle slice.

## Залежності та readiness

- `BP1-01` (`TASK-07.26-0005`), `BP1-02` (`TASK-07.26-0007`) і `BP1-03` (`TASK-07.26-0008`) завершені та прийняті людиною.
- Owner decision `TASK-07.26-0013/FIX-001` визначає strict internal/public/package boundary і прибирає попередній public-contract activation blocker.
- ADR-0003/ADR-0006 та technical architecture/rules/open questions задають composition/lifecycle constraints, але не стабілізують internal names як public API.
- `RUN-001` активовано 2026-07-10 явною командою користувача; task/progress/state і run execution metadata синхронізовано перед implementation.
- Після завершення TASK-0013 і явної команди activation інших design blockers для RUN-001 немає.

## Критерії приймання

- [x] Composition/construction не запускає active resources і не публікує internal ready state.
- [x] Descriptor IDs/orders валідуються до startup; invalid/duplicate data завершується normalized pre-start failure, at-most-once runtime disposal і state `failed` без active resource starts.
- [x] Startup є sequential і deterministic за `(order, id)`; ready/started публікується тільки після всіх resolved starts.
- [x] Contribution із rejected start локально прибирає partial acquisition; controller не додає його в ledger і не викликає його `stop()`.
- [x] Rollback/stop очищає resolved-start ledger у reverse order, не short-circuit після failure й викликає кожний stop at most once.
- [x] Lifecycle host викликає composed-runtime disposal at most once; active-resource cleanup і graph/provider disposal не дублюють ownership.
- [x] Failure aggregates мають deterministic order і містять тільки Extensia-owned codes, safe IDs та stages.
- [x] Internal start/stop/busy/invalid/retry policy відповідає exact RUN-001 requirements і покрита transition matrix.
- [x] Storage-shaped fixture лишається test-only generic lifecycle contribution без driver/durability contract claims.
- [x] Root namespace має zero exports; package exports лишаються `.` і `./package.json`; all emitted internal direct/dist subpaths недоступні.
- [x] Packed root import у fresh child завершується без timeout/persistent handles та не змінює bounded global/env/listener snapshots.
- [x] `RUN-001` містить повний package/lifecycle evidence, independent audit, architecture-pressure review і memory sync.

## Перевірка

- Descriptor validation і deterministic ordering matrix.
- Validation failure disposal/aggregate matrix, включно з dispose reject та omission unsafe invalid ID.
- Lifecycle transition matrix для created/starting/started/stopping/stopped/failed.
- Partial-start ownership, resolved-start ledger і reverse cleanup tests.
- Injected start/stop/dispose failures, aggregate order і at-most-once call assertions.
- Safe diagnostics/inspection sentinel tests.
- Fresh-composition та cross-instance isolation tests.
- Root namespace/exports/no-CJS checks, bounded no-side-effects child import і exhaustive emitted internal subpath rejection.
- Повний clean package gate, успадкований від `BP1-01`.

## Пов'язана пам'ять

- `memory/state.md`
- `memory/product/roadmap.md`
- `memory/technical/architecture.md`
- `memory/technical/rules.md`
- `memory/technical/open-questions.md`
- `memory/technical/decisions/ADR-0003-internal-ioc-composition.md`
- `memory/technical/decisions/ADR-0006-phase-1-tooling-and-ioc-baseline.md`
- `memory/domain/current/implementation-state.md`
- `memory/reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md`
- `memory/tasks/plan/TASK-07.26-0008-bp1-03-ioc-composition-skeleton/task.md`
- `memory/tasks/plan/TASK-07.26-0013-fix-internal-bp1-04-boundary-and-prepare-run/fixations/FIX-001.md`

## Прогони

- [RUN-001](runs/RUN-001/index.md) - review-ready - Internal lifecycle controller slice з green independent audit і package gate.

## Дослідження

Немає.

## Фіксації

Немає task-local fixations. Owner decision і execution-boundary fixation зберігаються в `TASK-07.26-0013/FIX-001`.

## Очікувана синхронізація пам'яті

- Technical/current implementation state: оновити factual lifecycle/controller status, tests і limitations після implementation.
- Product roadmap: не заявляти виконання deferred public `P1-VS1`; BP1-04 закриває тільки internal `P1-WP4`.
- Accepted ADR/target architecture: очікувано `not needed`; discrepancy або нове рішення проводити окремою fixation/ADR.
- Task/run/indexes/state: оновити status, evidence та навігацію.
- Product/domain/knowledge memory: очікувано `not needed` без confirmed discrepancy.

## Architecture pressure

Заборонені public/test-only lifecycle exports, fake-only parallel architecture, de facto Storage Driver contract, second Composition Root, service locator, mutable post-compose overrides, duplicate cleanup ownership, speculative subsystem modules і public compatibility claims із internal state/result names. Якщо implementation потребує public config/storage decision, task зупиняється для owner gate.

## Додатковий контекст

Planning identifier `BP1-04` тепер простежується до internal `P1-WP4`. Original application-facing `P1-VS1` superseded/deferred і не вважається виконаним цією задачею. Оцінка лишається `C3`, обсяг L, ризик високий; рекомендований агент і незалежний аудитор — `сильний`.
