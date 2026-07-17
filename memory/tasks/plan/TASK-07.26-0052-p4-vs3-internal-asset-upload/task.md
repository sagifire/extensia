# P4-VS3 / TASK-07.26-0052: Internal Asset upload lifecycle

Task Status: review
Type: implementation
Created: 2026-07-15
Owner Role: Agent Implementer
Current Run: RUN-002

## Поточний стан

Run Status: finalizing
Progress: whole-task result і FIX-001 approved; FIX-001 applied. Independent post-application audit підтвердив implementation/boundaries, але виявив два stale Asset-contract ownership statements поза approved FIX-001 scope; required FIX-002 підготовлено proposal-only.
Acceptance: 9/9; whole-task human approval recorded, closure gate pending FIX-002 decision and repeated post-application audit.
Blockers: none.
Blocked Phase: n/a
Pending Decisions: required proposal-only `FIX-002: approve | reject`.
Next Action: after FIX-002 decision, apply/reject disposition and repeat independent post-application audit; task не переходить у `done`, поки open P2 не закритий. P4-STAB не активується.

## Мета

Реалізувати internal upload generation lifecycle і exact executable Core↔`local-sqlite-v1` adapter: begin/resolve/stage bytes/finish/abort/retry для initial і replacement upload, з last-ready visibility, atomic payload actions, opaque handles та crash/recovery evidence в одній durability domain.

## Продуктовий контекст

P4-VS2 володіє Asset metadata semantics, а P4-VS3 materialize-ить physical bytes lifecycle. RUN-001 довів, що predecessors залишили лише inactive payload seam. Explicit human decision 2026-07-17 передало RUN-002 ownership materialize-ити executable opaque primitives та exact internal adapter як перший deliverable того самого vertical slice. Lifecycle consumer не виконується до conformance; parallel write path, public path/session або transaction token не вигадуються.

## Залежності та activation gate

- [P4-VS2 / TASK-07.26-0051](../TASK-07.26-0051-p4-vs2-asset-metadata-lifecycle/task.md) має бути completed/accepted.
- RUN-002 materialize-ить executable opaque generation stage/read/publish capability у `local-sqlite-v1` і deterministic conformance fake як first deliverable в тій самій durability domain.
- Exact trusted Core↔driver adapter boundary і bounded bytes transport design мають пройти executable conformance до підключення begin/finish/abort consumers; failure є in-run stop/blocker і не дозволяє parallel path.
- Explicit human decision 2026-07-17 активувало RUN-002 з цим corrected ownership; RUN-001 лишається immutable blocked activation audit.

## Обсяг

- Opaque upload generation та internal `begin`, resolve active handle, bounded stage bytes, `finish`, `abort`, retry.
- Initial upload і replacement semantics; replacement зберігає last-ready payload видимим до atomic finish.
- Atomic `generation.publish`, `generation.discard` і payload delete як compound actions того самого semantic commit/journal authority.
- Opaque stale-safe handles без public serialization або physical identifiers.
- Bounded chunk/memory/size/transaction envelope й SQLite-resident payload materialization.
- Idempotency, stale handle, incomplete generation, disk-full/IO/permission, crash/restart/recovery evidence.
- Cleanup incomplete payload без visibility або metadata/journal divergence.

## Поза обсягом

- Public path/session/transaction/upload token або leakage SQLite rows/chunks.
- Antivirus, transcoding, deduplication, signed URL чи content delivery.
- Phase 5 sync/global indexes або multi-instance visibility.
- Final P7 public API/compatibility freeze.
- External blob/write/journal durability domain або second write path.

## Критерії приймання

1. Перший deliverable RUN-002 materialize-ить і executable capability gate доводить opaque `local-sqlite-v1` staging/read/publish/discard/delete primitives та exact Core↔driver adapter до lifecycle consumer integration; missing capability блокує подальше execution і не породжує parallel path.
2. Internal begin/resolve/stage bytes/finish/abort/retry lifecycle точно реалізує accepted Asset generation states, opaque handle ownership і normalized stale/not-active failures.
3. Initial upload не стає visible до successful finish; replacement зберігає last-ready payload visible, а incomplete/aborted generation ніколи його не замінює.
4. `generation.publish`, `generation.discard` і payload delete виконуються як exact compound actions в одній SQLite durability domain і тому самому semantic commit з metadata та рівно одним journal entry.
5. Retry/idempotency, stale handle, duplicate finish/abort, crash before/after commit/receipt/publication і restart recovery мають outcome-definite behavior без orphan visibility або false settlement.
6. Bounded bytes transport має measured chunk size, peak memory, payload/transaction limits, latency/event-loop envelope, DB/rollback-journal growth і не розкриває physical storage mechanics.
7. Disk-full, I/O, readonly, permission, lock contention, corruption і cleanup failure matrix доводить rollback/fail-close та last-ready preservation.
8. Startup recovery/integrity scan детерміновано завершує або очищає incomplete generations згідно contract; stale/incomplete bytes не читаються й не публікуються.
9. Focused/full/package gates, architecture/memory/language review, self-review та незалежний audit завершені без open P0-P3; whole-task human approval обов’язковий перед `done`.

