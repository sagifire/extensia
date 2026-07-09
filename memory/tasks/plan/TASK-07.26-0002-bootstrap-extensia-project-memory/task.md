# TASK-07.26-0002: Розгортання Project Memory Extensia

Status: done
Type: memory-update
Execution Mode: autonomous-implementation
Created: 2026-07-09
Owner Role: Product Lead Hat
Current Run: runs/RUN-002
Current Research: n/a
Current Fixation: n/a

## Мета

Розгорнути проектно-специфічну Product, Domain і Technical Memory для Extensia на основі актуальних специфікацій архітектурного етапу `v2`, щоб пам'ять стала узгодженою стартовою точкою для розробки релізу `0.1.0` на базі `@sagifire/ioc`.

## Продуктовий контекст

Попередню реалізацію Extensia видалено, а поточна Project Memory переважно складається з placeholder-документів Starter Kit. До початку нової реалізації потрібно перетворити актуальні специфікації на навігаційно цілісне джерело продуктового, доменного й технічного контексту. `v2` є внутрішнім позначенням етапу повного редизайну, а не публічною версією продукту; цільова версія пакета — `0.1.0`.

## Обсяг

- Використати як джерела `v2/domain-model-v2.md`, `v2/extension-and-api-model-v2-ioc.md` і `v2/runtime-architecture-v2-ioc.md`.
- Наповнити продуктову пам'ять: бачення, вимоги й орієнтовний roadmap до `0.1.0`.
- Зафіксувати поточний стан домену окремо від цільової доменної моделі.
- Наповнити доменний glossary, правила й відкриті питання.
- Наповнити технічну пам'ять: цільову архітектуру, stack, технічні правила та релевантні ADR.
- Явно зафіксувати роль `@sagifire/ioc`, статус специфікацій і версійну семантику `0.1.0` / `v2`.
- Оновити wiki-індекси, `memory/state.md`, task progress і run result.
- Виконати upward consistency check, language gate й незалежний self-review.

## Зміна обсягу для RUN-002

На підставі явного запиту користувача від 2026-07-09 обсяг задачі розширено:

- видалити obsolete `v2/extension-and-api-model.md` і `v2/runtime-architecture.md`;
- перенести три актуальні source specifications без зміни content у `memory/references/extensia-v2/`;
- оновити canonical source paths та wiki navigation;
- змінити статус усіх 37 записів у `memory/product/requirements.md` на `accepted`;
- зберегти distinction: accepted product requirements не роблять усі conceptual TypeScript signatures stabilized contracts автоматично.

Це розширення замінює заборону RUN-001 на relocation/deletion source files лише в межах перелічених operations.

## Поза обсягом

- Реалізація коду бібліотеки або тестів.
- Редагування content трьох актуальних специфікацій під час relocation.
- Використання `v2/extension-and-api-model.md` або `v2/runtime-architecture.md` як джерел.
- Зміна регламенту PDADM MVP, його шаблонів або knowledge package.
- Повний implementation backlog, оцінка строків, підготовка публікації або реліз пакета.
- Додавання вимог, API чи архітектурних гарантій, яких немає в актуальних специфікаціях або явних інструкціях користувача.

## Критерії приймання

- [x] Product Memory описує продукт, ціль релізу `0.1.0`, продуктові якості, межі й послідовність наступних фаз без placeholder-тексту.
- [x] Domain Memory чітко розділяє фактичний поточний стан і цільову модель зі специфікації.
- [x] Technical Memory описує IoC-орієнтовану цільову архітектуру, stack, інваріанти й ключові рішення без опори на неактуальні non-IoC документи.
- [x] `v2` зафіксовано лише як внутрішню назву етапу, а `0.1.0` — як цільову release version.
- [x] Статус джерел і простежуваність ключових тверджень очевидні з пам'яті.
- [x] Усі створені або змінені папки й файли коректно відображені в прямих wiki-індексах.
- [x] `memory/state.md`, task status, progress і run result синхронізовані.
- [x] Незалежний audit не має незакритих зауважень, що блокують human review.

### Додаткові критерії RUN-002

- [x] `v2/extension-and-api-model.md` і `v2/runtime-architecture.md` видалені.
- [x] Три актуальні source specifications перенесені в `memory/references/extensia-v2/` без зміни SHA-256.
- [x] Порожня коренева папка `v2/` більше не лишається паралельним source location.
- [x] Canonical memory, source policy та indexes посилаються на новий reference location.
- [x] Усі 37 записів у `memory/product/requirements.md` мають статус `accepted`.
- [x] Незалежний audit RUN-002 не має незакритих blocker/high/medium findings.

## Пов'язана пам'ять

- `memory/product/`
- `memory/domain/`
- `memory/technical/`
- `memory/references/`
- `memory/state.md`
- `memory/tasks/plan/progress.md`

## Прогони

- [RUN-001](runs/RUN-001/index.md) - review-ready - Розгортання Product, Domain і Technical Memory з актуальних IoC-специфікацій.
- [RUN-002](runs/RUN-002/index.md) - review-ready - Перенесення source specifications у Project Memory, видалення obsolete files і прийняття requirements.

## Дослідження

Немає.

## Фіксації

Немає.

## Додатковий контекст

Користувач явно дозволив запуск незалежних субагентів для review.
