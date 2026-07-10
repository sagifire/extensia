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
- Які exact storage-level lock semantics, timeout/cancellation policy та crash behavior?
- Який type й persistence format має journal `sequence` та як гарантується monotonic order між processes?
- Чи journal зберігає `started`/`failed`/`rolled_back` entries у baseline, чи тільки committed entries плюс driver staging state?
- Яка recovery policy для кожного класу partial failure та коли startup має перейти у `failed` замість автоматичного cleanup?
- Який trigger для External Change Sync: polling, driver notification або explicit refresh; яка cursor persistence policy?
- Яка correctness/completeness semantics глобальних queries у `lazy` mode?

## API та extensions

- Які exact method names і input/result DTO входять поза applied Phase 2 `query.getResource`/`query.getResourceTree` та experimental readonly `storage.createResource(input: unknown)`?
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
