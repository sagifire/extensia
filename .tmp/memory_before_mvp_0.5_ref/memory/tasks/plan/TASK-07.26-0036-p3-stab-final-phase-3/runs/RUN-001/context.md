# Контекст RUN-001 P3-STAB

Preparation Status: prepared
Execution Status: not-started
Status: pending-activation

Authority: P3-DG1/P3-DG2 contracts, ADR-0005/0008/0009, APP-0024/APP-0032 and done BP3-01A…P3-VS5 results. Run fixes only evidenced Phase 3 defects without design change. Restore, Assets, concrete durability, sync, plugins або compatibility freeze become separate tasks. Execution/review потребують explicit activation.

## Inputs and sequencing

Read every dependency task/run result and its final independent audit, current production/package tests, canonical contracts and current implementation memory. Build a fresh traceability matrix rather than merging historical “green” claims. Stabilization begins only when all dependencies are `done` and performs baseline evidence before any remediation.

## Finding ownership

P0-P2 Phase 3 regression inside accepted behavior may be remediated in this run with tests. Design ambiguity, migration/compatibility choice, concrete durability, deferred feature or broad refactor becomes blocker/separate task. P3 hygiene may be fixed only if bounded and verified. No status `done` before whole-task human approval.

## Architecture pressure

Audit specifically checks broad VS3 integration did not create duplicate protocol/type validators, lifecycle fault paths or index authority; VS4/VS5 must reuse it. If stabilization repeatedly touches unrelated modules or needs workaround, propose architecture audit/refactor rather than conceal pressure.
