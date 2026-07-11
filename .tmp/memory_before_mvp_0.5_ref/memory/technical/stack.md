# Технологічний stack

Updated: 2026-07-11

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
| TypeScript | current | Exact compiler baseline `typescript@6.0.3`; NodeNext/ES2024 strict build і no-emit typecheck реалізовані в BP1-01. |
| Node types | current | Exact direct pin `@types/node@24.12.0` встановлено через committed npm lockfile. |
| `@sagifire/ioc` | current | Exact internal runtime dependency `@sagifire/ioc@0.0.2` встановлено; BP1-03 реалізувала internal composition/conformance skeleton без public IoC exports. |

Фактичний API `@sagifire/ioc@0.0.2` перевірено за exact package contents і executable conformance tests BP1-03. Він підтримує typed tokens, modules, graph validation, adapters, cardinality, scopes, inspection і disposal. Internal Composition Root повертає лише allowlisted immutable capability map, safe detached inspection і контрольовані scope/disposal operations; raw composer/runtime не експонуються. Multi contributions є synchronous values/factories; Extensia самостійно володіє async lifecycle, extension graph, startup rollback і stop ordering.

## Зберігання

| Елемент | Статус | Рішення |
|---|---|---|
| Storage Driver contract | current-experimental | Opaque full-driver author boundary і internal Resource session/transaction seams реалізовані для bounded create/update; final wider contract і concrete layout не визначені. |
| Concrete full driver | unselected | Physical format і driver package ще не визначені. |
| Read-only driver | current-experimental | Public Phase 2 Resource listing contract інтегровано BP2-04; це не final Storage Driver contract і не concrete durable implementation. |
| Hot Metadata Index | current | Resource-only greedy index має validated immutable batch preparation та atomic publication для create/update/move; lazy mode і wider metadata не реалізовані. |
| Operation Journal | current-internal | Deterministic full fake реалізує committed-only contiguous Resource journal та recovery contract; concrete durable journal/layout лишається planned. |
| Operation Engine foundation | current-internal | BP3-02 реалізувала atomic multi-key lock queue, explicit scopes, pipeline state/cancellation boundary, committed warnings і close-and-drain без Resource handlers або persistence wiring. |
| Deterministic full driver | current-internal | BP3-03 реалізувала contract-faithful shared-backing fake, committed journal, crash/fresh recovery та same-session startup scan без public write success або concrete durability claim. |
| Resource create slice | current-experimental | BP3-04 інтегрувала opaque full-driver handle й Core create pipeline; P3-VS3 refine-ила root create до active-root append під hierarchy lock. Concrete durability лишається deferred. |
| Resource update slice | current-experimental | BP3-05 інтегрувала exact own-metadata update через той самий Core pipeline: latest-state serialization, no-change без transaction, semantic commit, prepared index publication і recovery; P3-DG2 та concrete durability deferred. |
| Resource move slice | current-experimental | P3-VS3 інтегрувала exact root/same/cross-parent insertion move, dense sibling normalization, cycle/parent/range/no-change policy, sorted multi-Resource commit та typed integrity fail-close через той самий Core pipeline. |

Extensia Core не залежить напряму від local filesystem, S3, NFS або packed format. Вибір першого concrete driver є окремим design decision.

## API та extensions

| Елемент | Статус | Рішення |
|---|---|---|
| Extensia Module | current-bounded | Root `createExtensia` підтримує readonly і opaque experimental full driver; BP3-04/BP3-05 додали bounded Resource create/update та post-commit fail-close без P3-DG2 semantics. |
| Facades | current-bounded | Shared Registry і system `storage`/`query` adapters реалізовані BP2-03 та опубліковані через BP2-04 Module; custom/plugin API ще не реалізований. |
| Plugins/hooks | planned | Trusted in-process механізм розширень. |
| Advanced IoC extension modules | unselected | Optional/experimental surface; не входить у normal plugin API без окремого рішення. |

## Phase 1 build і tooling baseline

Version snapshot прийнятий станом на 2026-07-09 і змінюється тільки окремою dependency task:

