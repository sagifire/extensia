# TASK-07.26-0003: Детальний план реалізації Extensia 0.1.0

Status: done
Type: planning
Execution Mode: autonomous-research
Created: 2026-07-09
Owner Role: Product Lead Hat
Current Run: n/a
Current Research: RSCH-001
Current Fixation: FIX-001

## Мета

Підготувати детальний, залежнісно узгоджений і чесний щодо невизначеності план реалізації Extensia `0.1.0`, який організовує роботу у повторювані цикли `дослідження / проектування / планування -> реалізація вертикальних зрізів -> стабілізація`, показує складність кожного етапу та визначає мінімально рекомендований рівень інтелекту агента для його виконання.

План має перетворити чинний фазовий roadmap на керовану програму робіт без передчасної деталізації нестабільних рішень і без створення хибної календарної точності.

## Продуктовий контекст

Extensia є in-process бібліотекою для керованої роботи з медіаресурсами всередині host application. Для релізу `0.1.0` уже прийняті продуктові вимоги й визначена фазова послідовність, але виконуваного runtime, public API, Storage Driver, plugins і tests ще немає. Source specifications мають статус draft, а найбільш ризикові cross-cutting guarantees стосуються IoC composition, durable operation pipeline, journal publication boundary, locking, crash recovery, read model consistency та compatibility public API.

Чинний roadmap корисний як dependency-oriented sequence, але ще не описує однаковий цикл ітерацій, детальні вертикальні зрізи, стабілізацію після кожної хвилі, карту залежностей, модель оцінювання складності й потрібний рівень інтелекту агента. Деталізація має виконуватися як rolling-wave planning: найближчі роботи плануються до task-ready рівня, віддалені — до рівня work packages, decision gates, ризиків і критеріїв подальшої деталізації.

## Вхідні рішення користувача

- Для implementation використовувати `@sagifire/ioc` версії `0.0.2`; під час planning research треба звірити її фактичний API з draft-специфікаціями.
- Оптимальний набір TypeScript compiler settings, build tool, test runner, package exports і source/package layout для ESM-бібліотеки на Node.js 24 агент визначає самостійно з явним обґрунтуванням вибору.
- Алгоритм і контракт `IDString`, числове представлення `Timestamp` та readonly DTO contracts агент визначає самостійно. `Timestamp` повинен мати числовий, а не рядковий public і serialized contract; одиницю вимірювання, діапазон, точність і правила перетворення треба визначити явно.
- Для кожного етапу, work package і запропонованої задачі треба визначати мінімально рекомендований рівень інтелекту агента за шкалою `низький / середній / сильний / екстремальний`.

## Обсяг

### 1. Planning readiness і baseline

- Перевірити узгодженість `memory/state.md`, product roadmap, accepted requirements, domain/technical open questions, ADR і трьох canonical source specifications.
- Зафіксувати planning assumptions, обмеження, залежності та рівень достовірності джерел.
- Виявити суперечності або застарілі статуси, включно з розбіжністю між завершеною Phase 0 у `state.md` і статусом `in review` у roadmap, та винести їх у findings або fixation proposal.
- Класифікувати невизначеності як `blocking now`, `planned design gate` або `deferred/experimental`.

### 2. Обов'язкові підготовчі технічні рішення

- Звірити фактичні contracts `@sagifire/ioc@0.0.2` з потребами Extensia composition root, typed tokens, lifecycle і graph validation.
- Порівняти актуальні варіанти TypeScript/build/test/package tooling для Node.js 24 ESM library та вибрати один узгоджений baseline.
- Визначити source layout, test layout, package exports, build artifacts, type declarations і межі internal/public/testkit surface.
- Визначити базові contracts `IDString`, числового `Timestamp` і readonly DTO snapshots, включно із serialization та compatibility implications.
- Не заморожувати інші conceptual signatures як stabilized public API без окремого design gate.

### 3. Модель ітеративної роботи

- Визначити стандартну структуру planning wave: research/design/planning, vertical slice implementation, stabilization і human review gate.
- Визначити entry criteria, exit criteria, required artifacts і перевірки для кожної частини хвилі.
- Визначити, що саме вважається vertical slice для in-process library: observable сценарій через public facade boundary, потрібні internal foundations, tests, diagnostics і explicit failure behavior.
- Визначити правила just-in-time реалізації horizontal foundations, щоб не будувати великі неперевірені шари наперед і водночас не обходити Journal/Index/Registry/Recovery guarantees.
- Вбудувати stabilization після кожної суттєвої хвилі, а не лише у фінальну release phase.

### 4. Декомпозиція release `0.1.0`

- Побудувати dependency map і критичний шлях від Phase 1 до release stabilization.
- Для всього `0.1.0` визначити послідовність planning waves, work packages, vertical slices, stabilization stages і decision gates.
- Phase 1 і Phase 2 деталізувати до task-ready backlog proposals зі scope, out of scope, dependencies, acceptance criteria, verification і очікуваними memory updates.
- Phase 3 деталізувати щонайменше до вертикальних зрізів, foundation packages, failure/recovery gates і умов переходу до concrete durable storage.
- Phase 4-7 деталізувати до work packages, залежностей, дослідницьких/design gates, release qualities, ризиків і критеріїв наступної rolling-wave деталізації.
- Явно показати, які роботи можуть виконуватися паралельно, а які мають жорстку послідовність.
- Не перетворювати віддалені draft-рішення на безумовні implementation commitments.

