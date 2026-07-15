# Контекст виконання: RUN-001

Related Task: [TASK-07.26-0046](../task.md)
Prepared: 2026-07-15
Prepared By: subagent `/root/audit_task_0041`
Previous Run: none

## Мета run

Виконати exhaustive cut-point certification production-equivalent build на атестованому exact tuple і сформувати вузький, доказовий process-crash verdict.

## Пов'язана пам'ять

- [TASK-07.26-0041](../../TASK-07.26-0041-filesystem-native-storage-driver-design/task.md)
- [FIX-001](../../TASK-07.26-0041-filesystem-native-storage-driver-design/FIX-001.md)
- [Detailed report](../../../../reports/research/2026-07-15-extensia-filesystem-native-storage-driver-design.md)
- [TASK-07.26-0044](../../TASK-07.26-0044-filesystem-native-linux-helper-spike/task.md)
- [TASK-07.26-0045](../../TASK-07.26-0045-filesystem-native-driver-implementation/task.md)
- [Filesystem-native Storage Profile](../../../../technical/filesystem-native-storage-profile.md)
- [Write, Journal і Recovery Contract](../../../../technical/write-journal-recovery-contract.md)
- [ADR-0012](../../../../technical/decisions/ADR-0012-filesystem-native-storage-protocol.md)

Повний перелік protocol cut points і isolated exact-profile environment фіксуються під час активації.

## Обмеження

- перед freeze перевірити всі dependencies і environment identity; mismatch блокує run;
- harness instrumentation не може змінювати ordering або binary semantics;
- кожний verdict прив'язаний до tested build і tuple;
- kernel/power/device failure не симулювати process kill і не включати у claim;
- missing cut, nondeterministic reopen або basename gap означає fail, а не waiver.

## Заплановані результати

1. Побудувати attestation manifest і cut-point-to-invariant coverage map.
2. Запускати clean setup, operation, forced process termination, reopen та invariant inspection для кожного cut/seed.
3. Окремо виконати initialization/two-opener, readonly/writer, lock-release, `EEXIST`/retry matrices.
4. Сертифікувати `NAME_MAX` boundary для exact derived names `.<root>.extensia-init-lock`, `.<root>.init.<uuid>` або затвердженої digest-derived схеми.
5. Повторити representative matrix clean-room способом і порівняти raw evidence.
6. Сформувати certificate, explicit exclusions, defect list, self-review та independent audit.

## Перевірки

- old-or-new valid state assertion після кожного crash/reopen;
- reachability та checksum/sequence inspection;
- no-mutation readonly snapshots;
- lock availability після kill;
- retry semantic identity;
- exact basename boundary та expected `ENAMETOOLONG`;
- environment/build hash equality перед кожною серією.

## Умови зупинки

- dependency не прийнята або build змінився;
- profile/environment tuple не точний;
- harness не може детерміновано досягнути cut;
- protocol defect, partial reachable state або unresolved ambiguous outcome;
- independent audit недоступний без належно зафіксованого limitation/рішення.

## Ризики та припущення

- Припускається production-equivalent instrumentation.
- Статистичний stress доповнює, але не замінює exhaustive cut inventory.
- Успіх розблоковує лише optional TASK-07.26-0047 після окремого destructive-environment approval.

## Зміни від попереднього run

Перший run; попереднього run немає.
