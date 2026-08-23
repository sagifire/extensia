# Roadmap

Status: accepted implementation sequence
Target Release: `0.1.0`
Updated: 2026-08-23

Цей roadmap задає компактну послідовність залежностей і decision gates без календарних обіцянок. Детальний rolling-wave backlog, complexity rubric і dependency register зберігаються в [planning report TASK-07.26-0003](../reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md); implementation tasks створюються поступово після gate попередньої хвилі.

## Повторюваний цикл хвилі

Кожна суттєва хвиля проходить однаковий цикл:

`дослідження/дизайн -> реалізація observable vertical slice -> ризик-орієнтована стабілізація/незалежний аудит -> human gate`.

- Horizontal foundations реалізуються just-in-time для найближчого vertical slice й не обходять Journal/Index/Registry/Recovery guarantees.
- Наступна хвиля не активується до human gate попередньої.
- Паралельність дозволена лише там, де її явно показує planning report; інтеграційні та correctness-critical gates лишаються послідовними.

## Фаза 0 — Базовий стан проекту

Стан: done.

- Очистити репозиторій від попередньої реалізації.
- Розгорнути Product, Domain і Technical Memory з актуальних IoC-специфікацій.
- Зафіксувати source-of-truth policy, release semantics та відкриті design questions.

Gate: пройдений у `TASK-07.26-0002`; пам'ять прийнята людиною, draft-частини не видані за стабільний API. 2026-07-10 користувач виконав окремий phase-level human review і явно підтвердив завершення фази 0.

## Фаза 1 — Контракти й каркас композиції

Стан: done — internal `P1-WP4`, stabilization `BP1-05`, independent audit `BP1-06` і Phase 1 human gate завершені та прийняті людиною.

Wave IDs: `P1-WP1` tooling/package -> паралельні `P1-WP2` domain contracts і `P1-WP3` IoC composition -> `P1-WP4` internal lifecycle slice -> `P1-STAB`. Original application-facing `P1-VS1` superseded у цій хвилі та deferred до owner gate public config/storage integration.

- Реалізувати прийнятий у ADR-0006 TypeScript/build/test/package baseline для Node.js 24 ESM package.
- Виконати executable conformance/implementation перевіреного `@sagifire/ioc@0.0.2` API проти internal composition contracts.
- Реалізувати доменні data contracts та перевірки чистих інваріантів.
- Побудувати Extensia Composition Root, мінімальні internal lifecycle modules/contributions і Runtime Controller з deterministic storage-shaped lifecycle fixture без Storage Driver contract claims.
- Додати composition diagnostics і fresh-composition test harness.

Gate: runtime graph валідовується до startup, стає immutable після `compose()`, internal start/rollback/stop/cleanup/disposal перевірені tests, а root package лишається encapsulated без accidental exports. Successful public construction/start не входить у BP1-04.

Phase 1 exception: BP1-04 закриває architecture-enabling internal `P1-WP4`, але не original public `P1-VS1`. Human gate Phase 1 від 2026-07-10 явно прийняв це deferred scope: public/application-facing `P1-VS1` superseded і deferred до owner gate public config/storage integration; historical planning report не переписується.

Allowed parallelism: до завершення `P1-WP1` — лише read-only research і fixture preparation; після tooling gate `P1-WP2` та `P1-WP3` можуть виконуватися паралельно.

## Фаза 2 — Read-only Resource slice та API foundation

Стан: Phase 2 завершена й прийнята explicit human gate 2026-07-10. P2-DG1 applied; BP2-01A/BP2-02/BP2-03 завершені; P2-VS1 реалізований у `BP2-04 / RUN-001`; P2-STAB завершений у `BP2-05 / RUN-001`; independent BP2-06 audit отримав repeated meta-review `REVIEW_READY`, а recommendation `pass` прийнята людиною. Phase 3 owner design gate `BP3-01 / P3-DG1` завершений і прийнятий; `APP-07.26-0024-001` published, implementation не активована.

Wave IDs: `P2-DG1` мінімальний read API contract -> `BP2-01A` materialized shared seam -> паралельні `P2-WP2` Core/Index і `P2-WP3` Facade Registry -> `P2-VS1` public Resource read -> `P2-STAB`.

