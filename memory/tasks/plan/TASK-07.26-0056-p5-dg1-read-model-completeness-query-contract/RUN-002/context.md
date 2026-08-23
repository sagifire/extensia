# Контекст виконання: RUN-002

Related Task: [P5-DG1 / TASK-07.26-0056](../task.md)
Prepared: 2026-07-17
Prepared By: Agent Architect `/root`
Previous Run: [RUN-001](../RUN-001/index.md)

## Мета run

Виправити exact application proposal після того, як final primary validation уже замороженого RUN-001 виявила один неправильний source SHA-256 у FIX-001, не змінюючи accepted design/report body.

## Ефективні вимоги

1. RUN-001 report/RSCH/design body лишаються frozen і не переписуються.
2. FIX-001 не застосовується та отримує disposition `superseded` operational metadata.
3. Новий FIX-002 відтворює exact payload FIX-001, але має правильний `open-questions.md` source hash, own authority ID і recomputed deterministic target hash.
4. Усі сім source hashes, create-target absence, exact anchors, report-copy output hash і local links перевіряються executable checks.
5. Independent repeated audit потрібен до нового review-ready transition.
6. Production code, canonical targets, P5-DG2 і downstream tasks незмінні.

## Обсяг

- Corrected FIX-002, task/run/index/progress/state lifecycle, exact validation і audit.

## Поза обсягом

- Зміна read-model design/report/RSCH, implementation, fixation application або downstream activation.

## Критерії приймання run

- FIX-002 exact та mechanically applicable; FIX-001 superseded/not applied.
- Усі original task acceptance criteria збережені без design body change.
- Self-review і independent audit не мають open P0–P3.

## Обов'язкове task-specific читання

- RUN-001 result, RSCH-001, report, FIX-001 і current FIX-002.
- Current source target hashes/anchors та memory rules для reviewed-content/new-run boundary.

## Ризики

- Copy-based proposal може зберегти stale FIX-001 authority або target hash.
- Operational indexes можуть помилково лишитися review-ready до repeated audit.

## Умови зупинки

- Будь-який design/report body change потрібний — тоді corrective scope розширюється й аудит починається заново.
- Canonical source target змінився — FIX-002 потребує new exact proposal, не ручної адаптації.

## Activation

Run Status: active
Activation: automatic corrective continuation active TASK-0056 після post-freeze validation failure; user authorization remains original execute command.
