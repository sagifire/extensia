# Контекст RUN-001 P3-VS3

Preparation Status: prepared
Execution Status: completed
Status: review-ready
Started: 2026-07-11
Completed: 2026-07-11

## Authority

`technical/order-delete-mark-kv-contract.md`, ADR-0009, ADR-0005/0008, write protocol contract, `APP-07.26-0032-001`, accepted report §§5–7/11–16/18 і P3-STAB1 evidence.

## Foundations і stop conditions

Foundations: shared Core write port, Operation Engine, full fake/recovery, create/update, index і facade. Зміна accepted semantics, second path, concrete layout, public internals, locks under session або deferred features зупиняє run. Context prepared; `Started` відсутній, execution/review потребують explicit activation.

## Exact source map

- Normative: `memory/technical/order-delete-mark-kv-contract.md` hierarchy/public/protocol/index/integrity sections; ADR-0009; write contract/ADR-0008.
- Design evidence: accepted report §§5–7, 11–16, 18 and source RSCH/FIX; APP-0032 must be published before activation.
- Current implementation: inspect existing Resource create/update facade/Core handlers, consumer-owned write port, operation engine/lock queue, full-driver adapter, prepared greedy index seam, runtime lifecycle/facade publication and their tests before edits.

## Dependency and sequencing

P3-STAB1 is done. VS3 owns every shared seam used by VS4/VS5; do not defer integrity or batch foundation downstream. Internal phases may be committed together in one run but do not create separate authority or activation gates.

## Risk/stop register

High-risk areas: stale sibling plans, range semantics after removal, post-commit publication, typed-vs-ordinary error classification and cleanup-window race. Any need for fine-grained locks, physical layout, migration promise, public transactions, delete/aggregate behavior or weakening ADR-0008 is a blocker requiring owner decision.
