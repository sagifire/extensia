# TASK-07.26-0032: Застосувати approved P3-DG2 / FIX-001

Status: done
Type: memory-update
Execution Mode: interactive-memory-update
Created: 2026-07-11
Owner Role: Product Lead Hat / System Engineer Hat
Derived From: `P3-DG2 / TASK-07.26-0031 / FIX-001`
Current Run: n/a
Current Research: n/a
Current Fixation: `fixations/FIX-001.md`
Reserved Application Artifact: `APP-07.26-0032-001`
Reserved Downstream Tasks: `TASK-07.26-0033…0036`

Completed: 2026-07-11 after explicit whole-task human approval

## Мета

Контрольовано застосувати approved P3-DG2 design до canonical domain/technical/product/task memory, опублікувати stable application artifact і підготувати bounded `P3-VS3`, `P3-VS4`, `P3-VS5` та final `P3-STAB` tasks без production implementation або неявної activation.

## Контекст і authority

- `P3-DG2 / TASK-07.26-0031` завершена whole-task human approval 2026-07-11.
- Source [FIX-001](../TASK-07.26-0031-p3-dg2-order-delete-mark-kv-semantics/fixations/FIX-001.md) має status `approved` із approval scope `fixation-only`; current task застосувала payload і published `APP-07.26-0032-001` після final `PASS`.
- Exact payload визначають accepted [RSCH-001](../TASK-07.26-0031-p3-dg2-order-delete-mark-kv-semantics/research/RSCH-001.md) і [detailed report](../../../reports/research/2026-07-11-extensia-order-delete-mark-kv-semantics.md).
- Accepted P3 journal-backed protocol, ADR-0005/0008 і current P3-STAB1 evidence не переглядаються неявно.
- Draft source specifications лишаються inputs і не розширюють approved boundary.

## Обсяг

- Після окремої activation створити `worklog.md`, task-local `fixations/FIX-001.md`, direct indexes і exact application manifest.
- Провести independent pre-application audit; не змінювати canonical target files до verdict `APPLY` без open P0-P2 findings.
- Створити `memory/technical/order-delete-mark-kv-contract.md` з exact approved hierarchy/order/move, delete/deferred restore, Mark/KV, public API/error, write-set/journal/index/integrity/fail-close semantics.
- Створити ADR-0009 для dense active ordering, leaf-only soft delete, replace Marks/namespace KV, coarse hierarchy lock і typed integrity fail-close.
- Виконати bounded sync `technical/architecture.md`, `technical/rules.md`, `technical/open-questions.md`, `domain/target/model.md`, `domain/rules.md`, `domain/open-questions.md` і `product/roadmap.md`.
- Підготувати canonical backlog tasks зі stable IDs: `TASK-0033 / P3-VS3`, `TASK-0034 / P3-VS4`, `TASK-0035 / P3-VS5`, `TASK-0036 / final P3-STAB`; для кожної створити backlog-only prepared `RUN-001` package з `requirements.md`, `context.md` і pending `result.md` template. Ці planning artifacts не є activation, execution evidence або дозволом почати implementation.
- Оновити direct technical/domain/decision/task indexes, `state.md` і `tasks/plan/progress.md`.
- Провести independent post-application audit, language gate, upward consistency й architecture-pressure check; опублікувати `APP-07.26-0032-001` лише після clean verdict.

## Поза обсягом

- Production source, tests, dependencies, package exports/build artifacts або runtime behavior.
- Реалізація hierarchy-aware create, move, batch index/prepared write-set, typed integrity/fault seams, Mark/KV або delete.
- Activation `P3-VS3`, `P3-VS4`, `P3-VS5`, final `P3-STAB` чи будь-якої іншої task.
- Restore/include-deleted/cascade/purge, Assets, concrete physical driver/layout, External Change Sync, lazy completeness, hooks/plugins або release compatibility freeze.
- Розширення approved P3-DG2 design без isolated correction, audit і explicit human decision.

## Activation gate

- Task була створена у `backlog` без activation/application. Користувач явно активував її 2026-07-11 і дозволив independent subagent review.
- Activation цієї owner task не активує downstream TASK-0033…0036 і не виконує їх prepared runs.
- Режим `interactive-memory-update` вимагає worklog і task-local fixation до canonical application; обидва створено до target-memory application.

## Обов'язкові артефакти після activation

- `worklog.md`, `fixations/index.md`, `fixations/FIX-001.md`.
- Canonical technical contract/ADR і bounded product/domain/technical sync.
- Prepared backlog `TASK-0033…0036` з повними backlog-only `RUN-001` planning packages без execution evidence або activation.
- Independent pre/post-application audit evidence.
- Stable `application-artifacts/APP-07.26-0032-001.md` і direct index.
- Closure лише після task-level human approval.

## Критерії приймання

- [x] Applied files section-by-section відповідають accepted report/source FIX без scope expansion.
- [x] Dense active ordering, insertion move, root create append, cycle/orphan/range/no-change й common timestamp rules збережені exact.
- [x] Leaf-only soft delete, tombstone visibility/repeated delete/flags, deferred restore й sibling reindex збережені exact.
- [x] Full-replace Marks, namespace-replace/delete KV, exact validation/limits/order/no-change semantics збережені exact.
- [x] One Core pipeline, prepared exact sorted write-set, one semantic commit/journal entry, batch index publication і recovery contracts не послаблені.
- [x] Exact public method/input/error precedence, `STORAGE_INTEGRITY_FAILED`, `operation` diagnostics і synchronous no-await fail-close до cleanup зафіксовані compile-oriented contract-ом.
- [x] Prepared `TASK-0033…0036` мають stable IDs, bounded scopes/dependencies/verification, status `backlog` і повні pending `RUN-001/{requirements.md,context.md,result.md}` packages без Started/Completed/verification claims.
- [x] Production source/package surface не змінені; restore/Assets/concrete layout/sync/hooks/plugins не імпортовані.
- [x] Direct indexes, state/progress/roadmap, language й upward consistency узгоджені.
- [x] Independent pre/post audits не мають open P0-P2 findings; application artifact published і task передана на human review.

## Перевірка

Approved report/FIX → per-file manifest → canonical text traceability; compile-oriented public/internal type snapshots; status/link/index checks; forbidden-scope scans; downstream task dependency/no-activation/run-template matrix; language/upward consistency; independent pre/post audits; `git diff --check` і production/package no-diff proof.

## Architecture pressure

Зупинити application при потребі змінити accepted choices, послабити ADR-0008, додати другий write/journal path, partial sibling commit, facade/index authority, locks acquired під storage session, callable public transaction/Core/IoC, production behavior або deferred semantics. Correction лишається isolated до нового audit/human decision.

## Підготовка task

Task підготовлена після whole-task approval P3-DG2, explicit confirmation design decisions і fixation-only approval source FIX-001. Підготовка не є activation/application; reserved downstream IDs не створюють downstream tasks.

## Closure

Final independent post-application audit повернув `PASS` без open P0-P3; `APP-07.26-0032-001` published. Користувач виконав whole-task review 2026-07-11 повідомленням «Я зробив ревю, можеш завершувати задачу.» TASK-0032 завершена як `done`; це approval не активує TASK-0033…0036.
