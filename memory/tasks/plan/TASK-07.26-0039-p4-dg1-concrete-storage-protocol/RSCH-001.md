# RSCH-001: Concrete durable storage protocol

Status: completed
Related Task: [P4-DG1 / TASK-07.26-0039](task.md)
Related Run: [RUN-001](RUN-001/index.md)
Detailed Report: [Concrete storage protocol](../../../reports/research/2026-07-12-extensia-concrete-storage-protocol.md)

## Питання

Який bounded concrete driver і physical protocol може реалізувати прийнятий P3 semantic commit без другого write/journal path та з чесною durability/support межею?

## Рішення

Рекомендується single-file internal SQLite durability domain через Node.js 24 `node:sqlite` на local fixed storage одного host. Resource metadata, рівно один committed journal row і майбутні opaque Asset payload chunks належать одній SQLite transaction; зовнішня filesystem blob publication у baseline заборонена, бо Node не дає portable доказу directory durability.

Pure `node:fs` і SQLite + external filesystem blobs відхилено: Node не надає portable crash-released storage lock/directory sync, а multi-file publication не має однієї atomic durability boundary. SQLite-resident chunked payload обрано попри більший media write/corruption blast radius; native-addon alternative відхилено через deployment cost.

## Evidence

- Node.js v24.18 docs: `node:sqlite` має Stability 1.2 (release candidate), synchronous `DatabaseSync`, `readOnly`, `timeout`, `isTransaction` і SQLite pragma access.
- SQLite primary docs: transaction journal/locking/atomic commit залежать від правдивих local filesystem sync/lock primitives; network filesystems не входять у support boundary.
- Local Node v24.17 Windows probe: file `fdatasync`/`fsync` і same-volume replace succeeded; directory `fsync` -> `EPERM`; `flock`/`lockf` відсутні.
- Probe доводить capability API на host, а не power-loss durability; відповідні claims лишаються bounded.

## Disposition

`final-result`; exact proposal винесено у required [FIX-001](FIX-001.md).
