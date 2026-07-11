# TASK-07.26-0021: Застосувати approved BP2-01 / FIX-001

Status: done
Type: memory-update
Execution Mode: interactive-memory-update
Created: 2026-07-10
Owner Role: Product Lead Hat / System Engineer Hat
Derived From: `BP2-01 / TASK-07.26-0015 / FIX-001`
Current Run: n/a
Current Research: n/a
Current Fixation: FIX-001

## Мета

Контрольовано застосувати approved design `BP2-01 / FIX-001` до canonical target/technical/task memory, надати stable application artifact ID і підготувати окрему bounded BP2-01A materialization task, не змінюючи production code та не активуючи implementation work.

## Контекст і authority

- `BP2-01 / TASK-07.26-0015` має status `done`.
- Task-level design result accepted, а task-local `FIX-001` окремо має status `approved` з approval scope `fixation-only`.
- Exact application payload визначають approved `FIX-001` і accepted detailed report `memory/reports/research/2026-07-10-extensia-minimal-public-read-contract.md`.
- Ця task є єдиним owner application boundary; draft source specifications лишаються inputs, а не authority для розширення approved payload.

## Обсяг

- Після окремої activation створити `worklog.md`, task-local `fixations/FIX-001.md` та direct indexes, зафіксувавши exact target files і correction loop.
- Провести independent pre-application audit proposed application package; не застосовувати canonical changes до verdict `APPLY` без відкритих P0-P2/blocker-high-medium findings.
- Створити canonical `memory/technical/public-read-contract.md` з exact root/type snapshot, lifecycle/publication, two-query surface, experimental readonly boundary, Registry/provenance, failure matrices, safe diagnostics і compatibility labels.
- Створити ADR-0007 для factory/module/result/facade publication/shared seam рішення та оновити direct technical/ADR indexes.
- Синхронізувати `technical/architecture.md`, `technical/rules.md`, `technical/open-questions.md`, `domain/target/model.md` і `product/roadmap.md` лише в межах approved FIX-001.
- Створити canonical backlog task `BP2-01A / TASK-07.26-0022` для materialization exact internal TypeScript read-port/token source artifact без runtime implementation.
- Оновити dependency gates BP2-02/BP2-03: stable application artifact цієї task + `done` BP2-01A + окрема activation кожної task.
- Синхронізувати `tasks/plan/index.md`, `tasks/plan/progress.md`, `state.md` та всі direct indexes.
- Провести independent post-application audit, language gate, upward consistency і architecture-pressure check; закрити material findings до передачі в review.

## Поза обсягом

- Створення або зміна production source, tests, package exports чи build artifacts.
- Materialization `src/system-extensions/default-api/resource-read-port.ts`; це scope окремої BP2-01A.
- Activation BP2-01A, BP2-02, BP2-03 або створення їхніх execution artifacts.
- Successful write API, final Storage Driver, Journal/recovery, plugins/hooks, Asset/Mark/KV/global queries або full error/compatibility policy.
- Розширення чи reinterpretation approved BP2-01 design поза isolated correction, повторним audit і explicit human decision.

## Activation gate

- Task створена у `backlog`; це не activation.
- Activation потребує окремого явного рішення користувача.
- Після activation режим `interactive-memory-update` вимагає `worklog.md` і task-local fixation package до canonical application.

## Обов'язкові артефакти після activation

- `worklog.md`.
- `fixations/index.md` і `fixations/FIX-001.md` з exact application manifest, audit trail та memory sync.
- Canonical public-read contract, ADR-0007 та оновлені indexes/memory files за approved payload.
- Canonical backlog `BP2-01A / TASK-07.26-0022` без `RUN-*` або activation artifacts.
- Independent pre/post-application audit evidence.
- `closure.md` лише після task-level human approval.

## Критерії приймання

- [x] Applied canonical contract семантично й структурно відповідає approved BP2-01 report/FIX без розширення scope.
- [x] `experimental-phase-2`, provisional/internal/deferred compatibility labels збережені.
- [x] ADR-0007, public-read contract, technical/domain/product updates та direct indexes узгоджені.
- [x] BP2-01A має stable ID `TASK-07.26-0022`, status `backlog`, bounded source-only scope і не має execution artifacts.
- [x] BP2-02/BP2-03 заблоковані до stable application artifact + `done` BP2-01A + власних activation decisions.
- [x] Production code/package surface не змінені; implementation tasks не активовані.
- [x] Language gate, upward consistency і architecture-pressure check пройдені.
- [x] Independent pre/post audits не мають відкритих P0-P2/blocker-high-medium findings.
- [x] Application result передано на human review; `done` можливий лише після whole-task approval.

## Перевірка

Section-by-section trace approved report -> task fixation -> applied canonical files; exact link/index validation; source/status diff; absence checks для source seam/implementation artifacts; dependency-gate matrix; language/upward consistency; independent pre/post audits.

## Очікувана синхронізація пам'яті

- Product roadmap: `updated` лише щодо applied P2-DG1 gate.
- Domain target: `updated` exact public read contract reference; domain current `not needed`.
- Technical contract/ADR/architecture/rules/open questions/indexes: `updated`.
- Task memory/progress/state/direct indexes: `updated`.
- Knowledge memory та top-level README: перевірити й зафіксувати `not needed`, `updated`, `proposed` або `blocked`.
- Production implementation: `not needed`.

## Architecture pressure

Зупинити application і повернутися до correction/audit, якщо approved payload потребує plugin API, raw resolver, final driver/write protocol, runtime source implementation, другого read contract або зміни поза BP2-01 boundary.

## Підготовка task

Task створена 2026-07-10 за прямим дорученням користувача. Користувач явно активував її 2026-07-10 повідомленням «Виконай задачу TASK-07.26-0021» і дозволив незалежних субагентів для рев’ю. Whole-task human approval отримано 2026-07-10 повідомленням «Я даю підтвердження, можеш завершувати задачу.»
