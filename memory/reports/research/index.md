# Індекс: дослідницькі звіти

## Призначення

Detailed reports для formal research, planning і design усередині task runs.

Кожен новий report посилається на task-local `RSCH-*`, task і related run. Невеликі допоміжні перевірки лишаються в `result.md` і не створюють зайвого report. Legacy reports з MVP 0.4 зберігають історичні task-local links.

## Папки

Немає дочірніх папок.

## Файли

- [План реалізації Extensia 0.1.0](2026-07-09-extensia-v0-1-0-delivery-plan.md) - Деталізований rolling-wave planning report для TASK-07.26-0003.
- [Незалежний audit Phase 1](2026-07-10-extensia-phase-1-independent-audit.md) - Canonical detailed report BP1-06 проти accepted stabilization evidence `R1`.
- [Незалежний audit Phase 2](2026-07-10-extensia-phase-2-independent-audit.md) - Canonical detailed report BP2-06 проти accepted Phase 2 stabilization evidence `R1`.
- [Мінімальний public read contract Extensia](2026-07-10-extensia-minimal-public-read-contract.md) - Detailed design report BP2-01 для P2-VS1 і shared internal seam.
- [Write, journal і recovery protocol Extensia](2026-07-10-extensia-write-journal-recovery-protocol.md) - Detailed P3-DG1 design для semantic commit, deterministic fake recovery й first Resource create/update slices.
- [Order, delete, Mark і KV semantics Extensia](2026-07-11-extensia-order-delete-mark-kv-semantics.md) - Detailed P3-DG2 design для hierarchy/order, leaf soft delete, Mark/KV writes і final Phase 3 decomposition.
- [План owner gates фази 4 Extensia](2026-07-12-extensia-phase-4-owner-gate-plan.md) - Rolling-wave decomposition і canonical-now boundary для P4-DG1/P4-DG2.
- [Concrete storage protocol Extensia](2026-07-12-extensia-concrete-storage-protocol.md) - Evidence-backed P4-DG1 single-SQLite durability domain, recovery і proof matrix.
- [Taxonomy storage driver families Extensia](2026-07-12-extensia-storage-driver-taxonomy.md) - RUN-002 framing filesystem-native, embedded-transactional і client-server transactional profiles.
- [Exact Asset semantic contract Extensia](2026-07-15-extensia-asset-contracts.md) - P4-DG2 field, lineage, primary, ownership, staged upload і pipeline design для P4-VS2/P4-VS3.
- [Filesystem-native Storage Driver Extensia](2026-07-15-extensia-filesystem-native-storage-driver-design.md) - Умовна native-helper feasibility, immutable graph/one-HEAD protocol і profile certification boundary.
- [Client-server transactional Storage Driver family](2026-07-15-extensia-client-server-sql-storage-driver-design.md) - PostgreSQL/MySQL semantic family, vendor profiles, ambiguous-commit reconciliation і certification design.
- [План canonical task set фази 5](2026-07-17-extensia-phase-5-task-set-plan.md) - Evidence-backed split executable feasibility research, read-model design і multi-instance sync design gates.
- [Multi-instance здійсненність local-sqlite-v1](2026-07-17-extensia-local-sqlite-multi-instance-feasibility.md) - P5-RS1 executable `full/full` і `full/readonly` visibility, cursor, contention та crash/restart evidence current profile.
