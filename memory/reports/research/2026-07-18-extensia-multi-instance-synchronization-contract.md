# Exact multi-instance synchronization, cursor і refresh contract Extensia

Status: completed design proposal
Date: 2026-07-18
Related Task: [P5-DG2 / TASK-07.26-0057](../../tasks/plan/TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/task.md)
Related Run: [RUN-001](../../tasks/plan/TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/RUN-001/index.md)
Related Research: [RSCH-001](../../tasks/plan/TASK-07.26-0057-p5-dg2-cursor-refresh-multi-instance-sync-contract/RSCH-001.md)

## 1. Outcome

Extensia Phase 5 використовує process-local volatile journal cursor, один publication coordinator і explicit refresh як correctness primitive. Cursor та immutable read-model generation публікуються атомарно; durable cursor без atomic durable generation checkpoint заборонений. Restart завжди виконує coherent rebuild/validation і capture journal head з тієї самої authority observation.

Committed `JournalSequence` є єдиною order authority. Actor, operation timestamp, notification і process scheduling не визначають порядок. Кожна sequence, включно з own actor, проходить validation; filtering може бути лише optimization після traversal. Gap, duplicate, regression, cursor-ahead, malformed entry або operation-ID mismatch є integrity failure і fail-close runtime. Transient lock/unavailable/read failure не змінює generation або cursor.

Application-facing correctness primitive — experimental `query.refresh()`. Default synchronization mode — `manual`; opt-in `polling` лише coalesce-ить і запускає той самий refresh з bounded retry/backoff/jitter. Driver notification не входить у Phase 5 V1 implementation: його deferred як optional wake-up optimization, яка ніколи не замінює journal observation. Tight `listResources()` polling, raw storage session exposure і second journal service відхилені.

Initial implementation candidates після executable stabilization: рівно два cooperating processes на одному certified local storage root у topology `full/full` або `full/readonly`; explicit designated writer (`full/readonly`) є рекомендованою operational topology. До P5-STAB, P5-AUD1 і explicit Phase 5 human gate жодна live multi-instance topology не має support claim. Multi-host, HA/leader election, non-cooperating mutation, arbitrary instance count і network/removable/sync/FUSE roots unsupported.

## 2. Authority й evidence boundary

### 2.1. Accepted authority

- `REQ-RUN-008`: read model process-local і derived; Storage Driver лишається durable truth.
- `REQ-RUN-010`: External Change Sync застосовує committed changes у journal order.
- `REQ-RUN-011`: `greedy`/`lazy` мають різну completeness, але однакову complete-only query correctness.
- Accepted P3 journal contract: canonical contiguous positive-decimal sequence, committed-only authority, recovery-before-ready й outcome-definite semantic commit.
- Accepted P5-DG1: one immutable generation, one root swap, exact coverage, local post-commit delta, observation outside mutation і compare-and-publish; completeness не є freshness.

### 2.2. Executable P5-RS1 facts

- Three-run `full/full` alternating matrix: 18/18 commits, exact `1..6` journal observation, replay after `2` = `3..6`, replay at head empty; process-local runtime remained stale 18/18.
- Simultaneous writes: 20/30 success, 10/30 `STORAGE_LOCK_FAILED`; failed attempts created neither rows nor sequence gaps. Result materially scheduler-sensitive.
- Held writer timeout with configured `250 ms`: observed `317.72–320.69 ms`; controlled nominal `40 ms` release: 30/30 acquisition at `42.21–60.29 ms`. Це characterization, не fairness або SLA.
- `full/readonly`: later raw list saw external commit 3/3 and zero-write snapshots remained byte-identical; runtime remained stale until restart. Readonly journal seam absent; writer lease blocked readonly observation 3/3.
- Clean session-owner crash released lease; committed lost receipt remained exactly one contiguous entry. Destructive power loss, arbitrary mid-COMMIT interruption, sustained fairness and larger catch-up were not proven.

### 2.3. Current-code facts

- Full startup already captures Resource state and journal head under one recovery-clean session, але releases session before current Index publication and ignores returned journal/head.
- Readonly startup performs separate Resource/readiness queries without ordered journal/head capability; this is insufficient as a coherent live sync observation.
- Current local SQLite session uses rollback journal, `synchronous=EXTRA`, `locking_mode=EXCLUSIVE`; `DatabaseSync` busy wait is synchronous and not interruptible by `AbortSignal` while inside a call.
- Current successful full command opportunistically full-scan-ить storage and may learn external state; missing/no-change/failure does not publish. Command-dependent freshness is accidental and must not become contract.
- Current local post-commit publication ignores transaction-returned sequence. Current Index has no generation revision, cursor, freshness або common coordinator.
- Current `readCommittedOperationsAfter` loads all journal rows and slices through JS array indexing. Phase 5 implementation must use canonical length+lexical seek/stream and never convert arbitrary cursor to JS `number`.

### 2.4. Support boundary

Цей design proposal не реалізує sync, не сертифікує topology й не змінює current one-host/one-full-writer support boundary. Candidate topology стає supported лише після production implementation, two-process stabilization, independent phase audit і explicit human gate.

## 3. Definitions and invariants

| Term | Exact meaning |
|---|---|
| applied cursor | Найбільша committed sequence, для якої всі попередні entries traversal-validated, а їхній effect включений або subsumed authoritative observation у published generation. |
| observation head | Journal head captured у тій самій coherent authority snapshot, що й returned metadata observation. |
| observed-through | Generation була coherent через captured head у publication linearization point; це не гарантує, що інший process не commit-нув одразу після capture. |
| refresh | Admission-epoch bounded attempt chain, яка спостерігає committed range після current cursor, privately builds/validates next generation і atomically publishes generation+cursor. A public caller may consume only an observation whose head capture linearizes after that caller's admission. |
| local publication | Synchronous no-fail changed-key generation update після durable local commit і до command success, serialized тим самим coordinator. |
| transient failure | Busy/locked, temporary unavailable або ordinary read failure без доказу corruption; old generation/cursor retained. |
| integrity failure | Sequence/state/projection contradiction, malformed authority або cursor-ahead; runtime fail-close, жодного publish/advance. |

Normative invariants:

1. У synchronized coordinator state `generation + cursor + synchronization inspection metadata` мають одного process-local owner і змінюються одним atomic coordinator transition. Unsupported static state має того самого generation owner, але взагалі не має cursor/head поля або sync actor.
2. Cursor ніколи не випереджає fully applied coherent generation. Generation може містити newer local committed overlay, коли earlier external sequence ще не traversed; cursor тоді лишається позаду й stale/freshness status не приховується.
3. Driver observation і backoff ніколи не виконуються під publication coordinator mutation lock.
4. Local durable commit ніколи не чекає на refresh, який утримує publication owner під storage I/O. Publication section synchronous і bounded in-memory.
5. Cursor advance без generation publish/no-op proof або generation publish без corresponding cursor rule заборонені.
6. Observation stamp P5-DG1 equality-only; він не cursor, revision, clock або order authority.
7. Actor/timestamp/PID не використовуються для merge, gap repair, fencing або ordering.

