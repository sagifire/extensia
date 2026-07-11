# Відкриті технічні питання

Updated: 2026-07-10

## Закритий Phase 1 baseline

- Exact implementation dependency — `@sagifire/ioc@0.0.2`; фактичні capabilities й Extensia-owned lifecycle boundaries зафіксовані в ADR-0006.
- TypeScript/build/test/package baseline для Node.js 24 ESM library зафіксований у `technical/stack.md` та ADR-0006. Version upgrades лишаються окремими dependency tasks.

## Composition і package structure

- Який остаточний public config за межами applied Phase 2 readonly `{ storage: { driver } }`: окремі `plugins` і `extensions` чи одна normalized application-facing collection?
- Які IoC tokens є internal, які можуть стати public/experimental extension tokens, і як версіонувати їхні IDs?
- Де остаточно живе Facade Registry за межами applied Phase 2 Module-owned lifecycle/freeze/provenance boundary: у runtime module чи extension layer після Core startup?
- Чи входить Advanced IoC Extension Module API у `0.1.0`, чи лишається deferred/experimental?

## Runtime і storage

- Який concrete Storage Driver буде першим supported driver і який його physical metadata/file layout?
- Яка atomic commit strategy узгоджує metadata, files і committed journal entry для першого driver?
- Який concrete lock/lease mechanism і timeout потрібні першому physical driver? P3 baseline уже задає exclusive recovery-clean session, cancellation до staging і no outcome change після commit start.
- Який physical encoding/persistence format матиме прийнята canonical positive-decimal contiguous journal sequence?
- Який concrete staging/layout mechanism доведе outcome-definite semantic commit і recovery matrix на першому durable driver?
- Який trigger для External Change Sync: polling, driver notification або explicit refresh; яка cursor persistence policy?
- Яка correctness/completeness semantics глобальних queries у `lazy` mode?

## API та extensions

- Які exact method names і input/result DTO входять поза applied Phase 2 reads та accepted bounded P3 root create/own-metadata update contract?
- Який остаточний error code catalog поза bounded Phase 2 subset і чи `cause` доступний у production diagnostics?
- Які hook names стабільні, які payload contracts вони мають і які handlers виконуються sequential/parallel?
- Як optional plugin failure взаємодіє з declared facades і transitive dependencies?
- Як агрегуються stop failures/warnings без втрати cleanup інших plugins?
- Яка policy namespacing/custom facade names існує поза applied lowercase exact naming, reserved `query`/`storage` і Module-owned provenance Phase 2?
- Яку compatibility policy застосувати до public facades, plugin API, hooks, Core Extension Port та experimental APIs до/після `0.1.0`?

## Testing і release

- Чи `@extensia/testkit` буде окремим package, subpath export або internal test helper?
- Які мінімальні failure-injection scenarios є release gate для journal, recovery, driver й startup rollback?
- Які performance budgets потрібні для greedy startup, lazy first read, index memory usage і serialized writes?

## Закритий P3-DG1 baseline

- Driver-owned outcome-definite transaction commit є єдиним metadata+journal semantic commit path; persistent journal committed-only.
- Journal sequence є positive decimal string від `1`, contiguous/gap-free; cursor/gap integrity semantics прийняті, physical encoding і retention deferred.
- Operation/actor identity, full write-set fingerprint idempotency, lock/cancellation baseline, recovery-before-ready і coherent startup scan прийняті.
- Deterministic full fake має відтворювати transaction, cut-point, crash/fresh-composition, sequence/idempotency/integrity й recovery contracts; concrete durability proof лишається P4 gate.

## Закритий P3-DG2 baseline

- Dense order/root append/insertion move/coarse hierarchy lock/atomic prepared set accepted.
- Leaf soft delete/default invisibility accepted; restore/include-deleted/cascade/purge deferred.
- Full-replace Marks, namespace-replace/delete KV, batch index і typed integrity fail-close accepted.
