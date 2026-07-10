# Стан проекту

Updated: 2026-07-10
Starter Kit Version: 4.0
PDADM MVP Version: 0.4
Target Release: `0.1.0`
Internal Stage: `v2`

## Поточний фокус

`BP1-01`…`BP1-05` завершені та прийняті людиною. `BP1-05 / RUN-001` підготувала complete evidence revision `R1`, закрила initial audit findings і пройшла green repeated independent audit без production code changes. Наступний окремий крок — activation BP1-06.

## Поточний стан продукту

- Попередню реалізацію, tests, build output і стару пам'ять видалено.
- Package manifest визначає `@sagifire/extensia` version `0.1.0`, ESM і Node.js `>=24`.
- Product/domain/technical design розгорнуто зі source specifications, але самі specifications мають статус draft.
- Усі 37 product requirements мають статус `accepted`; detailed contracts і open questions все ще проходять окремі stabilization gates.
- Detailed source specifications зберігаються в `memory/references/extensia-v2/`; obsolete non-IoC documents і root `v2/` видалені.
- Internal pure domain contract kernel і його tests реалізовані в `BP1-02`; public API, Storage Driver і plugins ще відсутні.
- Internal IoC composition/conformance skeleton реалізовано в `BP1-03`; `BP1-04` додала generic internal lifecycle host/controller, deterministic startup/rollback/stop, safe diagnostics і final composed-runtime disposal без production subsystem map або public exports.
- Exact `@sagifire/ioc@0.0.2` встановлено й executable conformance matrix підтвердила придатність internal composition baseline з Extensia-owned lifecycle та synchronous multi contributions.
- Date-bound Phase 1 tooling baseline реалізовано: TypeScript `6.0.3`, unbundled ESM `tsc`, Vitest `4.1.10`, committed npm lockfile, root-only exports і explicit package gates успішно пройдені на Node.js 24.
- Прийняті UUID v4 `IDString`, numeric epoch-millisecond `Timestamp` і deeply readonly detached JSON-safe DTO реалізовані як internal domain contracts без public root export.

## Активні задачі

Немає active або review задач.
- `BP1-05` (`TASK-07.26-0011`), `BP1-04` (`TASK-07.26-0010`), `TASK-07.26-0013`, `TASK-07.26-0009`, `BP1-01` (`TASK-07.26-0005`), `BP1-02` (`TASK-07.26-0007`) і `BP1-03` (`TASK-07.26-0008`) завершені як `done`.
- `BP1-06` (`TASK-07.26-0012`) лишається backlog без research artifact до окремої activation.

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
- `BP1-02` реалізувала internal pure domain contract kernel із 50 tests, detached JSON-safe readonly snapshots і закритим незалежним audit; результат прийнято людиною, public root/subpath API не розширено.
- `BP1-03` реалізувала internal IoC composition/conformance skeleton із 16 composition tests, safe diagnostics/inspection, synchronous registration boundary і закритим незалежним audit; результат прийнято людиною, public root/subpath API не розширено.
- `BP1-04`, `BP1-05` і `BP1-06` підготовлені як canonical tasks; BP1-04 реалізовано в strict internal boundary, незалежно перевірено й прийнято людиною, а BP1-06 виконується як незалежний `autonomous-research` audit із bounded meta-review після dependency gates.
- `TASK-07.26-0009` пройшла whole-task human review і завершена як `done`; closure містить фінальну перевірку memory sync.
- Користувач підтвердив strict BP1-04 boundary: root API не розширюється; packed smoke перевіряє тільки import/no-side-effects/no-accidental-exports/internal-subpath-failure; lifecycle виконується internal integration harness.
- BP1-04 тепер закриває internal `P1-WP4`; original public `P1-VS1` superseded/deferred до owner gate public config/storage integration.
- `TASK-07.26-0013` пройшла whole-task human review і завершена як `done`; її owner-approved boundary застосовано в TASK-0010/RUN-001.
- Користувач 2026-07-10 явно активував `BP1-04 / TASK-07.26-0010`; RUN-001 реалізовано, initial audit findings закриті, repeated audit повернув `REVIEW_READY` без відкритих P0–P3 findings.
- Користувач 2026-07-10 виконав whole-task review BP1-04 і явно дозволив завершити TASK-07.26-0010 як `done`.
- `BP1-05 / RUN-001` повторно підтвердила Phase 1 baseline: clean package gate, 75 tests, 38 packed paths, 36 byte-identical controlled artifacts і zero accidental public surface; production code не змінювався.
- Initial independent audit BP1-05 повернув 2 P2 evidence findings і 1 P3 memory wording finding; remediation закрито repeated audit verdict `REVIEW_READY` без відкритих P0–P3.
- Користувач 2026-07-10 виконав whole-task review BP1-05 і явно дозволив завершити TASK-07.26-0011 як `done`.
- `TASK-07.26-0006` пройшла whole-task human review і завершена як `done`; closure містить фінальну перевірку memory sync.
- `TASK-07.26-0003` прийнята людиною й завершена як `done`; detailed rolling-wave plan та незалежний audit залишаються довгоживучими reports.
- Поточний і цільовий domain state зберігаються окремо.
- `TASK-07.26-0002` прийнята людиною й завершена як `done`; cumulative результат зафіксовано в task closure.

## Поточні ризики

- Усі три source specifications мають статус draft; conceptual signatures не можна випадково заморозити як public API.
- Source specifications задають широку surface area. Реалізація без вертикальних slices створить сильний architecture pressure і ризик незавершених cross-cutting guarantees.
- Tooling/package reproducibility, IoC composition conformance й strict internal lifecycle controller/rollback/ready-state publication реалізовані; public Extensia Module lifecycle/config/storage integration лишаються deferred design gate.
- Перший concrete Storage Driver, atomic commit protocol, journal format і recovery matrix не визначені.
- Public facade methods, error catalog, hook payloads і compatibility policy потребують окремих design gates.
- Runtime reference містить історичні self-references на видалений non-IoC filename; canonical source policy явно перенаправляє до актуального IoC document.

## Наступні кроки

1. Окремо активувати BP1-06 проти accepted evidence revision `R1`.
2. Не починати Phase 2 read-only Resource slice до BP1-06 і human gate Phase 1, який явно приймає deferred public P1-VS1.

## Відкриті питання

- Доменні питання: `domain/open-questions.md`.
- Технічні design gates: `technical/open-questions.md`.
- Детальна source policy: `technical/source-specifications.md`.
- Послідовність реалізації: `product/roadmap.md`.
