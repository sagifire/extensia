# Migration Guide: PDADM MVP 0.3 -> PDADM MVP 0.4

Source PDADM MVP Version: 0.3
Target PDADM MVP Version: 0.4
Target Starter Kit Version: 4.0
Audience: Agent Executor / Agent Assistant
Task Type: memory-migration
Execution Mode: autonomous-implementation

## Призначення

Ця інструкція описує, як агент має мігрувати вже розгорнуту Project Memory з PDADM MVP 0.3 / Starter Kit 3.0 до PDADM MVP 0.4 / Starter Kit 4.0.

Мета міграції - оновити правила, шаблони, індекси, reports structure, knowledge package регламенту і startup guidance без втрати project-specific змісту.

## Ключове обмеження

Під час цієї міграції агент не повинен редагувати документи в папках виконаних задач.

Не переписувати task folders зі статусом `done`, архівні task folders, завершені `runs/RUN-*`, `research/RSCH-*`, `fixations/FIX-*`, `result.md` або `closure.md` тільки заради нового формату індексів, self-review або мовних правил MVP 0.4.

Причини:

- у виконаних задачах немає суттєвих runtime-змін, потрібних для роботи MVP 0.4;
- переписування історичних артефактів погіршує audit trail;
- мовні виправлення у вже виконаних задачах менш важливі, ніж збереження історії без ретроактивного редагування.

Виняток можливий тільки якщо користувач явно попросив виправити конкретний завершений task artifact або якщо файл містить критичну помилку, яка прямо заважає міграції. У такому разі агент має окремо зафіксувати причину.

## Передумови

1. Агент має працювати в межах окремої migration task.
2. У task folder має бути поточний run з `requirements.md`, `context.md` і `result.md`.
3. Перед змінами агент читає:
   - `memory/agent-start.md`;
   - `memory/memory-rules.md`;
   - `memory/agents/rules.md`;
   - `memory/tasks/plan/progress.md`;
   - `memory/knowledge/package-index.md`;
   - `memory/knowledge/packages/pdadm-mvp-reglament/package.md`;
   - цей migration guide.
4. Агент не розпаковує новий Starter Kit поверх існуючої Project Memory.
5. Агент зберігає project-specific зміст у `product/`, `domain/`, `technical/`, `knowledge/`, `reports/` і `tasks/`.

## Scope міграції

Оновити або створити:

- top-level version markers: `README.md`, `state.md`, `memory-rules.md`, `agent-start.md`;
- `agents/rules.md`, `agents/workflows.md`, `agents/prompts.md`;
- `tasks/README.md`, `tasks/plan/progress.md`, task templates;
- `reports/index.md`, `reports/periodic/index.md`, `reports/research/index.md`, `reports/audits/index.md`;
- `templates/` для task, result, research, fixation, audit report, human start і agent start;
- `knowledge/package-index.md`;
- `knowledge/packages/pdadm-mvp-reglament/` до version `4.0`;
- усі relevant `index.md` у Starter Kit;
- `technical/architecture.md`, `technical/rules.md` або інші technical docs, якщо треба додати architecture health guidance;
- `domain/glossary.md`, якщо треба додати нові терміни MVP 0.4.

Не входить у scope:

- переписування завершених task artifacts;
- зміна product/domain/technical змісту, який описує реальний downstream-проект, без окремого рішення;
- застосування нових архітектурних рішень до коду проекту;
- автоматичний refactor коду;
- масове переформатування історичних документів без практичної потреби.

## Крок 1. Зафіксувати початковий стан

У `result.md` migration run зафіксувати:

- source version: PDADM MVP 0.3 / Starter Kit 3.0;
- target version: PDADM MVP 0.4 / Starter Kit 4.0;
- чи існує `memory/agent-start.md`;
- чи існує `memory/knowledge/packages/pdadm-mvp-reglament/`;
- чи існує `reports/`;
- чи є task folders зі статусом `done` або архівні task folders, які треба залишити без змін;
- основні ризики міграції.

## Крок 2. Оновити version markers

Оновити всі актуальні Starter Kit version markers:

- `Starter Kit Version: 4.0`;
- `PDADM MVP Version: 0.4`;
- package version `Version: 4.0` для `knowledge/packages/pdadm-mvp-reglament/`.

Історичні migration guides можуть містити старі версії як source/target reference. Їх не треба переписувати тільки для заміни цифр.

## Крок 3. Оновити мовні правила Project Memory

