# BP3-05 / P3-VS2 / TASK-07.26-0029: Resource update slice

Status: backlog
Type: feature
Execution Mode: autonomous-implementation
Created: 2026-07-10
Depends On: done `BP3-04 / TASK-07.26-0028`

## Мета

Реалізувати own `title`/`description` Resource update/read-back через той самий write pipeline.

## Обсяг

Exact patch parsing, committed reload під storage session, missing/invalid/no-change outcomes, own `updated_at`, prepared index upsert, concurrent serialization, packed update/read-back/recovery.

## Поза обсягом

Parent/order/flags/aggregates/delete, P3-DG2, concrete driver, hooks/sync.

## Acceptance

Exactly one commit per effective change; no transaction for no-change; latest-state serialization; detached committed result/read-back і recovery consistency.
