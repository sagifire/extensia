# Вимоги RUN-001

Preparation Status: prepared
Execution Status: completed
Status: review-ready
Created: 2026-07-11
Started: 2026-07-11
Agent Role at activation: System Engineer Hat
Execution Mode: autonomous-implementation
Evidence Revision: R1

## Мета

Провести bounded risk-based stabilization реалізованої journal-backed Resource create/update foundation `BP3-01A`…`BP3-05`, усунути лише відтворені defects у межах accepted protocol і підготувати complete reproducible evidence перед окремим `P3-DG2`.

## Вимоги

- Зафіксувати source revision, worktree state, Node.js/npm versions і lockfile checksum без відкидання accepted попередніх змін.
- Простежити acceptance gates `BP3-01A`…`BP3-05` до актуальних source seams, executable tests, package checks і public/type snapshots.
- Виконати clean install, повний package gate, focused operation/driver/recovery/create/update matrices і `git diff --check`.
- Відтворити concurrency, failure і recovery guarantees: multi-key serialization, scope disposal, close-and-drain, semantic commit, committed-only journal, integrity scan, fresh recovery, prepared index publication та committed fail-close warnings.
- Перевірити protocol/source boundary: один Core write port, один Operation Engine, driver-owned transaction/journal, opaque experimental full-driver input і відсутність facade-direct write path або accidental public/internal exports.
- Перевірити exact Resource create/update public surface, descriptor-safe normalization, readonly failure-before-inspection, no-change без transaction, detached read-back і packed consumer behavior.
- Зберегти machine-verifiable environment, focused/full gate та controlled build/package evidence; не оголошувати npm metadata або experimental driver compatibility contract.
- Усувати лише підтверджені stabilization defects із regression proof; нові features, `P3-DG2` semantics, concrete driver і final Phase 3 stabilization блокуються або виносяться у follow-up.
- Синхронізувати factual memory та task navigation, виконати language gate, architecture-pressure check й незалежний audit.

## Поза обсягом

- Parent/order/flags/aggregates, delete/restore, Mark/KV, hooks, sync або інші `P3-DG2`/`P3-VS3…VS5` semantics.
- Concrete durable Storage Driver, Phase 4 work або перетворення full fake/opaque integration shape на public compatibility promise.
- Нові public methods/facades, API redesign, dependency/toolchain drift або послаблення quality gates.
- Final `P3-STAB`, який виконується лише після `P3-VS5`.

## Критерії приймання

- [x] Acceptance/verification `BP3-01A`…`BP3-05` простежені; open material findings закриті або мають blocking/follow-up disposition.
- [x] Clean install, full package gate, focused matrices, packed consumer, source/export scans і `git diff --check` зелені.
- [x] Lock/scope/engine, commit/journal/index/recovery та create/update public boundaries відтворені executable.
- [x] Один write pipeline збережено; duplicate protocol, direct facade-driver write, accidental exports і speculative `P3-DG2` code відсутні.
- [x] Evidence revision містить environment, source/worktree identity, lock checksum і відтворювані controlled artifacts.
- [x] Factual memory, upward consistency, language gate, architecture pressure та independent review завершені.

## Evidence protocol

`R1` є першою evidence revision. Material finding після передачі в audit створює remediation і repeated audit у цьому run або нову revision/run, якщо змінює identity чи межі evidence; історія попередньої спроби не переписується.
