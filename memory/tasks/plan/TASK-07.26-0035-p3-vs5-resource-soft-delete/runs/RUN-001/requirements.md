# Вимоги RUN-001 P3-VS5

Preparation Status: prepared
Execution Status: not-started
Status: pending-activation
Agent Role: Implementation Agent
Execution Mode: autonomous-implementation

## Результат і green gate

Реалізувати exact leaf delete/default invisibility: public errors, target+sibling prepared set, tombstone preservation, dense reindex/common timestamp, read filtering, integrity validation, concurrency/crash/recovery/warning matrices, packed/full package gates, independent audit без open P0-P3 та complete memory/language/architecture gates.

## Заборони

Не додавати restore/include-deleted/cascade/purge/retention, separate path, partial sibling commit, Mark/KV redesign, Assets або layout/sync/hooks assumptions.

## Per-file implementation boundary

- Public contract/facade: exact `deleteResource(id)` and `ResourceDeleteError`; repeated delete sole tombstone-specific code.
- Domain/Core: leaf eligibility, tombstone transition, source active sibling normalization and exact target+sibling prepared set.
- Read/index: default by-id/list/children/tree invisibility and batch validation; command may still return detached tombstone.
- Protocol/recovery: `resource.delete`, one semantic commit/entry, startup active-parent/order/visibility validation; reuse VS3 integrity/lifecycle seams.

## Granular state/error matrix

- Active missing target → not-found; tombstone → `RESOURCE_ALREADY_DELETED`; any active child → `RESOURCE_HAS_CHILDREN`.
- Root/non-root, first/middle/last/only sibling; dense source reindex; target preserves parent/order/locked/hidden/Marks/KV, sets only delete flag + common timestamp.
- Locked/hidden do not block/change. Default get/list/children/tree hides tombstone; update/move/Marks/KV on it return not-found.
- Invalid/no-op failures have zero transaction/journal; effective delete stages exact changed set ID-sorted with one timestamp/commit/entry.
- Corrupt active child of tombstone/missing parent, duplicate/gap order or visible tombstone is typed integrity and blocks ready/fail-closes runtime.

## Failure/concurrency/verification matrix

Delete vs move/create/aggregate writes under hierarchy/session serialization; repeated concurrent delete; stop during admitted delete; begin/stage/commit/publish/cleanup cuts; crash after commit before publish; fresh recovery. Run focused matrices then `npm run check`, packed/type/package gates, `git diff --check`, source scans for cascade/include-deleted/new paths and record exact evidence.

## Memory sync expectation

Update factual current implementation/read behavior, technical architecture/stack if needed, task/run/result/progress/state/indexes. Target/product remain `not needed` unless approved correction. Record language, architecture pressure, general-level states, risks and independent audit.
