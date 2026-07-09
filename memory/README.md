# Project Memory Extensia

Starter Kit Version: 4.0
PDADM MVP Version: 0.4
Target Release: `0.1.0`
Internal Stage: `v2`

Це проектно-специфічна Project Memory бібліотеки Extensia. Вона є центральним навігаційним джерелом продуктового, доменного, технічного й task context для нового релізу `0.1.0` після повного редизайну архітектури та продуктових якостей.

`v2` є внутрішньою назвою етапу, а не публічною версією package.

## Продуктовий контекст

Extensia — in-process бібліотека для керованої роботи з медіаресурсами всередині host application. Цільова модель будується навколо `Resource`, `Asset`, `Mark` і `KV`, facade-first public API, trusted plugins та Core-driven runtime.

Майбутня runtime composition використовує `@sagifire/ioc` як internal dependency. IoC runtime не є public application API або service locator.

## Source policy

Актуальні design sources:

- `memory/references/extensia-v2/domain-model-v2.md`;
- `memory/references/extensia-v2/extension-and-api-model-v2-ioc.md`;
- `memory/references/extensia-v2/runtime-architecture-v2-ioc.md`.

Obsolete non-IoC documents `extension-and-api-model.md` і `runtime-architecture.md` видалені в RUN-002. Детальна policy та relocation history зафіксовані в `technical/source-specifications.md` та ADR-0002.

Source specifications мають статус draft. Project Memory розділяє явно прийняті рішення, target-draft design і фактичний current implementation state.

## Як почати людині

1. Прочитати `state.md` для поточного фокусу, ризиків і наступних кроків.
2. Переглянути `product/vision.md`, `product/requirements.md` і `product/roadmap.md`.
3. Для предметної моделі перейти через `domain/index.md`.
4. Для IoC/runtime/API boundaries перейти через `technical/index.md`.
5. Перед implementation перевірити `technical/open-questions.md`, relevant ADR і активну задачу в `tasks/plan/progress.md`.
6. Після роботи агента переглянути self-review, risks, follow-up tasks і явно прийняти або відхилити результат.

## Як почати агенту

1. Почати з `agent-start.md` і відповідного boot packet.
2. Відновити task-level `Execution Mode` з `task.md`.
3. Не змінювати code або canonical memory поза task boundary.
4. Для product/domain/technical work дотримуватися source policy та current/target separation.
5. Оновлювати direct `index.md`, task progress і документи загального рівня при зміні структури або статусу.
6. Перед передачею в review виконувати memory sync, language gate, architecture pressure check і незалежний audit, якщо subagent доступний.

## Головні точки входу

- `agent-start.md` — startup protocol для агентів.
- `human-start.md` — короткий вступ до регламенту для людини.
- `state.md` — актуальний стан проекту.
- `product/index.md` — продуктова пам'ять.
- `domain/index.md` — current/target domain memory.
- `technical/index.md` — architecture, stack, rules, source policy, open questions і ADR.
- `references/index.md` — detailed project-specific source references.
- `tasks/plan/progress.md` — операційний індекс задач.
- `memory-rules.md` — правила роботи з Project Memory.
- `knowledge/package-index.md` — reusable knowledge packages.
