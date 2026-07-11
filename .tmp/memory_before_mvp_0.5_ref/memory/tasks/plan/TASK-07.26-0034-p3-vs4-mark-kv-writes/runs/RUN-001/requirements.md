# Вимоги RUN-001 P3-VS4

Preparation Status: prepared
Execution Status: not-started
Status: pending-activation
Agent Role: Implementation Agent
Execution Mode: autonomous-implementation

## Результат

Реалізувати accepted full-replace Marks і namespace-replace/delete KV поверх stabilized VS3 seams.

## Green gate

Exact public parsing/types/errors; all limits and hostile-object cases; canonical ordering/equality; empty/no-change behavior; one semantic commit/entry; same-Resource schedules; crash/recovery; detached packed read-back; full package gate; independent audit без open P0-P3; result memory/language/architecture gates.

## Заборони

Не дублювати pipeline/validation seams, не додавати patch/query/index APIs, delete, Asset.data, plugins/hooks або concrete storage assumptions.

## Per-file implementation boundary

- Public root/facade contracts: exact `SetMarkInput`, `setMarks`, `setKV`, `ResourceMarksError`/`ResourceKVError` exports and adapters; no extra codes.
- Parser/domain helpers: descriptor-safe dense array and ordinary/null-prototype exact record parsing; canonical Mark/key sorting, equality and limits.
- Core handler: one target lock, latest load, replacement/no-change, own `updated_at`, prepared single-Resource set, existing semantic commit/index/read-back.
- Protocol unions/tests: `resource.marks.set`/`resource.kv.set`; reuse VS3 prepared set and integrity mapping unchanged.

## Exact limits/error matrix

- Marks: dense Array ≤256; only length/index data properties; element exact own enumerable `type/name/value`; strings nonblank 1..128 exact; int32/null; duplicate `(type,name)` → `RESOURCE_INPUT_INVALID`; binary `(type,name)` sort; empty clear.
- KV: namespace/key nonblank 1..128; ordinary/null-prototype exact enumerable record; ≤256 keys and resulting namespaces; value 0..16384; total `sum(namespace.length+key.length+value.length)` ≤1,048,576; empty deletes namespace; key order ignored.
- Missing/deleted target → `RESOURCE_NOT_FOUND`; input/limit failure → `RESOURCE_INPUT_INVALID`; exact equality → `RESOURCE_NO_CHANGES`; readonly before inspection; exact Section 11 lock/I/O/integrity precedence.
- Effective change modifies only marks or target namespace plus own timestamp; one commit/entry; detached target success/read-back.

## Failure/concurrency/verification matrix

Cover accessors, symbols, inherited/non-enumerable fields, sparse arrays, boundaries ±1, duplicates, insertion-order equality, same Resource Marks+KV FIFO, different Resources, aggregate write vs hierarchy sibling change, begin/stage/commit/publish/cleanup cuts and crash/fresh recovery. Run focused tests then `npm run check`, package/type/packed consumer gates, `git diff --check` and source scans. Record exact commands/counts.

## Memory sync expectation

Update factual domain current, technical implementation state if needed, task/run/result/progress/state/indexes. Canonical target/product normally `not needed`. Result must record general-level states, language gate, architecture pressure, no-activation follow-up and independent audit.
