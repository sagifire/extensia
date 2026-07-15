# Filesystem-native Storage Driver Extensia: feasibility і physical protocol

Related Task: [TASK-07.26-0041](../../tasks/plan/TASK-07.26-0041-filesystem-native-storage-driver-design/task.md)
Related Run: [RUN-001](../../tasks/plan/TASK-07.26-0041-filesystem-native-storage-driver-design/RUN-001/index.md)
Related Research: [RSCH-001](../../tasks/plan/TASK-07.26-0041-filesystem-native-storage-driver-design/RSCH-001.md)
Date: 2026-07-15

## Резюме і verdict

Сімейство `filesystem-native` **умовно feasible**, але не як pure `node:fs` і не як sidecar-only lock protocol. Feasible implementation потребує profile-specific native helper, який є authority для crash-released OS lock, directory durability та path-safe handle-relative operations. Sidecar records зберігають format, immutable state і diagnostics, але не створюють lock або durability гарантію самі по собі.

Рекомендований physical design — immutable content-addressed objects і manifest chain, опубліковані одним atomic replacement файла `HEAD` під native exclusive lock. `HEAD` є єдиною committed authority. Кожен manifest містить рівно один committed journal entry та посилання на попередній manifest і повний logical state root. Незавершені manifests/objects не reachable з `HEAD`, тому є orphan, а не committed state.

Перший кандидат `linux-local-ext4-v1` лишається **uncertified** до окремого implementation/proof gate. Поточний Windows 11/Node.js `v24.17.0` probe є негативним: `node:fs` не має `flock`/`lockf`, `fsync` directory повернув `EPERM`, а `wx`-файл лишився після закриття owner. Windows/NTFS і XFS можуть стати окремими native profiles, але цей run їх не сертифікує.

## Спільний semantic contract → physical invariant

| Shared guarantee | Filesystem invariant | Primitive / authority | Поведінка failure |
|---|---|---|---|
| Один storage-level writer | Лише holder незмінного `LOCK` inode/handle може готувати й publish-ити `HEAD` | native OFD/Win32 byte-range lock; не PID file | contention до mutation; lost/changed handle fail-close |
| Atomic semantic commit | Новий state стає committed лише через один replace `HEAD.new → HEAD` | same-directory atomic replace + file sync + parent-directory durability | після publication attempt outcome reconcile-иться за operation ID; невизначеність не стає reject |
| Рівно один committed journal | Кожен reachable manifest має один journal entry; chain contiguous від `1` | manifest chain, anchored одним `HEAD` | gap, mismatch, cycle, unknown version — integrity failure |
| Outcome-definite settlement | resolve тільки після durable `HEAD`; reject тільки до publication або після доказу старого `HEAD` | reread/validate `HEAD`, manifest і operation ID під тим самим lock | persistent недоступність призупиняє settlement/runtime |
| Idempotency | Один operation ID відповідає одному exact draft/fingerprint | manifest scan/derived cache; cache не authority | identical returns receipt; mismatch — integrity failure |
| Recovery-before-ready | `HEAD` і весь reachable graph валідовані до ready; orphan не visible | hashes, chain, state-root traversal | corrupt/unknown reachable state fail-close; orphan cleanup лише full mode |
| Readonly | Readonly бере shared OS lease на `LOCK`, чекає завершення unsettled publication, тоді читає snapshot `HEAD` і immutable graph | shared native lock + atomic `HEAD` + immutable content | writer publication і readonly snapshot не перетинаються; mutation/recovery need — fail-close, zero writes |
| Payload integrity | Logical Asset references bind object digest, length і kind | SHA-256 content addressing | missing/mismatch — integrity failure |
| Core isolation | Core бачить logical snapshots/journal/session contract, не paths/formats | existing opaque driver adapter | physical details не потрапляють у Core/public API |

Немає semantic blocker за умови verified native helper і certified local filesystem. Без цих двох умов profile fail-close і не може називатися supported.

## Evidence і межі `node:fs`

Node.js 24 надає file handles, `sync()`/`datasync()`, `rename`, `wx`/`O_EXCL` і `statfs`, але документує OS/device-specific sync та platform-specific flags. У Node API немає standard `flock`, `lockf`, `LockFileEx`, handle-relative `openat2` або profile-level mount validation. `wx` забезпечує atomic create, однак не crash-release: stale entry лишається після owner exit; unsafe takeover повертає PID reuse, clock і delayed-writer problem.

Linux `fsync(2)` прямо вимагає окремого `fsync` directory для durability directory entry. `rename(2)` atomically replaces existing destination, але atomic visibility не є power-loss durability. Linux OFD locks прив'язані до open file description і автоматично знімаються на last close; вони advisory та захищають лише cooperating Extensia drivers. Windows `LockFileEx` також crash-released, але потребує native binding. Microsoft документує file flush/write-through, проте поточний Node probe не довів directory-entry durability і Windows profile тому лишається uncertified.

### Capability matrix