- compiler/types: `typescript@6.0.3`, `@types/node@24.12.0`;
- tests: `vitest@4.1.10`, `vite@8.1.4`, `@vitest/coverage-v8@4.1.10`;
- lint/format: `eslint@10.6.0`, `@eslint/js@10.0.1`, `typescript-eslint@8.63.0`, `prettier@3.9.5`;
- package checks: `publint@0.3.21`, `@arethetypeswrong/cli@0.18.4`.

`BP1-01` реалізувала цей baseline: npm lockfile committed, `src/**` збирається unbundled `tsc` у declaration/source-mapped ESM `dist/`, а tests type-check окремо без emit. ESLint flat config, Prettier, Vitest/V8 і package gate перевіряють packed tarball у чистому Node.js 24 consumer. `attw` запускається в `esm-only` профілі, бо CJS compatibility явно не є ціллю package.

Build є unbundled ESM через `tsc`; Rollup/tsup і dual CJS output у baseline не входять. Compiler contract:

- `target: ES2024`, `lib: ["ES2024"]`, `module: NodeNext`, `moduleResolution: NodeNext`;
- `rootDir: src`, `outDir: dist`, declarations/declaration maps/source maps, `inlineSources`, `noEmitOnError`;
- strict mode з `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `useUnknownInCatchVariables`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `noPropertyAccessFromIndexSignature`;
- `verbatimModuleSyntax`, `isolatedModules`, `isolatedDeclarations`, `erasableSyntaxOnly`, `moduleDetection: force`, `forceConsistentCasingInFileNames`;
- `skipLibCheck: false`, `types: ["node"]`; relative source imports використовують emitted `.js` extensions.

Publishable `src/**` збирається окремим `tsconfig.build.json`; tests type-check окремим no-emit config і не потрапляють у `dist`. Vitest є primary unit/contract/integration/failure runner із V8 coverage; packed built JS додатково перевіряється напряму в Node.js 24.

`BP1-05/R1` повторно підтвердила current baseline на Node.js `v24.17.0` / npm `11.13.0`: clean `npm ci`, повний `npm run check`, 7 test files / 75 tests, 38 packed paths і 36 controlled emitted artifacts із byte-identical SHA-256 після повторного build. Це verification evidence, а не нове dependency або compatibility рішення.

`BP2-05/R1` повторно підтверджує Phase 2 package baseline на Node.js `v24.17.0` / npm `11.13.0`: clean `npm ci`, повний `npm run check`, 10 test files / 112 tests, 66 packed paths і 64 controlled emitted artifacts із byte-identical SHA-256 після повторного build; два послідовні tarball samples також byte-identical. Це stabilization evidence, а не нове dependency або compatibility рішення.

`P3-STAB1/R1` повторно підтверджує create/update foundation на Node.js `v24.17.0` / npm `11.13.0`: clean install, 16 test files / 172 tests, focused 7 files / 61 tests, 112 byte-identical controlled `dist/**` artifacts і два byte-identical packs по 114 paths. Generated root tarball більше не tracked; це stabilization evidence, а не compatibility promise або activation `P3-DG2`.

## Package і source boundaries

- Package manager baseline — npm, exact direct pins і committed `package-lock.json`; BP1-01 прибрала lockfile з `.gitignore` і зафіксувала відтворення через `npm ci`.
- Phase 1 експортує тільки package root і `./package.json` через explicit `exports`; wildcard/internal exports, CJS і runtime IoC tokens заборонені.
- Phase 2 root експортує exact `createExtensia` і bounded public type contracts; internal Core/index/Facade Registry/default-api artifacts збираються у `dist/**`, але package exports не відкривають їх, а installed-tarball smoke відхиляє direct і `dist/*` subpaths.
- Subpaths `./testkit`, `./driver`, `./plugin` можуть з'явитися тільки після власних contract/compatibility gates.
- Package gate включає clean typecheck/build/lint/format/test, `npm pack`, `publint`, `attw` і runtime/type consumer встановленого tarball.
- API Extractor не є Phase 1 hard dependency; compatibility spike має бути виконаний не пізніше Phase 7.

Markdown, Git і Project Memory tooling є процесним середовищем проекту, а не runtime stack Extensia.
