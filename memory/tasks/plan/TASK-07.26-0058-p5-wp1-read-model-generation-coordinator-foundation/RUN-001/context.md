# Контекст виконання: RUN-001

Related Task: [P5-WP1 / TASK-07.26-0058](../task.md)
Prepared: 2026-07-18
Prepared By: Planning Agent `/root` із delegated package author `/root/create_p5_wp1_hard1`
Previous Run: none

## Agent Role

Agent Implementer / Read Model Engineer

## Мета run

Реалізувати одну coherent immutable read-model generation і мінімальні внутрішні seams/coordinator, потрібні всім наступним Phase 5 slices, не експонуючи public refresh/config і не переносячи lazy/retry/SQLite synchronization у foundation.

## Ефективні вимоги

1. [P5-DG1 contract](../../../../technical/read-model-completeness-contract.md) і [P5-DG2 contract](../../../../technical/multi-instance-synchronization-contract.md) є accepted/applied authority; implementation не змінює їх навмання.
2. One generation root atomically owns all projections, coverage і supported volatile cursor state.
3. `greedy` є єдиним loading mode цього run; lazy behavior downstream.
4. Ordinary local write використовує changed-key structural sharing, не O(N) rebuild.
5. Metadata і committed-change ports consumer-owned, semantic, detached та symmetric для claimed full/readonly capability; readonly zero-write.
6. Publication coordinator не утримує mutation ownership під storage I/O і не дозволяє stale overwrite.
7. Legacy manual driver має explicit `static-unsupported` state без вигаданого synchronization capability.
8. `RuntimeFaultSink` і fake barriers використовують ті самі source contracts, що production composition.
9. Public exports/facades/config не змінюються.
10. Activation цієї run не активує downstream tasks.

## Обсяг

- Source contracts/types, immutable generation/coverage, changed-key publication coordinator, observation ports, fault sink.
- Greedy startup/rebuild і local post-commit integration.
- Deterministic fake adapters/barriers/fault injection.
- Production composition wiring після source-only seams.
- Atomicity, coverage, structural-sharing, zero-write, lifecycle і no-public-diff evidence.

## Поза обсягом

- Lazy/public refresh/config/inspection, retry/backoff/single-flight actor, polling, concrete multi-instance SQLite support.
- Durable cursor/checkpoint, notification, compaction, direct mutation reconcile, distributed topology.

## Критерії приймання run

- Виконано всі 10 критеріїв task.md.
- Generation/coverage/cursor publication не має partial state або stale overwrite.
- Ordinary write path не виконує O(N) rebuild.
- Fakes і production використовують один source contract.
- Self-review та незалежний audit не мають open P0–P3.

## Обов’язкове task-specific читання

- [P5-DG1 task](../../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/task.md) і [final result](../../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/RUN-003/result.md).
- [P5-DG2 task](../../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/task.md) і [final result](../../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/RUN-001/result.md).
- [Read-model completeness contract](../../../../technical/read-model-completeness-contract.md).
- [Multi-instance synchronization contract](../../../../technical/multi-instance-synchronization-contract.md).
- [Technical architecture](../../../../technical/architecture.md), [rules](../../../../technical/rules.md), [roadmap](../../../../product/roadmap.md).
- Current read/index/write/journal/lifecycle/composition source і tests через repository navigation.

## Заплановані результати

1. Source-only generation/coverage/coordinator/observation/fault contracts.
2. Deterministic fake adapters and barrier/fault fixtures.
3. Same-contract production composition wiring.
4. Greedy startup/rebuild і changed-key local publication.
5. Focused/full/package verification, self-review й independent audit.

## Перевірки

- Generation/coverage invariant and immutable-root tests.
- Cursor-next/jump, stale candidate, CAS/conflict і local delta barrier tests.
- Full/readonly semantic observation conformance та zero-write evidence.
- Greedy startup/stop/fault cleanup й public export/config snapshot checks.
- Repository check/test/build/package gates та diff review.

## Ризики

- Hidden split publication між projections, coverage і cursor.
- Coordinator critical section охопить I/O або стане глобальним bottleneck.
- Fake-only seam відхилиться від production composition.
- O(N) rebuild пройде непоміченим на малих fixtures.

## Припущення

- Accepted P5-DG1/P5-DG2 contracts достатні для source seam materialization.
- Current local commit path надає exact changed keys для delta publication.
- Public refresh/config intentionally належать P5-VS1 після P5-HARD1.

## Умови зупинки

- Реалізація потребує зміни accepted canonical contract або public API/config.
- Exact changed-key delta неможливий без нового write authority чи O(N)-per-write workaround.
- Observation port вимагає raw session/transaction/layout leakage.
- Production composition не може використати той самий contract, що fakes.

## Activation

Run Status: prepared
Activation: лише окрема explicit команда власника після перевірки package; створення task та accepted dependencies не активують run.
