# RSCH-002: Taxonomy storage driver families

Status: completed
Related Task: [P4-DG1 / TASK-07.26-0039](task.md)
Related Run: [RUN-002](RUN-002/index.md)
Detailed Report: [Storage driver taxonomy](../../../reports/research/2026-07-12-extensia-storage-driver-taxonomy.md)

## Питання

Як позиціонувати SQLite як першу реалізацію без хибної моделі «БД як адаптер другої БД» та як розділити майбутні filesystem і PostgreSQL/MySQL drivers?

## Рішення

Extensia не є database engine. Storage Driver реалізує semantic persistence port, а SQLite є embedded durability engine одного physical profile. Canonical taxonomy має три families:

- `filesystem-native` — локальний filesystem profile з власним platform-bounded lock/directory durability protocol;
- `embedded-transactional` — in-process transactional engines; `local-sqlite-v1` є first/default concrete profile release `0.1.0`;
- `client-server-transactional` — PostgreSQL/MySQL та інші server-managed transactional profiles.

Families поділяють semantic conformance contract, але не physical layout, journal table/file, lock primitive чи recovery mechanism. Generic `node:fs` не визнається durable filesystem implementation; окремий research gate має перевірити native primitives і exact sidecar data formats.

## Disposition

`final-result`; taxonomy proposal підготовлено у required [FIX-002](FIX-002.md). Approved FIX-001 лишається applicable unchanged як concrete `embedded-transactional/local-sqlite-v1` profile і не застосовується до нового whole-task approval/application gate.
