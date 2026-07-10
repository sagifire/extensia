# RSCH-001: Write, journal і recovery protocol Phase 3

Status: accepted
Task: TASK-07.26-0023 / BP3-01 / P3-DG1
Agent Role: Agent Researcher
Started: 2026-07-10
Execution Mode: autonomous-research
Detailed Report: [Write, journal і recovery protocol Extensia](../../../../reports/research/2026-07-10-extensia-write-journal-recovery-protocol.md)
Review Method: independent-subagent
Auditor: `bp3_01_independent_audit`
Review Limitation: none
Task Status After Research: review

## Питання дослідження

Який exact мінімальний operation/transaction/journal/recovery/index/public-write protocol дозволяє реалізувати Resource create/update на deterministic fake driver із committed journal publication boundary, не визначаючи concrete storage layout і не створюючи другого write path?

## Межі виконання

- Design охоплює P3-DG1 і task-ready decomposition лише до P3-VS1/P3-VS2.
- Canonical product/domain/technical contracts не змінюються цією research task; пропозиція ізолюється у FIX-001.
- Production code, package exports і Phase 3 implementation tasks не змінюються та не активуються.
- P3-DG2, concrete driver Phase 4 і public hooks/plugins лишаються окремими owner gates.

## План дослідження

- Зіставити accepted requirements/ADR, Phase 2 code seams, open questions і authoritative draft inputs.
- Порівняти transaction/commit ownership alternatives й обрати layout-neutral recoverable protocol.
- Спроектувати driver capabilities, operation engine/locks/scopes, journal, recovery та atomic index apply boundaries.
- Спроектувати bounded public create/update contracts і compatibility transition із Phase 2 readonly proof.
- Побудувати state-transition, failure-cut, recovery, concurrency і lifecycle matrices.
- Підготувати detailed report, FIX-001 і task-ready follow-up decomposition.
- Провести independent subagent audit, закрити material findings і виконати self-review/memory gates.

## Джерела та докази

- Accepted product requirements, roadmap, ADR-0004/0005/0007 і public read contract.
- Domain target/current/rules/open questions та technical architecture/rules/open questions/source policy.
- Authoritative draft specifications у `memory/references/extensia-v2/` як design inputs.
- Фактичні Phase 2 contracts і code seams у `src/public`, `src/core`, `src/runtime`, `src/composition` і `src/system-extensions/default-api`.
- Accepted planning report TASK-07.26-0003 і Phase 2 independent audit.
- PDADM MVP 0.4 autonomous-research workflow.

## Поточний стан

Detailed design прийнятий whole-task review, FIX-001 окремо approved fixation-only. Initial material findings remediated; repeated independent audit повернув `REVIEW_READY` без open P0-P3. TASK-0023 завершена як `done`; application/implementation не активовані.

## Ключові знахідки

- Незалежні `writeResource` та `appendJournalEntry` не дають crash-safe publication: semantic commit має належати driver transaction і включати metadata та committed entry.
- `commit()` мусить мати outcome-definite contract: resolve означає committed, rejection гарантує not committed. Ambiguous ordinary failure після фактичного commit заборонений.
- Driver під exclusive storage session призначає canonical decimal-string journal sequence; Timestamp не використовується для ordering.
- Persistent P3 baseline journal містить лише committed entries; incomplete operation state зберігається у driver-private staging/recovery records.
- Core готує validated immutable index delta до commit і publish-ить synchronous no-fail map swap після committed resolve.
- Full-mode startup утримує одну recovery-clean exclusive storage session через recovery, committed scan, index build і journal-head capture до ready; це не допускає mixed startup snapshot між concurrent writers.
- First create/update contract навмисно не імпортує P3-DG2: create створює root Resource з generated defaults, update змінює лише `title`/`description`.
- Generic hook/plugin warning framework не materialize-иться в P3; accepted post-commit ordering зберігається як architecture slot до P6-DG1, а bounded infrastructure warnings покривають лише committed index/cleanup faults.
- Shared protocol seams потребують окремої BP3-01A materialization task до паралельних P3-WP1/P3-WP2, щоб уникнути duplicate/test-only architecture.

