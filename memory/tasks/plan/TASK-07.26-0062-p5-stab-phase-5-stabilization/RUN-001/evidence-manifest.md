# Evidence manifest: P5-STAB / RUN-001

Status: review-ready; reviewed evidence frozen
Related Task: [P5-STAB / TASK-07.26-0062](../task.md)
Related Run: [RUN-001](index.md)

## Environment and boundary

- Captured: 2026-08-23.
- Node.js: `v24.19.0`.
- npm: `11.17.0`.
- OS: Microsoft Windows NT `10.0.26200.0`, `win32 x64`.
- SQLite: `3.53.3`.
- Storage evidence root: canonical contained non-UNC/non-reparse task-workspace `.tmp` on ready fixed `D:` NTFS; profile `windows-local-ntfs-v1`; `syncBacked: false` is explicit task-run attestation because Windows has no universal sync-provider detector.
- `package-lock.json` SHA-256: `9855F95C1B9BE2166CBCA3CBDE37CAB6C667E036F50343F3B289B2C3FC39680C`.
- Dependency clean gate: `npm.cmd ci --no-audit --no-fund` — PASS, 208 packages.
- Topology boundary: exactly two cooperating same-host processes on one verified local SQLite root; no multi-host, arbitrary instance count, network/removable/sync/FUSE root, HA, leader election or direct external mutation claim.
- All timings, percentiles, memory and stale-age values are current-host characterization, not SLA.

## Exact command ledger

| Gate | Command | Status |
|---|---|---|
| Environment | `node --version` | PASS |
| Environment | `npm.cmd --version` | PASS |
| Lockfile | `Get-FileHash -Algorithm SHA256 -LiteralPath 'package-lock.json'` | PASS |
| Clean dependencies | `npm.cmd ci --no-audit --no-fund` | PASS |
| Build precondition | `npm.cmd run build` | PASS |
| Focused Phase 5 | `npm.cmd exec -- vitest run src/core/read-model-foundation.test.ts src/core/read-model-synchronization.test.ts src/core/read-model-lazy.test.ts src/core/read-model-polling.test.ts src/public/read-model-integration.test.ts src/storage/local-sqlite-resource-driver.test.ts src/composition/local-sqlite-runtime.test.ts src/runtime/lifecycle.test.ts` | PASS: 8 files / 119 tests |
| Task-local raw process/performance | `node memory/tasks/plan/TASK-07.26-0062-p5-stab-phase-5-stabilization/RUN-001/phase5-stabilization-evidence.mjs` | PASS: 3 repetitions per topology/matrix |
| Deterministic pack + installed consumers | `node memory/tasks/plan/TASK-07.26-0062-p5-stab-phase-5-stabilization/RUN-001/phase5-package-evidence.mjs` | PASS: double pack + fresh install + 1 packed process repetition |
| Full repository/package | `npm.cmd run check` | PASS: 32 files / 366 tests; coverage `86.74/81.43/92.20/88.18`; 206-file pack; publint/attw/package smoke green |
| Exclusion scan | `rg -n '\b(?:describe|it|test)\.(?:skip|only|todo)|flaky|quarantine' src scripts vitest.config.ts package.json` | PASS: `NO_EXCLUSIONS` |
| Diff whitespace | `git -c safe.directory='D:/work/nodejs projects/extensia' diff --check` | PASS |
| Task-local syntax/privacy/UTF-8/links | `node --check` for 3 scripts + strict UTF-8/JSON/privacy/relative-link validator | PASS: 12 files |

## Raw artifacts

| Artifact | Purpose | Status |
|---|---|---|
| `phase5-stabilization-evidence.mjs` | task-local raw process/performance orchestration | PASS, `node --check` |
| `phase5-stabilization-worker.mjs` | task-local production runtime worker | PASS, `node --check` |
| `process-evidence.json` | workspace-build 3-run evidence, 642+ KiB raw samples | PASS; SHA-256 `9D8F441512C88A35C18D605C25888DD35D0C67541FE1244295B6246B937501AB` |
| `phase5-package-evidence.mjs` | deterministic double-pack and installed-tarball orchestration | PASS, `node --check` |
| `package-evidence.json` | pack manifests/hashes and installed consumer result | PASS; SHA-256 `DA8AF60C0E56CAB24B1E6A81343A38354DE9100D4B2BADB0269E03875ECDF0B3` |
| `packed-process-evidence.json` | installed-tarball process matrix | PASS; SHA-256 `9907E307CEDC0D9B1E643BE30A02C32395F03E8900329F18417C62E7CF0B3D01` |

