# RSCH-001: Exact Asset semantic contract

Status: completed
Related Task: [P4-DG2 / TASK-07.26-0040](task.md)
Related Run: [RUN-001](RUN-001/index.md)
Detailed Report: [Exact Asset semantic contract](../../../reports/research/2026-07-15-extensia-asset-contracts.md)

## Питання

Який exact Asset field/aggregate/lifecycle/API contract закриває U-21..U-24, зберігає P3 commit/publication guarantees й розблоковує окремі P4-VS2 metadata та P4-VS3 upload slices без physical layout leakage?

## Рішення

- Exact case-sensitive `type`/`role`, canonical lowercase MIME/extension, normalized WHATWG HTTP(S) URL без credentials.
- `Asset.data`: canonical sorted-key UTF-8 JSON до 65,536 bytes, depth 16, 4,096 nodes та bounded containers/strings.
- `derived_from`: existing ready Asset того самого Resource, без self/cycles/dangling; delete/reassign conflicts замість implicit rewrite.
- Primary змінюється explicit set/clear; delete лишає none; reassign переносить non-primary; auto-promotion/auto-demotion поза explicit primary command відсутні.
- Internal create лише staged: initial-uploading → ready; replacement зберігає old committed payload visible до finish; abort initial видаляє Asset, abort replacement повертає ready.
- Resource delete з active upload fail-ить `RESOURCE_ASSET_UPLOAD_ACTIVE` до mutation, тому tombstone не strand-ить generation; exhaustive matrix зв'язує кожен transition з exact compound payload action.
- Metadata/payload-state/Resource timestamps commit-яться через один prepared Core/Operation Engine write-set, один journal entry і post-commit batch index publication.
- Public metadata results мають per-command unions; internal upload handoff використовує opaque non-public handle, а operation ID належить Operation Engine.

## Compatibility

Current `AssetSnapshot` shape збережено. Current permissive pure validator має бути tightened у P4-VS2. P4-DG1 надає evidence однієї SQLite durability domain для opaque payload chunks, але SQL/layout/staging primitives не визначаються цим design. P5 owns global derived indexes; P7 owns release schema/API freeze.

## Disposition

`final-result`; exact canonical proposal винесено у required [FIX-001](FIX-001.md).
