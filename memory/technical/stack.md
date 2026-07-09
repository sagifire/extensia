# Технологічний stack

Updated: 2026-07-10

## Статуси

- `current` — уже зафіксовано в репозиторії.
- `accepted-target` — ціль явно визначена користувачем або source policy.
- `planned` — обґрунтовано target design, але ще не реалізовано.
- `unselected` — рішення потребує окремого design/implementation gate.

## Runtime і package

| Елемент | Статус | Рішення |
|---|---|---|
| Node.js | current | `>=24` у `package.json`. |
| Package | current | `@sagifire/extensia`, version `0.1.0`. |
| Module system | current | ESM через `type: module`. |
| TypeScript | accepted-target | Exact compiler baseline `typescript@6.0.3`; source/config ще не реалізовані. |
| Node types | accepted-target | `@types/node@24.12.0`. |
| `@sagifire/ioc` | accepted-target | Exact internal runtime dependency `@sagifire/ioc@0.0.2`; package ще не встановлений. |

Фактичний API `@sagifire/ioc@0.0.2` перевірено за exact package contents. Він підтримує typed tokens, modules, graph validation, adapters, cardinality, scopes, inspection і disposal. Multi contributions є synchronous values/factories; Extensia самостійно володіє async lifecycle, extension graph, startup rollback і stop ordering. Specification sketches не замінюють package types або conformance tests у BP1-03.

## Зберігання

| Елемент | Статус | Рішення |
|---|---|---|
| Storage Driver contract | planned | Абстракція для metadata, asset files, staging, journal, write lock і recovery. |
| Concrete full driver | unselected | Physical format і driver package ще не визначені. |
| Read-only driver | planned | Capability mode для safe reads без state mutation. |
| Hot Metadata Index | planned | Process-local in-memory read model для greedy/lazy modes. |
| Operation Journal | planned | Append-only persistent journal через Storage Driver. |

Extensia Core не залежить напряму від local filesystem, S3, NFS або packed format. Вибір першого concrete driver є окремим design decision.

## API та extensions

| Елемент | Статус | Рішення |
|---|---|---|
| Extensia Module | planned | Application-facing lifecycle і facade access boundary. |
| Facades | planned | `storage`, `query` та plugin-owned custom facades. |
| Plugins/hooks | planned | Trusted in-process механізм розширень. |
| Advanced IoC extension modules | unselected | Optional/experimental surface; не входить у normal plugin API без окремого рішення. |

## Phase 1 build і tooling baseline

Version snapshot прийнятий станом на 2026-07-09 і змінюється тільки окремою dependency task:

- compiler/types: `typescript@6.0.3`, `@types/node@24.12.0`;
- tests: `vitest@4.1.10`, `vite@8.1.4`, `@vitest/coverage-v8@4.1.10`;
- lint/format: `eslint@10.6.0`, `@eslint/js@10.0.1`, `typescript-eslint@8.63.0`, `prettier@3.9.5`;
- package checks: `publint@0.3.21`, `@arethetypeswrong/cli@0.18.4`.

Build є unbundled ESM через `tsc`; Rollup/tsup і dual CJS output у baseline не входять. Compiler contract:

- `target: ES2024`, `lib: ["ES2024"]`, `module: NodeNext`, `moduleResolution: NodeNext`;
- `rootDir: src`, `outDir: dist`, declarations/declaration maps/source maps, `inlineSources`, `noEmitOnError`;
- strict mode з `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `useUnknownInCatchVariables`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `noPropertyAccessFromIndexSignature`;
- `verbatimModuleSyntax`, `isolatedModules`, `isolatedDeclarations`, `erasableSyntaxOnly`, `moduleDetection: force`, `forceConsistentCasingInFileNames`;
- `skipLibCheck: false`, `types: ["node"]`; relative source imports використовують emitted `.js` extensions.

Publishable `src/**` збирається окремим `tsconfig.build.json`; tests type-check окремим no-emit config і не потрапляють у `dist`. Vitest є primary unit/contract/integration/failure runner із V8 coverage; packed built JS додатково перевіряється напряму в Node.js 24.

## Package і source boundaries

- Package manager baseline — npm, exact direct pins і committed `package-lock.json`; BP1-01 має прибрати lockfile з `.gitignore` та використовувати `npm ci` у CI.
- Phase 1 експортує тільки package root і `./package.json` через explicit `exports`; wildcard/internal exports, CJS і runtime IoC tokens заборонені.
- Subpaths `./testkit`, `./driver`, `./plugin` можуть з'явитися тільки після власних contract/compatibility gates.
- Package gate включає clean typecheck/build/lint/format/test, `npm pack`, `publint`, `attw` і runtime/type consumer встановленого tarball.
- API Extractor не є Phase 1 hard dependency; compatibility spike має бути виконаний не пізніше Phase 7.

Markdown, Git і Project Memory tooling є процесним середовищем проекту, а не runtime stack Extensia.
