# TASK-07.26-0031: P3-DG2 — Спроектувати order, delete, Mark і KV semantics

Status: backlog
Type: design
Execution Mode: autonomous-research
Created: 2026-07-11
Owner Role: Product Lead Hat / System Engineer Hat
Current Run: n/a
Current Research: RSCH-001 (prepared, not activated)
Current Fixation: n/a

## Мета

Спроектувати точні й узгоджені з чинним journal-backed write foundation semantics для Resource hierarchy/order, move, delete та optional restore, а також Mark і KV writes, достатні для task-ready декомпозиції `P3-VS3`, `P3-VS4`, `P3-VS5` і final `P3-STAB` без передчасного визначення Assets, concrete physical Storage Driver або plugin/hooks API.

## Продуктовий контекст

`P3-DG1`, `BP3-01A`, `P3-WP1`, `P3-WP2`, `P3-VS1`, `P3-VS2` і bounded `P3-STAB1` завершені та прийняті. Поточна public write surface навмисно обмежена root Resource create й own `title`/`description` update. Hierarchy/order, flags, Mark/KV і delete/restore лишаються owner gates; їх не можна додавати за draft source specifications без exact decision.

## Обсяг

- Визначити exact Resource move input/result/error contract, validation `parent_id`/`order_index`, root behavior, cycle/orphan prevention і sibling ordering model.
- Визначити deterministic normalization/reindex semantics для source і destination sibling groups під час move та delete, включно з no-change і concurrent operations.
- Визначити lock-key set/order, transaction write-set, journal payload/fingerprint, index delta і read-back semantics для hierarchy/order operations поверх єдиного Operation Engine.
- Визначити exact soft-delete semantics: eligibility, children policy, query/tree visibility, repeated delete, relation до `locked`/`hidden`, own/aggregate `updated_at` і journal publication.
- Прийняти або відхилити optional restore для Phase 3; якщо прийнято — визначити exact restore target/order, conflict handling, visibility та recovery semantics.
- Визначити exact `setMarks` contract: replace чи patch semantics, identity `type + name`, validation/normalization, limits, deterministic ordering, no-change й `updated_at` behavior.
- Визначити exact `setKV` contract: namespace/key/value validation, replace чи patch/delete semantics, limits, deterministic serialization, no-change й `updated_at` behavior.
- Визначити application-facing DTO/method/error compatibility boundary для move, delete/optional restore, Mark і KV без розкриття Core, IoC або driver transactions.
- Надати state-transition, invariant, failure-cut, recovery, concurrency, API/type, compatibility й traceability matrices.
- Підготувати task-ready scope, dependencies, acceptance і verification для `P3-VS3`, `P3-VS4`, `P3-VS5` і final `P3-STAB` без їх activation.

## Поза обсягом

- Production code, package exports або activation/implementation Phase 3 vertical slices.
- Asset metadata/upload semantics, primary Asset behavior або Asset files.
- Concrete physical Storage Driver, physical journal encoding/layout, leases і durability proof Phase 4.
- External Change Sync, lazy completeness, multi-instance visibility, hooks/plugins/custom facades або Advanced IoC API.
- Final release compatibility policy, schema migration/retention і повний error catalog поза операціями P3-DG2.
- Автоматичне застосування design proposals до canonical product/domain/technical memory.

## Залежності та activation gate

- `P3-STAB1 / TASK-07.26-0030` завершена whole-task human approval 2026-07-11.
- Canonical P3 write/journal/recovery contract, ADR-0008 і materialized shared write seams є accepted baseline та не переглядаються неявно.
- Draft source specifications є design inputs, але не authority для автоматичного public freeze.
- Задача підготовлена в `backlog`; виконання `RSCH-001` і незалежний audit потребують окремої явної activation/delegation decision користувача.

## Обов'язкові артефакти

- Task-local `research/RSCH-001.md`.
- Detailed design report `memory/reports/research/2026-07-11-extensia-order-delete-mark-kv-semantics.md` та update його direct index.
- Alternatives/decision register, exact conceptual contracts, state transitions, invariant/failure/recovery/concurrency matrices й task-ready downstream decomposition.
- `fixations/FIX-001.md` з proposal canonical змін без application, якщо design потребує змін product/domain/technical memory.
- Independent subagent audit із закритими або явно винесеними findings перед переходом у `review`.

## Критерії приймання

- [ ] Move/order semantics однозначно зберігають tree invariants і deterministic sibling order у success, no-change, concurrency та recovery paths.
- [ ] Delete semantics однозначно визначають children, visibility, repeated operation, flags/timestamps і committed read-back; restore має explicit include/defer decision.
- [ ] Mark identity, validation, limits, replace/patch contract, ordering і no-change semantics точні.
- [ ] KV namespace/key/value validation, limits, replace/patch/delete contract, serialization і no-change semantics точні.
- [ ] Кожна operation проходить через чинні Core write port, Operation Engine і driver-owned semantic commit; другого write/journal path немає.
- [ ] Lock/write-set/fingerprint/journal/index contracts покривають multi-resource hierarchy mutations і aggregate updates без facade-direct driver access.
- [ ] Public method/input/result/error contracts сумісні з чинним root-only experimental API та не розкривають internal capability handles.
- [ ] `P3-VS3`, `P3-VS4`, `P3-VS5` і final `P3-STAB` мають task-ready boundary, dependencies, acceptance та verification без activation.
- [ ] Upward consistency, source policy, language gate й architecture-pressure review виконані; proposals ізольовані від canonical application.
- [ ] Independent audit не має відкритих P0-P3 findings; research передано на task-level human review.

## Перевірка

Architecture/domain invariant review, compile-oriented TypeScript contract probes за потреби, state-transition та sibling-order examples, failure-cut/recovery matrices, concurrent schedule reasoning, public API/type compatibility snapshots, source-policy/upward-consistency/language gates й architecture-pressure review.

## Очікувана синхронізація пам'яті

Task/research/report/index/state/progress — `updated`; canonical product/domain/technical contracts — `proposed` у FIX-001, якщо потрібні; production/current implementation — `not needed`; knowledge memory — `not needed`; downstream Phase 3 tasks — `proposed`, але не activated.

## Architecture pressure

Зупинити design і винести finding, якщо semantics потребують facade-direct driver access, другого Operation Engine/write port/journal path, Hot Metadata Index як write authority, non-atomic partial sibling updates, public callable transaction/session, concrete physical layout, Asset semantics або hooks/plugins. Якщо один atomic multi-resource write-set не може коректно виразити move/delete normalization, це architecture finding, а не дозвіл на локальний workaround.

## Додатковий контекст

Planning ID `P3-DG2`; owner gate після bounded `P3-STAB1`. Ризик високий через одночасний вплив на domain invariants, multi-key concurrency, journal fingerprint/write-set, public API та downstream slicing; рекомендовані виконавець і незалежний аудитор рівня `екстремальний`.
