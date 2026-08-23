# Відкриті технічні питання

Updated: 2026-07-17

## Закритий Phase 1 baseline

- Exact implementation dependency — `@sagifire/ioc@0.0.2`; фактичні capabilities й Extensia-owned lifecycle boundaries зафіксовані в ADR-0006.
- TypeScript/build/test/package baseline для Node.js 24 ESM library зафіксований у `technical/stack.md` та ADR-0006. Version upgrades лишаються окремими dependency tasks.

## Composition і package structure

- Який остаточний public config за межами applied Phase 2 readonly `{ storage: { driver } }`: окремі `plugins` і `extensions` чи одна normalized application-facing collection?
- Які IoC tokens є internal, які можуть стати public/experimental extension tokens, і як версіонувати їхні IDs?
- Де остаточно живе Facade Registry за межами applied Phase 2 Module-owned lifecycle/freeze/provenance boundary: у runtime module чи extension layer після Core startup?
- Чи входить Advanced IoC Extension Module API у `0.1.0`, чи лишається deferred/experimental?

## Runtime і storage

- Які додаткові Node.js minor, Windows/NTFS device/cache, Linux ext4/XFS, payload-volume/latency та destructive power-loss profiles треба сертифікувати понад bounded P4-WP1 Windows local NTFS process-crash evidence?

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
- P4-WP1 реалізувала internal `local-sqlite-v1`, P4-VS1 довела повну Phase 3 Resource parity, P4-VS2 — Asset metadata й staged-generation persistence, а P4-VS3 — bounded internal SQLite-resident bytes lifecycle через shared production composition з Windows local fixed NTFS process-crash/restart, readonly/corruption, packed, integrity і pressure evidence. Public/default driver surface, ordinary public bytes/file API, streaming strategy, broader payload/performance/Node/OS/filesystem profiles і destructive power-loss certificates лишаються окремими gates.

## Закритий P4-DG2 baseline

- U-21: lineage same-Resource/ready/acyclic/no-dangling; primary explicit, delete leaves none, reassign non-primary and lineage-free.
- U-22: exact field/MIME/extension/WHATWG HTTP(S) URL validation fixed in `asset-contract.md`.
- U-23: exact `Asset.data` depth/node/container/string/canonical UTF-8 limits fixed; schema evolution remains P7-WP1.
- U-24: internal create staged-only; replacement retains old committed payload; active upload blocks Resource delete.
- `P4-VS3 / RUN-002` завершила exact internal adapter/lifecycle: opaque adapter-epoch handle, bounded stage/read, begin/finish/abort, atomic publish/discard і startup payload integrity через один Core/Operation Engine/SQLite authority.
- `P4-STAB / TASK-0053 / RUN-001` завершила cross-phase conformance, compound-action cut-point/restart, readonly/failure/lock, reproducible package й architecture/public-boundary gates; explicit Phase 4 human gate пройдений без розширення public API або support claims.
- Still open: application-facing bytes/file API design, streaming strategy, broader payload/performance/platform/power-loss certification, P5 global indexes/sync і P7 API/schema freeze.

## Закритий filesystem-native design gate

- `filesystem-native` умовно здійсненний через native helper + immutable graph + one `HEAD`; чистий `node:fs`, PID-time і sidecar-only lock відхилені.
- Жоден profile не certified. `linux-local-ext4-v1` є candidate; process-crash і destructive power-loss evidence мають окремі certificate classes.
- Лишаються відкритими: implementation packaging/limits, exact Linux certificate, Windows/NTFS durability primitive, XFS/APFS profiles і compaction/GC reader safety.

## Закритий client-server transactional design gate

- Один semantic family contract і separate PostgreSQL/MySQL physical profiles; runtime-lifetime full/readonly/migrator advisory gate + transactional control-row lock, one metadata/payload/journal transaction.
- Ambiguous commit має durable operation-ID + lineage reconciliation; changed-lineage absence, unavailable/unknown primary лишають settlement suspended без exact history-preservation certificate; blind retry і false reject заборонені.
- PostgreSQL 16–18 і MySQL 8.4 LTS є uncertified candidates; залишаються відкритими shared conformance foundation, vendor dependency/implementation/certificates, performance limits і optional HA topology certificates.

## Закритий P5-DG1 baseline

- `greedy` ready = complete coherent generation; `lazy` = selective internal coverage з complete-only query success.
- Existing Resource point/direct-tree surface збережений; cache miss без proof є unknown, global query без exhaustive selector unavailable.
- Optional public config path `readModel.loading`, default `greedy`; additions experimental до P7.
- Resource/children, Asset owner, primary, same-Resource lineage reverse і exact Mark lookup належать одній atomic generation.
- Consumer-owned full/readonly observation port не відкриває raw session/transaction/cursor; local delta publication не робить required O(N) rebuild.
- P5-DG2 accepted target owns supported volatile cursor, legacy `static-unsupported` branch, admission-epoch explicit refresh + opt-in polling, bounded startup/refresh retry, topology gate і one local/external coordinator; implementation/support evidence remains pending.

## Закритий P5-DG2 baseline

- Supported branch volatile process-local cursor + atomic generation publication accepted; legacy manual `static-unsupported` has no cursor/head/sync actor; restart rebuild/head capture, durable cursor/checkpoint deferred.
- Exact sequence traversal owns own/external/gap/duplicate/regression/ahead behavior; actor/timestamp diagnostic-only.
- Explicit `query.refresh()` accepted as correctness primitive, default manual; opt-in polling is bounded admission-epoch/coalesced trigger with serialized trailing epoch, notification implementation deferred.
- One full/readonly committed-change observation seam and one publication coordinator own local/external/lazy ordering; readonly zero-write, raw session/cursor public leakage forbidden.
- Supported startup observation and refresh retry bounded; write lock failure caller-managed; SQLite fairness/SLA not claimed.
- Initial two-process `full/full`/`full/readonly` candidates remain unsupported until P5 implementation, stabilization, audit and human gate; designated writer recommended.
- Still open: executable support verdict/budgets, arbitrary instance count, retention/compaction, durable checkpoint, notification implementation, multi-host/HA і broader profiles.