## 4. Architecture alternatives

| Alternative | Correctness | Complexity | Latency/load | Failure blast radius | Portability/operability | Decision |
|---|---|---|---|---|---|---|
| Explicit refresh only | Exact caller-visible observation boundary; simple failure ownership | Low/medium | Load only on demand; stale window caller-owned | One call; typed terminal result | Portable across any ordered observation adapter | Accepted correctness primitive і default `manual`. |
| Background polling only | Correct only if it calls exact refresh; otherwise false-current risk | Medium | Continuous DB/session load; herd/contention risk | Hidden repeated failure unless inspection exact | Portable, але synchronous SQLite pressure | Rejected as sole correctness API; accepted opt-in trigger over refresh. |
| Driver notification only | Notification can be lost/coalesced and is not state authority | High/profile-specific | Low idle latency/load when available | Watcher loss can silently stale runtime | No portable SQLite cross-process notification seam | Deferred; never correctness authority. |
| Hybrid notification + refresh | Correct if notification only wakes refresh | High | Good potential latency, added watcher lifecycle | Watcher defects degrade to polling/manual if explicit | Profile-specific | Architecture-compatible future optimization, not Phase 5 V1 deliverable. |
| Tight `listResources()` polling | No ordering/cursor; multi-query skew; writer collision | Superficially low, actually duplicated correctness | High O(N), event-loop/lock pressure | Partial/time-skewed reload can corrupt view | Readonly/full asymmetry | Rejected. |
| Durable cursor only | Can skip changes after process restart because generation is volatile | Medium | Fast restart illusion | Silent permanent stale view | Adds recovery contract | Rejected. |
| Durable cursor + atomic durable generation checkpoint | Correct if one durability authority and recovery protocol | Very high | Potential restart benefit | New second durability/recovery blast radius | Profile-specific | Deferred beyond Phase 5. |
| Runtime leader election/designated-writer service | Could reduce writers but adds fencing/availability semantics | Very high | Extra coordination | Split-brain/availability owner | Disproportionate for in-process V1 | Rejected. Explicit application-selected roles suffice. |

Recommendation: explicit refresh + opt-in polling trigger. Notification remains an optional future hint. No leader subsystem, durable checkpoint або second journal.

## 5. Topology and role contract

| Topology | Current verdict | Target after implementation/stabilization | Exact boundary |
|---|---|---|---|
| one `full` process | currently supported bounded profile | preserved | Manual/polling refresh may be no-op except direct external unsupported mutation. |
| one `full` + one `readonly` | raw/restart conditional, live runtime infeasible | initial candidate; recommended designated-writer deployment | Both require same internal committed-change observation semantics; readonly remains zero-write. |
| two `full` processes | storage conditional, current live runtime infeasible | initial experimental candidate | Both may write; `STORAGE_LOCK_FAILED` remains caller-visible; no starvation-free guarantee. |
| designated writer | current one-full-writer discipline only | recommended operational profile, not election | Role fixed in application config. Failover = old writer stopped/lease released, then new process starts; no HA promise. |
| more than two processes | unmeasured | unsupported until separate evidence | No extrapolation from two-process matrix. |
| multi-host/network/removable/sync/FUSE/direct mutation | unsupported | unsupported | Requires different storage/profile/certification contract. |

### 5.1. Topology trade-off matrix

| Role/topology option | Correctness | Complexity | Latency/load | Failure blast radius | Portability/operability | Owner disposition |
|---|---|---|---|---|---|---|
| one `full` only | Existing single authority and local read-after-write; no cross-process freshness problem | Lowest | No sync polling/contention load | One process outage affects availability, not cross-instance divergence | Current bounded local profile | Preserve as baseline. |
| one `full` + one `readonly` | Exact if both traverse one ordered change seam; readonly cannot accidentally write | Medium: readonly coherent snapshot/head adapter + coordinator | Writer-vs-reader lock contention; no writer-writer competition | Reader can stale/degrade independently; writer remains sole mutation owner | Same-host local profile; simple application-selected roles | Recommended initial designated-writer candidate after gates. |
| two symmetric `full` | Exact with one journal/coordinator per process and caller-visible lock failure | High: two command owners, retry/contention/fairness/lifecycle evidence | Highest tested pressure; simultaneous writes already 10/30 lock failures, polling adds read competition | Either process can fail/degrade; scheduler variance can amplify command latency/load | Same-host cooperating profile only; operationally harder to diagnose | Experimental candidate only; P5-STAB may narrow it out. |
| application-designated writer using two `full` handles | Convention does not enforce readonly capability; accidental second writer remains possible | Medium/high: application policy plus full capability on observer | Usually lower writes, but still full-session observation/authority surface | Misconfiguration widens blast radius to symmetric writers | Less truthful than actual readonly role | Not a distinct supported topology; use `full/readonly` when write prohibition is required. |
| runtime leader election/failover | Would need fencing before correctness can be claimed | Very high, new subsystem | Coordination/heartbeat/recovery overhead | Split-brain and availability become Phase 5 concerns | Not portable across current driver families without new protocol | Rejected for V1. |
| more than two or multi-host | Unproven; cannot extrapolate sequence visibility/fairness/environment | High/unknown | Herd and contention grow nonlinearly | Wider correlated failure and stale-view blast radius | Outside current local profile evidence | Unsupported; separate research/certification required. |

Owner-ready rationale: choose actual `full/readonly` roles for the first recommended multi-instance operating profile because it preserves one mutation owner without inventing election. Keep two-full support only as a separately evidenced experimental candidate; if P5-STAB cannot close contention/event-loop/diagnostic pressure, the Phase 5 gate must explicitly support only designated-writer `full/readonly` rather than mask the evidence with hidden retries.

Generic drivers without committed-change observation capability retain static/restart semantics. Existing configs remain startable in default manual mode through a distinct `static-unsupported` coordinator branch: P5-DG1 builds/publishes the startup generation, no cursor/head value is invented, and no sync actor exists. Safe inspection is exactly `mode='manual'`, `state='unsupported'`, `freshness='startup'`, `last_observed_at=null`, `last_failure=null`; `query.refresh()` returns `READ_MODEL_REFRESH_UNAVAILABLE` without storage I/O. Configuring polling without capability fails start before ready. This preserves compatibility without pretending live coherence.

## 6. Cursor state machine and restart

Supported committed-change observation states:

```text
absent
  -> startup-observing
       -> failed(no coordinator/facade; rollback)      terminal startup failure
  -> ready(cursor = captured head, generation = same observation)
  -> refreshing(base revision + cursor captured)
       -> ready(observed head, next generation)        success
       -> ready(old cursor, old generation)            transient/cancel/exhausted
       -> failed                                       integrity
  -> stopping -> stopped(cursor cleared, generation cleared)
```

Unsupported legacy/manual states are disjoint:

```text
absent
  -> static-startup-loading
       -> failed(no coordinator/facade; rollback)      terminal startup failure
  -> static-ready(generation only; cursor/head absent; no sync actor)
  -> stopping -> stopped(generation cleared)
```

