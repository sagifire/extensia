# ADR-0003: `@sagifire/ioc` як internal composition layer

Status: accepted
Date: 2026-07-09

## Контекст

Новий runtime потребує явного dependency graph, module boundaries, validation, scopes, lifecycle/disposal, diagnostics і test overrides. Водночас Extensia має лишатися бібліотекою зі стабільною application-facing API, а не service locator wrapper.

## Рішення

- Будувати production runtime через єдиний Extensia Composition Root на базі `@sagifire/ioc`.
- Описувати runtime subsystems як modules з typed tokens та explicit `requires` / `provides`.
- Валідувати graph до startup і вважати Composed Runtime immutable після `compose()`.
- Не експонувати raw IoC runtime, private providers або arbitrary token lookup application code і normal plugins.
- Надавати public behavior через Extensia Module, facades, plugin contracts і контрольований Core Extension Port.

## Наслідки

- Exact library version/API треба звірити перед implementation; source specification орієнтується на `0.0.2`.
- Module-private providers можуть рефакторитися без public compatibility commitment.
- Test overrides застосовуються до fresh composition, а не через patching production runtime.
- Advanced IoC extension API потребує окремого experimental/public token policy.

## Альтернативи

- Власний dependency container усередині Extensia — не використовується в новому design.
- Public service locator над IoC tokens — відхилено через coupling і руйнування facade-first boundary.
