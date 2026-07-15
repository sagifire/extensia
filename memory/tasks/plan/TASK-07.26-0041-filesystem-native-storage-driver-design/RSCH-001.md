# RSCH-001: Filesystem-native Storage Driver feasibility і physical protocol

Status: completed
Related Task: [TASK-07.26-0041](task.md)
Related Run: [RUN-001](RUN-001/index.md)
Detailed Report: [Filesystem-native Storage Driver design](../../../reports/research/2026-07-15-extensia-filesystem-native-storage-driver-design.md)

## Мета

Встановити доказову feasibility boundary сімейства `filesystem-native`, порівняти physical alternatives і визначити exact certifiable protocol без послаблення shared semantic Storage Driver contract.

## Verdict

`filesystem-native` умовно feasible лише з profile-specific native helper. Pure `node:fs`, PID/time lease і sidecar-only lock відхилені: вони не дають crash-released exclusion, safe takeover/fencing та portable directory durability.

Рекомендовано immutable content-addressed graph із одним atomically replaced і directory-synced `HEAD` як committed authority. Manifest chain містить рівно один journal entry на operation; native OS lock є writer authority; PID/time sidecars лише diagnostics. Перший кандидат `linux-local-ext4-v1` не є supported до exact process-crash і destructive power-loss certification.

## Evidence

- Primary sources: Node.js 24 `fs`, Linux `fsync`/`rename`/OFD locks, POSIX namespace primitives, Microsoft `LockFileEx`/flush/replace APIs.
- Executed research probe на Windows 11 / Node.js `v24.17.0`: `wx` contention `EEXIST`, stale marker після close `EEXIST`, file sync/replace `ok`, directory sync `EPERM`, `flock`/`lockf` absent.
- Detailed report містить semantic mapping, alternatives, exact v1 binary formats/layout, lock/fence/takeover, publication/recovery, cut-point і certification matrices.

## Traceability

| Acceptance | Evidence |
|---|---|
| 1 | semantic-to-physical table; one `HEAD`, no Core layout leakage |
| 2 | primary-source capability matrix + executable probe |
| 3 | six-alternative matrix і conditional feasibility verdict |
| 4 | exact framing/kinds/layout/checksum/compatibility specification |
| 5 | native-lock authority, no clock/PID takeover, session fence і crash matrix |
| 6 | commit/reconciliation/recovery та cut-point matrix |
| 7 | uncertified baseline, exact Linux candidate boundary і negative profiles |
| 8 | probe artifact, detailed report, required `FIX-001`, bounded downstream slicing |
| 9 | centralized self-review/audit у `RUN-001/result.md` |

## Disposition

`final-result`; canonical proposal винесено у required [FIX-001](FIX-001.md), production/downstream activation не виконано.