`cursor=null` is reserved for a synchronized, coherently observed empty journal. It never represents capability absence. Internal coordinator state is therefore a tagged union (`synchronized` with cursor/head versus `static-unsupported` without those fields), not one nullable cursor structure.

### 6.1. Startup

1. Open driver/capabilities and perform recovery under existing authority.
2. Obtain one coherent startup observation: complete metadata/integrity proof plus journal head from the same storage snapshot. Lazy mode may discard non-covered projection data only after equivalent global integrity validation; cursor still binds to captured head.
3. Privately build/validate generation.
4. Atomically publish generation and cursor. Empty storage uses `cursor = null`.
5. Ready publication may follow. A commit after observation capture is allowed; it starts the honest stale window rather than invalidating ready.
6. Polling mode schedules an immediate coalesced refresh after ready; manual mode waits for explicit call.
7. Supported startup observation runs through the same bounded retry/admission engine and validated `retry` config as refresh, but it is owned by the existing `starting` transition and has no public waiter/cancellation surface. Transient lock/unavailable/read failures retry before ready; integrity/capability failures fail immediately. Exhaustion rejects start through existing `START_FAILED`, records the safe diagnostic code `READ_MODEL_STARTUP_OBSERVATION_EXHAUSTED`, publishes neither coordinator state nor facade, and rolls back opened resources. A concurrent public `stop()`/`start()` while this chain runs preserves the existing `MODULE_BUSY` result and does not cancel it. No poll timer exists until ready.

Readonly startup without atomic metadata+head observation cannot claim live sync. Separate list/readiness/head calls are not an implementation of this step.

Legacy manual startup takes only the `static-startup-loading -> static-ready` branch above and retains the P5-DG1 loading/error behavior; it never enters this observation retry chain because it has no observation capability.

### 6.2. Restart

Cursor is never persisted in Phase 5. Every new process repeats startup observation and rebuild. A previous in-memory cursor is ignored. No replay-from-old-cursor path exists without an accepted atomic durable generation checkpoint.

### 6.3. Advancement

- Empty observation at current head is successful no-op; cursor unchanged and last-observed metadata may update.
- Delta/rebuild cursor changes only in the same coordinator transition that publishes a generation coherent through observation head.
- Local commit may advance cursor only when returned committed entry sequence is exact next expected sequence. If it jumps, local delta publishes for read-after-write but cursor remains unchanged. In `manual` mode no refresh is requested or started; catch-up waits for explicit `query.refresh()` or restart. In `polling` mode the active poll actor requests/coalesces the shared refresh chain.
- Failed/canceled/exhausted observation advances nothing.
- Cursor-ahead versus observed head is integrity failure, not automatic reset.

## 7. Sequence and actor matrix

| Scenario | Required outcome |
|---|---|
| empty journal, cursor null | at-head success, no generation rewrite required. |
| external exact next entry | validate, apply/subsume, publish, advance. |
| own exact next entry after local publication | validate operation ID/fingerprint/sequence; idempotently confirm effect; advance without reverting local generation. |
| own entry after earlier unseen external entry | local commit publishes delta and cursor stays. Manual mode waits for explicit refresh/restart; polling requests/coalesces catch-up. The later observation traverses every entry through head including own. |
| duplicate sequence or operation ID | integrity fail-close. |
| gap | integrity fail-close; no merge by guess, scan reset або skip. |
| regression/out-of-order entry | integrity fail-close. |
| cursor ahead of head | integrity fail-close; indicates authority replacement/corruption/invalid state. |
| malformed/noncanonical sequence | integrity fail-close. |
| replay after transient failure before publication | same cursor re-observes safely; old generation retained until atomic success. |
| actor changes after restart | irrelevant to order; new startup capture establishes cursor. |
| timestamp order differs from sequence | sequence wins; timestamp diagnostic-only. |

Actor filtering may avoid rebuilding an already represented own change only after exact entry traversal and coordinator proof. It never changes expected next sequence or cursor advancement.

## 8. Narrow committed-change observation seam

P5-DG2 adds a sibling consumer-owned internal port; it does not modify P5-DG1 `CoreMetadataObservationPort` or expose raw sessions:

```ts
interface CoreCommittedChangeObservationPort {
  observeCommittedChanges(request: {
    readonly after: JournalSequence | null
    readonly incremental_entry_limit: 256
    readonly incremental_resource_limit: 256
    readonly attempt_admission_deadline_monotonic_ms: number
    readonly signal?: AbortSignal
  }): Promise<CommittedChangeObservation>
}

type CommittedChangeObservation =
  | {
      readonly kind: 'at-head'
      readonly observed_head: JournalSequence | null
      readonly observation_stamp: opaque
    }
  | {
      readonly kind: 'delta'
      readonly observed_head: JournalSequence
      readonly entries: readonly CommittedOperationEntry[]
      readonly resources: readonly ResourceSnapshot[]
      readonly observation_stamp: opaque
    }
  | {
      readonly kind: 'rebuild'
      readonly observed_head: JournalSequence | null
      readonly complete: CoreMetadataCompleteObservation
      readonly validated_range: 'all-after-cursor-through-head'
    }
```

Exact semantics:

- One driver-owned coherent read snapshot captures cursor validation, head, journal range and metadata. Full/readonly adapters return detached immutable data with identical semantics when capability claimed.
- `delta` contains every entry strictly after cursor through captured head; partial-to-head publication is forbidden because current metadata cannot reconstruct historical state at an intermediate sequence. Entries validate expected next sequence and unique operation ID before coalescing.
- If range exceeds 256 entries or union exceeds 256 affected Resources, adapter streams/validates the complete range and returns `rebuild` with a complete metadata observation at the same head. `256` is an internal workload-shape guard, not latency/SLA/public config.
- `delta.resources` contains exact final aggregate snapshots/tombstone state for the union of all affected Resource IDs as of the same head. Asset/primary/lineage/Mark projections derive through P5-DG1 builder; raw layout never leaks.
- Readonly observation is zero-write: no recovery, cleanup, checkpoint, journal append or cache persistence.
- Busy/unavailable/read/cancel returns typed non-integrity failure. Ahead/gap/duplicate/regression/malformed entry, schema contradiction or metadata invariant failure returns integrity failure.
- Port implementation must seek/compare arbitrary-length canonical sequence without JS `number`, timestamp or row offset authority.
- Observation session contains no sleep/backoff and releases before private generation build/publication. Full scan/rebuild time remains O(journal distance + storage size) and must be characterized; retention/compaction is explicitly absent.

## 9. One publication coordinator

Coordinator owns:

```ts
type ReadModelCoordinatorState =
  | {
      readonly kind: 'synchronized'
      readonly revision: opaque_process_local_counter
      readonly generation: ReadModelGeneration
      readonly cursor: JournalSequence | null
      readonly synchronization: SafeSynchronizationInspection
    }
  | {
      readonly kind: 'static-unsupported'
      readonly revision: opaque_process_local_counter
      readonly generation: ReadModelGeneration
      readonly synchronization: {
        readonly mode: 'manual'
        readonly state: 'unsupported'
        readonly freshness: 'startup'
        readonly last_observed_at: null
        readonly last_failure: null
      }
      // cursor/head/sync actor are intentionally absent
    }
```

