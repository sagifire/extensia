# TASK-07.26-0040: P4-DG2 Asset contracts

Task Status: backlog
Type: design
Created: 2026-07-12
Owner Role: Agent Architect
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Контракт P4-DG2 і RUN-001 підготовлені; виконання не активоване.
Acceptance: 0/8
Blockers: none
Blocked Phase: n/a
Pending Decisions: Asset validation; lineage; ownership/primary lifecycle; data limits; timestamp semantics; initial internal-file lifecycle; metadata/upload boundary; public command/result contract.
Next Action: Окремим explicit рішенням активувати RUN-001; під час execution використовувати доступне P4-DG1 capability evidence без блокування semantic design або перегляду вже визначеної межі.

## Мета

Погодити exact canonical Asset semantic contract, достатній для незалежної реалізації `P4-VS2` Asset metadata lifecycle і для однозначного входу `P4-VS3` internal staged upload, не привласнюючи physical storage protocol гілки `P4-DG1`.

## Продуктовий контекст

Phase 3 завершила journal-backed Resource writes на deterministic full-driver fake. Phase 4 додає Assets і перший concrete durable Storage Driver двома паралельними design gates. `P4-DG2` закриває відкриті U-21..U-24 та узгоджує Asset operations з уже прийнятими commit/publication/recovery invariants; конкретний layout, fsync/rename, lock і staging primitives належать `P4-DG1`.

## Вимоги

1. Зберегти accepted `REQ-DOM-002`, `REQ-DOM-004`, `REQ-DOM-007` та чинний canonical `AssetSnapshot` scalar/DTO baseline.
2. Прийняти exact validation/normalization для `type`, `role`, `mime`, `extension`, external `url` і `data`, включно з вимірюваними limits та no-change equality.
3. Визначити exact `derived_from` policy: target existence/visibility, self-link, cross-Resource relation, cycles, dangling behavior і реакцію на delete/reassignment.
4. Визначити ownership, primary selection і delete/reassignment transitions як atomic aggregate operations, включно з primary conflict policy.
5. Визначити Asset і owning Resource `updated_at` propagation для effective metadata/file-state transitions та no-change behavior.
6. Визначити дозволені initial states internal Asset: staged-only чи також atomic ready-file path; external Asset ніколи не входить в upload state.
7. Розділити metadata lifecycle `P4-VS2` і physical upload lifecycle `P4-VS3`, але зафіксувати спільну state/invariant matrix і semantic handoff до driver capabilities.
8. Усі writes мають лишатися в одному Core/Operation Engine pipeline: one semantic commit/journal entry, post-commit index publication, detached snapshot/result і fail-before-mutation у `readonly`.
9. Підготувати domain/API alternatives, failure/result vocabulary, compatibility review, executable proof strategy та exact `FIX-*` proposal для canonical memory.

## Обсяг

- Formal research/design із task-local `RSCH-*` і detailed report.
- Exact field, aggregate, lineage, primary, delete/reassignment, timestamp і no-change semantics.
- Exact `Asset.data` JSON limits для `0.1.0`; schema evolution лишається release gate.
- Command/state matrix для external metadata, internal metadata, staged upload begin/finish/abort/retry та optional ready-file creation.
- Public/internal semantic boundary: inputs, successful snapshots, normalized expected failures, lock/write-set та journal/index publication effects на рівні contract.
- Compatibility з current Asset snapshot, P3 write protocol, Resource tombstone/default visibility та майбутніми P4-VS2/P4-VS3/P5 indexes.
- Required fixation proposals для `domain/`, `technical/`, ADR/indexes та upward-consistency targets; application лишається окремим approved owner step.

## Поза обсягом

- Вибір concrete Storage Driver, physical layout, filesystem/object-store API, fsync/rename assumptions, lock implementation, staging paths або recovery ownership (`P4-DG1`).
- Production code, driver code, public exports, migrations або activation `P4-VS2`/`P4-VS3`.
- Реалізація file streaming/chunk transport, hashing/deduplication, antivirus/transcoding, signed URLs або network upload protocol.
- Full Asset query/index completeness та multi-instance sync (`P5`).
- Release-wide DTO schema versioning (`P7-WP1`).
- Resource restore/cascade/purge/retention, plugin hooks та `locked`/`hidden` behavior.
- Застосування непогоджених `FIX-*`.

## Критерії приймання

1. Усі U-21..U-24 і Asset questions з `domain/open-questions.md` мають exact disposition без прихованого deferred blocker для `P4-VS2` або `P4-VS3`.
2. Field/URL/data contract містить точні accepted values, normalization, limits, equality/no-change і normalized failures, перевірювані table-driven tests.
3. Lineage/ownership/primary/delete/reassignment contract містить повну invariant і conflict matrix, включно з tombstoned Resources/Assets та dangling-reference policy.
4. Internal/external lifecycle state machine визначає дозволені transitions, visibility, retry/idempotency, abort/failure і ready-file-vs-staged decision без привласнення physical mechanism.
5. Для кожної effective/no-change/failure transition визначені timestamps, locks/write set, journal entry, commit/publication boundary, Resource snapshot/index effects і `readonly` behavior.
6. Межі `P4-DG1`, `P4-VS2`, `P4-VS3`, `P5` і `P7` явні; downstream slicing має prerequisites, deliverables та verification matrix без conceptual-method-list activation.
7. Створені `RSCH-*`, detailed research report і exact required/optional `FIX-*`; виконано upward consistency та language gate.
8. Повний run пройшов self-review і незалежний subagent audit; findings усунені або явно оформлені до human review.

## Пов'язана пам'ять

- [Roadmap](../../../product/roadmap.md)
- [Product Requirements](../../../product/requirements.md)
- [Domain Rules](../../../domain/rules.md)
- [Target Domain Model](../../../domain/target/model.md)
- [Domain Open Questions](../../../domain/open-questions.md)
- [Technical Architecture](../../../technical/architecture.md)
- [Technical Rules](../../../technical/rules.md)
- [Public Read Contract](../../../technical/public-read-contract.md)
- [Write, Journal і Recovery Contract](../../../technical/write-journal-recovery-contract.md)
- [Order, Delete, Mark і KV Contract](../../../technical/order-delete-mark-kv-contract.md)
- [ADR-0005 Core Operation Consistency](../../../technical/decisions/ADR-0005-core-operation-consistency.md)
- [Delivery Planning Report](../../../reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md)
- [Source Domain Model](../../../references/extensia-v2/domain-model-v2.md)

## Прогони

- [RUN-001](RUN-001/index.md) — prepared — exact Asset contract research/design.

## Дослідження

Немає; `RSCH-001` створюється після активації RUN-001.

## Фіксації

Немає; exact proposals створюються під час RUN-001 і не застосовуються без human approval.

## Запити на рішення

Немає на етапі підготовки.

## Запропоновані follow-up задачі

Немає; очікувані downstream slices уже визначені roadmap як `P4-VS2` і `P4-VS3`, але не активуються цією задачею.

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
