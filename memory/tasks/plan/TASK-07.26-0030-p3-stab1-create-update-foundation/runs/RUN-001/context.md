# Контекст RUN-001

Preparation Status: prepared
Execution Status: completed
Status: review-ready
Created: 2026-07-11
Started: 2026-07-11

## Роль і activation

- Agent Role: System Engineer Hat.
- Execution Mode: `autonomous-implementation`.
- User activation: «Виконай задачу P3-STAB1 / TASK-07.26-0030. Я дозволяю запускати субагентів для ревю.»

## Канонічні джерела

- Canonical task `TASK-07.26-0030` визначає bounded stabilization scope і окремий human gate перед `P3-DG2`.
- Accepted results `BP3-01A / TASK-0025`…`BP3-05 / TASK-0029` задають factual implementation baseline.
- `technical/write-journal-recovery-contract.md`, ADR-0008 і published `APP-07.26-0024-001` визначають accepted write/journal/recovery boundary.
- Поточні source/tests/package artifacts є executable truth для stabilization; draft wider specifications не дозволяють розширювати scope.

## Початковий стан

- `BP3-01A`…`BP3-05` завершені після independent audits і whole-task human approvals.
- Production baseline містить source-only shared write seams, Operation Engine, deterministic full fake/recovery, public Resource create і own-metadata update.
- Full gate останнього slice мав 16 test files / 171 tests; RUN-001 повинен незалежно відтворити поточний стан, а не покладатися на попередній звіт.
- `P3-DG2`, concrete driver, hooks, sync та решта Phase 3 вертикалей не активовані.

## Architecture boundaries

- Durable create/update проходять consumer-owned Core write port, один Operation Engine і driver-owned storage session/transaction.
- Resolved transaction commit є linearization point; journal містить лише committed entries, prepared index delta publish-иться після commit, committed post-fault закриває runtime.
- Recovery виконується exclusive clean session до ready publication і перевіряє canonical sequence/cursor/fingerprint integrity.
- Public package не відкриває IoC, Core, protocol tokens, Operation Engine, fake driver або internal subpaths.
- Stabilization не винаходить новий contract: невизначеність щодо `P3-DG2` або concrete driver є stop condition/follow-up.

## Ризики

- Green full suite не замінює criterion-level traceability, focused concurrency/failure/recovery matrices і source/package boundary scans.
- Deterministic fake може випадково стати неявним public driver contract; evidence має зберегти opaque experimental boundary.
- Clean install/build змінюють generated `dist` і `node_modules`, але не мають переписувати accepted source або user work.
- Широкий target design може спровокувати speculative feature work; production diff дозволений лише після відтвореного defect.
