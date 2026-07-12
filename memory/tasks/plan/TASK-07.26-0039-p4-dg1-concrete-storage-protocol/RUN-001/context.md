# Контекст виконання: RUN-001

Related Task: [P4-DG1 / TASK-07.26-0039](../task.md)
Prepared: 2026-07-12
Prepared By: delegated planning agent
Previous Run: none

## Мета run

Провести evidence-backed formal design/research і підготувати owner-approved concrete storage protocol, executable durability proof strategy та exact canonical fixation proposal, які безпечно відкриють майбутню реалізацію першого durable driver без activation implementation у цьому run.

## Ефективні вимоги

- Обрати один bounded перший supported driver/platform boundary після порівняння реальних capabilities і constraints.
- Зберегти accepted P3 semantics: один Core operation pipeline, driver-owned outcome-definite semantic commit, committed-only journal, post-commit index publication, recovery-before-ready, baseline single storage writer і opaque full-driver boundary.
- Визначити physical metadata/files/staging/journal/lock layout та version/format markers без layout leakage до Core, facade або application config.
- Успішна operation має означати durable committed state; incomplete artifacts не стають visible.
- Commit promise має definite outcome: resolve = committed, reject = not committed; unknown outcome не маскується локальним workaround.
- Визначити exact crash/restart/recovery, readonly, corruption та environmental failure semantics для supported boundary.
- Formal research створює `RSCH-001`, detailed report і required `FIX-001`; canonical changes не застосовуються до окремого approval.
- Незалежний subagent audit є обов'язковим до human review; відкриті P0-P3 findings блокують review-ready.

## Обсяг

- Driver/platform alternatives; physical protocol; durability and atomicity assumptions; locking; journal encoding; staging/publication; recovery/cleanup; readonly/integrity; executable proof strategy; downstream dependency gates.

## Поза обсягом

- Production implementation, package dependency changes, Asset contracts/persistence, sync/completeness, plugins/hooks, public facade expansion, creation чи activation downstream implementation tasks.

## Критерії приймання

- [ ] Verified primary-source capability evidence і executable probes підтримують bounded driver/platform recommendation.
- [ ] Physical layout/encoding/versioning, path safety та integrity/corruption policy exact і Core-opaque.
- [ ] Metadata, file/staging і one committed journal semantic commit має definite resolve/reject outcome та explicit publication boundary.
- [ ] File/directory sync, rename/replace, storage lock/lease/timeout і crash/restart assumptions exact для supported platforms/filesystems.
- [ ] Recovery-before-ready, incomplete artifact cleanup/visibility, readonly, stale lock, corruption, disk-full і permission cases мають traceable state/cut-point matrix.
- [ ] Executable driver contract/proof strategy відрізняє fake semantic conformance від concrete durability evidence і не створює parallel test-only architecture.
- [ ] `RSCH-001`, detailed report та required `FIX-001`/ADR proposal повні, exact і task-ready; downstream decomposition лишається proposal без implementation task creation.
- [ ] Upward consistency, source policy, language gate й architecture-pressure review пройдені.
- [ ] Self-review та independent audit не мають відкритих P0-P3; Review Request чітко розділяє whole-task, fixation і follow-up decisions.

## Заплановані результати

- Імплементація: none.
- Формальні дослідження: `RSCH-001` і detailed planning/design report у `memory/reports/research/`.
- Memory fixation: required `FIX-001` з exact proposed concrete storage contract, ADR і consistency updates; application лише після approval.

## Обов'язковий контекст задачі

- `memory/state.md`
- `memory/product/roadmap.md`
- `memory/product/requirements.md`
- `memory/technical/architecture.md`
- `memory/technical/rules.md`
- `memory/technical/open-questions.md`
- `memory/technical/write-journal-recovery-contract.md`
- `memory/domain/current/implementation-state.md`
- `memory/reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md`
- `memory/tasks/plan/TASK-07.26-0036-p3-stab-final-phase-3/task.md`
- `memory/tasks/plan/TASK-07.26-0036-p3-stab-final-phase-3/RUN-002/result.md`

## Вхідні файли та модулі

- Existing full-driver port, deterministic fake, semantic commit/journal/recovery seams і tests у `src/` та `test/`/`tests/`, визначені під час activation через targeted source inventory.
- Node.js 24 runtime/platform capabilities і primary documentation кандидатів driver/filesystem, перевірені під час research.

## Обмеження

- Conceptual method lists із reference specifications не є authority для exact protocol.
- Physical layout не просочується в Core, facade чи ordinary application config.
- Independent journal append, second write path, index-before-commit і unknown commit outcome заборонені accepted architecture.
- Portable claims обмежуються реально доведеними platform/filesystem guarantees; unsupported assumptions позначаються явно.
- `P4-WP1` не включає Asset persistence; Asset owner gate належить `P4-DG2`.
- Context після activation заморожується; material contract change потребує нового run.

## Перевірки

- Primary-source comparison і executable platform capability probes.
- Physical state-machine та cut-point/crash/restart matrices для metadata, files/staging, journal, lock і recovery.
- Outcome-definite commit, idempotency/fingerprint/sequence, corruption та readonly scenario reasoning.
- Compile-oriented contract sketches/probes без production implementation за потреби.
- Traceability до accepted P3 fake protocol і scan на duplicate write/journal/layout authority.
- Upward consistency, language, source policy, architecture-pressure self-review та independent subagent audit.

## Ризики

- Filesystem guarantees різняться за platform/filesystem і можуть не підтримати бажану atomicity без protocol redesign.
- Неправильний durability claim може повертати success до stable persistence або лишити ambiguous commit outcome.
- Lock ownership чи crash cleanup можуть створити split-brain writer або блокувати startup recovery.
- Занадто широкий driver contract може передчасно заморозити Asset, sync або public API semantics.
- Test fake може випадково підмінити concrete crash evidence й створити хибну впевненість.

## Припущення

- Phase 3 whole-task/human gate і current fake protocol є accepted input, але не доказом physical durability.
- Baseline лишається single storage-level writer; distributed fine-grained multi-writer поза `0.1.0`.
- Direct external modification physical storage в обхід Extensia не є supported reconciliation scenario.
- Exact dependency choice для concrete driver не робиться без перевірки актуальних platform/library capabilities у research.

## Зміни від попереднього run

- Попередній run: none.
- Причина нового run: initial canonical preparation Phase 4 owner gate.
- Змінені вимоги: none.
- Оновлений контекст: Phase 3 завершена й прийнята; concrete physical durability лишається недоведеною.
- Очікуване виправлення: n/a.
