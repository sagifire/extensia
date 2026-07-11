# TASK-07.26-0023: BP3-01 / P3-DG1 — Спроектувати write, journal і recovery protocol

Status: done
Type: design
Execution Mode: autonomous-research
Created: 2026-07-10
Owner Role: Product Lead Hat / System Engineer Hat
Current Run: n/a
Current Research: RSCH-001
Current Fixation: FIX-001

## Мета

Спроектувати точний мінімальний operation, transaction, journal, locking, recovery, index-publication і public Resource create/update contract, достатній для перших journal-backed write slices Phase 3 на deterministic fake driver без передчасного визначення concrete physical storage layout.

## Продуктовий контекст

Phase 2 завершила bounded public read-only Resource slice. Accepted ADR-0005 вимагає єдиного Core Operation Engine, Storage Driver як durable source of truth, committed journal entry як publication boundary, post-commit index update і recovery до ready. Exact protocol досі не визначений, тому successful write не може безпечно реалізовуватися до цього owner design gate.

## Обсяг

- Визначити semantic commit unit між Resource metadata, committed journal entry та recovery state без concrete filesystem/object-storage layout.
- Визначити capability model readonly/full driver, transaction/staging, storage write lock, commit/abort, journal і recovery primitives.
- Визначити operation plan, operation scope, operation/actor identity, clock/ID dependencies, local lock keys/order, intake/drain/cancellation і retry/idempotency boundary.
- Визначити journal sequence/cursor ownership, phases, payload, uniqueness, corruption/gap/duplicate behavior і publication semantics.
- Визначити startup recovery order, recovery matrix і ready-state gate для deterministic fake.
- Визначити atomic post-commit Hot Metadata Index apply і поведінку post-commit failures.
- Визначити exact public `createResource` і bounded `updateResource` input/result/error contracts, readonly rejection та compatibility boundary чинного Phase 2 API.
- Визначити shared internal seam ownership, materialization gate і task-ready decomposition до P3-VS1/P3-VS2.
- Надати state-transition, failure-cut, concurrency, lifecycle, recovery, API/type і traceability matrices.

## Поза обсягом

- Production code, package exports або implementation tasks Phase 3.
- Concrete physical Storage Driver, filesystem/object-storage layout і реальна durability proof Phase 4.
- Resource move/sibling normalization, Mark/KV, delete/restore semantics P3-DG2.
- Asset/upload pipeline, External Change Sync, lazy index і multi-instance visibility implementation.
- Public plugin/hooks/custom facade contract або Advanced IoC API.
- Final release compatibility policy та повний error catalog поза create/update slice.

## Залежності та activation gate

- Phase 2 human gate прийнятий 2026-07-10.
- Користувач 2026-07-10 явно активував BP3-01 і дозволив незалежних субагентів для review.
- Draft source specifications є design inputs, але не authority для автоматичного public freeze.

## Обов'язкові артефакти

- Task-local `research/RSCH-001.md`.
- Detailed design report `memory/reports/research/2026-07-10-extensia-write-journal-recovery-protocol.md` та index update.
- Alternatives/decision register, exact conceptual contracts, state transitions і failure/recovery matrices.
- `fixations/FIX-001.md` proposal canonical змін без application.
- Independent subagent audit із закритими або явно винесеними findings.

## Критерії приймання

- [x] Commit protocol не допускає committed metadata без однозначного committed journal/recovery interpretation і не залежить від concrete layout.
- [x] Pre-commit, commit-point і post-commit failures мають несуперечливу result/recovery семантику.
- [x] Driver/Core/Journal/Index ownership і exact shared seams однозначні; test-only parallel architecture заборонена.
- [x] Lock order, storage-lock lifetime, intake/drain/cancellation та retry/idempotency boundary визначені.
- [x] Startup recovery завершується до index initialization/public ready та має повну fake failure matrix.
- [x] Public create/update inputs, outputs, errors, readonly behavior, generated fields і compatibility labels точні.
- [x] P3-WP1/P3-WP2/P3-VS1/P3-VS2 мають task-ready scope, dependencies, acceptance і verification без activation.
- [x] Independent audit не має відкритих blocker/high/medium findings.
- [x] Research передано на human review; FIX-001 не застосована й implementation tasks не активовані.

## Перевірка

Architecture/state-machine review, compile-oriented TypeScript contract probes за потреби, failure-cut і recovery matrices, concurrent schedule reasoning, lifecycle/ready proof, source-policy/upward-consistency/language gates та architecture-pressure review.

## Очікувана синхронізація пам'яті

Task/research/report/index/state/progress — `updated`; canonical product/domain/technical contracts — `proposed` у FIX-001; production/current implementation — `not needed`; knowledge memory — `not needed`.

## Architecture pressure

Зупинити design, якщо protocol потребує concrete storage layout, робить Hot Metadata Index source of truth, допускає окремі non-atomic metadata/journal writes, створює другий write path, стабілізує hooks/plugins або виносить Core/IoC/callable transaction handles через application config/facades/Module. Окремий experimental driver-author definition contract може містити callbacks, але configured driver лишається opaque handle без direct commit API.

## Додатковий контекст

Planning ID `P3-DG1`; historical estimate `2/3/3/3/2/3=16 -> C4`, обсяг L, ризик критичний, невизначеність висока; рекомендовані агент і аудитор рівня `екстремальний`.
