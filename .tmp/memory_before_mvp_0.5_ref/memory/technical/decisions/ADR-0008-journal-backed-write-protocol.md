# ADR-0008: Journal-backed write protocol

Status: accepted
Date: 2026-07-10
Decision Owner: Product Lead Hat / System Engineer Hat
Related: `BP3-01 / P3-DG1`, [write/journal/recovery contract](../write-journal-recovery-contract.md)

## Контекст

Окремі metadata write і journal append залишають crash gap, а post-commit validation/index work робить public outcome ambiguous. Перший successful Resource write потребує layout-neutral semantic boundary до вибору concrete driver.

## Рішення

1. Driver-owned transaction commit одночасно фіксує staged Resource write-set і рівно один committed journal entry; resolve = committed, reject = not committed.
2. Journal persistent baseline є committed-only, має contiguous positive-decimal sequence й internal UUID v4 operation/actor identity; duplicate operation ID дозволений лише для identical full draft/fingerprint.
3. Core під recovery-clean exclusive session reload-ить durable state й готує immutable index change до commit; після resolve публікує synchronous no-fail swap.
4. Full startup утримує одну session через recovery, committed scan, index build і journal-head capture до ready.
5. Application config отримує opaque full-driver handle, а не callable session/transaction. First writes обмежені root create та own title/description update й позначені `experimental-phase-3`.
6. Unexpected post-commit local fault зберігає committed success із bounded warning та fail-close runtime; rollback/failure claim заборонений.

## Наслідки

- Storage Driver лишається durable source of truth, а Journal — committed publication/order record.
- Phase 4 мусить довести physical feasibility outcome-definite commit; вона не може мовчки послабити semantics.
- Public retry після lost response не має P3 deduplication promise.
- P3-DG2, concrete layout, sync і hooks лишаються окремими gates.

## Відхилені альтернативи

- Core-controlled metadata write + independent journal append: crash gap.
- Journal-only event-sourced truth: змінює accepted storage authority.
- Hot Index із async persistence: порушує durability/read-after-write guarantees.
- Public generic execute або raw transaction handle: створює другий write path і leakage Core/storage protocol.
