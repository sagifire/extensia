# Відкриті технічні питання

Updated: 2026-07-12

## Закритий Phase 1 baseline

- Exact implementation dependency — `@sagifire/ioc@0.0.2`; фактичні capabilities й Extensia-owned lifecycle boundaries зафіксовані в ADR-0006.
- TypeScript/build/test/package baseline для Node.js 24 ESM library зафіксований у `technical/stack.md` та ADR-0006. Version upgrades лишаються окремими dependency tasks.

## Composition і package structure

- Який остаточний public config за межами applied Phase 2 readonly `{ storage: { driver } }`: окремі `plugins` і `extensions` чи одна normalized application-facing collection?
- Які IoC tokens є internal, які можуть стати public/experimental extension tokens, і як версіонувати їхні IDs?
- Де остаточно живе Facade Registry за межами applied Phase 2 Module-owned lifecycle/freeze/provenance boundary: у runtime module чи extension layer після Core startup?
- Чи входить Advanced IoC Extension Module API у `0.1.0`, чи лишається deferred/experimental?

## Runtime і storage

- Який exact native/sidecar protocol зробить `filesystem-native` profile feasible: platform lock, directory durability, fencing, state formats і certification boundary? Owner: `TASK-07.26-0041`.
- Які shared family та vendor-specific profiles потрібні PostgreSQL/MySQL для network-ambiguous commit, locking, schema migration і certification? Owner: `TASK-07.26-0042`.
- Які tested environment/performance limits сертифікують `local-sqlite-v1` після P4-WP1 crash/lock/payload evidence?
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

## Закритий P4-DG1 baseline

- Перший concrete profile — `embedded-transactional/local-sqlite-v1`; одна SQLite durability domain, rollback journal, exclusive connection lease, canonical TEXT sequence і recovery/readonly/integrity gates прийняті в ADR-0010.
- Canonical driver families: `filesystem-native`, `embedded-transactional`, `client-server-transactional`. Shared semantic port не стандартизує family-specific physical layout, SQL або locks.
- Physical implementation/certification ще не виконані; P4-WP1 лишається окремим gate.

## Закритий P4-DG2 baseline

- U-21: lineage same-Resource/ready/acyclic/no-dangling; primary explicit, delete leaves none, reassign non-primary and lineage-free.
- U-22: exact field/MIME/extension/WHATWG HTTP(S) URL validation fixed in `asset-contract.md`.
- U-23: exact `Asset.data` depth/node/container/string/canonical UTF-8 limits fixed; schema evolution remains P7-WP1.
- U-24: internal create staged-only; replacement retains old committed payload; active upload blocks Resource delete.
- Still open: application bytes transport, executable driver upload adapter/performance/certification, P5 global indexes/sync and P7 API/schema freeze.
