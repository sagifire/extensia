# Контекст RUN-001

Preparation Status: prepared
Execution Status: in-progress
Status: active
Started: 2026-07-11

## Роль і activation

- Agent Role: Implementation Agent.
- Execution Mode: `autonomous-implementation`.
- User activation: «Виконай задачу BP3-01A / TASK-07.26-0025. Я дозволяю запускати субагентів для ревю.»

## Канонічні джерела

- `technical/write-journal-recovery-contract.md` — accepted semantic contract P3-DG1.
- `reports/research/2026-07-10-extensia-write-journal-recovery-protocol.md` — exact conceptual internal shapes, ownership і verification matrix.
- `APP-07.26-0024-001` — published prerequisite application artifact.
- Existing `composition/tokens.ts`, `domain/scalars.ts`, `domain/snapshots.ts`, `core/resource-index.ts` — canonical internal primitives.

## Architecture boundaries

- Core володіє write command port і prepared index change; driver володіє exclusive session, staging, recovery, sequence allocation та semantic commit.
- Transaction commit є єдиним linearization point; independent journal append path заборонений.
- Source paths і token IDs materialize-яться цим run; вони мають бути internal, narrowly owned і не розширювати package exports.
- Потреба у runtime wiring, public Core/IoC, callable transaction через config, test-only duplicate contracts або concrete layout є stop condition.
