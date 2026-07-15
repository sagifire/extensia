# TASK-07.26-0048: Filesystem-native Windows NTFS research

Task Status: backlog
Type: research
Created: 2026-07-15
Owner Role: Agent Systems Researcher
Current Run: RUN-001

## Поточний стан

Run Status: prepared
Progress: Контракт research-only Windows/NTFS дослідження і RUN-001 підготовлені; виконання не активоване.
Acceptance: 0/8
Blockers: TASK-07.26-0041/FIX-001 мають бути accepted/applied до активації.
Blocked Phase: activation
Pending Decisions: explicit research activation та exact disposable Windows/NTFS environment.
Next Action: Окремо активувати RUN-001; задача може виконуватися паралельно з 0044-0047.

## Мета

Дослідити, чи може Windows/NTFS надати еквівалентні protocol primitives та durability semantics для окремого профілю, і видати evidence-based feasibility verdict без implementation або support claim.

## Обсяг

- authoritative mapping Windows primitives: handle-relative/reparse-safe open, `LockFileEx`, flush, atomic replace/rename і no-replace behavior;
- NTFS directory-entry durability та межі доказовості `FlushFileBuffers`, write-through flags і volume/device cache;
- reparse point, junction, symlink, path normalization, case/Unicode та volume-boundary containment threats;
- executable native probes для locking, replace/no-replace, directory durability, crash ambiguity і capability detection;
- proposed exact Windows/NTFS environment tuple, cut matrix, error taxonomy і feasibility/gap report.

## Поза обсягом

- Windows Storage Driver implementation або production dependency;
- декларація Windows/NTFS support;
- power-loss certification чи destructive production testing;
- перенесення Linux syscall assumptions без окремого доказу;
- canonical design change без окремої fixation/decision.

## Критерії приймання

1. Кожний required invariant TASK-07.26-0041 має mapping до конкретної Windows primitive або явно позначений gap.
2. Primary Microsoft documentation і executable probes разом обґрунтовують `LockFileEx` lifetime/conflicts, crash release та multi-process behavior.
3. Reparse-safe containment matrix охоплює symlink/junction/reparse/mount/volume escape, path normalization, case та Unicode edge cases і fail-closed capability detection.
4. Replace/no-replace probes визначають atomicity, destination-exists behavior, ambiguous completion та directory/namespace durability limits.
5. Flush/write-through/device-cache analysis чітко відділяє documented guarantees, observations та inference; невідоме не перетворюється на support claim.
6. Запропонований exact profile tuple має executable acceptance probe та явні exclusions для unsupported Windows/filesystem configurations.
7. Cut matrix описує необхідні future process-crash/power-loss докази й не називає research probes сертифікацією.
8. Результат містить raw evidence, source traceability, feasibility verdict, gaps/next tasks, self-review та незалежний audit.

## Перевірки

- primary-source traceability table;
- native multi-process locking probes;
- reparse/path/volume containment negative matrix;
- replace/no-replace/flush crash probes на disposable NTFS volume;
- independent rerun representative cases та audit inference boundaries.

## Ризики

- Windows API documentation може не давати достатньої directory durability гарантії;
- reparse/path semantics можуть зробити containment недоведеним;
- observed NTFS behavior може залежати від build/device/cache tuple;
- Linux-shaped protocol може потребувати окремого Windows design, а не syscall substitution;
- research evidence може бути помилково подане як implementation readiness.

## Пов'язана пам'ять

- [TASK-07.26-0041](../TASK-07.26-0041-filesystem-native-storage-driver-design/index.md)
- [FIX-001](../TASK-07.26-0041-filesystem-native-storage-driver-design/FIX-001.md)
- [Detailed report](../../../reports/research/2026-07-15-extensia-filesystem-native-storage-driver-design.md)
- [Filesystem-native Storage Profile](../../../technical/filesystem-native-storage-profile.md)
- [Technical Architecture](../../../technical/architecture.md)
- [Write, Journal і Recovery Contract](../../../technical/write-journal-recovery-contract.md)
- [ADR-0012](../../../technical/decisions/ADR-0012-filesystem-native-storage-protocol.md)

## Прогони

- [RUN-001](RUN-001/index.md) - prepared - research-only Windows/NTFS evaluation.

## Дослідження

Немає; research evidence буде створено після активації RUN-001.

## Фіксації

Немає; canonical design changes потребують окремої fixation і approval.

## Запити на рішення

Немає на етапі підготовки.

## Запропоновані follow-up задачі

- Лише після positive feasibility verdict: окремі bounded Windows implementation/certification tasks; цією задачею вони не створюються й не активуються.

## Human Review

Status: not-ready
Requested: n/a
Reviewed: pending
Approval Source: n/a
Approved Fixations: none
Rejected Fixations: none
Follow-up Decisions: pending
Decision Notes: RUN-001 не активований.

## Фінальний результат

Completed: pending
Final Run: pending
Summary: pending
Residual Risks: pending
