# TASK-07.26-0016: BP2-02 — Реалізувати read-only Core Extension Port і minimal index

Status: done
Type: feature
Execution Mode: autonomous-implementation
Created: 2026-07-10
Owner Role: System Engineer Hat
Current Run: `RUN-001`
Current Research: n/a
Current Fixation: n/a

## Мета

Побудувати найвужчий внутрішній шлях читання `readonly driver -> Core read port -> minimal Resource index`, потрібний погодженому контракту Phase 2 і P2-VS1.

## Обсяг

- Production-owned readonly driver port і deterministic fixture loading.
- Мінімальні погоджені Core read requests.
- Проєкції Resource-by-id і parent-to-children; мінімальна greedy initialization.
- Точна поведінка missing/invalid/cyclic/orphan fixtures за погодженим контрактом.
- Detached JSON-safe readonly snapshots, safe diagnostics, startup failure cleanup і fresh-composition isolation.

## Поза обсягом

Public facade/Registry/Extensia Module, writes/journal/locks/recovery/sync, Asset/Mark/KV/global search, lazy completeness claims і concrete durable driver.

## Залежності та activation gate

- BP2-01 має status `done`.
- `APP-07.26-0021-001` має бути published після post-application audit і фіксує shared internal read-port/adapter boundary.
- BP2-01A / TASK-07.26-0022 має мати status `done` як єдиний source artifact цієї seam.
- Phase 1 domain/composition/lifecycle baseline прийнятий.
- Activation окрема й створює `RUN-001`; лише після всіх попередніх gates task може виконуватися паралельно з separately activated BP2-03.

## Критерії приймання

- [x] Погоджений read contract реалізований без спекулятивних методів.
- [x] `children` виводяться тільки з `parent_id`; матриця invalid fixtures точна.
- [x] Snapshots detached; driver objects не витікають.
- [x] Немає journal/write dependency або public surface expansion.
- [x] Initialization failure rollback/disposal і fresh isolation перевірені.
- [x] Повні package gates зелені, результат пройшов незалежне ревю.

## Перевірка

Unit/contract/property tests проєкцій driver/index/Core; aliasing/JSON roundtrip; матриця invalid fixtures; lifecycle failure/cleanup; перевірка source/exports; package gates.

## Очікувана синхронізація пам'яті

Фактична current domain/technical implementation, task/run artifacts, indexes/state за дійсним статусом; target/public changes лише через погоджений BP2-01 application artifact.

## Architecture pressure

Заборонені index як source of truth, паралельні test-only contracts, спекулятивні lazy/full indexes, витік driver layout, обхід query-to-driver і передчасні write abstractions.

## Додатковий контекст

Planning ID `BP2-02`; оцінка `2/3/0/2/2/3=12 -> C3`, обсяг L, ризик високий. Підготовка task не є activation.
