# Контекст виконання: RUN-001

Related Task: [P5-DG1 / TASK-07.26-0056](../task.md)
Prepared: 2026-07-17
Prepared By: Planning Agent `/root`
Previous Run: none

## Мета run

Підготувати evidence-backed exact contract для `greedy`/`lazy` completeness, query surface і coherent projections, достатній для downstream implementation planning без false completeness або нового state authority.

## Ефективні вимоги

1. Phase 4 gate і current read/index/storage baseline підтверджуються до activation.
2. Product requirements REQ-RUN-008/010/011 є authority; draft source signatures — inputs, не frozen API.
3. Existing `getResource` і `getResourceTree` не можуть послабитися або стати silently partial.
4. Кожний candidate global query має explicit completeness contract; відсутність contract означає unavailable, не partial success.
5. Усі projections належать одній coherent generation, derived from Storage Driver і published atomically.
6. Lazy observation capabilities лишаються narrow internal seams; raw driver session/transaction не стає application API.
7. Formal design створює `RSCH-*`, detailed report і exact `FIX-*`; application лише після separate human approval.
8. Run не активує P5-RS1, P5-DG2 або implementation tasks.

## Обсяг

- Accepted requirements/source/current-code synthesis.
- Query/completeness/config/API alternatives й exact decision matrices.
- Coherent projection/rebuild/invalidation/storage-observation design.
- Fixture/performance methodology, architecture pressure, memory impact.
- Formal artifacts, verification, self-review, independent audit і Review Request.

## Поза обсягом

- Implementation, sync/cursor contract, notification/retention/checkpoint, P7 freeze.

## Критерії приймання run

- Виконано всі вісім task acceptance criteria.
- Exact contracts відрізняють accepted decision, current fact, hypothesis і deferred work.
- Downstream prerequisites однозначні; жодна task не activated.
- Self-review й independent audit не мають open P0–P3.

## Обов’язкове task-specific читання

- `memory/reports/research/2026-07-17-extensia-phase-5-task-set-plan.md`.
- `memory/product/requirements.md`, `roadmap.md`, delivery plan Phase 5.
- `memory/technical/public-read-contract.md`, `architecture.md`, `rules.md`, `open-questions.md`, relevant ADR.
- `memory/domain/current/implementation-state.md`, target model/rules.
- Current `src/core/resource-index.ts`, read/write runtimes, storage protocols й tests через repository navigation.
- P4-STAB result/evidence та P5-RS1 package boundary.

## Заплановані результати

1. Query/completeness/config decision matrix.
2. Projection schema й coherent generation lifecycle.
3. Lazy observation capability contract.
4. Fixture/performance methodology.
5. `RSCH-*`, detailed report, `FIX-*`, result/self-review/audit і Review Request.

## Перевірки

- scenario/state tables для cold/warm/partial/rebuild/invalidation/failure;
- API compatibility і no-silent-partial review;
- architecture authority/atomic-generation review;
- representative property/integrity test plan;
- independent audit exact proposal and dependency coverage.

## Ризики

- Premature global query catalog або public mode default.
- Incoherent per-projection publication.
- Hidden O(N) write amplification.
- Driver-specific leakage чи duplicated read authority.

## Припущення

- Current aggregate snapshots достатні для candidate derived projections.
- Negative/unavailable result для global lazy queries є допустимою alternative до expensive full scan.
- P5-RS1 може дати parallel evidence, але не є accepted input до його human review.

## Умови зупинки

- Product decision істотно змінює query scope і не може бути подана exact alternatives.
- Contract потребує sync/cursor decision до P5-DG2.
- Current baseline суперечить accepted requirements або вимагає production change для design evidence.
- Independent audit недоступний; limitation не підміняти same-agent review.

## Activation

Run Status: prepared
Activation: тільки окремим explicit рішенням після dependency check; package preparation не активує downstream work.
