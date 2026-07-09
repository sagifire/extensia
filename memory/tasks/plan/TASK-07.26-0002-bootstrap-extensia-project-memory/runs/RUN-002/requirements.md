# Вимоги прогону: RUN-002

Status: completed
Agent Role: Agent Executor
Execution Mode: autonomous-implementation
Created: 2026-07-09

## Мета цього run

Зробити Project Memory єдиним canonical location для актуальних source specifications Extensia, видалити obsolete non-IoC documents і зафіксувати всі сформульовані product requirements як accepted.

## Уточнені вимоги

- Видалити `v2/extension-and-api-model.md` і `v2/runtime-architecture.md`.
- Перенести без content changes:
  - `v2/domain-model-v2.md`;
  - `v2/extension-and-api-model-v2-ioc.md`;
  - `v2/runtime-architecture-v2-ioc.md`.
- Цільовий location: `memory/references/extensia-v2/`.
- Для кожного перенесеного file SHA-256 до і після relocation має збігатися.
- Створити direct wiki indexes для `memory/references/` і `memory/references/extensia-v2/` та оновити root memory index.
- Оновити canonical source paths у Product, Domain, Technical Memory, `memory/README.md` і `memory/state.md`, де це потрібно.
- Historical RUN-001 artifacts не переписувати так, ніби початкового root `v2/` location не існувало; human review status можна оновити фактичним `changes-requested`.
- У `memory/product/requirements.md` кожен requirement row має отримати status `accepted`.
- Accepted requirement означає прийняту product/domain/runtime вимогу; conceptual method signatures і unresolved contracts можуть лишатися design-open до окремого stabilization gate.

## Обсяг

- П'ять source files у root `v2/`: deletion двох obsolete і relocation трьох актуальних.
- Новий `memory/references/` layer та його indexes.
- Canonical source-path references у Project Memory.
- `memory/product/requirements.md`.
- Task/run/status/state/index artifacts.

## Поза обсягом

- Редагування content трьох актуальних source specifications.
- Відновлення або перенесення obsolete non-IoC content.
- Зміна сформульованого тексту 37 product requirements, крім status/source path metadata.
- Стабілізація exact TypeScript signatures, API names або open technical decisions.
- Code, tests, dependencies, tooling або package publication.

## Критерії приймання

- [x] Obsolete non-IoC files відсутні.
- [x] Три актуальні source files існують тільки в `memory/references/extensia-v2/` і мають початкові SHA-256.
- [x] Root `v2/` не лишається паралельним source location.
- [x] Новий references layer і всі direct children проіндексовані.
- [x] Canonical memory paths ведуть на нові references.
- [x] Усі 37 requirement rows мають status `accepted`; `target-draft` у requirement rows відсутній.
- [x] Historical RUN-001 artifacts зберігають історичний контекст.
- [x] Independent review findings закриті або явно класифіковані.
