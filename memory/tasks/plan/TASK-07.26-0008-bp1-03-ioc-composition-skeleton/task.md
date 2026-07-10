# TASK-07.26-0008: BP1-03 — Побудувати IoC composition skeleton

Status: backlog
Type: feature
Execution Mode: autonomous-implementation
Created: 2026-07-10
Owner Role: Product Lead Hat
Current Run: n/a
Current Research: n/a
Current Fixation: n/a

## Мета

Побудувати internal IoC composition/conformance skeleton на exact `@sagifire/ioc@0.0.2`, який доводить token/module/port boundaries, fail-fast graph validation і safe diagnostics без public IoC leakage та без передчасної реалізації production subsystem modules або lifecycle controller.

## Продуктовий контекст

Extensia використовує `@sagifire/ioc` як internal composition layer, але не як public service locator. ADR-0003 і ADR-0006 прийняли exact dependency та capability/lifecycle boundaries. `BP1-03` має перетворити ці рішення на executable package-conformance skeleton після `BP1-01`, зберігши production module selection і startup/rollback semantics для їхніх owner gates.

## Обсяг

- Реалізувати namespaced internal token conventions і typed token declarations, достатні для conformance skeleton.
- Реалізувати єдиний Extensia Composition Root boundary для створення fresh composer, registration, graph validation, `compose()` і контрольованого disposal.
- Перевірити consumer-owned narrow ports/adapters, single/multi cardinality, module-private providers, scopes, inspection і disposal на exact package API.
- Нормалізувати composition failures у safe diagnostics без provider instances, secrets або unsafe config values.
- Надати immutable safe inspection snapshot, відокремлений від raw package runtime/inspection objects.
- Створити fresh-composition conformance harness і явно test-only probe modules для requires/provides, adapters, cardinality, cycles, private access, scopes та disposal.
- Зафіксувати executable limitation: synchronous descriptor contributions; async construction/init лишається відповідальністю майбутнього Extensia Runtime Controller.

## Поза обсягом

- Реалізація production `extensia.*` subsystem modules із target-draft module map; їхній точний набір визначається BP1-04 або окремим design gate.
- Lifecycle startup ordering, rollback, ready-state publication, Runtime Controller, Core або fake Storage Driver.
- Public facades, plugin API, extension graph, hooks, dynamic extensions або application-facing config contract.
- Write engine, journal, recovery, indexes, synchronization чи durable behavior.
- Public IoC tokens, raw runtime/token lookup, public service locator, package subpaths або root exports IoC internals.
- Неявне закриття technical open questions щодо public/experimental tokens, config, Facade Registry чи Advanced IoC Extension Module API.

## Залежності

- `BP1-01` (`TASK-07.26-0005`) має пройти green tooling/package gate до активації цієї задачі.
- ADR-0003 і ADR-0006 є accepted authority для exact dependency, internal/public boundary та package capability assumptions.
- `technical/architecture.md`, `technical/rules.md` і `technical/open-questions.md` є target-draft constraints; вони не стабілізують exact public signatures або production module set.
- `BP1-03` може виконуватися паралельно з `BP1-02` тільки після gate `BP1-01`.

## Критерії приймання

- [ ] Missing required port, cycle, duplicate binding, single/multi cardinality mismatch і invalid adapter graph завершуються deterministic failure до runtime startup.
- [ ] `compose()` повертає immutable exported capabilities; post-compose mutation/override не використовується, кожен test створює fresh composition.
- [ ] Module-private providers недоступні поза owner module; application/package root не отримує raw runtime, tokens або arbitrary resolver.
- [ ] Safe inspection і normalized diagnostics не містять provider instances, secrets, unsafe config або private values.
- [ ] Synchronous contribution limitation encoded у contracts/tests; async lifecycle behavior не делегується package і не реалізується в цій задачі.
- [ ] Conformance coverage використовує test-only probe modules; production `extensia.*` subsystem module set не створюється speculative.
- [ ] Scope/disposal smoke доводить expected package behavior і cleanup; lifecycle rollback/ready semantics лишаються BP1-04.
- [ ] `RUN-001` містить package API evidence, graph/diagnostic contract results, architecture-pressure review, independent audit findings і memory sync.

## Перевірка

- Graph contract matrix: missing port, cycles, duplicates, cardinality, adapter source/target і private-provider access.
- Fresh-composition isolation і assertions, що production runtime не патчиться після `compose()`.
- Safe diagnostic/inspection snapshot tests із secret/private sentinel values.
- Scope values і disposal smoke на exact `@sagifire/ioc@0.0.2` API.
- Root export/packed package checks, що raw runtime/tokens/internal paths недоступні.
- Повний чистий suite package gates, успадкований від `BP1-01`.

## Пов'язана пам'ять

- `memory/state.md`
- `memory/product/roadmap.md`
- `memory/technical/architecture.md`
- `memory/technical/rules.md`
- `memory/technical/open-questions.md`
- `memory/technical/stack.md`
- `memory/technical/decisions/ADR-0003-internal-ioc-composition.md`
- `memory/technical/decisions/ADR-0006-phase-1-tooling-and-ioc-baseline.md`
- `memory/domain/current/implementation-state.md`
- `memory/reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md`
- `memory/tasks/plan/TASK-07.26-0005-bp1-01-esm-typescript-package-baseline/task.md`
- `memory/knowledge/package-index.md`

## Прогони

Немає. Після green `BP1-01`, разом із переходом задачі у `active`, створюються `runs/index.md`, `runs/RUN-001/index.md`, `runs/RUN-001/requirements.md`, `runs/RUN-001/context.md` і `runs/RUN-001/result.md`.

## Дослідження

Немає.

## Фіксації

Немає. Потреба вибрати production module set, стабілізувати public/experimental tokens або змінити ADR boundary оформлюється окремою design/fixation task до implementation такого рішення.

## Очікувана синхронізація пам'яті

- Technical/current implementation state: оновити factual package-conformance й composition skeleton status, точні divergence notes та підтверджені limitations.
- Accepted ADR: очікувано `not needed`; змінювати лише через окрему fixation/ADR decision.
- Target-draft architecture/open questions: не видавати за стабілізований contract; оновлювати тільки при конкретному погодженому discrepancy або закритому gate.
- Пам'ять задач і wiki-індекси: оновити task/run artifacts, status, evidence та створену навігацію.
- `state.md`: оновити, якщо accepted результат змінює readiness Phase 1.
- Product, domain і knowledge memory: очікувано `not needed`, якщо implementation не виявить конкретного підтвердженого розходження.

## Architecture pressure

Заборонено створювати public service locator, другий Composition Root, mutable post-compose overrides, parallel test-only architecture або speculative horizontal foundation production modules. Якщо conformance skeleton потребує рішення про config, lifecycle, production module set, facades чи public tokens, activation блокується design gate/follow-up замість неявного рішення.

## Додатковий контекст

Planning identifier `BP1-03` зберігає traceability до `P1-WP3`, а `TASK-07.26-0008` є stable canonical task identifier. Мінімальний рекомендований рівень виконавця й незалежного аудитора: `сильний`; оцінка `1/3/1/2/2/3=12 -> C3`, обсяг L, ризик високий, невизначеність середня, упевненість висока.
