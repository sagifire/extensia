# TASK-07.26-0043: Ввести специфікації як тип пам'яті та артефакт задачі

Task Status: canceled
Type: memory-update
Created: 2026-07-12
Owner Role: Knowledge Engineer Hat
Current Run: RUN-001

## Поточний стан

Run Status: canceled
Progress: Задачу скасовано рішенням користувача; canonical зміни не застосовувалися.
Acceptance: 3/4
Blockers: none
Blocked Phase: n/a
Pending Decisions: none
Next Action: none

## Мета

Визначити специфікацію як окремий тип canonical документа Project Memory у `memory/technical/spec/*.md` і як окремий вид task artifact, зокрема можливий результат research/design.

## Продуктовий контекст

Технічні контракти мають зберігатися як самостійні нормативні документи, а не губитися всередині research reports, task results або загальних technical notes.

## Вимоги

- Ввести термін `Specification` у регламенті.
- Визначити canonical розташування `memory/technical/spec/*.md` та index requirement.
- Ввести task-local artifact `SPEC-*` із lifecycle, links і review/freeze правилами.
- Узгодити специфікації з research artifacts і canonical memory fixation workflow.

## Обсяг

- Compact operational reglament.
- Full reference reglament package.
- Templates та indexes, необхідні для нового artifact type.
- Exact required `FIX-001` без застосування до human approval.

## Поза обсягом

- Створення конкретної продуктової специфікації Extensia.
- Міграція наявних research/design документів у `SPEC-*`.
- Зміна версії PDADM MVP або Starter Kit.

## Критерії приймання

- [x] Proposal однозначно розрізняє task-local `SPEC-*` і canonical `technical/spec/*.md`.
- [x] Визначені lifecycle, registry, links, review/freeze та disposition правила `SPEC-*`.
- [x] Визначено, як task-local specification публікується в canonical memory через `FIX-*`.
- [ ] Operational rules, full reference, templates та indexes охоплені deterministic consistency plan; repeated audit pending.

## Пов'язана пам'ять

- `memory/reglament/agents.md`
- `memory/reglament/memory-rules.md`
- `memory/knowledge/packages/pdadm-mvp-reglament/mvp_one_to_one_0.5.md`
- `memory/templates/`
- `memory/technical/`

## Прогони

- [RUN-001](RUN-001/index.md) - canceled - Proposal зупинено до canonical application.

## Дослідження

- Немає; зміна регламенту достатньо визначена прямою інструкцією користувача.

## Фіксації

- [FIX-001](FIX-001.md) - rejected - required - Відхилено; не застосовано.

## Запити на рішення

- Після audit: `approve | request changes | cancel` для задачі та окремо `approve | reject` для FIX-001.

## Запропоновані follow-up задачі

- Немає.

## Human Review

Status: canceled
Requested: n/a
Reviewed: 2026-07-12
Approval Source: повідомлення користувача від 2026-07-12
Approved Fixations: none
Rejected Fixations: FIX-001
Follow-up Decisions: none
Decision Notes: Зміни значно взаємодіють з регламентом; баланс користь/ціна поганий.

## Фінальний результат

Completed: 2026-07-12
Final Run: RUN-001
Summary: Задачу скасовано без застосування canonical змін.
Residual Risks: Specification model не введено за свідомим cancel decision.
