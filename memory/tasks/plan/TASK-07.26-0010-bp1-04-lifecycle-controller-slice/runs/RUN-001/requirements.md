# Вимоги RUN-001

Preparation Status: prepared
Execution Status: not started
Agent Role: Agent Implementer
Execution Mode: autonomous-implementation
Created: 2026-07-10

## Результат

Реалізувати internal Runtime Controller/lifecycle host поверх чинного Composition Root із deterministic sequential startup, exact rollback/stop/dispose ownership, safe diagnostics та strict root package encapsulation.

## In scope

- Internal lifecycle descriptor capability: immutable safe `id`, safe-integer `order`, `start(): Promise<void>`, `stop(): Promise<void>`.
- Pre-start validation: ID pattern `^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$`, length 1..128, unique IDs, safe-integer orders.
- Sequential startup за ascending `(order, id)` і cleanup ledger лише для resolved starts.
- Contribution-owned cleanup partial acquisition до rejected start; controller не викликає stop для unresolved start.
- Reverse ledger cleanup, at-most-once stop attempts і at-most-once composed-runtime disposal.
- Internal states `created`, `starting`, `started`, `stopping`, `stopped`, `failed` без public compatibility claim.
- Safe normalized results/diagnostics та deterministic failure aggregation.
- Storage-shaped readonly lifecycle fixture як test-only generic contribution без driver semantics.
- Fresh-composition internal integration harness для construction/start/failure/rollback/stop/dispose.
- Packed root boundary smoke: zero exports, bounded no-side-effects import, unchanged exports, no CJS, exhaustive internal subpath rejection.

## Exact lifecycle policy

- Construction/composition не запускає active resources і не публікує ready.
- Descriptor validation сканує contributions у deterministic registration order до будь-якого resource start. Invalid ID/order або duplicate valid ID створює ordered `LIFECYCLE_VALIDATION_FAILED` entries, після чого host виконує at-most-once composed-runtime disposal і переходить у `failed`.
- Validation aggregate order: validation entries у registration order, потім optional `RUNTIME_DISPOSE_FAILED`. Для invalid unsafe ID поле contribution ID omitted; raw invalid value не копіюється. Для duplicate safe ID дозволено validated ID.
- `start(created)` запускає validation/startup; `start(started)` — idempotent success.
- `start(starting|stopping)` — `LIFECYCLE_BUSY`; `start(stopped|failed)` — `LIFECYCLE_INVALID_STATE`; restart/retry absent.
- `stop(created)` виконує dispose й переходить у stopped; `stop(started)` виконує reverse cleanup + dispose; `stop(stopped)` — idempotent success.
- `stop(starting|stopping)` — `LIFECYCLE_BUSY`; waiting/cancellation absent.
- Rejected contribution start locally cleans partial acquisition; controller ledger includes only resolved starts.
- Startup failure: primary start failure, reverse cleanup all ledger entries without short-circuit, dispose, state failed.
- `stop(failed)` не повторює rollback/stop/dispose, переводить state у stopped і повертає success; prior diagnostics retained inspection-only.
- Normal stop завжди завершує state stopped; stop/dispose failures повертаються normalized aggregate.
- Stop/dispose attempt позначається до await і ніколи автоматично не повторюється.
- Aggregate order: primary start failure; reverse-order stop failures; dispose failure. Normal stop: reverse-order stop failures; dispose failure.

## Safe failure contract

Дозволені codes: `LIFECYCLE_VALIDATION_FAILED`, `LIFECYCLE_START_FAILED`, `LIFECYCLE_STOP_FAILED`, `RUNTIME_DISPOSE_FAILED`, `LIFECYCLE_BUSY`, `LIFECYCLE_INVALID_STATE`. Entry містить тільки code, stage та optional already-validated safe contribution ID. Для invalid ID поле omitted. Raw invalid ID, error message/cause/details, provider instances, config і secrets не копіюються.

## Package boundary contract

- `src/index.ts`/built root namespace мають zero exports.
- `package.json#exports` лишає тільки `.` і `./package.json`.
- Fresh child import завершується в timeout без persistent handles.
- До/після import незмінні bounded snapshots: `Reflect.ownKeys(globalThis)`, `process.env`, process event names/listener counts.
- Tarball не містить CJS.
- Кожний emitted internal JS path перевіряється як direct і `dist/*` package subpath; усі повертають exact `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- Окремо відхиляються aliases `internal`, `testkit`, `driver`, `plugin`; `./package.json` є єдиним allowed non-root subpath.
- Type-only consumer root import проходить; internal construction/start у packed consumer відсутні.

## Межі

- Не змінювати root/package exports і не додавати public lifecycle/runtime/domain symbols.
- Не реалізовувати Extensia Module public constructor/factory/config/result/state/inspection.
- Не створювати Storage Driver API, durability/recovery/journal/index/Core/facade/plugin behavior.
- Не реєструвати один active resource одночасно як lifecycle contribution і IoC disposer.
- Не використовувати second root, service locator, post-compose mutation або test-only production bypass.

## Required tests

- Descriptor invalid/duplicate ID/order validation і deterministic sorting.
- Validation failure виконує disposal at most once, не запускає contributions, формує deterministic validation-then-dispose aggregate й не переносить unsafe invalid ID.
- Failing contribution locally cleans partial state; controller не stop-ає unresolved contribution.
- Ledger inclusion only after resolved start; reverse cleanup exact order.
- Cleanup reject/dispose reject без short-circuit; deterministic aggregate.
- At-most-once stop/dispose, `stop(failed)` no-repeat, idempotent started/stopped cases, busy/invalid transitions.
- Safe diagnostic sentinel coverage.
- Fresh composition/isolation і package boundary matrix.

## Критерій green gate

Усі task/run acceptance criteria мають automated evidence; root API/exports незмінні; `npm run check` і `git diff --check` зелені; independent audit не має незакритих blocker/high/medium findings; result містить architecture-pressure review і повну memory sync.
