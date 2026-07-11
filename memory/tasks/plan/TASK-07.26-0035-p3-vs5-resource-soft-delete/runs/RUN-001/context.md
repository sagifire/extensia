# Контекст RUN-001 P3-VS5

Preparation Status: prepared
Execution Status: not-started
Status: pending-activation

Authority: order/delete/Mark/KV contract, ADR-0009, APP-0032, accepted report §§8/11–16/18. Done VS3/VS4 required; VS3 owns hierarchy/batch/integrity seams. Restore/cascade/include-deleted, new pipeline, partial commit, concrete layout або changed tombstone semantics are stop conditions. Execution/review потребують explicit activation.

## Exact current/source map

Before edits inspect post-VS3 hierarchy/move normalization, batch index validation/publication, integrity lifecycle, public query projections and post-VS4 aggregate handlers. Delete must compose through these exact seams. Source report state machine and visibility/failure/concurrency tables are test authority; draft sources are non-authoritative.

## Implementation sequence and risks

Add pure delete transition/eligibility, Core prepared set, protocol union, default index/query invisibility, recovery validation, public adapter/types, then matrices/package proof. Main risks are leaking tombstone existence, forgetting siblings/common timestamp, allowing active children, and converting committed delete into failure after publish/cleanup. Any restore or retention choice is blocker/follow-up.
