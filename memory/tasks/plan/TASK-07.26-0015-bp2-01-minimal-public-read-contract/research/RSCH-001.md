# RSCH-001: Мінімальний public read contract

Status: accepted
Task: TASK-07.26-0015 / BP2-01
Agent Role: Agent Researcher
Started: 2026-07-10
Detailed Report: [Мінімальний public read contract Extensia](../../../../reports/research/2026-07-10-extensia-minimal-public-read-contract.md)

## Питання дослідження

Який найменший public construction/lifecycle/read contract і спільна internal read-port/adapter seam достатні для application-visible P2-VS1, не заморожуючи ширшу draft surface та не вводячи write, plugin або raw IoC boundaries?

## Межі виконання

- Дослідження формує exact proposal, examples, snapshots і matrices за task contract.
- Canonical product/API/technical memory та production code не змінюються цією research task.
- Погоджені в майбутньому зміни застосовує окрема owner `interactive-memory-update` task зі stable application artifact ID.
- BP2-02 і BP2-03 не активуються цим дослідженням.

## План дослідження

- Зіставити accepted product/domain/technical constraints, draft specifications і фактичний Phase 1 baseline.
- Порівняти construction/start/stop, facade access і config/storage integration alternatives.
- Визначити exact public query/storage surface, normalized result/error contracts, detached DTO та readonly rejection semantics.
- Визначити Registry ownership/naming/freeze/publication/diagnostics і lifecycle/failure behavior.
- Спроектувати мінімальну shared Core read-port/request/result та facade adapter seam для BP2-02/BP2-03.
- Перевірити proposal application examples, compile/type narrowing, API snapshot, architecture pressure і memory consistency.
- Підготувати detailed report та ізольовану fixation proposal, провести незалежний audit і закрити material findings.

## Джерела та докази

- Accepted product requirements, roadmap і ADR-0003..0006.
- Canonical target/current domain та technical memory, open questions і source policy.
- Authoritative draft specifications `domain-model-v2.md`, `extension-and-api-model-v2-ioc.md`, `runtime-architecture-v2-ioc.md` як design inputs, не public freeze authority.
- Фактичний Phase 1 код у `src/domain`, `src/composition`, `src/runtime` та root/package export boundary.
- Accepted planning report TASK-0003 і canonical task boundaries BP2-01..BP2-04.

## Результат проєктування

- Construction: side-effect-free `createExtensia(config)` повертає Module, capture-ить driver identity у frozen normalized envelope; composition/driver/facades не активуються до `start()`.
- Lifecycle: explicit six-state module, normalized start/stop results, no restart після `stopped`/`failed`, повний rollback/disposal до failed result; stop закриває intake, drain-ить admitted reads і лише потім dispose-ить runtime.
- Facade publication: dedicated `query()`/`storage()` повертають `null` поза `started`; Registry freeze перед atomic ready publication; generic custom lookup deferred.
- Result model: discriminated `{ok:true,value}` / `{ok:false,error}` із machine-stable code й без nullable illegal combinations.
- Query surface: тільки `getResource(rawId)` та one-level `getResourceTree(rawId)`; invalid raw ID і valid missing Resource мають різні codes, а speculative greedy read failure не нормалізується.
- DTO: чинні canonical UUID v4/Timestamp/deep readonly detached JSON-safe Resource/tree snapshots; children derived із `parent_id` і sorted `(order_index,id)`.
- Storage proof: один `experimental-phase-2` `createResource(input: unknown)` із success `never`; у ready readonly mode повертає `STORAGE_READONLY` до читання input або будь-якої mutation.
- Registry: Module-owned; system provenance походить із composition-owned lease `extensia.default-api`, а не self-asserted flag; names lowercase exact pattern без silent rewrite; `query/storage` reserved; synchronous provider contributions, Extensia-owned async creation.
- Internal seam: typed `resource.get` / `resource.tree.get` requests, overload-based `CoreResourceReadPort`, only-not-found expected internal result і один facade adapter; no package export. Окрема BP2-01A materialize-ить consumer-owned source contract до паралельної activation BP2-02/BP2-03.

## Відхилені альтернативи

- Public class constructor із можливими effects; one-shot `startExtensia`; always-present або throwing pre-start facades.
- Draft boolean/null result shape; success-null для missing resource; full draft query catalog.
- Final write input у Phase 2; generic `execute(command)`; приховування `storage` до Phase 3.
- Silent case/whitespace normalization facade names; generic application resolver; parallel test-only Core contract.