### 5. Оцінка складності, ризику й рівня інтелекту агента

- Відокремити складність роботи, обсяг зусиль, ризик, невизначеність і впевненість оцінки.
- Визначити й застосувати єдину rubric оцінювання складності щонайменше за вимірами: domain novelty, architectural coupling, concurrency/durability, failure/recovery surface, public compatibility impact і testing matrix.
- Для кожного етапу, work package, vertical slice і task proposal вказати агрегований клас складності, ключові драйвери складності, ризик, невизначеність і confidence.
- Для кожної одиниці плану вказати мінімально рекомендований рівень інтелекту агента та обґрунтувати його.
- Використовувати таку вихідну семантику рівнів, уточнивши її в planning report:
  - `низький` — локальна або механічна робота зі стабільним контрактом, малим blast radius і чіткою перевіркою;
  - `середній` — стандартна багатофайлова реалізація або дослідження з обмеженою невизначеністю й відомими патернами;
  - `сильний` — cross-cutting domain/architecture робота з кількома варіантами, суттєвими компромісами або високою ціною помилки;
  - `екстремальний` — нові або критичні correctness guarantees у durability, concurrency, recovery, consistency чи public compatibility, де помилка може зламати системну модель і потрібен найсильніший reasoning та незалежний review.
- Окремо вказати рекомендований рівень агента-аудитора, якщо він має бути вищим за рівень виконавця.

### 6. План перевірок і стабілізації

- Для кожної хвилі визначити unit, contract, integration, failure-injection, lifecycle, recovery та package-level перевірки, які релевантні її ризикам.
- Визначити architecture pressure checks, memory sync gates і human decisions між хвилями.
- Визначити release-level audits і критерії готовності `0.1.0`, не підміняючи ними стабілізацію всередині попередніх фаз.

### 7. Результати та фіксація

- Підготувати task-local `research/RSCH-001.md` і деталізований planning report у `memory/reports/research/**`.
- Підготувати backlog proposal для follow-up research, design, implementation, stabilization і audit tasks; не створювати масово ці задачі до human review плану.
- Підготувати `fixations/FIX-001.md` або кілька ізольованих fixation proposals для погоджених змін roadmap, technical/domain memory, open questions і документів загального рівня.
- Не застосовувати fixation proposals до explicit human approval.
- Виконати upward consistency check, language gate, architecture pressure check і незалежний audit planning result перед переведенням задачі в `review`.

## Поза обсягом

- Реалізація production code, tests, build pipeline, package exports або runtime modules.
- Встановлення залежностей чи зміна `package.json` у межах planning task; дозволене лише read-only дослідження package metadata, документації та API.
- Остаточне проектування concrete Storage Driver, atomic commit protocol, journal persistence і recovery matrix замість створення окремих design/research gates для них.
- Повна стабілізація public facade methods, error catalog, hooks і compatibility policy до відповідних design stages.
- Календарні обіцянки, оцінка вартості або строків без явно заданої пропускної здатності агента/команди й емпіричних даних.
- Автоматичне створення всіх implementation tasks до human review planning report і backlog proposal.
- Застосування запропонованих змін до canonical Product, Domain або Technical Memory без погодженого `FIX-*`.
- Зміна правил PDADM MVP, knowledge package регламенту або перебудова структури Project Memory поза обов'язковими task/report/fixation artifacts цієї задачі.

## Критерії приймання

- [x] Створено `research/RSCH-001.md` і деталізований planning report у `memory/reports/research/**`, а прямі індекси оновлено.
- [x] У planning report явно зафіксовані всі вхідні рішення користувача без зміни їхнього сенсу.
- [x] Baseline review охоплює accepted requirements, roadmap, state, open questions, ADR і canonical source specifications; суперечності й застарілі статуси не приховані.
- [x] Невизначеності класифіковані як `blocking now`, `planned design gate` або `deferred/experimental`, для кожної визначений owner stage.
- [x] Обрано й обґрунтовано один TypeScript/build/test/package baseline для Node.js 24 ESM library та показано його вплив на Phase 1.
- [x] Визначено й обґрунтовано contracts `IDString`, числового `Timestamp` і readonly DTO snapshots; для `Timestamp` явно визначені unit, range/precision, serialization і conversion rules.
- [x] План охоплює весь шлях від Phase 1 до release `0.1.0` і використовує повторюваний цикл research/design/planning, vertical slice implementation, stabilization і human gate.
- [x] Phase 1-2 деталізовані до task-ready backlog proposals, Phase 3 — до vertical slices і foundation/design gates, Phase 4-7 — до work packages, залежностей і критеріїв подальшої деталізації.
- [x] Для кожної одиниці плану вказані dependencies, expected outcome, scope boundary, verification, stabilization work і gate переходу.
- [x] Побудовано dependency map, визначено критичний шлях, дозволений parallelism і заборонені передчасні залежності.
- [x] Для кожного етапу, work package, vertical slice і task proposal оцінені складність, ризик, невизначеність і confidence за єдиною rubric.
- [x] Для кожної одиниці плану вказано й обґрунтовано рівень інтелекту агента `низький / середній / сильний / екстремальний`; де потрібно, окремо вказано рівень аудитора.
- [x] Stabilization є частиною кожної суттєвої planning wave та містить ризик-орієнтовані tests, architecture pressure check і memory sync gate.
- [x] Підготовлено follow-up backlog proposal без масового створення задач до human approval.
- [x] Для змін canonical memory підготовлено fixation proposal з перевіреним впливом на документи загального рівня; proposal не застосовано без approval.
- [x] Independent audit не має незакритих blocker/high/medium findings, а language gate та architecture pressure check пройдені перед `review`.
- [x] Задача не містить implementation-змін і не видає draft-рішення за stabilized public contracts.

