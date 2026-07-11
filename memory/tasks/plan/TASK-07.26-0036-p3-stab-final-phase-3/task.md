# P3-STAB / TASK-07.26-0036: Фінальна стабілізація фази 3

Task Status: done
Type: chore
Created: 2026-07-11
Owner Role: Product Lead Hat
Depends On: done `P3-VS3 / TASK-0033`; done `P3-VS4 / TASK-0034`; done `P3-VS5 / TASK-0035`
Current Run: RUN-002

## Поточний стан

Run Status: completed
Progress: Whole-task approved; required FIX-001 applied exactly; post-application audit `PASS`; task completed.
Acceptance: 12/12
Blockers: none
Blocked Phase: n/a
Pending Decisions: none
Next Action: None; Phase 3 gate completed. Any Phase 4 planning requires a separate task/decision.

## Мета

Виконати стабілізацію чистого стану, пакета, API й архітектури всієї фази 3: create/update/order/move/delete/Marks/KV, матриці відмов, відновлення, конкурентності й integrity, сканування сумісності та меж джерел, відтворюваність, синхронізацію пам'яті й незалежний аудит.

## Продуктовий контекст

P3-STAB є фінальним gate фази 3: він створює свіжу доказову базу для всього зрізу запису Resource на основі журналу, виправляє лише доведені дефекти прийнятої поведінки й готує фазу 3 до human review усієї задачі та фази.

## Вимоги

- Чисте встановлення, збірка, типи, тести, lint, форматування, пакет, tarball, packed consumer і відтворюваність мають бути перевірені свіжими доказами.
- Точність публічних API, помилок, діагностик та експортів має бути перевірена для create/update/move/delete/Marks/KV.
- Щільний order, active-parent, видимість tombstone, канонічність aggregate і незмінні властивості відокремленого DTO мають бути зеленими.
- Точки відмов, фіксації з одним записом, попередження, відновлення, типізована integrity, відкладений cleanup і розклади конкурентності мають бути повністю покриті.
- Сканування джерел має перевірити дублікати шляхів і повноважень та витік відкладеної поведінки.
- Редагування production-коду дозволені лише для виправлення доведених дефектів фази 3 в наявних стиках facade/Core/domain/operation/driver/index/lifecycle і тестах; нові можливості заборонені.
- Зміни package/config/exports дозволені лише для точної знахідки щодо кореня, packed output або відтворюваності; зміни залежностей чи версій потребують окремих повноважень.
- Кожна ефективна команда має одну семантичну фіксацію й один запис; мають бути доведені узгодженість підготовлених IDs, changes і fingerprint, пакетна публікація та відсутність незалежних повноважень append, facade або індексу.
- Прогон має спочатку виявити скрипти репозиторію, виконати цільові матриці, потім `npm run check`, точні скрипти пакета, tarball і packed output, `git diff --check` та сканування джерел і експортів.
- Докази мають зафіксувати версії Node/npm, точні команди, кількості тестів, переліки артефактів і hashes, де застосовно, та стани знахідок до й після виправлення; успадковувати твердження про зелений стан із попередніх задач не можна.
- Після виправлень обов'язковий незалежний аудит; відкритих P0-P3 не має бути.
- Результат має розрізняти нові й успадковані докази, містити різницю scope/no-scope, усі стани пам'яті загального рівня, мовний контроль, архітектурний тиск, залишкові ризики й подальші дії та запит на review фази 3.

## Обсяг

- Свіжа простежуваність усієї фази 3 та матриця доказів для create/update/order/move/delete/Marks/KV.
- Gates API, семантики, протоколу, відмов і відновлення, integrity, конкурентності, пакета й відтворюваності.
- Обмежене виправлення доведених регресій фази 3 у наявних стиках і тестах.
- Точні кореневі експорти, packed consumer, перелік tarball і доказ відтворюваності.
- Фактичний поточний стан домену, технічна архітектура або стек, task result/progress/state/indexes і синхронізація пам'яті з явним статусом gate фази 3.
- Незалежний аудит і підготовка human review усієї задачі та фази 3.

## Поза обсягом

- Нові можливості або рефакторинги без власника знахідки.
- Відновлення, Assets, конкретний довговічний Storage Driver, синхронізація, plugins і hooks.
- Фаза 4 і замороження сумісності релізу.
- Зміни design, вибір міграції чи сумісності, конкретна довговічність або широкий рефакторинг без окремих повноважень.
- Зміни залежностей або версій без окремого рішення.

