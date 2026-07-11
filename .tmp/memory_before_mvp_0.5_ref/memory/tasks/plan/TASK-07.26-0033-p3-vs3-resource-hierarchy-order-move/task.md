# P3-VS3 / TASK-07.26-0033: Resource hierarchy, order і move

Status: done
Type: feature
Execution Mode: autonomous-implementation
Created: 2026-07-11
Depends On: published `APP-07.26-0032-001`; done `P3-STAB1 / TASK-07.26-0030`
Current Run: `runs/RUN-001` (completed, accepted)

## Мета

Реалізувати accepted hierarchy/order/create refinement/move foundation та typed integrity fail-close через єдиний P3 write pipeline.

## Обсяг

Dense order validator; hierarchy-aware root append; exact move facade/Core contract; coarse hierarchy locking; coherent hierarchy load; dynamic prepared multi-Resource write-set; journal unions/fingerprint; batch prepared index; typed driver/index integrity classification; Operation Engine + Runtime Fault Port synchronous fail-close; public diagnostic/error mapping для create/update/move.

## Поза обсягом

Delete visibility, Marks/KV, restore/include-deleted/cascade/purge, fine-grained hierarchy locks, Assets, concrete driver/layout, sync, hooks/plugins.

## Acceptance

- Root/same/cross-parent moves preserve dense active groups, cycles/orphans/deleted parents/ranges fail exactly, no-change має zero transaction/journal/timestamp.
- Root create append-иться після active roots; all effective staged snapshots мають common timestamp і canonical sorted IDs.
- One semantic commit/journal entry і atomic batch index publication; crash/fresh recovery coherent.
- Typed acquire/read/journal/index integrity maps to `STORAGE_INTEGRITY_FAILED`, safe operation diagnostic, intake close, facade unpublication, Module failed/no restart before cleanup; ordinary I/O і post-commit warnings зберігають existing semantics.
- Public packed API/types exact; readonly gate precedes input inspection; no internal handles/second path.

## Verification

Full/focused/package tests; property/matrix hierarchy tests; deterministic concurrency/failure/recovery; barrier-controlled cleanup race; public type/packed consumer snapshots; architecture/source scans; `npm run check`; `git diff --check`; independent audit без open P0-P3.

## Activation gate

Task і prepared RUN-001 не activated. Execution починається лише після explicit user decision; result template не є evidence.
