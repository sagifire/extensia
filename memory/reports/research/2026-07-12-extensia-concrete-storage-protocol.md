# Concrete durable storage protocol Extensia

Related Task: [P4-DG1 / TASK-07.26-0039](../../tasks/plan/TASK-07.26-0039-p4-dg1-concrete-storage-protocol/task.md)
Related Run: [RUN-001](../../tasks/plan/TASK-07.26-0039-p4-dg1-concrete-storage-protocol/RUN-001/index.md)
Related Research: [RSCH-001](../../tasks/plan/TASK-07.26-0039-p4-dg1-concrete-storage-protocol/RSCH-001.md)
Date: 2026-07-12

## Резюме рішення

Перший concrete driver — internal `local-sqlite-v1`: одна SQLite durability domain через Node.js 24 `node:sqlite` на локальному fixed filesystem одного host. Це не public driver name і не application-visible layout.

SQLite містить format marker, resources, operation id/fingerprint, arbitrary-length canonical journal sequence, committed journal і internal chunk store для майбутніх opaque Asset payloads. Їхня доменна семантика належить P4-DG2. Одна SQLite transaction публікує весь state та рівно один journal row. External filesystem payload publication у baseline заборонена: file sync + rename без portable parent-directory sync не доводить durable namespace entry.

## Support boundary

Supported baseline:

- чинний package contract Node.js `>=24`; exact `node:sqlite` capability/status конкретного minor перевіряється startup probe і CI matrix, а перехід API від experimental до RC не створює прихований новий engine floor;
- proposed initial target: Windows 11 local NTFS на одному host, де Node/SQLite capability probe відтворено; target стає certified лише після P4-WP1 child-process crash/lock evidence. Linux local ext4/XFS є candidate boundary і не стає supported до окремої CI capability/crash certification;
- один full writer на storage root; readonly instances лише коли SQLite/filesystem дозволяють безпечне readonly open;
- rollback-journal mode, `PRAGMA synchronous=EXTRA`, `foreign_keys=ON`, `trusted_schema=OFF`, busy timeout bounded config усередині driver;
- network shares (NFS/SMB), sync folders, removable media, FUSE/virtual filesystems, dishonest device caches, multi-host access і direct external mutation unsupported.

У поточній Node 24.18 документації `node:sqlite` має RC status; ранні Node 24 minors мали experimental status без runtime flag. Це bounded compatibility risk, а не твердження про stable API чи дозвіл звузити package engine contract. Dependency не додається цим design task.

## Alternatives

| Candidate | Переваги | Причина відхилення як baseline |
|---|---|---|
| Pure `node:fs` staged/rename | no dependency, inspectable layout | немає portable crash-released lock/directory sync; multi-file commit не atomic |
| SQLite з payload chunks у DB | одна durability/transaction boundary для bytes+metadata+journal | **обрано**; write amplification, size/performance limits мають бути доведені P4-WP1/P4-VS3 |
| SQLite control + immutable filesystem blobs | media bytes поза DB | відхилено: parent-directory durability не portable у Node/Windows; DB може послатися на зниклий після crash file |
| Native addon/platform adapter | platform-specific lock/sync primitives | ABI/build/deployment cost і широка platform matrix |

## Physical layout і path safety

Storage root обирає driver-owned абсолютний canonical path і не експонує дочірні paths:

```text
<root>/
  extensia.sqlite3
  extensia.sqlite3-journal   # SQLite-private transient rollback journal
```

SQLite schema `application_id`, `user_version=1` і singleton `storage_format(format='extensia-local-sqlite', version=1)` повинні збігатися. Unknown/newer marker, malformed schema або failed integrity check fail-close до ready.

Logical IDs ніколи не інтерполюються у paths. Driver приймає storage root, сам визначає єдине DB filename, відхиляє symlink/reparse/non-regular target і перевіряє canonical containment. SQL використовує bound parameters. Journal payload — canonical UTF-8 JSON із прийнятої P3 detached JSON-safe моделі. Sequence зберігається як canonical positive decimal TEXT; allocation/comparison використовують length + lexical і не звужуються до SQLite INTEGER.

## Schema authority

Minimal control-plane tables:

- `storage_format(singleton, format, version)`;
- `resources(id PRIMARY KEY, snapshot_json, tombstoned, revision)`;
- `journal(sequence_text PRIMARY KEY, sequence_length, operation_id UNIQUE, actor_id, type, committed_at, write_set_fingerprint, entry_json)`;
- `payloads(payload_id PRIMARY KEY, digest, byte_length)` і `payload_chunks(payload_id, chunk_index, bytes, PRIMARY KEY(payload_id, chunk_index))` резервуються як physical capability; activation/schema semantics лише після P4-DG2.