## Matrix disposition

- Full/package/double-pack: PASS; two independent 206-entry archives are byte/content/npm-manifest equal, 312,767 bytes, SHA-256 `eff88293652bedd17448686921a6871f63435704b946f1b1844e14422a3ab118`.
- Packed fresh-process greedy/lazy/manual/polling/full/readonly: PASS; fresh installed tarball imports only two public roots, rejects internal package subpaths, preserves globals/environment/listeners and repeats production process matrix.
- Two-process correctness and journal-order visibility: PASS for Resource create/update/move/delete, Mark/KV/Asset, local read-after-write, explicit/poll visibility, restart, at-head/delta/rebuild and zero-write readonly; focused 119-test gate supplies gap/regression/malformed/no-partial fail-close traceability.
- Contention/fairness/polling/long-session: characterized. Workspace simultaneous `full/full`: 27 success / 21 caller-visible lock failure; packed: 2 / 14. Workspace longer symmetric load: 177 / 15 across 192 operations, no zero-progress actor, maximum consecutive lock-failure run 3; packed: 53 / 11, maximum run 4. Correctness is preserved, але failure rate/scheduler variance не закриває support-level fairness/load risk.
- Retry/deadline: 3/3 workspace and 1/1 packed lock→lock chains terminated as `READ_MODEL_REFRESH_EXHAUSTED` around 553–557 ms, then recovered after lock release; separate 3/3 workspace and 1/1 packed lock→success chains passed. Configured `250 ms` SQLite wait had measured actual maximum `320.00 ms`, derived busy-timeout overshoot `70.00 ms`; no hard response SLA claimed.
- Event-loop/memory/catch-up/stale characterization: workspace RSS samples `52,473,856..134,320,128` bytes; raw loop drift p95 `2.02 ms`, max `11,532.63 ms`, worst worker histogram p95 `3,070.23 ms`; delta-256 `7.38/7.51/7.71 ms`, rebuild-257 `8.51/7.37/7.83 ms`; polling stale observation `2.70..3.08 ms`; aligned herd spread `0..3 ms`. Instrumentation and current host materially constrain interpretation.
- Cleanup/failed-start/cancellation/stop-during-refresh/restart: PASS. 37 workspace cleanup records and all packed records exited code 0 with zero forced kill/pending request; all post-stop resources were IPC `PipeWrap`, nine polling `Timeout` resources disappeared; all task-local storage roots were removed; two missing-root readonly startups returned `START_FAILED` without durable mutation; pre-aborted refresh returned `READ_MODEL_REFRESH_CANCELED`; stop requested during locked refresh completed after admitted synchronous work without hard-cancel claim; fresh restart passed.
- Architecture/public/export/privacy boundary: PASS, open execution findings P0–P3 `0`. One coordinator/actor/Operation Engine, driver-owned SQLite/journal authority, commit-before-index publication, readonly query-only zero-write, bounded public inspection and package exports, no blind command retry/write replay or index-as-durability truth. Accepted ambiguous-COMMIT reconciliation may wait indefinitely while only re-reading settlement state; this explicit safety-over-liveness pressure remains.
- Topology verdict recommendation: designated-writer `full/readonly` is the only Phase 5 support candidate for exactly two cooperating same-host processes on verified `windows-local-ntfs-v1`; symmetric `full/full` is unsupported because fairness/load evidence remains insufficient despite correctness; all broader topologies are unsupported. Canonical support remains unclaimed until P5-AUD1 and explicit human Phase 5 gate.

## Evidence provenance

- Fresh evidence is retained only in this RUN-001.
- Accepted TASK-0055 and TASK-0061 artifacts are contract/fixture provenance, not reused as current green verification.
- Historical reviewed artifacts are not overwritten by this run.

## Independent audit trail

- Initial verdict: `CHANGES_REQUIRED`; P0/P1/P2/P3 `0/0/1/0`; acceptance `10/10` substantively confirmed.
- P2: stale task dashboard said execution in progress and acceptance `0/10` after self-review completion.
- Remediation: dashboard synchronized while task/run remained `active/active` during audit closure.
- Audit limitation: full `npm.cmd run check` not repeated; independent 8-file/119-test, syntax, raw hash/count/privacy, pack consistency, cleanup, UTF-8/link and diff checks passed.
- Repeated verdict: `REVIEW_READY`; P0/P1/P2/P3 `0/0/0/0`; acceptance `10/10`; exact dashboard remediation confirmed, no new findings.
