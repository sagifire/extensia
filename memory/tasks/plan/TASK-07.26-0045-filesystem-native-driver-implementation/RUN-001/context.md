# Контекст виконання: RUN-001

Related Task: [TASK-07.26-0045](../task.md)
Prepared: 2026-07-15
Prepared By: subagent `/root/audit_task_0041`
Previous Run: none

## Мета run

Перетворити прийнятий дизайн і успішний native-helper spike на внутрішню production-quality реалізацію з функціонально повним тестовим доказом, не змішуючи implementation readiness із crash certification.

## Пов'язана пам'ять

- [TASK-07.26-0041](../../TASK-07.26-0041-filesystem-native-storage-driver-design/task.md)
- [FIX-001](../../TASK-07.26-0041-filesystem-native-storage-driver-design/FIX-001.md)
- [Detailed report](../../../../reports/research/2026-07-15-extensia-filesystem-native-storage-driver-design.md)
- [TASK-07.26-0044](../../TASK-07.26-0044-filesystem-native-linux-helper-spike/task.md)
- [Filesystem-native Storage Profile](../../../../technical/filesystem-native-storage-profile.md)
- [Technical Architecture](../../../../technical/architecture.md)
- [Write, Journal і Recovery Contract](../../../../technical/write-journal-recovery-contract.md)
- [ADR-0012](../../../../technical/decisions/ADR-0012-filesystem-native-storage-protocol.md)

Чинні `FullResourceDriverAdapter` contracts і repository verification commands перевіряються під час активації.

## Обмеження

- перед freeze перевірити завершення 0041/FIX і успішне acceptance 0044; інакше run не активувати;
- жодних public API змін без окремого рішення;
- native semantics не підміняти mock-only доказами;
- support status залишається uncertified до окремих certification tasks;
- усі design deviations зупиняють run для fixation/decision.

## Заплановані результати

1. Зафіксувати implementation map від invariants до modules/tests.
2. Реалізувати helper boundary, profile probe, codecs і storage state machine.
3. Реалізувати initialization, immutable graph, manifest/journal, atomic HEAD, readonly, recovery та retries.
4. Інтегрувати driver через `FullResourceDriverAdapter` без зміни public surface.
5. Додати deterministic unit/integration/negative/compatibility tests, включно з long basename та `EEXIST` paths.
6. Виконати повний repository verification suite і зібрати traceable evidence.
7. Провести self-review та незалежний audit; defects виправляти в межах затвердженого дизайну.

## Перевірки

- byte-level codecs and corruption fixtures;
- exact-profile create/update/delete/read/list/reopen/recovery suite;
- multi-process/shared-readonly/exclusive-writer matrix;
- retry/idempotency/stale artifact/partial intent matrix;
- existing adapter/public-contract regression suite;
- build/typecheck/check/package tests.

## Умови зупинки

- spike не має однозначного success verdict;
- потрібний native primitive не має прийнятого контракту;
- реалізація потребує зміни public API або accepted architecture;
- exact-profile tests недоступні;
- будь-яка спроба трактувати зелені функціональні тести як crash certification.

## Ризики та припущення

- Припускається, що helper spike надав стабільний мінімальний interface.
- Certification harnesses можуть вимагати додаткової instrumentation, але не повинні змінювати protocol semantics.
- Успіх цього run лише розблоковує окрему активацію TASK-07.26-0046.

## Зміни від попереднього run

Перший run; попереднього run немає.
