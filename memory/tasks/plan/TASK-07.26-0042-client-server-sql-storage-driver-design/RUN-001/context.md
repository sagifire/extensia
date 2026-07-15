# Контекст виконання: RUN-001

Related Task: [TASK-07.26-0042](../task.md)
Prepared: 2026-07-12
Prepared By: subagent `/root/prepare_sql_driver_task`
Previous Run: none

## Мета run

Дослідити PostgreSQL і MySQL як майбутні vendor profiles сім’ї `client-server-transactional`, визначити shared semantic contract, physical/capability differences та sequencing наступних задач без production implementation або dependency selection.

## Ефективні вимоги

1. Зберегти один Core/Operation Engine write pipeline і один committed journal authority.
2. Не переносити SQL schema, transaction, advisory lock, connection або pooling semantics у Core/public API.
3. Визначити atomic transaction boundary, isolation/concurrency assumptions і vendor-specific durability prerequisites.
4. Забезпечити operation-level idempotency та truthful outcome model при network ambiguity навколо commit.
5. Порівняти advisory locks, row/transaction locks і lease alternatives з урахуванням session loss, timeout і failover.
6. Визначити recovery-before-ready, readonly, integrity/corruption diagnostics і retry classification.
7. Визначити schema versioning/migration та server capability certification boundary.
8. Прийняти рішення shared family contract vs vendor profiles і запропонувати bounded sequencing PostgreSQL/MySQL follow-up tasks.

## Обсяг

- `RSCH-001` і detailed report із traceability evidence → alternatives → decisions → proof gates.
- Primary-source порівняння PostgreSQL/MySQL transaction, isolation, durability, locking, advisory locks, sessions, pooling і DDL/migration behavior.
- Vendor-aware schema/layout для metadata, payload chunks, operation idempotency records і committed journal.
- State/cut-point matrix для begin/write/commit, connection loss, timeout, retry, failover, recovery й readonly.
- Capability matrix для versions, engine/configuration, isolation, durability knobs, privileges, topology та unsupported modes.
- Family/vendor separation, compatibility з P3 semantic protocol і downstream task decomposition.
- Exact `FIX-*` proposals лише для доведених canonical changes; жодного application без approval.

## Поза обсягом

- Driver implementation, source-code changes, package installation або dependency selection.
- ORM/query-builder design, production pool tuning чи cloud-specific adapter.
- Server deployment, replication configuration, backup/restore або operational certification execution.
- Filesystem-native/SQLite redesign, Asset semantics, public API changes або Phase 5 sync implementation.
- Створення чи activation vendor implementation tasks.

## Критерії приймання

1. Primary-source evidence і executable probes, де доречно, підтримують vendor comparison та configuration assumptions.
2. Shared semantic family contract чітко відділений від PostgreSQL/MySQL physical profiles.
3. Transaction/journal/idempotency protocol має one-commit authority і exact concurrency/isolation behavior.
4. Network outcome ambiguity має truthful resolve/reject/unknown-reconcile model і deterministic idempotent retry.
5. Lock/lease/session/pool/failover/recovery/readonly matrix не має невизначених ownership transitions.
6. Schema migration, integrity, privileges і capability certification boundary є testable й version-aware.
7. Family-vs-vendor design і sequencing мають явне рішення, alternatives, trade-offs і downstream prerequisites.
8. Formal artifacts, upward consistency, self-review, language gate та independent audit готові до human review без відкритих P0-P3.

## Заплановані результати

- `RSCH-001.md` із summary, alternatives, exact decisions, traceability і disposition.
- `memory/reports/research/2026-07-12-extensia-client-server-sql-storage-drivers.md` із vendor matrices, state/cut-point model і proof strategy.
- Required або optional `FIX-*` лише якщо canonical memory потребує exact зміни.
- Review-ready `result.md` із verification, self-review, independent audit і Review Request data.
- Рекомендоване sequencing окремих PostgreSQL/MySQL owner та implementation tasks без їх activation.

