# ADR-0002: Source baseline і release semantics

Status: accepted
Date: 2026-07-09

## Контекст

У `v2/` одночасно існують IoC-орієнтовані специфікації нового design і попередні non-IoC документи. Внутрішня назва `v2` також може бути помилково сприйнята як package major version.

## Рішення

- Використовувати тільки `domain-model-v2.md`, `extension-and-api-model-v2-ioc.md` і `runtime-architecture-v2-ioc.md` як source specifications поточного етапу.
- Не використовувати `extension-and-api-model.md` і `runtime-architecture.md`.
- Вважати `0.1.0` цільовою release version.
- Використовувати `v2` тільки як внутрішню назву етапу повного redesign.

## Наслідки

- Project Memory і майбутні tasks мають посилатися на IoC-варіанти source files.
- Рішення з попередніх non-IoC documents не переносяться автоматично.
- Source specifications лишаються draft: conceptual contracts потребують окремих stabilization gates.
- Stale self-reference в runtime specification не змінює accepted source policy.

## Альтернативи

- Порівнювати обидві архітектурні лінії як рівноправні alternatives — відхилено явною інструкцією користувача.
- Публікувати redesign як `2.x` — відхилено; цільовий реліз `0.1.0`.

## Оновлення RUN-002

2026-07-09 три актуальні source specifications перенесені без content changes у `memory/references/extensia-v2/`. Два obsolete non-IoC documents видалені, а root `v2/` прибрана як порожній parallel source location. Рішення цього ADR лишається чинним.
