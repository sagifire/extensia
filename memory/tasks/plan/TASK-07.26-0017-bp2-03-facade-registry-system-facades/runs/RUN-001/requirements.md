# Вимоги RUN-001

Preparation Status: prepared
Execution Status: completed
Status: review-ready
Started: 2026-07-10
Agent Role: Agent Implementer
Execution Mode: autonomous-implementation
Created: 2026-07-10

## Результат

Реалізувати єдиний internal production mechanism `FacadeProvider -> FacadeRegistry -> frozen facade surface` і system extension `extensia.default-api`, не публікуючи root API до BP2-04.

## In scope

- Synchronous immutable provider contributions з canonical owner/name/dependency metadata та deterministic ordering.
- Module-owned registration lease, exact name validation, reserved `query`/`storage` provenance, duplicate і missing dependency failures до ready.
- Registry build, freeze, atomic publication, safe inspection, deterministic rollback і disposal.
- System providers `query` та `storage`, що належать `extensia.default-api` і проходять той самий production provider path.
- Query adapter до exact `CORE_RESOURCE_READ_PORT`; malformed raw ID повертає `INVALID_RESOURCE_ID`, valid missing ID зберігає `RESOURCE_NOT_FOUND`.
- Storage adapter, який у ready readonly mode повертає `STORAGE_READONLY` до inspection input або mutation.
- Stale/unpublished facade calls повертають `MODULE_NOT_READY`; provider не отримує raw resolver або private token lookup.
- Focused tests для order/cardinality/name/provenance/duplicate/dependency/freeze/publication/rollback/disposal/diagnostics/export boundaries і повний package gate.

## Межі

- Не додавати `createExtensia`, `ExtensiaModule`, root/subpath exports або application-visible facade access: інтеграція належить BP2-04.
- Не реалізовувати user plugin/custom facade API, hooks, writes, Journal, locks, recovery, sync, full query catalog або dynamic registration.
- Не дублювати shared read contract/token і не розкривати raw Core/IoC, config, provider values, private token IDs чи unsafe errors.

## Критерій green gate

System facades створюються єдиним production provider mechanism; усі validation failures трапляються до publication; frozen surface публікується atomically і deterministic cleanup доведено tests; `npm run check` та `git diff --check` зелені; independent repeated audit не має відкритих P0-P3 findings; result містить architecture-pressure review і memory sync.
