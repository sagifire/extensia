# Вимоги RUN-001

Preparation Status: prepared
Execution Status: completed
Status: review-ready
Started: 2026-07-10
Agent Role: Agent Implementer
Execution Mode: autonomous-implementation
Created: 2026-07-10

## Результат

Реалізувати exact root-only public contract і application-visible шлях `createExtensia -> start -> query/storage facades -> stop` поверх прийнятих BP2-02 Core Resource read та BP2-03 Facade Registry/system adapters без другого runtime graph або internal API leakage.

## In scope

- Exact root type/value exports із `technical/public-read-contract.md`: factory, module/lifecycle/result/inspection contracts, scalar/JSON/Resource snapshots, readonly driver config і bounded `query`/`storage` facades.
- Side-effect-free `createExtensia(config)` із descriptor-safe extraction без getters/accessors, invalid-config sentinel, captured exact driver identity та fresh isolated module instance.
- Один production composition: readonly driver binding, BP2-02 Core module, `extensia.default-api`, BP2-03 Registry і existing Runtime Lifecycle Host.
- Six-state public lifecycle, idempotent allowed transitions, normalized config/start/stop failures, atomic facade visibility, stable ready facade identities, stale-call readiness failure й safe detached inspection.
- Exact Resource-by-id/one-level-tree public scenario, distinct invalid/missing failures, detached success snapshots і readonly create rejection before input inspection or mutation.
- Application integration, lifecycle/failure/race/isolation/aliasing tests, zero-write source/dependency probes, exact export scan та packed Node.js 24 runtime/type consumer.

## Межі

- Не додавати successful write, write port, Journal, Operation Engine, locks, recovery, sync, concrete durable driver, lazy loading, custom facades/plugins/hooks, Asset/Mark/KV queries або broad catalog.
- Не створювати parallel facade/Core/lifecycle mechanism, application bypass до internal harness, test-only Journal contract, shadow public API, public Core/IoC/tokens або package subpath export.
- Не розширювати accepted error catalog; unexpected programming/index defect не маскувати speculative normalized read failure.

## Критерій green gate

- Root package surface і declarations відповідають accepted contract; import side effects відсутні, internal subpaths закриті.
- Public runtime запускається через єдиний accepted composition/lifecycle path і повертає exact Resource/tree snapshots; mutation caller snapshot не впливає на повторне читання.
- `storage.createResource` повертає `STORAGE_READONLY` без input inspection, Core write lookup, driver mutation або Journal dependency.
- Invalid config, startup/read/stop/lifecycle races очищені, нормалізовані й не розкривають raw values/errors; fresh instances ізольовані.
- Focused tests, full `npm run check`, `git diff --check`, packed runtime/type consumer та independent repeated audit зелені без відкритих P0-P3 findings.
