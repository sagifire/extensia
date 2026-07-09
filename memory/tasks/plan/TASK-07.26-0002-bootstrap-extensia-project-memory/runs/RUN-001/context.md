# Пакет контексту: RUN-001

## Обов'язкове читання

- `memory/agent-start.md`
- `memory/state.md`
- `memory/memory-rules.md`
- `memory/agents/rules.md`
- `memory/tasks/plan/progress.md`
- `memory/tasks/plan/TASK-07.26-0002-bootstrap-extensia-project-memory/task.md`
- `memory/tasks/plan/TASK-07.26-0002-bootstrap-extensia-project-memory/runs/RUN-001/requirements.md`
- `memory/tasks/plan/TASK-07.26-0002-bootstrap-extensia-project-memory/runs/RUN-001/context.md`

## Релевантний продуктовий контекст

Extensia є in-process бібліотекою для роботи з медіаресурсами. Репозиторій очищений від попередньої реалізації. Наступний публічний реліз має версію `0.1.0`; внутрішня назва `v2` означає новий етап із повним редизайном архітектури та продуктових якостей.

## Релевантний доменний контекст

Поточна реалізація домену відсутня. Цільова доменна модель визначається актуальною специфікацією `v2/domain-model-v2.md` і повинна бути зафіксована в `memory/domain/target/`, не видаючи її за current state.

## Релевантний технічний контекст

Майбутня архітектура спирається на `@sagifire/ioc`. API-модель і runtime architecture треба брати тільки з IoC-варіантів специфікацій. Extensia працює всередині процесу host application і надає публічні об'єкти для роботи з медіаресурсами.

## Релевантні пакети знань

- `memory/knowledge/packages/pdadm-mvp-reglament/package.md` - правила task boundary, autonomous implementation, memory sync, language gate й незалежного review.

## Файли або модулі для перевірки

- `v2/domain-model-v2.md`
- `v2/extension-and-api-model-v2-ioc.md`
- `v2/runtime-architecture-v2-ioc.md`
- `memory/product/`
- `memory/domain/`
- `memory/technical/`
- `memory/state.md`

## Відомі ризики

- Специфікації можуть містити змішані product, domain і runtime concerns; під час декомпозиції не можна втратити інваріанти або змінити їхню силу.
- Великий обсяг source documents створює ризик надмірного дублювання; Project Memory має залишатись навігаційним шаром, а не неявною четвертою специфікацією.
- Планова архітектура ще не реалізована, тому technical memory повинна явно позначати target status.
- Необхідно не підмінити source-backed рішення випадковим implementation planning.

## Припущення

- Специфікації в `v2/` є локальними source-reference documents і лишаються доступними в репозиторії.
- Пакет `@sagifire/ioc` буде зовнішньою runtime dependency майбутньої реалізації, але встановлення залежності не входить у цей run.
- Деталізація roadmap обмежується послідовністю фаз і decision gates, які можна обґрунтувати специфікаціями та станом репозиторію.