## Перевірки

- executable adapter capability/conformance probes;
- initial/replacement/incomplete/stale/idempotency state matrix;
- chunk/memory/size/latency/transaction/journal-growth measurements;
- child-process cut-point/crash/restart/recovery harness;
- disk-full/I/O/permission/lock/corruption/cleanup fixtures;
- full repository, packed consumer й deterministic double pack.

## Ризики

- SQLite payload growth і rollback journal можуть створити event-loop, disk і transaction pressure; limits мають бути measured, не assumed.
- Cleanup semantics можуть непомітно створити другий commit authority; compound actions мусять залишитися driver-owned у semantic transaction.
- Opaque internal handle може випадково стати de facto public API; package/export/leakage gates обов’язкові.

## Пов’язана пам’ять

- [P4-VS2 / TASK-07.26-0051](../TASK-07.26-0051-p4-vs2-asset-metadata-lifecycle/task.md)
- [P4-WP1 / TASK-07.26-0049](../TASK-07.26-0049-p4-wp1-local-sqlite-driver/task.md)
- [P4-DG2 / TASK-07.26-0040](../TASK-07.26-0040-p4-dg2-asset-contracts/task.md)
- [Asset Contract](../../../technical/asset-contract.md)
- [Write, Journal і Recovery Contract](../../../technical/write-journal-recovery-contract.md)
- [ADR-0010](../../../technical/decisions/ADR-0010-local-sqlite-storage-protocol.md)
- [Technical Architecture](../../../technical/architecture.md)
- [Technical Rules](../../../technical/rules.md)
- [Roadmap](../../../product/roadmap.md)
- [Asset contract report](../../../reports/research/2026-07-15-extensia-asset-contracts.md)
- [Concrete storage protocol report](../../../reports/research/2026-07-12-extensia-concrete-storage-protocol.md)
- [Delivery plan](../../../reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md)
- [Phase 4 owner-gate plan](../../../reports/research/2026-07-12-extensia-phase-4-owner-gate-plan.md)

## Прогони

- [RUN-001](RUN-001/index.md) - blocked на activation capability gate; production execution не починалося.
- [RUN-002](RUN-002/index.md) - finalizing; adapter-first lifecycle accepted, FIX-001 applied, FIX-002 decision pending.

## Дослідження

Немає; formal research ще не виконувалося.

## Фіксації

- [FIX-001](FIX-001.md) - required / approved / applied; post-application audit findings outside its approved rewrite scope tracked by FIX-002.
- [FIX-002](FIX-002.md) - required / proposed; minimal Asset-contract ownership correction після post-application P2 audit finding.

## Запити на рішення

- **Resolved 2026-07-17:** користувач погодив recommended corrected ownership і прямо наказав підготувати та виконати RUN-002, де exact opaque adapter є першим deliverable цього ж vertical slice.

## Запропоновані follow-up задачі

- [P4-STAB / TASK-07.26-0053](../TASK-07.26-0053-p4-stab-phase-4/task.md) - activation лише після completed/accepted P4-VS3.

## Human Review

Status: accepted; closure-finalization pending
Requested: 2026-07-17
Reviewed: 2026-07-17
Approval Source: explicit user decision `Task: approve`
Approved Fixations: FIX-001
Rejected Fixations: none
Follow-up Decisions: FIX-002 pending
Decision Notes: RUN-001 blocked audit accepted as evidence. Explicit human decision 2026-07-17 активувало RUN-002 з capability materialization як first in-run deliverable. User separately approved whole-task result and FIX-001. Initial post-application audit found a bounded canonical ownership contradiction outside FIX-001 scope; task remains finalizing pending FIX-002.

## Фінальний результат

Completed: n/a
Final Run: n/a
Summary: n/a
Residual Risks: n/a
