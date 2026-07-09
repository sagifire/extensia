# Стан проекту

Updated: 2026-07-10
Starter Kit Version: 4.0
PDADM MVP Version: 0.4
Target Release: `0.1.0`
Internal Stage: `v2`

## Поточний фокус

Project Memory для release `0.1.0` розгорнута, а детальний rolling-wave план реалізації прийнятий людиною в `TASK-07.26-0003`. Поточний фокус — підготовка найближчої Phase 1 tooling/package task `BP1-01`; тільки після її gate можна паралельно запускати domain contracts `BP1-02` та IoC composition skeleton `BP1-03`.

## Поточний стан продукту

- Попередню реалізацію, tests, build output і стару пам'ять видалено.
- Package manifest визначає `@sagifire/extensia` version `0.1.0`, ESM і Node.js `>=24`.
- Product/domain/technical design розгорнуто зі source specifications, але самі specifications мають статус draft.
- Усі 37 product requirements мають статус `accepted`; detailed contracts і open questions все ще проходять окремі stabilization gates.
- Detailed source specifications зберігаються в `memory/references/extensia-v2/`; obsolete non-IoC documents і root `v2/` видалені.
- Виконуваного runtime, public API, Storage Driver, plugins або tests ще немає.
- Exact `@sagifire/ioc@0.0.2` перевірено як придатний internal composition baseline з Extensia-owned lifecycle та synchronous multi contributions; package ще не встановлений.
- Прийнято date-bound Phase 1 tooling baseline: TypeScript `6.0.3`, unbundled ESM `tsc`, Vitest `4.1.10`, npm lockfile й explicit package gates; project configuration ще не реалізована.
- Прийнято target contracts UUID v4 `IDString`, numeric epoch-millisecond `Timestamp` і deeply readonly detached JSON-safe DTO; runtime implementation ще відсутня.

## Активні задачі

Немає active задач. `TASK-07.26-0003` прийнята людиною й завершена як `done`; найближчі BP1 proposals ще не створені як canonical tasks.

## Останні рішення

- Цільова release version нової Extensia — `0.1.0`; `v2` є лише внутрішньою назвою етапу redesign.
- Канонічними design sources є `domain-model-v2.md`, `extension-and-api-model-v2-ioc.md` і `runtime-architecture-v2-ioc.md`.
- Попередні `extension-and-api-model.md` та `runtime-architecture.md` видалені в RUN-002 і виключені з нормативного контексту.
- `@sagifire/ioc` використовується для internal composition, але не стає public application API.
- Extensia лишається in-process бібліотекою з facade-first public surface.
- Усі durable changes мають проходити через Core operation pipeline; Storage Driver є durable source of truth, а committed journal entry — publication boundary цільової моделі.
- Facade-first extension boundary і Core-driven consistency semantics прийняті в ADR-0004/ADR-0005; exact facade signatures, hooks, storage protocol, journal format і recovery matrix лишаються власними design gates.
- Exact Phase 1 IoC/tooling baseline прийнятий в ADR-0006; version snapshot прив'язаний до 2026-07-09 і не є автоматичним дозволом змінювати dependencies.
- `IDString` є canonical lowercase UUID v4, `Timestamp` — safe-integer Unix epoch milliseconds, а public/serialized DTO — deeply readonly detached JSON-safe snapshots.
- `TASK-07.26-0003` прийнята людиною й завершена як `done`; detailed rolling-wave plan та незалежний audit залишаються довгоживучими reports.
- Поточний і цільовий domain state зберігаються окремо.
- `TASK-07.26-0002` прийнята людиною й завершена як `done`; cumulative результат зафіксовано в task closure.

## Поточні ризики

- Усі три source specifications мають статус draft; conceptual signatures не можна випадково заморозити як public API.
- Source specifications задають широку surface area. Реалізація без вертикальних slices створить сильний architecture pressure і ризик незавершених cross-cutting guarantees.
- Прийнятий tooling/IoC baseline ще не реалізований у `package.json`, configs або code; reproducibility треба довести через BP1-01/BP1-03.
- Перший concrete Storage Driver, atomic commit protocol, journal format і recovery matrix не визначені.
- Public facade methods, error catalog, hook payloads і compatibility policy потребують окремих design gates.
- Runtime reference містить історичні self-references на видалений non-IoC filename; canonical source policy явно перенаправляє до актуального IoC document.

## Наступні кроки

1. Створити `BP1-01` як canonical tooling/package task і реалізувати відтворюваний ESM TypeScript package gate.
2. Після зеленого BP1-01 gate паралельно створити/виконати `BP1-02` для domain contracts і `BP1-03` для IoC composition skeleton.
3. Інтегрувати результати у lifecycle slice `BP1-04`, виконати stabilization/audit Phase 1 і лише після human gate деталізувати наступну wave.

## Відкриті питання

- Доменні питання: `domain/open-questions.md`.
- Технічні design gates: `technical/open-questions.md`.
- Детальна source policy: `technical/source-specifications.md`.
- Послідовність реалізації: `product/roadmap.md`.
