# P5-WP1 / TASK-07.26-0058: Реалізувати read-model generation і coordinator foundation

Task Status: done
Type: implementation
Created: 2026-07-18
Owner Role: Agent Implementer / Read Model Engineer
Current Run: RUN-001

## Поточний стан

Run Status: completed
Progress: completed and accepted by whole-task human review.
Acceptance: 10/10; final audit `PASS / REVIEW_READY`, open P0–P3 `0`.
Blockers: немає; accepted/applied P5-DG1 і P5-DG2 є виконаними prerequisites.
Blocked Phase: n/a
Pending Decisions: немає.
Next Action: TASK-0059 може бути активована лише окремою explicit командою власника.

## Мета

Матеріалізувати спільну внутрішню основу Phase 5: одну immutable `ReadModelGeneration` з exact coverage, changed-key publication coordinator, accepted P5-DG1 metadata observation port, P5-DG2 committed-change observation port, `RuntimeFaultSink` contract і deterministic fake seams. Початковий runtime лишається `greedy`; public refresh/config та lazy behavior ще не експонуються.

## Залежності й activation gate

- [P5-DG1 / TASK-07.26-0056](../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/index.md) — whole-task accepted, required fixations applied; [final RUN-003 result](../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/RUN-003/result.md).
- [P5-DG2 / TASK-07.26-0057](../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/index.md) — whole-task accepted, FIX-001 applied; [final RUN-001 result](../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/RUN-001/result.md).
- Підготовка package не активує RUN-001. Activation дозволена лише окремою explicit командою власника; downstream dependency completion не активує цю або наступну task автоматично.

## Обсяг

- Одна immutable `ReadModelGeneration`, що атомарно об’єднує projections і coverage для Resource/tree, Asset owner/primary/same-Resource lineage, exact Mark lookup та internal cursor state там, де sync capability підтримана.
- `greedy` startup/rebuild baseline з complete generation до ready; lazy selective hydration лишається downstream.
- Changed-key structural-sharing publication path для ordinary local commit; O(N) rebuild лише для startup/rebuild/integrity path.
- Один publication coordinator для local post-commit delta, future lazy load та future external refresh без storage I/O під mutation owner.
- Consumer-owned accepted P5-DG1 semantic metadata observation port і P5-DG2 coherent committed-change observation port; detached data, readonly zero-write, без raw session/transaction/layout leakage.
- Tagged supported-sync versus legacy manual `static-unsupported` internal state без вигаданого cursor/head для legacy driver.
- `RuntimeFaultSink` contract для deterministic fail-close intake/readiness handoff без public diagnostics design.
- Deterministic fake adapters, barrier/fault seams і production composition через ті самі source contracts.
- Atomic generation/cursor publication, changed-key correctness, coverage і lifecycle cleanup tests.

## Поза обсягом

- Public `query.refresh()`, public synchronization/read-model config або inspection DTO.
- Lazy loading/selective public behavior, polling scheduler, bounded retry actor чи concrete SQLite change observation.
- Multi-process support claim, performance/SLA claim, topology certification або Phase 5 gate.
- Durable cursor/checkpoint, raw driver sessions, notification subsystem, retention/compaction або direct external mutation reconciliation.
- Новий write path, O(N)-per-write workaround чи окрема test-only architecture.

## Критерії приймання

