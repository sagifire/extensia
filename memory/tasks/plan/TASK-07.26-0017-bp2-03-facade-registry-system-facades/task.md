# TASK-07.26-0017: BP2-03 — Реалізувати shared Facade Provider/Registry і system facades

Status: backlog
Type: feature
Execution Mode: autonomous-implementation
Created: 2026-07-10
Owner Role: System Engineer Hat
Current Run: n/a
Current Research: n/a
Current Fixation: n/a

## Мета

Реалізувати єдиний production provider/registry mechanism і мінімальні системні поверхні `query`/`storage` за погодженим контрактом BP2-01.

## Обсяг

- Provider contributions, що належать consumer; deterministic phases/order/ownership.
- Реєстрація й validation під час startup; reserved/normalized names; duplicate/dependency failures; Registry заморожується до publication, а public facade surface публікується тільки під час переходу runtime у `ready`.
- Системне розширення `extensia.default-api`.
- Мінімальний query adapter до погодженої Core read seam.
- Storage command adapter із погодженою normalized failure до mutation.
- Rollback часткового startup, cleanup/disposal, безпечна inspection і погоджена application access boundary.

## Поза обсягом

Модель user plugin, публічна custom facade API, hooks, successful writes, повний query catalog, dynamic registration після `ready` і розкриття raw Core/IoC.

## Залежності та activation gate

- BP2-01 `done`; `APP-07.26-0021-001` має бути published після post-application audit і надає stable artifact ID зі спільною internal seam.
- BP2-01A / TASK-07.26-0022 має мати status `done` як єдиний source artifact цієї seam.
- Phase 1 composition/lifecycle прийняті.
- Активація окрема й створює `RUN-001`; лише після всіх попередніх gates task може йти паралельно з BP2-02 без обходу або дублювання погодженої seam.

## Критерії приймання

- [ ] Системний шлях використовує єдиний provider mechanism, придатний для майбутніх custom providers без постачання plugin API.
- [ ] Duplicate/reserved/missing dependency failures виникають до ready.
- [ ] Registry заморожений до publication; public facade surface стає видимою тільки в `ready`; частково побудовані facades ніколи не observable.
- [ ] Storage commands завжди повертають явну failure; query йде через погоджену Core seam.
- [ ] Немає arbitrary resolver/private token leakage; cleanup deterministic.
- [ ] Повні package gates зелені, результат пройшов незалежне ревю.

## Перевірка

Матриці порядку/cardinality/duplicate/reserved/dependency/freeze для providers; startup rollback/disposal; негативні перевірки post-freeze і відсутності observable facades до `ready`; safe diagnostics; public/export та IoC-leak probes; package gates.

## Очікувана синхронізація пам'яті

Фактична current API/technical implementation і task/run artifacts; target plugin/API claims не розширюються.

## Architecture pressure

Заборонені окремі system/custom registries, service locator, ручне facade wiring, mutable registry після `ready`, fake-only provider path і реалізація plugin ecosystem.

## Додатковий контекст

Planning ID `BP2-03`; оцінка `1/3/0/3/3/3=13 -> C3`, обсяг L, ризик високий. Підготовка task не є activation.