| Capability | Pure `node:fs` | Native helper | Sidecar record | Рішення |
|---|---|---|---|---|
| Atomic create-exclusive | `wx`, з caveat для network FS | `openat(...O_EXCL|O_NOFOLLOW)` | marker only | helper для path safety; не lock authority |
| Crash-released exclusive lock | немає API | Linux `F_OFD_SETLK`; Windows `LockFileEx` candidate | не може забезпечити | native required |
| File data+metadata sync | `FileHandle.sync()` | `fsync`/`FlushFileBuffers` | лише data format | helper перевіряє exact errors/handle |
| Directory entry durability | works only where OS accepts directory fd; Windows probe `EPERM` | Linux `fsync(dirfd)`; Windows needs separate proven primitive | не може забезпечити | native/profile proof required |
| Atomic same-directory replace | `rename` делегує OS | `renameat`/profile-specific replace | `HEAD` несе authority | бажаний native handle-relative primitive |
| Symlink/reparse containment | partial path APIs; TOCTOU лишається | `openat2`/`O_NOFOLLOW` або Win32 reparse-safe handles | checksum не запобігає traversal | потрібен native helper |
| Mount/filesystem verification | одного `statfs` недостатньо | statfs + mount/volume flags + handle identity | records декларують profile | потрібен native helper |
| Power-loss proof | live process probe не доводить | destructive harness + truthful device | checksum лише виявляє | потрібна certification |

### Executed local evidence

Артефакт: `RUN-001/filesystem-capability-probe.mjs`.

Спостереження на `win32/x64`, Node.js `v24.17.0`:

- `create_exclusive_contention = EEXIST`;
- після close owner `create_exclusive_after_owner_close = EEXIST`, отже marker stale;
- `file_sync_and_same_directory_replace = ok`;
- `directory_fsync = EPERM`;
- `node_flock = undefined`, `node_lockf = undefined`;
- symlink видимий через `lstat`, але `O_NOFOLLOW` constant unavailable;
- `power_loss_durability = not-proven-by-live-process-probe`.

Це capability evidence лише для поточного host. Воно не доводить NTFS power-loss semantics і не переноситься на Linux/macOS/network filesystems.

## Alternatives

| Альтернатива | Guarantees | Portability / complexity | Failure/security | Висновок |
|---|---|---|---|---|
| Pure `node:fs` + `wx` lock file | атомарне створення, file sync, rename | просте розгортання | stale owner після crash; takeover без fence; platform-dependent directory durability | відхилено |
| Sidecar lease з PID/time | живучість через optimistic timeout | поверхнево portable | PID reuse, clock jumps, suspended process, delayed writer, split brain | відхилено |
| Sidecar generation без OS lock | immutable data з generation checks | висока складність protocol | немає atomic compare-and-swap `HEAD`; старий writer може publish після check | відхилено |
| Native helper + mutable multi-file state | verified lock/sync | середня ціна packaging | partial multi-file publication і складне recovery | відхилено |
| Native helper + immutable graph + один `HEAD` | одна publication authority, crash-released lock, bounded recovery | platform-specific build/certification | storage amplification, немає захисту від hostile writer | **рекомендовано** |
| Embedded SQLite | сильніший готовий transaction engine | уже має owner P4-DG1 | не належить filesystem-native family | лишається first/default profile `0.1.0` |

## Supported і candidate profiles

На момент цього design run **немає certified filesystem-native profile**.

### Candidate `linux-local-ext4-v1`

Profile може бути сертифікований лише для exact evidence tuple:

- Node.js 24 exact tested minor, x86-64 Linux, glibc build і exact native-helper binary hash;
- Linux kernel `>=6.6`, local block-backed ext4, одна mount namespace, один host;
- ext4 `data=ordered`, journal і barriers enabled; без DAX, `nobarrier`, overlay/union/FUSE, network, removable/sync-folder або userspace encryption layer без окремого proof;
- storage root і всі descendants на одному `st_dev`/mount; driver owns mode/UID/GID; no symlink/magic-link traversal;
- cooperating Extensia drivers only; direct external mutation і hostile privileged process unsupported;
- device/virtualization stack truthfully honors flush/FUA. Якщо це не доведено environmental certification, claim обмежується process-crash, а power-loss profile лишається unsupported.

XFS має окремий future profile навіть якщо protocol bytes ті самі. macOS/APFS потребує окремого `F_FULLFSYNC`/lock/rename proof. Windows/NTFS потребує helper з `LockFileEx`, reparse-safe handles та independently proven write-through replace/directory durability. NFS/SMB/CIFS, WSL interop mounts, Docker bind/overlay, cloud-sync folders, USB/removable volumes і memory filesystems fail-close.

## Native helper contract

Helper є internal profile component, ізольований за наявною opaque Storage Driver boundary. Для Linux candidate він має надати:

