# P3-VS5 / TASK-07.26-0035: М'яке видалення Resource і видимість

Task Status: done
Type: feature
Created: 2026-07-11
Owner Role: Product Lead Hat
Depends On: done `P3-VS3 / TASK-0033`; done `P3-VS4 / TASK-0034`
Current Run: RUN-002

## Поточний стан

Run Status: completed
Progress: Реалізація прийнята whole-task approval; approved FIX-001 applied; final consistency green.
Acceptance: 13/13
Blockers: none
Blocked Phase: n/a
Pending Decisions: none
Next Action: None. TASK-0036 не активована цим approval.

## Мета

Реалізувати точне м'яке видалення лише листка, переіндексацію сусідів, результат-tombstone, типову невидимість у читанні й дереві, публічні помилки та цілісність відновлення поверх основи VS3 для ієрархії й пакетних змін.

## Продуктовий контекст

P3-VS5 завершує життєвий цикл стану Resource у фазі 3 після ієрархії, порядку, переміщення та записів Marks/KV, додаючи безпечне м'яке видалення лише листка без відновлення, каскаду або нового шляху збереження.

## Вимоги

- Публічний контракт і facade мають надати точні `deleteResource(id)` та `ResourceDeleteError`; повторне видалення має бути єдиним кодом, специфічним для tombstone.
- Домен і Core мають реалізувати допустимість видалення листка, перехід у tombstone, нормалізацію активних сусідів джерела й точний підготовлений набір цільового Resource та сусідів.
- Читання й індекс мають типово приховувати tombstone у пошуку за id, списку, дітях і дереві та перевіряти пакет; команда все ще може повернути відокремлений tombstone.
- Протокол і відновлення мають додати `resource.delete`, одну семантичну фіксацію й один запис, початкову перевірку active-parent/order/visibility та повторно використати стики integrity і життєвого циклу VS3.
- Відсутній активний цільовий Resource дає `RESOURCE_NOT_FOUND`; tombstone дає `RESOURCE_ALREADY_DELETED`; будь-яка активна дитина дає `RESOURCE_HAS_CHILDREN`.
- Випадки root/non-root і першого, середнього, останнього чи єдиного сусіда мають зберігати щільну переіндексацію джерела.
- Цільовий Resource зберігає parent/order/locked/hidden/Marks/KV та змінює тільки прапорець видалення і спільну часову мітку.
- `locked` і `hidden` не блокують і не змінюють поведінку видалення.
- Типові get/list/children/tree приховують tombstone; update/move/Marks/KV для нього дають `RESOURCE_NOT_FOUND`.
- Некоректні й неефективні операції не створюють транзакції чи журналу; ефективне видалення готує точний змінений набір, відсортований за id, з однією часовою міткою, однією фіксацією й одним записом.
- Пошкоджена активна дитина tombstone або відсутнього parent, дублікат чи прогалина order або видимий tombstone є типізованою integrity-помилкою, блокує готовність і переводить runtime у fail-close.
- Мають бути перевірені видалення проти переміщення, створення й aggregate-записів, повторне конкурентне видалення, зупинка під час прийнятого видалення та розклади відмов і відновлення.
- Синхронізація пам'яті має оновити фактичну поточну реалізацію й поведінку читання, технічну архітектуру або стек, якщо потрібно, а також task/run/result/progress/state/indexes; target/product лишаються `not-needed`, якщо немає погодженого виправлення.

## Обсяг

- Чистий перехід видалення та перевірка допустимості.
- Підготовлений набір Core для цільового Resource й сусідів та щільна нормалізація сусідів.
- Інтеграція протоколу `resource.delete` через стики VS3 для семантичної фіксації та життєвого циклу.
- Типова невидимість в індексі, запитах і дереві та початкова перевірка цілісності відновлення.
- Публічний адаптер, типи, точні помилки й відокремлений результат-tombstone.
- Матриці стану, помилок, видимості, конкурентності, відмов, відновлення, попереджень, пакета, типів і packed output.

## Поза обсягом

- Відновлення, включення видалених, каскад, purge і retention.
- Зміни Marks/KV або перепроєктування.
- Assets, конкретна схема сховища, синхронізація, hooks і plugins.
- Окремий шлях запису, часткова фіксація сусідів або змінена семантика tombstone.

