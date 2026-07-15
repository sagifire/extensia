# TASK-07.26-0044: Filesystem-native Linux helper spike

Task Status: backlog
Type: research/spike
Created: 2026-07-15
Owner Role: Agent Systems Engineer
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Контракт native Linux helper spike і RUN-001 підготовлені; виконання не активоване.
Acceptance: 0/8
Blockers: TASK-07.26-0041/FIX-001 мають бути accepted/applied до активації.
Blocked Phase: activation
Pending Decisions: explicit activation; exact test environment; bounded або digest-derived naming для довгого root basename.
Next Action: Окремим explicit рішенням активувати RUN-001 після перевірки dependency та exact `linux-local-ext4-v1` environment.

## Мета

Експериментально довести або спростувати здійсненність мінімального native Linux helper для профілю `linux-local-ext4-v1`, не створюючи production-залежність і не заявляючи підтримку Storage Driver.

## Обсяг

- мінімальний Node-API helper з відтворюваною збіркою та завантаженням на точному Linux/Node ABI tuple;
- handle-relative containment через `openat2` та fail-closed capability/profile probe;
- OFD shared/exclusive locking, crash-release, семантика дубльованих descriptor-ів та окремий init-lock без upgrade;
- точний 608-byte root header із двома completion slots і контрольованими cut points;
- `fsync` файлів і директорій, cross-directory publish через `RENAME_NOREPLACE`, same-directory atomic HEAD replace;
- нормалізована taxonomy native помилок і тестові докази для кожної заявленої примітиви;
- boundary-дослідження похідних імен `.<root>.extensia-init-lock` та `.<root>.init.<uuid>` для `NAME_MAX`/`ENAMETOOLONG`.

## Поза обсягом

- production Storage Driver, інтеграція в публічний API або runtime dependency;
- повна реалізація immutable graph, journal/manifest, recovery чи readonly adapter;
- сертифікація process-crash або power-loss;
- Windows/NTFS, мережеві та невідомі файлові системи;
- декларація загальної підтримки Linux або ext4 поза точним профілем.

## Критерії приймання

1. Helper відтворювано збирається і завантажується на зафіксованому Node/Linux ABI tuple; спосіб збірки та binary provenance записані.
2. Executable matrix підтверджує handle-relative containment і відмову на symlink/magic-link/mount escape та на відсутній required capability.
3. OFD matrix підтверджує shared/exclusive conflict, crash-release, поведінку duplicate descriptors і two-opener init protocol без lock upgrade.
4. Exact-byte tests покривають 608-byte header, обидва completion slots, checksum/sequence selection і визначені crash cuts.
5. Namespace probes покривають file/directory `fsync`, `RENAME_NOREPLACE`, `EEXIST` та same-directory HEAD replace, включно з необхідною синхронізацією source/destination directories.
6. Profile probe приймає лише точний `linux-local-ext4-v1` tuple та fail-closed відхиляє невідомі або слабші середовища.
7. Межі root basename перевірені до точного `NAME_MAX`: похідні init-lock/temp names або мають доведену допустиму межу, або замінені фіксованим digest-derived іменуванням; негативні `ENAMETOOLONG` тести обов'язкові.
8. Результат містить raw evidence, відтворювані команди, висновок feasibility, self-review та незалежний audit згідно з регламентом.

## Перевірки

- native unit/integration probes на точному профілі;
- multi-process lock та crash-release harness;
- exact-byte fixture comparison для header/slots;
- namespace cut matrix із перевіркою post-state після повторного відкриття;
- boundary matrix для basename length і `ENAMETOOLONG`;
- негативні capability/profile probes.

## Ризики

- Node ABI або toolchain можуть зробити helper невідтворюваним;
- API Linux може бути доступним у headers, але не підтримувати потрібну runtime-семантику;
- `NAME_MAX` може зламати протокол ще до відкриття root;
- успіх spike не є доказом durability чи production support.

## Пов'язана пам'ять

- [TASK-07.26-0041](../TASK-07.26-0041-filesystem-native-storage-driver-design/index.md)
- [FIX-001](../TASK-07.26-0041-filesystem-native-storage-driver-design/FIX-001.md)
- [Detailed report](../../../reports/research/2026-07-15-extensia-filesystem-native-storage-driver-design.md)
- [Filesystem-native Storage Profile](../../../technical/filesystem-native-storage-profile.md)
- [Technical Architecture](../../../technical/architecture.md)
- [Write, Journal і Recovery Contract](../../../technical/write-journal-recovery-contract.md)
- [ADR-0012](../../../technical/decisions/ADR-0012-filesystem-native-storage-protocol.md)

## Прогони

- [RUN-001](RUN-001/index.md) - prepared - native Linux helper spike.

## Дослідження

Немає; research evidence буде створено після активації RUN-001.

## Фіксації

Немає; design deviations потребують окремої fixation і approval.

## Запити на рішення

Немає на етапі підготовки.

## Запропоновані follow-up задачі

- [TASK-07.26-0045](../TASK-07.26-0045-filesystem-native-driver-implementation/index.md) - реалізація лише після успішного spike та окремої активації.

## Human Review

Status: not-ready
Requested: n/a
Reviewed: pending
Approval Source: n/a
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: pending
Decision Notes: RUN-001 не активований.

## Фінальний результат

Completed: pending
Final Run: pending
Summary: pending
Residual Risks: pending
