# Відкриті доменні питання

Updated: 2026-07-10

Ці питання не мають неявних відповідей у target model. До окремого рішення implementation повинна або не надавати відповідну behavior, або працювати за явно локалізованим experimental contract.

## Resource

- Як `updated_at` змінюється для Asset, Mark, KV і tree relations? Bounded P3 own `title`/`description` update вже змінює own `updated_at` validated operation clock.
- Яка семантика `is_deleted`: soft-delete лише для Resource, propagation на children/assets, visibility у queries та можливість restore?
- Які integrations або plugins першими визначатимуть behavior `locked` і `hidden`, і чи потрібні reserved hook names для них?
- Які validation rules діють для `parent_id` та `order_index`, включно з numeric range? Для bounded P3 title/description вже прийнято exact structural contract: title string із `trim().length > 0` без normalization, description string або null.
- Як нормалізується `order_index` під час insert, move і delete в sibling group?

## Asset

- Чи буде `derived_from` між assets різних Resources дозволений у stabilized contract, чи бажане same-resource правило стане hard invariant?
- Що відбувається з primary designation під час delete/move primary Asset?
- Які validation/normalization rules потрібні для `type`, `role`, `mime`, `extension` і external `url`?
- Які size limits, schema-versioning policy та додаткові compatibility constraints потрібні для `Asset.data` поверх уже прийнятого readonly JSON-safe object-or-null baseline?
- Чи може internal Asset створюватися одразу з готовим file без visible `is_on_uploading = true` phase?

## Mark і KV

- Чи можуть `Mark.type`, `Mark.name`, KV namespace або key бути empty strings, і чи потрібна case normalization?
- Чи потрібні size limits для Mark names, KV keys і KV values?
- Чи `setMarks` / `setKV` замінюють повний набір або підтримують partial patch contracts?

## Закритий Phase 1 baseline

- `IDString` стабілізовано як canonical lowercase UUID v4 string.
- `Timestamp` стабілізовано як safe-integer Unix epoch milliseconds і JSON number.
- Canonical DTO стабілізовано як deeply readonly detached JSON-safe snapshots.
- Serialization schema versioning лишається відкритим release-level питанням P7-WP1; це не змінює прийнятий scalar/DTO baseline.
