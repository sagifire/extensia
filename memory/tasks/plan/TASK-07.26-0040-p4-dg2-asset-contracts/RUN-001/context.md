# Контекст виконання: RUN-001

Related Task: [TASK-07.26-0040](../task.md)
Prepared: 2026-07-12
Prepared By: subagent `/root/phase4_assets`
Previous Run: none

## Мета run

Дослідити альтернативи й підготувати exact canonical Asset semantic contract, який закриває U-21..U-24, розблоковує bounded `P4-VS2` і дає однозначний semantic handoff до `P4-VS3`, не визначаючи physical durable storage protocol.

## Ефективні вимоги

1. Зберегти accepted ownership, unique-primary, internal/external, UUID/Timestamp і detached JSON-safe snapshot invariants.
2. Закрити точні validation/normalization/limits/equality rules для всіх Asset metadata fields та external URL.
3. Закрити `derived_from` existence, visibility, self/cross-Resource/cycle, delete/reassignment і dangling semantics.
4. Закрити Asset ownership/reassignment, primary selection/conflict/delete transitions і atomic aggregate effects.
5. Закрити Asset/Resource timestamp propagation та no-change semantics.
6. Обрати staged-only або staged-plus-atomic-ready initial internal Asset policy й описати спільний lifecycle state machine.
7. Визначити normalized command/result/failure semantics для metadata та upload-facing transitions.
8. Зберегти one-pipeline/one-commit/journal/post-commit-index/readonly guarantees P3 contracts.
9. Підготувати executable verification matrix, downstream slicing та exact canonical fixation proposals.

## Обсяг

- `RSCH-001` і detailed report із traceability U-21..U-24 → рішення → acceptance → downstream tests.
- Alternatives/decision records для fields/URL/data, lineage, ownership/primary, timestamps і internal lifecycle.
- State/invariant/command/failure matrices для external Asset metadata, internal Asset metadata і staged upload transitions.
- Semantic lock/write-set, journal fingerprint/payload, committed publication та read snapshot consequences.
- Compatibility analysis із current snapshot validator, Resource tombstones, P3 recovery/integrity fail-close та майбутніми indexes.
- Exact `FIX-*` proposals і independent review перед human review.

## Поза обсягом

- Concrete driver/layout/atomic primitives/fsync/rename/physical staging/recovery mechanism.
- Production implementation, public export changes або application fixations.
- Streaming/chunk API mechanics, content processing/security/deduplication.
- Full Asset indexes/sync, release schema versioning, plugins або Resource restore/cascade/purge.
- Будь-яка активація downstream tasks.

## Критерії приймання

1. U-21..U-24 та всі Asset open questions мають exact disposition.
2. Field/URL/data validation і failure contract повністю table-testable.
3. Lineage/ownership/primary/delete/reassignment matrix не має невизначених integrity transitions.
4. Lifecycle state machine повністю задає transitions, visibility, retry/idempotency, abort/failure і initial-ready decision.
5. Кожна transition має exact timestamps, mutation boundary, lock/write set, journal/publication/index і readonly effects.
6. Downstream ownership/dependencies P4-DG1/VS2/VS3/P5/P7 чіткі й не активують implementation з conceptual list.
7. Formal artifacts і exact fixation proposals проходять upward consistency та language gate.
8. Self-review й незалежний subagent audit завершені, findings dispositioned до review.

## Заплановані результати

- `RSCH-001.md` із summary, alternatives, рішеннями, traceability і disposition.
- `memory/reports/research/2026-07-12-extensia-asset-contracts.md` із повними matrices і proof strategy.
- Required `FIX-001` для canonical domain/technical contract та ADR; optional fixations лише якщо consistency аналіз доведе окрему потребу.
- Review-ready `result.md` із verification, self-review, independent audit і Review Request data.
- Downstream contract slicing: `P4-VS2` metadata operations; `P4-VS3` staged file lifecycle; explicit P4-DG1 capability handshake; P5 indexes; P7 schema freeze.