## Обов'язковий контекст задачі

- `memory/product/roadmap.md`
- `memory/product/requirements.md`
- `memory/technical/architecture.md`
- `memory/technical/rules.md`
- `memory/technical/open-questions.md`
- `memory/technical/write-journal-recovery-contract.md`
- `memory/tasks/plan/TASK-07.26-0039-p4-dg1-concrete-storage-protocol/task.md`
- `memory/tasks/plan/TASK-07.26-0039-p4-dg1-concrete-storage-protocol/RUN-002/result.md`, якщо RUN-002 до activation цієї задачі вже review-ready або завершений.
- Approved/applied P4-DG1 fixations і publication artifacts, якщо вони існують на момент activation.

Під час formal research перевірити `memory/knowledge/package-index.md` і читати лише релевантні reusable packages.

## Вхідні файли та модулі

- Current Storage Driver session/protocol, journal, Operation Engine і recovery seams - лише для compatibility/proof design.
- Current deterministic fake і concrete embedded driver artifacts, якщо вони існують на activation, - як semantic conformance evidence, не як physical шаблон SQL driver.

## Обмеження

- Канонічний авторський текст українською; SQL/API/schema identifiers та назви vendor features можуть лишатися англійською.
- Не видавати target design за current implementation або confirmed vendor support без evidence.
- Не припускати, що PostgreSQL і MySQL мають однакові isolation, advisory lock, DDL або failure semantics.
- Не приховувати outcome ambiguity за автоматичним retry; reconciliation спирається на persisted `operation_id`/journal evidence.
- Не послаблювати semantic atomicity, one-journal authority, recovery-before-ready, readonly та integrity fail-close guarantees.
- Не обирати npm dependency, ORM або preferred vendor замість design decision, яке входить у scope.
- Не застосовувати `FIX-*` без explicit fixation-specific human approval.

## Перевірки

- Traceability matrix: P4-DG1 taxonomy/invariants → family decision → vendor profiles → downstream proof gates.
- Vendor matrix: transaction/isolation/durability/advisory locks/session/pool/failover/DDL/privileges/version boundary.
- Cut-point matrix: pre-commit, commit request, server commit, response loss, retry/reconcile, recovery-before-ready.
- Conformance matrix: one semantic commit/journal, idempotency, expected/storage/ambiguous outcomes, readonly й integrity failures.
- Schema migration matrix: compatible/incompatible version, interrupted migration, concurrent startup, rollback/forward-only policy.
- Upward consistency: `state.md`, product, domain current/target, technical architecture/rules/open questions/ADR/indexes.
- Self-review: scope, acceptance, evidence quality, architecture pressure, risks, compromises, memory impact і language gate.
- Independent subagent audit до передачі в human review.

## Ризики

- Спільний abstraction може приховати суттєві vendor differences і створити найменший спільний знаменник із слабшими гарантіями.
- Network timeout після server commit робить binary local-style outcome contract неправдивим без durable idempotency/reconciliation.
- Session-scoped advisory lock може втратитися при pool handoff або connection failure, не завершивши semantic operation cleanly.
- Server/configuration durability knobs можуть змінити гарантії без зміни driver code.
- Online migration і concurrent startup можуть створити другий coordination protocol або пошкодити readiness boundary.

## Припущення

- P4-DG1 whole-task і потрібні canonical fixations будуть accepted/applied до activation цього run; інакше activation має перевірити dependency й зафіксувати blocker або оновити prepared context до freeze.
- PostgreSQL і MySQL розглядаються як майбутні окремі vendor profiles, а не як заміна першого `embedded-transactional` driver Phase 4.
- Exact server versions, topology й supported configurations мають бути результатом research, а не стартовим припущенням.
- Незалежний subagent audit використовується до human review, якщо capability доступна й delegation дозволена.

## Зміни від попереднього run

Перший run; попереднього run немає.
