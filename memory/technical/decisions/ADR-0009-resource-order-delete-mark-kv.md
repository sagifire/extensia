# ADR-0009: Resource order, soft delete, Mark і KV semantics

Status: accepted
Date: 2026-07-11
Authority: approved `P3-DG2 / TASK-07.26-0031 / FIX-001`, applied by `TASK-07.26-0032`

## Контекст

Після стабілізації journal-backed create/update Phase 3 потребує exact hierarchy/order, move, delete, Mark/KV і integrity-failure semantics без другого write path або assumptions про concrete storage layout.

## Рішення

- Active siblings з exact common `parent_id` мають dense `order_index` permutation `0..n-1`; root create append-иться, а move задає destination parent та insertion index після removal.
- Hierarchy mutations серіалізуються process-local lock `resource-hierarchy` разом із target key; lock plan завершується до storage session.
- Move/delete є одним atomic sorted multi-Resource semantic commit, one committed journal entry і one batch prepared index publication.
- Delete є leaf-only soft delete; tombstone прихований default reads, restore/include-deleted/cascade/purge deferred.
- `setMarks` повністю замінює canonical sorted set; `setKV` повністю замінює один namespace, empty mapping видаляє його.
- Dynamic exact write-set визначає immutable `PreparedResourceWriteSet` після coherent load; pre-session `resource_hints` не є authority.
- Typed durable/index integrity defects fail-close runtime синхронно до cleanup і мапляться в `STORAGE_INTEGRITY_FAILED`; ordinary I/O лишається ordinary write/lock failure, post-commit fault — committed warning.

## Відхилені альтернативи

- Sparse/fractional ordering, clamping index і best-effort sibling updates — відхилені через ambiguity та partial-state risk.
- Fine-grained hierarchy lock plan до latest-state load — відхилений через stale plan і lock acquisition під session.
- Cascade delete, immediate restore і include-deleted public reads — відкладені як окремі product gates.
- Patch semantics для Marks/KV — відхилені на користь deterministic replacement/no-change/fingerprint behavior.
- Index як authority, independent journal append або facade-direct driver path — заборонені чинними ADR-0005/0008.

## Наслідки

- Correctness-first hierarchy serialization знижує local concurrency, але не створює нової authority.
- P3-VS3 володіє широкою shared-foundation зміною; P3-VS4/VS5 виконуються послідовно, щоб не редагувати ті самі seams паралельно.
- Mark/KV limits та experimental public signatures стають compatibility-relevant після подальшого freeze.
- Stored pre-gate root ordering не отримує migration promise в Phase 3.

## Межі

ADR не визначає restore, purge, Asset, physical layout/durability, External Change Sync, hooks/plugins або release compatibility freeze.
