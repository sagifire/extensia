# Вимоги RUN-001

Status: satisfied
Agent Role: Agent Implementer
Execution Mode: autonomous-implementation
Created: 2026-07-10

## Результат

Реалізувати internal pure domain contract kernel для canonical UUID v4 `IDString`, epoch-millisecond `Timestamp`, JSON-safe deeply readonly detached snapshots і прийнятих pure invariants Resource, Asset, Mark та KV.

## In scope

- Branded scalar types, strict parsers, validation, generation і explicit Date conversions.
- Recursive readonly JSON types, guards, assertion і detached cloning.
- Deeply readonly internal DTO contracts та detached snapshot builders для Resource, Asset, Mark, KV і tree projections.
- Pure shape та aggregate validators лише для accepted invariants, які не потребують storage, Core або відповіді на open questions.
- Runtime boundary/property-style tests, JSON roundtrip, alias-mutation tests і compile-time type assertions.
- Повний успадкований package gate, незалежний audit і memory sync.

## Межі

- Не додавати domain contracts до root `src/index.ts` і не створювати package subpath exports.
- Не реалізовувати Core, storage, IoC, facades, lifecycle, persistence, journal, indexes або mutation commands.
- Не вигадувати normalization, size, update/delete/order, cross-storage uniqueness, cycle detection чи інші відкриті policy.
- Не покладатися на `Object.freeze()` для ownership correctness.

## Критерій green gate

Усі acceptance criteria task підтверджені typecheck/runtime tests; `npm run check` і `git diff --check` зелені; independent audit не має незакритих findings рівня blocker або required fix.
