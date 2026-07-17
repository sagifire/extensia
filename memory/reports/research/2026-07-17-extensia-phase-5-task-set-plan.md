# План canonical task set фази 5 Extensia

Status: completed
Date: 2026-07-17
Related Task: [TASK-07.26-0054](../../tasks/plan/TASK-07.26-0054-prepare-phase-5-task-set/task.md)
Related Run: [RUN-001](../../tasks/plan/TASK-07.26-0054-prepare-phase-5-task-set/RUN-001/index.md)
Related Research: [RSCH-001](../../tasks/plan/TASK-07.26-0054-prepare-phase-5-task-set/RSCH-001.md)

## Outcome

Phase 5 має достатній accepted entry gate, але не має достатнього exact contract для implementation. Безпечний canonical-now набір: окремий executable multi-instance feasibility research `P5-RS1`, owner gate read-model completeness/query/index `P5-DG1` і залежний owner gate cursor/refresh/sync `P5-DG2`. Історичний combined `P5-DG1 completeness/sync` розділено за різними evidence, approval та blast-radius boundaries.

## Підстави й фактичний baseline

- Phase 4 завершена explicit human gate; fake і concrete `local-sqlite-v1` fixtures, committed journal та coherent scan існують.
- Product requirements приймають process-local Hot Metadata Index, journal-ordered External Change Sync і різні `greedy`/`lazy` completeness semantics, але не задають exact query, cursor чи refresh contract.
- Поточний Core index є greedy Resource by-id/children view з whole-generation rebuild/swap; повних Asset/Mark/primary/reverse projections і lazy completeness немає.
- Full driver session уже надає `readCommittedOperationsAfter(cursor)`, але readonly public driver має лише `listResources()`; observation seam для lazy/sync не погоджений.
- `local-sqlite-v1` відкриває `locking_mode=EXCLUSIVE` лише на storage session і наразі має bounded claim one host/one full writer. Multi-instance support не можна вивести з unit tests або conceptual source specification.
- Current writes роблять coherent storage-wide scan для correctness. Phase 5 `lazy` не має неявно прибрати command-path validation або створити index-as-truth.

### Evidence traceability

| Baseline claim | Evidence |
|---|---|
| Phase 4 accepted, fake/SQLite fixtures, journal/restart/coherent-scan evidence | [P4-STAB result](../../tasks/plan/TASK-07.26-0053-p4-stab-phase-4/RUN-001/result.md), [evidence manifest](../../tasks/plan/TASK-07.26-0053-p4-stab-phase-4/RUN-001/evidence-manifest.md) |
| Phase 5 scope, sequence й gate | [Roadmap Phase 5](../../product/roadmap.md), [delivery plan section 12.5](2026-07-09-extensia-v0-1-0-delivery-plan.md) |
| Accepted process-local Index, External Sync order і greedy/lazy requirements | [Product requirements REQ-RUN-008/010/011](../../product/requirements.md), [technical architecture](../../technical/architecture.md) |
| Current Resource by-id/children whole-generation index | [resource-index.ts](../../../src/core/resource-index.ts), [resource-read-runtime.ts](../../../src/core/resource-read-runtime.ts), [resource-read-runtime.test.ts](../../../src/core/resource-read-runtime.test.ts) |
| Full session journal-after-cursor й readonly list-only boundary | [resource-write-protocol.ts](../../../src/storage/resource-write-protocol.ts), [full-resource-driver-adapter.ts](../../../src/storage/full-resource-driver-adapter.ts), [resource-read-runtime.ts](../../../src/core/resource-read-runtime.ts) |
| SQLite exclusive session/profile boundary й multi-process contention baseline | [local-sqlite-resource-driver.ts](../../../src/storage/local-sqlite-resource-driver.ts), [local-sqlite-resource-driver.test.ts](../../../src/storage/local-sqlite-resource-driver.test.ts), [ADR-0010](../../technical/decisions/ADR-0010-local-sqlite-storage-protocol.md) |
| Current command paths use coherent scan and keep Storage Driver authoritative | [resource-write-runtime.ts](../../../src/core/resource-write-runtime.ts), [resource-recovery-coordinator.ts](../../../src/storage/resource-recovery-coordinator.ts), [write/journal contract](../../technical/write-journal-recovery-contract.md) |

## Невизначеності

| Невизначеність | Клас | Owner |
|---|---|---|
| Чи допускає concrete SQLite profile два довгоживучі instances без starvation/incorrect visibility | blocking evidence | `P5-RS1` |
| Exact `greedy`/`lazy`, point/tree/global completeness та false-partial prevention | design gate | `P5-DG1` |
| Exact projections, coherent rebuild/publication та invalidation | design gate | `P5-DG1` |
| Public/config/query wording і mode visibility | design gate | `P5-DG1` |
| Cursor ownership/restart, actor/order, stale window, refresh/polling та failure lifecycle | design gate informed by evidence | `P5-DG2` |
| Polling, notification і explicit refresh alternatives та їх disposition | design gate | `P5-DG2` |
| Notification implementation, journal retention/compaction, durable cache/checkpoint | deferred unless P5-DG2 evidence/owner decision changes boundary | future implementation/owner gate |
| Hard SLA/support budgets | deferred | окрема certification лише за product need |

