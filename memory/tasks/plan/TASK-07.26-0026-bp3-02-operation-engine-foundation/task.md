# BP3-02 / P3-WP1 / TASK-07.26-0026: Operation Engine foundation

Status: backlog
Type: feature
Execution Mode: autonomous-implementation
Created: 2026-07-10
Depends On: done `BP3-01A / TASK-07.26-0025`

## Мета

Реалізувати internal locks, scopes та Operation Engine skeleton поверх shared seams без fake persistence або public write success.

## Обсяг

Engine intake, atomic normalized multi-key queue, conflicting FIFO/non-conflicting progress, deterministic ordering, cancellation-before-commit, operation scope lifecycle, pipeline states, close/drain і safe cleanup/failures.

## Поза обсягом

Full fake driver, Resource create/update handler, package API expansion, P3-DG2.

## Acceptance

Усі cleanup paths executable; no global current-operation context; no raw IoC/public Core. Може виконуватися паралельно з BP3-03 лише після done BP3-01A і окремих activations.
