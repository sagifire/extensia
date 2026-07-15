# Індекс: RUN-001

## Призначення

Завершений прогін реалізації та bounded physical proof `embedded-transactional/local-sqlite-v1`.

## Папки

Немає.

## Файли

- [Context](context.md) - Заморожуваний після активації snapshot вимог, scope, acceptance, verification і stop conditions.
- [Result](result.md) - Завершений execution, verification, self-review, audit і human-approval report.
- [Payload seam probe](payload-seam-probe.mjs) - Rerunnable bounded 64 KiB chunk transaction, memory/size/journal-growth і rollback-cleanup evidence після build.
- [Compiled driver child cut-point probe](driver-child-cutpoint-probe.mjs) - Rerunnable process-crash proof через compiled full adapter до COMMIT і після COMMIT до receipt.
