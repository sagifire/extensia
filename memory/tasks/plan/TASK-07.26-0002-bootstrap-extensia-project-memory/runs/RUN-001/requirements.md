# Вимоги прогону: RUN-001

Status: completed
Agent Role: Agent Executor
Execution Mode: autonomous-implementation
Created: 2026-07-09

## Мета цього run

Перетворити три актуальні специфікації Extensia на узгоджену Product, Domain і Technical Memory, придатну як стартова точка для подальшого планування та реалізації релізу `0.1.0`.

## Уточнені вимоги

- Канонічна мова авторського тексту пам'яті — українська.
- Актуальними source documents є тільки `domain-model-v2.md`, `extension-and-api-model-v2-ioc.md` і `runtime-architecture-v2-ioc.md` у кореневій папці `v2/`.
- `extension-and-api-model.md` і `runtime-architecture.md` є неактуальними non-IoC версіями та не використовуються під час аналізу чи фіксації.
- Архітектурна основа майбутньої реалізації — `@sagifire/ioc`.
- Цільова release version — `0.1.0`; `v2` використовується тільки як внутрішня назва етапу повного редизайну.
- Source specifications залишаються незмінними; Project Memory стисло структурує їхній зміст і не створює паралельної суперечливої специфікації.
- Фактичний поточний стан проекту й бажаний target state мають бути чітко розділені.
- Невизначені або відкладені рішення не перетворюються на вигадані гарантії; вони фіксуються як open questions, assumptions або roadmap gates.

## Обсяг

- `memory/product/`.
- `memory/domain/` з окремими `current/` і `target/`.
- `memory/technical/` та релевантні ADR.
- Навігаційні `index.md` для змінених рівнів.
- `memory/state.md`.
- Task і run artifacts поточної задачі.

## Поза обсягом

- Вихідний код, tests, build tooling і package dependencies.
- Редагування або архівування `v2/` source documents.
- Зміна PDADM rules, templates або knowledge packages.
- Детальний implementation backlog та оцінка строків.

## Критерії приймання

- [x] Product, Domain і Technical Memory наповнені проектно-специфічним змістом з актуальних джерел.
- [x] Поточний і цільовий стани не змішані.
- [x] У пам'яті немає нормативних тверджень, запозичених із двох неактуальних non-IoC документів.
- [x] Ключові доменні й технічні інваріанти збережені без архітектурних спрощень.
- [x] Індекси й документи загального рівня узгоджені.
- [x] Незалежний субагент-аудитор перевірив результат, а findings закриті або явно класифіковані.
