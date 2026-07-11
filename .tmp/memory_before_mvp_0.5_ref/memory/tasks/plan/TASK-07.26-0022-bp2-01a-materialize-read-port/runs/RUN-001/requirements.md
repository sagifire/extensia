# Вимоги RUN-001

Preparation Status: prepared
Execution Status: completed
Status: review-ready
Started: 2026-07-10
Agent Role: Agent Implementer
Execution Mode: autonomous-implementation
Created: 2026-07-10

## Результат

Створити рівно один internal TypeScript module `src/system-extensions/default-api/resource-read-port.ts`, який є shared consumer-owned Core Resource read-port/token contract для майбутніх BP2-02 і BP2-03.

## In scope

- Typed requests `resource.get` і `resource.tree.get` з canonical `IDString`.
- `CoreReadFailure` тільки з `RESOURCE_NOT_FOUND`.
- Discriminated generic `CoreReadResult<T>`.
- Overload-based `CoreResourceReadPort` для Resource і one-level tree snapshots.
- `CORE_RESOURCE_READ_PORT` із exact ID `extensia.internal.system-extensions.default-api.core-resource-read-port` через чинний internal namespace.
- Strict TypeScript і повний package gate; independent subagent review.

## Межі

- Не додавати provider, adapter, Core/index/driver binding, Registry, facade, runtime composition, package export або інший contract/token.
- Не додавати runtime behavior tests, writes, Journal, plugins або public surface.

## Критерій green gate

Єдиний source module буквально відповідає canonical `technical/public-read-contract.md`; `npm run check` і `git diff --check` зелені; independent audit не має відкритих blocker/high/medium findings; result містить architecture-pressure review і memory sync.
