# TASK-07.26-0015: BP2-01 — Спроектувати мінімальний public read contract

Status: done
Type: design
Execution Mode: autonomous-research
Created: 2026-07-10
Owner Role: Product Lead Hat / System Engineer Hat
Current Run: n/a
Current Research: RSCH-001
Current Fixation: FIX-001

## Мета

Погодити найменший прикладний контракт і спільну внутрішню межу читання, достатні для P2-VS1, не заморожуючи ширшу чернеткову поверхню API.

## Обсяг

- Порівняти alternatives Extensia Module construction/start/stop і facade access.
- Визначити мінімальний config/storage integration input для readonly fake driver без final plugin config.
- Визначити точні методи P2-VS1 у `query`/`storage`, вхідні дані, нормалізовані результати/помилки та DTO-знімки Resource/tree.
- Зафіксувати явну відмову unsupported/readonly command до зміни стану.
- Визначити facade names/normalization, Registry ownership, contribution phase, reserved names, freeze/publication point і safe diagnostics.
- Визначити мінімальну внутрішню межу Core read-port/request/result та facade adapter, спільну для незалежної реалізації BP2-02/BP2-03.
- Надати consumer examples, API/type snapshot proposal, failure/lifecycle tables і compatibility status кожної surface.

## Поза обсягом

- Successful writes, journal/locks/recovery або concrete driver.
- Повний query catalog, Asset/Mark/KV API.
- User plugins/hooks/custom facade API або Advanced IoC API.
- Final compatibility policy чи механічне копіювання conceptual signatures зі source drafts.

## Залежності та activation gate

- Phase 1 human gate прийнятий.
- Активація потребує окремого явного рішення користувача й створення `RSCH-001`.
- Draft specifications є input, а не authority для public freeze.

## Обов'язкові артефакти

- Task-local `research/RSCH-001.md` і detailed report у `memory/reports/research/**` з index update.
- Матриця alternatives/decisions, consumer examples, API/type snapshot і таблиці failure/lifecycle.
- Знімок мінімальної внутрішньої read-port/adapter seam.
- `fixations/FIX-*` proposal для canonical API/technical changes.
- Після task-level human approval і окремого approval fixation — окрема owner `interactive-memory-update` task для application з stable task/artifact ID та власним audit.

## Критерії приймання

- [x] Альтернативи й відхилені варіанти явні; вибрано лише методи P2-VS1.
- [x] Construction/start/config і packed-consumer boundary однозначні.
- [x] Коди результатів/помилок, lifecycle states, readonly failure-before-mutation і семантика detached DTO точні.
- [x] Registry ownership/freeze/reserved naming однозначні.
- [x] Спільна внутрішня межа достатня для паралельних BP2-02/BP2-03 без дубльованого test-only contract.
- [x] Публічна поверхня не містить Core/IoC/raw resolver; статус сумісності явний.
- [x] Independent audit не має open blocker/high/medium findings.
- [x] Research передано на human review; canonical changes не застосовані цією research task.

## Перевірка

Application-style examples, compile/type-narrowing probes, API snapshot, failure/state matrix, mutation/aliasing reasoning, config/registry/lifecycle architecture review, source policy, upward consistency, language gate й architecture pressure.

## Очікувана синхронізація пам'яті

Research/report/index — `updated`; canonical product/API/technical/ADR/open questions — `proposed` у fixation до human approval та окремої application task; current implementation — `not needed`.

## Architecture pressure

Зупинити design, якщо мінімальний read contract потребує загального plugin API, raw resolver, повної production module map, write pipeline, конкретного layout або широкого заморожування draft facade.

## Додатковий контекст

Planning ID `BP2-01`; оцінка `2/3/0/2/3/3=13 -> C3`, обсяг M, ризик високий, невизначеність середня. Підготовка task не є activation або approval design.
