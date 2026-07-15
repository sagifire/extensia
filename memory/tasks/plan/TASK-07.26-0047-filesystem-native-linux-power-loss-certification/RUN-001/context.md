# Контекст виконання: RUN-001

Related Task: [TASK-07.26-0047](../task.md)
Prepared: 2026-07-15
Prepared By: subagent `/root/audit_task_0041`
Previous Run: none

## Мета run

Виконати hardware-bound destructive durability experiment лише після formal approval і видати вузький power-loss verdict, який неможливо сплутати з process-crash evidence.

## Пов'язана пам'ять

- [TASK-07.26-0041](../../TASK-07.26-0041-filesystem-native-storage-driver-design/task.md)
- [FIX-001](../../TASK-07.26-0041-filesystem-native-storage-driver-design/FIX-001.md)
- [Detailed report](../../../../reports/research/2026-07-15-extensia-filesystem-native-storage-driver-design.md)
- [TASK-07.26-0046](../../TASK-07.26-0046-filesystem-native-linux-process-crash-certification/task.md)
- [Filesystem-native Storage Profile](../../../../technical/filesystem-native-storage-profile.md)
- [Write, Journal і Recovery Contract](../../../../technical/write-journal-recovery-contract.md)
- [ADR-0012](../../../../technical/decisions/ADR-0012-filesystem-native-storage-protocol.md)

Approved destructive test plan, target inventory, owner, recovery/cleanup procedure та exact device/cache/hypervisor/flush evidence потрібні до активації.

## Обмеження

- без explicit approval run не стартує;
- кожен target identity перевіряється перед destructive action; production/shared disks виключені;
- process kill або graceful VM shutdown не зараховуються як power loss;
- environment drift скасовує серію;
- certificate обмежується exact hardware tuple та tested cut matrix.

## Заплановані результати

1. Провести safety review, зафіксувати approval і disposable target guardrails.
2. Атестувати persistence stack та калібрувати abrupt-cut mechanism контрольними scenarios.
3. Виконати repeated cut matrix для init/object/directory/HEAD windows.
4. Після кожного boot зняти image/log evidence, виконати fsck/mount/reopen та invariant checks.
5. Виконати dishonest-cache negative control і clean-room representative rerun.
6. Сформувати certificate або fail verdict з exact exclusions, self-review, independent audit і human review.

## Перевірки

- target allowlist/identity check;
- lower-layer cut proof;
- old/new valid state and reachability checks;
- flush-honesty control;
- repeated-trial consistency;
- immutable evidence hashes та environment manifest comparison.

## Умови зупинки

- немає explicit destructive approval;
- target не доведено disposable/isolated;
- cut mechanism не проходить calibration;
- certified build або environment змінився;
- будь-який ризик для production/shared data.

## Ризики та припущення

- Втрата всіх даних test target є очікуваним ризиком.
- Успішний verdict не переноситься на інше hardware без нової сертифікації.
- Задача optional: відсутність активації не погіршує process-crash verdict 0046, але power-loss claim залишається забороненим.

## Зміни від попереднього run

Перший run; попереднього run немає.