1. `openRoot(path)` — canonical absolute root; `openat2` з `RESOLVE_BENEATH|RESOLVE_NO_SYMLINKS|RESOLVE_NO_MAGICLINKS`, directory handle, mount identity і дозволений `statfs` type.
2. `acquireExclusive(lockName, timeout)` — відкрити immutable regular `LOCK` через root handle, перевірити `(st_dev, st_ino, nlink=1, uid, mode)`, захопити whole-file `F_OFD_SETLK`; opaque lease володіє fd/open description.
3. `acquireShared(lockName, timeout)` — та сама identity validation і shared OFD lock; потрібен readonly до завершення відкриття та валідації всього snapshot graph.
4. `writeCreateSync(lease, dir, tempName, bytes, mode)` — create-exclusive no-follow, exact-length writes, `fsync(file)`, close; partial file після error лишається orphan.
5. `publishImmutableNoReplace(lease, sourceDir, tempName, destinationDir, digestName)` — handle-relative cross-directory Linux `renameat2(sourceDir/tempName, destinationDir/digestName, RENAME_NOREPLACE)` на тому самому mount. Після successful rename helper обов'язково sync-ить destination dir, а потім source dir. `EEXIST` дозволяє лише no-follow reread exact existing bytes: identical bytes означають dedupe, але до використання digest helper також обов'язково виконує `fsync(destinationDir)`, видаляє temp і sync-ить source dir; будь-яка відмінність під тим самим digest — tampering/hash-collision integrity failure. Overwrite заборонений.
6. `replaceAndSync(lease, dir, tempName, finalName)` — перевірити lease/inode/mount, same-directory `renameat`, потім `fsync(dirfd)`; success лише після обох кроків.
7. `syncDirectory(lease, dir)` та `unlinkOrphan(lease, path)` — handle-relative, no-follow, same mount; cleanup завершується directory sync.
8. `verifyLease(lease)` — held OFD lock and unchanged `LOCK` inode перед кожною namespace mutation.

JS не отримує raw fd/path mutation authority. Helper error taxonomy розділяє `contended`, `unsupported-profile`, `io-before-publication`, `publication-unknown`, `integrity`, `tampering` і `lease-lost`. Native helper не є security boundary проти privileged host process.

## Initialization і genesis state machine

Initialization має окрему persistent parent-side OS-lock authority `.<root-name>.extensia-init-lock`; PID/час у ній відсутні. Це fixed-size regular file, inode якого durable створюється й parent-sync-иться **до** root initialization. Той самий file містить два in-place checksum-protected completion slots; slot є durability proof, бо записується й `fsync(init-lock)`-иться лише після successful `fsync(parent)` для final root. Нового namespace marker немає. Parent directory має бути driver-controlled, local і придатним до directory sync. Lock upgrade заборонений.

1. Кожний opener виконує `openat(parent, init-lock, O_CREAT|O_NOFOLLOW)` без truncate; concurrent calls отримують той самий directory inode або fail-close на inode/path mismatch. Після regular-file/owner/mode/`nlink=1` validation opener бере shared OFD lock. Valid checksum-protected header дозволяє крок 3. Zero/uninitialized file змушує release shared → bounded exclusive acquire → mandatory recheck; лише exclusive holder initialize-ить exact 608-byte file. Nonzero malformed header fail-close. Header bind-ить generated storage UUID і root-name digest.
2. Init-lock inode і header після initialization не replace-яться. Кожний наступний opener перевіряє header/checksum, path↔handle identity і mount identity під shared/exclusive lease; timeout/cancellation до mutation bounded.
3. Під shared lock opener читає обидва completion slots і final root. Valid slot має match storage UUID, root-name digest, immutable `FORMAT`/`LOCK` digests і genesis digest. `root exists + valid slot` переходить до normal open; `root absent + valid slot`, mismatch або malformed final root fail-close.
4. `root exists + no valid slot` означає visible-but-unproven init. Readonly fail-close з zero writes. Full opener release-ить shared lock, bounded acquire-ить exclusive і mandatory recheck-ить slots/root.
5. `root absent + no valid slot`: opener release-ить shared lock, бере exclusive OFD lock з bounded timeout і mandatory recheck-ить slots/root. Blocking shared→exclusive upgrade заборонений. Timeout/cancellation до staging повертає contention/not-initialized без mutation. Перед будь-яким staging exclusive holder безумовно reread-ить valid header, виконує `fsync(init-lock)` і `fsync(parent)`; visible header після prior crash стає durable до root namespace mutation.
6. Після exclusive reacquire: valid slot + matching root лише validate-иться; valid slot без root або mismatch fail-close. Complete matching root без valid slot є interrupted post-rename init: full opener виконує `fsync(parent)`, записує complete record в inactive slot exact-position write, `fsync(init-lock)`, reread/validate і лише тоді продовжує. Partial/corrupt slot ігнорується тільки якщо інший slot valid; якщо valid slot немає, full може overwrite inactive/invalid slot лише для exact complete matching root.
7. Лише якщо root і valid slot повторно absent, створюється sibling staging root `.<root-name>.init.<uuid>` mode `0700`. У ньому створюються всі 256 object/manifests shards, `.staging`, exact `FORMAT`, immutable `LOCK` і genesis `HEAD` з storage UUID init-lock header.
8. Кожний file sync-иться; кожний child directory sync-иться bottom-up; staging root sync-иться. Genesis `HEAD` має zero generation/digest і empty sequence. Після початку staging cancellation не перериває settle/cleanup init attempt.
9. Helper виконує `renameat2(staging, final, RENAME_NOREPLACE)` і `fsync(parent)`. Після successful parent sync він записує `INIT-COMPLETE` у inactive fixed slot, `fsync(init-lock)` і reread-ить slot. Лише valid slot дозволяє ready/open. Crash до slot sync лишає no valid slot, який може reconcile-ити лише наступний full exclusive opener; readonly fail-close.
10. Exclusive init lock утримується до successful parent sync, completion-slot sync і final validation. Два first openers не deadlock-яться: обидва release shared, один виграє exclusive/init, другий після exclusive acquisition mandatory recheck-ить valid slot/root.

