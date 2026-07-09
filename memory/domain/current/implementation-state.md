# Поточний стан доменної реалізації

As Of: 2026-07-09
Status: current

## Фактичний стан

- Попередній код, tests, build output і залежності Extensia видалені в `TASK-07.26-0001`.
- У репозиторії немає `src/`, реалізованих доменних типів, Core, Storage Driver, facades, plugins або runtime modules.
- `package.json` визначає package `@sagifire/extensia` версії `0.1.0`, ESM mode і Node.js `>=24`, але не містить dependencies або tooling.
- Durable storage format і міграція даних попередньої версії не підтримуються; legacy memory/data не переносились.
- Три documents у `memory/references/extensia-v2/` є draft source specifications майбутнього стану, а не доказом реалізованої поведінки.

## Поточні гарантії

На рівні виконуваного продукту доменні гарантії наразі відсутні, бо реалізація ще не створена. Цільові сутності та інваріанти описані окремо в `memory/domain/target/model.md` і `memory/domain/rules.md`.

## Межа current/target

Не можна позначати `Resource`, `Asset`, `Mark`, `KV`, operation pipeline, storage semantics або plugin API як current implementation, доки відповідні вертикальні slices не реалізовані й не пройшли review. Після кожного implementation run цей документ треба синхронізувати з фактичним кодом і tests.

## Джерела

- `memory/tasks/plan/TASK-07.26-0001-prepare-extensia-v0-1-0-transition/runs/RUN-001/result.md`.
- Поточний `package.json`.
- Фактична структура репозиторію станом на 2026-07-09.
