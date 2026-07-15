# Контекст виконання: RUN-001

Related Task: [TASK-07.26-0041](../task.md)
Prepared: 2026-07-12
Prepared By: subagent `/root/prepare_fs_driver_task`
Previous Run: none

## Мета run

Дослідити feasibility сімейства `filesystem-native` і спроєктувати exact, certifiable physical protocol для локальних embedded та game-development сценаріїв, включно з варіантом власних lock/directory-sync primitives через native/platform helper і/або explicit sidecar files.

## Ефективні вимоги

1. Зберегти shared semantic driver guarantees незалежно від обраного filesystem mechanism.
2. Встановити доказові межі `node:fs` для locking, sync, atomic namespace operations і crash durability.
3. Порівняти pure `node:fs`, native-helper та sidecar designs без припущення, що sidecar сам по собі створює OS-enforced lock або directory durability.
4. Визначити exact sidecar ownership, state, versioned format, encoding/checksum, update і recovery protocol.
5. Закрити stale/crash/takeover, fencing/generation, PID reuse, clock і split-brain semantics.
6. Закрити namespace publication, journal authority, payload integrity, idempotency, orphan cleanup і recovery-before-ready.
7. Визначити supported platform/filesystem profiles та fail-close boundary.
8. Підготувати executable probes, multi-process tests і exhaustive cut-point matrix.
9. Підготувати feasibility verdict, canonical fixations і downstream slicing без implementation.

## Обсяг

- `RSCH-001` і detailed report із alternatives, evidence, exact protocol та verdict.
- Primary-source review і executable capability probes для runtime/OS/filesystem primitives.
- Sidecar data-format specification: magic/version, identifiers, owner/generation/fence, state, timestamps лише якщо безпечні, lengths/checksum, forward/backward compatibility і corrupt/unknown handling.
- Lock acquisition/renewal/takeover/release/recovery matrices; аналіз advisory vs mandatory enforcement і hostile/cooperating process boundary.
- Publication protocol від prepared physical state до єдиного committed authority, включно з file/directory sync order і crash cut points.
- Profile certification matrix і downstream handoff до bounded implementation/proof tasks.

## Поза обсягом

- Production implementation, dependencies, package/public API або release changes.
- SQL-family driver design, Asset semantics або загальний перегляд accepted P3 contracts.
- Прийняття filesystem profile без executable evidence.
- Застосування `FIX-*` або activation downstream tasks.

## Критерії приймання

1. Semantic-to-physical guarantee mapping повний і не послаблює shared contract.
2. `node:fs` limits і platform primitives підтверджені sources плюс probes.
3. Alternatives matrix дає аргументований feasibility verdict.
4. Sidecar protocol, якщо retained, має exact versioned formats і deterministic state transitions.
5. Lock/stale/crash/fencing/takeover matrix виключає невизначений split brain у supported boundary.
6. Publication/recovery cut-point matrix має єдиний committed authority і fail-close integrity behavior.
7. Supported/unsupported profile boundaries і certification procedure точні.
8. Formal artifacts, fixation proposals і downstream slicing готові без activation.
9. Self-review та independent subagent audit завершені до human review.

## Заплановані результати

- `RSCH-001.md` із summary, alternatives, verdict, traceability і disposition.
- `memory/reports/research/2026-07-12-extensia-filesystem-native-storage-driver-design.md` із protocol і evidence matrices.
- Research-only executable capability probes та cut-point harness specification/artifacts у RUN-001, якщо потрібні для verdict.
- Required `FIX-001` для canonical driver-family/physical-profile contract; додаткові fixations лише за доведеною consistency потребою.
- Review-ready `result.md` із verification, self-review, independent audit і Review Request data.

## Обов'язковий контекст задачі

- `memory/product/roadmap.md`
- `memory/product/requirements.md`
- `memory/technical/architecture.md`
- `memory/technical/rules.md`
- `memory/technical/write-journal-recovery-contract.md`
- `memory/technical/decisions/ADR-0005-core-operation-consistency.md`
- `memory/tasks/plan/TASK-07.26-0039-p4-dg1-concrete-storage-protocol/task.md`
- `memory/tasks/plan/TASK-07.26-0039-p4-dg1-concrete-storage-protocol/RSCH-001.md`
- `memory/reports/research/2026-07-12-extensia-concrete-storage-protocol.md`

Під час formal research перевірити `memory/knowledge/package-index.md` і читати лише релевантні reusable packages.

## Вхідні файли та модулі

- Current Storage Driver session/protocol, journal і recovery seams у `src/` — лише для compatibility і proof design.
- Existing P4-DG1 capability probe — baseline evidence, яке треба перевірити й розширити, а не прийняти як повну certification.
- Node.js і platform/filesystem primary documentation та мінімальні research-only probes.

## Обмеження

- Канонічний авторський текст українською; API/schema/platform identifiers можуть лишатися англійською.
- Не видавати design або capability hypothesis за current implementation.
- Sidecar-файл не вважати lock primitive без exact atomic acquisition, fencing і stale recovery proof.
- `fsync(file)` не вважати доказом directory-entry durability; rename atomicity не прирівнювати до power-loss durability.
- Cooperative-process protocol і protection від hostile/non-cooperating writers розділяти явно.
- Network, removable, overlay, container-mounted і незаявлені filesystems вважати unsupported, доки окремий profile не сертифіковано.
- Не застосовувати `FIX-*` без explicit fixation-specific human approval.

## Перевірки

- Traceability: shared guarantee → physical invariant → primitive/evidence → probe/test → supported profile.
- Capability matrix для locking/create-exclusive/rename-replace/file sync/directory sync/metadata/permissions/symlinks/multi-process.
- Sidecar format golden vectors, corrupt/truncated/unknown-version cases і compatibility matrix.
- Multi-process contention, owner crash, PID reuse, stale takeover, delayed writer і fence rejection scenarios.
- Cut points до/після кожного write, flush, sync, rename, directory sync, journal authority і cleanup step.
- Recovery idempotency, orphan/temp cleanup, readonly і integrity fail-close verification.
- Upward consistency: `state.md`, product, domain, technical architecture/rules/open questions/ADR/indexes.
- Self-review: scope, acceptance, architecture pressure, risks, compromises, memory impact, language gate.
- Independent subagent audit до human review.

## Ризики

- Sidecar coordination між cooperating processes може бути помилково прийнята за OS-enforced exclusion.
- PID і wall-clock based stale detection створюють unsafe takeover та split brain.
- Atomic rename без directory durability залишає committed namespace невизначеним після power loss.
- Різні Windows/POSIX/filesystem semantics роблять універсальний profile неправдивим.
- Native helper збільшує portability, packaging, build і certification surface.
- Security issues із symlinks/reparse points, permissions або external tampering можуть порушити integrity boundary.

## Припущення

- Canonical taxonomy визнає `filesystem-native` окремою сім'єю, а `embedded-transactional` — першою основною implementation family; ця задача не переглядає вибір першої реалізації.
- Shared semantic Storage Driver contract із P4-DG1 лишається authority для guarantees.
- Користувач дозволив independent subagent audit, який має бути виконаний під час активного run.

## Зміни від попереднього run

Перший run; попереднього run немає.
