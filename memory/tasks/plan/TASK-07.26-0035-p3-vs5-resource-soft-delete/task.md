# P3-VS5 / TASK-07.26-0035: Resource soft delete і visibility

Status: backlog
Type: feature
Execution Mode: autonomous-implementation
Created: 2026-07-11
Depends On: done `P3-VS3 / TASK-0033`; done `P3-VS4 / TASK-0034`
Current Run: `runs/RUN-001` (prepared, not activated)

## Мета й обсяг

Реалізувати exact leaf-only soft delete, sibling reindex, tombstone result, default read/tree invisibility, public errors і recovery integrity поверх VS3 hierarchy/batch foundation.

## Поза обсягом

Restore/include-deleted/cascade/purge/retention, Mark/KV changes, Assets, concrete layout, sync, hooks/plugins.

## Acceptance і verification

Missing/repeated/children/flags/root cases; tombstone preservation/common timestamp; dense sibling reindex; default lookup/list/tree invisibility; active-parent invariant; concurrent hierarchy/aggregate schedules; one commit/entry, crash/recovery, committed warnings, readonly-before-inspection, packed/full package gates й independent audit без open P0-P3.

Task/run не activated до explicit decision.
