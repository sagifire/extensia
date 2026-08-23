# RSCH-001: Completeness, query та coherent read-model contract

Status: completed
Related Task: [P5-DG1 / TASK-07.26-0056](task.md)
Related Run: [RUN-001](RUN-001/index.md)
Detailed Report: [Exact read-model completeness і coherent generation contract](../../../reports/research/2026-07-17-extensia-read-model-completeness-query-contract.md)

## Research question

Який exact contract дозволяє підтримати `greedy` і `lazy` metadata loading, не послабивши current `getResource`/`getResourceTree`, не видаючи partial cache за complete result, не перетворюючи Index на authority й не імпортуючи cursor/refresh/freshness decisions із P5-DG2?

## Result

- `greedy` публікує ready лише після complete coherent observation, integrity validation і atomic publication однієї immutable generation.
- `lazy` може тримати selective generation, але point/tree success потребує exact coverage proof; global internal query або будує complete generation, або повертає typed unavailable/failure. Partial success заборонений.
- Existing public `getResource`/`getResourceTree` і value shapes збережені. Новий draft public catalog не приймається без product need; Phase 5 додає лише experimental loading config/visibility та internal query/projection contract.
- Accepted internal projections: Resource by ID, direct children, Asset by ID/owner, primary Asset, same-Resource lineage reverse і exact Mark identity lookup. Вони належать одній generation і не публікуються окремими mutable maps.
- Full/readonly runtimes використовують один consumer-owned metadata observation port із semantic requests і detached observations; raw session, transaction, cursor та driver layout не витікають.
- Completeness описує coverage однієї coherent generation; cross-process freshness, cursor, refresh/polling/notification, retry/backoff і stale window лишаються P5-DG2.

## Disposition

`final-result` для TASK-0056. Exact canonical proposal підготовлений у [FIX-001](FIX-001.md); application потребує separate human approval.
