# TASK-07.26-0010: BP1-04 — Реалізувати lifecycle controller і architecture-enabling slice

Status: backlog
Type: feature
Execution Mode: autonomous-implementation
Created: 2026-07-10
Owner Role: Product Lead Hat / System Engineer Hat
Current Run: n/a
Current Research: n/a
Current Fixation: n/a

## Мета

Реалізувати lifecycle-only architecture-enabling slice `construction -> compose -> start -> ready/failed -> stop/dispose` поверх прийнятих domain та IoC foundations без передчасної реалізації facades, plugins, durable runtime або ширшого public API.

## Продуктовий контекст

`BP1-01`, `BP1-02` і `BP1-03` створили зелений tooling/package baseline, pure domain contract kernel та internal IoC composition/conformance skeleton. Наступний крок Phase 1 має довести application-facing lifecycle boundary, Extensia-owned startup/rollback і cleanup на deterministic readonly fake driver. Root package entry зараз навмисно не експортує runtime/domain API, а exact public config і conceptual signatures лишаються нестабілізованими.

## Обсяг

- Реалізувати side-effect-free Extensia Module construction boundary у межах окремо погодженого мінімального public lifecycle contract.
- Реалізувати internal Runtime Controller і мінімальний набір production lifecycle modules/capabilities, потрібний лише цьому slice.
- Визначити й реалізувати explicit module/controller state machines та ordered startup stages.
- Реалізувати readonly deterministic fake Storage Driver contract/binding для lifecycle/failure tests без durability claims.
- Реалізувати reverse startup rollback, cleanup aggregation і guaranteed composed-runtime disposal.
- Надати detached immutable safe lifecycle diagnostics/inspection без instances, secrets або private provider values.
- Розширити fresh-composition harness lifecycle scenarios та перевірити ізоляцію instances.
- Додати packed Node.js 24 smoke через погоджену application boundary.

## Поза обсягом

- `storage`/`query` facades, Facade Registry, plugin/extension API, hooks або dynamic extensions.
- Resource/Asset/Mark/KV read/write behavior і Core operation pipeline.
- Full Storage Driver, durable persistence, journal, index, recovery, locks або external sync.
- Production subsystem module map поза мінімумом lifecycle slice.
- Final public config shape, compatibility policy або exact APIs поза окремо погодженим мінімальним lifecycle contract.
- Public IoC tokens, raw runtime, arbitrary resolver або service locator.

## Залежності та activation gate

- `BP1-01` (`TASK-07.26-0005`), `BP1-02` (`TASK-07.26-0007`) і `BP1-03` (`TASK-07.26-0008`) завершені та прийняті людиною.
- До activation і створення `RUN-001` обов'язковий окремий applied owner-approved design/fixation gate, який фіксує exact мінімальний root lifecycle contract: exported symbol/factory/class, construction/config input, lifecycle result/state shape, inspection exposure і compatibility status.
- Conceptual signatures source specifications не є authority exact contract; ADR-0003/ADR-0006 та technical architecture/rules/open questions задають constraints.
- Без applied public-contract gate ця задача лишається `backlog`.

## Критерії приймання

- [ ] Construction не виконує active side effects і не публікує partially initialized runtime.
- [ ] Module/controller state transitions явні; ready/started публікується лише після успіху всіх required stages.
- [ ] Failure injection на кожному startup stage виконує deterministic reverse cleanup усіх initialized resources і guaranteed runtime disposal.
- [ ] Cleanup failure не припиняє cleanup решти resources; результат/diagnostics зберігає повну safe інформацію про failures.
- [ ] Double/concurrent `start()`/`stop()` behavior відповідає погодженій bounded/idempotency-aware policy й покрите tests.
- [ ] Fake driver реалізує той самий мінімальний lifecycle port, який очікується від production driver, без паралельної test-only architecture.
- [ ] Diagnostics/inspection detached, immutable й не містить secrets, provider instances, raw runtime або private values.
- [ ] Fresh module instances не ділять mutable lifecycle state; post-compose patching/override не використовується.
- [ ] Packed Node.js 24 smoke доводить construction/start/stop через погоджену root lifecycle boundary без IoC leak.
- [ ] `RUN-001` містить exact contract authority, lifecycle/failure evidence, independent audit, architecture-pressure review і memory sync.

## Перевірка

- Lifecycle transition matrix для normal, double і concurrent start/stop cases.
- Injected failure matrix на кожному startup stage з exact cleanup order assertions.
- Resource leak, fake driver close і composed-runtime disposal assertions.
- Safe diagnostics/inspection tests із secret/private sentinel values.
- Fresh-composition та cross-instance isolation tests.
- Root export/type surface checks і packed Node.js 24 start/stop smoke.
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
- `memory/tasks/plan/TASK-07.26-0007-bp1-02-pure-domain-contract-kernel/task.md`
- `memory/tasks/plan/TASK-07.26-0008-bp1-03-ioc-composition-skeleton/task.md`
- owner-approved public lifecycle contract fixation після її створення

## Прогони

Немає. `RUN-001` створюється тільки після applied activation gate.

## Дослідження

Немає.

## Фіксації

Немає. Exact minimal root lifecycle contract має бути зафіксований окремою owner-approved design/fixation task до activation.

## Очікувана синхронізація пам'яті

- Technical/current implementation state: оновити factual lifecycle/controller/fake-driver status і підтверджені limitations.
- Accepted ADR і target architecture: очікувано `not needed`; discrepancy або нове рішення проводити через окрему fixation/ADR.
- Task memory/indexes: оновити run artifacts, status, evidence та навігацію.
- `state.md`: оновити після accepted result BP1-04.
- Product/domain/knowledge memory: очікувано `not needed` без конкретного підтвердженого розходження.

## Architecture pressure

Заборонені speculative horizontal subsystem modules, public service locator, другий Composition Root, premature facade/plugin/config contract, fake-only parallel architecture, implicit recovery/durability claims і cleanup shortcuts. Якщо реалізація потребує contract понад applied activation gate, task зупиняється для окремого design/fixation decision.

## Додатковий контекст

Planning identifier `BP1-04` зберігає traceability до `P1-WP4/P1-VS1`, а `TASK-07.26-0010` є stable canonical task identifier. Оцінка planning report: `1/3/1/3/2/3=13 -> C3`; обсяг L, ризик високий, невизначеність середня, упевненість середня; рекомендований агент і аудитор — `сильний`.
