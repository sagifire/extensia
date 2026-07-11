# Project Memory

Starter Kit Version: 5.0
PDADM MVP Version: 0.5

Це стартова Project Memory для нового або наявного проекту.

Стартові Product, Domain і Technical файли є placeholders. Їх треба адаптувати до реального проекту, не трактуючи PDADM як продукт цього проекту.

## Призначення

Project Memory зберігає:

- продуктовий контекст;
- доменну модель;
- технічні рішення;
- задачі й task run artifacts;
- reusable knowledge;
- detailed research, audit і periodic reports;
- operational і project-specific правила.

## Як почати людині

1. Прочитати `memory/human-start.md`.
2. Подивитися `memory/state.md`.
3. Для нового проекту попросити агента допомогти з Project Bootstrap.
4. Для зміни project artifacts або canonical Project Memory створити чи виконати задачу в `memory/tasks/plan/`.
5. Після Review Request перевірити результат, ризики, `RSCH-*`, `FIX-*` і follow-up proposals та дати явне task-level рішення.

## Як почати агенту

1. Почати з `memory/agent-start.md`.
2. Прочитати основні правила в `memory/reglament/`.
3. Прочитати project-specific правила за маршрутами `agent-start.md`.
4. Якщо виконується задача, прочитати `task.md` і current `RUN-*/context.md`.
5. Під час активації run створити `result.md`.
6. Для формального research/planning/design створити task-local `RSCH-*` і detailed report у `memory/reports/research/`.
7. Для змістових змін canonical Project Memory підготувати `FIX-*` і застосувати його тільки після human approval.
8. При зміні структури оновити всі пов'язані `index.md`.
9. Перед human review виконати self-review або independent subagent review.

## Головні точки входу

- `memory/agent-start.md` - startup і reading routes.
- `memory/reglament/agents.md` - operational agent rules.
- `memory/reglament/memory-rules.md` - правила пам'яті, task/run invariants і glossary.
- `memory/project/agents.md` - project-specific agent adaptations.
- `memory/project/memory-rules.md` - project-specific memory adaptations.
- `memory/tasks/plan/progress.md` - карта неархівних задач.
- `memory/knowledge/package-index.md` - індекс reusable knowledge.
