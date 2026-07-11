# ADR-0005: Core-driven operation і consistency model

Status: accepted
Date: 2026-07-09
Accepted: 2026-07-10

## Контекст

Resource metadata, asset files, process-local indexes і multi-process views мають змінюватися узгоджено. Прямі writes із facades/plugins або publication index state до durable commit створили б partially successful behavior і unrecoverable divergence.

## Рішення

- Усі durable changes проходять через єдиний Core Operation Engine.
- Operation використовує explicit scope, deterministic local locks і storage-level write lock.
- Storage Driver приховує physical persistence/staging і є durable source of truth.
- `committed` Operation Journal entry є publication boundary.
- Hot Metadata Index оновлюється після committed entry; post-commit hooks виконуються після index update.
- Recovery завершується до ready state; External Change Sync застосовує committed journal changes інших actors у sequence order.

## Межа прийнятого рішення

Статус `accepted` стосується Core-driven write boundary, Storage Driver source of truth, committed journal publication і post-commit index semantics. Він не стабілізує physical storage protocol, journal format, lock/cancellation policy, recovery matrix або exact public command signatures; ці contracts залишаються planned gates P3-DG1/P3-DG2, P4-DG1 і P7-WP1.

## Наслідки

- Baseline write throughput обмежений sequential writer model, але semantics є передбачуваною.
- Перший Storage Driver має надати atomic/staging, journal, lock і recovery guarantees, достатні для цієї моделі.
- Local read-after-write забезпечується index update; інші processes можуть мати stale window до sync/refresh.
- Конкретний transaction protocol, journal format і failure matrix лишаються окремими design gates.

## Альтернативи

- Hot Metadata Index як source of truth — відхилено через відсутність durability.
- Writes напряму через plugins/facades — відхилено через обхід інваріантів.
- Fine-grained distributed multi-writer locking як baseline — відкладено як надмірна складність для `0.1.0` design.
