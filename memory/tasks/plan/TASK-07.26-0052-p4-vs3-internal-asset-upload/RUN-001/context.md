# Контекст виконання: RUN-001

Related Task: [P4-VS3 / TASK-07.26-0052](../task.md)
Prepared: 2026-07-15
Prepared By: Agent Planner `/root/create_phase4_tasks`
Previous Run: none

## Мета run

Materialize-ити exact internal Asset upload generation lifecycle на executable opaque `local-sqlite-v1` capability, не створюючи public/storage leakage або другого durability path.

## Effective requirements

1. Completed/accepted P4-VS2 є mandatory predecessor.
2. Перед activation потрібні executable staging primitives і exact internal Core↔driver adapter; conceptual seam недостатній.
3. Metadata, payload compound action та journal належать одній SQLite semantic transaction/durability domain.
4. Initial/replacement visibility, last-ready, stale handle, retry та recovery semantics відповідають accepted Asset contract.
5. Bytes transport bounded і measured; public path/session/transaction/token заборонені.
6. Incomplete generation ніколи не стає visible.

## Пов’язана пам’ять

- [P4-VS2](../../TASK-07.26-0051-p4-vs2-asset-metadata-lifecycle/task.md)
- [P4-WP1](../../TASK-07.26-0049-p4-wp1-local-sqlite-driver/task.md)
- [Asset Contract](../../../../technical/asset-contract.md)
- [Write contract](../../../../technical/write-journal-recovery-contract.md)
- [ADR-0010](../../../../technical/decisions/ADR-0010-local-sqlite-storage-protocol.md)
- [Architecture](../../../../technical/architecture.md)
- [Rules](../../../../technical/rules.md)
- [Asset contract report](../../../../reports/research/2026-07-15-extensia-asset-contracts.md)
- [Concrete storage report](../../../../reports/research/2026-07-12-extensia-concrete-storage-protocol.md)

## Заплановані результати

1. Capability gate record і exact adapter/transport map.
2. Initial/replacement generation lifecycle implementation.
3. Atomic payload compound actions і journal integration.
4. Crash/retry/stale/incomplete/disk-full recovery matrix.
5. Measured resource envelope, full gates і reviews.

## Перевірки

- capability/conformance tests;
- lifecycle/property/integration tests;
- child-process crash/restart cut points;
- fault-injection та cleanup matrix;
- memory/size/latency/transaction measurements;
- package/export/double-pack gates.

## Обмеження

- Не додавати public upload/path/session/transaction API, content processing, P5 sync або P7 freeze.
- Не створювати external blob/journal path.
- Після activation context незмінний.

## Умови зупинки

- P4-VS2 не completed/accepted.
- Opaque staging primitives або exact adapter boundary не executable.
- Atomic payload+metadata+journal commit потребує другої durability domain.
- Bounded transport неможливо реалізувати без unbounded memory/transaction envelope або public leakage.

## Ризики й assumptions

- Assumption: SQLite-resident payload seam P4-WP1 може бути materialized без schema/protocol contradiction.
- Disk-full і large payload behavior можуть спростувати початкові limits; acceptance boundary тоді потребує owner decision.
- Cleanup не може видавати incomplete payload за ready навіть за crash/retry.

## Activation

Run Status: prepared
Activation: тільки після predecessor/capability gates та explicit рішення; package preparation не активує run.

