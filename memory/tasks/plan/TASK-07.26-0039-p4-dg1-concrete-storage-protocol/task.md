# P4-DG1 / TASK-07.26-0039: Concrete storage protocol

Task Status: backlog
Type: design/research
Created: 2026-07-12
Owner Role: Agent Architect Hat
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Canonical task package підготовлено; formal design/research не активовано.
Acceptance: 0/9
Blockers: none
Blocked Phase: n/a
Pending Decisions: activation; вибір першого supported concrete driver і protocol recommendation
Next Action: Окреме явне рішення про activation `P4-DG1`; створення backlog-задачі не активує run.

## Мета

Визначити owner-approved concrete storage protocol для першого supported durable Storage Driver: platform boundary, physical layout, outcome-definite atomic/staged persistence, journal, storage lock, recovery, readonly і executable durability proof strategy без витоку physical semantics у Core або public facade API.

## Продуктовий контекст

Phase 3 довела єдиний journal-backed write pipeline на deterministic full fake, але fake не доводить physical durability. Phase 4 може перейти до concrete driver лише після окремого design/review gate, який узгодить реальні filesystem/storage assumptions із прийнятими semantic commit, publication, recovery-before-ready та opaque driver boundaries.

## Обсяг

- Порівняти кандидатів першого supported driver і явно визначити platform/support boundary.
- Визначити physical layout metadata, files, staging, committed journal, lock та format/version markers.
- Визначити path/ID safety, physical encoding canonical journal sequence і правила integrity/corruption diagnostics.
- Визначити atomic/staged protocol і exact outcome-definite mapping: commit resolve означає committed, reject означає not committed.
- Зафіксувати durability assumptions для file/directory sync, rename/replace та process crash/restart.
- Визначити storage lock/lease ownership, acquisition, timeout, stale-owner/crash behavior і cleanup.
- Визначити recovery ownership, startup-to-ready порядок, incomplete/staged artifact cleanup і readonly semantics.
- Побудувати executable proof strategy та cut-point matrix для metadata, files, journal, lock, recovery й portable environmental failures.
- Перевірити узгодженість із P3 deterministic fake і визначити task-ready downstream decomposition без створення implementation tasks.

## Поза обсягом

- Реалізація production concrete driver або зміна production code.
- Asset domain/API semantics і Asset persistence.
- External Change Sync, multi-instance visibility, lazy completeness або cursor policy Phase 5.
- Розширення public facade signatures, plugin/hook API чи Advanced IoC API.
- Створення або activation `P4-WP1`, `P4-VS1`, `P4-VS2`, `P4-VS3` чи `P4-STAB`.

## Залежності та activation gate

- `P3-STAB / TASK-07.26-0036` має бути `done` після explicit Phase 3 human gate; dependency виконана.
- Activation цієї задачі потребує окремого явного рішення; canonical preparation не є activation.
- `P4-DG2` може виконуватися паралельно як незалежний Asset contract gate, але не визначає physical storage semantics.
- `P4-WP1` не можна створювати або активувати до whole-task approval `P4-DG1`, окремого approval required fixation, exact canonical application, publication artifact і зеленого post-application audit.
- Approval design result або fixation сам по собі не активує downstream implementation.

## Критерії приймання

- [ ] Кандидати driver/platform boundary досліджені на перевірених primary sources і executable capability probes; рекомендовано один bounded варіант із явними trade-offs та unsupported assumptions.
- [ ] Physical layout/encoding/versioning, path/ID safety і corruption/integrity semantics визначені без витоку layout у Core або public API.
- [ ] Metadata, files/staging і рівно один committed journal entry мають outcome-definite semantic commit protocol; publication boundary та resolve/reject semantics однозначні.
- [ ] File/directory sync, rename/replace, lock/lease/timeout, crash/restart і recovery-before-ready assumptions сформульовані для підтримуваних platform/filesystem boundaries.
- [ ] Readonly, incomplete artifact visibility/cleanup, stale lock, corruption та portable disk-full/permission failure behavior покриті state/cut-point matrix.
- [ ] Executable proof strategy доводить durability/recovery на concrete storage й traceable compatibility із P3 deterministic fake без другого write або journal path.
- [ ] Formal `RSCH-001`, canonical detailed report і required `FIX-001` з ADR proposal містять exact decisions, alternatives, evidence, risks, limitations та downstream gates.
- [ ] Upward consistency для product/domain/technical/state/knowledge/index areas, source policy, language gate й architecture-pressure review виконані.
- [ ] Self-review і незалежний subagent audit завершені без відкритих P0-P3; задача передана в human review, а `done` лишається human-only рішенням.

## Пов'язана пам'ять

- `memory/product/roadmap.md`
- `memory/product/requirements.md`
- `memory/technical/architecture.md`
- `memory/technical/rules.md`
- `memory/technical/open-questions.md`
- `memory/technical/write-journal-recovery-contract.md`
- `memory/domain/current/implementation-state.md`
- `memory/reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md`
- `memory/tasks/plan/TASK-07.26-0036-p3-stab-final-phase-3/index.md`

## Прогони

- [RUN-001](RUN-001/index.md) - prepared - Formal concrete storage protocol design/research owner gate.

## Дослідження

- `RSCH-001` - planned on activation; detailed report required у `memory/reports/research/`.

## Фіксації

- `FIX-001` - expected, required; exact concrete protocol/ADR і upward consistency proposal, не застосовувати до окремого human approval.

## Додатковий контекст

Planning ID `P4-DG1`. Ризик критичний, невизначеність висока, confidence до gate низька; рекомендовані виконавець і незалежний аудитор рівня `екстремальний`. Перший concrete driver не має визначати public facade signatures або Asset semantics.

## Запити на рішення

- Activation `RUN-001`.
- Після research: whole-task decision `approve | request changes | cancel`.
- Окреме рішення щодо required `FIX-001`; downstream tasks розглядаються лише після application/publication gate.

## Запропоновані follow-up задачі

- Після approved і applied `P4-DG1`: окрема owner/application task для exact fixation, якщо її не може безпечно фіналізувати цей run за правилами review freeze.
- Після published application artifact: canonical preparation `P4-WP1` concrete driver; `P4-VS1` лише після accepted `P4-WP1`.

## Human Review

Status: not-ready
Requested: n/a
Reviewed: n/a
Approval Source: n/a
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: none
Decision Notes: none

## Фінальний результат

Completed: n/a
Final Run: n/a
Summary: n/a
Residual Risks: n/a
