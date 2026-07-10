# TASK-07.26-0018: BP2-04 — Інтегрувати public read-only Resource vertical slice

Status: backlog
Type: feature
Execution Mode: autonomous-implementation
Created: 2026-07-10
Owner Role: System Engineer Hat / Product Lead Hat
Current Run: n/a
Current Research: n/a
Current Fixation: n/a

## Мета

Реалізувати observable для application P2-VS1 від readonly config/start до Resource/tree query, явної failed storage command і stop/dispose.

## Обсяг

- Погоджена Extensia Module/public lifecycle boundary і readonly fake-driver config.
- Інтеграція Core/index BP2-02 та Registry/system facades BP2-03.
- Resource-by-id/tree scenario, перевірка mutation detached snapshot, явна storage failure до mutation.
- Lifecycle/diagnostics і запакований Node.js 24 runtime/type consumer.

## Поза обсягом

Successful write, journal/index publication/recovery, concrete storage, user plugins/custom facades/hooks, Asset/Mark/KV і broad query catalog.

## Залежності та activation gate

BP2-02 і BP2-03 `done` та synchronized; окрема activation створює `RUN-001`; critical integration виконується послідовно.

## Критерії приймання

- [ ] Запакована supported API стартує readonly runtime і повертає точні Resource/tree snapshots.
- [ ] Mutation snapshot не впливає на наступне читання.
- [ ] Storage command повертає погоджену failure, стан не змінюється.
- [ ] Source/dependency probes доводять відсутність write/journal path; instrumentation використовує лише погоджену production boundary без test-only Journal contract.
- [ ] Raw IoC/Core/tokens недоступні; Registry frozen on ready.
- [ ] Startup/query/stop failures очищені й нормалізовані; fresh runtimes ізольовані.

## Перевірка

Application integration, запакований runtime/type consumer, API snapshot, матриці readonly/missing/invalid/failure/lifecycle, aliasing, zero-write source/dependency probes, instrumentation погодженої boundary, export scan і повні package gates.

## Очікувана синхронізація пам'яті

Фактична current implementation/product API/technical state лише для поставленого погодженого contract; task/run/state indexes; target drafts не розширюються.

## Architecture pressure

Заборонені application bypass до internal harness, ручне facade attachment, тіньова public API, query writes, test-only Journal architecture й integration-specific duplication.

## Додатковий контекст

Planning ID `BP2-04`; оцінка `2/3/0/3/3/3=14 -> C4`, обсяг L, ризик високий. Підготовка task не є activation.
