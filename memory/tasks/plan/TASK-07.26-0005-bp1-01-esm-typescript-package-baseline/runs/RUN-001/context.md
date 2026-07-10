# Контекст RUN-001

## Роль і режим

- Agent Role: Product Lead Hat.
- Execution Mode: `autonomous-implementation`.
- Task status на старті run: `active`.

## Джерела рішення

- `TASK-07.26-0005` визначає scope та acceptance criteria.
- ADR-0006 фіксує exact direct pins, Node.js 24 ESM, NodeNext/ES2024, unbundled `tsc`, npm lockfile та package boundary.
- `technical/stack.md` визначає strict compiler contract і потрібні package gates.

## Початковий стан і захист чужих змін

`package.json` містив лише package identity, ESM і engines. Конфігурацій, source/tests, dependency lockfile та build output не було. Робоче дерево вже містило незакомічені зміни `TASK-07.26-0006` у її task artifacts, `state.md`, `product/roadmap.md`, `tasks/plan/index.md` і `tasks/plan/progress.md`. Вони переглянуті як узгоджені з завершеною задачою та не перетинаються з implementation-файлами BP1-01; run не має їх перезаписувати.

## Перевірки

Package gate має збирати лише `src` у `dist`, не залишати CJS/test artifacts, перевірити packed contents і встановити tarball у тимчасовому чистому consumer. Consumer виконує root runtime import, TypeScript typecheck та очікувану відмову неекспортованого internal subpath.
