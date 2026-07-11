# Вимоги RUN-001

Status: satisfied
Agent Role: Agent Implementer
Execution Mode: autonomous-implementation
Created: 2026-07-10

## Результат

Реалізувати internal IoC composition/conformance skeleton на exact `@sagifire/ioc@0.0.2`, який дає єдиний Extensia Composition Root boundary, deterministic pre-start graph validation, safe detached diagnostics/inspection та executable probe coverage package capabilities.

## In scope

- Namespaced internal tokens і typed token declarations лише для test-only conformance probes.
- Fresh composer, module registration, explicit validation, `compose()` та контрольований disposal через один internal Composition Root boundary.
- Consumer-owned narrow ports/adapters, single/multi cardinality, module-private providers, scopes, inspection і disposal.
- Safe normalized composition failures і immutable detached inspection snapshot без provider values, instances, secrets або raw package runtime objects.
- Test-only conformance modules/probes для missing ports, cycles, duplicates, cardinality, adapters, private access, scopes та cleanup.
- Synchronous descriptor contribution contract; async construction/init лишається поза IoC multi contributions і належить майбутньому Runtime Controller.
- Root export, packed package, full package gate, незалежний audit і memory sync.

## Межі

- Не створювати production `extensia.*` subsystem modules, Runtime Controller, lifecycle startup/rollback або ready-state semantics.
- Не реалізовувати public config, facades, plugins, hooks, Core, Storage Driver, extension graph або durable behavior.
- Не експортувати IoC tokens, raw runtime, resolver чи internal subpaths через package API.
- Не стабілізувати open questions щодо public/experimental tokens, Facade Registry або Advanced IoC Extension Module API.
- Test harness використовує production composition boundary з test-only modules, а не паралельну test-only архітектуру.

## Критерій green gate

Усі task acceptance criteria мають automated evidence; exact package API evidence зафіксовано; `npm run check` і `git diff --check` зелені; independent audit не має незакритих findings рівня blocker або required fix.
