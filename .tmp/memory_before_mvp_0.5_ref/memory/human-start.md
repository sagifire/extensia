# Human Start

Starter Kit Version: 4.0
PDADM MVP Version: 0.4

## Для чого цей файл

Це короткий вхід у Project Memory для людини, яка ще не знайома з PDADM MVP.

Якщо ви не знаєте, що робити далі, попросіть агента працювати так:

```text
Agent Role: Agent Assistant
Working Mode: Methodology Navigator
```

Агент має пояснити поточний стан, доступні наступні кроки, які дії потребують задачі, і де потрібен human review.

## З чого почати

1. Подивіться `memory/state.md`.
2. Якщо проект новий, попросіть агента провести Project Bootstrap.
3. Якщо проект уже має задачі, відкрийте `memory/tasks/plan/progress.md`.
4. Якщо треба змінити пам'ять або код, створіть або уточніть задачу.
5. Якщо агент завершив роботу, перевірте self-review, risks і follow-up tasks перед approval.

## Project Bootstrap

Для нового проекту агент має допомогти пройти такі кроки:

1. Product framing: цінність, користувачі, проблема, межі продукту.
2. Scope framing: що входить і не входить у перший MVP.
3. Domain framing: ключові поняття, поточний і цільовий доменний стан.
4. Technical framing: початкові обмеження, стек, архітектурні припущення.
5. MVP slicing: перші фази роботи.
6. Roadmap або phase planning.
7. Task backlog у `memory/tasks/plan/`.

Для planning або design agent може запропонувати задачу з `Execution Mode: autonomous-research` і деталізованим звітом у `memory/reports/research/`.

## Що означає review

Агент не закриває задачу як `done` самостійно.

Після роботи агент переводить задачу в `review`, заповнює self-review і просить людину явно прийняти, відхилити або повернути результат на доопрацювання.

## Коли просити architecture review

Попросіть агента перевірити architecture health, якщо:

- нові фічі стають помітно важчими;
- агент часто пропонує workaround;
- зміни зачіпають надто багато місць;
- користувач або команда уникає refactor через страх щось зламати;
- фактична архітектура вже не схожа на `memory/technical/architecture.md` або ADR.
