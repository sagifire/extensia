# TASK-07.26-0042: Client-server SQL Storage Driver design

Task Status: backlog
Type: design/research
Created: 2026-07-12
Owner Role: Agent Architect
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Контракт дослідження client-server transactional driver family і RUN-001 підготовлені; виконання не активоване.
Acceptance: 0/8
Blockers: none
Blocked Phase: n/a
Pending Decisions: shared family contract проти vendor profiles; PostgreSQL/MySQL sequencing; transaction/journal/idempotency model; lock/lease strategy; network outcome ambiguity; schema migration і capability boundary.
Next Action: Окремим explicit рішенням активувати RUN-001 після завершення owner gate P4-DG1; до activation не обирати implementation dependency або конкретний vendor як production target.

## Мета

Дослідити й спроєктувати майбутню сім’ю `client-server-transactional` Storage Driver для PostgreSQL і MySQL: визначити спільний semantic conformance contract, vendor-specific physical profiles, чесні capability boundaries та рекомендовану послідовність подальших driver tasks без реалізації.

## Продуктовий контекст

P4-DG1 уточнює taxonomy Storage Driver: перша реалізація належить до `embedded-transactional`, а PostgreSQL/MySQL є окремою майбутньою `client-server-transactional` сім’єю. Remote SQL server може забезпечити транзакції й durability, але додає pooling, network partitions, outcome ambiguity, server-side concurrency та schema lifecycle. Ці механізми не повинні витікати в Core або послаблювати прийнятий semantic commit/journal/recovery contract Extensia.

## Вимоги

1. Порівняти PostgreSQL і MySQL за перевіреними primary sources та executable capability probes там, де це практично.
2. Розділити спільний semantic Storage Driver contract і vendor-specific physical profiles; не вимагати однакових SQL primitives там, де гарантії досягаються по-різному.
3. Визначити transaction boundary для metadata, payload chunks і рівно одного committed journal authority, включно з isolation/concurrency assumptions.
4. Визначити idempotency й exact handling невизначеного network outcome після відправлення `COMMIT`, без хибного `reject = not committed` у випадках, де це не доведено.
5. Дослідити advisory locks, transactional locks і lease/ownership alternatives, timeout, stale owner, session loss, failover та recovery-before-ready.
6. Визначити readonly, pooling/session hygiene, integrity diagnostics, retry classification, migration/versioning і operational capability boundary.
7. Вирішити, чи PostgreSQL і MySQL можуть мати один implementation sequence або потребують окремих vendor owner gates/tasks після family design.
8. Підготувати formal research, exact design proposals, proof matrix і downstream decomposition без вибору production dependency чи реалізації driver code.

## Обсяг

- Formal research/design із task-local `RSCH-*` і detailed report.
- Порівняння PostgreSQL та MySQL transaction, isolation, locking, advisory/lease, session, durability і failure semantics.
- Shared family contract для semantic commit, committed journal, idempotency, recovery-before-ready, integrity і readonly.
- Vendor profiles для SQL schema/layout, transaction primitives, lock ownership, pooling/session behavior, failover/network ambiguity та migrations.
- State/cut-point matrix для success, expected failure, storage failure, connection loss до/під час/після commit, retry й startup recovery.
- Capability і support boundary: server/version/configuration/topology assumptions, privileges, isolation, durability settings і unsupported modes.
- Рішення щодо family-vs-vendor architecture та sequencing майбутніх PostgreSQL/MySQL driver tasks.
- Exact canonical `FIX-*` proposals, якщо formal research доведе потребу; application лише після окремого approval.

## Поза обсягом

- Production implementation PostgreSQL/MySQL drivers, migrations або зміни source code.
- Вибір npm package, ORM, query builder, connection pool implementation чи іншої production dependency.
- Provisioning, deployment, backup/restore, replication setup, DBA runbooks або cloud-vendor certification.
- Зміна public facade API, Core domain semantics, Asset contract або Phase 5 multi-instance sync contract.
- Дизайн `filesystem-native` чи `embedded-transactional` driver profiles.
- Активація або реалізація downstream vendor tasks.

## Критерії приймання

1. PostgreSQL і MySQL порівняні за primary documentation і доречними executable probes; усі support/configuration assumptions та evidence limitations явні.
2. Shared family contract і vendor-specific profiles розділені без витоку SQL/network mechanics у Core або public API.
3. Transaction/journal/idempotency protocol визначає one semantic commit authority, isolation/concurrency behavior і deterministic retry/reconciliation rules.
4. Network outcome ambiguity має exact state machine: connection loss до, під час і після commit не маскується неправдивим success/reject outcome.
5. Advisory/transactional/lease locking, pooling/session loss, timeout, failover, startup recovery і readonly semantics покриті vendor-aware matrix.
6. Schema/version migration, integrity diagnostics, privileges, durability configuration та capability boundary задають перевірюваний certification gate.
7. Прийнято обґрунтоване рішення про shared implementation foundation проти окремих vendor profiles і рекомендоване sequencing наступних задач без dependency selection.
8. Створені `RSCH-*`, detailed report і потрібні exact `FIX-*`; upward consistency, self-review, language gate та незалежний subagent audit завершені без відкритих P0-P3 до human review.

## Пов'язана пам'ять

- [Roadmap](../../../product/roadmap.md)
- [Product Requirements](../../../product/requirements.md)
- [Technical Architecture](../../../technical/architecture.md)
- [Technical Rules](../../../technical/rules.md)
- [Technical Open Questions](../../../technical/open-questions.md)
- [Write, Journal і Recovery Contract](../../../technical/write-journal-recovery-contract.md)
- [P4-DG1 Concrete Storage Protocol](../TASK-07.26-0039-p4-dg1-concrete-storage-protocol/index.md)
- [P4-DG1 RUN-002](../TASK-07.26-0039-p4-dg1-concrete-storage-protocol/RUN-002/index.md)

## Прогони

- [RUN-001](RUN-001/index.md) - prepared - PostgreSQL/MySQL family research/design.

## Дослідження

Немає; `RSCH-001` створюється після активації RUN-001.

## Фіксації

Немає; exact proposals створюються під час RUN-001 і не застосовуються без human approval.

## Запити на рішення

Немає на етапі підготовки.

## Запропоновані follow-up задачі

- Після accepted family design: окремі bounded PostgreSQL і/або MySQL driver owner/implementation tasks згідно з прийнятим sequencing; не створюються й не активуються цією задачею.

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
