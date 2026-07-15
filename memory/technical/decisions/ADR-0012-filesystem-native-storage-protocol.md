# ADR-0012: Protocol filesystem-native Storage Driver

Status: accepted
Date: 2026-07-15

## Контекст

Game-development і local-asset сценарії потребують inspectable filesystem-native storage, але shared Storage Driver contract вимагає atomic semantic commit, one committed journal, crash recovery, truthful settlement і readonly/integrity guarantees. Pure `node:fs` не надає portable crash-released lock або directory durability, а sidecar PID/time lease створює stale takeover і split-brain ризик.

## Рішення

- Визнати `filesystem-native` умовно здійсненним лише через profile-specific native helper і executable certification.
- Використати native exclusive/shared OS locks на immutable `LOCK`: exclusive writer authority і readonly publication barrier; sidecars не є lock primitive, PID/time не авторизують takeover.
- Зберігати immutable content-addressed objects і one-entry-per-operation manifest chain; immutable paths publish-ити тільки atomic no-replace з mandatory destination-directory sync після success або byte-equal `EEXIST`, а один `HEAD` atomically replace та directory-sync як єдину committed authority.
- Genesis root публікувати лише повністю synced через durable fixed parent init-lock inode, shared inspect → release → bounded exclusive acquire → mandatory recheck, sibling staging root, atomic no-replace final rename, parent directory sync і подальший in-place checksum completion slot + init-lock fsync. Readonly без valid slot працює fail-close; shared→exclusive upgrade заборонений.
- Settlement після publication attempt узгоджувати за durable `HEAD` і operation ID; unknown не перетворювати на reject.
- Не оголошувати жоден profile supported цим ADR. `linux-local-ext4-v1` лишається candidate до окремих process-crash і power-loss certification.
- Не змінювати shared Core/public Storage Driver contract і не активувати цим рішенням production implementation.

## Наслідки

Native helper додає packaging/ABI/certification cost, а immutable history — storage/startup pressure. Натомість protocol має один publication point, детермінований orphan recovery і не залежить від небезпечних stale locks. Windows/NTFS, XFS, APFS, network/overlay/removable environments потребують окремих profiles/evidence.

## Відхилені альтернативи

- Чистий `node:fs` + `wx` lock file — stale після crash і не має безпечного fencing/takeover.
- PID/time lease — PID reuse, clock/suspension і delayed-writer split brain.
- Sidecar generation без OS lock — немає atomic compare-and-swap publication.
- Mutable multi-file committed layout — partial publication і кілька authorities.
