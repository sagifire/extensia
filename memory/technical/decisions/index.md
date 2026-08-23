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
- [ADR-0007 Мінімальний public read contract](ADR-0007-minimal-public-read-contract.md) - Exact P2-DG1 factory/module/result/facade publication/shared seam decision.
- [ADR-0008 Journal-backed write protocol](ADR-0008-journal-backed-write-protocol.md) - Driver-owned outcome-definite semantic commit, committed-only journal, recovery-before-ready та post-commit index publication.
- [ADR-0009 Resource order, delete, Mark і KV](ADR-0009-resource-order-delete-mark-kv.md) - Dense order, insertion move, leaf soft delete, replacement aggregates і typed integrity fail-close.
- [ADR-0010: Local SQLite storage protocol](ADR-0010-local-sqlite-storage-protocol.md) - Accepted target concrete embedded-transactional profile і bounded physical durability protocol.
- [ADR-0011: Asset semantic lifecycle](ADR-0011-asset-semantic-lifecycle.md) - Same-Resource lineage, explicit primary, staged-only internal lifecycle і one-commit payload action.
- [ADR-0012: Filesystem-native Storage Driver protocol](ADR-0012-filesystem-native-storage-protocol.md) - Умовна feasibility через native helper, immutable graph і one-HEAD committed authority.
- [ADR-0013: Client-server transactional Storage Driver family](ADR-0013-client-server-transactional-storage.md) - Shared semantic contract, separate PostgreSQL/MySQL profiles і durable ambiguous-commit reconciliation.
- [ADR-0014: Read-model completeness](ADR-0014-read-model-completeness.md) - Greedy/lazy complete-only query semantics, coherent generation і narrow observation port.
- [ADR-0015: Multi-instance synchronization](ADR-0015-multi-instance-synchronization.md) - Volatile cursor, explicit refresh/polling, bounded retry і one local/external publication coordinator.
