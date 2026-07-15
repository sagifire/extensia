# Цільова предметна модель

Status: target-draft
Target Release: `0.1.0`
Updated: 2026-07-10
Detailed Source: `memory/references/extensia-v2/domain-model-v2.md`

## Межі

Предметна модель описує стабільне значення даних Extensia й не визначає Core, storage, operation pipeline, journal, locks, indexes, synchronization, plugins, facades або lifecycle. Детальні field-level contracts і conceptual TypeScript interfaces лишаються у source specification.

## Центральний агрегат

`Resource` — логічна одиниця контенту й центр предметної моделі. Він агрегує:

- власні metadata в `IResourceData`;
- нуль або більше `Asset`;
- нуль або більше `Mark`;
- resource-level `KV`;
- optional relation до батьківського `Resource` через `parent_id`.

Канонічний доменний aggregate представлений `IResource`. Для tree scenarios використовується окрема projection `IResourceTreeView`; `children[]` не входить до source of truth.

## Resource

Основні поля:

- `id` — унікальний ID у межах storage;
- `created_at`, `updated_at` — часові metadata;
- `title`, `description` — опис content unit;
- `parent_id` — optional parent relation;
- `order_index` — порядок у sibling group;
- `is_deleted` — доменний state flag;
- `locked`, `hidden` — reserved extension flags без обов'язкової Core behavior.

Resource може мати не більше одного parent. Сукупність parent relations має утворювати дерево без cycles.

## Asset

`Asset` описує один файловий або зовнішній носій даних і належить рівно одному Resource.

- Internal asset має `is_external = false`, `url = null`; його `id` є logical file descriptor для Storage Driver.
- External asset має `is_external = true`, `url != null`, `is_on_uploading = false`.
- `type` і `role` є відкритими класифікаційними рядками.
- `mime` та `extension` можуть бути `null`.
- `is_primary` позначає основний asset Resource; одночасно дозволений не більше ніж один primary asset.
- `derived_from` є слабким lineage relation до іншого Asset й не змінює ownership.
- `data` містить asset-local metadata й не замінює Marks або resource-level KV.

Internal asset може переходити з `is_on_uploading = true` до `false` після успішної фіналізації file. External asset не використовує upload lifecycle.

## Mark

`Mark` — компактна типізована ознака Resource для classification, filtering, ranking або scoring.

- Identity у межах Resource задається парою `type + name`.
- `value` може бути `null` або 32-bit signed integer.
- Duplicate `type + name` у межах одного Resource заборонені.

## KV

`KV` — відкритий дворівневий словник `namespace -> key -> string value` для application або integration attributes, які не потребують окремої типізованої сутності.

Mark використовується для компактної classification/weight semantics; KV — для довільних рядкових атрибутів. Ці моделі не взаємозамінні.

## Відношення

- `Resource 1 -> 0..* Asset`; asset не може бути спільним для кількох resources.
- `Resource 0..1 -> 0..* Resource` через `parent_id`; children є reverse lookup projection.
- `Resource 1 -> 0..* Mark` із unique `type + name`.
- `Resource 1 -> 0..* KV namespaces` із unique key у namespace.
- `Asset 0..1 -> Asset` через weak `derived_from` relation.

## Семантика стану

Resource і Asset не мають складних state machines у базовій предметній моделі. Їхній стан задається незалежними flags із кількома обов'язковими combinations. Lifecycle transitions і persistence guarantees є відповідальністю runtime/API layer, а не чистої domain model.

## Канонічні data contracts

Source specification визначає conceptual contracts `IDString`, `Timestamp`, `IMark`, `IResourceKV`, `IAsset`, `IResourceData`, `IResource`, `IResourceChildRef` та `IResourceTreeView`.

### `IDString`

`IDString` є branded string із canonical lowercase RFC 9562 UUID v4 representation `xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx`.

- Generation використовує `crypto.randomUUID()` і нормалізує результат до lowercase.
- Raw parser приймає лише hyphenated UUID v4 у lower/upper/mixed hex case, повертає lowercase canonical value й відхиляє інші UUID versions та compact/braced forms.
- Public і serialized representation — JSON string.
- Draft custom 64-bit timestamp/random scheme відхилена як недостатній general durable identity baseline.

### `Timestamp`

`Timestamp` є branded JSON number: ціла кількість milliseconds від Unix epoch UTC.

- Значення має проходити `Number.isSafeInteger` і лежати в ECMAScript Date range від `-8_640_000_000_000_000` до `8_640_000_000_000_000` включно.
- `Date -> Timestamp` є explicit validated conversion через `date.getTime()`; invalid Date відхиляється.
- `Timestamp -> Date` дозволений як explicit presentation/integration conversion.
- ISO strings і `Date` objects не входять у canonical public/serialized DTO contract; окремі adapters можуть приймати їх лише явно.
- Timestamp не гарантує monotonic або total ordering; Journal використовує окремий `sequence`.

### Readonly DTO snapshots без mutable aliases

Canonical DTO properties є deeply readonly на всіх рівнях; collections використовують readonly arrays/records. DTO містять тільки JSON-safe values: `null`, boolean, finite number, string, readonly arrays та readonly string-keyed objects.

`undefined`, `Date`, `bigint`, functions, symbols, `NaN` та infinities у canonical DTO заборонені. `Asset.data` є readonly JSON object або `null`.

Runtime повертає detached snapshots без shared mutable references із Core, Index або Storage Driver. `Object.freeze()` може бути diagnostic/dev mechanism, але не є compatibility guarantee; correctness не залежить від runtime freeze.

### Відкладені contract gates

- Exact bounded Phase 2 facade input/result shapes визначені у [public read contract](../../technical/public-read-contract.md): root construction/lifecycle, two Resource reads, readonly proof і canonical detached snapshots. Full facade catalog, final exports/compatibility policy та release freeze лишаються P7-WP1.
- Size limits для `Asset.data`, Mark/KV і schema versioning визначаються їхніми owner gates.
- Implementation не має послаблювати прийняті scalar/DTO contracts або інваріанти без явного design decision.

### Bounded Phase 3 write boundary

Accepted [write/journal/recovery contract](../../technical/write-journal-recovery-contract.md) додає лише два experimental writes. Create генерує root Resource з UUID v4, спільним operation Timestamp для `created_at`/`updated_at`, `parent_id = null`, `order_index = 0`, false flags та empty aggregates; caller задає exact own `title` і optional `description`. Update змінює лише own `title`/`description` та own `updated_at`. Hierarchy/order, flags, Asset/Mark/KV і delete/restore лишаються owner gates P3-DG2/P4.

Applied [order/delete/Mark/KV contract](../../technical/order-delete-mark-kv-contract.md) уточнює target: root create append; dense active siblings; exact insertion move; leaf tombstone/default invisibility; full-replace Marks; namespace-replace/delete KV; common timestamp for effective snapshots. Це target, не current implementation claim до P3-VS3…VS5.

## Applied P4-DG2 Asset lifecycle

Canonical exact field, relation, primary, ownership і lifecycle semantics визначає [Asset semantic contract](../../technical/asset-contract.md). Same-Resource ready-target lineage є hard invariant. Internal lifecycle: initial-uploading → ready та ready → replacement-uploading → ready; abort initial removes Asset, abort replacement restores old ready state. Upload generation state internal і не розширює `AssetSnapshot`. Physical driver mechanics не є domain model.
