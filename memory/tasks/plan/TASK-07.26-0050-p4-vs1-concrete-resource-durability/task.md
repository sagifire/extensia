# P4-VS1 / TASK-07.26-0050: Concrete Resource durability parity

Task Status: done
Type: implementation
Created: 2026-07-15
Owner Role: Agent Implementer
Current Run: RUN-001

## Поточний стан

Run Status: completed
Progress: Whole-task approved; required FIX-001 applied exactly; repeated post-application audit `PASS`; task завершена без activation P4-VS2.
Acceptance: 9/9; whole-task human approval отриманий.
Blockers: none.
Blocked Phase: n/a
Pending Decisions: none; P4-VS2 activation не входить у це approval.
Next Action: none; P4-VS2 потребує окремого explicit activation рішення.

## Мета

Довести повну accepted Phase 3 Resource parity — create, update, move/order, Mark/KV і leaf soft delete — на реальному `local-sqlite-v1` через production composition/default internal path, включно з read-back, journal/idempotency/index publication, restart, cut-point і process-crash evidence.

## Продуктовий контекст

`P4-WP1` завершила concrete SQLite foundation і bounded physical proof. P4-VS1 є окремим acceptance owner: deterministic fake лишається semantic oracle, але всі Phase 3 Resource guarantees мають пройти через той самий production Core/Operation Engine і concrete adapter без parallel contract чи test-only architecture.

## Залежності та activation gate

- [P4-WP1 / TASK-07.26-0049](../TASK-07.26-0049-p4-wp1-local-sqlite-driver/task.md) завершена й accepted.
- RUN-001 не активований підготовкою package; потрібне окреме explicit рішення.
- P4-VS2 не активується цією задачею та залежить від completed/accepted P4-VS1.

## Обсяг

- Production composition/default internal `local-sqlite-v1` path для повного Resource write/read lifecycle.
- Exact Phase 3 parity: root create, own-metadata update, hierarchy move/dense sibling order, Mark/KV replacement, leaf soft delete.
- Один shared Core/Operation Engine, shared prepared write-set, semantic commit, committed journal і post-commit index publication.
- Restart/recovery, idempotent retry, COMMIT outcome reconciliation, readonly no-write, integrity/corruption fail-close.
- Shared fake-vs-SQLite conformance та child-process cut-point/process-crash evidence.
- Packed consumer/integration evidence з encapsulated driver config і без layout leakage.

## Поза обсягом

- Asset writes, metadata lifecycle, payload/upload або staging semantics.
- Public Storage Driver layout/API чи exposure SQLite paths/schema/session/transaction.
- Resource restore, cascade delete, purge або include-deleted expansion.
- Phase 5 external sync/multi-instance indexes і наступні фази.

## Критерії приймання

1. Production composition використовує ті самі shared Resource/Core/storage contracts, що deterministic fake і Phase 3; parallel або test-only write/read contract відсутній.
2. Create, update, move/dense order, `setMarks`, `setKV` і leaf soft delete мають повну accepted Phase 3 semantic parity, normalized failures і durable read-back на `local-sqlite-v1`.
3. Full/readonly lifecycle, startup recovery, close/reopen і fresh-process restart зберігають лише committed Resource state та contiguous committed journal.
4. COMMIT outcome reconciliation, identical retry idempotency, fingerprint mismatch і committed-before-receipt/publication cut points не дають false resolve/reject або duplicate journal entry.
5. Readonly відхиляє write до validation/mutation та не змінює DB, journal, timestamps, indexes чи filesystem snapshot.
6. Corrupt/unknown schema, Resource/journal mismatch, gaps і proven runtime integrity failure fail-close із чинним `STORAGE_INTEGRITY_FAILED`, без automatic repair або partial publication.
7. Packed production integration доводить default internal composition/config encapsulation, read-after-write і відсутність public path/schema/connection/session leakage.
8. Focused, full repository і package gates зелені; restart/cut-point/process evidence rerunnable, а double-pack reproducibility не погіршена.
9. Scope, verification, architecture pressure, memory impact і language gate пройшли self-review та незалежний audit без open P0-P3; whole-task human approval обов’язковий перед `done`.

## Перевірки

- shared fake-vs-SQLite Resource conformance matrix;
- public facade → Core/Operation Engine → concrete driver integration;
- child-process restart/cut-point/kill harness;
- readonly filesystem/DB snapshot diff;
- COMMIT reconciliation, idempotency, corruption та fail-close fixtures;
- `npm run check`, package smoke/consumer й deterministic double pack.

## Ризики

- Production composition може приховувати test-only seam або config divergence; acceptance вимагає один shared path.
- Synchronous SQLite transaction envelope може збільшитися на hierarchy/Mark/KV operations; потрібно виміряти, не створюючи другого write path.
- Crash evidence є bounded process-crash proof і не розширює power-loss/platform certification P4-WP1.

## Пов’язана пам’ять

- [P4-WP1 / TASK-07.26-0049](../TASK-07.26-0049-p4-wp1-local-sqlite-driver/task.md)
- [P4-DG2 / TASK-07.26-0040](../TASK-07.26-0040-p4-dg2-asset-contracts/task.md)
- [Asset Contract](../../../technical/asset-contract.md)
- [Write, Journal і Recovery Contract](../../../technical/write-journal-recovery-contract.md)
- [ADR-0010](../../../technical/decisions/ADR-0010-local-sqlite-storage-protocol.md)
- [Technical Architecture](../../../technical/architecture.md)
- [Technical Rules](../../../technical/rules.md)
- [Roadmap](../../../product/roadmap.md)
- [Delivery plan](../../../reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md)
- [Phase 4 owner-gate plan](../../../reports/research/2026-07-12-extensia-phase-4-owner-gate-plan.md)
- [Concrete storage protocol report](../../../reports/research/2026-07-12-extensia-concrete-storage-protocol.md)

## Прогони

- [RUN-001](RUN-001/index.md) - completed; whole-task approved, FIX-001 applied exactly, repeated post-application audit `PASS`.

## Дослідження

Немає; formal research ще не виконувалося.

## Фіксації

- [FIX-001](FIX-001.md) - approved / applied / required - canonical current/technical memory synchronized exactly; post-application audit remediation pending.

## Запити на рішення

- Немає під час execution.

## Запропоновані follow-up задачі

- [P4-VS2 / TASK-07.26-0051](../TASK-07.26-0051-p4-vs2-asset-metadata-lifecycle/task.md) - activation лише після completed/accepted P4-VS1 і чинного applied P4-DG2.

## Human Review

Status: accepted
Requested: 2026-07-16
Reviewed: 2026-07-16
Approval Source: explicit user message: `TASK-0050: approve`; `FIX-001: approve`
Approved Fixations: FIX-001
Rejected Fixations: none
Follow-up Decisions: P4-VS2 not activated
Decision Notes: Whole-task result і required FIX-001 окремо approved; exact application authorized. P4-VS2 потребує окремого explicit рішення після completion.

## Фінальний результат

Completed: 2026-07-16
Final Run: RUN-001
Summary: Full Phase 3 Resource parity accepted на internal production `local-sqlite-v1`; 239-test/package/process/reproducibility evidence green, required FIX-001 applied exactly, final independent audit `PASS`.
Residual Risks: synchronous current-host measurement не є SLA; process-crash proof не є universal platform/power-loss certificate; public/default driver, Asset lifecycle/upload і downstream phases лишаються separate gates.