## Докази перевірки

- Self-contained TypeScript 6.0.3 strict probe пройшов із `--ignoreConfig`: discriminated narrowing, readonly mutation rejections, failure branch safety і `never` storage success підтверджені.
- Initial invocation без `--ignoreConfig` повернув TS5112 через нове правило TypeScript 6 для explicit file поруч із tsconfig; повторний коректний invocation зелений, design defect відсутній.
- Окремий exact BP2-01A seam probe з actual `Token`, internal namespace і current domain imports пройшов strict TypeScript 6.0.3 із `--types node`. Перший isolated invocation без explicit Node types очікувано виявив лише відсутнє environment declaration для `node:crypto`, не contract defect.
- Усі локальні Markdown links у task/research/fixation/report/navigation artifacts резолвляться.
- Activation sync під час виконання показував BP2-01 тільки як `active`; stale state wording про всі BP2 tasks у backlog виправлено, а після human review статус синхронізовано до `done`.
- Production code/package exports не змінювалися; package gate не запускався як нерелевантний для memory-only research, а type surface перевірено окремим compile probe.

## Архітектурний тиск

Новий істотний architecture pressure не створено. Proposal не потребує plugins/hooks, raw IoC, write pipeline, Journal, final driver, full module map або broad query catalog. Локальний pressure temporary driver/write-proof surface ізольований explicit compatibility labels та owner gates P3/P4. Другий Core/read contract або test-only facade wiring у BP2-02/BP2-03 є stop condition для correction, не дозволеним shortcut.

## Синхронізація пам'яті перед аудитом

- Product memory: `not needed` — accepted requirements не змінені.
- Domain memory: `not needed` — current implementation не змінена; target changes лише proposed.
- Technical canonical memory: `proposed` у `FIX-001`, не applied.
- Knowledge memory: `not needed`.
- Task memory: `updated` — activation, RSCH-001, report, fixation proposal та indexes.
- Reports: `updated` — detailed report і research index.
- `memory/state.md` / `tasks/plan/progress.md`: `updated` за active status.
- Top-level README/index: `not needed` — task уже мав plan index entry, нові top-level entry points не створені.
- Follow-up: окрема owner `interactive-memory-update` application task потрібна лише після approvals; BP2-02/BP2-03 не активовані.

## Незалежний аудит

Status: closed

Одночасно запущено два read-only audits: API/architecture і Project Memory/workflow. Initial findings та remediation будуть зафіксовані тут; review-ready status заборонений до repeated verdict без open P0-P2.

### Початкові зауваження та виправлення

- P1 architecture, виправлено: ambiguous shared seam ownership/race замінено semantic consumer ownership і окремою prerequisite BP2-01A, яка materialize-ить єдиний TypeScript source artifact до паралельної activation.
- P2 architecture/memory, виправлено: exact snapshot тепер містить literal private brand declarations і recursive `JSONPrimitive/JSONValue/JSONArray/JSONObject`, без `Record<string, unknown>` shorthand.
- P2 architecture, виправлено: lifecycle визначає intake lease, close-and-drain перед cleanup/disposal і exact stop-after-failed semantics.
- P2 architecture, виправлено: construction capture-ить driver identity у новий frozen envelope; caller envelope mutation не впливає на module, driver object не clone-иться.
- P2 architecture, виправлено: reserved ownership походить із trusted composition-owned system lease, не self-asserted descriptor boolean; validation order явний.
- P3 architecture, виправлено: speculative `RESOURCE_READ_FAILED` видалено з bounded greedy public/internal catalog; unexpected in-memory defect лишається exception/diagnostic path.
- P2/P3 memory, у процесі closure: task metadata, acceptance mapping, language gate, completed self-review й repeated audit record синхронізуються після повторної перевірки.

### Повторний аудит

Review Method: dual-independent-subagent
Auditors: `bp2_01_arch_audit`, `bp2_01_memory_audit`
Final Verdict: `REVIEW_READY`
Open P0-P3: none
Review Limitation: none

