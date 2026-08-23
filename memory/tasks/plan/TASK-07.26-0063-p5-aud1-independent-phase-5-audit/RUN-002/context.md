# Контекст виконання: RUN-002

Related Task: [P5-AUD1 / TASK-07.26-0063](../task.md)
Prepared: 2026-08-23
Activated: 2026-08-23
Previous Run: [RUN-001](../RUN-001/index.md)
Run Status: active

## Agent Role

Independent Phase 5 Remediation Reverification Auditor

## Мета

Незалежно повторно перевірити closure `P2-001` і `P2-002` після TASK-0064 remediation, підтвердити або відхилити upward consistency та оновити exact findings ledger/recommendation TASK-0063 без production changes, human Phase 5 gate або Phase 6 activation.

## Ефективні вимоги

1. RUN-001 і initial detailed report лишаються historical evidence та не переписуються як initial pass.
2. [TASK-0064](../../TASK-07.26-0064-p5-aud1-consistency-remediation/index.md), approved/applied [FIX-001](../../TASK-07.26-0064-p5-aud1-consistency-remediation/FIX-001.md), validator і repeated post-application audit є remediation evidence.
3. P2-001 закривається лише якщо всі 4 canonical postimages exact, wording durable, support unclaimed, `full/full` unsupported, designated-writer `full/readonly` candidate-only і operational lifecycle не суперечить canonical record.
4. P2-002 закривається лише якщо TASK-0056 FIX-002/FIX-003 top-level statuses `applied`, semantic bodies unchanged і lifecycle registries consistent.
5. Reverification має повторно перевірити task acceptance/upward consistency/ledger/recommendation, а не лише довіритися remediation self-review.
6. `pass` можливий лише за open P0/P1/P2/P3 = `0/0/0/0`.
7. Initial full/package/process evidence не треба винаходити або rerun-ити без finding-driven причини; fresh full `npm run check` після application доступний як corroboration, production diff має бути empty.
8. Human Phase 5 gate, topology support declaration і Phase 6 лишаються окремими owner decisions.

## Обсяг

- Exact FIX/application/validator/post-audit evidence.
- P2-001 canonical currentness, language, time-layer і support matrix.
- P2-002 operational status exactness.
- TASK-0063 AC2/AC8/AC9 та recommendation reconciliation з previously accepted evidence.
- UTF-8, links, diff scope, lifecycle/index/state і architecture pressure.
- Task-local RSCH-002 та окремий detailed reverification report.

## Поза обсягом

- Production remediation, source/package changes, new topology support, human gate або Phase 6 activation.
- Rewriting historical RUN-001 findings/recommendation as though they never occurred.
- Whole Phase 5 evidence rerun без finding-driven necessity.

## Перевірки

- `validate-remediation.mjs --post`, exact hashes і 8 old/new counts.
- Canonical/support/time-layer/language/upward consistency review.
- TASK-0056 FIX-002/FIX-003 exact two-line operational diff.
- Fresh completed 32-file/366-test full repository gate attribution.
- UTF-8/no BOM/local links, JSON/scripts where relevant, `git diff --check`, production/package diff exclusion.
- Findings ledger і explicit `pass | conditional | fail` recommendation.

## Умови зупинки

- Будь-який open P0-P3, exact hash/payload divergence, support expansion або lifecycle contradiction.
- Independent auditor contamination remediation authorship.
- Потреба змінити production або canonical payload під час audit.

## Activation

Користувач 2026-08-23 прямо наказав після окремої remediation task повторно перевірити TASK-0063 і дозволив субагентів. Context frozen після цього activation; команда не є whole-task approval, human Phase 5 gate або Phase 6 activation.
