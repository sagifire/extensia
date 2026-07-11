# Agent Workflows

## Methodology Navigator

Для ведення користувача по регламенту, пояснення поточного workflow state, доступних наступних кроків, task boundary, review rules і наслідків різних варіантів дій.

Це default behavior для `Agent Assistant`, якщо роль або задача не задані.

## Project Bootstrap

Для організації роботи з проектом, який починається з короткого опису концепції, бізнес-цінностей або проблеми.

Рекомендований порядок:

1. Product framing.
2. Scope framing.
3. Domain framing.
4. Technical framing.
5. MVP slicing.
6. Roadmap або phase planning.
7. Task backlog.

Planning або design work може оформлюватися як задача з `Execution Mode: autonomous-research` і detailed report у `reports/research/**`.

## Assistant

Для обговорення ідей, уточнення вимог, аналізу ризиків, підготовки задач і controlled memory updates.

Agent Assistant не застосовує зміни в код або Project Memory поза task boundary.

## Task Preparation

Для створення або уточнення `task.md`, scope, acceptance criteria, `Execution Mode` і потрібних execution artifacts.

`Execution Mode` фіксується в `task.md`. Workflow агента в сесії може змінюватися залежно від контексту, але це не змінює task-level `Execution Mode`.

## Autonomous Implementation

Для автономного виконання task run у межах `requirements.md` і `context.md`.

Основні артефакти:

- `runs/RUN-*/requirements.md`
- `runs/RUN-*/context.md`
- `runs/RUN-*/result.md`

Після виконання агент виконує self-review. Якщо доступні субагенти, self-review виконує незалежний субагент-аудитор.

Після self-review агент переводить задачу в `review`, а не в `done`.

## Autonomous Research

Для автономного дослідження, planning або design без імплементації.

Підходить для:

- технічних, продуктових, архітектурних або процесних research tasks;
- планування фаз, roadmap slices або backlog proposals;
- проектування domain, UX, product, technical або architecture design options.

Основні артефакти:

- `research/RSCH-*.md`
- `reports/research/YYYY-MM-DD-short-name.md`
- `fixations/FIX-*.md`, якщо research пропонує фіксацію інформації в Project Memory

Після дослідження агент виконує self-review, переводить задачу в `review` і окремо просить approval на memory fixation, якщо вона потрібна.

## Interactive Memory Update

Для інтерактивного обговорення з людиною й контрольованої фіксації змін у Project Memory.

Основні артефакти:

- `worklog.md`
- `fixations/FIX-*.md`

Після застосування погодженої фіксації агент не закриває задачу самостійно. Він переводить задачу в `review` і просить task-level human review decision.

## Architecture Health Review

Для виявлення ситуацій, коли поточна архітектура починає обмежувати нові фічі, провокує workaround, дублювання, крихкі tests або страх refactor.

Типовий результат:

- audit report у `reports/audits/YYYY-MM-DD-architecture-health.md`;
- design або research task для варіантів перебудови;
- ADR або architecture proposal;
- refactor task з контрольованим scope.

## Memory Migration

Для міграції Project Memory між версіями PDADM MVP.

Перед основними змінами агент має прочитати відповідний migration guide у `knowledge/packages/pdadm-mvp-reglament/migrations/`.

Для міграції з MVP 0.3 до MVP 0.4 не переписувати документи в папках виконаних задач без окремої явної причини.

## Review

Для перевірки результату, acceptance criteria, out-of-scope змін, ризиків, shortcuts, unplanned work, memory sync, language gate і upward consistency check.

Якщо доступні субагенти, review результату агента має виконувати незалежний субагент-аудитор.

## Knowledge Update

Для створення або оновлення knowledge packages, examples, anti-examples і package index.

## Research

Для збору інформації, пошуку суперечностей і підготовки висновків без прийняття їх як canonical memory.
