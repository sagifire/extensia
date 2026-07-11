# Вимоги RUN-001 P3-VS3

Preparation Status: prepared
Execution Status: not-started
Status: pending-activation
Agent Role: Implementation Agent
Execution Mode: autonomous-implementation

## Результат і фази

Матеріалізувати exact hierarchy/order/move та integrity foundation без redesign: (1) operation/type seams; (2) hierarchy validators/root append/move normalization; (3) coarse lock, one session/commit і batch index; (4) typed integrity + Runtime Fault Port synchronous fail-close; (5) verification/audit/memory sync.

## Green gate

Task acceptance; hierarchy/concurrency/crash/recovery matrices; ordinary-vs-integrity injection; delayed cleanup race; compile/packed/package gates; architecture scans; independent audit без open P0-P3.

## Заборони

Не split-ити VS3 ownership, не acquire-ити locks під session, не створювати partial commit/index, second path, delete/Mark/KV/restore або public internals.

## Per-file implementation boundary

- Public contracts/facade: extend existing root contract/export and storage adapter only for exact `MoveResourceInput`, `moveResource`, exact `ResourceMoveError`, `STORAGE_INTEGRITY_FAILED` in existing write union and `SafeDiagnostic.stage = operation`.
- Shared protocol/Core: rename plan hint semantics to `resource_hints`; add immutable `PreparedResourceWriteSet`; extend operation/journal kinds; adapt create/update without public behavior change.
- Domain/hierarchy: pure stored graph, active-parent, dense-order, insertion-move and root-append validators/normalizers.
- Runtime: existing lock queue/Operation Engine/full-driver/index/lifecycle modules only; add coarse hierarchy key, batch prepare/publish, typed integrity error/result and no-throw Runtime Fault Port.
- Tests: unit/property, integration, lifecycle race, recovery, package/type/packed consumer; no parallel test-only contracts.

## Granular acceptance matrix

- Move: root→root, root→child, child→root, same/cross-parent first/middle/end; target removal before range; `0..destinationCount`; self/descendant/missing/deleted parent; missing/deleted target; exact no-change.
- Write-set: only effective target/siblings, unique ID sort, one common timestamp, exact journal IDs/changes/fingerprint, one commit/entry, no transaction on invalid/no-change.
- Create refinement: active-root append, tombstones excluded, three-candidate collision behavior unchanged.
- Index/recovery: atomic batch visibility, dense/tree validation before stage, crash after commit/before publish rebuilds exact state.
- Errors: exact Section 11 precedence; malformed move → `RESOURCE_INPUT_INVALID`; malformed UUID → `INVALID_RESOURCE_ID`; ordinary acquire/I/O distinct from typed integrity.
- Integrity: storage/index injection, safe diagnostic, synchronous intake close + facade unpublication + failed Module before delayed cleanup, new calls `MODULE_NOT_READY`, same instance no restart.

## Commands/evidence plan

Run repository-defined focused Vitest targets during development, then `npm run check`, package/tarball/packed consumer gates from current scripts, `git diff --check`, root export/type snapshots and source scans for direct driver/journal/index access, locks-under-session and duplicate execute paths. Record exact commands, test counts, environment and failure-injection barriers in `result.md`.

## Memory sync expectation

Update domain current implementation state, technical architecture/stack only for factual implementation, task/run/result/progress/state and direct indexes. Product/target contracts normally `not needed` unless an approved correction exists. Record all general-level states, language gate, architecture pressure, risks/follow-ups and independent audit.
