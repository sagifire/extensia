# TASK-07.26-0045: Filesystem-native driver implementation

Task Status: backlog
Type: implementation
Created: 2026-07-15
Owner Role: Agent Implementer
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Контракт реалізації filesystem-native Storage Driver і RUN-001 підготовлені; виконання не активоване.
Acceptance: 0/8
Blockers: успішна TASK-07.26-0044 та окреме рішення про активацію.
Blocked Phase: activation
Pending Decisions: helper spike feasibility verdict; exact implementation activation.
Next Action: Після accepted TASK-07.26-0044 окремим explicit рішенням активувати RUN-001.

## Мета

Реалізувати внутрішній filesystem-native Storage Driver згідно з прийнятим профілем і доказаними helper primitives, з повним функціональним тестуванням, але без передчасної заяви crash/power-loss support.

## Обсяг

- internal profile/capability adapter і native-helper boundary;
- exact frame/header codecs та validation;
- immutable resource graph, manifest/journal records і єдиний atomic HEAD;
- initialization protocol, readonly open, recovery та idempotent retry semantics;
- інтеграція через наявний `FullResourceDriverAdapter` без розширення public surface;
- fail-closed error mapping і cleanup/reconciliation;
- unit, integration, compatibility та negative tests.

## Поза обсягом

- process-crash або power-loss certification і будь-який support claim до їх завершення;
- Windows/NTFS implementation;
- новий публічний API чи зміна абстракцій поза затвердженим дизайном;
- підтримка невідомих/mismatched filesystem profiles;
- destructive power-cut testing.

## Критерії приймання

1. Реалізація відповідає затвердженим wire/layout/state-machine invariants без прихованого другого source of truth.
2. Initialization, create/update/delete/read/list/reopen/recovery та idempotent retry проходять deterministic integration tests.
3. Readonly path використовує shared barrier і не виконує мутацій; writer path має exclusive discipline.
4. Immutable graph, manifest/journal і HEAD publish дотримуються ordering/sync контракту та не відкривають partial state.
5. Profile adapter приймає лише доказаний exact profile, а всі unknown/mismatch cases fail closed зі стабільною taxonomy помилок.
6. Інтеграція використовує `FullResourceDriverAdapter`; існуючі public contracts і package boundaries не розширені.
7. Boundary і negative tests охоплюють corruption, stale temp/intent, `EEXIST`, retry, long root basename та helper failures.
8. Повний test/build/typecheck suite зелений; implementation evidence, self-review та незалежний audit зафіксовані, але support status лишається uncertified.

## Перевірки

- targeted codec/state-machine/unit tests;
- exact-profile integration suite з reopen/recovery;
- concurrency/read-only negative matrix;
- compatibility suite для existing adapters/public API;
- package build, typecheck, lint/check та deterministic fixture comparison.

## Ризики

- implementation може непомітно відхилитися від accepted ordering contract;
- test doubles можуть дати хибну впевненість у native semantics;
- recovery/idempotency можуть створити другий mutable authority;
- інтеграція може випадково розширити public API або support claim.

## Пов'язана пам'ять

- [TASK-07.26-0041](../TASK-07.26-0041-filesystem-native-storage-driver-design/index.md)
- [FIX-001](../TASK-07.26-0041-filesystem-native-storage-driver-design/FIX-001.md)
- [Detailed report](../../../reports/research/2026-07-15-extensia-filesystem-native-storage-driver-design.md)
- [TASK-07.26-0044](../TASK-07.26-0044-filesystem-native-linux-helper-spike/index.md)
- [Filesystem-native Storage Profile](../../../technical/filesystem-native-storage-profile.md)
- [Technical Architecture](../../../technical/architecture.md)
- [Write, Journal і Recovery Contract](../../../technical/write-journal-recovery-contract.md)
- [ADR-0012](../../../technical/decisions/ADR-0012-filesystem-native-storage-protocol.md)

## Прогони

- [RUN-001](RUN-001/index.md) - prepared - реалізація filesystem-native driver.

## Дослідження

Немає; реалізація спирається на accepted research TASK-07.26-0041 і TASK-07.26-0044.

## Фіксації

Немає; design deviations потребують окремої fixation і approval.

## Запити на рішення

Немає на етапі підготовки.

## Запропоновані follow-up задачі

- [TASK-07.26-0046](../TASK-07.26-0046-filesystem-native-linux-process-crash-certification/index.md) - process-crash сертифікація після accepted implementation.

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
