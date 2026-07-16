# ADR-0010: Local SQLite storage protocol

Status: accepted target design
Date: 2026-07-12
Updated: 2026-07-16
Decision Owner: P4-DG1 / TASK-07.26-0039
Evidence: `memory/reports/research/2026-07-12-extensia-concrete-storage-protocol.md`

## Контекст

Phase 3 довела semantic commit на deterministic fake, але не physical durability. Generic `node:fs` не дає portable crash-released lock і directory-sync boundary, достатні для чесного cross-platform driver protocol.

## Рішення

- Перший concrete driver — internal `local-sqlite-v1`, profile family `embedded-transactional`, на Node.js 24 `node:sqlite`.
- Одна SQLite durability domain містить Resource metadata, committed journal і майбутні opaque payload chunks. External filesystem blob publication у baseline заборонена.
- Proposed initial support boundary: Windows 11 local NTFS, one host, one full writer. Certification потребує P4-WP1 crash/lock proof. Linux ext4/XFS лишається candidate до окремої certification. Network/removable/sync/FUSE/direct mutation unsupported.
- Physical profile використовує rollback journal, `synchronous=EXTRA` і dedicated `locking_mode=EXCLUSIVE` connection як lease від storage-session acquire через recovery/scan/commit/Core publication до release. PID/stale lock file заборонений.
- Одна SQLite transaction записує logical metadata, operation fingerprint і рівно один committed `journal` row. `journal` є єдиним committed journal authority; independent append заборонений.
- `JournalSequence` зберігається як arbitrary-length canonical positive-decimal TEXT і порівнюється length + lexical. Fingerprint не unique між різними operations; idempotency authority — `operation_id` з exact-draft/fingerprint match.
- COMMIT error класифікується через connection `isTransaction`, rollback/retry та exact query by `operation_id`. Settled resolve = proven committed; settled reject = proven absent. Persistent unclassifiable storage failure закриває intake й може лишити promise pending до відновлення доступу або external process termination: safety гарантується, liveness ні.
- Full startup виконує recovery-before-ready. Readonly open не виконує hidden recovery/cleanup writes і fail-close, якщо ready потребує mutation.
- Physical root містить driver-owned `extensia.sqlite3` і SQLite-private rollback journal. Logical IDs не стають paths; symlink/reparse/non-regular DB target відхиляється.
- `application_id`, current `user_version=2`, singleton format marker, exact schema/quick-check, canonical JSON/fingerprint/sequence/payload/generation integrity перевіряються до ready. Version `1` є єдиним accepted legacy input: full owner після повної validation й доказу порожнього legacy payload seam атомарно додає `asset_upload_generations` та оновлює обидва version markers; readonly валідовує version `1` без mutation. Unknown/corrupt або nonempty unsupported legacy state fail-close; deterministic schema migration не є automatic repair.
- Device power-loss за dishonest cache, network filesystem і uncertified filesystem guarantees не заявляються.

## Implementation gate

P4-WP1 має довести child-process cut points, fault injection, dual-platform local-filesystem CI, exclusive lock through COMMIT/publication, crash release, readonly/corruption/payload-size behavior і package conformance через той самий opaque `FullResourceDriverAdapter`. Кожна platform/filesystem комбінація стає supported лише після окремої profile certification.

## Alternatives

- Pure `node:fs`: відхилено як baseline через portable lock/directory durability gaps.
- All state/payload chunks in SQLite: accepted bounded baseline попри write-amplification/performance risk.
- Native filesystem adapter: deferred окремому `filesystem-native` design gate.

## Наслідки

`local-sqlite-v1` є first/default concrete profile `0.1.0`, але не universal physical model Storage Driver. P4-WP1, P4-VS1 і P4-VS2 реалізували internal production capability для Resource parity, Asset metadata та staged-generation persistence з bounded current-host Windows local NTFS process-crash evidence. Public/default driver surface, broader platform/performance certification і destructive power-loss guarantee не заявлені.
