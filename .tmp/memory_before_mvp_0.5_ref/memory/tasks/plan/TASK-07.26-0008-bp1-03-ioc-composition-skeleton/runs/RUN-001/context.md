# Контекст RUN-001

## Роль і режим

- Agent Role: Agent Implementer.
- Execution Mode: `autonomous-implementation`.
- Task status на старті run: `active`.

## Джерела рішення

- `TASK-07.26-0008` визначає scope, exclusions, verification matrix та acceptance criteria.
- ADR-0003 визначає єдиний internal Composition Root, explicit modules/ports і заборону public service locator.
- ADR-0006 фіксує exact `@sagifire/ioc@0.0.2`, synchronous multi contribution limitation, fresh composer і Extensia-owned async lifecycle.
- `memory/technical/architecture.md` та `memory/technical/rules.md` задають target-draft boundary; production module map і conceptual signatures не реалізуються в цьому run.
- `memory/technical/open-questions.md` є негативною межею для public/experimental tokens, config, Facade Registry та advanced IoC extensions.
- Exact installed package declarations, README і runtime behavior є implementation evidence; memory sketches не замінюють conformance tests.

## Початковий стан і захист чужих змін

`BP1-01` та `BP1-02` завершені. Exact IoC dependency вже встановлена, root public entry point порожній, а IoC implementation відсутня. На старті робоче дерево містить незакомічені accepted зміни `BP1-02`; run їх не відкидає і змінює shared package smoke лише настільки, наскільки потрібно для нових internal build artifacts та subpath rejection.

## Архітектурні межі

- Composition Root приховує composer/runtime/package inspection objects і повертає лише declared exported capabilities та safe Extensia-owned snapshots/results.
- Graph validation є явним pre-compose кроком; composition failure не запускає майбутній runtime lifecycle.
- Conformance probes є test-only modules, але проходять через той самий Composition Root boundary.
- Async provider/resource package capabilities не перетворюються на async multi contribution або Extensia lifecycle semantics.

## Відомі ризики

- Raw package diagnostics можуть містити token/module metadata; safe mapping має використовувати allowlist полів, а не recursive serialization невідомих objects.
- `Object.freeze()` лише забороняє mutation і не гарантує detached ownership; inspection snapshot треба побудувати з primitive allowlist і нових arrays/objects.
- Exact package types можуть дозволяти graph states, які runtime відхиляє пізніше; conformance matrix має перевірити deterministic boundary `validate()`/`compose()`.
