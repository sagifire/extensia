# Бачення продукту

Status: target baseline
Target Release: `0.1.0`
Internal Stage: `v2`
Updated: 2026-07-09

## Продукт

Extensia — embeddable in-process бібліотека для керованої роботи з медіаресурсами. Вона запускається всередині процесу host application, зберігає доменну модель `Resource` / `Asset` / `Mark` / `KV`, координує коректні зміни стану й надає застосунку стабільну facade-first API surface.

Пакет має публічну назву `@sagifire/extensia`. Цільова версія нового релізу — `0.1.0`. Позначення `v2` використовується тільки всередині проекту для етапу повного редизайну архітектури та продуктових якостей і не є release version.

## Аудиторія

- Розробники Node.js-застосунків, яким потрібне вбудоване ядро для роботи з медіаресурсами без окремого сервера.
- Автори plugins та integration packages, які додають прикладну поведінку через hooks, custom facades і задекларовані extension dependencies.
- Автори Storage Drivers, які адаптують Extensia до конкретної файлової системи, object storage, packed storage або read-only джерела.
- Команда Extensia, яка розвиває доменні контракти, runtime, public API і testkit без змішування їхніх меж.

## Проблема

Медіазастосункам часто потрібні одразу кілька пов’язаних можливостей: стабільна модель ресурсів і файлів, ієрархія, metadata, кероване завантаження assets, швидкий read model, розширення прикладною логікою, recovery та узгодження кількох process-local views. Реалізація цих можливостей без єдиного ядра призводить до дублювання, залежності від конкретного storage та обходу інваріантів.

Extensia має дати застосунку компактне й контрольоване ядро, не нав’язуючи сервер, UI, CMS-поведінку, конкретний physical storage або загальний DI container.

## Цінність

- Єдина предметна модель медіаресурсів із явними інваріантами.
- Незалежність Core від фізичного сховища через Storage Driver.
- Передбачувана facade-first інтеграція замість доступу до внутрішнього Core або IoC runtime.
- Контрольоване розширення через trusted in-process plugins, descriptors, hooks і custom facades.
- Детермінована, валідована й тестована runtime composition на базі `@sagifire/ioc`.
- Послідовна write model, journal-backed publication, recovery та синхронізація process-local індексів.

## Продуктові принципи

1. **Бібліотека, а не сервер.** Extensia не відкриває HTTP/RPC API і не визначає deployment model host application.
2. **Стабільний домен, замінний runtime.** Доменні контракти не змішуються зі storage, lifecycle, plugins або composition details.
3. **Public API через фасади.** Application code працює через Extensia Module і facades; Core та raw IoC tokens лишаються internal.
4. **Явна композиція.** Runtime modules, ports, capabilities і extension dependencies оголошуються явно та перевіряються до startup.
5. **Незмінна межа після композиції.** Production runtime graph і public facade surface не патчаться після успішного startup.
6. **Єдиний шлях запису.** Усі зміни `Resource`, `Asset`, `Mark` і `KV` проходять через Core operation pipeline.
7. **Нейтральність до storage.** Durable state належить Storage Driver, а physical layout не просочується в домен чи public API.
8. **Очікувані failures є даними.** Очікувані validation, capability, lookup і lifecycle failures повертаються як normalized results.
9. **Розширення є явними й довіреними.** Plugins не є sandboxed code та не отримують service-locator доступу до runtime.
10. **Еволюція з урахуванням draft-статусу.** Концептуальні contracts зі специфікацій не вважаються стабілізованим API, доки відповідне рішення не пройде окремий design/review gate.

## Межі продукту

Extensia не є готовим file server, HTTP/RPC framework, CMS, distributed database, workflow engine, CDN, media transformation service, general-purpose DI framework або sandbox/marketplace для недовірених plugins.

## Джерела

- `memory/references/extensia-v2/domain-model-v2.md` — предметна модель.
- `memory/references/extensia-v2/extension-and-api-model-v2-ioc.md` — public API та extension model.
- `memory/references/extensia-v2/runtime-architecture-v2-ioc.md` — runtime architecture на базі `@sagifire/ioc`.
- Явні рішення користувача від 2026-07-09 щодо release version, внутрішнього позначення `v2` і статусу source files.
