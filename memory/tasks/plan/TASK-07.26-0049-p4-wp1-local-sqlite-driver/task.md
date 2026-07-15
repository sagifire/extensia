# P4-WP1 / TASK-07.26-0049: Local SQLite durable Storage Driver

Task Status: done
Type: implementation
Created: 2026-07-15
Owner Role: Agent Implementer
Current Run: RUN-001

## Поточний стан

Run Status: completed
Progress: Whole-task approved; required FIX-001 approved/applied exactly; implementation, 234-test gate, physical proof і repeated independent audit завершені без open P0-P3.
Acceptance: 9/9; whole-task human approval отриманий.
Blockers: none.
Blocked Phase: n/a
Pending Decisions: none; downstream activation requires a separate explicit decision.
Next Action: none; P4-VS1 не активувати без окремого explicit рішення.

## Мета

Реалізувати перший concrete durable Storage Driver Extensia — internal profile `embedded-transactional/local-sqlite-v1` на Node.js 24 `node:sqlite` — через чинний opaque `FullResourceDriverAdapter`, з однією SQLite durability domain для Resource state, operation idempotency та committed journal, і довести bounded physical correctness на сертифікованому local-filesystem profile.

## Продуктовий контекст

Phase 3 довела Resource write semantics на deterministic full fake, а accepted/applied `P4-DG1` визначила exact SQLite physical protocol. `P4-WP1` materialize-ить concrete driver foundation і physical proof, але не додає Asset domain semantics. Після прийняття цієї задачі окремий `P4-VS1` має повторити повну Phase 3 Resource parity на real storage з restart/cut-point evidence.

## Залежності та activation gate

- `P3-STAB / TASK-07.26-0036` завершена й Phase 3 прийнята; dependency виконана.
- `P4-DG1 / TASK-07.26-0039` завершена: FIX-001/FIX-002 applied, `APP-07.26-0039-001` published, final post-application audit `PASS`; owner gate виконаний.
- `P4-DG2 / TASK-07.26-0040` прийнята й applied, але її Asset semantics не входять у P4-WP1.
- Activation RUN-001 потребує окремого явного рішення; canonical preparation не є activation.
- `P4-VS1`, `P4-VS2`, `P4-VS3` і `P4-STAB` не створюються й не активуються цією задачею.

## Обсяг

- Реалізувати internal `local-sqlite-v1` adapter через built-in Node.js 24 `node:sqlite` без нової production dependency.
- Реалізувати driver-owned root і SQLite format/schema authority: `extensia.sqlite3`, `application_id`, `user_version=1`, singleton format marker, exact schema й canonical encodings.
- Зберігати committed Resource snapshots, `operation_id`/fingerprint, contiguous arbitrary-length decimal journal sequence і рівно один committed journal row в одній SQLite transaction.
- Реалізувати dedicated connection, rollback journal, verified `synchronous=EXTRA`, `foreign_keys=ON`, `trusted_schema=OFF`, bounded pre-write busy timeout і `locking_mode=EXCLUSIVE` storage-session lease.
- Реалізувати open/close, full і readonly lifecycle, recovery-before-ready, coherent scan, read/list/journal cursor, transaction stage/commit/abort, idempotent retry та safe release через чинні storage contracts.
- Реалізувати mandatory COMMIT reconciliation через `isTransaction`, rollback/reopen/recovery і exact lookup by `operation_id`, не перетворюючи unknown outcome на reject.
- Реалізувати path containment і fail-close перевірки symlink/reparse/non-regular target, unknown/newer format, malformed schema, corruption, journal gaps/mismatch та unsupported environment.
- Materialize-ити лише opaque future payload capability seam/schema, необхідний accepted design; Asset metadata/upload semantics, public API та payload finalization не реалізовувати.
- Додати concrete conformance, fault-injection, child-process crash/restart, lock contention, readonly no-write, corruption, size/performance та package evidence для bounded profile certification.

## Поза обсягом

- Asset domain/API operations, staged upload lifecycle або application bytes transport (`P4-VS2/P4-VS3`).
- Повтор усіх Phase 3 public Resource slices на real storage як окремий acceptance owner (`P4-VS1`).
- Filesystem-native, PostgreSQL/MySQL або інші Storage Driver families.
- External filesystem blob publication, independent journal append, PID/stale lock file чи другий durability/write path.
- Network/removable/sync/FUSE storage, multi-host або distributed/multi-writer support.
- Phase 5 external change sync, multi-instance visibility, plugins/hooks або final compatibility freeze.
- Public root exports або leakage SQLite schema, paths, pragmas, connections чи recovery implementation у Core/application API.
- Непідтверджені power-loss claims; optional destructive environmental proof не підміняється process-crash tests.

## Критерії приймання

