# Вимоги RUN-001

Preparation Status: prepared
Execution Status: completed
Status: completed
Started: 2026-07-11
Agent Role: Implementation Agent
Execution Mode: autonomous-implementation

## Результат

Реалізувати contract-faithful internal deterministic full Resource fake з isolated/shared backing state, exclusive recovery-clean sessions, private staging, outcome-definite semantic commit, committed-only contiguous journal, cursor/integrity validation, crash/fresh-composition recovery та coherent startup scan coordinator.

## Межі

- Не реалізовувати public Resource create/update success, Resource handler, BP3-02 engine behavior, opaque public driver factory або concrete durability/layout.
- Не створювати independent journal append path, test-only duplicate storage protocol чи package export.
- Fake fixture controls та inspection лишаються internal test-support surface і не є durability claim.

## Green gate

Failure injection на protocol cut points; readonly/full capability matrix; outcome-definite commit; operation ID idempotency/integrity; canonical contiguous sequence/cursor validation; rollback/finalization/ambiguous recovery matrix; coherent same-session scan; crash/fresh composition; reusable contract suite; `npm run check` і `git diff --check` зелені; independent audit без відкритих P0-P3; result містить architecture-pressure review, language gate і memory sync.
