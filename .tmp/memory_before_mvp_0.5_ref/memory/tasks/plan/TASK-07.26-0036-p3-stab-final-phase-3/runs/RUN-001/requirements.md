# Вимоги RUN-001 P3-STAB

Preparation Status: prepared
Execution Status: not-started
Status: pending-activation
Agent Role: Stabilization Agent
Execution Mode: autonomous-implementation

## Evidence matrix

- Clean install/build/types/tests/lint/format/package/tarball/packed consumer and reproducibility.
- Public API/error/diagnostic/export exactness across create/update/move/delete/Marks/KV.
- Dense order, active-parent, tombstone visibility, aggregate canonicalization і detached DTO invariants.
- Failure cuts, one-entry commits, warnings, recovery, typed integrity/delayed cleanup and concurrency schedules.
- Source scans for duplicate paths/authority/deferred leakage.

## Green gate

Evidence green або finding remediated within scope; full/focused gates green; independent audit без open P0-P3; complete result memory/language/architecture review. No feature expansion.

## Per-file/evidence boundary

- Production edits allowed only to remediate evidenced Phase 3 defects in existing facade/Core/domain/operation/driver/index/lifecycle seams and tests; no new capability.
- Package/config/exports changes only when exact root/packed reproducibility finding requires them; dependency/version changes require separate authority.
- Memory updates: factual domain current, technical architecture/stack, task result/progress/state/indexes and explicit Phase 3 gate status; canonical design changes require isolated correction/human decision.

## Detailed matrices

- API: exact root values/types/error unions/labels/diagnostic stage, readonly-before-inspection, hostile descriptors, detached readonly DTO.
- Semantics: create root append; update no-change; all move placements/errors; Mark/KV limits/replacement/equality; delete state/visibility; common timestamps and exact staged sets.
- Protocol: every effective command one semantic commit/entry; prepared IDs/changes/fingerprint agreement; batch publication; no independent append or facade/index authority.
- Failure/recovery: acquire/read/prepare/begin/stage/commit/publish/cleanup cuts; ordinary vs typed integrity; delayed cleanup; crash/fresh composition; corrupt journal/tree/order/visibility ready-block.
- Concurrency: create/move/delete hierarchy FIFO; aggregate same-resource FIFO; cross-resource session ordering; stop-and-drain.
- Package/reproducibility: clean install, generated artifact hygiene, tarball inventory, packed consumer and byte/content comparisons required by project scripts.

## Commands and evidence

Discover repository scripts first; run focused matrices, then `npm run check`, exact package/tarball/packed scripts, `git diff --check` and source/export scans. Capture Node/npm versions, commands, test counts, artifact inventories/hashes where applicable and before/after finding dispositions. Do not claim green from prior tasks.

## Review and memory gate

Independent audit is mandatory after remediation. `result.md` must distinguish new evidence from inherited results, list scope/no-scope diff, all general-level memory states, language gate, architecture pressure, residual risks/follow-ups and human Phase 3 review request.