### 9.1. Refresh publication

0. After the common public pre-admission gate below has confirmed ready/open intake, require the `synchronized` branch. `static-unsupported` returns `READ_MODEL_REFRESH_UNAVAILABLE` before signal/waiter/observation admission and can never enter this algorithm.
1. Capture synchronized coordinator revision and cursor in a short synchronous section.
2. Observe storage and build next generation outside coordinator.
3. Re-enter coordinator and compare revision/cursor.
4. If unchanged, atomically publish generation+head+inspection.
5. If changed, discard and re-observe within remaining retry budget. Rebase is allowed only with exact P5-DG1 compatible-stamp proof; default is discard, never blind overwrite.

### 9.2. Local commit publication

- Command captures latest coordinator generation for planning, but Storage Driver remains authority.
- Transaction-returned committed entry is mandatory input to local publication.
- After durable commit, coordinator synchronously applies changed-key delta/invalidation to latest generation before command success while storage session remains held. This generation publication occurs in both tagged branches.
- Only the `synchronized` branch evaluates committed entry sequence against cursor: exact-next may advance cursor; a jump never does. Local effect remains visible. Manual mode creates no hidden work and waits for explicit refresh/restart; polling mode requests/coalesces catch-up through the poll actor.
- The `static-unsupported` branch publishes the local generation delta and revision only. It has no cursor to advance and no catch-up actor to trigger; external state retains static/restart semantics.
- Publication failure follows accepted post-commit warning + runtime fail-close; it never rolls back committed storage.

### 9.3. Interleavings

| Interleaving | Rule |
|---|---|
| refresh observes, local commit publishes, old refresh tries publish | revision mismatch; discard/re-observe. |
| lazy load publishes while refresh observes | compatible exact rebase or discard; no older root overwrite. |
| local commit holds SQLite session | refresh may wait in driver, але holds no coordinator lock. |
| refresh holds readonly snapshot | local writer may block until observation releases; no sleep/backoff inside snapshot. |
| two explicit calls + poll tick before the first observation adapter invocation | one admission cohort; scheduler invokes one attempt, no duplicate session. |
| explicit call or poll tick after current chain invoked its first observation | queue/coalesce one trailing admission epoch even if the async Promise has not resolved; it cannot consume the earlier chain result and starts a fresh bounded chain after current settlement. |
| local commit observes a sequence jump in manual mode | publish local delta, leave cursor/freshness behind, create no refresh promise/timer/session. |
| local commit observes a sequence jump in polling mode | publish local delta, leave cursor behind, request/coalesce the poll actor chain. |

## 10. Public/config/inspection contract

All additions are `experimental-phase-5`; P7 owns final freeze. Existing read methods/value shapes remain unchanged.

```ts
type ReadModelSynchronizationMode = 'manual' | 'polling'

interface ReadModelRetryConfig {
  readonly maxAttempts?: number       // default 3; integer 1..10
  readonly deadlineMs?: number        // default 5000; integer 100..60000;
                                        // no-new-attempt admission deadline,
                                        // not hard response timeout
  readonly initialDelayMs?: number    // default 25; integer 1..1000
  readonly maxDelayMs?: number        // default min(1000, deadlineMs);
                                        // >= initialDelayMs, <= deadlineMs
}

interface ReadModelPollingConfig {
  readonly intervalMs: number          // required; integer 250..3600000
  readonly maxBackoffMs?: number       // default max(intervalMs,
                                        //   min(60000, intervalMs*16));
                                        // integer interval..3600000
}

interface ReadModelSynchronizationConfig {
  readonly mode?: ReadModelSynchronizationMode // default 'manual'
  readonly retry?: ReadModelRetryConfig
  readonly polling?: ReadModelPollingConfig    // required iff mode='polling'
}

interface ExtensiaConfig {
  readonly storage: { readonly driver: ReadonlyResourceDriver | FullResourceDriver }
  readonly readModel?: {
    readonly loading?: 'greedy' | 'lazy'
    readonly synchronization?: ReadModelSynchronizationConfig
  }
}

interface ReadModelRefreshOptions { readonly signal?: AbortSignal }
interface ReadModelRefreshSuccess {
  readonly observed: true
  readonly changed: boolean
}
interface ReadModelRefreshExhaustedError
  extends ExtensiaError<'READ_MODEL_REFRESH_EXHAUSTED'> {
  readonly reason: 'attempts' | 'deadline'
  readonly last_failure:
    | 'storage-lock' | 'storage-unavailable' | 'storage-read'
    | 'coordinator-conflict'
}

interface QueryFacade {
  refresh(options?: ReadModelRefreshOptions): Promise<ExtensiaResult<
    ReadModelRefreshSuccess,
    | ExtensiaError<'MODULE_NOT_READY'>
    | ExtensiaError<'READ_MODEL_REFRESH_UNAVAILABLE'>
    | ExtensiaError<'READ_MODEL_REFRESH_OPTIONS_INVALID'>
    | ExtensiaError<'READ_MODEL_REFRESH_CANCELED'>
    | ReadModelRefreshExhaustedError
    | ExtensiaError<'STORAGE_INTEGRITY_FAILED'>
  >>
}
```

Descriptor-safe config accepts only listed own data properties. Defaults are evaluated after `deadlineMs`/`intervalMs`: effective `initialDelayMs <= maxDelayMs <= deadlineMs`, and effective `intervalMs <= maxBackoffMs <= 3600000`. Accessors, arrays, unknown keys, invalid combinations/ranges/cross-field order or `polling` outside polling mode produce `CONFIG_INVALID` before driver open. Existing config without synchronization defaults to manual and preserves no-background behavior; a legacy driver without observation capability remains exactly `static-unsupported`.

`refresh(options)` uses a separate descriptor-safe public boundary. `undefined` is accepted. Otherwise `options` must be a non-null non-array record with prototype `Object.prototype` or `null`, no own string/symbol keys except one optional own data property `signal`, and no accessor invocation. `signal` may be `undefined` or must pass the runtime platform's intrinsic `AbortSignal` brand check; duck-typed/fake signals are rejected. Invalid record/prototype/key/descriptor/value returns `READ_MODEL_REFRESH_OPTIONS_INVALID` without throwing or performing storage/waiter work. Cross-realm signals are accepted only when the host intrinsic brand check recognizes them; this is a platform boundary, not duck typing.

`refresh()` success means published generation was coherent through a head captured after this caller's admission. It does not promise no later external commit at return. `changed` describes only whether the successful refresh publication changed query-visible read-model content versus the coordinator base used by its successful attempt; cursor/inspection-only advancement, an own entry already represented by local publication, an external effect already subsumed by a coherent lazy observation, and at-head observation all return `changed=false`. It never exposes whether cursor metadata moved and is not a claim of global current forever. Cursor/head/actor/resource IDs/storage path/raw timings are not public results.