Crash до final rename лишає лише sibling orphan, який наступний exclusive initializer може видалити після exact name/owner validation і parent sync. Crash після rename до parent sync лишає complete final root або його відсутність після power loss; наступний initializer під exclusive init lock або sync-ить/валідує complete root, або створює заново, але ніколи не приймає partial final root.

## Exact layout і ownership

```text
<root>/                         # належить driver, один certified mount
  FORMAT                        # immutable record, створюється один раз
  LOCK                          # immutable inode; native lock bytes [0, EOF)
  HEAD                          # єдина committed authority
  objects/
    00/ ... ff/                 # попередньо створені content-addressed shards
  manifests/
    00/ ... ff/                 # попередньо створені manifest shards
  .staging/
    <session-uuid>/
      SESSION                   # лише diagnostics; не authority
      <operation-uuid>/         # temp files до content-addressed move
```

Усі control directories і 256 shards initialize-яться до genesis `HEAD`; кожний створений directory і parent sync-иться. Logical Resource/Asset IDs ніколи не стають path components. Content filenames — lowercase 64-hex SHA-256 exact framed bytes. Temp names — згенеровані Extensia UUID. Committed read ніколи не follows symlink/reparse point. `LOCK` і `FORMAT` не replace/remove-яться протягом lifetime storage.

Parent init-lock має fixed 96-byte header: `magic[8]="EXTINLK1"`, `u16 version=1`, `u16 slot_count=2`, `u32 slot_size=256`, `storage_uuid[16]`, `root_name_sha256[32]`, `header_sha256[32]`; checksum дорівнює SHA-256 exact bytes `0..63`. File size exact `608`. Slots починаються на offsets `96` і `352`; кожний містить один framed kind `7=INIT-COMPLETE` і zero padding до 256 bytes. Payload: `storage_uuid[16]`, `u64 completion_generation=1`, `root_name_sha256[32]`, `format_record_sha256[32]`, `lock_record_sha256[32]`, `genesis_head_sha256[32]`. Slot valid лише за exact frame/checksum/padding і matching immutable records. Zero slot є empty; writer обирає zero/invalid inactive slot і ніколи не overwrite-ить valid slot. Якщо valid обидва, їхні framed bytes мусять бути identical; mismatch fail-close. Reader приймає один valid slot або два identical valid slots.

Для `linux-local-ext4-v1` config path мусить бути absolute Node UTF-16 string без NUL і trailing separator. Native helper перетворює лише final basename на exact UTF-8 bytes без Unicode normalization; відхиляє empty, `.`/`..`, slash byte, invalid surrogate і byte length поза `1..255`. `root_name_sha256` є SHA-256 саме цих exact UTF-8 basename bytes. Parent path resolve-иться handle-relative; digest не замінює containment validation.

`.staging/SESSION` може містити session UUID, process ID і startup timestamp для diagnostics. PID/time ніколи не авторизують takeover. Cleanup дозволено лише після native lock acquisition і ніколи в readonly mode.

## Binary record framing v1

Усі integers — unsigned big-endian. Усі lengths рахують bytes. UUID — 16 raw RFC 4122 bytes; hash — 32 raw SHA-256 bytes; strings — exact UTF-8, якщо не позначено ASCII. Кожний record має:

```text
offset  size  field
0       8     magic = ASCII "EXTFSV01"
8       2     version = 1
10      2     kind
12      4     total_length = 48 + payload_length
16      N     kind-specific payload
16+N    32    SHA-256(bytes[0 .. 15+N])
```

Reader вимагає exact file length, known version/kind, valid checksum, bounded lengths, відсутність trailing bytes і canonical encodings. Unknown version/kind, truncation, overflow або checksum mismatch fail-close для reachable record; unreachable files quarantine-яться як orphan.

Kinds записів:

