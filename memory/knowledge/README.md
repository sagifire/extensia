# Knowledge Memory

Knowledge Memory призначена для накопичення й перевикористання знань між задачами, сесіями та проектами.

Це reference layer. Він не читається повністю на старті звичайної агентської сесії.

## Головне правило

Кожен knowledge package повинен мати `package.md`.

Package може мати власну внутрішню структуру, якщо вона описана в його `index.md` або `package.md`.

`knowledge/packages/pdadm-mvp-reglament/` є спеціальним operational package для PDADM MVP регламенту, правил застосування методології та migration guides.

## Рекомендовані файли package

- `package.md`
- `index.md`
- `principles.md`
- `examples.md`
- `anti-examples.md`
- `workflows.md`
- `prompts.md`
- `checklists.md`
- `patterns.md`
- `changelog.md`
- `migrations/...`

## Правило для агента

Перед задачами, де можуть знадобитися спеціальні знання, агент перевіряє `memory/knowledge/package-index.md` і читає тільки релевантні пакети.

Повний `memory/knowledge/packages/pdadm-mvp-reglament/` не читається на старті звичайної сесії без явної потреби. Для старту використовується `memory/agent-start.md`.
