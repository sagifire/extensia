# ADR-0015: Multi-instance synchronization, cursor і refresh

Status: accepted target design
Date: 2026-07-18
Decision Owner: P5-DG2 / TASK-07.26-0057
Evidence: `memory/reports/research/2026-07-18-extensia-multi-instance-synchronization-contract.md`

## Контекст

P5-RS1 довела conditional storage feasibility, але current runtimes мають stale process-local Index, readonly cursor asymmetry і scheduler-sensitive SQLite contention. Accepted P5-DG1 визначила one coherent generation, проте не володіла freshness/cursor/refresh policy.

## Рішення

- Для driver з committed-change observation cursor є volatile process-local state і публікується атомарно з immutable generation. Legacy manual driver має tagged `static-unsupported` coordinator без cursor/head/sync actor. Restart supported branch виконує coherent rebuild + same-observation journal-head capture; durable cursor без atomic durable generation checkpoint заборонений.
- `JournalSequence` є єдиною order authority. Own/external entries проходять один traversal; actor/timestamp не order/merge authority. Gap/duplicate/regression/ahead/malformed state fail-close.
- Experimental `query.refresh()` є correctness primitive; default synchronization `manual`. Opt-in polling лише admission-epoch coalesced trigger того самого refresh з bounded retry/deadline/equal jitter і safe diagnostics; scheduler закриває cohort перед first adapter invocation, а post-invocation callers отримують окрему serialized trailing epoch, а не earlier chain result.
- Notification deferred як optional wake hint. Tight list polling, second journal, raw session leakage, runtime leader election і partial-to-head batch publication відхилені.
- Full/readonly adapters bind-ять sibling internal committed-change observation port: coherent journal+metadata+head snapshot, delta limits 256/256 і complete-rebuild fallback; readonly zero-write.
- Local commit, lazy load і external refresh використовують один publication coordinator. Storage I/O відбувається поза short mutation section; stale observation discard/re-observe-иться.
- Initial post-stabilization candidates — exactly two same-host cooperating `full/full` або `full/readonly` processes; explicit designated writer recommended. Support claim лишається gated P5-STAB/P5-AUD1/human Phase 5 gate.

## Retry і lifecycle

- Supported startup observation та refresh transient failures runtime-retry-яться лише в bounded lifecycle-owned chain; integrity/capability/config не retry-яться. Startup exhaustion не публікує ready/facades. Public writes лишаються caller-managed на pre-commit `STORAGE_LOCK_FAILED`; ambiguous COMMIT reconciliation не обмежується refresh deadline.
- Stop закриває refresh intake/timers, cancel-ить backoff/pre-observation, drain-ить refresh і operations, а потім close-ить driver. Background integrity використовує internal RuntimeFaultSink для fail-close.

## Наслідки

Phase 5 отримує exact implementation chain `P5-WP1 -> P5-HARD1 -> P5-VS1 -> P5-VS2 -> P5-STAB -> P5-AUD1`: internal retry/single-flight/lifecycle implementation передує public refresh/config exposure. Approval/application design не створює й не активує packages. Multi-host/HA, arbitrary instance count, retention/compaction, durable checkpoint, notification implementation і hard SLA лишаються поза scope.
