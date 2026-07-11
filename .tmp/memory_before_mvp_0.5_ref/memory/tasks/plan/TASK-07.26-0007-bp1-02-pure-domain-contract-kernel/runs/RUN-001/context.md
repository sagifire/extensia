# Контекст RUN-001

## Роль і режим

- Agent Role: Agent Implementer.
- Execution Mode: `autonomous-implementation`.
- Task status на старті run: `active`.

## Джерела рішення

- `TASK-07.26-0007` визначає scope, exclusions та acceptance criteria.
- `FIX-003` TASK-07.26-0003 є authority для UUID v4, numeric millisecond Timestamp і deeply readonly detached JSON-safe DTO boundary.
- `memory/domain/target/model.md` і `memory/domain/rules.md` визначають accepted pure invariants поверх target-draft field model.
- `memory/domain/open-questions.md` є негативною межею: невирішені policies не реалізуються неявно.
- Detailed source `domain-model-v2.md` використовується лише для traceability conceptual field set; його старі scalar types та mutable declarations замінюються accepted FIX-003 contracts і не стають public API.

## Початковий стан і захист чужих змін

`BP1-01` завершена й package gate зелений. Робоче дерево на старті чисте. `src/index.ts` є порожнім public entry point, а runtime/domain implementation відсутня. Run додає internal `src/domain/**` modules і tests, не змінюючи root exports.

## Архітектурні межі

- Scalar і JSON validators не залежать від domain aggregates.
- Snapshot builders виконують validation та deep clone, але не mutation orchestration.
- Cross-item invariants, які можна перевірити в одному detached aggregate (primary cardinality, Mark identity), перевіряються локально; storage uniqueness, parent cycles і ownership між окремими records лишаються runtime gates.
- Shape validation не нормалізує відкриті domain strings і не нав'язує неузгоджені numeric ranges для `order_index`.

## Відомі ризики

- Conceptual draft field set можна випадково видати за stable public API; mitigation — internal modules без root/subpath exports.
- Type-level readonly не гарантує ownership; mitigation — recursive clone та alias-mutation tests без runtime freeze.
- Generic JSON cloning може втратити prototype-sensitive semantics; validator навмисно приймає лише ordinary/null-prototype string-keyed objects із enumerable own properties.
