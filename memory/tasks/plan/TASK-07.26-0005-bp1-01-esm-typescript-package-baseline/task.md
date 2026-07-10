# TASK-07.26-0005: BP1-01 — Налаштувати ESM TypeScript package baseline

Status: done
Type: chore
Execution Mode: autonomous-implementation
Created: 2026-07-10
Owner Role: Product Lead Hat
Current Run: RUN-001
Current Research: n/a
Current Fixation: n/a

## Мета

Реалізувати відтворюваний Node.js 24 ESM TypeScript package gate для `@sagifire/extensia`, який фіксує прийнятий Phase 1 tooling baseline, збирає тільки publishable artifacts і перевіряє фактичний packed tarball у чистому consumer.

## Продуктовий контекст

Extensia починає release `0.1.0` без executable runtime, source layout, build/test infrastructure або встановлених dependencies. `TASK-07.26-0003` і ADR-0006 прийняли exact tooling/package baseline. `BP1-01` є першим послідовним `P1-WP1` gate: до його зеленого результату `BP1-02` і `BP1-03` не активуються, окрім дозволеної read-only preparation.

## Обсяг

- Зберегти package identity `@sagifire/extensia@0.1.0`, ESM `type: module` і Node.js `>=24`.
- Встановити лише прийняті exact direct pins: runtime `@sagifire/ioc@0.0.2`; compiler/types `typescript@6.0.3`, `@types/node@24.12.0`; tests `vitest@4.1.10`, `vite@8.1.4`, `@vitest/coverage-v8@4.1.10`; lint/format `eslint@10.6.0`, `@eslint/js@10.0.1`, `typescript-eslint@8.63.0`, `prettier@3.9.5`; package checks `publint@0.3.21`, `@arethetypeswrong/cli@0.18.4`.
- Створити committed `package-lock.json` і прибрати його з `.gitignore`; dependency install/reproduction перевірити через `npm ci`.
- Налаштувати TypeScript build/typecheck для NodeNext/ES2024: publishable `src/**` збирається у `dist/` окремо від no-emit typecheck tests; build emit включає лише ESM `.js`, `.d.ts` та source/declaration maps.
- Налаштувати ESLint flat config, Prettier, Vitest із V8 coverage, minimal `src/index.ts`, scripts і test layout, достатні для чистого tooling smoke без runtime feature code.
- Визначити manifest `files`, `sideEffects`, `main`, `types` і explicit exports лише для root та `./package.json`; перевірити відсутність CJS і заборону internal/wildcard/testkit/driver/plugin subpath exports.
- Реалізувати package gate: чисті typecheck/build/lint/format/test, `npm pack --dry-run`, `publint`, `attw`, імпорт під час виконання та type consumer smoke для встановленого tarball на Node.js 24.

## Поза обсягом

- Domain contracts, runtime controller, Composition Root, IoC conformance implementation, facades, plugins, storage, journal, recovery або product behavior.
- Bundling, Rollup/tsup, dual ESM/CJS output, CommonJS compatibility та browser targets.
- Public subpaths `./testkit`, `./driver`, `./plugin`, wildcard exports або raw IoC/runtime exports.
- API Extractor як hard dependency, TypeScript 7 upgrade або зміна будь-якого прийнятого exact pin без окремої dependency task.
- Зміна прийнятого roadmap, ADR-0006, domain/API contracts чи створення BP1-02/BP1-03 tasks.

## Залежності

- `TASK-07.26-0003` завершена як `done`; її accepted planning result визначає `BP1-01` як послідовний `P1-WP1` gate.
- `FIX-002` TASK-07.26-0003 застосована, а ADR-0006 має status `accepted`; вони є джерелом exact dependency/tooling/package baseline.
- Перед активацією `RUN-001` виконавець підтверджує чистий стан поточних user changes і не перезаписує сторонні незакомічені зміни.

## Критерії приймання

- [x] Manifest зберігає Node.js 24 ESM package identity, використовує точні прийняті direct pins і має committed `package-lock.json`, який більше не ігнорується.
- [x] TypeScript build застосовує прийнятий NodeNext/ES2024 strict compiler contract; `dist/` містить тільки publishable ESM `.js`, `.d.ts` і maps, без tests, CJS або непередбачених source files.
- [x] Root `src/index.ts`, scripts, ESLint, Prettier і Vitest/V8 coverage формують відтворюваний чистий tooling baseline без runtime feature behavior.
- [x] `exports` відкриває тільки root і `./package.json`; internal path, `./testkit`, `./driver` і `./plugin` не імпортуються з packed package.
- [x] Чистий suite проходить: install через `npm ci`, typecheck, build, lint, format check, minimal test/coverage smoke, `npm pack --dry-run`, `publint` і `attw`.
- [x] Встановлений tarball успішно виконує імпорт root під час виконання і TypeScript consumer typecheck на Node.js 24; import неекспортованого internal subpath завершується очікуваною failure.
- [x] `RUN-001` містить evidence команд, package contents, consumer checks, self-review, independent audit findings і memory sync; BP1-02/BP1-03 не активуються до green tooling gate.

## Пов'язана пам'ять

- `memory/state.md`
- `memory/product/roadmap.md`
- `memory/technical/stack.md`
- `memory/technical/rules.md`
- `memory/technical/decisions/ADR-0003-internal-ioc-composition.md`
- `memory/technical/decisions/ADR-0006-phase-1-tooling-and-ioc-baseline.md`
- `memory/reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md`
- `memory/tasks/plan/progress.md`
- `memory/knowledge/package-index.md`

## Прогони

- [RUN-001](runs/RUN-001/index.md) - Виконаний implementation run; результат готовий до task-level human review.

## Дослідження

Немає.

## Фіксації

Немає. Якщо implementation виявить потребу змінити прийняте tooling/package decision, це оформлюється окремою fixation або dependency task.

## Очікувана синхронізація пам'яті

- Технічна пам'ять: current implementation state і `technical/stack.md` оновлюються лише за фактично реалізований tooling/package baseline; package decisions не виходять за accepted scope ADR-0006.
- Пам'ять задач: task/run artifacts, status і acceptance evidence оновлюються в межах `TASK-07.26-0005`.
- Wiki-індекси: оновлюються для створених run/fixation/report artifacts.
- `state.md`: оновлюється лише якщо результат BP1-01 змінює поточний фокус або readiness наступних P1 tasks.
- Продуктова, доменна та knowledge memory: очікувано `not needed`, якщо implementation не виявить конкретного підтвердженого розходження.

## Додатковий контекст

Planning identifier `BP1-01` зберігає traceability до `P1-WP1`, а `TASK-07.26-0005` є стабільним canonical task identifier. Мінімальний рекомендований рівень виконавця й незалежного аудитора: `сильний`; оцінка `1/2/0/1/2/3=9 -> C3`, обсяг M, ризик середній, невизначеність низька, упевненість висока.
