# Multi-instance здійсненність current local-sqlite-v1

Status: completed
Date: 2026-07-17
Related Task: [P5-RS1 / TASK-07.26-0055](../../tasks/plan/TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/task.md)
Related Run: [RUN-001](../../tasks/plan/TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/RUN-001/index.md)
Related Research: [RSCH-001](../../tasks/plan/TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/RSCH-001.md)

## Outcome

Current `embedded-transactional/local-sqlite-v1` допускає кілька довгоживучих processes лише за чітко звуженої межі. Storage-level `full/full` serialization і committed journal replay executable підтверджені, а `full/readonly` raw committed visibility працює без hidden writes. Проте current process-local runtime index не refresh-иться від external commits, readonly port не має journal-after-cursor seam, exclusive full session блокує concurrent readonly observation, а simultaneous writes мають scheduler-sensitive `STORAGE_LOCK_FAILED` без retry/fairness contract.

Отже, storage primitives є conditionally feasible для майбутнього owner-designed sync. Жодна current topology не отримує support claim: live coherent `full/full` і live synchronized `full/readonly` у current runtime infeasible без P5-DG2 contract/implementation.

## Evidence boundary

### Exact environment

- Node.js `v24.17.0`; npm `11.13.0`; `win32 x64`; Windows build `10.0.26200`.
- SQLite `3.53.0` через built-in `node:sqlite`.
- Evidence roots: окремі directories `.tmp/p5-rs1-*` на workspace volume `D:`; PowerShell gate підтвердив `Fixed`, `NTFS`, `Healthy`, `OK`.
- Driver options: `profile: candidate-local-filesystem`, `timeoutMs: 250`, `reconciliationDelayMs: 1`.
- Це caller-attested current-host local NTFS research. `candidate-local-filesystem` не створює certified profile або automatic filesystem detection claim.

### Source/profile identity

Starting Git baseline: `9968a32b0951e44e706d385744a5f25fe961dfbe` (`Accept Phase 4 stabilization and close P4-STAB`). Production source був clean; uncommitted worktree changes належали прийнятим task/memory artifacts TASK-0054 і prepared Phase 5 packages.

| File | SHA-256 |
|---|---|
| `package-lock.json` | `9855f95c1b9be2166cbca3cbde37cab6c667e036f50343f3b289b2c3fc39680c` |
| `src/composition/local-sqlite-runtime.ts` | `6933753da3c499a58c579f01c1235700557477c338df88286b05fc9c576b4350` |
| `src/storage/local-sqlite-resource-driver.ts` | `ffcf5db8d7694ac16e456ab09d43b176a02d06b34df533cb0eee589d774fc86d` |
| `src/storage/resource-write-protocol.ts` | `3147e03c80c187ffb4bc6510744ca8733d708583f2cdf4fc90e776ce66cf8193` |

Profile boundary: internal `embedded-transactional/local-sqlite-v1`, rollback journal, `synchronous=EXTRA`, session-scoped `locking_mode=EXCLUSIVE`. Full session має `readCommittedOperationsAfter(cursor)`; readonly driver має лише `listResources()` і internal Asset readiness proof.

### Research-only harness

- [Worker](../../tasks/plan/TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/RUN-001/multi-instance-worker.mjs) запускає compiled internal production composition/driver modules у справжньому child process; parallel storage contract або shipped dependency не створено.
- [Orchestrator](../../tasks/plan/TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/RUN-001/multi-instance-research.mjs) керує exact interleavings через IPC, але не серіалізує незалежні competing acquire/write requests.
- [Validator](../../tasks/plan/TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/RUN-001/validate-raw-evidence.mjs) executable перевіряє sequences, cardinality, normalized failures, snapshots і restart observations трьох raw manifests.
- Raw manifests: [R1](../../tasks/plan/TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/RUN-001/raw-evidence-R1.json), [R2](../../tasks/plan/TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/RUN-001/raw-evidence-R2.json), [R3](../../tasks/plan/TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/RUN-001/raw-evidence-R3.json).

