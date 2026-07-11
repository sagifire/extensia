# Пакет знань: PDADM MVP Reglament

Status: draft
Version: 5.0
PDADM MVP Version: 0.5
Supported Migration Source: 0.4
Scope: process
Reusable: true
Operational Rules: `../../../reglament/`
Full Reglament: `mvp_one_to_one_0.5.md`
Migration Guide: `migration-from-0.4-to-0.5.md`

## Призначення

Надати повний reference текст поточної версії PDADM MVP і direct migration guide з реально підтримуваної source version.

Цей package не є operational document постійної роботи агента. Щоденні правила живуть у `memory/reglament/`, а project adaptations - у `memory/project/`.

## Коли читати

- Потрібен повний текст правила, якого недостатньо в compact operational layer.
- Виконується methodology audit.
- Оновлюється Starter Kit або сам регламент.
- Виконується чи перевіряється migration 0.4 -> 0.5.
- Треба розв'язати неясність у трактуванні PDADM.

## Коли не читати

- Під час звичайного startup.
- Для виконання конкретної задачі, якщо достатньо task/run context і `memory/reglament/`.
- Замість Product, Domain або Technical Memory конкретного проекту.

## Правила оновлення

1. Зберігати повний точний текст тільки поточної версії.
2. Зберігати тільки direct migration guides із реально підтримуваних source versions.
3. Не накопичувати historical full reglament files без актуальної потреби.
4. Не створювати дублікати operational `rules.md` або `workflows.md` усередині package.
5. При новому релізі оновити version metadata, indexes і supported migration guides.

## Пов'язані типи задач

- knowledge
- memory-update
- memory-migration
- docs
- research
- planning
- design

## Пов'язані пакети

- Немає.
