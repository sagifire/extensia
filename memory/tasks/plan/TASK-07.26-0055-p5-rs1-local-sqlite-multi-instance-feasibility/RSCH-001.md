# RSCH-001: Multi-instance здійсненність current local-sqlite-v1

Status: completed
Related Task: [P5-RS1 / TASK-07.26-0055](task.md)
Related Run: [RUN-001](RUN-001/index.md)
Detailed Report: [Multi-instance здійсненність local-sqlite-v1](../../../reports/research/2026-07-17-extensia-local-sqlite-multi-instance-feasibility.md)

## Research question

Яку фактичну multi-instance поведінку дає незмінений `embedded-transactional/local-sqlite-v1` для двох довгоживучих процесів у ролях `full/full` і `full/readonly`: committed visibility, journal-after-cursor, exclusive-session contention, restart/crash і readonly zero-write boundary?

## Result

- `full/full` є conditionally feasible на storage session/journal boundary: alternating sessions дають coherent committed state і contiguous cursor replay, а lease звільняється після release/crash. Current application runtime не має external refresh, тому live cross-instance query coherence без P5 sync є infeasible.
- `full/readonly` є conditionally feasible для committed storage reads і restart-based refresh: довгоживучий readonly connection бачить нові committed rows без hidden writes. Current readonly port не має journal/cursor capability, process-local query index stale до restart, а read під full exclusive session отримує `database is locked`; тому current live synchronized readonly topology є infeasible.
- У трьох canonical repeat runs 30 controlled 40 ms release waits дали 30/30 acquisitions; 30 simultaneous write attempts дали 20 commits і 10 `STORAGE_LOCK_FAILED`, що показує scheduler-sensitive contention без current retry/fairness contract. Це characterization, не SLA або support claim.
- Clean held-session crash не змінив state/journal і звільнив lease; post-commit lost receipt був видимий readonly observer та рівно одним next journal entry після restart. Destructive power-loss, arbitrary mid-COMMIT ambiguity, broader environments і fairness не доведені.

## Disposition

`final-result` для TASK-0055. Evidence має звузити P5-DG2 topology/observation/refresh contract після whole-task acceptance; вона не активує P5-DG2 і не створює support claim.
