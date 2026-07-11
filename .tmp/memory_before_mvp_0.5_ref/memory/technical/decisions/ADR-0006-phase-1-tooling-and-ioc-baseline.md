# ADR-0006: Phase 1 tooling та IoC baseline

Status: accepted
Date: 2026-07-10
Version Snapshot: 2026-07-09

## Контекст

Phase 1 потребує відтворюваного Node.js 24 ESM package baseline та точного розуміння `@sagifire/ioc@0.0.2`. Conceptual source sketches не доводять фактичні package capabilities, а без exact toolchain pins dependency graph і package output не є відтворюваними.

На дату research TypeScript `7.0.2` не проходив ecosystem gate через declared peer range `typescript-eslint@8.63.0` `<6.1.0`. Extensia також не потребує bundler або dual CJS output для заявленого Node.js 24 target.

## Рішення

- Використовувати `@sagifire/ioc@0.0.2` як exact internal runtime dependency, а не peer dependency чи public application API.
- Використовувати перевірені capabilities package: typed tokens, modules, requires/provides, cardinality, adapters, graph validation, scopes, inspection і disposal.
- Реєструвати facade/hook/lifecycle catalogs як synchronous descriptor contributions. Package не надає async multi collection; async construction/init виконує Extensia Runtime Controller після collection.
- Тримати IoC graph та Extensia extension graph окремими. Runtime Controller володіє startup/stop ordering, rollback і operation intake; `runtime.dispose()` викликається як фінальний cleanup.
- Test harness кожного разу будує fresh composer; mutable override після `compose()` не використовується.
- Використовувати TypeScript `6.0.3`, `@types/node@24.12.0`, unbundled ESM `tsc`, NodeNext/ES2024 і strict compiler contract із declarations/maps.
- Використовувати Vitest `4.1.10` + Vite `8.1.4` + V8 coverage для unit/contract/integration/failure tests; packed built JS перевіряти напряму в Node.js 24.
- Використовувати ESLint flat config, `typescript-eslint@8.63.0`, Prettier `3.9.5`, `publint@0.3.21` та `@arethetypeswrong/cli@0.18.4`.
- Використовувати npm з exact direct pins і committed `package-lock.json`; BP1-01 змінює `.gitignore` та package/config files, ця memory fixation їх не змінює.
- На Phase 1 експортувати тільки root і `./package.json` через explicit exports. `./testkit`, `./driver`, `./plugin` та інші public subpaths потребують окремих contract gates; wildcard internal exports заборонені.

## Наслідки

- Toolchain і package gates є task-ready для BP1-01, а IoC composition baseline — для BP1-03.
- Extensia не проектує неіснуючий `getAllAsync()` і не делегує package власний lifecycle/extension ordering.
- TypeScript 7, bundling, CJS і API Extractor не входять у Phase 1 hard baseline. API Extractor потребує compatibility spike не пізніше P7-WP1.
- Version snapshot є date-bound. Upgrade будь-якого direct pin виконується окремою dependency task із повторною peer/package перевіркою.

## Відхилені альтернативи

- TypeScript latest-major незалежно від ecosystem peer ranges — відхилено.
- Rollup/tsup або dual ESM/CJS package — відхилено як зайва складність для Node.js 24 target.
- Node `node:test` як єдиний runner — відкладено; packed smoke може використовувати Node напряму.
- Public raw IoC tokens або service locator — відхилено ADR-0003/ADR-0004.
