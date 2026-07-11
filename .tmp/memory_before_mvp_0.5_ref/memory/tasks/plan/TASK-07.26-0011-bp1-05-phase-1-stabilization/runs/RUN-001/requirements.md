# Вимоги RUN-001

Preparation Status: prepared
Execution Status: completed
Status: review-ready
Created: 2026-07-10
Started: 2026-07-10
Agent Role at activation: Agent Executor
Execution Mode: autonomous-implementation
Evidence Revision: R1 (complete)

## Мета цього прогону

Провести risk-based stabilization фактично прийнятого Phase 1 baseline (`BP1-01`…`BP1-04`), усунути підтверджені defects або accidental surface у межах цього baseline і сформувати complete reproducible evidence revision для незалежного `BP1-06` audit.

## Уточнені вимоги

- Побудувати acceptance traceability matrix для BP1-01, BP1-02, BP1-03 і BP1-04: критерій, фактичний тест або package check, команда, результат і посилання на evidence у цьому `result.md`.
- До будь-якої зміни зафіксувати baseline evidence: Node.js/npm versions, committed source revision, `git status --porcelain`, package-lock checksum, clean-install result і повний command suite. Наявні user changes не відкидати, не перезаписувати й не включати до stabilization diff без явної потреби.
- Виконати clean `npm ci --no-audit --no-fund`, `npm run check` і `git diff --check`; якщо environment потребує Git safe-directory override, використовувати лише per-command configuration і зафіксувати його як environment limitation.
- Повторити packed-consumer proof на Node.js 24: ESM root import, zero root exports, bounded no-side-effects import, type-only consumer, exact rejection internal/direct/`dist/*` subpaths, no CJS і manifest `exports` тільки `.` та `./package.json`.
- Перевірити tarball contents і controlled deterministic artifacts: записати sorted packed path list та SHA-256 hashes emitted `dist/**` files; окремо позначити npm tar metadata як nondeterministic, якщо воно відрізняється без зміни controlled files.
- Повторити targeted Phase 1 matrices: domain scalar/JSON/detached snapshot boundary; composition graph validation/fresh-composition/private-capability/safe-diagnostics/disposal; lifecycle validation/order/partial-start ownership/reverse cleanup/at-most-once disposal/state transitions/safe diagnostics.
- Перевірити source, declarations і built package на accidental public/internal exports, raw IoC runtime/tokens, service locator, duplicate Composition Root, post-compose mutation, production subsystem map, Storage Driver semantics і speculative Phase 2/3 foundations.
- Усунути лише підтверджені gaps у межах accepted Phase 1 contracts. Кожна зміна має отримати regression evidence; uncertainty щодо target/public contract, dependency versions або design policy є blocker або owner follow-up, а не привід вигадувати поведінку.
- Оновити factual current implementation/technical memory лише за результатом коду й evidence; target-draft документи, accepted ADR та roadmap не змінювати без confirmed discrepancy або окремого owner decision.
- Підготувати `result.md` із evidence revision `R1`, independent-subagent review, architecture-pressure check, language gate, upward consistency check і readiness decision для BP1-06.

## Обсяг цього прогону

- Стабілізація tooling/package, pure domain contracts, IoC composition skeleton і strict internal lifecycle controller, реалізованих у BP1-01…04.
- Tests, test fixtures, package smoke, source cleanup, declarations, diagnostics, lifecycle cleanup/disposal і factual memory, лише коли це необхідно для закриття підтвердженого Phase 1 gap.
- Reproducibility, packed-content and consumer evidence, acceptance traceability та versioned evidence revision.
- Незалежний self-review через окремого Agent Reviewer; результат не стає `review-ready`, доки незакриті blocker/high/medium findings не закриті, не винесені за scope у blocking follow-up або не прийняті людиною як risk.

## Поза обсягом цього прогону

- Нові product features, public root/subpath APIs, Extensia Module, facades, Facade Registry, plugins, hooks або public lifecycle contract.
- Core, Storage Driver, write/lock/journal/index/recovery/synchronization foundations і будь-який Phase 2/3 behavior.
- Зміна exact dependencies, toolchain, Node.js baseline, package identity або accepted ADR без окремої dependency/owner task.
- Послаблення tests, package checks, diagnostic safety або lifecycle gates для отримання green result.
- Зміна target-draft domain/technical architecture чи оголошення deferred public `P1-VS1` виконаним.

## Критерії приймання цього прогону

- [x] Baseline і final evidence revision містять source revision, environment, lockfile checksum, command outcomes, packed-file list/hashes та пояснення nondeterministic metadata.
- [x] Traceability matrix підтверджує всі acceptance/verification gates BP1-01…04 зеленими або містить blocking disposition; прогін не є review-ready з відкритим blocker/high/medium defect.
- [x] Clean install, full package gate, `git diff --check` і packed Node.js 24 runtime/type consumer smoke зелені та відтворювані.
- [x] Root/package/declaration surface не містить accidental exports, raw IoC runtime/tokens, internal subpaths, CJS або undocumented Phase 2/3 APIs.
- [x] Domain, composition і lifecycle targeted matrices доводять accepted Phase 1 boundaries, зокрема safe diagnostics, fresh composition, cleanup ownership, at-most-once semantics і disposal.
- [x] Stabilization diff не містить speculative feature work, public-contract invention, dependency drift або quality-gate weakening.
- [x] Factual current implementation/technical memory, task navigation, `state.md` і indexes синхронізовані лише відповідно до фактичного результату; вплив на документи загального рівня зафіксований.
- [x] Independent audit, language gate і architecture-pressure review завершені; `result.md` містить явне рішення `review-ready`, `blocked` або `failed` і наступну дію для BP1-06.

## Evidence protocol

`R1` є першим versioned evidence revision. Перед review він повинен містити:

- baseline і final source revision, clean/dirty worktree state та перелік user changes, які не належать run;
- Node.js/npm versions, lockfile SHA-256 і команди clean install/package suite;
- sorted manifest packed contents, hashes controlled emitted artifacts і explicit treatment nondeterministic npm metadata;
- acceptance traceability BP1-01…04, targeted matrix outcomes та scans public/internal/declaration boundary;
- список defects/findings із severity, disposition, regression proof і посиланням на independent audit;
- factual memory changes, upward consistency status, language gate й architecture-pressure decision.

Якщо material finding повертає задачу після `BP1-06`, наступний stabilization прогін створюється як `RUN-002`; `R1` і цей run не переписуються як історія, що нібито не існувала.

## Зміни від попереднього прогону

Немає: це перший прогін BP1-05.
