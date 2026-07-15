# Контракт filesystem-native Storage Driver profile

Status: accepted target design
Compatibility: `experimental-filesystem-native`
Authority: TASK-07.26-0041, ADR-0012
Detailed Design: [Filesystem-native Storage Driver design](../reports/research/2026-07-15-extensia-filesystem-native-storage-driver-design.md)

## Висновок і межа

Сімейство `filesystem-native` здійсненне лише умовно та потребує profile-specific native helper. Варіант на чистому `node:fs`, PID/time lease і sidecar-only lock не доводять crash-released exclusion, безпечне takeover/fencing або directory-entry durability й не можуть утворити supported profile.

Немає сертифікованого filesystem-native profile. `linux-local-ext4-v1` є лише candidate design, а не твердженням про поточну реалізацію чи підтримку. Windows/NTFS, XFS, APFS та інші середовища мають окремі profile IDs і certification evidence; network/removable/overlay/sync filesystems працюють у режимі fail-close до окремого gate.

## Physical authority та публікація

- Native OS lock на immutable `LOCK` inode/handle є writer-exclusion authority: full writer бере exclusive lease, readonly — shared lease під час відкриття/валідації snapshot; PID і wall clock не беруть участі в takeover.
- Sidecars зберігають format, immutable objects/manifests і diagnostics, але самі не є lock/directory durability primitive.
- Immutable content-addressed objects і manifest chain публікуються одним atomically replaced та directory-synced `HEAD`.
- `HEAD` є єдиною committed authority. Кожен reachable manifest містить рівно один committed journal entry, попередній manifest, повний logical state root, operation ID і fingerprint.
- Недосяжні temp/object/manifest є orphan, а не committed state. Readonly їх ігнорує та не очищає. Shared readonly lease не дає побачити `HEAD` між replace і directory sync/reconciliation writer-а.

## Мапінг semantic contract

Один native lease утримується через recovery, coherent read, staging, `HEAD` publication, Core index publication і release. Resolve дозволений лише після durable `HEAD` та exact operation reconciliation; reject — лише до publication або після доказу, що старий `HEAD` лишився authority. Після publication attempt persistent недоступність durability domain призупиняє settlement/runtime і не маскується як reject.

Core і public API бачать незмінений opaque semantic Storage Driver contract. Native handles, paths, formats, mount certificates, object digests і cleanup не виходять за profile adapter.

## Формат і сумісність

V1 використовує точний binary framing `EXTFSV01`: `u16` big-endian version/kind, `u32` total length, kind-specific payload і SHA-256 усіх точних попередніх bytes. Види записів: `FORMAT`, immutable `LOCK`, `HEAD`, `MANIFEST`, `OBJECT`, diagnostic `SESSION`, parent-slot `INIT-COMPLETE`. `FORMAT` має `u16 hash_id=1` і `u16 journal_encoding=1`. MANIFEST прив'язує random UUIDv4 generation, session, SHA-256 отриманого previous HEAD, sequence, previous manifest, state root, operation/actor UUID, timestamp, fingerprint і один journal JSON; дубльовані fields мусять точно дорівнювати parsed journal, а HEAD generation/sequence/manifest — reachable MANIFEST. Init-lock має точний захищений checksum header розміром 96 bytes, два slots по 256 bytes на offsets 96/352 і точний file size 608; `root_name_sha256` обчислюється над точними UTF-8 bytes кінцевого basename без normalization після validation Node path. State-root, payload-index, completion-slot schemas і compatibility rules визначені в detailed report. Logical IDs не є paths; object/manifest filenames — lowercase SHA-256. Невідомі version/kind/encoding, noncanonical sequence/JSON, reachable checksum/hash/chain mismatch або missing object призводять до fail-close. Upgrade/migration потребує окремого owner gate.

## Lock, recovery і readonly

Native helper виконує handle-relative no-follow root access, точну filesystem/mount validation, crash-released exclusive/shared locks, file sync, cross-directory immutable `renameat2(RENAME_NOREPLACE)`, same-directory atomic `HEAD` replace і directory sync. Temp належить operation staging dir, а digest target — object/manifest shard. Після успішного rename **і після byte-equal `EEXIST`** destination shard обов'язково sync-иться до використання digest; source staging dir sync-иться після переміщення чи видалення temp. Наявний immutable hash path приймається лише за точної рівності bytes; mismatch спричиняє fail-close і ніколи не overwrite-иться. Takeover відбувається тільки після успішного OS-lock acquisition; stale PID/session record не блокує й не дозволяє takeover. Advisory Linux boundary охоплює cooperating Extensia processes, але не hostile writers.

Genesis initialization використовує persistent fixed-size parent init-lock inode, який створюється через `O_CREAT|O_NOFOLLOW`, отримує checksum-protected header і перед root staging безумовно виконує `fsync(file)+fsync(parent)` під exclusive lease, навіть якщо header був видимий після попереднього crash. Він містить immutable header і два checksum-protected in-place `INIT-COMPLETE` slots. Opener під shared lock перевіряє completion slots і final root; root приймається лише за valid matching slot. Стан `root exists + no valid slot` для readonly спричиняє fail-close із zero-write, а full opener звільняє shared, за bounded timeout отримує exclusive, обов'язково повторно перевіряє стан, виконує `fsync(parent)`, записує inactive slot, виконує `fsync(init-lock)` і validation. Для absent root діє той самий no-upgrade release/reacquire/recheck, потім fully synced sibling root, `RENAME_NOREPLACE`, `fsync(parent)`, slot write і `fsync(init-lock)`. Crash до valid slot ніколи не дозволяє readonly прийняти root; complete visible root узгоджує лише full exclusive opener. Partial/malformed final root спричиняє fail-close без auto-repair.

Full startup до ready валідовує `FORMAT`, `LOCK`, `HEAD`, contiguous manifest/journal chain і reachable state graph під одним exclusive lease. Auto-repair заборонено. Readonly робить zero writes, але бере shared OS lease, читає та валідовує atomic `HEAD` snapshot і immutable graph, а звільняє lease лише після повної snapshot validation; потреба в cleanup/recovery/migration означає fail-close.

## Кандидат `linux-local-ext4-v1`

Межа кандидата: точно сертифікована minor Node.js 24, x86-64 Linux/glibc, точний native-helper hash, kernel `>=6.6`, local block-backed ext4 `data=ordered` з journal/barriers, один host/mount namespace, той самий mount, driver-owned permissions, без DAX/overlay/FUSE/network/removable/sync/direct external mutation. Tuple не стає supported без executable certificate.

## Сертифікація

Certificate прив'язує OS/kernel, Node, helper hash, architecture, filesystem/mount/device tuple і probe version. Обов'язкові gates: init/shared/exclusive locks і path security; multi-process contention/timeout/crash release/readonly publication barrier; immutable no-replace/dedupe/mismatch; file/replace/directory-sync failures; binary golden/corruption vectors; kill на кожному init/write/sync/rename/reconcile cut point; idempotency/recovery/readonly/shared conformance; негативні перевірки unsupported environments. Process-kill evidence сертифікує лише process-crash safety. Твердження про power-loss додатково потребує destructive VM/block-device або physical power-cut evidence.

## Умови зупинки

Заборонено: success до directory durability; readonly observation під час unsettled publication; PID/time stale takeover; sidecar як lock primitive; independent journal authority; mutable multi-file committed state; physical paths у Core/API; content GC без reader-pinning design; повторне використання одного profile ID для нового OS/filesystem/evidence tuple.
