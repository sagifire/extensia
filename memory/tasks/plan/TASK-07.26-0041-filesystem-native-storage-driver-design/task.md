# TASK-07.26-0041: Filesystem-native Storage Driver design

Task Status: backlog
Type: research/design
Created: 2026-07-12
Owner Role: Agent Architect
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Контракт дослідження й дизайну та RUN-001 підготовлені; виконання не активоване.
Acceptance: 0/9
Blockers: none
Blocked Phase: n/a
Pending Decisions: feasibility boundary; supported platform/filesystem profiles; lock і directory-sync primitives; sidecar ownership/state/formats; stale/crash/fencing semantics; namespace publication; conformance evidence.
Next Action: Окремим explicit рішенням активувати RUN-001 після прийняття canonical taxonomy Storage Driver families у owner task.

## Мета

Визначити, чи може сімейство `filesystem-native` реалізувати спільний semantic Storage Driver contract для локальних embedded і game-development сценаріїв, та спроєктувати точний physical protocol без недоведених припущень про `node:fs`, locking, directory durability або crash recovery.

## Продуктовий контекст

Перша concrete durable реалізація Extensia орієнтується на сімейство `embedded-transactional`, але filesystem-native профіль лишається важливим для game-development, локальних assets і середовищ без SQL engine. Драйвер не може послабити спільні atomic commit, journal authority, idempotency, recovery-before-ready, truthful outcomes, readonly та integrity guarantees лише через обмеження filesystem API.

## Вимоги

1. Відокремити shared semantic Storage Driver contract від filesystem-specific physical protocol і не переносити physical assumptions у Core.
2. Дослідити точні межі `node:fs` для advisory/exclusive locking, file і directory sync, atomic rename/replace, create-exclusive, metadata durability, handle lifetime, concurrent processes та crash/power-loss behavior.
3. Порівняти pure `node:fs`, platform/native helper і explicit sidecar-file protocols; не вважати власний lock або sync primitive доведеним без executable evidence.
4. Для sidecar-підходу визначити exact ownership, namespace, versioned binary/text data formats, canonical encoding, checksums, state transitions, write/sync order та compatibility rules.
5. Визначити stale/crash detection, leases або їх відсутність, fencing/generation tokens, PID/process-reuse і clock assumptions, takeover та split-brain prevention.
6. Визначити atomic namespace publication і recovery protocol для metadata, journal, manifests, payload chunks та sidecars, включно з orphan/temp cleanup і committed authority.
7. Обмежити кожен підтримуваний profile точними OS/filesystem/runtime/mount assumptions; unsupported або unproven environments мають fail-close.
8. Побудувати executable capability probes, multi-process contention tests і cut-point/crash matrix, достатні для certification окремого profile.
9. Підготувати alternatives, feasibility verdict, architecture boundary, downstream implementation slicing і exact canonical `FIX-*` proposals без production implementation.

## Обсяг

- Formal research/design із task-local `RSCH-*` і detailed report.
- Capability matrix `node:fs` / native helper / sidecar protocol за platform/filesystem profiles.
- Exact filesystem layout і ownership model лише настільки, наскільки це потрібно для доказу protocol; без production code.
- Sidecar lock/generation/manifest/state formats, lifecycle, integrity, stale/crash/takeover і compatibility semantics.
- Commit, journal, idempotency, payload, namespace publication, recovery-before-ready, readonly та integrity mapping до shared semantic contract.
- Executable probe specification або research-only probe artifacts, multi-process і cut-point matrix; criteria для profile certification.
- Security/operational review: permissions, symlinks/reparse points, path traversal, hostile/stale files, removable/network filesystems та external tampering.
- Exact `FIX-*` proposals і bounded follow-up implementation tasks лише після доведеного verdict.

## Поза обсягом

- Production driver implementation, public API/export changes, package dependencies або release activation.
- Послаблення shared semantic contract заради filesystem feasibility.
- SQL/embedded-transactional або client-server-transactional driver design.
- Asset semantic contract, upload business semantics чи content processing.
- Сертифікація неперевірених OS/filesystem profiles через документаційні припущення.
- Застосування непогоджених `FIX-*` або активація downstream implementation.

## Критерії приймання

1. Shared semantic contract і filesystem physical concerns розділені; для кожної semantic guarantee є exact mapping або явний feasibility blocker.
2. `node:fs` capability/limitation matrix має primary-source та executable evidence для locking, file/directory sync, rename/replace, create-exclusive, metadata і multi-process behavior.
3. Pure `node:fs`, native-helper і sidecar alternatives порівняні за guarantees, portability, complexity, failure modes, security та operability; verdict не спирається на недоведений primitive.
4. Якщо sidecar protocol залишається feasible, його ownership, state machine, versioned data formats, checksums, sync order і compatibility rules визначені однозначно та table-testable.
5. Stale/crash/takeover semantics явно закривають fencing/generation, PID reuse, clock/process assumptions, split brain і recovery після кожного значущого cut point.
6. Atomic namespace publication, committed journal authority, orphan/temp handling, payload integrity, idempotency і recovery-before-ready мають повну state/cut-point matrix.
7. Кожен supported profile має exact OS/filesystem/runtime/mount boundary, certification probes і fail-close behavior для unsupported або unproven середовищ.
8. Створені `RSCH-*`, detailed report, executable proof strategy та exact required/optional `FIX-*`; downstream slices не активовані й залежать від human-approved feasibility verdict.
9. Повний run пройшов self-review і незалежний subagent audit; findings усунені або явно dispositioned до human review.

## Пов'язана пам'ять

- [Roadmap](../../../product/roadmap.md)
- [Product Requirements](../../../product/requirements.md)
- [Technical Architecture](../../../technical/architecture.md)
- [Technical Rules](../../../technical/rules.md)
- [Write, Journal і Recovery Contract](../../../technical/write-journal-recovery-contract.md)
- [Concrete Storage Protocol task](../TASK-07.26-0039-p4-dg1-concrete-storage-protocol/task.md)
- [Concrete Storage Protocol report](../../../reports/research/2026-07-12-extensia-concrete-storage-protocol.md)
- [ADR-0005 Core Operation Consistency](../../../technical/decisions/ADR-0005-core-operation-consistency.md)

## Прогони

- [RUN-001](RUN-001/index.md) — prepared — filesystem-native feasibility і exact physical protocol research/design.

## Дослідження

Немає; `RSCH-001` створюється після активації RUN-001.

## Фіксації

Немає; exact proposals створюються під час RUN-001 і не застосовуються без human approval.

## Запити на рішення

Немає на етапі підготовки.

## Запропоновані follow-up задачі

Немає; implementation або platform-certification slices дозволено пропонувати лише після verdict RUN-001.

## Human Review

Status: not-ready
Requested: n/a
Reviewed: pending
Approval Source: n/a
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: pending
Decision Notes: RUN-001 не активований.

## Фінальний результат

Completed: pending
Final Run: pending
Summary: pending
Residual Risks: pending