`journal` одночасно є idempotency registry і committed journal: другого journal file/table або independent append немає. Unique лише `operation_id` і sequence; повторення однакового write-set fingerprint для різних operations дозволене. Той самий `operation_id` мусить мати exact same draft/fingerprint; mismatch — integrity failure.

## Exact commit protocol

1. Session acquisition відкриває dedicated connection, виставляє `locking_mode=EXCLUSIVE`, отримує і утримує SQLite exclusive VFS lock до `release()`, перевіряє format/config/quick integrity, recovery і coherent scan. Executable probe мусить довести, що lock зберігається через transaction COMMIT; інакше profile unsupported.
2. Driver починає transaction на тій самій connection; reread latest state відбувається всередині неї. Усі Resource rows, opaque payload chunks (коли дозволені P4-DG2), operation fingerprint і рівно один journal row записуються разом.
3. `COMMIT` є єдиною semantic publication attempt. Ніякий Core index не публікується раніше. Exclusive connection lock лишається через Core `publish()` до session `release()`.
4. Після normal COMMIT driver reread-ить committed row за `operation_id`, перевіряє exact draft/fingerprint/sequence і тільки тоді resolve-ить receipt.
5. Якщо COMMIT кидає помилку, driver не map-ить її одразу на reject. Він використовує `isTransaction`, rollback якщо transaction active, а за потреби close/reopen, recovery та query by `operation_id`:
   - exact row існує і state integrity valid -> resolve committed;
   - row відсутній після успішного recovery й transaction точно не active -> reject not committed;
   - mismatch/corruption -> fail-close integrity error;
   - storage тимчасово неможливо повторно відкрити/класифікувати -> commit promise не settle-иться; driver retry-ить reconciliation з bounded backoff, Module закриває intake і чекає. Ні reject, ні resolve до доказу заборонені; operator/process termination є зовнішнім interruption, а наступний startup класифікує state.
6. Post-commit cleanup failure не змінює commit; повертається accepted P3 committed warning і runtime fail-close, якщо coherent operation не може продовжуватись.

Таким чином API invariant стосується settled promise: resolve означає доведений commit, reject — доведену відсутність commit. Persistent unclassifiable storage failure може зупинити settlement і runtime progress; safety зберігається ціною liveness. Це explicit refinement P3: `outcome-definite` не є гарантією termination за повної втрати доступу до durability domain. Required FIX-001 мусить бути окремо approved; без нього P4-WP1 не відкривається.

## Lock, timeout і readonly

Окремий PID/stale lock file заборонений. SQLite/VFS locking є storage lock authority. Dedicated connection у `locking_mode=EXCLUSIVE` тримає cross-process lease від acquire через recovery/scan/commit/Core publication до release; driver-level mutex серіалізує in-process sessions. Bounded acquisition timeout повертає typed lock failure до mutation; після початку commit timeout/IO error переходить у unbounded-until-proven reconciliation.

Crash звільняє OS/VFS locks; SQLite hot-journal recovery виконується при reopen. Network FS unsupported через unreliable/shared locking.

Readonly open використовує `readOnly:true`, не створює DB, payload rows, journal або cleanup writes. Якщо SQLite потребує write для hot-journal recovery чи lock capability відсутня, readonly startup fail-close з діагностикою; оператор спочатку запускає full recovery. Readonly бачить лише committed rows.

## Recovery-before-ready

Full startup order:

1. canonicalize/validate root and target filesystem;
2. open SQLite, set/verify pragmas, let SQLite recover rollback journal;
3. verify format/schema and `PRAGMA quick_check`; validate contiguous sequence, canonical entries, fingerprints and referenced Resource snapshots;
4. reconcile any operation outcome by committed `operation_id`; DB rows are authority;
5. rollback/delete driver-private uncommitted rows здійснює SQLite; external staging artifacts у baseline відсутні;
6. perform coherent scan and publish ready while the same exclusive connection lease is held.

Corruption, missing payload chunk, digest/length mismatch, sequence gap, duplicate/mismatched operation or unknown format fail-close. Automatic repair is forbidden; diagnostics expose safe codes/subjects, not host paths or content.

## Cut-point matrix

