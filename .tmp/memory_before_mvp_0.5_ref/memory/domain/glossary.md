# Словник Extensia

Updated: 2026-07-09

| Термін | Значення |
|---|---|
| Extensia | In-process бібліотека для керованої роботи з медіаресурсами всередині host application. |
| Resource | Центральна доменна сутність: логічна одиниця контенту з metadata, assets, marks, KV та optional parent relation. |
| Asset | Сутність одного internal file descriptor або external URL, що належить рівно одному Resource. |
| Internal Asset | Asset, файл якого належить storage Extensia; `id` є logical descriptor, `is_external = false`, `url = null`. |
| External Asset | Asset зовнішнього файлу; `is_external = true`, `url != null`, upload lifecycle не застосовується. |
| Mark | Іменована типізована ознака Resource з optional integer value для classification, filtering або ranking. |
| KV | Дворівневий словник `namespace -> key -> string value` для довільних атрибутів Resource. |
| Resource Tree | Дерево Resource, де `parent_id` є source of truth, а children list — похідною projection. |
| DTO Snapshot | Копія даних, повернута public API; її локальна mutation не змінює durable state Extensia. |
| Extensia Module | Головний application-facing object для config, composition, startup, facade access, shutdown і disposal. |
| Extensia Composition Root | Єдиний production owner `@sagifire/ioc` Composer, який збирає й валідує runtime graph. |
| Composed Runtime | Immutable IoC runtime після `compose()`; internal capability, а не public application API. |
| Core | Внутрішній runtime coordinator, через який проходять усі state-changing operations. |
| Storage Driver | Port до physical durable storage, який приховує layout, file staging, journal persistence, locks і recovery primitives. |
| Operation | State-changing runtime action над durable state; read-only query operation у цьому сенсі не є. |
| Operation Scope | Explicit lifetime для operation-local ID, actor, trace, warnings, cancellation та інших scoped values. |
| Operation Journal | Append-only журнал; committed entry є publication boundary і джерелом ordering для recovery/sync. |
| Hot Metadata Index | Process-local read model для metadata; не є durable source of truth. |
| External Change Sync | Підсистема, що читає committed journal entries інших actors і оновлює process-local index. |
| Facade | Public object, який групує application-facing commands, queries або custom scenarios без розкриття Core. |
| Facade Registry | Registry public facades, який збирається під час startup, перевіряє names і заморожується до ready state. |
| Facade Provider | Declarative contribution, що створює facade після validation dependencies і в дозволеній lifecycle phase. |
| Plugin | Trusted in-process extension із identity, lifecycle, hooks, facade contributions і controlled Core access. |
| System Extension | Extension, що постачається Extensia; зокрема `extensia.default-api` для `storage` і `query`. |
| Extension Descriptor | Declarative metadata про extension identity, requirements, provisions, options і failure policy. |
| Core Extension Port | Контрольований contract для commands і reads, доступний facades та trusted plugins замість internal Core. |
| Hook | Event або pre-commit filter для reaction, validation чи transformation у визначеній failure policy. |
| Normalized Result | Структура success/failure з `status`, `result`, `error` і optional warnings для expected outcomes. |
| Greedy Mode | Loading mode, у якому metadata index повністю будується під час startup. |
| Lazy Mode | Loading mode із partial index і завантаженням metadata за потреби. |
| Full Storage Mode | Driver capability mode з підтримкою reads, writes, staging, journal, write lock і recovery primitives. |
| Read-only Storage Mode | Driver capability mode, у якому доступні reads, а write operations відхиляються до mutation. |