1. Internal `local-sqlite-v1` реалізує чинний `FullResourceDriverAdapter` і `ResourceStorageSession` без public API/IoC/layout leakage, нової production dependency або parallel test-only contract.
2. Exact root/schema/configuration gate перевіряє canonical containment, target type, format/version markers, required pragmas і unsupported filesystem/environment cases до ready; unknown/corrupt state fail-close без automatic repair.
3. Resource write-set, operation authority та рівно один committed journal row публікуються однією SQLite transaction; sequence/fingerprint/idempotency/integrity semantics точно відповідають P3 contract і ADR-0010.
4. Dedicated connection та exclusive SQLite/VFS lease утримуються від session acquire через recovery/scan/COMMIT і Core publication до release; multi-process contention, bounded pre-write timeout і crash release доведені executable tests.
5. COMMIT success/error reconciliation дає лише proven committed resolve або proven absent reject; present/absent/mismatch/unavailable paths покриті, а persistent unclassifiable failure fail-close-ить intake і не породжує false reject.
6. Full startup виконує recovery-before-ready; readonly open не створює й не змінює DB/journal/cleanup state, бачить лише committed rows і fail-close, якщо потрібна recovery mutation.
7. Child-process cut-point/restart matrix, deterministic SQLite fault injection і corruption fixtures покривають BUSY, FULL, IOERR, CANTOPEN, READONLY, permission, malformed format/schema/journal/content та after-commit-before-receipt/publication paths.
8. Proposed Windows 11 local NTFS profile має rerunnable capability/lock/crash evidence; інші platform/filesystem profiles лишаються candidate/unsupported без окремої evidence. Payload seam має bounded memory/size/transaction/journal-growth measurements без Asset activation.
9. Повний repository/package gate зелений; implementation/result evidence, memory impact, architecture pressure, language gate, self-review та незалежний audit завершені без відкритих P0-P3 до human review. Задача не закривається без whole-task human approval.

## Перевірки

- focused unit tests для schema/codec/sequence/fingerprint/error mapping і COMMIT reconciliation;
- adapter conformance parity з deterministic full driver через ті самі storage/Core contracts;
- child-process cut-point kill/restart harness і fresh-process recovery;
- two-process exclusive lock, timeout, crash-release та lock-through-COMMIT/Core-publication evidence;
- readonly filesystem snapshot/diff, hot-journal negative case й corruption fixture matrix;
- deterministic wrapper fault injection: `BUSY`, `FULL`, `IOERR`, `CANTOPEN`, `READONLY`, permission і malformed/corrupt state;
- payload chunk memory ceiling, SQLite size/latency, rollback-journal growth і unsupported-environment negative probes;
- `npm run check`, package smoke, packed consumer verification і deterministic double-pack comparison.

## Ризики

- `node:sqlite` API/status може відрізнятися між дозволеними Node.js 24 minors; capability probe й adapter isolation обов'язкові.
- Synchronous `DatabaseSync` може блокувати event loop; transaction duration, chunk size та worker-boundary pressure потребують вимірювання без другого write path.
- `locking_mode=EXCLUSIVE` або VFS behavior може не тримати потрібну lease через COMMIT на конкретному profile; тоді support claim блокується, а semantic contract не послаблюється.
- SQLite durability залежить від правдивих OS/filesystem/device sync semantics; process-crash evidence не доводить arbitrary power-loss survival.
- Persistent unavailable durability domain може призупинити settlement/runtime; liveness не можна відновлювати false rejection.
- Payload у SQLite збільшує write amplification, rollback-journal size і corruption/backup blast radius; P4-WP1 лише вимірює bounded seam, а P4-VS3 володіє Asset limits/performance gate.

## Пов'язана пам'ять

- [P4-DG1 / TASK-07.26-0039](../TASK-07.26-0039-p4-dg1-concrete-storage-protocol/task.md)
- [Published application artifact](../TASK-07.26-0039-p4-dg1-concrete-storage-protocol/application-artifacts/APP-07.26-0039-001.md)
- [ADR-0010](../../../technical/decisions/ADR-0010-local-sqlite-storage-protocol.md)
- [Concrete storage protocol report](../../../reports/research/2026-07-12-extensia-concrete-storage-protocol.md)
- [Storage Driver taxonomy report](../../../reports/research/2026-07-12-extensia-storage-driver-taxonomy.md)
- [Write, Journal і Recovery Contract](../../../technical/write-journal-recovery-contract.md)
- [Technical Architecture](../../../technical/architecture.md)
- [Technical Rules](../../../technical/rules.md)
- [Roadmap](../../../product/roadmap.md)
- [P4-DG2 Asset Contract](../../../technical/asset-contract.md)

## Прогони

- [RUN-001](RUN-001/index.md) - completed - implementation і bounded physical proof `local-sqlite-v1`.

## Дослідження

Немає; implementation спирається на accepted/applied P4-DG1 research і ADR-0010. Нова formal research потрібна лише якщо executable evidence спростує прийняті physical assumptions.

## Фіксації

- [FIX-001](FIX-001.md) - approved / applied / required - exact current/technical memory synchronization.

## Запити на рішення

- Немає; P4-VS1 потребує окремої activation.

## Запропоновані follow-up задачі

- `P4-VS1` — canonical preparation лише після accepted P4-WP1: повна Phase 3 Resource parity на concrete `local-sqlite-v1` з restart/cut-point matrix.

## Human Review

Status: accepted
Requested: 2026-07-15
Reviewed: 2026-07-15
Approval Source: explicit user message: `TASK-0049: approve`; `FIX-001: approve`
Approved Fixations: FIX-001
Rejected Fixations: none
Follow-up Decisions: P4-VS1 not activated
Decision Notes: Whole-task result і required FIX-001 окремо approved; fixation applied exactly. Downstream не активований.

## Фінальний результат

Completed: 2026-07-15
Final Run: RUN-001
Summary: Internal Node-native `local-sqlite-v1` foundation, bounded Windows local NTFS process-crash proof, 234-test package gate й repeated independent audit прийняті; FIX-001 applied.
Residual Risks: Public/default driver surface, broader platform/power-loss certification, P4-VS1 Resource parity, Asset persistence/upload, sync і performance envelopes лишаються separate gates.
