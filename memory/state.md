# Стан проекту

Updated: 2026-07-10
Starter Kit Version: 4.0
PDADM MVP Version: 0.4
Target Release: `0.1.0`
Internal Stage: `v2`

## Поточний фокус

`BP1-01` завершена як зелений ESM TypeScript tooling/package gate і прийнята людиною. `BP1-02` і `BP1-03` лишаються backlog tasks Phase 1 та можуть бути активовані як наступні паралельні implementation work packages.

## Поточний стан продукту

- Попередню реалізацію, tests, build output і стару пам'ять видалено.
- Package manifest визначає `@sagifire/extensia` version `0.1.0`, ESM і Node.js `>=24`.
- Product/domain/technical design розгорнуто зі source specifications, але самі specifications мають статус draft.
- Усі 37 product requirements мають статус `accepted`; detailed contracts і open questions все ще проходять окремі stabilization gates.
- Detailed source specifications зберігаються в `memory/references/extensia-v2/`; obsolete non-IoC documents і root `v2/` видалені.
- Виконуваного runtime, public API, Storage Driver, plugins або tests ще немає.
- Exact `@sagifire/ioc@0.0.2` перевірено як придатний internal composition baseline з Extensia-owned lifecycle та synchronous multi contributions; package ще не встановлений.
- Date-bound Phase 1 tooling baseline реалізовано: TypeScript `6.0.3`, unbundled ESM `tsc`, Vitest `4.1.10`, committed npm lockfile, root-only exports і explicit package gates успішно пройдені на Node.js 24.
- Прийнято target contracts UUID v4 `IDString`, numeric epoch-millisecond `Timestamp` і deeply readonly detached JSON-safe DTO; runtime implementation ще відсутня.

## Активні задачі

Немає active або review задач. `BP1-01` (`TASK-07.26-0005`) завершена як `done`; `BP1-02` (`TASK-07.26-0007`) і `BP1-03` (`TASK-07.26-0008`) лишаються `backlog`.

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
- Користувач 2026-07-10 виконав phase-level human review фази 0 «Базовий стан проекту» і явно підтвердив її завершення.
- `BP1-02` і `BP1-03` підготовлені як canonical backlog tasks; їхня activation дозволена лише після зеленого gate `BP1-01`.
- `BP1-01` реалізувала exact-pinned Node.js 24 ESM tooling/package baseline; `npm ci` і повний package gate зелені, а task-level human approval дозволив activation наступних Phase 1 задач.
- `TASK-07.26-0006` пройшла whole-task human review і завершена як `done`; closure містить фінальну перевірку memory sync.
- `TASK-07.26-0003` прийнята людиною й завершена як `done`; detailed rolling-wave plan та незалежний audit залишаються довгоживучими reports.
- Поточний і цільовий domain state зберігаються окремо.
- `TASK-07.26-0002` прийнята людиною й завершена як `done`; cumulative результат зафіксовано в task closure.

## Поточні ризики

- Усі три source specifications мають статус draft; conceptual signatures не можна випадково заморозити як public API.
- Source specifications задають широку surface area. Реалізація без вертикальних slices створить сильний architecture pressure і ризик незавершених cross-cutting guarantees.
- Tooling/package reproducibility підтверджено BP1-01; IoC composition conformance ще має бути реалізована у BP1-03 після human gate.
- Перший concrete Storage Driver, atomic commit protocol, journal format і recovery matrix не визначені.
- Public facade methods, error catalog, hook payloads і compatibility policy потребують окремих design gates.
- Runtime reference містить історичні self-references на видалений non-IoC filename; canonical source policy явно перенаправляє до актуального IoC document.

## Наступні кроки

1. Активувати `BP1-02` для domain contracts і `BP1-03` для IoC composition/conformance skeleton; їх можна виконувати паралельно.
2. Завершити Phase 1 lifecycle slice та stabilization перед наступним human gate.
3. Завершити Phase 1 lifecycle slice та stabilization перед наступним human gate.

## Відкриті питання

- Доменні питання: `domain/open-questions.md`.
- Технічні design gates: `technical/open-questions.md`.
- Детальна source policy: `technical/source-specifications.md`.
- Послідовність реалізації: `product/roadmap.md`.
