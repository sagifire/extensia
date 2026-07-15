# Контекст виконання: RUN-001

Related Task: [P4-WP1 / TASK-07.26-0049](../task.md)
Prepared: 2026-07-15
Prepared By: primary agent `/root`
Previous Run: none

## Мета run

Перетворити accepted/applied `P4-DG1` protocol на production-quality internal `local-sqlite-v1` adapter через Node.js 24 `node:sqlite`, довести exact commit/lock/recovery/readonly/integrity behavior на bounded local-filesystem profile і не змішувати driver foundation з downstream Resource/Asset vertical slices.

## Effective requirements

1. Використати built-in `node:sqlite`; нова production dependency, native addon або alternate SQL abstraction не входять у scope.
2. Зберегти один production semantic path: existing Core/Operation Engine → `FullResourceDriverAdapter` → SQLite transaction; deterministic fake лишається oracle/conformance fixture.
3. Одна SQLite durability domain є authority для Resource snapshots, operation idempotency та committed journal; external blob і independent journal paths заборонені.
4. Settled resolve/reject truth, canonical journal sequence, exact write-set fingerprint та operation-ID idempotency не послаблюються через physical failures.
5. Full ready публікується лише після recovery, format/schema/integrity verification і coherent scan під тією самою storage lease.
6. Readonly path не виконує hidden mutation; unsupported, unknown або corrupt state fail-close.
7. Support claim обмежується executable certified environment; неперевірені profile не позначаються supported.
8. Asset semantics, public API і Phase 5 concerns не materialize-яться цим run.

## Пов'язана пам'ять

- [P4-DG1 task](../../TASK-07.26-0039-p4-dg1-concrete-storage-protocol/task.md)
- [P4-DG1 application artifact](../../TASK-07.26-0039-p4-dg1-concrete-storage-protocol/application-artifacts/APP-07.26-0039-001.md)
- [ADR-0010](../../../../technical/decisions/ADR-0010-local-sqlite-storage-protocol.md)
- [Concrete storage protocol report](../../../../reports/research/2026-07-12-extensia-concrete-storage-protocol.md)
- [Storage Driver taxonomy](../../../../reports/research/2026-07-12-extensia-storage-driver-taxonomy.md)
- [Write, Journal і Recovery Contract](../../../../technical/write-journal-recovery-contract.md)
- [Technical Architecture](../../../../technical/architecture.md)
- [Technical Rules](../../../../technical/rules.md)
- [Roadmap](../../../../product/roadmap.md)
- [Asset Contract](../../../../technical/asset-contract.md)

## Current source seams

- `src/storage/full-resource-driver-adapter.ts` — єдиний internal adapter boundary.
- `src/storage/resource-write-protocol.ts` — session/transaction/journal contracts.
- `src/storage/deterministic-full-resource-driver.ts` — semantic oracle, failure/cut-point model і conformance baseline.
- `src/storage/resource-journal-integrity.ts` — canonical sequence, fingerprint, draft/entry validation.
- `src/storage/resource-recovery-coordinator.ts` — recovery-before-ready integration.
- `src/storage/resource-runtime-integrity.ts` — runtime fail-close seam.
- `src/public/full-resource-driver.ts` — opaque driver-author handle; не розширювати без окремого owner decision.
- `src/core/resource-write-runtime.ts` і `src/operations/operation-engine.ts` — чинний single write pipeline; physical SQLite knowledge сюди не переносити.

Exact module decomposition визначається implementation map на початку active run; вона не повинна створити parallel port або public surface.

## Заплановані результати

