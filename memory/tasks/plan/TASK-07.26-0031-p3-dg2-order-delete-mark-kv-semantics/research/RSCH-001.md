# RSCH-001: Exact order, delete, Mark і KV semantics

Status: accepted
Task: TASK-07.26-0031 / P3-DG2
Execution Mode: autonomous-research
Prepared: 2026-07-11
Activated: 2026-07-11
Agent Role: Agent Executor
Reviewer Role: Agent Reviewer (independent subagent після explicit delegation)
Review Method: independent-subagent
Auditor: `/root/p3_dg2_independent_audit`
Review Limitation: none
Task Status After Research: review

## Дослідницьке питання

Які exact domain, public API, concurrency, semantic-commit, journal, index-publication й recovery contracts мають керувати Resource move/order, delete/optional restore, Mark і KV writes поверх прийнятого P3 foundation, щоб наступні vertical slices були реалізовними без другого write path, concrete driver assumptions або прихованого розширення scope?

## Вхідний контекст

- `memory/product/requirements.md`, `memory/product/roadmap.md`.
- `memory/domain/rules.md`, `memory/domain/open-questions.md`, `memory/domain/target/model.md`, `memory/domain/current/implementation-state.md`.
- `memory/technical/architecture.md`, `memory/technical/open-questions.md`, `memory/technical/public-read-contract.md`, `memory/technical/write-journal-recovery-contract.md`.
- Relevant accepted ADR, насамперед ADR-0005 і ADR-0008, та application artifact `APP-07.26-0024-001`.
- `P3-DG1` research/report/fixation як protocol baseline; `P3-STAB1 / RUN-001` result як factual stabilized implementation evidence.
- Актуальні code/tests shared write port, Operation Engine, deterministic fake, create/update та Hot Metadata Index.
- Draft `memory/references/extensia-v2/domain-model-v2.md`, `extension-and-api-model-v2-ioc.md`, `runtime-architecture-v2-ioc.md` лише як non-authoritative design inputs згідно source policy.
- `memory/knowledge/package-index.md` і PDADM MVP Reglament package для autonomous design workflow.

## Межі run

- Не змінювати production source, tests, dependencies, package exports або runtime behavior.
- Не активувати й не створювати implementation runs для `P3-VS3`, `P3-VS4`, `P3-VS5` або final `P3-STAB`.
- Не визначати Asset/upload, concrete storage layout/durability, External Change Sync, plugins/hooks або release-wide compatibility.
- Не трактувати draft source signatures як accepted public API.
- Не застосовувати canonical product/domain/technical зміни в цій design task; ізолювати їх у `FIX-001`, якщо proposal потрібен.
- Не послаблювати accepted P3 semantic commit, committed-only journal, recovery-before-ready, detached DTO або single-pipeline boundaries без explicit finding і owner decision.

## План дослідження

1. Відтворити factual P3-STAB1 baseline і скласти traceability map open questions -> requirements -> accepted contracts -> code seams.
2. Побудувати інваріанти tree/sibling groups і альтернативи move/order normalization, включно з numeric range, root, cycle/orphan, no-change та multi-resource atomicity.
3. Побудувати delete/restore state machine з children, visibility, flags, timestamps, repeated operations, move conflicts і committed read-back.
4. Порівняти replace, patch і explicit delete alternatives для `setMarks`/`setKV`; визначити identity, validation, limits, deterministic ordering/serialization та no-change.
5. Спроектувати exact conceptual application/Core/driver contracts, normalized errors, lock keys/order, write-set, fingerprint, journal payload і prepared index delta для кожної operation.
6. Перевірити failure cuts, crash/fresh recovery, concurrent schedules, readonly/lifecycle behavior і compatibility з чинними create/update/read surfaces.
7. Сформувати task-ready decomposition `P3-VS3`, `P3-VS4`, `P3-VS5`, final `P3-STAB` із dependency gates без activation.
8. Підготувати detailed report, за потреби FIX-001, виконати upward consistency, language й architecture-pressure gates.
9. Перед review-ready запустити незалежний subagent audit після explicit delegation; закрити або явно винести всі findings.

## Обов'язкові рішення

