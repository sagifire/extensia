# ADR-0011: Asset semantic lifecycle

Status: accepted target design
Date: 2026-07-15
Decision Owner: P4-DG2 / TASK-07.26-0040
Evidence: `memory/reports/research/2026-07-15-extensia-asset-contracts.md`

## Контекст

Phase 4 потребує exact Asset metadata/file-state semantics поверх accepted one-commit Core/Operation Engine і P4-DG1 durability boundary без стабілізації physical layout або bytes transport.

## Рішення

- `derived_from` є hard same-Resource relation до existing ready representation; self-link, cross-Resource, dangling і cycles заборонені. Delete target with dependents та reassign linked Asset fail conflict без implicit rewrite.
- Primary selection/clear explicit. Delete primary leaves none; initial-uploading internal Asset cannot be primary; reassign переносить Asset non-primary; auto-promotion відсутня.
- Internal create staged-only. Internal durable state розрізняє initial-uploading, ready і replacement-uploading; replacement зберігає old committed payload visible до finish. Atomic ready-file create відхилено для `0.1.0`.
- Resource delete з будь-яким active Asset upload повертає `RESOURCE_ASSET_UPLOAD_ACTIVE` до mutation; caller finish/abort/delete Asset first. Resource tombstone не може strand-ити active generation.
- Asset metadata, owning Resource timestamps, exact compound payload action і one journal entry commit-яться однією Core/Operation Engine semantic operation; staged bytes never visible; separate file/journal publication path forbidden.
- Public `AssetSnapshot` shape unchanged. Upload generation/handle є internal, не public DTO/path/session. P4-VS3 owns executable Core↔driver staging/transport adapter boundary.

## Alternatives

- Cross-Resource lineage — відхилено через global referential locks/cascade/index blast radius.
- Implicit primary promotion/demotion — відхилено через hidden aggregate mutations.
- Atomic ready-file create — відхилено як premature transport/publication path.
- Hide old payload during replacement — відхилено; last committed payload remains readable.
- Resource-delete upload cascade — відхилено; explicit conflict preserves P3 no-cascade behavior.

## Наслідки

P4-VS2 може реалізувати exact metadata operations і validator/startup integrity. P4-VS3 додає opaque generation begin/finish/abort/retry на driver capability. Physical SQL/layout/chunks, application bytes transport, P5 indexes і P7 compatibility лишаються окремими owners.
