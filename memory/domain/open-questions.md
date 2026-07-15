# Відкриті доменні питання

Updated: 2026-07-15

Ці питання не мають неявних відповідей у target model. До окремого рішення implementation повинна або не надавати відповідну behavior, або працювати за явно локалізованим experimental contract.

## Resource

- Яка майбутня restore/include-deleted/cascade/purge semantics? Phase 3 already fixes leaf-only Resource tombstone і default invisibility.
- Які integrations або plugins першими визначатимуть behavior `locked` і `hidden`, і чи потрібні reserved hook names для них?
- Які future cross-storage/migration rules потрібні hierarchy? Phase 3 already fixes existing active parent, cycle-free graph, safe-integer dense order і exact insertion range.

## Asset

Немає відкритих P4-DG2 blockers. Application bytes transport, P5 indexes/sync і P7 schema/API freeze лишаються technical owner gates.

## Закритий P4-DG2 baseline

- Кожний effective Asset/file-state transition використовує common operation Timestamp для changed Assets і affected owning Resources; no-change/failure не змінює persisted timestamps.
- `derived_from` same-Resource, ready-representation-target, acyclic і no-dangling; delete/reassign conflicts без implicit rewrite.
- Primary explicit; delete leaves none; reassign non-primary; initial-uploading not primary.
- Exact fields/MIME/extension/WHATWG HTTP(S) URL та `Asset.data` limits defined in `technical/asset-contract.md`.
- Internal create staged-only; replacement retains last committed payload; active upload blocks Resource delete.

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
