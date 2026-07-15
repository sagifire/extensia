# Індекс: technical

## Призначення

Технічна пам'ять Extensia: фактичний і цільовий стан архітектури, stack, source policy, технічні правила, відкриті рішення й ADR.

## Папки

- [Decisions](decisions/index.md) - ADR-like рішення.

## Файли

- [Architecture](architecture.md) - Цільова IoC-орієнтована runtime/API architecture і її відмінність від поточного стану.
- [Public Read Contract](public-read-contract.md) - Реалізований у BP2-04 bounded P2-DG1 public construction/lifecycle/read contract.
- [Write, Journal і Recovery Contract](write-journal-recovery-contract.md) - Accepted P3-DG1 semantic commit, journal, recovery, index-publication і bounded create/update contract.
- [Order, Delete, Mark і KV Contract](order-delete-mark-kv-contract.md) - Accepted P3-DG2 hierarchy/move, leaf delete, replacement aggregates і integrity fail-close contract.
- [Stack](stack.md) - Поточний та запланований технологічний stack зі статусами.
- [Rules](rules.md) - Обов'язкові технічні правила й архітектурні інваріанти.
- [Source Specifications](source-specifications.md) - Канонічні source files, виключені документи та правила інтерпретації.
- [Open Questions](open-questions.md) - Технічні design gates, які не можна вирішувати неявно під час implementation.
- [ADR-0010: Local SQLite storage protocol](decisions/ADR-0010-local-sqlite-storage-protocol.md) - First concrete embedded-transactional profile, physical protocol і proof gate.
- [Asset Semantic Contract](asset-contract.md) - Accepted P4-DG2 fields, lineage, primary, ownership, staged lifecycle і one-commit boundary.
- [ADR-0011: Asset semantic lifecycle](decisions/ADR-0011-asset-semantic-lifecycle.md) - Same-Resource lineage, explicit primary, staged-only initial state і Resource-delete upload conflict.