Architecture audit підтвердив literal seam path/imports/exports/token ID, invalid-config sentinel, config capture, intake drain, stop-after-failed, provenance lease, bounded error catalog і dependency conjunction. Memory/workflow audit підтвердив substantive self-review, verification evidence, language/upward consistency, safe fixation/application boundary і відсутність applied canonical змін. Нових P0-P2 regressions не виявлено.

## Відповідність критеріїв доказам

- Alternatives/лише P2-VS1: detailed report §§3, 10, 14; full draft query/plugin/write surfaces explicitly rejected/deferred.
- Construction/start/config/packed boundary: report §§4, 6, 7, 10, 12; driver capture semantics і root-only exports exact.
- Result/error/lifecycle/readonly/DTO: report §§4..7; TypeScript strict probe green; detached/JSON-safe semantics повторюють accepted BP1 contract.
- Registry ownership/freeze/reserved names: report §8; provenance lease, validation order, freeze/publication exact.
- Shared seam для parallel work: report §9; BP2-01A materialization + semantic consumer/provider ownership remove shared-file race.
- No Core/IoC/raw resolver та compatibility: report §§4, 8, 9, 11, 14.
- Independent audit: initial dual audit complete; material findings remediated; repeated verdict `REVIEW_READY`, open P0-P3 немає.
- Human review boundary: report §15 і FIX-001; canonical changes не applied.

## Мовний шлюз

Авторський текст research/report/fixation/navigation повторно перевірено після remediation: canonical мова українська; English words залишені лише як API/type/status/schema identifiers, exact technical terms або короткі domain labels. Непотрібні English-heavy headings у FIX/report українізовано. Gate пройдено.

## Self-review агента

Review Method: dual-independent-subagent + same-agent remediation check
Review Limitation: none

### Якість і повнота

Task contract покритий detailed report: alternatives, exact root/type snapshot, construction/config/lifecycle, two Resource reads, normalized errors, detached DTO/tree, readonly failure-before-input/mutation, Registry provenance/freeze/publication, safe diagnostics, compatibility labels, consumer examples і shared seam. Type-level assertions виконані фактично, а не лишені майбутнім implementation tests.

### Дисципліна обсягу та скорочення шляху

Production code, canonical product/domain/technical design і package exports не змінювалися. Full draft query catalog, successful write inputs, plugin/custom facade API, Journal/recovery та final driver protocol не заморожені. Початкова спроба лишити shared seam лише memory snapshot створювала file-ownership race; shortcut відхилено на користь bounded BP2-01A materialization gate.

### Ризики й компроміси

- `ReadonlyResourceDriver` і `createResource(input: unknown)` лишаються explicit experimental Phase 2 surfaces; P3/P4 можуть вимагати migration.
- Graceful stop без cancellation може чекати hung admitted read; unsafe disposal не дозволений, timeout/cancellation deferred до owner gate.
- Public `inspect()` має provisional tooling compatibility; safe shape зафіксована, повний catalog deferred до P7.
- Додавання BP2-01A подовжує critical path на одну малу task, але усуває cross-task shared-file race та duplicate contracts.

### Незапланована робота

Independent audit виявив потребу в exact internal token/source path, intake drain, invalid-config sentinel, trusted system provenance та додатковому materialization gate. Усі зміни лишилися в design/fixation boundary; implementation не починалася.

### Подальші задачі

- Після human approvals: окрема owner `interactive-memory-update` application task.
- Після stable application artifact: окрема activation і виконання BP2-01A.
- Лише після `done` BP2-01A: окремі activation BP2-02/BP2-03, які можуть іти паралельно.
- P3/P4/P7 owner gates стабілізують write input, final driver і compatibility/diagnostics відповідно.

### Додаткові нотатки для перевірки людиною

Task approval, fixation approval, application task і activation implementation tasks є окремими decisions. Поточна рекомендація — прийняти design result і окремо погодити FIX-001, але не застосовувати її та не активувати BP2-01A/BP2-02/BP2-03 у межах TASK-0015.

## Перевірка людиною

Status: approved
Reviewed: 2026-07-10
Reviewer Role: Product Lead Hat / System Engineer Hat / Agent Operator Hat
Approval Scope: whole-task-review
Approval Source: явне повідомлення користувача «Я зробив ревю, можеш завершувати задачу.»

Design/research result прийнято на task-level, TASK-0015 дозволено завершити як `done`. Це рішення не є approval `FIX-001`, не застосовує canonical proposal і не активує BP2-01A/BP2-02/BP2-03.