### 10.1. Exact stale boundary

- Local committed change is visible in the calling process before command success by the accepted synchronous local-publication rule.
- External state may become newer immediately after startup/refresh observation capture. Query success remains complete for its generation scope, but never claims latest-across-processes.
- In `manual` mode external stale duration is intentionally unbounded until application calls `refresh()` successfully or restarts. No hidden timer exists.
- In `polling` mode `intervalMs` is trigger cadence, not maximum stale SLA. Contention, retry exhaustion, event-loop blocking або integrity fail-close can extend or terminate observation; inspection exposes last observed time/failure instead of false freshness.
- A successful refresh provides an `observed-through` linearization point only. Public API does not expose cursor/head for application-side ordering or fencing.

Safe additive inspection:

```ts
interface SafeSynchronizationInspection {
  readonly mode: 'manual' | 'polling'
  readonly state:
    | 'not-started' | 'starting' | 'unsupported'
    | 'idle' | 'refreshing' | 'backoff'
    | 'degraded' | 'stopping' | 'stopped' | 'failed'
  readonly freshness: 'startup' | 'observed' | 'unknown' | 'failed'
  readonly last_observed_at: Timestamp | null
  readonly last_failure:
    | null | 'storage-lock' | 'storage-unavailable' | 'storage-read'
    | 'coordinator-conflict' | 'retry-exhausted' | 'capability'
    | 'integrity'
}

interface ReadModelInspection {
  readonly loading: 'greedy' | 'lazy'
  readonly lifecycle:
    | 'not-started' | 'building' | 'ready'
    | 'stopping' | 'failed' | 'stopped'
  readonly coverage: 'none' | 'selective' | 'complete'
  readonly synchronization: SafeSynchronizationInspection
}
```

The exact additive public path is `inspect().read_model.synchronization`; no sibling inspection endpoint or facade is introduced. `created` maps to `not-started/unknown`; supported startup maps to `starting/unknown`; supported ready exposes the actor's exact idle/refreshing/backoff/degraded state and honest observed/unknown/failed freshness; legacy manual ready maps to `unsupported/startup`; stopping retains last honest freshness while state is `stopping`; stopped clears timestamp/failure and maps to `stopped/unknown`; failed maps to `failed`, with sync freshness/failure retained only when synchronization caused it. Inspection exposes no cursor/head/generation ID, raw error, PID, path, operation/actor/resource ID or credentials.

`last_observed_at` is the safe wall-clock timestamp of the latest successfully published startup/refresh authority observation; local publication never changes it. `freshness='observed'` means only that such an observed-through point exists, not that it is current now. `unknown` means no supported observation has succeeded or runtime has positive knowledge that cursor is behind (the local sequence-jump case).

| Supported transition | Exact inspection after transition |
|---|---|
| normalized/created | configured `mode`; `not-started/unknown/null/null`. |
| supported startup admitted | `starting/unknown/null/null`; retry backoff remains `starting`, with transient category in `last_failure`. |
| startup success | `idle/observed/<publication timestamp>/null`. |
| startup exhaustion/integrity/capability terminal | module fails before facade publication; `failed/failed/null/<retry-exhausted, integrity or capability>` in module inspection diagnostics. |
| explicit/poll observation active | `refreshing`; retain prior honest freshness/timestamp; clear terminal `retry-exhausted` only when a new chain is admitted, then expose current transient/conflict category if one occurs. |
| retry delay | `backoff`; retain freshness/timestamp; `last_failure` is exact safe transient or `coordinator-conflict`. |
| local exact-next publication | state/freshness/timestamp/failure unchanged; cursor move is private. |
| local sequence jump, manual | from healthy idle: `idle/unknown/<retained last timestamp>/null`; a pre-existing `degraded` state/failure remains degraded while freshness becomes unknown. No chain/timer/session. |
| local sequence jump, polling | `refreshing/unknown/<retained last timestamp>/null` once the coalesced chain is admitted. |
| explicit or background exhaustion | `degraded/<retained observed or unknown>/<retained timestamp>/retry-exhausted`. Public explicit caller also receives typed exhaustion with its reason/category. |
| successful refresh, including at-head/cursor-only | `idle/observed/<new publication timestamp>/null`; trailing epoch keeps `refreshing` until it settles. |
| caller pre-abort or waiter cancellation | no actor inspection transition caused by the caller; admitted lifecycle-owned chain continues unchanged. |
| integrity fail-close | `failed/failed/<retained timestamp>/integrity`; intake closes. |
| stop admitted / cleanup complete | `stopping` with honest values retained / then `stopped/unknown/null/null`. |

## 11. Retry, deadline, cancellation and polling

### 11.1. Ownership

- Supported startup observation, explicit refresh and background refresh use the same runtime-managed bounded retry engine because observation is read-only/idempotent before publication. Startup owns a separate chain inside the existing non-cancelable public `starting` transition, uses the validated synchronization `retry` values, and has no public waiter.
- Public writes remain caller-managed on returned `STORAGE_LOCK_FAILED`; one command execution performs no blind storage-session reacquire loop. Returned lock failure occurs before staging/commit. Caller retry is a new command against fresh state.
- After staging/commit starts, ordinary retry is forbidden. Existing ambiguous COMMIT reconciliation is a separate outcome-definite safety protocol; it may suspend settlement and is not limited/canceled by refresh retry deadline.
- Lazy point/closure observations may reuse the same bounded read retry component but never convert exhausted observation to missing/partial success.

### 11.2. Attempt algorithm

For attempt index `i` starting at 1:

Each bounded epoch becomes `active` exactly when the scheduler promotes it from absent/trailing state, immediately before its first attempt-admission check. At that transition it captures one shared `attempt_admission_deadline_monotonic_ms = monotonicNow + deadlineMs` and resets attempts to zero. Time spent queued behind an older active epoch is excluded; the trailing epoch receives a fresh full budget only after promotion. All callers/ticks in the closed cohort share that chain origin/deadline, while per-caller cancellation changes no budget. Startup captures its origin when the startup observation chain becomes active after open/recovery.

1. Check lifecycle-owned chain cancellation and attempt-admission deadline before starting. No new driver observation or CAS re-observation may start after the monotonic deadline. Per-caller signals are waiter concerns and are never passed into the shared chain.
2. Pass remaining admission budget to change-observation adapter. `local-sqlite-v1` configures each SQLite busy wait with `min(profile timeout, remaining budget)`, але accepted evidence shows SQLite/OS settlement may overshoot configured timeout. Cancellation cannot interrupt an already executing synchronous SQLite call and takes effect immediately after it returns.
3. Retry `storage-lock`, `storage-unavailable`, `storage-read` and coordinator revision/cursor conflict while attempts and admission deadline remain. Conflict consumes one completed attempt because the authority observation was performed but could not publish against its captured base.
4. Backoff cap = `min(maxDelayMs, initialDelayMs * 2^(i-1), remaining deadline)`.
5. Equal jitter delay = `ceil(cap/2) + U[0, floor(cap/2)]`, generated per runtime and injectable for deterministic tests. No delay after final attempt.
6. Integrity/capability/config failure is never retried. Caller cancellation returns canceled for that waiter; it never rolls back a shared refresh or published generation.
7. After a failed/conflicted attempt or backoff wake, exhaustion reason has exact precedence: if monotonic `now >= admission deadline`, return `reason='deadline'` even when the same attempt also reached `maxAttempts`; otherwise, if attempts used `>= maxAttempts`, return `reason='attempts'`. Raw SQLite/error text is diagnostic-private.

