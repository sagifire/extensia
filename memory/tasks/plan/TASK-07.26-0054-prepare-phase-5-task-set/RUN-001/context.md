# Контекст виконання: RUN-001

Related Task: [TASK-07.26-0054](../task.md)
Prepared: 2026-07-17
Prepared By: Agent Planner `/root/phase5_prep_package`
Previous Run: none

## Мета run

На основі accepted Phase 4 gate, чинної архітектури та executable code визначити evidence-backed rolling wave фази 5, усі потрібні їй research/design gates і task-ready dependency graph, синхронізувати застарілий кореневий `AGENTS.md` із чинним регламентом через контрольовану fixation та підготувати canonical backlog без activation.

## Ефективні вимоги

1. Дотриматися Starter Kit 5.0 / PDADM MVP 0.5, atomic task creation і канонічної української мови.
2. Почати деталізацію лише від accepted Phase 4 human gate; не вважати roadmap labels достатнім exact contract.
3. Провести formal research/planning: створити task-local `RSCH-*`, detailed report у `memory/reports/research/`, централізований self-review у `result.md` і незалежний audit.
4. Дослідити completeness/sync boundary, а також окремо визначити, чи потрібні додаткові research/design tasks перед або поруч із `P5-DG1`; кожне рішення обґрунтувати evidence, uncertainty і blast radius.
5. Побудувати повний Phase 5 dependency graph, що відокремлює contracts/research, implementation slices, stabilization, independent audit/correction loop і explicit human gate.
6. Кожну canonical Phase 5 task створити атомарно як `backlog + prepared`; не створювати `result.md`, не активувати run і не починати production work.
7. Перевірити кореневий `AGENTS.md` проти чинних startup/task/memory правил і синхронізувати його як явно авторизований project instruction artifact поза canonical `memory/`; не переносити до нього дублікати повного регламенту.
8. Змістові зміни canonical Product/Domain/Technical/Project Memory оформлювати через `FIX-*` і не застосовувати до approval; task/run/index/progress/state lifecycle updates виконувати як operational updates.
9. Перед human review закрити findings self-review та незалежного audit, перевірити dispositions research artifacts і надати окремі рішення для whole task, fixations та follow-up proposals.

## Обсяг

- Read-only synthesis accepted roadmap/delivery plan, Phase 4 closure/evidence, current architecture/rules/ADR/open questions, production code і tests.
- Formal research потрібних Phase 5 design/research gates, representative fixtures/evidence prerequisites і task boundaries.
- Task-ready decomposition indexes/read model, greedy/lazy completeness, cursor/external-change sync/refresh, multi-instance scenarios, stabilization та phase audit/gate.
- Canonical Phase 5 backlog packages і необхідна operational navigation/status synchronization.
- Контрольована синхронізація root `AGENTS.md` із Starter Kit 5.0 / PDADM MVP 0.5.
- Self-review, independent audit і human review handoff.

## Поза обсягом

- Activation або виконання створених Phase 5 tasks.
- Зміни production source/tests/package для реалізації Phase 5 behavior.
- Непогоджене застосування completeness/sync/API/architecture contracts або інших canonical Project Memory changes.
- Автоматичний старт Phase 6/7 чи future filesystem-native work.
- Підміна незалежного audit same-agent self-review.

## Критерії приймання run

- Виконано всі дев’ять критеріїв task contract.
- Formal report явно відповідає, які дослідження потрібні Phase 5, чому вони окремі або чому не потрібні, та як їх результати блокують/дозволяють downstream tasks.
- Усі створені packages і operational links/status pairs валідні; жоден downstream run не активований.
- `AGENTS.md` узгоджено з чинними 5.0/0.5 routes і universal run model; obsolete 0.4 workflow wording відсутнє.
- Self-review й independent audit не мають відкритих P0–P3 findings, а review request містить усі потрібні owner decisions.

## Обов’язкове task-specific читання

