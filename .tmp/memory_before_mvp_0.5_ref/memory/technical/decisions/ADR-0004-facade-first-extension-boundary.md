# ADR-0004: Facade-first public API та extension boundary

Status: accepted
Date: 2026-07-09
Accepted: 2026-07-10

## Контекст

Application code і plugins потребують стабільного доступу до можливостей Extensia, але direct Core/IoC access перетворив би internal structure на compatibility contract і дозволив би обходити operation pipeline.

## Рішення

- Extensia Module є головною application-facing точкою входу.
- `storage` і `query` є reserved system facades; plugins можуть надавати unique custom facades.
- System і custom facades створюються через Facade Providers та єдиний Facade Registry.
- Registry freeze виконується до successful завершення startup; dynamic extensions не входять у baseline.
- Plugins декларують identity, requirements і provisions, працюють через Plugin Context, hooks і Core Extension Port та вважаються trusted in-process code.
- Expected public failures повертаються normalized results, а DTO трактуються як snapshots.

## Межа прийнятого рішення

Статус `accepted` стосується architecture semantics і public/internal boundary цього ADR. Він не стабілізує exact facade methods, input/result/error DTO, hook names, config shape або advanced module API; ці contracts залишаються planned gates P2-DG1, P6-DG1/P6-DG2 і P7-WP1.

## Наслідки

- Public surface стає передбачуваною після startup.
- Extension graph потребує validation окремо від IoC graph.
- Конкретні signatures, hook names, result/error catalog і advanced module API ще потребують стабілізації.
- State-changing custom facade не може писати storage/index/journal напряму.

## Альтернативи

- Public access до Core methods — відхилено через coupling.
- Token-based service locator — відхилено ADR-0003.
- Mutable registry під час runtime — deferred як окрема майбутня capability.