`deadlineMs` is an admission/no-new-attempt budget, not a hard wall-clock response timeout. A final already-admitted synchronous driver call may settle after the deadline by profile/OS/event-loop overshoot; no later attempt starts. Public documentation and inspection must state this, and P5-STAB records configured timeout versus actual overshoot. A hard cancelable response deadline would require a separately accepted async/worker/profile mechanism and is not claimed here.

Concurrent triggers share one lifecycle-owned scheduler with at most one storage observation attempt in flight and one coalesced trailing admission epoch. Immediately before invoking the first observation adapter attempt of a bounded chain, the scheduler closes that chain's admission cohort; adapter snapshot/head capture necessarily occurs inside and after that invocation. Only waiters/ticks admitted before the invocation boundary may consume the chain's eventual success or exhaustion; later retry attempts remain owned by the closed cohort. A trigger admitted after invocation is conservatively attached to the trailing epoch even when the async adapter Promise has not resolved or its internal capture time is unknown. After the current chain settles, that epoch starts a fresh bounded chain with new attempt/deadline accounting. A newly admitted refresh call never consumes an observation whose adapter invocation already linearized before that call's admission; wall-clock guesses and adapter-private capture callbacks are unnecessary and forbidden.

Thus an adapter invoked for caller A may capture `H`; if caller B is admitted any time after that invocation (including before the Promise resolves), B can never consume A's publication through `H` and waits for the trailing observation. Integrity fail-close or lifecycle stop suppresses trailing work and settles it through the corresponding terminal lifecycle result; an ordinary exhaustion of the earlier epoch does not consume or cancel a queued later epoch.

The scheduler owns one lifecycle `AbortSignal`; polling has no waiter. Each explicit caller owns a separate waiter signal:

- public pre-admission precedence is exact: (1) module lifecycle/refresh intake not ready or closed -> `MODULE_NOT_READY`; else (2) `static-unsupported` capability branch -> `READ_MODEL_REFRESH_UNAVAILABLE`; else (3) descriptor-safe options validation -> `READ_MODEL_REFRESH_OPTIONS_INVALID`; else (4) genuine supplied signal already aborted -> `READ_MODEL_REFRESH_CANCELED`; else admit waiter/epoch. Thus cancellation/options errors never mask invalid lifecycle or unsupported capability;
- a pre-aborted caller on a ready synchronized runtime returns `READ_MODEL_REFRESH_CANCELED` without admitting a waiter or starting/requesting a chain;
- after admission, first linearized event wins: chain settlement already published/failed returns that result; earlier waiter abort returns `READ_MODEL_REFRESH_CANCELED` only to that caller;
- waiter cancellation never cancels the chain, even when it was the sole waiter. The lifecycle-owned chain continues and may publish, preventing cancellation churn from controlling background correctness work;
- after-admission cancellation likewise never removes an already queued trailing epoch; only that waiter returns canceled, while the lifecycle-owned observation still runs;
- lifecycle stop cancels the chain. Admitted waiters whose result has not already linearized settle `READ_MODEL_REFRESH_CANCELED` after chain cleanup; calls after refresh-intake close return `MODULE_NOT_READY` and never join the chain.

An admitted waiter registers exactly one abort listener without passing its signal to or transferring ownership of the shared chain. A single linearization guard removes that listener on caller abort, chain success/failure/exhaustion, lifecycle-chain cancellation or stop cleanup before releasing the waiter closure. Pre-aborted/invalid/unavailable/not-ready calls register none. A late abort after settlement is a no-op and cannot retain or re-enter runtime state.

These rules make caller cancellation, stop and post-intake rejection disjoint and deterministic.

### 11.3. Polling

- One timer, at most one storage observation attempt, and at most one coalesced trailing admission epoch per process. Epochs execute serially; there are never duplicate observation sessions.
- First refresh is requested immediately after ready.
- After success, next delay = `intervalMs + U[0, floor(intervalMs/4)]`; configured interval is a minimum cadence, not SLA.
- A transient chain exhausts terminally, records `degraded`, then a new independent poll trigger occurs after equal jitter `ceil(maxBackoffMs/2) + U[0, floor(maxBackoffMs/2)]`; actual delay is therefore never greater than the configured `maxBackoffMs`. There is no silently pending infinite request.
- Explicit call/poll tick coalesce. Backoff holds no storage session/coordinator lock.
- Notification, if later implemented, only requests the same coalesced refresh and may be lost without violating correctness because manual/polling remain owners.

## 12. Lock, session and fairness policy

1. Lock order: local logical locks → storage session for writes; observation storage snapshot without publication lock; short publication CAS only after observation. No refresh coordinator → storage wait cycle.
2. Write session remains held through semantic commit and synchronous local publication, then releases via existing cleanup.
3. Refresh session contains only coherent journal/metadata observation. No backoff, user callback, generation build or timer inside session.
4. Delta threshold 256 entries/Resources prevents arbitrarily large incremental materialization; larger gap uses one complete rebuild observation. This limits algorithm shape, not wall-clock time.
5. Readonly zero-write and full/readonly semantic symmetry are mandatory. Generic list polling is not an adapter.
6. SQLite busy timeout is per-attempt blocking mechanism, not retry/fairness/SLA. Runtime admission deadline includes multiple attempts; configured adapter timeout cannot exceed remaining budget, але actual synchronous settlement may overshoot and is measured, not hidden.
7. No starvation-free claim. Required indicators: per-class acquisition attempts, wait duration, session duration, consecutive exhausted chains, writer/read observer outcomes and event-loop delay. Safe output aggregates counts/durations without IDs/paths.
8. P5-STAB must exercise asymmetric writers, writer+poller, synchronized poll herd and long-session cases. Failure to prove acceptable behavior narrows support to designated-writer `full/readonly`; it does not justify leader-election workaround.

## 13. Failure matrix

