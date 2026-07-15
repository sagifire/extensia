# TASK-07.26-0041: Filesystem-native Storage Driver design

Task Status: done
Type: research/design
Created: 2026-07-12
Owner Role: Agent Architect
Current Run: RUN-001

## Поточний стан

Run Status: completed
Progress: Whole-task result прийнятий, FIX-001 applied, п'ять backlog/prepared follow-up tasks створені й validated у future phase FN; жодну не активовано.
Acceptance: 9/9
Blockers: none
Blocked Phase: n/a
Pending Decisions: none; approved follow-up tasks створюються backlog/prepared і не активуються.
Next Action: За окремим owner рішенням активувати TASK-0044 або незалежну TASK-0048; task closure не активує downstream.

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

- [RUN-001](RUN-001/index.md) — completed — filesystem-native feasibility і exact physical protocol research/design.

## Дослідження

- [RSCH-001](RSCH-001.md) — completed / `final-result` — feasibility, alternatives, exact protocol і certification boundary.

## Фіксації

- [FIX-001](FIX-001.md) — applied / required — canonical filesystem-native profile contract, схвалено й застосовано 2026-07-15.

## Запити на рішення

Немає; whole-task, FIX-001 і створення п'яти follow-up tasks схвалені 2026-07-15. Activation кожної follow-up task лишається окремим майбутнім рішенням.

## Запропоновані follow-up задачі

- [TASK-07.26-0044](../TASK-07.26-0044-filesystem-native-linux-helper-spike/index.md) — research-only native helper, path containment, OFD lock, directory-sync і `NAME_MAX` proof.
- [TASK-07.26-0045](../TASK-07.26-0045-filesystem-native-driver-implementation/index.md) — bounded implementation після accepted TASK-0044.
- [TASK-07.26-0046](../TASK-07.26-0046-filesystem-native-linux-process-crash-certification/index.md) — executable local-ext4 process-crash certificate після TASK-0044/0045.
- [TASK-07.26-0047](../TASK-07.26-0047-filesystem-native-linux-power-loss-certification/index.md) — optional destructive power-loss gate після TASK-0046 й окремого environment approval.
- [TASK-07.26-0048](../TASK-07.26-0048-filesystem-native-windows-ntfs-research/index.md) — окремий Windows/NTFS proof gate для `LockFileEx`, reparse safety і replace/directory durability.

Усі follow-up задачі створені як `backlog/prepared` у future phase FN і не активовані.

## Human Review

Status: approved
Requested: 2026-07-15
Reviewed: 2026-07-15
Approval Source: user message 2026-07-15 — «підтверджую її виконання»
Approved Fixations: FIX-001
Rejected Fixations: none
Follow-up Decisions: створити всі п'ять proposal tasks в окремій запланованій майбутній фазі; activation не надана.
Decision Notes: RUN-001 пройшов final independent audit `REVIEW_READY`, AC1–AC9 виконані; whole-task і FIX-001 схвалено, exact fixation застосовано.

## Фінальний результат

Completed: 2026-07-15
Final Run: RUN-001
Summary: Filesystem-native target design прийнятий; exact FIX-001 applied; п'ять follow-up task packages створені у future phase FN без activation.
Residual Risks: zero certified profiles; native ABI/build/signing pressure; O(history)/immutable retention; Windows durability unresolved; derived staging name потребує `NAME_MAX`/`ENAMETOOLONG` gate.