- Move input model і meaning requested `order_index`; canonical sibling ordering/normalization та overflow/range policy.
- Atomic write-set і lock discipline для source/destination parents, moved Resource і affected siblings.
- Delete children policy, query/tree visibility, repeated delete й relation `is_deleted` до `locked`/`hidden`.
- Include/defer restore; exact restore target/order/conflict semantics у разі include.
- `updated_at` propagation для hierarchy, delete, Mark і KV mutations.
- `setMarks` replace/patch/delete model, Mark validation/limits/order і duplicate handling.
- `setKV` namespace replace/patch/delete model, validation/limits/order і empty container cleanup.
- Journal operation kinds/payload hints, full write-set fingerprinting, recovery/index publication і committed warning behavior.
- Exact public methods, DTO, normalized errors, experimental compatibility labels і read-back behavior.
- Downstream ownership та activation gates для `P3-VS3`…final `P3-STAB`.

## Required output

- Оновлений task-local `RSCH-001.md` із recommendation, evidence, risks, self-review і memory sync.
- `memory/reports/research/2026-07-11-extensia-order-delete-mark-kv-semantics.md` з detailed contracts, alternatives й matrices.
- Direct update `memory/reports/research/index.md` після створення report.
- `fixations/FIX-001.md` та `fixations/index.md`, якщо recommendation змінює canonical memory; proposal не застосовується.
- Independent audit evidence з verdict і disposition findings.

## Green gate

- Усі acceptance criteria `task.md` покриті exact рішенням або explicit blocker/owner choice.
- Є traceability, alternatives register, API/type snapshot, invariant/state-transition, failure/recovery та concurrency matrices.
- Немає assumptions про concrete storage layout, Asset/plugins/hooks або draft API authority.
- Немає другого write path, partial sibling commit, index-as-authority або public internal handles.
- Downstream tasks є task-ready, але не activated.
- Upward consistency states зафіксовані як `updated`, `not needed`, `proposed` або `blocked`.
- Language gate і architecture-pressure review пройдені.
- Independent audit не має відкритих P0-P3 findings.

## Stop conditions

- Accepted P3 contract суперечить необхідній atomic multi-resource semantics і потребує owner revision.
- Restore, delete children policy, limits або public compatibility мають кілька істотно різних продуктово допустимих варіантів без достатнього authority для вибору.
- Correctness потребує concrete driver layout, Asset semantics, hooks/plugins або іншого owner gate.
- Independent reviewer недоступний або delegation не підтверджена перед review-ready.

## Підготовчий стан

Research run був підготовлений до activation без design result. Користувач активував його 2026-07-11 і дозволив independent subagent review; execution contract вище збережений як історія підготовки.

## Recommendation R1

Підготовлено [detailed report](../../../../reports/research/2026-07-11-extensia-order-delete-mark-kv-semantics.md) і [FIX-001](../fixations/FIX-001.md) із такими exact рішеннями:

- dense active sibling order `0..n-1`, explicit insertion-index move і hierarchy-aware root create append;
- один atomic sorted multi-Resource write-set для move/delete normalization;
- correctness-first process-local `resource-hierarchy` lock без acquisition/replanning під storage session;
- leaf-only soft delete, default tombstone invisibility й restore deferred;
- full-replace `setMarks`, namespace-replace/delete `setKV`, exact validation/limits/order/no-change;
- common operation timestamp для кожного реально staged Resource, без artificial parent timestamp bump;
- existing one Core port/Operation Engine/driver semantic commit/journal/index publication/read-back/fail-close boundaries;
- sequential task-ready P3-VS3, P3-VS4, P3-VS5 і final P3-STAB без creation/activation.

## Evidence і traceability R1

- Accepted product/domain/runtime requirements, ADR-0005/0008, canonical P3 contract і APP-07.26-0024-001 відтворені.
- P3-DG1 detailed design та P3-STAB1 factual result використані як protocol/current evidence.
- Current source seams перевірені у Core write runtime, write port, Operation Engine/lock queue, full-driver protocol, fingerprint/journal integrity й greedy index.
- Draft domain/API/runtime sources використані лише як non-authoritative inputs; historical separate journal append wording не переносилось поверх ADR-0008.
- Report містить alternatives register, exact public contracts/errors, hierarchy/delete/Mark/KV invariants, examples, failure/recovery/concurrency/traceability matrices й downstream decomposition.
- Production source, tests, dependencies, exports і runtime behavior не змінені.