| Condition | Generation/cursor | Caller/background result | Lifecycle |
|---|---|---|---|
| at head | unchanged; observation metadata updated | success `changed=false` | ready/idle |
| query-visible delta/rebuild success | atomic next generation + head; query-visible content differs from successful-attempt base | success `changed=true` | ready/idle |
| cursor/inspection-only success (at-head, own effect already local, external effect already subsumed) | cursor/head may advance atomically; query-visible content equal | success `changed=false` | ready/idle |
| late caller/tick after current first adapter invocation | current attempt unchanged; one trailing epoch queued, regardless of Promise/capture visibility | late waiter cannot consume earlier chain result; later bounded chain owns its result | ready/refreshing |
| busy/lock/unavailable/read transient | unchanged | retry, then exhausted typed result | ready; background may be degraded |
| supported startup lock/unavailable/read transient | no coordinator/facade published | bounded retry; exhaustion returns existing `START_FAILED` plus safe `READ_MODEL_STARTUP_OBSERVATION_EXHAUSTED` diagnostic | rollback opened resources, failed |
| supported startup integrity/capability failure | no coordinator/facade published | no retry; existing `START_FAILED` with safe integrity/capability diagnostic | rollback opened resources, failed |
| concurrent public stop/start during supported startup observation | no coordinator/facade published before startup success | existing `MODULE_BUSY`; startup chain is not canceled | remains `starting`, then ready on success or rollback/failed on terminal start failure |
| coordinator revision/cursor conflict after observation | unchanged | discard/re-observe, then exhausted with `coordinator-conflict` if budget ends | ready; no stale overwrite |
| explicit caller cancellation | unchanged unless shared chain later succeeds | canceled for caller | runtime remains ready |
| lifecycle stop during chain/backoff | no new publish after stop boundary | admitted unresolved waiters settle `READ_MODEL_REFRESH_CANCELED` after chain cleanup | drain then stopped |
| call after refresh-intake close | unchanged | `MODULE_NOT_READY`; no chain admission | stopping/stopped |
| pre-aborted call on ready `static-unsupported` | unchanged | `READ_MODEL_REFRESH_UNAVAILABLE`; capability gate precedes signal | ready/unsupported |
| invalid/accessor/fake-signal options on ready synchronized branch | unchanged | `READ_MODEL_REFRESH_OPTIONS_INVALID`; no getter/listener/epoch/storage work | ready/idle |
| pre-aborted call on ready synchronized branch | unchanged | `READ_MODEL_REFRESH_CANCELED`; no waiter/epoch | ready/idle |
| gap/duplicate/regression/ahead/malformed entry | unchanged | integrity failure | close refresh/write/read intake, unpublish facades, failed |
| projection/domain/storage integrity failure | unchanged | integrity failure | fail-close |
| local commit, publication succeeds | changed-key generation; cursor exact-next only | committed success | ready |
| local commit, publication unexpectedly fails | storage committed; cursor not falsely advanced | committed warning | fail-close per accepted contract |
| ambiguous commit reconciliation unavailable | no false reject/retry | settlement may remain pending | stop drain may wait; existing safety contract preserved |

Background integrity needs one internal `RuntimeFaultSink` to atomically close refresh/operation/read intake, unpublish facades and begin cleanup. It is internal-versioned-by-task and exposes no raw lifecycle controller/public handle.

## 14. Lifecycle and concurrency

### Start

- Validate config/capabilities before side effects.
- Open driver, recover if full, then for a supported seam run the lifecycle-owned bounded startup observation chain, build generation, initialize synchronized coordinator, and only then publish ready/facades. A transient exhaustion never publishes ready; integrity/capability fails without retry. Existing public lifecycle serialization remains authoritative: concurrent stop/start returns `MODULE_BUSY`, does not cancel the startup chain, and terminal start failure performs normal rollback/close.
- For legacy manual capability absence, build the P5-DG1 startup generation and publish only `static-unsupported`; cursor/head/sync actor are absent. Legacy greedy and lazy modes follow this same tagged branch.
- Polling capability absence or incoherent readonly seam fails start. Manual mode with legacy driver may start as `unsupported` and returns refresh-unavailable.

### Concurrent refresh

- Admission-epoch single-flight/coalescing. One attempt executes at a time; scheduler closes the cohort immediately before the chain's first adapter invocation, and post-invocation triggers coalesce into one serialized trailing epoch with a fresh bounded chain. Base revision/cursor is captured per attempt.
- Individual caller cancellation detaches only that waiter and never cancels the lifecycle-owned chain, including the sole-waiter case.
- CAS conflict consumes retry/deadline budget and re-observes; it never publishes older data.

### Stop/drain

1. Unpublish facade/read/refresh intake and reject new calls.
2. Cancel polling timer/backoff and lifecycle-cancel the shared refresh chain.
3. Admitted unresolved refresh waiters settle canceled only after chain cleanup; drain admitted refresh and foreground operations. Do not force-cancel staging/commit or ambiguous settlement.
4. Close driver only after observation iterator/session and writes release.
5. Clear coordinator generation/cursor/diagnostics and enter stopped.

No timer, notification callback, retry promise, caller AbortSignal listener/waiter closure or DB iterator may survive stop. Current facade-operation drain alone is insufficient; sync actor has explicit intake/drain ownership inside Core lifecycle.

## 15. Verification and evidence plan

### Deterministic model/scenario tests

- Cursor: null/head/exact-next, own/external, gap, duplicate sequence/op ID, regression, ahead, malformed arbitrary-length values, replay after failure; cursor-only own-entry and already-subsumed external advancement return `changed=false`, ordinary query-visible delta returns `changed=true`.
- Coordinator: observe/local/lazy interleavings with barriers at admission, adapter invocation, observation capture, Promise resolution, durable commit and before publication; no stale overwrite/deadlock. Mandatory async success barrier: invoke A, adapter captures `H`, externally commit `H+1`, admit B before A's Promise resolves, then publish A through `H`; B must wait for a later observation through at least `H+1` (or terminate through integrity/lifecycle failure), never consume A's success. Mandatory failed-attempt barrier: after A's first adapter invocation, admit B, make A retry/exhaust; B remains in the trailing epoch, inherits none of A's attempts/deadline/result, and starts a fresh chain/budget after A's terminal settlement unless stop/integrity fail-close suppresses it.
- Delta/rebuild threshold at 255/256/257 entries and affected Resources; property equivalence against full-scan oracle.
- Config/retry/options/inspection: min/max/default/cross-field boundaries including `deadlineMs=100` with omitted `maxDelayMs`, `intervalMs>60000` with omitted `maxBackoffMs`, actual polling exhaustion delay at jitter extrema never above `maxBackoffMs`, attempts-vs-deadline simultaneous exhaustion precedence, coordinator-conflict exhaustion and no retry integrity; lifecycle -> capability -> descriptor-safe options -> pre-aborted gate cross-product with null/array/prototype/unknown string+symbol/accessor/fake/native signal cases and no getter/admission; waiter-vs-chain first-event linearization, sole/multiple waiter cancellation, listener removal on every terminal path, late abort no-op/no retained closure, lifecycle stop during backoff/busy return, post-intake `MODULE_NOT_READY`, no new attempt after deadline and measured final-call overshoot; fake-monotonic tests prove active-epoch origin, shared cohort deadline, queued time exclusion and fresh trailing deadline; exact `inspect().read_model.synchronization` snapshots through created/starting/startup success/failure, manual and polling local gap, transient/backoff, explicit/background exhaustion, cancellation, later recovery, integrity, static-unsupported, stopping and stopped.
- Lifecycle: supported startup transient success/exhaustion/integrity/capability plus concurrent stop/start `MODULE_BUSY`, with no premature ready and complete terminal-failure cleanup; legacy greedy/lazy `static-unsupported` startup with no cursor or observation call; startup commit-after-capture, immediate poll, concurrent refresh, manual local-gap with no background work, polling local-gap coalescing, integrity fail-close, drain order, no timer/session leak.

