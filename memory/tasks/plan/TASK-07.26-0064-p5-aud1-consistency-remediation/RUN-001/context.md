# Контекст виконання: RUN-001

Related Task: [TASK-07.26-0064](../task.md)
Prepared: 2026-08-23
Prepared By: Agent Task Package Author `/root/task0064_package`
Previous Run: none

## Agent Role

Agent Memory Maintainer / Consistency Remediator

## Мета run

Усунути дві P2 consistency findings P5-AUD1 без scope expansion: P2-002 закрити operational lifecycle correction, P2-001 оформити й після окремого approval застосувати exact canonical FIX-001, потім забезпечити незалежну повторну перевірку TASK-0063.

## Ефективні вимоги

1. Audit [TASK-0063](../../TASK-07.26-0063-p5-aud1-independent-phase-5-audit/index.md) і його [detailed report](../../../../reports/audits/2026-08-23-extensia-phase-5-independent-audit.md) є authority для exact finding IDs, evidence й closure conditions.
2. P2-001 canonical target set закритий рівно чотирма files: roadmap, read-model completeness contract, technical open questions, technical architecture.
3. Canonical support залишається unclaimed до accepted P5-AUD1 та explicit human Phase 5 gate; `full/full` лишається unsupported; designated-writer `full/readonly` лишається only candidate.
4. FIX-001 має exact deterministic preconditions/replacements і не застосовується до fixation-specific human approval.
5. P2-002 є operational metadata correction рівно двох top-level Status lines у TASK-0056 FIX-002/FIX-003; reviewed semantics не переписуються.
6. Remediation author виконує self-review, але не видає його за independent audit або independent TASK-0063 reverification.
7. `pass` TASK-0063 можливий лише після exact application, independent reverification і open P0/P1/P2/P3 = `0/0/0/0`.
8. Human Phase 5 gate і Phase 6 залишаються inactive; execution command не є їх approval.
9. Production source/tests/package behavior не змінюються.
10. Lifecycle updates відображають фактичний стан; task не переходить у `done` без whole-task human approval.

## Обсяг

- Read-only finding/source/currentness analysis.
- Operational P2-002 status correction.
- Exact required FIX-001 proposal і deterministic validator.
- Fixation-specific review request; після approval exact application і post-application audit.
- Self-review, independent remediation audit, lifecycle sync і independent TASK-0063 reverification handoff/execution.

## Поза обсягом

- Production changes, contract redesign, new evidence fabrication або support expansion.
- Premature FIX application, audit self-closure, human Phase 5 gate або Phase 6 activation.

## Критерії приймання run

- Виконані всі десять task acceptance criteria.
- Exact support/lifecycle truth matrix не має ambiguous current claims.
- P2-002 diff дорівнює двом top-level status substitutions.
- P2-001 application дорівнює approved FIX-001 або зупинена до approval.
- Independent auditor повторно перевіряє remediation/TASK-0063 після application.

## Обов’язкове task-specific читання

- [P5-AUD1 task/result/report](../../TASK-07.26-0063-p5-aud1-independent-phase-5-audit/index.md) і exact `P2-001`/`P2-002` evidence.
- [P5-STAB](../../TASK-07.26-0062-p5-stab-phase-5-stabilization/index.md) accepted result/topology verdict.
- [P5-DG1 FIX artifacts](../../TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/index.md), включно з FIX-002/FIX-003 application records.
- [Roadmap](../../../../product/roadmap.md), [read-model completeness contract](../../../../technical/read-model-completeness-contract.md), [technical open questions](../../../../technical/open-questions.md), [technical architecture](../../../../technical/architecture.md).
- Operational lifecycle/index/state rules через already-booted Project Memory routes.

## Заплановані результати

1. P2 finding traceability/closure matrix у result.
2. Вузька operational P2-002 correction.
3. Required exact proposed `FIX-001` для чотирьох canonical targets.
4. Deterministic precondition/application/consistency validator.
5. Self-review і independent remediation audit.
6. Post-approval exact application evidence та independent TASK-0063 reverification record.

## Перевірки

- Exact hashes/anchors/replacements і declared-target validation.
- Search truth matrix support/lifecycle claims.
- UTF-8, links, lifecycle/status/index/state consistency.
- Git diff scope: canonical four targets only after approval, predecessor two status lines, task-local operational artifacts; production diff empty.
- Independent audit і TASK-0063 findings-ledger rerun.

## Ризики

- Stale preconditions, semantic time-layer collapse, premature support claim, reviewed-artifact over-edit або verifier contamination.
- Якщо exact proposal більше не відповідає target preimages, application має зупинитися й повернутися до review.

## Припущення

- P5-AUD1 report/findings та accepted P5-STAB evidence не зміняться між activation snapshot і remediation proposal.
- Independent auditor буде доступний після application.
- Користувач окремо вирішить FIX-001 і whole-task/human-gate approvals.

## Умови зупинки

- Finding evidence або canonical target state суперечать task contract.
- Required change виходить за чотири canonical targets або змінює accepted topology semantics.
- FIX-001 не має explicit fixation-specific approval чи його preconditions не збігаються.
- Незалежний auditor недоступний для closure/reverification.
- Будь-яка remediation потребує production change або Phase 6 activation.

## Activation

Run Status: active
Activation Authorization: користувач 2026-08-23 прямо доручив створити й виконати цю remediation task та дозволив субагентів.
Activation Boundary: atomic creation зберігає task `backlog` і run `prepared`; окремий activation transition створює `result.md`, фіксує Agent Role та заморожує цей context. Authorization не є FIX-001 approval, whole-task approval, human Phase 5 gate або Phase 6 activation.
Activated: 2026-08-23; цей context заморожено після activation.