У `memory-rules.md` і `agents/rules.md` зафіксувати:

- канонічна мова авторського тексту Project Memory - українська;
- винятки дозволені для назв файлів і папок, API, команд, package names, library names, schema keys, protocol fields, enum values, цитат і source/reference documents;
- якщо source/reference document не українською, треба додати український короткий опис або інструкцію використання;
- self-review має містити language gate для документів Project Memory;
- при сумніві агент має перекласти або українізувати авторський текст, уточнити в користувача або зафіксувати blocker/follow-up.

Окремо перевірити Starter Kit на погані приклади: prompt text, explanatory prose і sample notes мають бути українською, крім технічних labels і дозволених винятків.

## Крок 4. Увімкнути task boundary rule

Додати правила:

- агент не змінює код, canonical Project Memory, project docs або project artifacts поза task boundary;
- якщо задача потрібна і scope/risk зрозумілі, агент може автономно створити задачу, але має повідомити користувача про task id, type, execution mode, scope, out of scope і acceptance criteria;
- якщо scope/risk неясні, агент готує draft task або ставить уточнювальне питання;
- дрібний виняток для trivial edits не поширюється на зміни з архітектурним, продуктовим або memory impact.

## Крок 5. Оновити формат індексів

Перевести актуальні `index.md`, `knowledge/package-index.md` і `tasks/plan/progress.md` на однорядковий формат.

Для `index.md`:

```markdown
- [Назва](path.md) - Короткий опис.
```

Для `package-index.md`:

```markdown
- [Package Name](packages/package-name/index.md) - status / version / scope - Коли використовувати.
```

Для `tasks/plan/progress.md`:

```markdown
- [ ] **[STATUS]** [TASK-MM.YY-NNNN-short-name](TASK-MM.YY-NNNN-short-name/index.md) - summary
```

Не переносити `Type`, `Execution Mode` і `Current` у `progress.md`; вони живуть у `task.md`.

Не переписувати виконані task folders заради нового формату. Якщо old task entry у `progress.md` посилається на виконану задачу, достатньо привести сам рядок progress до нового формату або залишити його в архівному контексті, якщо задача більше не є неархівною.

## Крок 6. Додати нові task types і autonomous research artifacts

Оновити task template і rules:

- додати task types `planning` і `design`;
- дозволити `Execution Mode: autonomous-research` для `research`, `planning` і `design`;
- зафіксувати, що `autonomous-research` не є implementation mode;
- для кожної такої задачі створювати або оновлювати `research/RSCH-*.md`;
- для кожної такої задачі створювати деталізований long-lived report у `reports/research/**`;
- у task-local research artifact додати поле `Detailed Report: reports/research/YYYY-MM-DD-short-name.md`.

## Крок 7. Розширити reports structure

Оновити структуру:

```text
reports/
  index.md
  periodic/
    index.md
  research/
    index.md
  audits/
    index.md
```

Призначення:

- `reports/periodic/` - weekly або інші періодичні огляди;
- `reports/research/` - деталізовані звіти autonomous research, planning і design tasks;
- `reports/audits/` - audit reports, включно з architecture health audits і незалежними review-аудитами, якщо вони мають довгоживучу цінність.

Task-local artifacts залишаються у task folder. `reports/**` не замінює `result.md`, `research/RSCH-*.md` або `fixations/FIX-*.md`.

## Крок 8. Посилити self-review і незалежний audit

Оновити `result.md`, `research/RSCH-*.md` і `fixations/FIX-*.md` templates.

Додати поля:

```text
Review Method: independent-subagent | same-agent
Auditor: agent id / role / n/a
Review Limitation: none | subagent-unavailable | інше
```

Self-review має відповідати на питання:

- наскільки якісно виконані acceptance criteria або research/design/planning goal;
- чи були зрізання кутів, незаплановані спрощення або out-of-scope зміни;
- які ризики виникли, які закриті, які залишились відкритими;
- яка незапланована робота виникла, що виконано, що залишилось;
- чи потрібні додаткові задачі, яких немає в поточному плані;
- на що ще варто звернути увагу людині або агенту-аудитору.

Якщо агент може запускати субагентів, self-review має виконувати незалежний субагент-аудитор в окремій сесії. Якщо субагенти недоступні, агент виконує same-agent review і явно фіксує limitation.

Не переводити результат у `review-ready`, якщо audit findings не закриті, не зафіксовані як accepted risk або не винесені у follow-up/blocker.