- Реалізувати Core Extension Port read path для `Resource` поверх read-only/fake Storage Driver.
- Реалізувати мінімальний Hot Metadata Index для Resource lookup і tree projection без claims про durable state.
- Реалізувати спільний Facade Provider/Registry mechanism і system extension `extensia.default-api` з `query` та `storage` facades.
- Заморозити registry до ready state; `query` надає reads, а `storage` commands завершуються explicit normalized failure, доки write foundation не готовий.
- Провести read-only vertical scenario через public facade boundary.

Gate: жодна write-операція не може повернути success; query не пише Journal; DTO є snapshots; registry frozen; public API не розкриває IoC runtime.

`P2-DG1` застосував лише exact public contract у `technical/public-read-contract.md` і ADR-0007. BP2-02/BP2-03 не активуються до published `APP-07.26-0021-001`, `done` BP2-01A та окремого activation decision кожної task; після цих gates вони можуть виконуватися паралельно. Послідовність наступних waves не змінена.

## Фаза 3 — Перший journal-backed Resource write slice

Стан: Phase 3 завершена й прийнята whole-task human review: P3-DG1/P3-DG2 applied, P3-WP1/P3-WP2, Resource create/update, P3-VS3 hierarchy/order/move, P3-VS4 Marks/KV, P3-VS5 leaf soft delete і final P3-STAB виконані; restore лишається deferred.

Wave IDs: `P3-DG1` -> `BP3-01A` -> parallel `P3-WP1/P3-WP2` -> `P3-VS1` -> `P3-VS2` -> `P3-STAB1` -> `P3-DG2` -> sequential `P3-VS3` move/foundation -> `P3-VS4` Mark/KV -> `P3-VS5` leaf delete -> final `P3-STAB`. Restore deferred.

Application gate: write contract/ADR-0008/APP-0024 та order-delete-Mark-KV contract/ADR-0009/APP-0032 published; sequential P3-VS3, P3-VS4, P3-VS5 і final P3-STAB gates completed/accepted.

- Розширити deterministic fake Storage Driver до full capability model для failure-injection tests.
- Реалізувати Async Lock Queue, operation scopes, Operation Engine, storage-level write lock, мінімальний Operation Journal і recovery path до ready state.
- Реалізувати accepted root append/move foundation, exact Mark/KV replacement і leaf soft delete через спільний facade/Core pipeline; restore/include-deleted/cascade/purge не входять у Phase 3.
- Публікувати кожну successful operation тільки після committed journal entry й оновлювати Hot Metadata Index тільки після commit.

Gate: кожний Resource write journal-backed; committed entry є publication boundary; local index оновлюється post-commit; lock/recovery/readonly/failure paths покриті tests; ручного підключення facades немає.

## Фаза 4 — Assets і перший concrete durable Storage Driver

Стан: done — P4-DG1/P4-DG2 approved/applied; P4-WP1 concrete driver, P4-VS1 Resource durability, P4-VS2 Asset metadata lifecycle, P4-VS3 internal bounded upload bytes/finalization і P4-STAB cross-phase stabilization accepted. Explicit Phase 4 human gate пройдений; Phase 5 не активована.

Wave IDs: паралельні `P4-DG1` concrete storage protocol і `P4-DG2` Asset contracts; `P4-DG1 -> P4-WP1` concrete driver -> `P4-VS1` Resource durability, після чого гілка приєднує погоджений `P4-DG2` перед `P4-VS2/VS3` Asset metadata/upload -> `P4-STAB`.

- Реалізовано first/default internal `embedded-transactional/local-sqlite-v1` profile з atomic SQLite persistence, committed journal, exclusive storage session і recovery primitives у P4-WP1.
- Реалізовано повну Resource durability parity у P4-VS1 та Asset metadata invariants, internal/external assets, primary/reassign/delete й staged generation persistence у P4-VS2.
- P4-VS3 реалізувала exact opaque adapter як first deliverable, internal begin/stage/finish/abort/read, last-ready replacement semantics, atomic payload actions та bounded recovery/pressure/package evidence через той самий Core/Operation Engine/SQLite authority.
- P4-STAB закрила fresh fake-vs-SQLite conformance, Resource/Asset metadata/payload/journal crash-restart/cut-point, cleanup/readonly/failure/lock, package reproducibility та architecture/public-boundary gates без production feature change. Ordinary public bytes/file API, broader platform/performance і destructive power-loss certification залишаються окремими future owner gates та не входять у завершену Phase 4.

