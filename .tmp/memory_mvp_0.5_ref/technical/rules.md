# Технічні правила

Цей файл є placeholder для технічних правил конкретного проекту.

## Технічні правила проекту

1. TODO: правило щодо архітектури, стеку або якості.
2. TODO: правило щодо тестування, інтеграцій або deployment.
3. TODO: правило щодо безпеки, даних або продуктивності.

## Architecture health check

Під час задач, які змінюють код, архітектуру, design або технічні правила, агент має перевірити architecture pressure.

Якщо поточна архітектура починає обмежувати нові фічі, агент не повинен приховувати проблему за локальним workaround. Він має запропонувати один із безпечних наступних кроків:

- architecture audit у `memory/reports/audits/`;
- design або research task;
- ADR або architecture proposal;
- refactor task з малим scope;
- accepted risk із follow-up task.

## Посилання на правила Project Memory

Базові правила ведення Project Memory описані в `memory/reglament/memory-rules.md`, а project-specific адаптації - у `memory/project/memory-rules.md`.

Не переносіть правила обслуговування `memory/` у product technical rules, якщо вони не є справжніми технічними правилами продукту.