## Крок 9. Додати User Guidance Layer

Оновити startup, rules, workflows і prompts так, щоб агент:

- пояснював користувачу поточний workflow state;
- коротко пояснював, чому пропонується саме цей регламентний крок;
- показував доступні наступні ходи;
- попереджав, коли дія потребує task boundary, human review або окремого approval;
- за замовчуванням працював як `Agent Assistant` у режимі `Methodology Navigator`, якщо роль і задача не задані;
- зменшував пояснення, якщо користувач явно досвідчений або просить стислий режим.

Для людини має бути human-facing entrypoint: `README.md` і, за потреби, `human-start.md`.

## Крок 10. Додати Project Bootstrap Guidance

Оновити rules/workflows/prompts так, щоб агент міг вести greenfield project від короткого опису цінності або концепції до плану роботи.

Рекомендований порядок:

1. Product framing.
2. Scope framing.
3. Domain framing.
4. Technical framing.
5. MVP slicing.
6. Roadmap або phase planning.
7. Task backlog.

Planning і design work, якщо виконуються автономно, оформлювати як `Type: planning` або `Type: design` з `Execution Mode: autonomous-research` і деталізованим звітом у `reports/research/**`.

## Крок 11. Додати Architecture Health Guidance

Оновити technical rules, architecture template і self-review так, щоб агент перевіряв architecture pressure.

Сигнали architecture pressure:

- нові фічі потребують обхідних шляхів або дублювання;
- зміни регулярно зачіпають надто багато модулів;
- поточні abstractions не відповідають доменній моделі;
- tests стають крихкими через архітектурну зв'язаність;
- ADR, architecture notes або technical rules більше не відповідають фактичному коду;
- користувач уникає refactor через страх щось зламати.

Якщо такі сигнали є, агент має запропонувати безпечний шлях:

1. architecture audit у `reports/audits/YYYY-MM-DD-architecture-health.md`;
2. design/research task для варіантів перебудови;
3. ADR або architecture proposal;
4. refactor task з малим scope;
5. incremental implementation;
6. self-review, independent audit і human review.

## Крок 12. Оновити prompts

Оновити agent prompts так, щоб вони:

- були українською мовою, крім технічних labels і enum values;
- не вимагали читати повний регламент на старті без потреби;
- містили task boundary rule;
- містили Methodology Navigator behavior;
- містили обов'язок створювати `reports/research/**` для `autonomous-research`;
- містили self-review через незалежного субагента, якщо інфраструктура доступна.

## Крок 13. Перевірити Project Memory після міграції

Перед завершенням migration run агент перевіряє:

- version markers показують Starter Kit 4.0 / PDADM MVP 0.4;
- `knowledge/packages/pdadm-mvp-reglament/package.md` має `Version: 4.0`;
- `knowledge/package-index.md` вказує на package version 4.0;
- `mvp_one_to_one_0.4.md` доступний у package index;
- `migrations/from-0.3-to-0.4.md` доступний у migrations index;
- `reports/research/index.md` і `reports/audits/index.md` існують;
- `index.md`, `package-index.md` і `tasks/plan/progress.md` використовують однорядковий формат;
- task template містить `planning` і `design`;
- `autonomous-research` вимагає `reports/research/**`;
- self-review templates мають поля незалежного audit і деталізовані питання;
- prompts не містять англомовних інструкцій там, де має бути український авторський текст;
- виконані task folders не редагувались без окремої причини;
- зміни не пошкодили project-specific product/domain/technical зміст.

## Очікуваний результат

Після міграції Project Memory має бути в стані:

- `Starter Kit Version: 4.0`;
- `PDADM MVP Version: 0.4`;
- актуальний `pdadm-mvp-reglament` package version `4.0`;
- нові reports folders для research і audits;
- one-line indexes і progress;
- посилені мовні правила;
- task boundary rule;
- Methodology Navigator behavior;
- Project Bootstrap Guidance;
- Architecture Health Guidance;
- self-review із незалежним audit, якщо доступні субагенти.

## Memory sync після міграції

У `result.md` migration run зафіксувати:

- Product memory: updated / not needed;
- Domain memory: updated / not needed;
- Technical memory: updated / not needed;
- Knowledge memory: updated;
- Task memory: updated;
- Wiki indexes: updated;
- Reports structure: updated;
- State file: updated;
- General-level memory documents: updated / not needed / proposed / blocked;
- Follow-up tasks: created / proposed / not needed.
