# Індекс: technical decisions

## Призначення

ADR-like рішення з технічними або структурними наслідками для проекту.

## Папки

Немає дочірніх папок.

## Файли

- [ADR-0001 Project Memory MVP](ADR-0001-project-memory-mvp.md) - Рішення використовувати `memory/` як стартову Project Memory для PDADM MVP 0.4 / Starter Kit 4.0.
- [ADR-0002 Source baseline і release semantics](ADR-0002-source-baseline-and-release-semantics.md) - Прийняті source files, виключені non-IoC документи та значення `0.1.0` / `v2`.
- [ADR-0003 Internal IoC composition](ADR-0003-internal-ioc-composition.md) - Використання `@sagifire/ioc` як internal composition layer, а не public API.
- [ADR-0004 Facade-first extension boundary](ADR-0004-facade-first-extension-boundary.md) - Прийнята межа public facades, plugins і frozen registry; exact API contracts лишаються окремими gates.
- [ADR-0005 Core operation consistency](ADR-0005-core-operation-consistency.md) - Прийнята write model через Core, Storage Driver, Journal та Hot Metadata Index; physical protocol лишається окремим gate.
- [ADR-0006 Phase 1 tooling та IoC baseline](ADR-0006-phase-1-tooling-and-ioc-baseline.md) - Прийнятий date-bound Node.js 24 ESM toolchain і перевірені integration boundaries `@sagifire/ioc@0.0.2`.
