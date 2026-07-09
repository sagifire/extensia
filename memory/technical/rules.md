# Технічні правила

Status: target baseline
Updated: 2026-07-09

## Source і версії

1. Для нового design використовуються тільки три source files із `technical/source-specifications.md`.
2. `extension-and-api-model.md` і `runtime-architecture.md` не використовуються як нормативні джерела.
3. Цільова release version — `0.1.0`; `v2` не потрапляє в package versioning як публічна версія.
4. Draft conceptual signature не стає stabilized public API без окремого design/review decision.

## Composition

5. Extensia Module є єдиним production Composition Root.
6. `@sagifire/ioc` використовується як internal composition mechanism, а не public application API.
7. Runtime modules явно оголошують `requires` і `provides`; narrow required ports належать consumer module.
8. Composition graph валідується до startup і immutable після `compose()`.
9. Test overrides застосовуються тільки до fresh composition до `compose()`.
10. Providers private by default; звичайні plugins/application code не отримують Composed Runtime, private tokens або arbitrary resolver.
11. Operation-local data передаються explicit scopes; global current-operation context заборонений.

## Core, storage і writes

12. Усі durable state changes проходять через Core operation pipeline.
13. Facade, plugin або hook не пише напряму у Storage Driver, Hot Metadata Index чи Operation Journal.
14. Storage Driver є durable source of truth і приховує physical layout від Core.
15. Write operation у `readonly` mode відхиляється до будь-якої mutation.
16. Lock keys нормалізуються й захоплюються у deterministic order; baseline використовує один storage-level writer.
17. Staged files/metadata не публікуються як final state до commit.
18. Кожна committed operation має journal entry; `committed` phase є publication boundary.
19. Hot Metadata Index оновлюється тільки після durable commit і ніколи не вважається durable source of truth.
20. Recovery завершується до runtime ready state.
21. External Change Sync застосовує лише committed entries у journal sequence order.
22. Post-commit hook failure не відкочує committed operation.

## Public API та extensions

23. Application integration є facade-first; Core і raw IoC token lookup не експонуються.
24. `storage` містить commands, `query` — read-only operations; hidden writes у query methods заборонені.
25. Public DTO трактуються як snapshots; mutation в application memory не змінює Extensia state.
26. Expected failures повертаються normalized result; failure не маскується як success.
27. Facade names унікальні; `storage` і `query` reserved для system extension.
28. Facade Registry заморожується до successful завершення `start()`.
29. Required extension dependencies декларуються й валідуються до ready state.
30. Plugin є trusted in-process code, не sandbox; Plugin Context не є IoC container.
31. Pre-commit filters не створюють side effects, які неможливо відкотити при operation failure.

## Якість

32. Кожний vertical slice перевіряє domain invariants, failure path, cleanup і public/internal boundary.
33. Tests використовують ті самі public plugin/driver/contracts, що й production, без parallel test-only architecture.
34. Diagnostics не розкривають secrets, unsafe config, provider values або private runtime instances.
35. Якщо implementation потребує обходу одного з цих правил, робота зупиняється для design/ADR, а не закріплює workaround.

## Architecture health check

Під час implementation, research і design треба перевіряти: чи не дублюються module graphs, чи не просочується storage layout у Core/API, чи не перетворюється IoC на service locator, чи не з'являється другий write path, чи не стають tests залежними від patching frozen runtime. Істотне відхилення вимагає architecture audit або окремої design/refactor task.