## Рекомендація

Прийняти proposal із detailed report: driver-owned write session/transaction як єдиний semantic commit path; consumer-owned Core write port; committed-only journal; recovery-before-ready; index prepare-before/publish-after; bounded experimental root create й own-metadata update. Після окремого approval FIX-001 застосовує окрема owner task; implementation tasks не активуються автоматично.

## Відхилені альтернативи

- Core-controlled dual write metadata then journal — crash gap.
- Journal як єдиний event-sourced truth — змінює accepted Storage Driver source-of-truth model.
- Hot Index як primary state з async flush — порушує durability/index requirements.
- Generic public `execute(command)` або public transaction handle — розкриває Core/internal protocol.
- Parent/order/flags/Mark/KV/delete у першому slice — передчасно обходить P3-DG2.

## Докази design

- Detailed report містить ownership table, exact conceptual TypeScript contracts, create/update pipelines, committed-only journal rationale, startup recovery table, failure-cut matrix, concurrency properties, deterministic fake requirements і task-ready BP3-01A/BP3-02…05 decomposition.
- Factual baseline підтверджено source review і зеленим `npm run check`: 112/112 tests, type/build/lint/format/package/publint/ATTW/packed consumer.
- Production source/package exports не змінені; research змінює лише task/report/proposal/factual workflow memory.
- Accepted requirements/ADR semantics не переписані; draft specifications використані лише як input.

## Архітектурний тиск

Pressure критичний через convergence transaction, journal, locks, recovery, lifecycle, index і public API. Proposal локалізує його одним commit path, layout-neutral driver contract, consumer-owned write seam і bounded API. Stop conditions: independent journal append, facade direct driver/index access, post-commit domain validation, index publication before commit, public raw transaction/IoC або test-only operation engine.

## Незалежний аудит

Review Method: independent-subagent
Auditor: `bp3_01_independent_audit`
Initial Verdict: `NOT_REVIEW_READY`
Initial Open: P0 0 / P1 2 / P2 3
Repeated Verdict: `REVIEW_READY`
Open P0-P3: none

### Початкові findings і remediation

- P1 idempotency не охоплювала staged metadata: закрито canonical SHA-256 fingerprint повного ordered staged write-set; driver верифікує staged content, duplicate operation ID допускається лише з exact draft/fingerprint match.
- P1 post-commit index fault не мав exact public outcome: закрито committed `ResourceWriteSuccess`, bounded warning, atomic engine intake close, Module `started -> failed`/facade unpublication і cleanup через `stop()` без failure/throw rollback claim.
- P2 public contract був incomplete: додано full `ExtensiaErrorCode`, `ResourceWriteError`, success/warning types, readonly/full config union, opaque config handle і experimental driver-author session/transaction/recovery contracts.
- P2 journal gap/cursor behavior був incomplete: sequence тепер starts at `1`, contiguous/gap-free; null/existing/head/ahead/missing cursors і compaction boundary exact.
- P2 create collision retry міг інвертувати lock order: визначено at most three candidates/attempts total із release storage session -> release old local lock -> regenerate/replan; collision третього candidate повертає `RESOURCE_ID_GENERATION_FAILED`.
- Repeated P1 public raw transaction path: full driver config замінено frozen opaque handle через `defineFullResourceDriver`/private WeakMap; callable session/transaction лишаються окремою experimental driver-author definition boundary й не доступні через config/facades/Module.

Same-agent review додатково до initial audit закрив два high-risk gaps до repeated verdict: index delta готується під global session після latest state/publication, а startup recovery/scan/index/head capture утримує одну recovery-clean exclusive session, що виключає lost full-map update і mixed startup snapshot.

### Повторний audit

