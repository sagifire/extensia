# Контекст виконання: RUN-001

Related Task: [TASK-07.26-0043](../task.md)
Prepared: 2026-07-12
Prepared By: primary agent
Previous Run: none

## Мета run

Підготувати, перевірити й передати в human review exact required fixation, яка вводить специфікації як canonical memory documents і task artifacts.

## Ефективні вимоги

- Canonical specifications живуть у `memory/technical/spec/*.md`.
- Task-local specifications є окремим artifact type і можуть бути результатом research/design.
- Не зводити specification до research report: research дає evidence, specification задає нормативний контракт.
- Canonical application дозволена лише після human approval `FIX-001`.

## Обсяг

- Operational reglament, full reference reglament, templates й indexes.
- Exact artifact semantics і publication path.
- Self-review та незалежний subagent audit.

## Поза обсягом

- Конкретні Extensia specifications.
- Ретроспективна міграція artifacts.
- Version bump.

## Критерії приймання

- [ ] Розрізнення task-local і canonical specification однозначне.
- [ ] Lifecycle та disposition правила повні.
- [ ] Publication через `FIX-*` не обходить approval gate.
- [ ] Усі заторкнуті operational/reference/template/index surfaces перелічені exact.

## Заплановані результати

- Імплементація: task/run operational artifacts.
- Формальні дослідження: none.
- Memory fixation: expected для reglament, knowledge reference, templates та indexes.

## Обов'язковий контекст задачі

- `memory/reglament/agents.md`
- `memory/reglament/memory-rules.md`
- `memory/project/agents.md`
- `memory/project/memory-rules.md`
- `memory/knowledge/packages/pdadm-mvp-reglament/mvp_one_to_one_0.5.md`
- `memory/templates/index.md`
- `memory/technical/index.md`

## Вхідні файли та модулі

- Пряма інструкція користувача від 2026-07-12.

## Обмеження

- Proposal body заморожується при передачі в human review.
- Canonical changes не застосовуються до approval.
- Канонічний авторський текст українською.

## Перевірки

- Structural/index consistency.
- Semantic distinction of research, specification and fixation.
- Independent subagent audit.

## Ризики

- Подвійне джерело істини між task-local і canonical specification.
- Невизначений lifecycle `SPEC-*` може залишати завершені artifacts без disposition.
- Надмірне ототожнення specification із research report.

## Припущення

- `SPEC-*` є task-local reviewed artifact, а `technical/spec/*.md` — canonical published form.
- Публікація або зміна canonical specification завжди проходить через `FIX-*`.

## Зміни від попереднього run

Не застосовується для RUN-001.
