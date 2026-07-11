# Контекст RUN-001

Preparation Status: prepared
Execution Status: completed
Status: review-ready
Started: 2026-07-10

## Роль і режим

- Agent Role: Agent Implementer.
- Execution Mode: `autonomous-implementation`.
- User activation: «Виконай задачу BP2-02 / TASK-07.26-0016. Я дозволяю запуск субагентів для ревю.»

## Канонічні джерела

- `technical/public-read-contract.md` визначає exact requests/results, one-level tree semantics, detached snapshots і invalid ready-model boundary.
- ADR-0007 закріплює один internal consumer-owned seam без package export.
- `src/system-extensions/default-api/resource-read-port.ts` є єдиним materialized shared read contract/token.
- `domain/snapshots.ts` і `domain/scalars.ts` є canonical validation/clone/type sources.
- `runtime/lifecycle.ts` є accepted internal startup/rollback/stop/disposal host.
- `technical/rules.md` визначає consumer-owned ports, fresh composition, no hidden write/public IoC і safe diagnostics.

## Початковий factual state

- `BP2-01`, owner application task і `BP2-01A` мають status `done`; `APP-07.26-0021-001` published.
- Shared read-port source існує, але driver/index/provider/lifecycle binding відсутні.
- Root package export порожній; BP2-03 лишається `backlog` і не активується цим run.
- Worktree був clean на activation; Git читається через session-local `safe.directory` override через ownership sandbox.

## Exact fixture matrix

- Valid aggregate: detached clone індексується; input iteration order не впливає на children order.
- Missing valid ID: `CoreReadResult` failure `RESOURCE_NOT_FOUND`.
- Invalid aggregate shape/local invariant: startup reject, best-effort close, index not ready.
- Duplicate Resource ID: startup reject.
- Cycle, включно із self-parent: startup reject.
- Orphan: ненульовий `parent_id`, відсутній у повністю scanned наборі, startup reject як порушення tree invariant.

## Architecture boundaries

- Index є process-local derived read model, а driver лишається source of truth.
- BP2-02 bind/adapt-ить provider до consumer-owned `CORE_RESOURCE_READ_PORT`; contract не дублюється.
- Lifecycle contribution self-cleans rejected startup, бо existing host додає до cleanup ledger лише resolved starts.
- Потреба у lazy completeness, mutation path, public export, extra request/error або raw resolver є blocker для design correction.