Repeated auditor підтвердив closure staged-write fingerprint, committed-success/fail-close outcome, compile-complete public union, contiguous cursor rules, exact three-attempt collision budget, opaque driver handle, coherent recovery scan і stale-index protection. P3 wording findings про generic warnings, pipeline result label і driver-author qualification закриті. Нових P0-P3 findings немає.

## Синхронізація пам'яті перед аудитом

- Product memory: `updated` factual P3-DG1 accepted/done status у roadmap; accepted sequence/requirements не змінені, FIX-001 лишається approved/unapplied.
- Domain canonical memory: `proposed` — bounded create/update defaults/validation; current implementation `not needed`.
- Technical canonical memory: `proposed` — new contract/ADR і bounded sync у FIX-001.
- Knowledge memory: `not needed` — methodology package не змінюється.
- Task memory: `updated` — TASK-0023, research/fixation artifacts та indexes.
- Reports: `updated` — detailed report і reports/research index.
- `memory/state.md` / `tasks/plan/progress.md`: `updated` лише factual activation status.
- Top-level README/index: `not needed` — entry points не змінені.
- Follow-up tasks: `proposed`, не created/activated; application потребує окремої owner task після approvals.

## Пропозиція фіксації пам'яті

Status: proposed
Related Fixation: `../fixations/FIX-001.md`
General-Level Memory Impact: proposed

Exact target files і changes уточнюються за результатом design; FIX-001 не застосовується цією task.

## Self-review

Review Method: independent-subagent + same-agent remediation
Review Limitation: none

### Якість і повнота

Task question покрито exact ownership/contracts, API/type snapshot, operation/commit/recovery/index state machines, failure/concurrency matrices і task-ready decomposition до P3-VS2. Recommendation простежується до accepted requirements/ADR та factual Phase 2 seams.

### Дисципліна обсягу

Production source/package exports не змінювалися. Concrete layout/durability, P3-DG2, Assets, sync і hooks не стабілізовані. Factual activation memory оновлена; target design лишився ізольованим у FIX-001.

### Ризики й компроміси

- Full driver і create/update API лишаються experimental до P4/P7.
- Physical feasibility outcome-definite commit є P4-DG1 gate.
- Public idempotency не promised; lost-response retry risk explicit.
- Title/description limits і generic hook warnings deferred.
- Architecture pressure критичний, але stop conditions і prerequisite materialization gate явні.

### Незапланована робота

Independent review виявив staged-write idempotency gap, ambiguous post-commit outcome, incomplete public union, cursor gaps, collision retry inversion і raw transaction exposure. Усі причини виправлені в design; implementation не починалася.

### Подальші задачі

- Після approvals: окрема owner `interactive-memory-update` application task.
- Після stable application artifact: окрема activation BP3-01A.
- BP3-02/BP3-03 активуються окремо після BP3-01A; BP3-04/05 — послідовно за gates.
- P3-DG2 лишається окремою design task після stabilized create/update.

### Контрольний список

- [x] Design goal відповідає scope TASK-0023.
- [x] Sources/authority/assumptions явні.
- [x] Alternatives порівняні без підміни implementation.
- [x] Recommendation випливає з findings.
- [x] Risks, limitations і architecture pressure зафіксовані.
- [x] Detailed report створений та indexed.
- [x] FIX-001 proposal підготовлена й не applied.
- [x] Upward consistency і current/target separation перевірені.
- [x] Language gate пройдено.
- [x] Independent subagent audit repeated `REVIEW_READY`; open P0-P3 немає.

## Перевірка людиною

Status: approved
Reviewed: 2026-07-10
Reviewer Role: Product Lead Hat / System Engineer Hat / Agent Operator Hat
Approval Scope: whole-task-review
Approval Source: явне повідомлення користувача «Я приймаю результат BP3-01, можеш завершити цю задачу.»

Research result accepted; TASK-0023 дозволено завершити як `done`. Окреме погодження FIX-001 має scope `fixation-only` і не є application або activation follow-up tasks.
