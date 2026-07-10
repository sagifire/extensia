# Вимоги RUN-001

Preparation Status: prepared
Execution Status: completed
Status: review-ready
Started: 2026-07-10
Agent Role: Agent Implementer
Execution Mode: autonomous-implementation
Created: 2026-07-10

## Результат

Реалізувати internal-only шлях `readonly driver -> greedy Resource index -> CORE_RESOURCE_READ_PORT` з lifecycle-controlled startup/cleanup і без розширення package API.

## In scope

- Consumer-owned readonly driver port/token і production IoC module binding.
- Greedy startup scan усіх Resource snapshots із canonical runtime validation.
- Resource-by-id та direct parent-to-children projections; children sort `(order_index, id)`.
- Shared `CoreResourceReadPort` implementation для exact `resource.get` і `resource.tree.get` requests.
- Missing read повертає лише `RESOURCE_NOT_FOUND`; malformed aggregate, duplicate ID, cycle та orphan fixture з ненульовим відсутнім `parent_id` відхиляють startup.
- Кожен success повертає новий detached deeply readonly-by-contract JSON-safe snapshot; driver values не витікають.
- Driver open/scan failure виконує best-effort close і очищення partial index; normal stop закриває driver, очищує index і інтегрується з existing Runtime Lifecycle Host.
- Focused contract/failure/aliasing/lifecycle/isolation tests, source/export checks і повний package gate.

## Межі

- Не додавати public facade, Registry, Extensia Module/factory, root/subpath exports, writes, Journal, locks, recovery, sync, Asset/Mark/KV/global queries, lazy mode або concrete durable driver.
- Не створювати другий read contract/token, generic resolver, test-only production contract чи parallel source of truth.
- Не додавати public error codes: invalid loaded model зводиться до existing safe lifecycle startup failure; raw driver errors, values та IDs не потрапляють у diagnostics.

## Критерій green gate

Exact shared read contract реалізовано через production binding; fixture matrix, detached snapshots, cleanup та fresh isolation доведені tests; `npm run check` і `git diff --check` зелені; independent repeated audit не має відкритих P0-P3 findings; result містить architecture-pressure review і memory sync.
