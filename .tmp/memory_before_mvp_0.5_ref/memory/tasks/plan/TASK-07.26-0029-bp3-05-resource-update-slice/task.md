# BP3-05 / P3-VS2 / TASK-07.26-0029: Resource update slice

Status: done
Type: feature
Execution Mode: autonomous-implementation
Created: 2026-07-10
Depends On: done `BP3-04 / TASK-07.26-0028`

Activated: 2026-07-11 by explicit user request; independent subagent review authorized.

## Мета

Реалізувати own `title`/`description` Resource update/read-back через той самий write pipeline.

## Обсяг

Exact patch parsing, committed reload під storage session, missing/invalid/no-change outcomes, own `updated_at`, prepared index upsert, concurrent serialization, packed update/read-back/recovery.

## Поза обсягом

Parent/order/flags/aggregates/delete, P3-DG2, concrete driver, hooks/sync.

## Acceptance

Exactly one commit per effective change; no transaction for no-change; latest-state serialization; detached committed result/read-back і recovery consistency.

## Review handoff

RUN-001 завершена; повний package gate зелений (171 tests), repeated independent audit повернув `REVIEW_READY` без відкритих P0-P3. Whole-task human review pending; задача не є `done`, а P3-STAB1 не активована.

## Closure

Whole-task result прийнятий користувачем 2026-07-11. Задача завершена як `done`; це рішення не активує `P3-STAB1 / TASK-07.26-0030`.