## Критерії приймання

- [ ] Свіжі докази чистого встановлення, збірки, типів, тестів, lint, форматування, пакета, tarball, packed consumer і відтворюваності зелені.
- [ ] Точні публічні кореневі значення, типи, об'єднання помилок, labels, diagnostic stage і readonly-before-inspection перевірені для всіх команд фази 3.
- [ ] Семантика create/update/move/Marks/KV/delete, ворожі дескриптори, випадок без змін, розміщення й помилки, обмеження, заміна й рівність, видимість, часові мітки й точні підготовлені набори зелені.
- [ ] Немає другого шляху повноважень запису, журналу чи індексу; кожна ефективна команда має рівно одну семантичну фіксацію, один запис та узгоджений fingerprint.
- [ ] Доведені щільний order, active-parent, видимість tombstone, пакетна публікація, fail-close для типізованої integrity та відкладений cleanup.
- [ ] Точки acquire/read/prepare/begin/stage/commit/publish/cleanup, звичайні й типізовані integrity-помилки, аварії, відновлення у свіжому процесі та пошкодження, що блокують готовність, зелені.
- [ ] FIFO ієрархії, FIFO aggregate одного Resource, порядок сесій між Resources і розклади зупинки з очікуванням завершення зелені.
- [ ] Точні кореневі експорти, чистота згенерованих артефактів, перелік tarball, packed consumer і порівняння байтів та вмісту зелені.
- [ ] Кожна знахідка має перевірений стан; немає відкритих P0-P3 і розширення можливостей.
- [ ] Незалежний аудит після виправлень завершено, а архітектурний тиск не замасковано workaround-ами.
- [ ] Результат містить нові й успадковані докази, точні команди, середовище, кількості й артефакти, різницю scope/no-scope, gates пам'яті, мови й архітектури, залишкові ризики й подальші дії та запит на review фази 3.
- [ ] Task/run не активовані до done dependencies та окремого прямого рішення користувача.

## Пов'язана пам'ять

- [Вимоги legacy RUN-001](runs/RUN-001/requirements.md) - початковий контракт доказів стабілізації та зелений gate.
- [Контекст legacy RUN-001](runs/RUN-001/context.md) - джерела повноважень, послідовність, володіння знахідками й архітектурний тиск.
- [P3-VS3 / TASK-07.26-0033](../TASK-07.26-0033-p3-vs3-resource-hierarchy-order-move/index.md) - обов'язкова завершена основа ієрархії, порядку й переміщення.
- [P3-VS4 / TASK-07.26-0034](../TASK-07.26-0034-p3-vs4-mark-kv-writes/index.md) - обов'язковий попередник Marks/KV.
- [P3-VS5 / TASK-07.26-0035](../TASK-07.26-0035-p3-vs5-resource-soft-delete/index.md) - обов'язковий попередник м'якого видалення.
- Контракти P3-DG1/P3-DG2, ADR-0005/0008/0009, APP-0024/APP-0032 і результати завершених BP3-01A…P3-VS5.

## Прогони

- [Legacy RUN-001](runs/RUN-001/index.md) - superseded - джерело лише для структурної міграції; підготовлені артефакти збережено без змін, стабілізацію не активовано.
- [RUN-002](RUN-002/index.md) - completed - whole-task approved, required FIX-001 applied, post-application audit `PASS`.

## Дослідження

- Немає.

## Фіксації

- [FIX-001](FIX-001.md) - required factual synchronization domain current і technical architecture/stack; approved and applied exactly.

## Запити на рішення

- Немає.

## Запропоновані follow-up задачі

- Немає.

## Human Review

Status: approved
Requested: 2026-07-12
Reviewed: 2026-07-12
Approval Source: explicit user decision `Whole task: approve`
Approved Fixations: FIX-001
Rejected Fixations: none
Follow-up Decisions: none
Decision Notes: User approved whole task and required FIX-001. Exact application received independent post-application `PASS`; no open P0-P3.

## Фінальний результат

Completed: 2026-07-12
Final Run: RUN-002
Summary: Final Phase 3 stabilization accepted and completed: fresh gates green, production correctness defect not found, package type-evidence gap closed, required FIX-001 applied exactly, post-application audit `PASS`.
Residual Risks: Concrete physical durability, restore/include-deleted/cascade/purge/retention, plugins, sync and Phase 4 remain deferred and are not claimed by this gate.