## Canonical-now task set

### P5-RS1 — executable multi-instance feasibility

Research-only task над current source без production changes:

- two-process `full/full` і `full/readonly` scenarios на одному `local-sqlite-v1` storage;
- alternating session/commit, journal-after-cursor, visibility, timeout/contention і restart/crash observations;
- exact supported/unsupported topology й executable fixture strategy;
- representative workload dimensions для наступних gates без SLA.

Може активуватися паралельно з `P5-DG1`. Результат блокує `P5-DG2`, але не обирає public API.

### P5-DG1 — read-model completeness/query/index contract

Design task має погодити:

- exact `greedy` і `lazy` semantics для point, tree та global queries;
- explicit complete/unavailable/metadata behavior; silently partial result заборонений;
- query/config compatibility boundary;
- coherent projection set: Resource/children, Mark, Asset owner, primary Asset і lineage reverse, якщо потрібний accepted query catalog;
- rebuild generation, integrity, atomic publication, invalidation та selective observation capabilities;
- representative fixture dimensions і performance evidence methodology, не SLA.

### P5-DG2 — cursor/refresh/multi-instance sync contract

Залежить від accepted `P5-RS1` і `P5-DG1`. Має погодити:

- cursor ownership, startup/restart semantics та relation до derived index generation;
- actor/order policy, gap/duplicate/regression handling;
- supported instance roles/topology;
- comparison `explicit refresh` / polling / driver notification, exact owner disposition, stale window й diagnostics;
- transient failure, integrity fail-close, start/stop/drain;
- serialization local post-commit publication та external batch application;
- narrow storage observation/change-feed seam без raw transaction leakage.

## Downstream proposals, не canonical зараз

1. `P5-WP1` — coherent greedy index projections.
2. `P5-VS1` — lazy reads і exact completeness.
3. `P5-VS2` — multi-instance sync/refresh на concrete profile.
4. `P5-STAB` — consistency/performance characterization, interleavings, package/process evidence.
5. `P5-AUD1` — independent Phase 5 audit перед explicit human phase gate.

`P5-VS1` і `P5-VS2` можуть бути паралельними лише після shared `P5-WP1` та applied owner contracts. Окремий seam-materialization task створюється тільки якщо accepted contracts доведуть його необхідність. Зараз implementation contexts були б неповними й швидко застаріли б, тому shells не створюються.

## Рекомендована V1 hypothesis для design review

Це не applied contract:

- cursor process-local/volatile разом із derived index; coherent startup rebuild capture-ить journal head;
- durable cursor без atomic durable index checkpoint заборонений, бо може пропустити changes після restart;
- retention/compaction у Phase 5 відсутні;
- working recommendation: explicit refresh як correctness primitive й polling як optional layer; P5-DG2 зобов’язана порівняти driver notification та зафіксувати owner disposition, а не відкласти її наперед;
- actor filtering лише optimization, cursor проходить кожну sequence;
- integrity gaps/duplicates/regressions fail-close, transient unavailability cursor не просуває;
- point/tree reads exact; global query не повертає silently partial result.

## Чому немає окремої performance-research task

До executable index/sync baseline hard budgets були б вигаданими. `P5-RS1` і `P5-DG1` визначають fixtures/methodology, `P5-STAB` характеризує startup, memory, lazy first-read, catch-up burst, contention та event-loop pressure. Окрема certification task потрібна лише для явного SLA/support claim.

## Architecture pressure

- Не додавати другий mutable index authority або independent journal service.
- Кілька projections мають публікуватися як одна coherent generation, а не послідовні maps із transient inconsistency.
- Lazy observation seam не повинен відкрити raw storage session/transaction application API.
- Sync і local commit потребують одного process-local publication coordinator; старіший external batch не може перезаписати новіший local committed view.
- SQLite polling не може без вимірювання перетворитися на tight exclusive-lock loop.

## AGENTS.md

Root `AGENTS.md` містить obsolete Starter Kit 4.0 / PDADM 0.4 markers, legacy `requirements.md`/`worklog.md` workflow і старі route paths. Він є project instruction artifact поза canonical `memory/`; explicit task scope дозволяє скоротити його до чинного 5.0/0.5 startup/router contract без дублювання повного регламенту.

## Dependency graph

```text
Phase 4 gate
  ├─> P5-RS1 ─┐
  └─> P5-DG1 ─┴─> P5-DG2
                    └─> prepare P5-WP1/VS1/VS2/STAB/AUD1 packages
                          P5-WP1 ─┬─> P5-VS1 ─┐
                                  └─> P5-VS2 ─┴─> P5-STAB -> P5-AUD1 -> human gate
```

Кожна activation потребує окремого рішення. Whole-task approval не замінює окремі рішення для кожного `FIX-*`; exact approved proposals після цього застосовуються під час `finalizing` без обов’язкового третього application decision, якщо owner workflow явно не розділено. TASK-0054 не активує `P5-RS1`, `P5-DG1`, `P5-DG2` або Phase 5 implementation.

## Memory impact

- Task packages, plan/progress/state й report navigation: operational in-scope updates.
- Root `AGENTS.md`: in-scope project instruction sync.
- Product/domain/technical contracts: not-needed у TASK-0054; design належить downstream tasks і їхнім approved `FIX-*`.
