# TASK-07.26-0022: BP2-01A — Materialize shared internal read-port

Status: done
Type: chore
Execution Mode: autonomous-implementation
Created: 2026-07-10
Owner Role: System Engineer Hat
Current Run: `RUN-001`
Current Research: n/a
Current Fixation: n/a
Prerequisite Application Artifact: `APP-07.26-0021-001`

## Мета

Materialize-ити один exact internal TypeScript source artifact для shared Core Resource read-port/token, щоб BP2-02 і BP2-03 не дублювали contract або не мали shared-file race.

## Обсяг

- Створити лише `src/system-extensions/default-api/resource-read-port.ts`.
- Export-ити typed `resource.get`/`resource.tree.get` requests, `CoreReadFailure` лише з `RESOURCE_NOT_FOUND`, `CoreReadResult`, overload-based `CoreResourceReadPort` і `CORE_RESOURCE_READ_PORT` з ID `extensia.internal.system-extensions.default-api.core-resource-read-port`.
- Використати existing internal namespace, domain scalar і snapshot imports, без root/subpath package export.
- Перевірити strict TypeScript/package gates та відсутність runtime provider/adapter implementation.

## Поза обсягом

- Core/index/driver/provider binding, Registry, facade adapter, public factory/module/exports, runtime composition, tests для runtime behavior, writes, Journal, plugins і будь-яка production implementation поза одним typed contract source module.

## Залежності та activation gate

- `APP-07.26-0021-001` має бути published після post-application audit TASK-0021.
- Activation потребує окремого explicit user decision; лише тоді створюється `RUN-001`.
- До activation заборонені `RUN-*` та інші execution artifacts.
- Після `done` цього source artifact BP2-02 і BP2-03 все ще потребують власних independent activation decisions; тоді вони можуть виконуватися паралельно.

## Критерії приймання

- [x] Exact source path, request discriminants, result union, overloads і token ID відповідають `public-read-contract.md`.
- [x] Source не додає runtime implementation, provider, adapter, package export або другий contract.
- [x] Internal consumer ownership `extensia.default-api` збережено; BP2-02 лише bind/adapt-ить implementation.
- [x] Full relevant package gates зелені; repeated independent review повернув `REVIEW_READY` без відкритих P0–P3.

## Architecture pressure

Зупинити роботу для design correction, якщо потрібні generic resolver, arbitrary payload, mutation capability, second token/contract, public export або runtime wiring.