Rerun commands з repository root:

```powershell
npm.cmd run build
node 'memory/tasks/plan/TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/RUN-001/multi-instance-research.mjs'
node 'memory/tasks/plan/TASK-07.26-0055-p5-rs1-local-sqlite-multi-instance-feasibility/RUN-001/validate-raw-evidence.mjs'
```

Orchestrator друкує compact JSON manifest у stdout. Published R1–R3 є semantic-exact manifests трьох окремих executions: capture pipeline parse-ить stdout JSON і reserialize-ить його з indentation через `apply_patch`, не змінюючи values; наведені hashes належать stored formatted files. Randomized IDs, PIDs, roots і timings очікувано відрізняються.

Temporary roots з capture та independent audit зберігалися до завершення final audit і після цього були видалені з validated `.tmp/p5-rs1-*` boundary. Manifests навмисно зберігають original capture paths як provenance; rerun завжди створює новий isolated root.

## Full/full matrix

### Alternating commit/observe

Кожен repeat тримав два `full` runtimes started в окремих processes і виконав шість alternating public `createResource` commits.

| Check | R1 | R2 | R3 | Disposition |
|---|---:|---:|---:|---|
| Alternating commits | 6 | 6 | 6 | усі success |
| Observer storage sequences | `1..6` | `1..6` | `1..6` | no gaps/duplicates/regression |
| Observer storage Resource count | 6 | 6 | 6 | обидва full observers coherent |
| Immediate observer runtime query | 6/6 not found | 6/6 not found | 6/6 not found | process-local index stale |
| Replay after cursor `2` | `3..6` | `3..6` | `3..6` | strictly later entries |
| Replay at head `6` | empty | empty | empty | exact head behavior |

Observation: current full driver/session бачить external committed state і journal. Current runtime query index не змінюється від чужого commit без local refresh/sync.

Inference: storage observation seam достатній як evidence input для P5-DG2, але current application-visible full/full topology не є coherent live topology.

### Contention, timeout і release

Кожен repeat виконав:

