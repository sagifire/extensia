# RSCH-001: Exact order, delete, Mark і KV semantics

Status: prepared
Task: TASK-07.26-0031 / P3-DG2
Execution Mode: autonomous-research
Prepared: 2026-07-11
Activated: n/a
Agent Role: Agent Executor
Reviewer Role: Agent Reviewer (independent subagent після explicit delegation)

## Дослідницьке питання

Які exact domain, public API, concurrency, semantic-commit, journal, index-publication й recovery contracts мають керувати Resource move/order, delete/optional restore, Mark і KV writes поверх прийнятого P3 foundation, щоб наступні vertical slices були реалізовними без другого write path, concrete driver assumptions або прихованого розширення scope?

## Вхідний контекст

- `memory/product/requirements.md`, `memory/product/roadmap.md`.
- `memory/domain/rules.md`, `memory/domain/open-questions.md`, `memory/domain/target/model.md`, `memory/domain/current/implementation-state.md`.
- `memory/technical/architecture.md`, `memory/technical/open-questions.md`, `memory/technical/public-read-contract.md`, `memory/technical/write-journal-recovery-contract.md`.
- Relevant accepted ADR, насамперед ADR-0005 і ADR-0008, та application artifact `APP-07.26-0024-001`.
- `P3-DG1` research/report/fixation як protocol baseline; `P3-STAB1 / RUN-001` result як factual stabilized implementation evidence.
- Актуальні code/tests shared write port, Operation Engine, deterministic fake, create/update та Hot Metadata Index.
- Draft `memory/references/extensia-v2/domain-model-v2.md`, `extension-and-api-model-v2-ioc.md`, `runtime-architecture-v2-ioc.md` лише як non-authoritative design inputs згідно source policy.
- `memory/knowledge/package-index.md` і PDADM MVP Reglament package для autonomous design workflow.

## Межі run

- Не змінювати production source, tests, dependencies, package exports або runtime behavior.
- Не активувати й не створювати implementation runs для `P3-VS3`, `P3-VS4`, `P3-VS5` або final `P3-STAB`.
- Не визначати Asset/upload, concrete storage layout/durability, External Change Sync, plugins/hooks або release-wide compatibility.
- Не трактувати draft source signatures як accepted public API.
- Не застосовувати canonical product/domain/technical зміни в цій design task; ізолювати їх у `FIX-001`, якщо proposal потрібен.
- Не послаблювати accepted P3 semantic commit, committed-only journal, recovery-before-ready, detached DTO або single-pipeline boundaries без explicit finding і owner decision.

## План дослідження

1. Відтворити factual P3-STAB1 baseline і скласти traceability map open questions -> requirements -> accepted contracts -> code seams.
2. Побудувати інваріанти tree/sibling groups і альтернативи move/order normalization, включно з numeric range, root, cycle/orphan, no-change та multi-resource atomicity.
3. Побудувати delete/restore state machine з children, visibility, flags, timestamps, repeated operations, move conflicts і committed read-back.
4. Порівняти replace, patch і explicit delete alternatives для `setMarks`/`setKV`; визначити identity, validation, limits, deterministic ordering/serialization та no-change.
5. Спроектувати exact conceptual application/Core/driver contracts, normalized errors, lock keys/order, write-set, fingerprint, journal payload і prepared index delta для кожної operation.
6. Перевірити failure cuts, crash/fresh recovery, concurrent schedules, readonly/lifecycle behavior і compatibility з чинними create/update/read surfaces.
7. Сформувати task-ready decomposition `P3-VS3`, `P3-VS4`, `P3-VS5`, final `P3-STAB` із dependency gates без activation.
8. Підготувати detailed report, за потреби FIX-001, виконати upward consistency, language й architecture-pressure gates.
9. Перед review-ready запустити незалежний subagent audit після explicit delegation; закрити або явно винести всі findings.

## Обов'язкові рішення

- Move input model і meaning requested `order_index`; canonical sibling ordering/normalization та overflow/range policy.
- Atomic write-set і lock discipline для source/destination parents, moved Resource і affected siblings.
- Delete children policy, query/tree visibility, repeated delete й relation `is_deleted` до `locked`/`hidden`.
- Include/defer restore; exact restore target/order/conflict semantics у разі include.
- `updated_at` propagation для hierarchy, delete, Mark і KV mutations.
- `setMarks` replace/patch/delete model, Mark validation/limits/order і duplicate handling.
- `setKV` namespace replace/patch/delete model, validation/limits/order і empty container cleanup.
- Journal operation kinds/payload hints, full write-set fingerprinting, recovery/index publication і committed warning behavior.
- Exact public methods, DTO, normalized errors, experimental compatibility labels і read-back behavior.
- Downstream ownership та activation gates для `P3-VS3`…final `P3-STAB`.

## Required output

- Оновлений task-local `RSCH-001.md` із recommendation, evidence, risks, self-review і memory sync.
- `memory/reports/research/2026-07-11-extensia-order-delete-mark-kv-semantics.md` з detailed contracts, alternatives й matrices.
- Direct update `memory/reports/research/index.md` після створення report.
- `fixations/FIX-001.md` та `fixations/index.md`, якщо recommendation змінює canonical memory; proposal не застосовується.
- Independent audit evidence з verdict і disposition findings.

## Green gate

- Усі acceptance criteria `task.md` покриті exact рішенням або explicit blocker/owner choice.
- Є traceability, alternatives register, API/type snapshot, invariant/state-transition, failure/recovery та concurrency matrices.
- Немає assumptions про concrete storage layout, Asset/plugins/hooks або draft API authority.
- Немає другого write path, partial sibling commit, index-as-authority або public internal handles.
- Downstream tasks є task-ready, але не activated.
- Upward consistency states зафіксовані як `updated`, `not needed`, `proposed` або `blocked`.
- Language gate і architecture-pressure review пройдені.
- Independent audit не має відкритих P0-P3 findings.

## Stop conditions

- Accepted P3 contract суперечить необхідній atomic multi-resource semantics і потребує owner revision.
- Restore, delete children policy, limits або public compatibility мають кілька істотно різних продуктово допустимих варіантів без достатнього authority для вибору.
- Correctness потребує concrete driver layout, Asset semantics, hooks/plugins або іншого owner gate.
- Independent reviewer недоступний або delegation не підтверджена перед review-ready.

## Підготовчий стан

Research run ще не активований і не містить design result. Цей файл є execution contract; checkboxes, recommendation, evidence, self-review, audit verdict і memory sync заповнюються під час окремо активованого виконання без переписування історії підготовки.
