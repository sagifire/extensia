# Вимоги прогону: RUN-001

Status: completed
Agent Role: Agent Executor
Execution Mode: autonomous-implementation
Created: 2026-07-11

## Мета цього run

Підготувати й виконати structural cutover Project Memory Extensia з MVP 0.4 до MVP 0.5 за direct migration guide, не переписуючи frozen history.

## Уточнені вимоги

- Direct guide є нормативним migration contract; StarterKit archive є контрольним еталоном структури й текстів operational layer.
- Project-specific content має бути класифікований і перенесений до видалення active legacy files.
- Незавершені задачі мігруються окремою групою через субагента після появи target operational layer.
- Після cutover RUN-001 фіксується як legacy migration history, а verification продовжується в root-level `RUN-002`.

## Обсяг

- Source inventory, verified backup, merge plan, structural cutover, target task migration preparation.

## Поза обсягом

- Product implementation, activation backlog tasks, зміна frozen reviewed artifacts.

## Критерії приймання

- [ ] Backup створений і читається.
- [ ] Cutover виконаний без втрати project-specific rules або project memory.
- [ ] Target verification run підготовлений у форматі MVP 0.5.