## Risks і architecture pressure R1

- Coarse hierarchy lock зменшує local concurrency, але усуває stale preflight/replanning inversion; exclusive storage session уже задає sequential commit baseline.
- Experimental root create order refine-иться з always-zero до append; persisted pre-gate migration не promised чинним project boundary.
- Leaf-only delete та deferred restore deliberate bounded scope; cascade/include-deleted/purge потребують future owner gate.
- Multi-Resource semantics потребують bounded batch index/protocol union extension, але чинний transaction `stageResource`/one commit достатній; нового write path або driver primitive не потрібно.
- Stop conditions task contract не спрацювали: facade-direct driver/index/journal, partial commit, public handles, Assets/hooks/sync і concrete layout не запропоновані.

## Memory sync R1

- Product memory: `proposed` — bounded roadmap sync лише через FIX application; requirements unchanged.
- Domain target memory: `proposed` — exact order/delete/Mark/KV rules через FIX; current implementation `not needed`.
- Technical memory: `proposed` — new contract/ADR і bounded sync через FIX.
- Knowledge memory: `not needed` — methodology package не змінюється.
- Task memory: `updated` — activation, RSCH result, FIX proposal та indexes.
- Reports: `updated` — detailed report і direct research index.
- `memory/state.md` / `tasks/plan/progress.md`: `updated` factual activation; review status pending audit.
- Top-level README/index: `not needed` — entrypoints/structure не змінені.
- Follow-up tasks: `proposed` task-ready у report, але не created/activated.

## Self-review state R1

Status: prepared-for-independent-audit
Review Method: pending-independent-subagent
Review Limitation: none

- Completion quality: усі acceptance areas мають exact рішення або explicit defer; report/FIX/task scope aligned.
- Scope discipline: лише research/task/report/proposal memory змінена; canonical target application і production відсутні.
- Shortcuts: partial sibling commit, clamp order, cascade implicit behavior, generic patch/delete sentinels і raw driver handles відхилені.
- Language gate: author text українською; API names, codes, statuses і technical terms є дозволеними винятками.
- Architecture pressure: high but localized; coarse hierarchy serialization є explicit trade-off, не прихований workaround.
- Independent audit: pending; result не є review-ready до closure всіх P0-P3 findings.

## Independent audit R1 і remediation R2

Review Method: independent-subagent
Auditor: `/root/p3_dg2_independent_audit`
Initial Verdict: `NOT_REVIEW_READY`
Initial Open: P0 0 / P1 0 / P2 3 / P3 0

Findings:

- P2 public API/error snapshot не визначав compile-valid per-method unions і exact precedence.
- P2 detected pre-commit durable/index integrity defects не мали normalized result та fail-close lifecycle disposition.
- P2 pre-session plan `affected_resources` був ambiguous відносно exact dynamic move/delete sibling write-set.

Remediation R2:

- detailed report section 11 тепер містить повний `ExtensiaErrorCode`, exact `ResourceMoveError`/`ResourceDeleteError`/`ResourceMarksError`/`ResourceKVError` та stage-by-stage precedence;
- додано `STORAGE_INTEGRITY_FAILED`, safe diagnostic, engine close, facade unpublication, Module failed, no same-instance restart і fresh recovery/revalidation semantics; post-commit warning contract не змінено;
- pre-session operation plan тепер має non-authoritative `resource_hints`; exact immutable `PreparedResourceWriteSet` формується під session до staging й є єдиним source для sorted staging/fingerprint/journal IDs/changes без lock replanning.

Repeated audit R2: `NOT_REVIEW_READY`; P0 0 / P1 0 / P2 2 / P3 0. Exact per-method unions/precedence та dynamic prepared write-set finding closed. Remaining P2: `SafeDiagnostic.stage`/existing create-update union inconsistency й відсутній typed acquire/read/index → engine → runtime fault seam з P3-VS3 ownership.

Remediation R3:

