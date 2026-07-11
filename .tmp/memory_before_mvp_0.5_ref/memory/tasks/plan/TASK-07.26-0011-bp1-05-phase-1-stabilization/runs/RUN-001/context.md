# Контекст RUN-001

Preparation Status: prepared
Execution Status: completed
Status: completed
Created: 2026-07-10
Started: 2026-07-10

## Роль і режим

- Роль агента при активації: Agent Executor.
- Execution Mode: `autonomous-implementation`.
- Статус задачі при активації має бути `active`; підготовлений run не є неявною активацією.
- Перед виконанням атомарно оновлюються task/run metadata, `tasks/plan/progress.md` і `state.md`; task folder зберігає стабільний шлях.

## Обов'язкове читання

- `memory/agent-start.md`, `memory/README.md`, `memory/state.md`, `memory/memory-rules.md`, `memory/agents/rules.md`.
- `memory/tasks/plan/progress.md` і `memory/tasks/plan/TASK-07.26-0011-bp1-05-phase-1-stabilization/task.md`.
- Ці `requirements.md` і `context.md`.
- `memory/tasks/plan/TASK-07.26-0005-bp1-01-esm-typescript-package-baseline/task.md` та `runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0007-bp1-02-pure-domain-contract-kernel/task.md` та `runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0008-bp1-03-ioc-composition-skeleton/task.md` та `runs/RUN-001/result.md`.
- `memory/tasks/plan/TASK-07.26-0010-bp1-04-lifecycle-controller-slice/task.md` та `runs/RUN-001/result.md`.
- `memory/product/roadmap.md`, `memory/domain/current/implementation-state.md`, `memory/technical/architecture.md`, `memory/technical/rules.md`, `memory/technical/stack.md` і `memory/technical/open-questions.md`.
- `memory/technical/decisions/ADR-0003-internal-ioc-composition.md` і `memory/technical/decisions/ADR-0006-phase-1-tooling-and-ioc-baseline.md`.
- `memory/knowledge/package-index.md`; package `pdadm-mvp-reglament` застосовується лише для уточнення workflow/recording, а не як authority для product design.

## Джерела рішення

- `TASK-07.26-0011` є канонічним stabilization contract і визначає scope, correction loop, acceptance та memory sync.
- Прийняті результати BP1-01…04 є factual evidence попередніх vertical slices, але не звільняють RUN-001 від повторної risk-based verification на поточній source revision.
- ADR-0003 і ADR-0006 лишаються authority для одного internal Composition Root, non-public IoC boundary, exact `@sagifire/ioc@0.0.2`, Node.js 24 ESM tooling і Extensia-owned async lifecycle.
- `technical/architecture.md` і `technical/rules.md` задають target constraints; вони не легітимізують public facade/config/storage API або production module map.
- `domain/current/implementation-state.md` є factual state; target domain/source specifications не слід видавати за current implementation.

## Початковий factual state

- BP1-01…04 завершені як `done` після whole-task human approval; root package лишається ESM-only з zero runtime/domain exports і package exports `.` та `./package.json`.
- Реалізовані лише internal pure domain kernel, internal IoC composition/conformance skeleton і strict generic lifecycle host/controller; Core, Storage Driver, Extensia Module, facades, plugins, journal, index і recovery відсутні.
- `package.json` фіксує Node.js `>=24`, `@sagifire/extensia@0.1.0`, exact direct dependency pins і `npm run check` як full package gate.
- Поточні tests живуть поруч із source: domain, composition, lifecycle та root/package smoke. Зафіксоване попереднє evidence: 7 Vitest files, 75 tests; activation повторно вимірює, а не копіює ці numbers.
- `scripts/package-smoke.mjs` уже перевіряє installed tarball root import/type consumer і emitted internal subpath rejection. RUN-001 перевіряє, що цей proof лишається complete і stable, а не припускає чинність попереднього evidence.

## Architecture boundaries

- Phase 1 стабілізує вже реалізовані internal contracts; вона не перетворює internal names, lifecycle states/results або target sketches на публічні compatibility promises.
- Існує рівно один production Composition Root. Fresh test composition може використовувати test-only probes через ту саму production boundary, але не може стати parallel architecture, service locator або post-compose mutation path.
- Contribution-owned active-resource cleanup і composed-runtime graph/provider disposal мають окреме ownership. Stabilization не додає duplicate cleanup registration або automatic retry behavior, не прийняті BP1-04.
- Package encapsulation є publish-boundary contract: compiled internal artifacts можуть існувати в tarball, але root exports і всі internal subpaths мають лишатися недоступними consumer-ам.
- Deferred public `P1-VS1` і всі Phase 2/3 concerns лишаються відкладеними. Evidence gap, що потребує їхнього design, є blocker/follow-up, а не можливістю реалізувати їх у stabilization.

## Відомі ризики

- Попереднє package-smoke evidence вказує, що fixed npm tarball output може мати race за concurrent execution; запускати packed checks послідовно в одному worktree й відрізняти цей environment constraint від product defect.
- Git може вимагати per-command safe-directory override через SID ownership mismatch; зафіксувати це як environment-only і не зберігати global Git configuration із run.
- `attw --profile esm-only` може повідомляти ignored CJS-resolution information із successful exit; зберегти exact output та оцінити його щодо explicit ESM-only contract.
- Відтворюваність можна неправильно витлумачити, якщо npm tar headers/metadata порівнюються як deterministic artifacts. Порівнювати sorted packed paths і hashes controlled emitted files; пояснити будь-яку metadata-only variance.
- Широка stabilization task може перетворитися на feature bucket. Кожна запропонована зміна має простежуватися до конкретного Phase 1 acceptance/verification gap або бути винесена у follow-up.
- Поточна target architecture навмисно ширша за реалізований code. Не вважати відсутній future component defect-ом, якщо BP1-01…04 його явно не вимагали.

## Припущення

- Активація відбувається лише після перевірки достатності цього prepared protocol; вона не означає approval усієї BP1-05 task.
- Node.js 24 і exact lockfile лишаються доступними. Dependency changes, registry failures або зміна runtime baseline потребують окремої disposition замість silent drift.
- Виконавець може використати independent subagent для обов'язкового self-review. Якщо capability стане недоступною, у `result.md` фіксується фактичне discovery/limitation; same-agent review не можна називати independent.
- Наявні user changes, якщо вони будуть під час активації, зберігаються. Evidence має показати, чи використано clean isolated worktree, або чому reproducibility обмежена цими змінами.
