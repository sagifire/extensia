# Контекст виконання: RUN-003

Related Task: [P4-DG1 / TASK-07.26-0039](../task.md)
Activated: 2026-07-12
Previous Run: [RUN-002](../RUN-002/index.md) — changes-requested через post-freeze scope expansion

## Мета run

Виконати explicit user instruction зафіксувати погоджену taxonomy та створити/валідувати окремі prepared design tasks filesystem-native і PostgreSQL/MySQL families, не активуючи їх або P4-WP1.

## Effective scope

- Прийняти RSCH-002/report/FIX-002 як incorporated design input RUN-002.
- Створити й валідувати TASK-0041 filesystem-native design із native/sidecar primitive research.
- Створити й валідувати TASK-0042 PostgreSQL/MySQL client-server design.
- Інтегрувати packages у task plan indexes/progress.
- Перевірити P4-WP1 gate й створити його лише якщо всі existing prerequisites виконані.
- Виправити lifecycle metadata FIX-001 без зміни approved proposal body.
- Виконати self-review та independent audit.

## Out of scope

- Activation TASK-0041/TASK-0042/P4-DG2/P4-WP1.
- Canonical application FIX-001/FIX-002.
- Production code, dependency або public API changes.
- Виконання filesystem/PostgreSQL/MySQL research.

## Acceptance

- Taxonomy artifacts exact, internally consistent і traceable.
- FIX-001 status/disposition consistent; FIX-002 proposal-only.
- TASK-0041/TASK-0042 atomic backlog/prepared packages, complete indexes/context, no result.md.
- Filesystem task не підміняє native lock/directory durability sidecar-файлом.
- SQL task розділяє vendor profiles і явно моделює network commit ambiguity.
- P4-WP1 gate evaluated without premature task creation.
- Independent audit has no open P0-P3 before human review.
