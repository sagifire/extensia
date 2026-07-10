# TASK-07.26-0007: BP1-02 — Реалізувати pure domain contract kernel

Status: backlog
Type: feature
Execution Mode: autonomous-implementation
Created: 2026-07-10
Owner Role: Product Lead Hat
Current Run: n/a
Current Research: n/a
Current Fixation: n/a

## Мета

Реалізувати чисте domain-contract ядро для прийнятих Phase 1 scalar, JSON і detached readonly DTO boundaries без залежності від Core, storage, runtime composition або public facade behavior.

## Продуктовий контекст

Extensia потребує єдиного типобезпечного представлення ідентичності, часу та domain snapshots до побудови lifecycle і read/write slices. FIX-003 TASK-07.26-0003 прийняла UUID v4 `IDString`, numeric epoch-millisecond `Timestamp` і deeply readonly detached JSON-safe DTO boundary. `BP1-02` реалізує саме цей baseline після відтворюваного tooling gate `BP1-01`, не стабілізуючи draft public signatures.

## Обсяг

- Реалізувати branded `IDString` із generation через `crypto.randomUUID()`, strict UUID v4 parsing, lowercase normalization і validation canonical form.
- Реалізувати branded `Timestamp` як safe-integer Unix epoch milliseconds у ECMAScript Date range, explicit validated conversions `Date -> Timestamp` і `Timestamp -> Date`.
- Реалізувати recursive readonly JSON value/array/object types та runtime validators для finite JSON-safe values без `undefined`, `Date`, `bigint`, functions, symbols, `NaN` або infinities.
- Реалізувати deeply readonly data-contract types для Resource, Asset, Mark, KV та потрібних target-model projections у межах полів і правил, необхідних прийнятим Phase 1 contracts.
- Реалізувати detached snapshot builders/cloners без shared mutable references із вхідними або internal values.
- Реалізувати pure validators для явно прийнятих scalar, JSON, Resource, Asset, Mark і KV invariants.
- Додати unit boundary tests, compile-time type tests, JSON roundtrip і alias-mutation tests.

## Поза обсягом

- Core, Storage Driver, facades, plugins, IoC composition, lifecycle controller, operation pipeline, persistence, journal, index або recovery.
- Mutation commands, durable validation timing, storage uniqueness lookups або cross-entity orchestration.
- Persistence schema/versioning, size limits і exact public facade input/result contracts.
- Вигадування behavior для відкритих delete/order/update/normalization policies, `updated_at`, `derived_from`, primary-asset transitions, Mark/KV patch semantics або reserved flags.
- Стабілізація exact field-level/public signatures із target-draft documents або розширення root package exports без окремого contract gate.

## Залежності

- `BP1-01` (`TASK-07.26-0005`) має пройти green tooling/package gate до активації цієї задачі.
- FIX-003 TASK-07.26-0003 є authority для прийнятих scalar/DTO boundaries.
- `domain/target/model.md`, `domain/rules.md` і `domain/open-questions.md` є target-draft constraints; вони не стабілізують exact public signatures.
- `BP1-02` може виконуватися паралельно з `BP1-03` тільки після gate `BP1-01`.

## Критерії приймання

- [ ] `IDString` приймає лише hyphenated UUID v4 у lower/upper/mixed hex case, повертає lowercase canonical value й відхиляє інші versions/forms.
- [ ] `Timestamp` приймає лише safe integers у визначеному Date range; invalid Date, strings, fractional/out-of-range/non-finite values відхиляються.
- [ ] JSON types і validators забороняють non-JSON та non-finite values на будь-якій глибині; valid values проходять JSON roundtrip без зміни semantics.
- [ ] Domain DTO properties/arrays/records є deeply readonly на type level; builders повертають detached snapshots без mutable aliases.
- [ ] Pure validators покривають лише явно прийняті invariants Resource/Asset/Mark/KV; поведінка відкритих питань не реалізована неявно.
- [ ] Compile-time tests доводять readonly boundary, а runtime alias-mutation tests доводять detached ownership без залежності від `Object.freeze()`.
- [ ] Root package exports не отримують speculative public signatures або subpaths у межах цієї задачі.
- [ ] `RUN-001` містить evidence tests/typechecks, architecture-pressure review, independent audit findings і memory sync.

## Перевірка

- Boundary/property-style cases для UUID generation/parsing/normalization і Timestamp conversions/ranges.
- Compile-time type tests для brands, deeply readonly arrays/records і заборонених mutations.
- JSON roundtrip та recursive invalid-value matrix.
- Invalid combinations для Asset external/internal/upload, primary cardinality, Mark value/range/identity і KV shape, але тільки для accepted pure invariants.
- Alias-mutation tests для nested arrays/records/`Asset.data`.
- Повний чистий suite package gates, успадкований від `BP1-01`.

## Пов'язана пам'ять

- `memory/state.md`
- `memory/product/roadmap.md`
- `memory/domain/target/model.md`
- `memory/domain/rules.md`
- `memory/domain/open-questions.md`
- `memory/domain/current/implementation-state.md`
- `memory/tasks/plan/TASK-07.26-0003-plan-extensia-v0-1-0-delivery/fixations/FIX-003.md`
- `memory/reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md`
- `memory/tasks/plan/TASK-07.26-0005-bp1-01-esm-typescript-package-baseline/task.md`
- `memory/knowledge/package-index.md`

## Прогони

Немає. Після green `BP1-01`, разом із переходом задачі у `active`, створюються `runs/index.md`, `runs/RUN-001/index.md`, `runs/RUN-001/requirements.md`, `runs/RUN-001/context.md` і `runs/RUN-001/result.md`.

## Дослідження

Немає.

## Фіксації

Немає. Discrepancy з прийнятим scalar/DTO baseline або потреба стабілізувати draft signatures оформлюється окремою fixation/design task до зміни target memory.

## Очікувана синхронізація пам'яті

- Доменна current memory: оновити factual implementation state і traceability лише за фактично реалізовані contracts/tests.
- Доменна target memory: очікувано `not needed`; змінювати тільки через окрему fixation при доведеному discrepancy.
- Пам'ять задач: оновити task/run artifacts, status і acceptance evidence.
- Wiki-індекси: оновити для створених run/fixation/report artifacts.
- `state.md`: оновити, якщо accepted результат змінює readiness Phase 1.
- Product, technical і knowledge memory: очікувано `not needed`, якщо implementation не виявить конкретного підтвердженого розходження.

## Architecture pressure

Domain kernel не повинен отримувати runtime orchestration, persistence semantics, service access або другий шлях mutation. Якщо pure validator потребує storage lookup, operation context чи відповіді на open question, робота зупиняється для design/follow-up замість створення workaround.

## Додатковий контекст

Planning identifier `BP1-02` зберігає traceability до `P1-WP2`, а `TASK-07.26-0007` є stable canonical task identifier. Мінімальний рекомендований рівень виконавця й незалежного аудитора: `сильний`; оцінка `2/2/0/1/3/3=11 -> C3`, обсяг M, ризик високий, невизначеність низька, упевненість висока.