- compile snapshot додає `operation` diagnostic stage і `STORAGE_INTEGRITY_FAILED` до existing `ResourceWriteError`, тому create/update та new methods мають coherent public coverage;
- adapter-level `ResourceRuntimeIntegrityError`, distinct `OPERATION_INTEGRITY_FAILED`, no-throw lifecycle-owned `RuntimeFaultPort`, exact engine/Core mapping і ordinary acquire/I/O separation визначені;
- P3-VS3 scope/acceptance/verification тепер прямо володіють typed integrity implementation та failure-injection evidence.

Repeated audit R3: `NOT_REVIEW_READY`; P0 0 / P1 0 / P2 1 / P3 0. R2 findings closed, але виявлено cleanup-window race: fault-port unpublication була описана після awaited cleanup.

Remediation R4:

- engine intake close і no-throw `RuntimeFaultPort.failIntegrity()` тепер відбуваються в одному synchronous no-await turn одразу після typed detection, до abort/session/lock cleanup;
- P3-VS3 acceptance/verification включає barrier-controlled delayed-cleanup race: concurrent stale/new call має отримати `MODULE_NOT_READY`, не generic write failure.

Repeated audit R4: `REVIEW_READY`; open P0-P3 none. Reviewer підтвердив synchronous no-await engine/fault-port closure before cleanup, delayed-cleanup `MODULE_NOT_READY` race contract, prior public/typed integrity/prepared-write-set remediation і report/FIX/RSCH alignment.

## Final self-review

Status: review-ready
Review Method: independent-subagent + same-agent remediation
Review Limitation: none

### Якість і повнота

Усі acceptance criteria покриті exact decisions, compile-oriented contracts, alternatives, invariant/state/failure/recovery/concurrency/traceability matrices і task-ready downstream decomposition. Full package baseline gate пройшов: 16/16 test files, 172/172 tests, typecheck, build, lint, format, package, publint, ATTW та installed-tarball smoke.

### Дисципліна обсягу

Production source/tests/dependencies/exports не змінювалися. Canonical product/domain/technical design не applied; він ізольований у audited-proposed FIX-001. Downstream tasks/runs не створені й не активовані.

### Ризики й компроміси

- Coarse hierarchy lock є correctness-first Phase 3 trade-off із explicit performance follow-up gate, не прихованим workaround.
- Experimental create order refinement має persisted-data compatibility risk, але concrete durability/migration ще не promised.
- Leaf-only delete/deferred restore та chosen Mark/KV limits intentionally bounded і compatibility-relevant після application.

### Architecture pressure

Чинний multi-stage transaction і one commit виражають потрібні multi-Resource writes. Bounded batch index, prepared write-set і typed integrity/fault seams розширюють існуючий pipeline; другого engine/journal/driver path, partial sibling commit або facade authority немає. Architecture audit/refactor blocker не потрібен.

### Language і source gates

Canonical author text українською; API names, codes, paths, status values і technical terms є дозволеними винятками. Draft specifications використані як inputs, не authority; accepted ADR-0005/0008 та canonical P3 contract не послаблені.

### Final memory sync

- Product memory: `proposed`; requirements unchanged.
- Domain target memory: `proposed`; current implementation `not needed`.
- Technical memory: `proposed`; accepted P3 contract unchanged цією task.
- Knowledge memory: `not needed`.
- Task/research/fixation/report/index memory: `updated`.
- `memory/state.md` і `tasks/plan/progress.md`: `updated` до review.
- Top-level README/index: `not needed`.
- Downstream tasks: `proposed`, not created/activated.

### Audit summary

Initial P2=3, R2 P2=2 і R3 P2=1 були закриті root-cause remediation. Final R4 `REVIEW_READY`, open P0-P3 none.

## Перевірка людиною

Status: approved
Reviewed: 2026-07-11
Reviewer Role: Product Lead Hat / System Engineer Hat / Agent Operator Hat
Approval Scope: whole-task-review
Approval Source: явне повідомлення користувача «Я зробив ревю, можеш завершувати задачу. Також я підтверджую всі запропоновані рішення дизайну.»

Research/design result accepted. FIX-001 отримала окреме fixation-only approval і owner TASK-0032 prepared; це не є canonical application або downstream activation.
