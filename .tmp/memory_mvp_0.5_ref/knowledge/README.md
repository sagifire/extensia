# Knowledge Memory

Knowledge Memory накопичує reusable знання між задачами, сесіями або проектами.

Це reference layer, який не читається повністю під час startup.

## Головне правило

Кожен knowledge package має `index.md` і `package.md`. Внутрішня структура пакета описується в його index.

## Generic package

Package може містити principles, examples, anti-examples, patterns, prompts, checklists або інші потрібні artifacts. Не створювати файли без реальної retrieval value.

## Package регламенту

`knowledge/packages/pdadm-mvp-reglament/` є current-version reference і migration package. Він не є operational startup layer; для звичайної роботи використовуються `memory/reglament/` і `memory/project/`.

## Правило читання

Перед задачами, де можуть знадобитися спеціальні знання, перевірити `memory/knowledge/package-index.md` і читати тільки релевантні packages.