## Обов'язковий контекст задачі

- `memory/product/roadmap.md`
- `memory/product/requirements.md`
- `memory/domain/rules.md`
- `memory/domain/target/model.md`
- `memory/domain/open-questions.md`
- `memory/technical/architecture.md`
- `memory/technical/rules.md`
- `memory/technical/public-read-contract.md`
- `memory/technical/write-journal-recovery-contract.md`
- `memory/technical/order-delete-mark-kv-contract.md`
- `memory/technical/decisions/ADR-0005-core-operation-consistency.md`
- `memory/reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md`
- `memory/references/extensia-v2/domain-model-v2.md`

Під час formal research перевірити `memory/knowledge/package-index.md` і читати лише релевантні reusable packages.

## Вхідні файли та модулі

- `src/domain/snapshots.ts` і domain snapshot/type tests — current Asset scalar/aggregate validation boundary.
- `src/public/contracts.ts` і `src/index.ts` — current public snapshot exposure boundary.
- Current Core/Operation Engine, driver session/protocol, journal та batch-index seams — лише для compatibility і executable proof design, не для змін у цьому design run.

## Обмеження

- Канонічний авторський текст українською; API/schema identifiers можуть лишатися англійською.
- Не видавати target design за current implementation.
- Не вигадувати physical storage mechanics або driver capability claims без погодженого P4-DG1 evidence.
- Не послаблювати P3 commit/publication/recovery guarantees і не створювати другий write authority.
- `Asset.data` schema versioning не закривати замість P7; P4-DG2 визначає лише exact bounded limits/compatibility envelope.
- Не застосовувати `FIX-*` без explicit fixation-specific human approval; whole-task approval сам по собі недостатній. Застосовувати лише exact approved proposal під час finalizing або окремого owner application flow.

## Перевірки

- Traceability matrix: requirements/open questions → exact decision → tests → downstream owner.
- Exhaustive state/invariant tables для internal/external, uploading/ready, primary/non-primary, lineage, active/tombstoned owners/targets.
- Boundary matrices: valid/invalid fields, URL parsing, JSON depth/count/size, no-change, conflicts, readonly.
- Operation matrices: success/expected failure/storage failure/recovery cut points; one commit/journal and post-commit visibility.
- Compatibility review current snapshots/public read/P3 protocols/P4-DG1 handoff/P5 indexes/P7 freeze.
- Upward consistency: `state.md`, product, domain current/target/rules/open questions, technical architecture/rules/open questions/ADR/indexes.
- Self-review: scope, acceptance, architecture pressure, risks, compromises, memory impact, language gate.
- Independent subagent audit до передачі в human review.

## Ризики

- Змішування semantic lifecycle з physical driver protocol створить взаємне блокування P4-DG1/P4-DG2.
- Надто широкий public upload API може передчасно стабілізувати transport або driver details.
- Cross-Resource lineage чи reassignment збільшує lock/write set, referential checks і future index/sync blast radius.
- Primary auto-promotion/auto-clear без exact policy створить неочевидні aggregate mutations.
- JSON limits без canonical measurement algorithm дадуть різну поведінку adapters/drivers.
- Upload visibility, journal metadata і physical file publication можуть розійтися на crash boundaries.

## Припущення

- Accepted Phase 3 stabilization і human gate є prerequisite та не переглядаються.
- P4-DG1 і P4-DG2 можуть виконуватися паралельно; P4-DG2 використовує capability evidence, але не обирає physical semantics.
- `P4-VS2` стартує лише після `P4-VS1` і погодженого P4-DG2; `P4-VS3` — після P4-VS2, P4-DG2 і наявних driver staging primitives.
- Незалежний subagent capability дозволений користувачем і має бути використаний для audit.

## Зміни від попереднього run

Перший run; попереднього run немає.
