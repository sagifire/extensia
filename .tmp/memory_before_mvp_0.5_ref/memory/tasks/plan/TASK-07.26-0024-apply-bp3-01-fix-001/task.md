# TASK-07.26-0024: Застосувати approved BP3-01 / FIX-001

Status: done
Type: memory-update
Execution Mode: interactive-memory-update
Created: 2026-07-10
Owner Role: Product Lead Hat / System Engineer Hat
Derived From: `BP3-01 / TASK-07.26-0023 / FIX-001`
Current Run: n/a
Current Research: n/a
Current Fixation: `fixations/FIX-001.md`
Reserved Application Artifact: `APP-07.26-0024-001`

## Мета

Контрольовано застосувати approved P3-DG1 design до canonical domain/technical/product/task memory, опублікувати stable application artifact і підготувати bounded Phase 3 follow-up tasks без production implementation або неявної activation.

## Контекст і authority

- `BP3-01 / TASK-07.26-0023` має status `done`; RSCH/report accepted.
- Source `FIX-001` має status `approved` із approval scope `fixation-only`; ця owner task застосувала його як `APP-07.26-0024-001`.
- Exact payload визначають accepted detailed report і approved source fixation.
- Draft source specifications лишаються inputs і не розширюють approved boundary.

## Обсяг

- Після окремої activation створити `worklog.md`, task-local `fixations/FIX-001.md`, direct indexes і exact application manifest.
- Провести independent pre-application audit; не змінювати canonical target files до verdict `APPLY` без open blocker/high/medium findings.
- Створити `memory/technical/write-journal-recovery-contract.md` та ADR-0008 за approved protocol.
- Bounded sync `technical/architecture.md`, `technical/rules.md`, `technical/open-questions.md`, relevant domain target/rules/open questions і roadmap/state/progress.
- Підготувати canonical backlog tasks BP3-01A, BP3-02…BP3-05 та create/update stabilization gate зі stable IDs, exact dependencies і no activation.
- Оновити direct technical/domain/decision/task/report indexes.
- Провести independent post-application audit, language gate, upward consistency й architecture-pressure check; опублікувати `APP-07.26-0024-001` лише після clean verdict.

## Поза обсягом

- Production source, tests, package exports/build artifacts або runtime behavior.
- Materialization shared write seams чи implementation locks/engine/fake/create/update.
- Activation будь-якої Phase 3 implementation task.
- Concrete physical driver/layout, P3-DG2, Assets, External Change Sync, hooks/plugins або release compatibility freeze.
- Розширення approved P3-DG1 design без isolated correction, audit і explicit human decision.

## Activation gate

- Task створена у `backlog`; це не activation.
- Activation потребує окремого явного рішення користувача.
- Independent subagent review для цієї нової task потребує окремого явного дозволу користувача.
- Після activation режим `interactive-memory-update` вимагає worklog і task-local fixation до canonical application.

## Обов'язкові артефакти після activation

- `worklog.md`, `fixations/index.md`, `fixations/FIX-001.md`.
- Canonical technical contract/ADR і bounded memory sync.
- Prepared backlog follow-up tasks без execution artifacts.
- Independent pre/post-application audit evidence.
- Stable `APP-07.26-0024-001` і closure лише після task-level human approval.

## Критерії приймання

- [x] Applied files section-by-section відповідають accepted report/source FIX без scope expansion.
- [x] Semantic commit, fingerprint, opaque handle, committed-success warnings, sequence/cursor, recovery session й index publication rules збережені exact.
- [x] Concrete layout/P3-DG2/hooks/sync/implementation не імпортовані.
- [x] Prepared follow-up tasks мають stable IDs, bounded scopes/dependencies і status `backlog` без activation artifacts.
- [x] Production source/package surface не змінені.
- [x] Direct indexes, state/progress/roadmap, language й upward consistency узгоджені.
- [x] Independent pre/post audits не мають open blocker/high/medium findings.
- [x] Application artifact published і task передана на human review; `done` лише після approval.

## Перевірка

Approved report/FIX -> per-file manifest -> applied canonical text traceability; link/index/status checks; forbidden-scope scans; task dependency matrix; language/upward consistency; independent pre/post audits.

## Architecture pressure

Зупинити application при потребі змінити accepted protocol, додати concrete layout, callable transaction через application config, implementation behavior або P3-DG2 semantics. Correction лишається isolated до нового audit/human decision.

## Підготовка task

Task підготовлена після whole-task approval BP3-01 і окремого fixation-only approval FIX-001. Підготовка не є activation/application.

## Activation

Користувач 2026-07-10 явно активував задачу повідомленням «Виконай задачу TASK-07.26-0024» і дозволив запуск субагентів для незалежного рев’ю. Canonical application починається тільки після clean pre-application verdict.

## Результат

Approved FIX-001 applied; repeated independent post-audit `PASS` без open P0-P3; stable [APP-07.26-0024-001](application-artifacts/APP-07.26-0024-001.md) published. Task передана на whole-task human review; follow-up tasks не активовані.

## Перевірка людиною

Status: approved
Reviewed: 2026-07-10
Approval Scope: whole-task-review
Approval Source: явне повідомлення користувача «Я зробив ревю, можеш завершувати задачу.»

Результат прийнято; task дозволено завершити як `done`. Approval не активує BP3-01A або інші Phase 3 tasks.
