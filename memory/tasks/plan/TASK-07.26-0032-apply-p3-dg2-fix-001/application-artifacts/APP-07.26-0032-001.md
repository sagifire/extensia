# APP-07.26-0032-001: Canonical P3-DG2 order/delete/Mark/KV design

Status: published
Published: 2026-07-11
Application Task: `TASK-07.26-0032`
Source Fixation: `TASK-07.26-0031 / FIX-001` (`approved`)
Applied Fixation: [TASK-0032 / FIX-001](../fixations/FIX-001.md)

## Зміст

- Applied canonical [order/delete/Mark/KV contract](../../../../technical/order-delete-mark-kv-contract.md) і ADR-0009: dense active hierarchy/order, insertion move/root append, leaf soft delete/default invisibility, full-replace Marks, namespace-replace/delete KV, exact prepared write-set/batch index і typed integrity fail-close.
- Preserved ADR-0005/0008 one Core pipeline, outcome-definite one semantic commit/committed entry, driver authority, recovery-before-ready і committed warning semantics.
- Applied bounded technical/domain/product/task synchronization without current implementation claim.
- Prepared backlog-only P3-VS3/TASK-0033, P3-VS4/TASK-0034, P3-VS5/TASK-0035 and final P3-STAB/TASK-0036, each with complete pending RUN-001 package; none activated.
- Production source/tests/dependencies/exports/runtime behavior unchanged. Restore/include-deleted/cascade/purge, Assets, concrete layout, sync, hooks/plugins and compatibility freeze remain deferred.

## Verification

- Independent pre-application audit: initial corrections, final `APPLY`; open P0-P2 none.
- Independent post-application audit: remediation rounds, final `PASS`; open P0-P3 none.
- Exact public signatures/error unions/precedence, Mark/KV validation/limits, hierarchy/delete/protocol/integrity semantics traced to accepted report/FIX.
- All downstream task index links resolve; every RUN status is pending/not-started with no execution claims.
- `git diff --check` green; non-memory diff empty; language, upward consistency and architecture-pressure gates passed.

## Downstream gate

Next possible implementation activation is P3-VS3 only after separate explicit user decision. Sequential done gates are P3-VS3 → P3-VS4 → P3-VS5 → final P3-STAB. Publication does not activate any task or run.
