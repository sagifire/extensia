# Вимоги RUN-001

Preparation Status: prepared
Execution Status: completed
Status: completed
Started: 2026-07-11
Agent Role: Implementation Agent
Execution Mode: autonomous-implementation

## Результат

Реалізувати public root Resource update/read-back vertical slice через наявний Operation Engine і semantic commit: exact `title`/`description` patch, latest committed reload під storage session, own `updated_at`, prepared index upsert та detached committed result.

## Межі

- Не реалізовувати parent/order/flags/aggregates, Mark/KV, delete/restore, concrete driver, hooks, sync або P3-DG2.
- Не створювати facade-direct driver path, independent journal append, окремий update engine чи test-only duplicate protocol.
- Не змінювати readonly behavior, create semantics або opaque experimental full-driver boundary.

## Green gate

Readonly failure до inspection input; descriptor-safe exact ID/patch parsing; missing, invalid і no-change outcomes; no transaction/journal для no-change; reload latest committed state під session; serialized concurrent updates; exactly one semantic commit для effective change; own `updated_at`; prepared post-commit index publication; committed post-fault warning/fail-close semantics; recovery і detached read-back; strict root/type/package snapshots; `npm run check` і `git diff --check` зелені; independent audit без відкритих P0-P3; result містить architecture-pressure review, language gate і memory sync.