1. `ReadModelGeneration` є єдиним immutable root для всіх accepted projections і coverage; жодна projection/coverage частина не публікується окремо.
2. `greedy` startup/rebuild створює complete generation до ready для Resource/tree, Asset owner/primary/lineage та Mark lookup згідно P5-DG1.
3. Ordinary successful local commit застосовує exact changed-key delta/structural sharing; executable guard відхиляє O(N) full rebuild на write path.
4. Publication coordinator серіалізує local delta та майбутні lazy/external publications; storage observation/I/O не утримує mutation owner, а stale candidate не перезаписує newer generation.
5. Supported sync branch атомарно публікує generation і volatile cursor/observed-through state; legacy `static-unsupported` branch не фабрикує cursor, head або sync actor.
6. P5-DG1 metadata observation port і P5-DG2 committed-change port є narrow, consumer-owned, detached, symmetric для claimed full/readonly semantics та не розкривають raw session/transaction/layout.
7. Readonly seam має executable zero-write evidence, а full/readonly використовують ті самі semantic source contracts і production composition без parallel test-only seam.
8. `RuntimeFaultSink` має один deterministic contract для typed integrity/fatal runtime faults, fail-close handoff та cleanup; ordinary expected I/O failure не помилково класифікується integrity fault.
9. Deterministic fake tests покривають atomic generation/cursor swap, coverage proofs, changed-key publication, stale-candidate CAS/coordinator conflict, startup/stop cleanup і fault propagation.
10. Build/typecheck/lint/unit/package gates проходять; public exports/config/facade snapshots не змінені, і task передана в human review лише після self-review та незалежного аудиту без open P0–P3.

## Перевірки

- Focused unit tests для generation invariants, coverage, structural sharing, coordinator barriers/CAS і fault sink.
- Fake full/readonly conformance та zero-write readonly evidence через production contracts.
- Local commit interleavings із stale candidate, exact cursor-next/jump branches і atomic publication assertions.
- Greedy startup/rebuild, stop/cleanup, integrity fail-close та no-public-surface snapshots.
- `npm test`, typecheck/lint/build/package checks відповідно до repository scripts; `git diff --check` і production-boundary review.

## Ризики

- Рознесені maps можуть непомітно створити partial generation або split-brain coverage.
- General-purpose coordinator може стати service locator чи глобальним lock із зайвим blast radius.
- O(N)-per-write rebuild може сховатися за helper abstraction або fake dataset.
- Storage-shaped observation seam може протекти raw transaction/layout details у Core.
- Передчасне включення retry/public refresh у foundation створить API до стабілізації lifecycle.

## Пов’язана пам’ять

- [Read-model completeness contract](../../../technical/read-model-completeness-contract.md)
- [Multi-instance synchronization contract](../../../technical/multi-instance-synchronization-contract.md)
- [Technical architecture](../../../technical/architecture.md)
- [Technical rules](../../../technical/rules.md)
- [Product roadmap](../../../product/roadmap.md)
- [Phase 5 task-set plan](../../../reports/research/2026-07-17-extensia-phase-5-task-set-plan.md)

## Прогони

- [RUN-001](RUN-001/index.md) - completed and accepted implementation run.

## Дослідження

Немає.

## Фіксації

Немає; якщо реалізація виявить потребу змінити canonical contract, робота зупиняється для окремого design/FIX decision.

## Запити на рішення

- Resolved: користувач явно активував `P5-WP1 / TASK-07.26-0058` 2026-08-22.
- Resolved: користувач схвалив whole-task result 2026-08-23; canonical fixation не потрібна, downstream не активовано.

## Downstream

- [P5-HARD1 / TASK-07.26-0059](../TASK-07.26-0059-p5-hard1-sync-actor-retry-lifecycle/index.md) - наступна послідовна task; може бути активована лише після completed/accepted P5-WP1 і окремої explicit команди.

## Human Review

Status: approved
Requested: 2026-08-23
Reviewed: 2026-08-23
Approval Source: explicit user command `Task approve`
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: none
Decision Notes: whole-task result approved; canonical fixation not-needed; downstream activation не надана.

## Фінальний результат

Completed: 2026-08-23
Final Run: RUN-001
Summary: immutable greedy read-model generation, structural-sharing publication coordinator, coherent observation ports і common runtime fault sink реалізовані; 317-test full gate та independent audit зелені.
Residual Risks: generic committed observation і existing command-side authority validation можуть масштабуватися з journal/storage; optimization, retry actor і concrete SQLite multi-instance sync належать downstream tasks.