- один contender під held exclusive session до timeout;
- десять controlled waits, де holder release-ив session після nominal `40 ms`;
- десять simultaneous public write attempts (п'ять pairs) без harness retry.

| Metric | R1 | R2 | R3 |
|---|---:|---:|---:|
| Configured SQLite timeout | 250 ms | 250 ms | 250 ms |
| Held-session timeout observation | 318.23 ms | 320.69 ms | 317.72 ms |
| Timeout outcome | `database is locked` | `database is locked` | `database is locked` |
| Controlled release acquisitions | 10/10 | 10/10 | 10/10 |
| Controlled acquire range | 42.21–56.52 ms | 42.64–60.29 ms | 42.21–58.08 ms |
| Simultaneous write successes | 8/10 | 8/10 | 4/10 |
| Simultaneous failures | 2 `STORAGE_LOCK_FAILED` | 2 `STORAGE_LOCK_FAILED` | 6 `STORAGE_LOCK_FAILED` |

Across canonical repeats: controlled release 30/30 success; simultaneous writes 20/30 success і 10/30 normalized lock failures. Every committed subset produced contiguous sequences and matching Resource cardinality; failed attempts did not create rows or gaps.

Observation: session ownership і release behave safely. Contention outcome under simultaneous public writes is strongly scheduler-sensitive within this 250 ms environment.

Inference: cooperative serialization with bounded session lifetime is feasible. Current runtime provides neither automatic retry nor fairness/starvation guarantee. Thirty controlled successes are a negative starvation indicator only for this exact pattern, not proof of general fairness.

Unknown: behavior for long transactions, larger write-sets, busy loops, different timeout/poll intervals, other Node/OS/filesystem tuples and sustained asymmetric writers.

## Full/readonly matrix

Each repeat started one long-lived full writer and one long-lived readonly observer over the same root.

| Check | R1–R3 observation | Meaning |
|---|---|---|
| Readonly start + initial list snapshot | before/after SHA-256 equal in 3/3 | no hidden DB/journal/mtime write |
| External full commit | raw readonly `listResources()` saw row in 3/3 | committed storage visibility works on open connection |
| Immediate readonly runtime query | `RESOURCE_NOT_FOUND` in 3/3 | process-local index stale |
| Readonly restart | runtime query saw row in 3/3 | reopen/rebuild refreshes current state |
| Readonly restart + runtime read snapshot | pre/post SHA-256 equal in 3/3 | reopen/rebuild path did not mutate storage |
| Journal-after-cursor | capability absent in 3/3 | current readonly port cannot drive journal sync |
| Read under held full session | `database is locked` in 3/3 | exclusive writer lease blocks observation |
| Read after release | success in 3/3 | no persistent lock after release |
| Read/contention snapshots | before/after SHA-256 equal in 3/3 | readonly path remained zero-write |

Observation: readonly connection itself can observe fresh committed rows per later `listResources()` call. Application query continues reading its startup-built process-local index. Driver interface has no readonly journal cursor method.

Inference: current `full/readonly` is conditionally useful for static/restart-based readers, not for live synchronized Extensia instances. Tight polling over `listResources()` would both lack ordering and collide with full sessions; it must not be adopted as a workaround.

Unknown: exact snapshot consistency of multi-query higher-level refresh, polling/backoff policy, stale-window contract and whether P5-DG2 selects a narrow readonly observation seam or a different supported topology.

## Restart and crash observations

| Scenario | R1–R3 result | Boundary |
|---|---|---|
| Full process killed while holding clean exclusive session | replacement full process opened/acquired; Resource count і journal unchanged | crash releases VFS lease; no in-flight transaction tested here |
| Commit completed, process exited code `77` before IPC response | readonly observer found uniquely titled Resource; replacement full replay returned exactly one next sequence (`16`, `16`, `12`) | caller lost receipt; worker had observed success before exit |
| Readonly observer killed with `SIGKILL` | restarted readonly runtime/storage saw lost-receipt Resource | observer crash does not mutate authority |
| Reopen/cursor replay | next sequence contiguous after prior head | no gap/duplicate in observed process-crash cases |

Confirmed behavior: clean lock-owner crash release, committed visibility after lost receipt, readonly restart/rebuild і cursor replay on the exact environment.

Not confirmed: destructive power-loss, arbitrary kill inside SQLite COMMIT, unknown COMMIT outcome under persistent unavailability, device cache truth or recovery from corrupt/external mutation. Accepted P4 evidence owns narrower driver cut-point proofs; this research does not rebrand them as multi-instance certification.

## Verdicts

| Candidate topology | Verdict | Exact interpretation |
|---|---|---|
| Two long-lived full processes, alternating bounded storage sessions | `conditional feasible` | One SQLite authority serializes commits; both full sessions can read coherent state/journal after release. Requires explicit contention/retry/fairness and refresh contract. |
| Current application-visible live `full/full` | `infeasible` | Cross-instance runtime query index is stale; simultaneous writes frequently return `STORAGE_LOCK_FAILED`; External Change Sync/refresh is absent. |
| Long-lived full + readonly for static/restart-based reads | `conditional feasible` | Raw readonly storage sees committed rows without writes and restart rebuilds runtime index; reads can be temporarily blocked by writer lease. |
| Current live synchronized `full/readonly` | `infeasible` | Readonly port has no journal/cursor ordering capability and runtime index does not refresh external commits. |

Усі verdicts є research characterization. Current canonical support boundary лишається one host/one full writer; цей report не додає supported topology, certification або public API.

## Representative fixture/workload methodology

Майбутні P5-DG1/P5-DG2/P5-STAB мають розділяти correctness і characterization:

| Dimension | Minimum method | Measurement/disposition |
|---|---|---|
| Topology | `full/full`, `full/readonly`; окремо unsupported role combinations | exact process roles, PID/lifecycle і supported/unsupported decision |
| Data volume | current 6-entry correctness smoke; reuse accepted 32 Resources / 256 Assets metadata fixture; add bounded larger tier only when executable | counts, serialized bytes, no invented pass budget |
| Journal distance | head `0`, one entry, short replay `4`; future catch-up `32` і `256` committed entries | exact sequence set, gaps, duplicates, regression, reload count |
| Contention | no hold, controlled `40 ms`, beyond timeout, 10 simultaneous attempts; future asymmetric writer/poller schedule | raw outcome/timing distribution and normalized error, not SLA |
| Catch-up burst | mixed Resource/Asset entries after observer cursor capture; apply in one coherent generation | wall time, event-loop blocking, entries/entities reloaded, state equivalence |
| Restart | clean restart, held-lease process kill, post-commit lost receipt, observer kill; exact cut points owned separately | before/after head, state hash/cardinality, recovery classification |
| Readonly proof | byte/mtime/hash snapshots before/after start, observe, failure і stop | zero mutation plus explicit recovery-required negative case |
| Repetition | deterministic correctness every gate; at least 30 scheduler-sensitive samples before percentiles | publish raw distribution; no p95/SLA threshold without product owner |

Fixture IDs/timestamps may vary, але topology, titles/labels, commit count, cursor positions, interleaving commands, timeout and expected invariants must remain deterministic. Failure to meet a correctness invariant is a defect; latency variance is characterization until an explicit certification/SLA task exists.

## Downstream constraints

### P5-DG1

- Query completeness/status must expose that a process-local generation can be stale; silently treating startup state as globally current is unacceptable.
- Coherent refresh/rebuild must publish a whole generation and keep Storage Driver authoritative.

### P5-DG2

- Full session journal seam is executable, але readonly seam is absent; exact observation capability/topology needs owner decision rather than raw transaction leakage.
- Explicit refresh can be correctness primitive. Polling, якщо selected, needs bounded backoff/jitter/timeout lifecycle because exclusive sessions block reads and tight polling can amplify contention.
- Cursor must advance only after coherent application; actor filtering cannot skip sequence validation.
- Local commits and external batches need one process-local publication coordinator; current stale runtime observations cannot be hidden.
- Retry/fairness/starvation behavior for full/full writes is contract work, not inferred from SQLite timeout.

P5-DG2 remains dependency-gated by accepted P5-RS1 and accepted/applied P5-DG1. This report activates neither.

## Observation, inference, unknown і support boundary

| Class | Content |
|---|---|
| Observation | Exact R1–R3 sequences, results, timings, snapshots, process exits і source/environment hashes. |
| Inference | Storage primitives can underpin bounded future sync; current runtime topologies are not live coherent. |
| Unknown | Fairness, sustained workload, larger catch-up, exact refresh seam, other profiles/platforms, power-loss і SLA. |
| Support claim | None. Canonical current support boundary is unchanged. |

## Architecture pressure

- Port asymmetry (`full` journal vs readonly list-only) is real design pressure for P5-DG2; exposing raw session/transaction or building a second journal service would violate architecture.
- Exclusive session plus synchronous `DatabaseSync` makes tight polling or long transactions a contention amplifier.
- Stale process-local indexes require coherent generation publication; local workaround per facade/query would create competing truth.
- No production workaround, dependency, API expansion or second write path was introduced by this research.

## Memory impact

- Task/run/RSCH/report/index/progress/state updates: operational, included.
- Product/domain/technical canonical memory: `not-needed`; research does not change current support/design contract.
- Existing P5-DG2 task: sufficient owner for topology/cursor/refresh decisions; no new follow-up task proposed.
- Blocked areas: `not-needed`; negative/conditional evidence is a valid result.
