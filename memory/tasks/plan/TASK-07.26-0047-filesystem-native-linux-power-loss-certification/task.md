# TASK-07.26-0047: Filesystem-native Linux power-loss certification

Task Status: backlog
Type: certification
Created: 2026-07-15
Owner Role: Agent Verifier
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Контракт optional destructive power-loss сертифікації і RUN-001 підготовлені; виконання не активоване.
Acceptance: 0/8
Blockers: успішна TASK-07.26-0046 та explicit destructive-environment approval.
Blocked Phase: activation
Pending Decisions: чи активувати optional certification; approval disposable environment і cut mechanism.
Next Action: Після accepted 0046 отримати explicit destructive-environment approval або залишити задачу в backlog без power-loss claim.

## Мета

На ізольованому disposable середовищі довести або спростувати power-loss durability exact-profile реалізації через реальні abrupt power cuts та сформувати hardware-bound verdict.

## Обсяг

- dedicated VM/block-device/test-volume topology, що допускає руйнування даних;
- exact hardware/virtualization/kernel/filesystem/mount/cache/flush attestation;
- abrupt host/device power-cut execution у protocol cut windows;
- post-boot fsck/mount/reopen та перевірка old/new valid state для initialization, graph і HEAD;
- повторювані trials, raw image/log evidence та негативний dishonest-cache/control scenario;
- explicit certificate boundaries і remediation/feasibility verdict.

## Поза обсягом

- production, shared або незабекаплені volumes;
- підміна power loss process kill, VM process stop без доведеної flush-loss semantics або fault injection лише на API рівні;
- загальна hardware-independent гарантія;
- Windows/NTFS;
- функціональна розробка, не потрібна для bounded certification harness.

## Критерії приймання

1. До першого destructive run отримано явне approval, підтверджено disposable target і guardrails, що виключають production/shared storage.
2. Environment manifest фіксує hardware/VM, kernel, filesystem, mount, device cache, barrier/flush semantics і identity tested build.
3. Power-cut mechanism доказово перериває persistence нижче процесу/guest OS та має контрольний сценарій, здатний виявити dishonest cache.
4. Cut/trial matrix покриває initialization slots, immutable object publish, directory sync і HEAD replacement у визначених windows.
5. Після кожного boot recovery дає лише дозволений old/new valid state або зафіксований fail; silent partial reachability заборонена.
6. Достатня кількість повторів і raw disk/log/image evidence дозволяють незалежне відтворення та відрізнення випадкового успіху.
7. Certificate явно обмежений exact tested hardware tuple, а негативний результат не маскується process-crash сертифікатом.
8. Виконані self-review, незалежний audit і human approval фінального destructive-test verdict.

## Перевірки

- preflight target identity/guardrail check перед кожним cut;
- controlled flush-honest та dishonest-cache scenarios;
- repeated abrupt power cycles з disk-image capture;
- fsck/mount/reopen та byte/reachability invariant inspection;
- clean-room repetition representative subset.

## Ризики

- фізичне пошкодження або повна втрата даних на test target;
- VM/hypervisor може приховати реальну persistence semantics;
- device cache може неправдиво підтвердити durability;
- недостатня кількість trials створить хибну впевненість;
- certificate легко неправильно узагальнити на інше hardware.

## Пов'язана пам'ять

- [TASK-07.26-0041](../TASK-07.26-0041-filesystem-native-storage-driver-design/index.md)
- [FIX-001](../TASK-07.26-0041-filesystem-native-storage-driver-design/FIX-001.md)
- [Detailed report](../../../reports/research/2026-07-15-extensia-filesystem-native-storage-driver-design.md)
- [TASK-07.26-0046](../TASK-07.26-0046-filesystem-native-linux-process-crash-certification/index.md)
- [Filesystem-native Storage Profile](../../../technical/filesystem-native-storage-profile.md)
- [Write, Journal і Recovery Contract](../../../technical/write-journal-recovery-contract.md)
- [ADR-0012](../../../technical/decisions/ADR-0012-filesystem-native-storage-protocol.md)

## Прогони

- [RUN-001](RUN-001/index.md) - prepared - optional destructive power-loss сертифікація.

## Дослідження

Немає; destructive evidence створюється лише після explicit approval та активації RUN-001.

## Фіксації

Немає; protocol defects повертаються в implementation workflow.

## Запити на рішення

- Потрібне окреме destructive-environment approval перед активацією.

## Запропоновані follow-up задачі

Немає на етапі підготовки.

## Human Review

Status: not-ready
Requested: n/a
Reviewed: pending
Approval Source: n/a
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: destructive-environment approval pending
Decision Notes: RUN-001 optional і не активований.

## Фінальний результат

Completed: pending
Final Run: pending
Summary: pending
Residual Risks: pending
