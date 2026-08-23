# RSCH-001: Multi-instance synchronization, cursor і refresh contract

Status: completed
Related Task: [P5-DG2 / TASK-07.26-0057](task.md)
Related Run: [RUN-001](RUN-001/index.md)
Detailed Report: [Exact multi-instance synchronization, cursor і refresh contract](../../../reports/research/2026-07-18-extensia-multi-instance-synchronization-contract.md)

## Research question

Який exact bounded contract дозволяє кільком cooperating Extensia processes застосовувати committed changes у journal order до одного coherent process-local read model, не перетворюючи cursor/Index на durable truth, не приховуючи SQLite contention і не вводячи distributed multiwriter/notification/checkpoint subsystem?

## Result

- Process-local volatile cursor публікується атомарно з immutable generation; restart виконує coherent rebuild + same-observation head capture. Durable cursor без atomic durable generation checkpoint відхилений.
- `JournalSequence` є єдиною order authority. Own/external entries проходять один traversal; gap/duplicate/regression/ahead/malformed state fail-close, transient failure cursor не просуває.
- Explicit `query.refresh()` є correctness primitive. Default `manual`; opt-in polling лише coalesced trigger із bounded retry/deadline/equal jitter та safe diagnostics. Notification deferred як optional wake hint.
- Full/readonly adapters реалізують sibling internal committed-change observation port із coherent metadata+head snapshot, delta limit `256` і complete-rebuild fallback; raw session/transaction/layout не витікає, readonly zero-write.
- Local commit, lazy load і external refresh використовують один publication coordinator; storage I/O відбувається поза short mutation section, stale observation ніколи не overwrite-ить newer local generation.
- Initial post-stabilization candidates: exactly two same-host cooperating processes `full/full` або `full/readonly`; designated writer recommended. Current support boundary unchanged до implementation, audit і explicit Phase 5 gate.
- Exact downstream chain: `P5-WP1 -> P5-HARD1 -> P5-VS1 -> P5-VS2 -> P5-STAB -> P5-AUD1`; internal retry/single-flight/lifecycle exists before public refresh/config exposure, and packages/activation require separate owner decisions.

## Disposition

`final-result` для TASK-0057. Exact canonical proposal готується у [FIX-001](FIX-001.md); жодну downstream task не створено й не активовано.
