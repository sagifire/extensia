# TASK-07.26-0046: Filesystem-native Linux process-crash certification

Task Status: backlog
Type: certification
Created: 2026-07-15
Owner Role: Agent Verifier
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Контракт process-crash сертифікації і RUN-001 підготовлені; виконання не активоване.
Acceptance: 0/8
Blockers: успішні TASK-07.26-0044 і TASK-07.26-0045 та exact `linux-local-ext4-v1` environment.
Blocked Phase: activation
Pending Decisions: explicit certification activation та attestation exact environment tuple.
Next Action: Після accepted 0044/0045 перевірити exact environment і окремо активувати RUN-001.

## Мета

Видати відтворюваний, environment-bound сертифікат того, що реалізація зберігає затверджені invariants при process crash/kill у кожній визначеній точці, без заяви power-loss durability.

## Обсяг

- exact environment/profile attestation для `linux-local-ext4-v1`;
- deterministic multi-process crash harness і kill у кожній protocol cut point;
- initialization slots, immutable object publish, manifest/journal, HEAD, recovery та idempotent retry;
- shared readonly barrier, exclusive writer discipline, crash lock release і concurrent openers;
- `EEXIST`/ambiguous completion reconciliation та reopen/post-state verification;
- root basename/`NAME_MAX` certification для `.<root>.extensia-init-lock` і `.<root>.init.<uuid>` або прийнятого digest-derived replacement;
- raw evidence bundle, coverage map, verdict і обмежений exact-tuple support statement.

## Поза обсягом

- power-loss, kernel panic, device reset, dishonest cache або hardware durability;
- інші kernel/filesystem/mount/device tuples;
- Windows/NTFS;
- архітектурна переробка чи нова функціональність; виявлені protocol defects повертають implementation на виправлення;
- загальна заява «Linux/ext4 supported».

## Критерії приймання

1. Сертифікат містить точний kernel/libc/Node ABI/filesystem/mount/device/cache tuple та cryptographic identity tested build.
2. Cut-point inventory має traceability до кожного mutable transition; harness відтворювано вбиває процес до/після кожного cut.
3. Для кожного cut після reopen спостерігається лише дозволений old/new valid state, без partial reachable graph або двох mutable authorities.
4. Initialization tests доводять slot selection/sequence/checksum, two-opener behavior і crash-release без lock upgrade.
5. Multi-process matrix доводить shared readonly barrier, exclusive writer serialization та відсутність readonly mutations.
6. `EEXIST`, ambiguous syscall completion, retry та stale artifact paths завершуються deterministic reconciliation без semantic duplication.
7. Boundary matrix сертифікує exact `NAME_MAX` policy; overflow для похідних init-lock/temp names fail closed з очікуваним `ENAMETOOLONG`, а прийняте іменування не має недоведеного basename gap.
8. Raw logs/fixtures/seeds/commands, pass/fail matrix, self-review та незалежний audit збережені; verdict явно обмежений process-crash і точним tuple.

## Перевірки

- repeated seeded crash matrix для кожного cut point;
- concurrent reader/writer/opener stress із forced kill;
- byte-level root/header/HEAD/graph inspection після reopen;
- clean-room rerun із зафіксованого harness manifest;
- basename boundary cases і negative profile/capability tests;
- незалежне відтворення вибірки та audit coverage map.

## Ризики

- неповний cut inventory створить хибний сертифікат;
- test hooks можуть змінити ordering/timing і не представляти production build;
- exact environment може дрейфувати між запусками;
- `ENAMETOOLONG` біля root boundary може обходити protocol до першого durable step;
- process-crash evidence легко помилково подати як power-loss guarantee.

## Пов'язана пам'ять

- [TASK-07.26-0041](../TASK-07.26-0041-filesystem-native-storage-driver-design/index.md)
- [FIX-001](../TASK-07.26-0041-filesystem-native-storage-driver-design/FIX-001.md)
- [Detailed report](../../../reports/research/2026-07-15-extensia-filesystem-native-storage-driver-design.md)
- [TASK-07.26-0044](../TASK-07.26-0044-filesystem-native-linux-helper-spike/index.md)
- [TASK-07.26-0045](../TASK-07.26-0045-filesystem-native-driver-implementation/index.md)
- [Filesystem-native Storage Profile](../../../technical/filesystem-native-storage-profile.md)
- [Write, Journal і Recovery Contract](../../../technical/write-journal-recovery-contract.md)
- [ADR-0012](../../../technical/decisions/ADR-0012-filesystem-native-storage-protocol.md)

## Прогони

- [RUN-001](RUN-001/index.md) - prepared - Linux process-crash сертифікація.

## Дослідження

Немає; certification evidence створюється після активації RUN-001.

## Фіксації

Немає; protocol defects повертаються в implementation workflow.

## Запити на рішення

Немає на етапі підготовки.

## Запропоновані follow-up задачі

- [TASK-07.26-0047](../TASK-07.26-0047-filesystem-native-linux-power-loss-certification/index.md) - optional power-loss certification після успіху та окремого destructive-environment approval.

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