1. `FORMAT`: `storage_uuid[16]`, `u32 profile_id_length`, lowercase ASCII profile ID, `u64 created_epoch_ms`, `u16 hash_id=1`, `u16 journal_encoding=1`. Exact v1 profile ID — `linux-local-ext4-v1`.
2. `LOCK`: `storage_uuid[16]`, `lock_uuid[16]`. File immutable після initialization; lock покриває весь file.
3. `HEAD`: `storage_uuid[16]`, `generation_uuid[16]`, `manifest_digest[32]`, `u32 sequence_length`, canonical positive decimal ASCII sequence. Genesis використовує zero generation/digest і zero sequence length; non-genesis забороняє leading zero.
4. `MANIFEST`: `storage_uuid[16]`, `generation_uuid[16]`, `session_uuid[16]`, `acquired_head_digest[32]`, `u32 sequence_length + sequence`, `previous_manifest_digest[32]`, `state_root_digest[32]`, `operation_uuid[16]`, `actor_uuid[16]`, `u64 committed_epoch_ms`, `write_set_fingerprint[32]`, `u32 journal_json_length + journal_json`.
5. `OBJECT`: `storage_uuid[16]`, `u16 object_kind`, `u16 encoding`, `u64 content_length`, exact content bytes. V1 object kinds: `1=state-root`, `2=resource-snapshot`, `3=asset-payload-chunk`, `4=payload-index`. Encoding `1` — accepted canonical UTF-8 JSON; encoding `2` — opaque bytes лише для payload chunk.
6. `SESSION`: `storage_uuid[16]`, `session_uuid[16]`, `u32 pid`, `u64 started_epoch_ms`, `u32 helper_hash_length + lowercase ASCII helper SHA-256`. Лише diagnostic record.
7. `INIT-COMPLETE`: exact fixed-slot completion payload, визначений layout init-lock вище; не є committed data authority, а лише proof завершеного parent sync для genesis namespace.

Кожна non-genesis operation генерує random UUID v4 `generation_uuid`; `HEAD.generation_uuid` мусить byte-equal reachable `MANIFEST.generation_uuid`. `acquired_head_digest` є SHA-256 exact previous `HEAD` framed bytes; first commit bind-иться до genesis HEAD. `previous_manifest_digest` дорівнює попередньому `HEAD.manifest_digest`.

Canonical JSON використовує accepted P3 fixed schema order, UTF-8, JSON primitive encoding, sorted record keys і preserved array/write-set order; BOM/whitespace/non-finite numbers/duplicate keys заборонені. `journal_json` має exact key order `schema_version,sequence,operation_id,actor_id,type,committed_at,write_set_fingerprint,changes`; parsed `sequence`, UUIDs, timestamp і fingerprint мусять exact-equal дубльованим binary MANIFEST fields, інакше integrity failure. `schema_version=1`; `changes` відповідає accepted P3 logical change schema.

`state-root` encoding `1` має exact JSON shape `{"resources":[[id,digest],...],"payloads":[[id,digest],...]}`: UUIDs canonical lowercase, digests lowercase 64-hex, arrays strictly ASCII-lexically sorted by ID, duplicate IDs forbidden. Resource object content — exact accepted canonical Resource snapshot JSON. `payload-index` має exact shape `{"byte_length":decimalString,"sha256":hexDigest,"chunks":[[indexDecimal,digest,lengthDecimal],...]}`; indexes canonical decimal contiguous від `0`, digest 64-hex, lengths canonical nonnegative decimals, сума chunk lengths дорівнює `byte_length`, whole-payload hash мусить збігатися. Maximum record/object/chunk limits належать implementation gate й bind-яться profile certificate; over-limit state fail-close до allocation.

Compatibility rule strict: v1 readers приймають лише frame v1 і known kinds/encodings. Нові optional fields потребують new record version; skip-unknown TLV behavior відсутня. Upgrade/migration writes потребують separate owner gate. Newer storage ніколи не opens readonly під older reader.

## Lock, stale owner, fencing і takeover

Native OS lock на `LOCK` є єдиною writer-exclusion authority. На Linux він advisory, тому support охоплює cooperating Extensia processes, але не hostile writers. Lease renewal, wall-clock expiry і PID liveness decision відсутні.

Порядок acquisition:

1. Відкрити root/profile та immutable `LOCK` через handle, перевірити identity/content.
2. Спробувати захопити native exclusive lock з bounded pre-mutation timeout; readonly використовує shared lock.
3. Після успіху перечитати `HEAD`, згенерувати random session UUID і next sequence.
4. Кожна mutation передає opaque lease; helper повторно перевіряє lock-file identity і mount.
5. Release виконується лише після Core post-commit publication і cleanup; process death/last close звільняє OS lock.

Takeover означає successful OS-lock acquisition після release попереднього handle. Stale `SESSION` є diagnostics/orphan і не може block/authorize takeover. PID reuse і wall clocks не впливають. Suspended old process далі тримає lock, тому takeover waits/fails замість split-brain. Terminated old process не може виконати delayed writes. Replacement/unlink `LOCK`, lease loss або mount identity change є integrity/tampering failure і closes intake.

Fence — `(storage_uuid, session_uuid, acquired_head_digest, next_sequence)`, bind-нутий у manifest разом з opaque native lease. Це не distributed fencing token. Split-brain між hosts/network filesystems unsupported і reject-иться profile detection.

## Commit і outcome reconciliation

1. Під native lease завантажити й перевірити current `HEAD`, reachable manifest chain і latest logical state, потрібний Core.
2. Побудувати canonical new Resource/Asset/payload objects і manifest з `sequence = head+1`, `previous = current manifest`, exact operation ID/fingerprint і one journal entry.
3. Для кожного нового object записати create-exclusive temp у operation staging dir, виконати `fsync(file)` і cross-directory publish у digest shard через `RENAME_NOREPLACE`. Після success або byte-equal `EEXIST` destination shard обов'язково `fsync`-иться до того, як digest можна включити у manifest; mismatch fail-close. Source staging dir sync-иться після move/delete temp.
4. Так само записати й sync-нути manifest, потім перевірити його повторним читанням/hash.
5. Записати `HEAD.<operation>.new`, виконати `fsync(file)` і перевірити bytes.
6. Native helper atomically replaces `HEAD` in root and `fsync(root dir)`. Це є єдина publication attempt.
7. Reread `HEAD`, manifest, operation ID, sequence і state root. Exact match resolves committed receipt; Core publish occurs while lease remains held.
8. Виконати cleanup staging/orphans після commit; cleanup failure є post-commit warning/fail-close де потрібно, але ніколи rollback.

