# ADR-0001: Стартова Project Memory

Status: accepted
Date: YYYY-MM-DD

## Контекст

Проекту потрібна стартова файлова Project Memory на основі PDADM MVP 0.5 / Starter Kit 5.0.

## Рішення

Використовувати `memory/` як кореневу папку Project Memory.

Структура містить:

- `agent-start.md`;
- compact operational rules у `reglament/`;
- project-specific adaptations у `project/`;
- product memory;
- domain memory з `current/` і `target/`;
- technical memory;
- task memory з `tasks/plan/progress.md`;
- knowledge memory;
- templates;
- reports з підпапками `periodic/`, `research/` і `audits/`.

## Наслідки

- Усі подальші зміни пам'яті мають підтримувати актуальні `index.md`.
- Канонічна мова пам'яті - українська.
- Регламент PDADM MVP 0.5 зберігається як current-version reference package.
- Повний регламент є reference layer, а не startup layer.
- Якщо користувач не знає наступний крок, Agent Assistant допомагає визначити task boundary і доступні дії.
- Кожна задача виконується через універсальний task run.
- Для formal research, planning і design потрібні task-local `RSCH-*` і detailed report у `reports/research/**`.
- Змістові canonical memory changes проходять через `FIX-*` і human review.

## Альтернативи

- Використати назву `project-memory/`. Можливо, але цей Starter Kit очікує кореневу папку `memory/`.
