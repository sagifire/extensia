# TASK-07.26-0011: BP1-05 — Стабілізувати Phase 1

Status: backlog
Type: chore
Execution Mode: autonomous-implementation
Created: 2026-07-10
Owner Role: Product Lead Hat / System Engineer Hat
Current Run: n/a
Current Research: n/a
Current Fixation: n/a

## Мета

Стабілізувати фактичний Phase 1 baseline після прийнятого BP1-04, закрити ризик-орієнтовані gaps і підготувати versioned reproducible evidence для незалежного audit BP1-06 та human gate Phase 1.

## Продуктовий контекст

Phase 1 має завершитися не додаванням нових foundations, а перевіреним контрактним, composition, lifecycle і package baseline. BP1-05 є owner stabilization task: вона усуває defects і accidental surface у межах BP1-01..04, синхронізує factual memory та передає BP1-06 повний evidence package.

## Обсяг

- Провести risk-based gap analysis проти acceptance/verification BP1-01..04.
- Закрити test, lifecycle cleanup, safe diagnostics, composition isolation і package gaps у межах Phase 1.
- Прибрати accidental exports, duplication, dead code і speculative foundations, не потрібні accepted Phase 1 slices.
- Перевірити clean install/build/test/package reproducibility і minimum Node.js 24 consumer behavior.
- Повторно перевірити public/internal boundary, root exports, declaration surface та packed content.
- Синхронізувати factual current implementation/technical memory з кодом.
- Підготувати versioned evidence revision, придатну для незалежного BP1-06.
- Виконати architecture-pressure checklist і створити blocking follow-up там, де stabilization не може безпечно закрити design issue.

## Поза обсягом

- Нові product features або Phase 2 Resource query/Facade Registry code.
- Phase 3 write, lock, journal, recovery чи durable driver foundations.
- Переобрання toolchain/dependencies або version upgrades без окремої dependency task.
- Зміна accepted domain/architecture/public contracts без owner-approved gate.
- Послаблення quality/package/lifecycle gates для отримання зеленого результату.

## Залежності

- `BP1-01`..`BP1-04` мають бути `done` після whole-task human approval.
- Activation послідовна після accepted BP1-04; паралельна feature implementation не дозволена.
- BP1-05 має перейти у `review` з complete versioned evidence до activation BP1-06.

## Критерії приймання

- [ ] Усі acceptance/verification gates BP1-01..04 простежені й зелені з clean evidence.
- [ ] Known blocker/high/medium defects закриті; за їх наявності task не є review-ready.
- [ ] Root/package surface не містить accidental/internal exports, raw IoC runtime/tokens або undocumented Phase 2/3 APIs.
- [ ] Lifecycle rollback, cleanup aggregation, disposal, safe diagnostics і fresh-composition evidence повне.
- [ ] Diff не містить speculative Phase 2/3 foundations або feature work під виглядом stabilization.
- [ ] Clean install/build/test/package flow і packed runtime/type consumer відтворені на minimum Node.js 24 baseline.
- [ ] Reproducibility check відокремлює керовані artifacts від відомих nondeterministic metadata fields.
- [ ] Current implementation/technical memory відповідає factual code/package state.
- [ ] `RUN-001` містить versioned evidence revision, independent audit, architecture-pressure review і memory sync.

## Перевірка

- Повний clean command suite з відтворюваного install state.
- Pack content/hash comparison у межах керованих deterministic artifacts.
- Packed Node.js 24 runtime і type consumer smoke.
- Focused source/export/declaration scan.
- Targeted lifecycle failure/cleanup/disposal matrix.
- Acceptance traceability BP1-01..04 та memory consistency checklist.
- Architecture-pressure і speculative-foundation review.

## Correction loop з BP1-06

- BP1-06 активується тільки коли BP1-05 має статус `review` і complete versioned evidence revision.
- Material audit finding у scope BP1-05 повертає BP1-05 у `active`; finding поза scope створює blocking owner follow-up.
- BP1-06 при відкритому material finding лишається `active`/changes-required і не є review-ready.
- Після correction BP1-05 повторно переходить у `review`, evidence revision оновлюється, BP1-06 виконує recheck.
- Для суттєвої audit iteration BP1-06 створює новий `RSCH-*`; попередні artifacts не переписуються.
- Unresolved blocker/high/medium findings забороняють `pass` і human gate Phase 1.

## Пов'язана пам'ять

- `memory/state.md`
- `memory/product/roadmap.md`
- `memory/technical/architecture.md`
- `memory/technical/rules.md`
- `memory/technical/stack.md`
- `memory/technical/open-questions.md`
- `memory/domain/current/implementation-state.md`
- `memory/reports/research/2026-07-09-extensia-v0-1-0-delivery-plan.md`
- `memory/tasks/plan/TASK-07.26-0005-bp1-01-esm-typescript-package-baseline/task.md`
- `memory/tasks/plan/TASK-07.26-0007-bp1-02-pure-domain-contract-kernel/task.md`
- `memory/tasks/plan/TASK-07.26-0008-bp1-03-ioc-composition-skeleton/task.md`
- `memory/tasks/plan/TASK-07.26-0010-bp1-04-lifecycle-controller-slice/task.md`

## Прогони

Немає. `RUN-001` створюється при окремій activation після accepted BP1-04.

## Дослідження

Немає.

## Фіксації

Немає. Нове design/architecture рішення оформлюється окремою fixation, а не в stabilization diff.

## Очікувана синхронізація пам'яті

- Technical stack/current implementation: оновити factual status і exact evidence.
- Task/progress/state: оновити відповідно до реального status і correction loop.
- Roadmap: оновлювати лише після accepted Phase 1 decision, не від самого запуску stabilization.
- Product/domain/knowledge: очікувано `not needed` без конкретного discrepancy.
- Follow-up tasks: створити для material issue поза scope BP1-05.

## Architecture pressure

Stabilization не маскує design debt додатковими tests, не послаблює gates і не перетворюється на feature bucket. Суттєвий pressure веде до blocking design/refactor/audit follow-up або explicit accepted risk, а не workaround.

## Додатковий контекст

Planning identifier `BP1-05` зберігає traceability до `P1-STAB`, а `TASK-07.26-0011` є stable canonical task identifier. Оцінка: `1/3/1/3/2/3=13 -> C3`; обсяг M, ризик високий, невизначеність низька, упевненість висока; рекомендований агент і аудитор — `сильний`.
