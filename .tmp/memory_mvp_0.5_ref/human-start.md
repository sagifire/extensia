# Human Start

Starter Kit Version: 5.0
PDADM MVP Version: 0.5

## Для чого цей файл

Короткий вхід у Project Memory для людини, яка ще не знайома з PDADM MVP.

Якщо незрозуміло, що робити далі, попросіть агента допомогти як `Agent Assistant` і пояснити доступні наступні дії.

## З чого почати

1. Подивитися `memory/state.md`.
2. Для нового проекту пройти Project Bootstrap.
3. Для наявних задач відкрити `memory/tasks/plan/progress.md`.
4. Щоб змінити код, документацію або Project Memory, створити або виконати задачу.
5. Щоб запустити backlog-задачу, прямо наказати виконати її, однозначно вказавши task ID або назву.
6. Після Review Request перевірити результат і дати одне з рішень: approve, request changes або cancel.

## Як створюється задача

Нова задача одразу створюється повністю підготовленою зі статусом `backlog` і `RUN-001/context.md`. Окремо просити агента «підготувати» вже створену задачу не потрібно.

## Що означає review

У статусі `review` агент уже виконав run і self-review. Людина перевіряє:

- результат і acceptance criteria;
- перевірки та ризики;
- research artifacts;
- memory fixations;
- follow-up proposals.

Approval може одночасно дозволити застосувати точні `FIX-*` і закрити задачу після успішної фіналізації без відхилень.

`request changes` означає продовжити роботу в новому run. `cancel` припиняє задачу без прийняття результату.

## Project Bootstrap

Для нового проекту агент допомагає пройти product framing, scope, domain, technical framing, MVP slicing, roadmap і task backlog. Planning та design можуть бути формальною діяльністю звичайного task run і створювати `RSCH-*` та detailed report.

## Architecture health

Попросіть architecture review, якщо нові фічі потребують workaround, зачіпають надто багато місць, тести стають крихкими або фактична архітектура розійшлася з `memory/technical/architecture.md` чи ADR.