### Two-process concrete gates

- `full/full` and `full/readonly` with exact current profile/environment manifest.
- External create/update/move/delete/Marks/KV/Asset operations; journal distance `0/1/32/256/257`, mixed affected aggregates and restart.
- Long writer session, reader observation, asymmetric writers, simultaneous writes, pollers with injected phase alignment, retry exhaustion and recovery.
- Readonly before/after byte/hash/mtime zero-write proof.
- At every successful refresh: process-local generation equals fresh authority oracle through captured head; no gaps/duplicates and detached snapshots.

### Characterization, not SLA

Publish raw samples for session duration, lock wait, retries, catch-up/rebuild time, event-loop delay, memory and stale-observation age with exact dataset/environment/repetition. No p95 budget or cross-platform support claim before P5-STAB owner decision.

### Package/architecture gates

- Fake/concrete same internal ports; no raw session/cursor public export, second journal, index-as-truth, test-only architecture or hidden readonly write.
- `npm run check`, deterministic package/tarball smoke and two fresh-process consumer scenario.
- Safe diagnostics privacy, local Markdown links, UTF-8/language gate and canonical-memory consistency.

## 16. Exact downstream task map

No package is created or activated by P5-DG2. After whole-task and required FIX approval/application, prepare each package only by explicit owner decision.

| Wave | Contract and deliverable | Dependencies | Acceptance/evidence gate |
|---|---|---|---|
| `P5-WP1` | Materialize one `ReadModelGeneration`, coverage, changed-key publication coordinator, P5-DG1 metadata observation port, P5-DG2 committed-change port, RuntimeFaultSink contract and deterministic fake seams; greedy baseline only. | applied P5-DG1 + P5-DG2 | Source-only seams first, then same production composition; generation/cursor atomic tests; O(N)-per-write rejected; no public refresh/config yet. |
| `P5-HARD1` | Implement internal single-flight synchronization actor, bounded retry/attempt-admission deadline/equal-jitter, coordinator-conflict accounting, RuntimeFaultSink, stop/intake/drain and ambiguous-commit carve-out over deterministic fake adapters. | `P5-WP1` | Fault injection, shared-caller cancellation, no-new-attempt deadline + overshoot tests, stop/backoff/CAS barriers, no public exposure and no infinite/tight retry. |
| `P5-VS1` | Implement lazy coverage and expose exact experimental `query.refresh()`, synchronization config and safe inspection over the already hardened fake/full/readonly semantic runtime; complete-only reads. | `P5-HARD1` | Public/type/config snapshots include retry/exhaustion/conflict semantics; point/tree/global completeness; refresh matrices; legacy manual unsupported boundary; package smoke. |
| `P5-VS2` | Implement concrete `local-sqlite-v1` coherent full/readonly change observation, remaining-budget busy timeout, volatile cursor, delta/rebuild and opt-in polling; two-process external synchronization and contention diagnostics. | `P5-VS1`, accepted P5-RS1 | `full/full` + `full/readonly` create/update/move/delete/Asset/Mark matrices, 0/1/32/256/257 distances, restart, timeout overshoot, writer/poller/herd, zero-write readonly, no raw seam. |
| `P5-STAB` | Phase-wide correctness/package/process/performance stabilization and truthful topology decision. | `P5-WP1`, `P5-HARD1`, `P5-VS1`, `P5-VS2` | Full package gate, reproducible pack, cross-process raw evidence, architecture pressure, support narrowed if fairness/load evidence insufficient. |
| `P5-AUD1` | Independent Phase 5 audit and phase-gate recommendation. | accepted `P5-STAB` result | Independent re-run/review, no open P0–P3, explicit supported/unsupported matrix and human Phase 5 gate. |

Default activation is sequential: `P5-WP1 -> P5-HARD1 -> P5-VS1 -> P5-VS2 -> P5-STAB -> P5-AUD1 -> human gate`. Public refresh/config is not exposed until the internal retry/single-flight/lifecycle contract is implemented by P5-HARD1. Task-level parallelism is not recommended because HARD1/VS1/VS2 share coordinator/lifecycle/error surfaces; read-only audit preparation may overlap only after implementation content freezes. Approval of this design activates none of them.

## 17. Rejected/deferred alternatives

- Actor-specific cursors or own-entry skip: rejected; creates gaps and split order authority.
- Timestamp/PID merge: rejected; commit sequence can disagree with pre-wait timestamps and PID is not fencing.
- Reset cursor to head after gap/ahead: rejected; hides integrity loss.
- Partial journal batch with latest metadata snapshot: rejected; later changes can make relation projections time-skewed because historical aggregate state is unavailable.
- Poll every query або refresh-on-command-success: rejected; accidental load/latency and command-dependent freshness.
- Runtime automatic write retry after session/staging: rejected; can violate outcome/idempotency and hide contention.
- Public cursor/head/generation IDs: rejected; exposes internal authority and invites invalid freshness comparisons.
- Runtime leader election: rejected; availability/fencing subsystem outside in-process V1.
- Retention/compaction, durable checkpoint, historical replay, notification implementation, direct external mutation reconcile and hard SLA: deferred.

## 18. Architecture pressure and residual risks

- Current local SQLite synchronous exclusive sessions can block event loop and readers; no wording can create fairness. Stabilization may narrow symmetric `full/full` support.
- Full journal validation and full rebuild remain O(distance + storage) without retention/checkpoint. Threshold prevents incoherent partial application but not long catch-up.
- One coordinator is a real shared runtime primitive; separate facade-local refresh, write-local index or readonly-specific cache would create competing truth.
- Generic legacy drivers may remain static-only. Claiming refresh without atomic metadata+head observation is forbidden.
- Per-caller cancellation cannot interrupt an in-progress `DatabaseSync` call; configured adapter timeout bounds the requested busy wait but may overshoot in SQLite/OS settlement. Documentation must distinguish admission deadline/cancellation latency from a hard response timeout.
- Ambiguous COMMIT safety can suspend drain; refresh retry deadline must not weaken this pre-existing truth contract.
- Public additions remain experimental; P7 may rename/freeze only with implementation evidence and migration review.

## 19. Memory impact

Required canonical proposal:

- create technical contract and ADR-0015;
- reconcile accepted P5-DG1 `readModel` config envelope and `inspect().read_model` type with additive synchronization config/inspection;
- update architecture, rules, public read compatibility, open questions, roadmap and technical/ADR indexes;
- synchronize Domain glossary definition of External Change Sync with total own/external sequence traversal; Domain state/invariants remain unchanged;
- preserve Product requirements and Domain current/target/rules unchanged;
- record current implementation/support boundary explicitly, without implementation claim.

Task/run/RSCH/report/index/progress/state updates are operational. Canonical changes require separate approval of `FIX-001`; downstream packages/activation require later explicit owner decisions.
