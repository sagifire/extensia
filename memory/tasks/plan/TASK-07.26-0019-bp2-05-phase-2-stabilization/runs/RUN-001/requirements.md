# Вимоги RUN-001

Preparation Status: prepared
Execution Status: completed
Status: review-ready
Created: 2026-07-10
Started: 2026-07-10
Agent Role at activation: System Engineer Hat
Execution Mode: autonomous-implementation
Evidence Revision: R1 (complete)

## Мета

Провести risk-based stabilization прийнятого Phase 2 baseline `BP2-01`…`BP2-04`, усунути підтверджені defects у межах read-only Resource/API/Registry/lifecycle/package slice та підготувати complete reproducible evidence revision для незалежного BP2-06 audit.

## Вимоги

- Зафіксувати baseline source revision, dirty worktree, Node.js/npm versions і lockfile checksum; не відкидати прийняті, але не committed зміни попередніх Phase 2 задач.
- Простежити acceptance gates BP2-01…04 до актуальних executable tests, package checks і source/export scans.
- Виконати clean install, повний package gate, focused Core/Registry/public/lifecycle tests і `git diff --check`.
- Перевірити exact root runtime/type API, package export map, закриті internal subpaths, packed Node.js 24 consumer і відсутність accidental exports або premature methods.
- Перевірити failure-before-mutation для readonly command, zero Journal/write dependency, detached DTO, frozen Registry, safe diagnostics, lifecycle cleanup/races та fresh-instance isolation.
- Перевірити reproducibility через sorted packed paths і SHA-256 controlled emitted artifacts; npm tar metadata не оголошувати deterministic contract.
- Усувати лише підтверджені Phase 2 gaps із regression proof; API redesign, dependency drift і Phase 3 foundations блокуються або виносяться у follow-up.
- Синхронізувати factual current memory та task navigation, виконати language gate, architecture-pressure check й незалежний review.

## Поза обсягом

- Successful writes, Journal, Operation Engine, locks, recovery, sync або concrete durable Storage Driver.
- Нові public methods/facades, plugins/hooks, Asset/Mark/KV surface або API redesign без owner gate.
- Зміни dependencies, toolchain, Node.js baseline, package identity чи accepted ADR.
- Послаблення tests, diagnostics, lifecycle, package або encapsulation gates.

## Критерії приймання

- [x] Усі BP2 acceptance/verification gates простежені й зелені; blocker/high/medium findings відсутні або мають blocking disposition.
- [x] Clean install, full suite, focused matrices, packed consumer, export/source/dependency scans і `git diff --check` зелені.
- [x] Public API дорівнює accepted snapshot; DTO detached, Registry frozen, Core/IoC/internal tokens не leaked.
- [x] Commands fail before inspection/mutation; reads не залежать від write/Journal path.
- [x] Versioned package evidence містить environment, lock checksum, sorted paths і controlled hashes.
- [x] Немає speculative Phase 3 code, dependency drift, quality-gate weakening або workaround masking.
- [x] Factual memory, upward consistency, language gate, architecture pressure та independent review завершені.

## Evidence protocol

`R1` є першою evidence revision. Material finding після передачі до BP2-06 створює новий stabilization run/revision; історія RUN-001 не переписується так, ніби попередньої спроби не існувало.
