# ADR-0014: Read-model completeness і coherent generation

Status: accepted target design
Date: 2026-07-17
Decision Owner: P5-DG1 / TASK-07.26-0056
Evidence: `memory/reports/research/2026-07-17-extensia-read-model-completeness-query-contract.md`

## Контекст

Accepted runtime потребує `greedy` і `lazy`, але current complete Resource index не має lazy coverage, global query semantics або structural multi-projection generation. Partial lazy cache не може послабити existing exact point/tree reads чи стати новою authority.

## Рішення

- Public config додає optional descriptor-safe `readModel.loading`, default `greedy`; `core.mode` не експонується. Existing `getResource`/one-level `getResourceTree` value shapes незмінні.
- Успішний read завжди complete для exact point, one-level або storage-global scope. Cache miss без coverage proof є unknown; empty/not-found потребує negative proof. Partial success відсутній.
- Lazy global query потребує exhaustive semantic selector; інакше typed unavailable/failure. Implicit full hydration під query заборонена.
- Один immutable `ReadModelGeneration` містить Resource/children, Asset owner, primary, same-Resource lineage reverse, exact Mark lookup і coverage. Усе публікується одним synchronous no-fail root swap.
- Local committed change публікує structural-sharing/delta generation після durable commit; ordinary small write не виконує O(N) clone/rebuild усіх maps.
- Full/readonly adapters bind-ять один consumer-owned metadata observation port із detached semantic point/closure/exhaustive results; raw session/transaction/cursor/layout не виходить у Core/public query API.
- Completeness не є freshness. Cursor, refresh/polling/notification, actor ordering, stale window, retry/backoff і multi-instance serialization належать P5-DG2.

## Відхилені альтернативи

- Partial arrays/trees із warning або metadata — відхилені через другий consumer consistency model.
- Повний draft public query catalog — відкладений до exact product contracts; existing surface не розширюється speculative methods.
- Independent mutable projection maps, Index-as-truth, raw session reads та lazy without global integrity gate — відхилені.
- Implicit O(N) hydration global query і O(N) rebuild кожного write — відхилені як architecture pressure.

## Наслідки

P5-WP1/P5-VS1 можуть реалізувати coherent greedy/lazy generation та observation adapters після application. P5-DG2 використовує той самий publication coordinator для external changes. Public additions лишаються experimental до P7 freeze; production support claim не створюється.