Gate: successful operation означає durable committed state на concrete storage; incomplete artifacts не стають visible; restart recovery та `readonly` behavior покриті tests.

## Фаза 5 — Повний read model і синхронізація кількох instances

Стан: P5-RS1 accepted; P5-DG1/P5-DG2 exact targets accepted/applied; P5-WP1, P5-HARD1, P5-VS1 і P5-VS2 accepted; TASK-0060/FIX-001 applied, TASK-0061/FIX-001 applied. P5-STAB/P5-AUD1 inactive.

Wave IDs: `P5-RS1` + `P5-DG1` + `P5-DG2` -> `P5-WP1` generation/coordinator foundation -> `P5-HARD1` internal retry/single-flight/lifecycle -> `P5-VS1` lazy + public explicit refresh/config -> completed `P5-VS2` concrete multi-instance sync/polling/contention -> pending `P5-STAB` -> `P5-AUD1` -> human gate.

- P5-WP1 реалізувала одну coherent generation для Resource/tree, Asset owner/primary/lineage і Mark projections та structural-sharing local publication.
- P5-VS1 реалізувала `greedy` complete і `lazy` selective internal coverage з complete-only existing Resource query success та exact internal Asset-owner/Mark-global selector results; Mark-global потребує exact selector capability й не запускає implicit full scan, а unknown дає explicit query-unavailable/read failure без partial success.
- P5-VS2 реалізувала profile-owned SQLite full/readonly coherent observation, remaining-budget lexical range/delta/rebuild, lifecycle-owned polling і rerunnable process evidence з measured lock wait/retry, phase-aligned polling actors, operation families та readonly zero-write.
- P5-HARD1/P5-VS1/P5-VS2 використовують один volatile cursor/coordinator actor, experimental `query.refresh()`, bounded startup/refresh retry і safe inspection; generic driver polling без concrete capability fail-ить до open.
- Initial same-host two-process `full/full`/`full/readonly` support лишається gated P5-STAB/P5-AUD1/human gate; current contention evidence підтримує designated writer як recommendation, а не support claim.

Gate: local read-after-write гарантовано; partial query success відсутній; greedy/lazy completeness, journal-order cross-process visibility, honest observed-through stale boundary, retry exhaustion і lifecycle перевірені executable evidence.

## Фаза 6 — Базова extension ecosystem

Стан: planned.

Wave IDs: `P6-DG1` extension contracts -> `P6-WP1` graph/lifecycle -> `P6-VS1/VS2` custom facade і hooks -> `P6-DG2` advanced IoC API decision -> `P6-STAB`.

- Стабілізувати plugin descriptor, dependency graph і lifecycle ordering.
- Розширити спільний Facade Provider/Registry mechanism на user plugins і custom facades.
- Реалізувати hooks, ownership cleanup, optional/required failure policy та extension diagnostics.
- Додати custom facade examples/fakes і окремо вирішити статус advanced IoC Extension Module API.

Gate: default і custom facades створюються одним mechanism детерміновано, registry frozen, missing dependencies fail before ready state, lifecycle cleanup перевірений.

## Фаза 7 — Стабілізація релізу `0.1.0`

Стан: planned.

Wave IDs: `P7-WP1` compatibility freeze -> `P7-WP2` docs/migrations і `P7-WP3` package matrix -> `P7-AUD1` independent release audits -> `P7-STAB`.

- Звірити реалізацію з product/domain/technical memory і актуальними source specifications.
- Зафіксувати public compatibility boundaries, experimental APIs і migration notes.
- Провести architecture health audit, failure/recovery audit та package-level release checks.

Gate: критерії релізу визначені окремою release task; відомі draft-рішення або стабілізовані, або явно позначені experimental/deferred.

## Після `0.1.0`

- Dynamic extensions після startup.
- Advanced public/experimental IoC extension modules після окремого compatibility gate.
- Додаткові official Storage Drivers і system facades: `filesystem-native` після native/sidecar feasibility gate та `client-server-transactional` PostgreSQL/MySQL після vendor design gate.
- Driver-specific reconcile для direct external modifications.
- Масштабування за межі базової single-writer-per-storage model лише після окремого architecture research.
