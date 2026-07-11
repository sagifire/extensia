# TASK-07.26-0013: Зафіксувати internal boundary BP1-04 та підготувати RUN-001

Status: done
Type: memory-update
Execution Mode: interactive-memory-update
Created: 2026-07-10
Owner Role: Product Lead Hat / System Engineer Hat
Current Run: n/a
Current Research: n/a
Current Fixation: FIX-001

## Мета

Зафіксувати owner decision, що BP1-04 реалізує тільки internal Runtime Controller/lifecycle harness без нового root API, прибрати public-contract activation blocker із `TASK-07.26-0010` і підготувати повний `RUN-001` execution package без запуску implementation.

## Продуктовий контекст

Підготовлена BP1-04 була заблокована потребою exact minimal root lifecycle contract, оскільки successful packed construction/start вимагав би передчасного public config/storage integration API. Користувач обрав strict internal-only шлях: root package лишається порожнім, packed smoke перевіряє лише import/package boundary, а весь lifecycle перевіряється internal integration harness.

## Обсяг

- Зафіксувати підтверджене рішення та його rationale/boundaries у Project Memory.
- Оновити `TASK-07.26-0010`: прибрати public Extensia Module/root lifecycle scope й activation blocker.
- Зафіксувати internal lifecycle state/policy, generic lifecycle contribution boundary, fake storage-lifecycle fixture та cleanup/disposal semantics для RUN-001.
- Замінити packed public start/stop smoke на strict `import/no-side-effects/no-accidental-exports/internal-subpath-failure` checks.
- Створити для BP1-04 підготовлений `RUN-001` з `requirements.md`, `context.md`, початковим `result.md` і direct indexes.
- Лишити BP1-04 у `backlog`: execution package готовий, але implementation не запускається цією задачею.
- Синхронізувати roadmap, state, task progress та wiki indexes.
- Виконати language gate, architecture-pressure check, upward consistency й незалежні pre/post application audits.

## Поза обсягом

- Активація BP1-04 або зміна її статусу на `active`.
- Реалізація/тести runtime controller чи будь-які зміни `src/`, scripts, package/config files.
- Створення public root factory/class/config/result/state/inspection contract.
- Stabilization public Storage Driver, facade/plugin API, Core, journal, recovery або Phase 2 behavior.
- Зміна target architecture, де Extensia Module лишається майбутньою application-facing lifecycle boundary.

## Критерії приймання

- [x] Owner decision зафіксовано без неоднозначності: BP1-04 internal-only, root API не розширюється.
- [x] TASK-0010 більше не залежить від public lifecycle contract gate й не містить packed public construction/start/stop acceptance.
- [x] Internal lifecycle policy достатньо точна для implementation без неявних design decisions.
- [x] Packed smoke contract обмежений import/no-side-effects/no-accidental-exports/internal-subpath-failure.
- [x] RUN-001 має prepared requirements/context/result та не містить implementation claims.
- [x] BP1-04 лишається `backlog`; execution не запущено.
- [x] Roadmap/state/progress/indexes узгоджені з рішенням і prepared run.
- [x] Fixation пройшла незалежний audit без незакритих blocker/high/medium findings; language, architecture pressure й upward consistency gates пройдені.

## Пов'язана пам'ять

- `memory/state.md`
- `memory/product/roadmap.md`
- `memory/tasks/plan/progress.md`
- `memory/tasks/plan/TASK-07.26-0010-bp1-04-lifecycle-controller-slice/task.md`
- `memory/reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md`
- `memory/technical/architecture.md`
- `memory/technical/rules.md`
- `memory/technical/open-questions.md`
- `memory/technical/decisions/ADR-0003-internal-ioc-composition.md`
- `memory/technical/decisions/ADR-0006-phase-1-tooling-and-ioc-baseline.md`
- `memory/knowledge/packages/pdadm-mvp-reglament/package.md`

## Прогони

Немає. Режим задачі — `interactive-memory-update`.

## Дослідження

Немає.

## Фіксації

- [FIX-001](fixations/FIX-001.md) - applied - Internal-only BP1-04 boundary та prepared RUN-001 застосовані після незалежного аудиту.

## Додатковий контекст

Пряме доручення користувача від 2026-07-10 підтверджує exact packed/internal boundary і дозволяє запуск субагентів для review. Це не є task-level review approval TASK-0013 і не є дозволом виконувати RUN-001.

Перший незалежний pre-application audit повернув `CHANGES_REQUIRED`: один high finding щодо cleanup/ledger contract, два medium щодо roadmap traceability і prepared-run schema, один material low щодо bounded package-smoke evidence. Re-audit підтвердив remediation та дозволив застосування. Post-application audit додатково виявив validation-disposal hole, stale state, неоднозначний activation prerequisite і stale task note; повторний post-audit підтвердив закриття всіх findings і надав `PASS`.
