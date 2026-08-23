# Контекст виконання: RUN-001

Related Task: [P5-DG2 / TASK-07.26-0057](../task.md)
Prepared: 2026-07-17
Prepared By: Planning Agent `/root`
Refined: 2026-07-17 після accepted P5-RS1 і explicit user planning request
Refined By: Agent Assistant `/root`
Previous Run: none

## Мета run

На accepted P5-RS1 evidence та applied P5-DG1 read-model contract порівняти architecture options і спроєктувати outcome-definite process synchronization, cursor/refresh, retry/backoff і lock-contention lifecycle, який зберігає coherent process-local view, чесну cross-instance stale boundary та дає exact downstream implementation task map.

## Ефективні вимоги

1. P5-RS1 і P5-DG1 accepted/applied; run лишається prepared до окремого user activation decision.
2. Committed journal sequence є order authority; Index derived/process-local і не стає durable truth.
3. Cursor не може випередити повністю applied coherent generation; no-skip після restart є обов’язковим.
4. Explicit refresh є candidate correctness primitive; polling, driver notification, hybrid triggers і topology variants мають бути порівняні з exact owner disposition, а не вирішені наперед.
5. Actor filtering не змінює sequence traversal або cursor advancement correctness.
6. Transient failure не маскується як success і не просуває cursor; retry має bounded owner/attempt/deadline/backoff/jitter/cancellation contract, integrity failure fail-close за exact matrix.
7. Local commit й external application координуються одним process-local publication owner.
8. Lock/session policy має охопити P5-RS1 scheduler variance, reader/writer contention, session lifetime, starvation indicators і thundering herd без послаблення SQLite safety.
9. Design створює `RSCH-*`, detailed report і exact `FIX-*`; application лише після approval.
10. Result містить exact похідну task decomposition з dependencies, acceptance, evidence gates і allowed parallelism.
11. Run не активує implementation або stabilization tasks.

## Обсяг

- Accepted evidence/contracts synthesis.
- Architecture option comparison; cursor/order/topology/refresh/polling/notification/stale/retry/lock/failure/lifecycle/publication/seam design.
- Exact scenario/state/error matrices і downstream verification plan.
- Exact derived implementation/stabilization/audit task contracts або owner-ready proposal set без activation.
- Formal artifacts, self-review, independent audit й Review Request.

## Поза обсягом

- Implementation, notification subsystem implementation, retention/compaction, durable checkpoint, direct reconcile, distributed/HA sync, P7 freeze. Порівняння notification alternative входить у design scope.

## Критерії приймання run

- Виконано всі одинадцять task acceptance criteria.
- Exact contract простежений до P5-RS1/P5-DG1 і не розширює topology claims.
- Failure/cursor/publication states не мають ambiguous success або silent stale claims.
- Downstream prerequisites однозначні; жодна task не activated.
- Self-review й independent audit не мають open P0–P3.

## Обов’язкове task-specific читання

- Accepted P5-RS1 task/result/RSCH/detailed report/evidence.
- Accepted/applied P5-DG1 task/result/RSCH/FIX/contracts.
- Phase 5 task-set plan, roadmap і delivery plan.
- `memory/technical/write-journal-recovery-contract.md`, architecture/rules/open questions, relevant ADR.
- Current journal/session/index/read/write/lifecycle source and tests through repository navigation.
- Phase 4 concrete SQLite profile/evidence relevant to supported topology.

## Заплановані результати

1. Architecture options/trade-off matrix і owner-ready recommendation.
2. Cursor/order/restart state machine.
3. Role/topology and refresh/polling/notification/stale contract.
4. Retry/backoff/deadline/cancellation і lock/session/fairness policy.
5. Failure/lifecycle/publication coordinator matrices.
6. Narrow observation seam contract.
7. Exact downstream task map/contracts і activation graph.
8. `RSCH-*`, detailed report, `FIX-*`, result/self-review/audit і Review Request.

## Перевірки

- model/scenario review for gaps/duplicates/replay/own actor/restart;
- concurrent local commit vs refresh interleavings;
- retry storm, deadline exhaustion, cancellation, long-session, reader/writer contention і starvation matrices;
- startup/stop/drain/transient failure matrices;
- API/config/diagnostic privacy review;
- two-process verification plan traced to P5-RS1 harness;
- independent audit exact proposals and architecture authority.

## Ризики

- Evidence may narrow supported roles below roadmap assumptions.
- Polling interval/backoff can become accidental SLA.
- Retry може приховати contention, множити load або створити unbounded operation latency.
- Leader/designated-writer option може внести зайву availability/ownership subsystem complexity.
- Whole-batch reload can increase lock and event-loop pressure.
- Public refresh semantics can freeze before P7 if compatibility label is unclear.

## Припущення

- P5-RS1 accepted і supplies rerunnable exact-profile evidence, including negative results and scheduler-sensitive contention.
- P5-DG1 defines coherent generation and invalidation boundary.
- A negative topology result may validly narrow P5-VS2 rather than force a workaround.

## Умови зупинки

- Accepted P5-DG1 contract changes or conflicts materially with accepted P5-RS1 evidence before activation.
- Required topology needs storage protocol change or support claim outside Phase 5.
- Exact semantics вимагають реалізації notification, retention або durable checkpoint до owner disposition, якої design scope не може безпечно надати.
- Independent audit unavailable; do not substitute same-agent review.

## Activation

Run Status: prepared
Activation: лише після accepted/applied P5-DG1 і окремого explicit рішення користувача; refined package не активує design run або реалізацію Phase 5.
