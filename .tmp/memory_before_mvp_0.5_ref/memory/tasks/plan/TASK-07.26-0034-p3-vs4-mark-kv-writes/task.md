# P3-VS4 / TASK-07.26-0034: Mark і KV writes

Status: backlog
Type: feature
Execution Mode: autonomous-implementation
Created: 2026-07-11
Depends On: done `P3-VS3 / TASK-07.26-0033`
Current Run: `runs/RUN-001` (prepared, not activated)

## Мета й обсяг

Реалізувати exact descriptor-safe `setMarks`/`setKV` parsing, limits, canonicalization, full replacement/namespace delete/no-change, public types/errors, one-Resource pipeline, journal/fingerprint/recovery і detached packed read-back.

## Поза обсягом

Move/delete, Mark query/stats/index, patch APIs, Assets, plugins/hooks, concrete layout і sync.

## Acceptance і verification

Hostile descriptors/prototypes/sparse arrays; exact string/count/int32/total boundaries; duplicates; empty clear/delete; property-order-insensitive equality; no-change zero transaction; serialized schedules; one commit/entry, recovery, detached snapshots, readonly-before-inspection, exact packed API, full package/source scans й independent audit без open P0-P3.

Task/run не activated до explicit user decision.