- `memory/product/roadmap.md` — Phase 5 scope, wave IDs і gate.
- `memory/reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md` — P5 decomposition, U-08/U-15, dependency register, verification matrix і detailing policy.
- `memory/tasks/plan/TASK-07.26-0053-p4-stab-phase-4/task.md`, `RUN-001/context.md`, `RUN-001/result.md`, evidence та applied fixation — accepted Phase 4 gate і residual limits.
- `memory/technical/index.md`, `architecture.md`, `rules.md`, `open-questions.md` і релевантні ADR/contracts, визначені через index.
- `memory/domain/index.md` і релевантні current/target/open-question documents, визначені через index.
- `memory/state.md`, `memory/tasks/plan/progress.md`, актуальні Phase 2–4 task/result artifacts, якщо вони потрібні для traceability existing read/index/journal/storage behavior.
- `src/`, `test/`/`tests/`, package scripts і public/internal boundaries — фактична executable architecture; читати вибірково через repository navigation.
- `AGENTS.md`, `memory/agent-start.md`, `memory/reglament/agents.md`, `memory/reglament/memory-rules.md`, `memory/project/agents.md`, `memory/project/memory-rules.md`.
- `memory/knowledge/package-index.md`; повний `pdadm-mvp-reglament` package або migration reference читати лише якщо виникне methodology conflict чи для exact AGENTS migration mapping.

## Заплановані результати

1. Task-local `RSCH-*` і detailed Phase 5 planning/research report.
2. Evidence-backed список необхідних research/design gates із explicit dispositions.
3. Повний task dependency/activation/correction/human-gate graph.
4. Atomic canonical Phase 5 backlog/prepared packages без activation.
5. Синхронізований root `AGENTS.md`; окремі `FIX-*` лише для required canonical Project Memory changes.
6. Оновлені operational indexes/progress/state.
7. Run result із verification, self-review, independent audit і Review Request.

## Ризики

- Короткі labels `P5-DG1/WP1/VS1/VS2/STAB` можуть приховати окремі research prerequisites, зокрема representative fixtures, cursor durability, notification/polling feasibility, multi-process testability або performance budgets.
- Передчасне об’єднання completeness, cache invalidation і external sync в один контракт може створити надмірний blast radius та заморозити API до evidence.
- Index-as-truth, другий read/write path або driver-specific leakage можуть виникнути як workaround для greedy/lazy чи cross-instance behavior.
- Неправдиві global completeness, local read-after-write або stale-window claims можуть пройти вузькі unit tests, але зламатися на gaps, duplicates, restart чи two-process interleavings.
- Масове створення implementation shells до design confidence може зробити task contracts суперечливими або застарілими.
- Надмірне дублювання регламенту в `AGENTS.md` може знову створити version drift; root document має маршрутизувати до canonical operational rules.
- Паралельна робота інших агентів може змінити operational indexes; перед записом і audit потрібна повторна звірка shared worktree.

## Припущення

- Phase 4 whole-task і explicit human gate справді approved/completed; Phase 5 ще не активована.
- Поточна команда прямо дозволяє створити й виконати цю planning task; після atomic package creation вона активує `RUN-001`.
- Roadmap визначає мінімальні candidate units, а не остаточну кількість canonical tasks; formal research може додати окремі research/design/audit tasks або розділити units.
- Representative Phase 4 SQLite/fake fixtures і executable evidence доступні локально або їхня відсутність буде оформлена як prerequisite/blocker, а не обійдена припущенням.
- Independent subagent capability доступна під час active run; якщо policy вимагає окремого підтвердження, run зупиниться для decision request і не підмінить audit self-review.

## Умови зупинки

- Phase 4 approval/gate або canonical/executable baseline не підтверджуються.
- Необхідне owner рішення істотно змінює Phase 5 product/consistency scope й не може бути безпечно подане як exact reviewed proposal.
- Неможливо відокремити research/design prerequisite від implementation без передчасного contract choice.
- Незалежний audit не може бути виконаний за чинними capability/rules; зафіксувати exact limitation і діяти за reglament, не передавати same-agent review як незалежний.
- Shared worktree має конфліктні зміни в тих самих operational/canonical artifacts, які неможливо безпечно інтегрувати.

## Activation

Run Status: active
Activated: 2026-07-17
Activation Source: explicit user instruction створити окрему задачу й виконати весь preparation scope; Phase 5 downstream production tasks не активовані.
