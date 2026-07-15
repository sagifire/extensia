# Контекст виконання: RUN-001

Related Task: [TASK-07.26-0048](../task.md)
Prepared: 2026-07-15
Prepared By: subagent `/root/audit_task_0041`
Previous Run: none

## Мета run

Побудувати traceable primitive-equivalence dossier для Windows/NTFS і вирішити, чи існує безпечний шлях до окремого exact profile або потрібен інший design.

## Пов'язана пам'ять

- [TASK-07.26-0041](../../TASK-07.26-0041-filesystem-native-storage-driver-design/task.md)
- [FIX-001](../../TASK-07.26-0041-filesystem-native-storage-driver-design/FIX-001.md)
- [Detailed report](../../../../reports/research/2026-07-15-extensia-filesystem-native-storage-driver-design.md)
- [Filesystem-native Storage Profile](../../../../technical/filesystem-native-storage-profile.md)
- [Technical Architecture](../../../../technical/architecture.md)
- [Write, Journal і Recovery Contract](../../../../technical/write-journal-recovery-contract.md)
- [ADR-0012](../../../../technical/decisions/ADR-0012-filesystem-native-storage-protocol.md)

Primary Microsoft API/filesystem documentation та isolated Windows/NTFS environment потрібні для native executable probes.

## Обмеження

- перед freeze перевірити завершення 0041/FIX; 0044–0047 не є dependency і можуть йти паралельно;
- research probes не інтегруються у production package;
- documentation, observation та inference маркуються окремо;
- невідомі durability/containment semantics дають gap/fail-closed verdict;
- будь-який proposed canonical change проходить окремий fixation/decision workflow.

## Заплановані результати

1. Побудувати invariant-to-Windows-primitive traceability matrix.
2. Зафіксувати exact Windows build/NTFS/volume/device/cache tuple і capability probe.
3. Реалізувати disposable native probes для `LockFileEx`, reparse-safe paths, replace/no-replace і flush behavior.
4. Виконати multi-process, containment, namespace та crash-ambiguity matrices.
5. Проаналізувати directory durability/write-through limits за primary sources і evidence.
6. Сформувати feasibility verdict: equivalent profile, design change required або infeasible/underdocumented.
7. Додати future certification cut matrix, raw evidence, self-review та independent audit.

## Перевірки

- source links resolve to primary authoritative documentation;
- probe source/build/commands і raw outputs відтворювані;
- negative reparse/volume/path cases fail closed;
- locking/replace outcomes перевірені між процесами та після crash/reopen;
- environment drift і unsupported filesystem configurations відхиляються.

## Умови зупинки

- TASK-07.26-0041/FIX не завершені;
- немає isolated NTFS target або exact environment attestation;
- primary evidence не дозволяє відрізнити guarantee від observation;
- research потребує production integration чи destructive non-approved testing;
- з'являється design conflict, який вимагає окремого рішення.

## Ризики та припущення

- Припускається доступ до native Windows toolchain і disposable NTFS volume.
- Positive research verdict лише створює підставу для окремих implementation/certification tasks.
- Negative або inconclusive verdict є допустимим і корисним результатом.

## Зміни від попереднього run

Перший run; попереднього run немає.
