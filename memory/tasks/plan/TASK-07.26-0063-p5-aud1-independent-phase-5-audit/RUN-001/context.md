# Контекст виконання: RUN-001

Related Task: [P5-AUD1 / TASK-07.26-0063](../task.md)
Prepared: 2026-07-18
Prepared By: Agent Task Planner `/root/create_p5_stab_aud`
Previous Run: none

## Мета run

Після accepted P5-STAB незалежно rerun/review Phase 5 package/process/raw evidence, contracts, implementation, upward consistency й support matrix та сформувати explicit recommendation для окремого human Phase 5 gate.

## Ефективні вимоги

1. P5-STAB має бути completed/accepted із frozen result/evidence; completion не активує цей run автоматично.
2. Auditor не був автором implementation або P5-STAB execution; independence фіксується в result.
3. Audit independently rerun/review-ить package, fresh-process і raw two-process evidence, а не лише читає summaries.
4. Accepted P5-DG1/P5-DG2 contracts і exact support gate є authority; roadmap не замінює evidence.
5. Supported/unsupported topology matrix перевіряється явно, включно з designated-writer boundary і unsupported broader topologies.
6. Open P0–P3 = 0 є передумовою recommendation `pass`; `conditional` не обходить unresolved correctness findings.
7. Auditor не реалізує production remediation; findings повертаються owning task/new run і потім independently re-verify-яться.
8. Upward consistency охоплює product/domain/technical/task/source/test/package/evidence claims.
9. Audit recommendation не є human Phase 5 approval.
10. Phase 6 planning/activation не виконується цим run.

## Обсяг

- Independent traceability, reruns, evidence provenance і findings ledger.
- Correctness/lifecycle/contention/performance-language/public-boundary/architecture audits.
- Exact topology matrix, residual risks і `pass | conditional | fail` recommendation.
- Task-local result, formal audit artifact/report за потреби, self-check власної independence й Review Request.

## Поза обсягом

- Production changes/remediation, support expansion, hard SLA, Phase 5 human approval або Phase 6 activation.

## Критерії приймання run

- Виконані всі десять task acceptance criteria.
- Evidence rerun/review має exact environment/commit/tool provenance.
- Findings мають severity/owner/status і відкриті P0–P3 = 0 перед `pass`.
- Topology recommendation не ширша за executable evidence.
- Human decision і non-activation Phase 6 boundary однозначні.

## Обов’язкове task-specific читання

- Accepted [P5-RS1](../../TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/index.md), [P5-DG1](../../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/index.md), [P5-DG2](../../TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/index.md).
- Accepted results/evidence [P5-WP1](../../TASK-07.26-0058-p5-wp1-read-model-generation-coordinator-foundation/index.md), [P5-HARD1](../../TASK-07.26-0059-p5-hard1-sync-actor-retry-lifecycle/index.md), [P5-VS1](../../TASK-07.26-0060-p5-vs1-lazy-refresh-public-integration/index.md), [P5-VS2](../../TASK-07.26-0061-p5-vs2-local-sqlite-multi-instance-sync/index.md) і [P5-STAB](../../TASK-07.26-0062-p5-stab-phase-5-stabilization/index.md).
- [Read-model completeness contract](../../../../technical/read-model-completeness-contract.md), [multi-instance synchronization contract](../../../../technical/multi-instance-synchronization-contract.md), [technical architecture](../../../../technical/architecture.md), [technical rules](../../../../technical/rules.md), relevant ADRs й source/tests/package evidence through repository navigation.
- [Product roadmap](../../../../product/roadmap.md), requirements, domain boundaries, task plan state/indexes і P5-STAB evidence manifest.

## Заплановані результати

1. Independent audit result і, за потреби, detailed report у `memory/reports/audits/`.
2. Requirements/contracts/source/tests/evidence traceability matrix.
3. Independent rerun record для package/process/raw scenarios.
4. P0–P3 findings ledger із owners/status/reverification.
5. Exact supported/unsupported topology matrix.
6. Explicit Phase 5 `pass | conditional | fail` recommendation і human decision request.

## Перевірки

- Clean/fresh package and process reruns з exact provenance.
- Double pack, packed consumers і raw two-process critical scenarios.
- Contract/source/test/evidence diff і negative-path spot checks.
- Upward consistency, language, links, privacy/public exports, readonly/storage authority й architecture pressure.
- Findings closure evidence та final open-severity count.

## Ризики

- Втрата independence через попередню authorship.
- Environment mismatch робить performance comparison недійсним.
- Summary-only review пропускає raw outliers/cleanup failures.
- Remediation всередині audit змішує owner/verifier roles.
- Delivery pressure може перетворити recommendation на автоматичний gate.

## Припущення

- P5-STAB лишає reproducible commands, raw evidence і truthful verdict.
- Owning tasks доступні для remediation/new run, якщо audit знайде P0–P3.
- Human Phase 5 gate буде окремим explicit decision після accepted audit.

## Умови зупинки

- P5-STAB не completed/accepted або його reviewed evidence змінюється після activation snapshot.
- Незалежний auditor недоступний.
- Evidence provenance/reproducibility недостатні для topology verdict.
- Виявлено P0–P3: зафіксувати й повернути owner; не виправляти production в audit run і не рекомендувати `pass` до independent reverification.

## Activation

Run Status: prepared
Activation: лише після completed/accepted P5-STAB, підтвердженої auditor independence й окремого explicit owner рішення; package preparation не виконує audit і не запускає human/Phase 6 gates.
