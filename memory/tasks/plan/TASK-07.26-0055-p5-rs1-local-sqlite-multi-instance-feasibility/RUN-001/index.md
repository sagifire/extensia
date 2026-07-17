# Індекс: RUN-001

## Призначення

Completed і accepted research run для executable перевірки multi-instance здійсненності чинного `local-sqlite-v1` без production changes.

## Папки

Немає.

## Файли

- [Context](context.md) - заморожений snapshot effective requirements, evidence matrix, reading, risks і assumptions.
- [Result](result.md) - execution, verification, self-review та audit report активного run.
- [Two-process worker](multi-instance-worker.mjs) - research-only довгоживучий process worker поверх compiled production modules.
- [Research orchestrator](multi-instance-research.mjs) - rerunnable `full/full`, `full/readonly`, contention і crash/restart matrix.
- [Raw evidence R1](raw-evidence-R1.json) - перший compact raw manifest.
- [Raw evidence R2](raw-evidence-R2.json) - другий compact raw manifest.
- [Raw evidence R3](raw-evidence-R3.json) - третій compact raw manifest.
- [Evidence validator](validate-raw-evidence.mjs) - executable invariant і repeat-summary gate для трьох manifests.
