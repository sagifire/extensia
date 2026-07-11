# Agent Rules

1. Не починати роботу без визначеної `Agent Role` або fallback у `Agent Assistant` / `Methodology Navigator`.
2. Якщо роль або задача не вказані, перейти в `Agent Assistant` / `Methodology Navigator` і пояснити користувачу доступні наступні кроки.
3. На старті сесії читати `memory/agent-start.md` і відповідний boot packet.
4. Зупиняти startup reading після boot packet, якщо немає явної причини читати глибше.
5. Не читати повний `pdadm-mvp-reglament` на старті звичайної сесії без потреби.
6. Якщо задача вказана, читати `task.md` і визначати workflow за task-level `Execution Mode`, а не за session mode.
7. Не змінювати код, canonical Project Memory, project docs або project artifacts поза task boundary.
8. Якщо агент автономно створює задачу, він повідомляє користувача про task id, type, execution mode, scope, out of scope і acceptance criteria.
9. Якщо scope або ризик задачі неясні, ставити уточнення або створювати draft task без implementation-змін.
10. Агент не може самостійно переводити задачу в `done`.
11. Після завершення своєї роботи агент виконує self-review, переводить задачу в `review` і пропонує людині перевірити результат.
12. Якщо доступні субагенти, self-review виконує незалежний субагент-аудитор в окремій сесії.
13. Якщо субагенти недоступні, агент виконує same-agent review і фіксує limitation.
14. Переводити задачу в `done` можна тільки зі статусу `review` і тільки після явного task-level human approval.
15. Погодження варіанта, проміжного рішення, плану або дозволу продовжити роботу не є human review approval задачі.
16. Якщо відповідь користувача на review-запит двозначна, уточнювати її перед зміною статусу на `done`.
17. Якщо робота припиняється без human review або без прийняття результату, задача переводиться в `canceled`, а не в `done`.
18. Для задач `autonomous-implementation` читати `task.md`, run `requirements.md`, run `context.md`.
19. Для задач `autonomous-research` читати `task.md`, `research/RSCH-*.md`, релевантну пам'ять і `memory/knowledge/package-index.md`, якщо дослідження, planning або design може потребувати reusable knowledge.
20. Для задач `autonomous-research` створювати або оновлювати деталізований звіт у `memory/reports/research/**`.
21. Для задач `interactive-memory-update` вести `worklog.md` і створювати `fixations/FIX-*.md` перед змінами Project Memory.
22. Не виходити за scope.
23. Не змінювати out-of-scope файли без явної потреби й фіксації причини.
24. Не змішувати current і target state.
25. Оновлювати `result.md` після виконання autonomous implementation run.
26. Оновлювати `research/RSCH-*.md` після autonomous research.
27. Оновлювати `FIX-*.md` після interactive або research-driven fixation.
28. Перевіряти потребу в memory sync.
29. Перед пропозицією або застосуванням змін у Project Memory виконувати upward consistency check для документів загального рівня.
30. У `result.md`, `research/RSCH-*.md` або `fixations/FIX-*.md` фіксувати стан документів загального рівня як `updated`, `not needed`, `proposed` або `blocked`.
31. Не подавати memory fixation, research result або implementation result як review-ready, якщо вплив на документи загального рівня не перевірений.
32. Для Project Memory змін виконувати language gate і прибирати англомовний авторський текст без дозволеної причини.
33. Для implementation, research, planning і design перевіряти architecture pressure.
34. Якщо architecture pressure істотний, запропонувати architecture audit, design task, ADR або refactor task.
35. Оновлювати `index.md` при зміні структури пам'яті.
36. В `index.md`, `package-index.md` і `tasks/plan/progress.md` використовувати однорядкові записи з wiki-посиланнями, а не таблиці.
37. Не додавати локальні правила або секцію `Notes` в `index.md` чи `tasks/plan/progress.md`; правила мають бути в централізованих rules-файлах або knowledge packages.
38. Перевіряти `memory/knowledge/package-index.md`, якщо задача може потребувати reusable knowledge.
39. Не переписувати великі memory documents без явної інструкції.
