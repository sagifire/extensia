# Контекст RUN-001

Preparation Status: prepared
Execution Status: completed
Status: review-ready
Started: 2026-07-10

## Роль і режим

- Agent Role при activation: Agent Implementer.
- Execution Mode: `autonomous-implementation`.
- User activation: «Виконай задачу BP2-01A / TASK-07.26-0022. Я дозволяю запускати субагентів для ревю.»

## Канонічні джерела

- `technical/public-read-contract.md` визначає exact seam: source path, request discriminants, result, overloads, consumer ownership і token ID.
- ADR-0007 закріплює один internal consumer-owned seam та забороняє його package export.
- `TASK-07.26-0022` визначає bounded scope, exclusions, acceptance і architecture-pressure stop conditions.
- `composition/tokens.ts` є чинним internal namespace mechanism; `domain/scalars.ts` та `domain/snapshots.ts` є canonical import sources.

## Початковий factual state

- `APP-07.26-0021-001` має статус `published`.
- Shared source artifact і BP2-01A execution artifacts до activation відсутні.
- BP2-02/BP2-03 лишаються `backlog`; їх не активує ця задача.
- Root package exports дозволяють тільки `.` та `./package.json`.

## Architecture boundaries

- `extensia.default-api` є semantic owner required-port contract.
- BP2-02 лише bind/adapt-ить provider implementation; BP2-03 створює facade adapter.
- Один module містить type contract і token declaration, але не provider/runtime wiring.
- Потреба в generic resolver, arbitrary payload, mutation capability, second token/contract, public export або runtime wiring є blocker для design correction.
