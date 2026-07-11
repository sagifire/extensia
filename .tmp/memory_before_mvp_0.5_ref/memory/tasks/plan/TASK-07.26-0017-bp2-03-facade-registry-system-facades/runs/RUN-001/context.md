# Контекст RUN-001

Preparation Status: prepared
Execution Status: completed
Status: review-ready
Started: 2026-07-10

## Роль і режим

- Agent Role: Agent Implementer.
- Execution Mode: `autonomous-implementation`.
- User activation: «Виконай задачу BP2-03 / TASK-07.26-0017. Я дозволяю запускати субагентів для ревю.»

## Канонічні джерела

- `technical/public-read-contract.md` визначає lifecycle/publication, exact facade names, reserved provenance, read/storage failures і shared seam.
- ADR-0007 закріплює Module-owned Registry, synchronous contributions та відсутність public Core/IoC leakage.
- `src/system-extensions/default-api/resource-read-port.ts` є єдиним source shared read contract/token.
- `domain/scalars.ts` і `domain/snapshots.ts` є canonical parse/type sources.
- `runtime/lifecycle.ts` є accepted internal startup/rollback/stop/disposal host.
- `technical/rules.md` визначає facade-first boundary, freeze, trusted lease, readonly write rejection і safe diagnostics.

## Початковий factual state

- `BP2-01`, owner application task, `BP2-01A` і `BP2-02` мають status `done`; `APP-07.26-0021-001` published.
- Exact Core read provider реалізовано через `CORE_RESOURCE_READ_PORT`.
- Root package export порожній; facade registry/provider/system adapters відсутні.
- Worktree містить прийняті, але не committed артефакти BP2-02; RUN-001 зберігає їх і не переписує поза integration boundary.

## Architecture boundaries

- Один Registry і один provider path використовуються system contributions зараз і майбутніми custom contributions пізніше.
- Registry володіє metadata/lifecycle, але facade factories отримують лише exact dependency facades і explicit injected ports, не resolver.
- Freeze передує atomic publication; rollback очищує partial facades у reverse creation order.
- BP2-03 надає internal access boundary для майбутнього BP2-04, але не формує package API самостійно.
- Потреба у public export, plugin descriptor/lifecycle, dynamic registry або write port є blocker для окремого owner gate.
