# Доменні правила та інваріанти

Status: target-draft
Updated: 2026-07-10
Detailed Source: `memory/references/extensia-v2/domain-model-v2.md`

## Межа current/target

1. Фактична реалізація описується тільки в `domain/current/`; майбутня модель — тільки в `domain/target/`.
2. До появи коду й tests наведені нижче правила є target invariants, а не current runtime guarantees.
3. Зміна будь-якого правила потребує перевірки product requirements, target model, public inputs і runtime operation pipeline.

## Базові scalar contracts

1. Кожний canonical `IDString` є lowercase hyphenated UUID v4; генерація використовує `crypto.randomUUID()`.
2. Raw ID parser приймає lower/upper/mixed hex case, обов'язково нормалізує його до lowercase і відхиляє UUID інших versions, compact або braced forms.
3. Кожний canonical `Timestamp` є safe-integer Unix epoch milliseconds у ECMAScript Date range `[-8_640_000_000_000_000, 8_640_000_000_000_000]`.
4. Invalid Date, timestamp strings і `Date` objects не допускаються в canonical public/serialized DTO.
5. Timestamp не використовується як total ordering primitive; Journal sequence є окремим contract.

## DTO і snapshot boundary

1. Canonical public/serialized DTO є deeply readonly на рівні properties, arrays і records.
2. DTO містять тільки JSON-safe finite values; `undefined`, `Date`, `bigint`, functions, symbols, `NaN` та infinities заборонені.
3. `Asset.data` є readonly JSON object або `null`.
4. Runtime повертає detached snapshots без shared mutable references із internal state.
5. Runtime freeze не є compatibility guarantee і не замінює detached ownership.

## Resource

1. `Resource.id` унікальний у межах одного storage.
2. Resource має не більше одного parent; `parent_id = null` означає root.
3. Resource hierarchy не допускає cycles.
4. `children[]` є projection і не використовується як write source of truth.
5. `order_index` задає порядок лише в межах sibling group одного parent.
6. `is_deleted` є доменним state flag.
7. `locked` і `hidden` є reserved extension flags; Core не отримує для них вигадану базову behavior без окремого рішення.

## Asset

1. `Asset.id` унікальний у межах storage.
2. Asset належить рівно одному Resource й не може бути shared між resources.
3. У Resource одночасно існує не більше одного asset із `is_primary = true`.
4. External asset вимагає `is_external = true`, `url != null`, `is_on_uploading = false`.
5. Internal asset вимагає `is_external = false`, `url = null`; під час upload `is_on_uploading` може бути `true`.
6. `derived_from` не створює ownership або containment relation.
7. `derived_from`, якщо задано, посилається на existing Asset того самого Resource з ready representation, не на self і не створює cycle або dangling relation.
8. `data` є asset-local metadata й не підміняє Marks або resource-level KV.

## Mark

1. Пара `type + name` унікальна в межах одного Resource.
2. `value` може бути тільки `null` або 32-bit signed integer.
3. Mark використовується для classification, filtering, ranking і compact typed signals, а не як довільний object store.

## KV

1. Структура KV: `namespace -> key -> string value`.
2. Key унікальний у межах namespace.
3. Значення завжди є string.
4. KV використовується для довільних application/integration attributes і не підміняє Mark.

## Зміна стану

1. Доменні data contracts не надають mutation-by-reference semantics.
2. Будь-яка durable зміна Resource, Asset, Mark або KV має виконуватися explicit command через Core operation pipeline.
3. Runtime має перевіряти ці інваріанти до publication committed state.
4. Partially successful state не може публікуватися як success.
5. Bounded P3 create приймає лише non-empty-after-trim string `title` і optional string-or-null `description`, не нормалізує значення та створює лише root Resource з canonical generated defaults.
6. Bounded P3 update приймає exact own `title`/`description` patch, потребує хоча б одну effective change й змінює own `updated_at`; Hot Index не є write authority.
7. Caller не може передати create ID/timestamps/parent/order/flags/aggregates, а update не може змінювати parent/order/flags/aggregates до P3-DG2.
8. Accepted target root create append-иться; parent/order змінює лише exact `moveResource`.
9. Active sibling order dense `0..n-1`; move/delete normalization atomic і має common timestamp.
10. Tombstones hidden default reads; active parent must exist/active; restore/cascade/purge deferred.
11. `setMarks` full-replaces max 256 exact unique canonical Marks; `setKV` replaces/deletes one namespace з exact limits та order-insensitive equality.

## Правило невизначеності

Поведінка, якої немає в source specification, не додається за аналогією з CMS, ORM або старою Extensia. Вона фіксується у `open-questions.md` і вирішується окремим design decision.

## Applied P4-DG2 Asset refinement

1. Asset ID globally unique in storage; кожен Asset належить одному active owning Resource для writes, а aggregate зберігає Assets sorted binary by ID.
2. Exact field/URL/data envelope визначає `technical/asset-contract.md`; silent normalization відсутня, крім canonical UUID/WHATWG URL.
3. `derived_from` посилається лише на existing Asset того самого Resource з ready representation (external-ready, internal ready або replacement-uploading), не self і не створює cycle/dangling relation.
4. Primary selection/clear explicit; initial-uploading internal Asset не primary; delete primary leaves none; reassign clears primary й дозволений лише без lineage/active upload.
5. Internal create staged-only; replacement тримає last committed payload visible. Resource delete за active upload fail-ить `RESOURCE_ASSET_UPLOAD_ACTIVE` до mutation.
6. Effective Asset/file-state transition bump-ить changed Asset та owning Resource common Timestamp; no-change/failure не змінює persisted timestamps.