| Cut point / failure | Durable/visible after restart | Required outcome |
|---|---|---|
| DB open/create / permission failure | none | reject not committed до transaction |
| payload-chunk/metadata write / ENOSPC before COMMIT | transaction-private rows | SQLite rollback; reject after recovery proof |
| after DB writes, before COMMIT | rollback journal/in-flight rows | SQLite rollback; reject after recovery proof |
| COMMIT success before receipt | DB reference + journal row visible | reconciliation resolves committed |
| COMMIT error/IOERR | unknown until reopen | mandatory reconciliation; never immediate reject |
| after commit, before Core publication | committed DB state | fresh scan/reconciliation then Core publication |
| stale/hot rollback journal | no ready state yet | SQLite recovery, integrity gates, then ready |
| corrupt/missing payload chunk | committed metadata cannot be honored | fail-close corruption |
| readonly with recovery required | not ready | fail-close; no cleanup write |
| busy timeout before write | unchanged | typed lock failure/reject |

## Executable proof strategy

P4-WP1 має реалізувати один adapter і ті самі public/Core conformance tests, що deterministic fake, плюс concrete evidence:

- retained rerunnable capability probe на proposed Windows NTFS target; certification потребує P4-WP1 crash evidence; Linux ext4/XFS лише додаються після окремої CI certification; unsupported FS negative probe;
- child-process kill harness на кожному cut point від payload transaction write до receipt; restart з новим process/connection;
- deterministic SQLite wrapper fault injection для BUSY, FULL, IOERR, CANTOPEN, READONLY, CORRUPT і permission errors;
- exact commit-error reconciliation tests: committed row present, absent, mismatch і reopen unavailable;
- lock contention між двома processes, timeout, crash-release і recovery-before-ready;
- readonly no-write filesystem snapshot/diff і hot-journal negative case;
- corruption fixtures для format/schema, sequence, JSON, fingerprint, missing/damaged payload chunk;
- chunked payload memory ceiling, SQLite size/transaction latency, rollback journal growth і double-pack/package gates;
- optional destructive power-loss evidence позначається environmental, а не замінюється unit fake.

P3 deterministic fake лишається semantic cut-point oracle; concrete tests додають physical evidence через той самий `FullResourceDriverAdapter`, без другого production write path.

## Sources

- [Node.js 24 SQLite](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html) — RC status, synchronous `DatabaseSync`, readonly/timeout capabilities.
- [Node.js 24 filesystem](https://nodejs.org/download/release/latest-v24.x/docs/api/fs.html) — file sync/datasync/rename APIs без portable directory durability claim.
- [SQLite atomic commit](https://www.sqlite.org/atomiccommit.html) — rollback journal, flush і commit assumptions.
- [SQLite locking v3](https://www.sqlite.org/lockingv3.html) — VFS locks і hot-journal recovery.
- [SQLite PRAGMA](https://www.sqlite.org/pragma.html) — `synchronous=EXTRA` durability semantics для rollback journal.
- [SQLite corruption guidance](https://www.sqlite.org/howtocorrupt.html) і [network caveats](https://sqlite.org/useovernet.html) — filesystem lock/sync boundary.
- [POSIX fsync](https://pubs.opengroup.org/onlinepubs/009695399/functions/fsync.html) і [rename](https://pubs.opengroup.org/onlinepubs/9799919799/functions/rename.html) — bounded POSIX semantics.
- [Microsoft FlushFileBuffers](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers) і [MoveFileEx](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexa) — Windows flush/move limitations.

## Risks і limitations

- `node:sqlite` RC може змінитися в Node 24 minors; pin/CI and adapter isolation required.
- SQLite sync залежить від truthful OS/filesystem/device; power-loss survival не заявляється за межами tested local storage.
- Payload у SQLite збільшує write amplification, rollback-journal size і corruption/backup blast radius; P4-VS3 мусить мати explicit limits/performance gate.
- Synchronous DB API може блокувати event loop; chunk size, transaction duration і worker-boundary потребують executable рішення без другого write path.
- `locking_mode=EXCLUSIVE` обмежує одночасних readers; це свідомий v0.1 single-writer profile, а Phase 5 multi-instance policy не визначена.

## Downstream gates

Після whole-task approval, окремого approval/application FIX-001, publication artifact і post-application audit можна створити P4-WP1 для driver foundation. P4-VS1 потребує accepted P4-WP1. Asset semantics і staged upload входять P4-DG2/P4-VS2/P4-VS3. Tasks цим report не створюються й не активуються.
