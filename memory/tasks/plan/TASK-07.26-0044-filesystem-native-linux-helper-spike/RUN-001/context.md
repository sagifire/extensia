# Контекст виконання: RUN-001

Related Task: [TASK-07.26-0044](../task.md)
Prepared: 2026-07-15
Prepared By: subagent `/root/audit_task_0041`
Previous Run: none

## Мета run

Побудувати ізольований research spike, який executable-доказами перевірить native primitives, необхідні прийнятому filesystem-native дизайну, та видасть однозначний feasibility verdict для наступної implementation-задачі.

## Пов'язана пам'ять

- [TASK-07.26-0041](../../TASK-07.26-0041-filesystem-native-storage-driver-design/task.md)
- [FIX-001](../../TASK-07.26-0041-filesystem-native-storage-driver-design/FIX-001.md)
- [Detailed report](../../../../reports/research/2026-07-15-extensia-filesystem-native-storage-driver-design.md)
- [Filesystem-native Storage Profile](../../../../technical/filesystem-native-storage-profile.md)
- [Technical Architecture](../../../../technical/architecture.md)
- [Write, Journal і Recovery Contract](../../../../technical/write-journal-recovery-contract.md)
- [ADR-0012](../../../../technical/decisions/ADR-0012-filesystem-native-storage-protocol.md)

Точний environment tuple має зафіксувати kernel, libc, Node ABI та filesystem/mount/device/cache characteristics.

## Обмеження

- перед freeze перевірити, що TASK-07.26-0041 прийнята, а FIX-001 реально застосований; інакше run блокується та context оновлюється;
- helper залишається test/research artifact і не підключається до production package;
- жодна успішна проба не розширює support claim;
- усі unsupported/unknown capability paths мають fail closed;
- root basename boundary є протокольною вимогою, а не косметичним edge case.

## Заплановані результати

1. Зафіксувати toolchain/ABI/profile manifest і відтворювану збірку Node-API helper.
2. Реалізувати мінімальні wrappers для `openat2`, OFD locks, sync та rename primitives.
3. Виконати containment, locking, initialization, namespace і error-taxonomy matrices.
4. Перевірити exact 608-byte header/completion slots та всі визначені cut points.
5. Провести basename/`NAME_MAX` matrix для `.<root>.extensia-init-lock` і `.<root>.init.<uuid>`; обрати й довести bounded або digest-derived naming.
6. Зберегти raw logs/fixtures/commands і сформувати pass/fail feasibility verdict для TASK-07.26-0045.
7. Виконати self-review та незалежний audit.

## Перевірки

- clean rebuild + load smoke test;
- negative escape/profile tests;
- concurrent multi-process lock tests та kill-based crash release;
- byte-for-byte fixture assertions;
- reopen/post-state checks після namespace cuts;
- exact boundary cases `NAME_MAX-1`, `NAME_MAX`, overflow та очікуваний `ENAMETOOLONG`.

## Умови зупинки

- неточний або недоведений environment tuple;
- відсутність required kernel/filesystem primitive;
- неоднозначна lock lifetime чи directory durability;
- невирішений root basename overflow;
- будь-яка потреба змінити прийнятий дизайн без окремої fixation/decision.

## Ризики та припущення

- Припускається доступ до ізольованого exact-profile середовища.
- Process-crash і power-loss certification залишаються окремими задачами.
- Успішний spike лише розблоковує окреме рішення про активацію TASK-07.26-0045.

## Зміни від попереднього run

Перший run; попереднього run немає.