## Очікувані артефакти результату

- `memory/tasks/plan/TASK-07.26-0003-plan-extensia-v0-1-0-delivery/research/RSCH-001.md`.
- `memory/reports/research/YYYY-MM-DD-extensia-v0-1-0-delivery-plan.md`.
- `memory/tasks/plan/TASK-07.26-0003-plan-extensia-v0-1-0-delivery/fixations/FIX-001.md` або кілька ізольованих fixation proposals, якщо findings зачіпають різні approval boundaries.
- Task-ready backlog proposal для найближчих фаз і rolling-wave roadmap для всього `0.1.0`.
- Dependency map, complexity/risk rubric та agent-intelligence matrix як частини деталізованого planning report.

## Пов'язана пам'ять

- `memory/state.md`
- `memory/product/vision.md`
- `memory/product/requirements.md`
- `memory/product/roadmap.md`
- `memory/domain/glossary.md`
- `memory/domain/target/model.md`
- `memory/domain/rules.md`
- `memory/domain/open-questions.md`
- `memory/technical/architecture.md`
- `memory/technical/stack.md`
- `memory/technical/rules.md`
- `memory/technical/source-specifications.md`
- `memory/technical/open-questions.md`
- `memory/technical/decisions/ADR-0002-source-baseline-and-release-semantics.md`
- `memory/technical/decisions/ADR-0003-internal-ioc-composition.md`
- `memory/technical/decisions/ADR-0004-facade-first-extension-boundary.md`
- `memory/technical/decisions/ADR-0005-core-operation-consistency.md`
- `memory/references/extensia-v2/domain-model-v2.md`
- `memory/references/extensia-v2/extension-and-api-model-v2-ioc.md`
- `memory/references/extensia-v2/runtime-architecture-v2-ioc.md`
- `memory/knowledge/package-index.md`
- `memory/knowledge/packages/pdadm-mvp-reglament/package.md`
- `memory/tasks/plan/progress.md`

## Прогони

Немає. Для `Execution Mode: autonomous-research` implementation runs не створюються.

## Дослідження

- [RSCH-001](research/RSCH-001.md) - accepted - План реалізації Extensia `0.1.0`; whole-task review пройдено, незалежні architecture/memory аудити не мають відкритих blocker/high/medium findings.

## Фіксації

- [FIX-001](fixations/FIX-001.md) - applied - Planning baseline, стан проекту й компактний roadmap.
- [FIX-002](fixations/FIX-002.md) - applied - Інструменти, package layout і точний IoC integration baseline.
- [FIX-003](fixations/FIX-003.md) - applied - `IDString`, числовий `Timestamp` і readonly JSON-safe DTO contracts.
- [FIX-004](fixations/FIX-004.md) - applied - Authority status ADR-0004/ADR-0005 без стабілізації conceptual signatures.

## Аудит

- [Незалежний planning audit](../../../reports/audits/2026-07-09-task-07.26-0003-planning-audit.md) - `PASS`; відкритих blocker/high/medium findings немає.
- [Post-application fixation audit](../../../reports/audits/2026-07-10-task-07.26-0003-fixation-application-audit.md) - `PASS`; applied FIX-001..004 не мають відкритих blocker/high/medium/low findings.

## Завершення

- [Closure](closure.md) - Whole-task human approval, прийнятий planning result, залишкові ризики й фінальна memory sync.

## Додатковий контекст

- Задачу явно активовано дорученням користувача від 2026-07-09; поточний workflow зафіксований у status і `Current Research` вище.
- Під час виконання агент працює як `Agent Executor`, відновлює workflow з `Execution Mode: autonomous-research` і не підміняє planning implementation-змінами.
- Перед переходом у review-ready було проведено незалежні architecture/memory аудити згідно з правилами Project Memory; їхні findings закриті до whole-task approval.
- Якщо planning research покаже, що окремий design gate блокує достовірну деталізацію, агент створює або пропонує окрему research/design task замість неявного припущення.