## Критерії приймання

- [ ] Точні публічні API `deleteResource(id)` і `ResourceDeleteError` реалізовані; повторне видалення має точний код, специфічний для tombstone.
- [ ] Відсутність, повторне видалення, активні діти, flags і випадки root/non-root дають точну поведінку.
- [ ] Tombstone зберігає parent/order/locked/hidden/Marks/KV і змінює лише прапорець видалення та спільну часову мітку.
- [ ] Видалення першого, середнього, останнього чи єдиного сусіда забезпечує щільну переіндексацію в точному підготовленому наборі цільового Resource й сусідів.
- [ ] Типові lookup/list/children/tree не показують tombstone, а команда повертає відокремлений tombstone.
- [ ] Update/move/Marks/KV для tombstone повертають `RESOURCE_NOT_FOUND`; `locked` і `hidden` не змінюють семантику видалення.
- [ ] Некоректні й неефективні операції не створюють транзакції чи журналу; ефективне видалення має одну часову мітку, одну фіксацію, один запис і відсортований за id змінений набір.
- [ ] Пошкодження active-parent/order/visibility є типізованою integrity-помилкою, блокує готовність і переводить runtime у fail-close.
- [ ] Перевірені розклади видалення проти переміщення, створення й aggregate, повторного видалення та зупинки з очікуванням завершення.
- [ ] Перевірені точки begin/stage/commit/publish/cleanup, аварії, відновлення у свіжому процесі й попередження після фіксації без перетворення зафіксованого видалення на відмову.
- [ ] Цільові матриці, `npm run check`, перевірки packed output, типів і пакета, `git diff --check` та сканування відкладеного scope зелені й мають точні докази.
- [ ] Незалежний аудит без відкритих P0-P3 та повні gates пам'яті, мови й архітектури завершені.
- [ ] Task/run не активовані до done dependencies і окремого прямого рішення користувача.

## Пов'язана пам'ять

- [Вимоги legacy RUN-001](runs/RUN-001/requirements.md) - початковий контракт видалення й видимості та зелений gate.
- [Контекст legacy RUN-001](runs/RUN-001/context.md) - джерела повноважень, залежності, умови зупинки й ризики.
- [P3-VS3 / TASK-07.26-0033](../TASK-07.26-0033-p3-vs3-resource-hierarchy-order-move/index.md) - обов'язкова завершена основа ієрархії, пакетних змін та integrity.
- [P3-VS4 / TASK-07.26-0034](../TASK-07.26-0034-p3-vs4-mark-kv-writes/index.md) - обов'язковий попередник сукупних записів.
- Контракт order/delete/Mark/KV, ADR-0009, APP-0032 і прийнятий звіт, розділи 8/11-16/18.

## Прогони

- [Legacy RUN-001](runs/RUN-001/index.md) - superseded - джерело лише для структурної міграції; підготовлені артефакти збережено без змін, реалізацію не активовано.
- [RUN-002](RUN-002/index.md) - active - поточний implementation run MVP 0.5.

## Дослідження

- Немає.

## Фіксації

- [FIX-001](FIX-001.md) - required factual current/technical memory sync; proposed, not applied.

## Запити на рішення

- Немає.

## Запропоновані follow-up задачі

- Немає.

## Human Review

Status: approved
Requested: 2026-07-11
Reviewed: approved 2026-07-11
Approval Source: explicit user decision `Whole task: approve`
Approved Fixations: FIX-001
Rejected Fixations: none
Follow-up Decisions: none
Decision Notes: Whole-task result і required FIX-001 окремо схвалені користувачем 2026-07-11; exact proposal переходить у finalization.

## Фінальний результат

Completed: 2026-07-11
Final Run: RUN-002
Summary: Exact leaf soft delete/default tombstone invisibility реалізовано, full/focused gates і final independent audit зелені, whole-task result прийнятий, required FIX-001 applied.
Residual Risks: Public signatures remain experimental Phase 3 compatibility surface; restore/include-deleted/cascade/purge/retention explicitly deferred.