1. Зафіксувати traceable implementation map: ADR/report invariant → production module → test/evidence.
2. Реалізувати root/profile capability gate, SQLite connection lifecycle, exact schema/configuration та safe error taxonomy.
3. Реалізувати adapter/session/transaction operations, canonical serialization, journal allocation/read і one-transaction commit.
4. Реалізувати exclusive lease discipline, recovery-before-ready, readonly no-write та coherent release/cleanup.
5. Реалізувати outcome-definite COMMIT reconciliation і runtime intake/fail-close integration для unsettled storage.
6. Додати deterministic fault injection, corruption fixtures, child-process cut-point/restart і multi-process lock harnesses.
7. Відтворити existing semantic conformance на concrete adapter та зібрати bounded Windows NTFS capability/crash evidence.
8. Виміряти payload seam memory/size/latency/journal growth без активації Asset semantics.
9. Виконати full package gates, memory-impact review, self-review та independent audit перед human review.

## Перевірки

- targeted Vitest suites для schema/config/codec/reconciliation/integrity;
- shared adapter/Core contract matrix проти deterministic fake і SQLite;
- child-process kill/reopen cases для pre-commit, in-commit, committed-before-receipt і committed-before-Core-publication;
- two-process contention/timeout/crash-release/lock retention;
- readonly before/after filesystem snapshots та recovery-required negative case;
- malformed/corrupt format/schema/journal/resource/payload fixtures;
- exact SQLite errors/fault wrapper matrix;
- supported/unsupported filesystem capability probes;
- payload seam performance/memory/journal-growth evidence;
- `npm run check`, package smoke/consumer gates і byte-identical double pack.

## Обмеження

- Не змінювати accepted semantic contract, public facade/root exports або IoC boundary для зручності implementation.
- Не додавати ORM, query builder, external SQLite binding або second storage abstraction.
- Не використовувати WAL, external blob publication, separate journal або PID/time-based lock без нового design/ADR approval.
- Не заявляти Linux, network filesystem, power-loss або multi-instance support без exact executable certification.
- Не переносити Asset lifecycle, upload transport чи P4-VS1 Resource-parity ownership у цей run.
- Після activation цей context заморожується; зміна effective requirements потребує нового run.

## Умови зупинки

- `node:sqlite` на чинному package engine range не дає required transaction/readonly/timeout/introspection capability.
- `locking_mode=EXCLUSIVE`/VFS lock не тримається через COMMIT і Core publication або не звільняється після process crash на target profile.
- Outcome COMMIT неможливо reconcile-ити без ambiguous reject/resolve або другого authority.
- Required readonly/recovery/integrity behavior потребує hidden write або automatic repair.
- Реалізація вимагає зміни accepted architecture, public API, semantic port або external blob/journal path.
- Exact target environment для required process/crash evidence недоступне: не симулювати certification unit fake-ом; зафіксувати evidence blocker.
- Synchronous API/performance evidence показує неприйнятний unbounded event-loop або memory pressure, який не можна усунути в чинному design boundary.

## Ризики та припущення

- Припускається Node.js `>=24`, але exact minor capability перевіряється, а не вгадується.
- Proposed first certificate — Windows 11 local NTFS, one host/one full writer; до green proof це target, а не current support claim.
- Persistent physical unavailability може зупинити liveness; safety/definite settlement має пріоритет.
- SQLite-resident future payload chunks залишаються opaque capability seam; доменне ownership належить P4-DG2/P4-VS3.
- Незалежний audit є acceptance gate. Якщо політика інструмента вимагатиме explicit delegation approval, active run має запросити його до audit, а не підміняти same-agent review.

## Memory impact

- Task/run/progress/index/state lifecycle updates є operational і не потребують recursive fixation.
- Реалізаційні зміни accepted architecture не потребують `FIX-*`, якщо canonical current-state claims не оновлюються до approval.
- Нові design decisions, support claims або змістові зміни product/domain/technical memory готуються exact `FIX-*` і застосовуються лише після human approval.
- Перед review перевірити upward consistency: `state.md`, domain current implementation state, roadmap, architecture/rules, ADR-0010, open questions та indexes.

## Зміни від попереднього run

Перший run; попереднього run немає.
