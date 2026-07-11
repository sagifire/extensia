# Відкриті доменні питання

Updated: 2026-07-10

Ці питання не мають неявних відповідей у target model. До окремого рішення implementation повинна або не надавати відповідну behavior, або працювати за явно локалізованим experimental contract.

## Resource

- Як `updated_at` змінюється для Asset? Для accepted Phase 3 move/delete/Mark/KV усі effective staged Resources мають common operation timestamp; parent не bump-иться лише через derived children projection.
- Яка майбутня restore/include-deleted/cascade/purge semantics? Phase 3 already fixes leaf-only Resource tombstone і default invisibility.
- Які integrations або plugins першими визначатимуть behavior `locked` і `hidden`, і чи потрібні reserved hook names для них?
- Які future cross-storage/migration rules потрібні hierarchy? Phase 3 already fixes existing active parent, cycle-free graph, safe-integer dense order і exact insertion range.

## Asset

- Чи буде `derived_from` між assets різних Resources дозволений у stabilized contract, чи бажане same-resource правило стане hard invariant?
- Що відбувається з primary designation під час delete/move primary Asset?
- Які validation/normalization rules потрібні для `type`, `role`, `mime`, `extension` і external `url`?
- Які size limits, schema-versioning policy та додаткові compatibility constraints потрібні для `Asset.data` поверх уже прийнятого readonly JSON-safe object-or-null baseline?
- Чи може internal Asset створюватися одразу з готовим file без visible `is_on_uploading = true` phase?

## Mark і KV

- Чи потрібні future Mark query/stats/index contracts поверх accepted exact case-sensitive nonblank identity та limits?
- Чи потрібні future KV schema/versioning або patch APIs поверх accepted namespace replacement/delete та exact limits?

## Закритий P3-DG2 baseline

- Active siblings мають dense order; root create append, move uses insertion index, delete densely closes source group.
- Delete leaf-only, tombstone default-hidden; flags/aggregates preserved; restore deferred.
- Marks full-replace canonical unique set; KV replaces/deletes one namespace; validation/limits/no-change exact.

## Закритий Phase 1 baseline

- `IDString` стабілізовано як canonical lowercase UUID v4 string.
- `Timestamp` стабілізовано як safe-integer Unix epoch milliseconds і JSON number.
- Canonical DTO стабілізовано як deeply readonly detached JSON-safe snapshots.
- Serialization schema versioning лишається відкритим release-level питанням P7-WP1; це не змінює прийнятий scalar/DTO baseline.