До кроку 6 будь-який failure доведено not committed і може завершитися reject після cleanup. Після спроби replace негайний reject заборонений. Якщо `rename` або directory sync повертає error, driver тримає intake closed і виконує reconciliation під lease:

- новий exact `HEAD` + successful directory sync retry → resolve committed;
- старий exact `HEAD` і helper довів, що replace не відбувся → reject not committed;
- corrupt/mismatched `HEAD` → integrity fail-close;
- inaccessible durability domain → promise лишається unsettled з bounded backoff/operator diagnostics. Restart обирає єдиний durable `HEAD`; interrupted call не мала false settlement.

## Recovery, readonly і cleanup

Full startup захоплює native lock до mutation, перевіряє `FORMAT`/`LOCK` і `HEAD`, проходить manifest chain до genesis та перевіряє decreasing contiguous sequence, відсутність digest cycle, exact uniqueness operation ID/fingerprint, state-root closure і object integrity. Потім під тим самим lease будує coherent committed scan/journal head і лише після цього дозволяє ready publication.

Недосяжні valid staging/manifests/objects є orphans. V1 cleanup може видаляти лише `.staging` і unreachable manifests, визначені completed scan; content-object garbage collection вимкнено, щоб не створювати race із readonly readers. Майбутній GC потребує власного reader pinning/epoch design gate. Unknown files в owned directories, symlinks, wrong owner/mode, hard links (`nlink != 1` там, де це обов'язково), mount crossing або malformed reachable state призводять до fail-close; automatic repair заборонений.

Readonly виконує zero writes, але бере shared OS lease на той самий `LOCK` range. Writer exclusive lease утримується через `HEAD` replace, root-directory sync, reconciliation і Core publication, тому readonly не може observe new `HEAD` у visibility-before-durability window. Під shared lease readonly відкриває/валідує один `HEAD` і весь reachable immutable graph, після чого lease можна release: v1 не GC-ить content objects, тож snapshot не зникає. Якщо recovery/cleanup/migration потрібні, readonly startup fail-close з safe code.

## Cut-point matrix

| Cut point | Reachable після restart | Обов'язкова classification |
|---|---|---|
| до native lock | старий `HEAD` | lock failure, mutation відсутня |
| concurrent readonly під час writer replace→root-fsync/reconcile | reader чекає shared `LOCK` | новий state не observable до durable/reconciled publication |
| після lock, до object temp | старий `HEAD` | reject not committed |
| partial object/session/temp write | старий `HEAD`; truncated orphan | reject; cleanup у наступній full session |
| після object file sync, до shard rename | старий `HEAD`; valid temp orphan | reject; dedupe/cleanup |
| після object rename, до shard fsync | старий `HEAD`; object може persist/disappear після power loss | reject; у будь-якому разі unreachable |
| later byte-equal `EEXIST` на object/manifest із uncertain prior orphan | старий `HEAD`; existing entry ще не можна reference | mandatory destination-shard fsync до включення digest; failure не publish-ить `HEAD` |
| після shard fsync | старий `HEAD`; durable unreachable object | reject; safe orphan |
| partial manifest write | старий `HEAD`; malformed orphan | reject; cleanup |
| manifest rename до shard fsync | старий `HEAD`; manifest uncertain, але unreachable | reject; safe orphan |
| durable manifest до HEAD temp | старий `HEAD`; unreachable graph complete | reject; safe orphan |
| partial HEAD temp | старий `HEAD` | reject; cleanup |
| HEAD temp fsynced до replace | старий `HEAD` | reject; cleanup |
| replace не attempted / helper довів failure | старий `HEAD` | reject not committed |
| replace executed до root fsync | старий або новий durable `HEAD` після crash | settlement відсутній; authority визначає restart |
| root fsync успішний до receipt | новий `HEAD` | resolve через operation reconciliation |
| receipt втрачено / process killed | новий `HEAD` | retry тієї самої operation повертає identical receipt |
| після commit, до Core index publish | новий `HEAD` | startup reload; current runtime committed warning/fail-close |
| cleanup failure | новий `HEAD` + orphan | committed warning/fail-close, ніколи reject |
| lock-holder process killed на будь-якому pre-publish step | старий `HEAD` | OS releases lock; next session cleans orphan |
| lock-holder killed після durable HEAD | новий `HEAD` | recovery бачить committed operation |
| checksum/unknown version у `HEAD` | authority неоднозначна/corrupt | integrity fail-close |
| reachable object missing/corrupt | committed graph неможливо виконати | integrity fail-close |
| gap/duplicate/cycle у sequence | journal authority невалідна | integrity fail-close |
| readonly бачить orphan | ignored | cleanup write відсутній |
| readonly бачить recovery/migration need | ready state відсутній | fail-close, zero writes |
| ENOSPC/EIO до replace | старий `HEAD` | reject після proof |
| ENOSPC/EIO під час/після replace | unknown до reconciliation | immediate reject заборонений |
| mount/device зникає після replace | inaccessible | settlement/runtime призупиняються |

Cut points initialization:

| Init cut point | Final root | Обов'язкова classification |
|---|---|---|
| до/під час init-lock create/acquire | absent або prior valid | contention/failure, ready відсутній |
| init-lock header write до file/parent fsync | root absent | checksum-invalid header fail-close; checksum-valid visible header full exclusive безумовно file+parent-sync-ить до staging; readonly root все одно absent |
| два first openers бачать absent root під shared init locks | absent | обидва release shared; лише один acquire exclusive; другий чекає bounded timeout |
| second opener acquire-ить exclusive після winner | complete final root | mandatory recheck; повторна initialization заборонена |
| partial sibling staging tree/file/shard | absent | лише orphan; його чистить next exclusive initializer |
| staging tree fully synced до final rename | absent | safe orphan, not initialized |
| conflict `RENAME_NOREPLACE` | existing final | validate exact complete root або fail-close |
| final rename до parent fsync | complete visible, durability unsettled | усі інші openers blocked init lock; ready/resolve відсутні |
| parent fsync success до completion-slot sync | complete durable root, no valid slot | readonly fail-close; next full exclusive writes/syncs slot |
| completion-slot partial write/crash до init-lock fsync | complete durable root, invalid/no slot | readonly fail-close; next full exclusive rewrites inactive slot |
| valid completion slot до validation return | complete durable root | validate, потім normal open |
| crash після rename до parent fsync | complete visible або absent після power loss, no valid slot | readonly fail-close; next full exclusive sync-ить/валідує complete root або initialize-ить absent root |
| root exists + no valid slot на first full opener | complete, durability unproven | acquire exclusive, mandatory recheck, `fsync(parent)`, slot write + init-lock fsync |
| root exists + no valid slot на readonly opener | complete, durability unproven | fail-close, zero writes |
| valid completion slot + root absent/mismatch | inconsistent authority | integrity fail-close; recreate/repair заборонені |
| malformed existing final root | present | integrity fail-close; auto-repair відсутній |

Process-kill tests не доводять power-loss durability. Certification має повторити namespace cut points із destructive VM/block-device power-cut або еквівалентним storage-fault harness і перевірити, що результатом є рівно старий або новий valid `HEAD`, але ніколи falsely resolved lost commit.

## Certification procedure

Profile certificate генерується, а не пишеться вручну, і bind-ить OS/kernel, exact Node version, native-helper hash, architecture, filesystem type, mount flags, volume identity, device/virtualization class і probe version. Startup порівнює current tuple і fail-close при mismatch.

Обов'язкові executable gates:

1. Native ABI/self-test: helper hash/signature, Node-API compatibility, handle-relative containment, negative cases для symlink/hardlink/mount crossing.
2. Two-process lock matrix: exclusive writer/shared readonly contention, visibility-before-directory-sync barrier, release/reacquire/recheck двох first openers, timeout/cancellation, last-close і `SIGKILL` release, duplicated fd lifetime, replaced `LOCK` inode, delayed task, suspended owner; 1000+ randomized repetitions.
3. Namespace matrix: init-lock header/file/parent sync, completion-slot torn write/fsync, readonly no-slot negative case, staged genesis initialization, cross-directory `RENAME_NOREPLACE`, uncertain-orphan byte-equal reuse з mandatory destination sync, immutable mismatch, file sync, same-directory `HEAD` replace, root/shard/source/parent directory sync, disk-full/permission/read-only/EIO injection.
4. Exact format golden vectors: 96-byte init header/checksum, 608-byte file/slot offsets, UTF-16→exact UTF-8 basename digest cases, кожний framed kind, min/max lengths, checksum, truncation на кожному byte, unknown version/kind/encoding, noncanonical decimal/JSON, duplicate IDs/sequence.
5. Cut-point harness: child killed до/після кожного write/fsync/rename/directory-fsync/reconcile/cleanup step; fresh process перевіряє old/new authority та idempotency.
6. Multi-process semantic conformance: retry тієї самої operation, conflicting operations, lock crash release, recovery-before-ready, readonly concurrent snapshots.
7. Destructive power-loss gate for any power-loss claim: VM virtual block device або dedicated test volume with abrupt power cut at namespace cut points; dishonest-cache configurations are negative profiles.
8. Security/operability: permissions/umask/ACL, symlink/reparse/path traversal, hostile unknown files, antivirus/indexer interference де applicable, negative detection removable/network/overlay.
9. Conformance чинного shared driver: той самий `FullResourceDriverAdapter`, journal/cursor/idempotency/integrity і Asset compound payload actions; alternate Core write path відсутній.

Самих зелених process-crash gates достатньо лише для certificate class `process-crash-safe`, але не `power-loss-safe`. Production support wording має називати exact certificate class.

## Security і operational boundary

- Storage root має контролювати application; world-writable заборонено. Linux candidate вимагає exact owner, mode `0700` для directories і `0600` для files.
- Logical IDs ніколи не є paths; усі mutation handle-relative; `..`, separators, NUL і external absolute paths не потрапляють у physical naming.
- Symlinks, magic links, reparse points, hard links, mount crossing і unknown owned filenames fail-close.
- SHA-256 виявляє accidental/tampered content, але не є authentication. Privileged hostile process може replace storage і перебуває поза guarantee.
- Advisory Linux lock охоплює cooperating processes. Direct editors, backup tools з in-place mutation, cloud-sync agents і antivirus behavior потребують exclusion або separate profile evidence.
- Backup має snapshot-ити reachable immutable graph разом із `HEAD`; copying live files без protocol-aware ordering unsupported.
- V1 не має compaction/GC content objects і може зростати. Quota, object/chunk limit, backup і migration gates є downstream requirements.

## Architecture boundary і pressure

Protocol узгоджується з чинною architecture лише як profile-local adapter за opaque `FullResourceDriver`. Core і далі володіє semantic validation/operation plan та отримує logical snapshots/receipts. Native lease, paths, binary frames, mount certificate, object digests і cleanup не перетинають adapter boundary.

Architecture pressure істотний у packaging, storage amplification, startup chain scan і GC. Його не можна зменшувати витоком paths у Core, independent journal file, success до directory durability, PID stale takeover або другим Asset payload publication path. Якщо performance потребуватиме mutable indexes чи GC, вони мають отримати окремий derived-cache/epoch design і не можуть стати authority.

## Downstream slicing

Цей report не активує жодної downstream task. Після human approval і exact fixation application рекомендована bounded sequence:

1. `filesystem-native-linux-helper-spike` — research-only native helper, path containment, OFD lock і directory-sync proof; без Storage Driver success claims.
2. `filesystem-native-format-conformance` — frame codec/golden vectors, immutable graph builder/reader і corruption matrix.
3. `filesystem-native-linux-process-crash-certification` — adapter integration, two-process locks, kill cut points, readonly і shared semantic conformance.
4. `filesystem-native-linux-power-loss-certification` — destructive environmental gate; optional, якщо product support лишається process-crash-only.
5. Окремий Windows/NTFS design run лише після proof exact write-through replace/directory durability primitive; protocol bytes можна reuse, а certification/profile ID — ні.

## Upward consistency

| Area | Disposition |
|---|---|
| `state.md` | activation lifecycle уже reflected; closure потребує human decision |
| Product requirements/roadmap | family/deferred positioning незмінні; product promise не widened |
| Domain current/target/rules | не потрібно; domain semantic change відсутня |
| Technical architecture/rules/open questions | required `FIX-001` пропонує exact target contract і closes owner question після approval |
| ADR | required `FIX-001` пропонує profile design ADR; application у цьому run відсутня |
| Knowledge packages | не потрібно; design project-specific, не reusable methodology |
| Indexes | включено у `FIX-001` для proposed new canonical files |

## Primary sources

- [Node.js 24 filesystem API](https://nodejs.org/download/release/latest-v24.x/docs/api/fs.html) — file handles, sync/datasync, rename, `wx`, statfs і platform caveats.
- [Linux `fsync(2)`](https://man7.org/linux/man-pages/man2/fsync.2.html) — file sync та explicit parent-directory sync requirement.
- [Linux `rename(2)`](https://man7.org/linux/man-pages/man2/rename.2.html) — semantics атомарної заміни.
- [Linux `fcntl` locking](https://man7.org/linux/man-pages/man2/fcntl_locking.2.html) — lifetime OFD lock, crash/close release і advisory boundary.
- [Linux `open(2)`](https://man7.org/linux/man-pages/man2/open.2.html) — `O_EXCL`, `O_NOFOLLOW`, synchronized I/O і file-description semantics.
- [POSIX `rename`](https://pubs.opengroup.org/onlinepubs/9799919799/functions/rename.html) і [POSIX `open`](https://pubs.opengroup.org/onlinepubs/007904875/functions/open.html) — portable namespace/create semantics without profile-specific durability claim.
- [Microsoft `LockFileEx`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-lockfileex) — exclusive byte-range lock і OS unlock після process termination/handle close.
- [Microsoft `FlushFileBuffers`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers) і [CreateFile](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilea) — file flush/write-through і hardware caveats.
- [Microsoft `MoveFileEx`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexa) і [ReplaceFile](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-replacefilea) — candidate replace primitives; not certification evidence by themselves.

## Residual risks

- Жоден profile не має destructive power-loss evidence; висновок стосується feasibility, не certification.
- Native helper додає build/signing/ABI/supply-chain surface і platform-specific maintenance.
- Повні immutable state roots і retained history можуть мати неприйнятний write/startup amplification для великих game projects.
- OS/filesystem documentation не доводить, що конкретний device cache або virtualization stack honors flush.
- Readonly safety наразі залежить від відсутності content-object GC; future compaction є separate concurrency design.
- Windows directory durability лишається unresolved, тому game-development priority ще не виправдовує Windows support claim.
