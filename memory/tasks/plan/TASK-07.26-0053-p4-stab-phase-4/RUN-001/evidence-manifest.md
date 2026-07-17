# Evidence manifest: P4-STAB RUN-001

Related Task: [P4-STAB / TASK-07.26-0053](../task.md)
Related Run: [RUN-001](index.md)
Captured: 2026-07-17
Status: final independent audit `REVIEW_READY`; open P0–P3 `0`

## Environment

- OS/profile evidence host: Windows, `win32 x64`; C: і D: `Fixed`, `NTFS`, `Healthy`, `OK`.
- Node.js: `v24.17.0`.
- npm: `11.13.0`.
- SQLite через `node:sqlite`: `3.53.0`.
- `package-lock.json` SHA-256: `9855F95C1B9BE2166CBCA3CBDE37CAB6C667E036F50343F3B289B2C3FC39680C`.
- Starting worktree: clean до activation; evidence changes складаються лише з task artifacts і test-only stabilization evidence у трьох test files: shared fake-vs-SQLite Asset conformance, injected compound-action matrix та generalized child-process crash harness/matrix.
- Support boundary: process-crash/current-host proof для caller-attested local fixed NTFS root; destructive power-loss, universal Node/OS/filesystem support і SLA не заявляються.

## Fresh command ledger

| Gate | Exact command | Fresh result |
|---|---|---|
| Clean install | `npm.cmd ci --no-audit --no-fund` | green; 208 packages |
| Focused Phase 4 matrix | `npm.cmd test -- src/storage/local-sqlite-resource-driver.test.ts src/storage/deterministic-full-resource-driver.test.ts src/composition/local-sqlite-runtime.test.ts src/core/asset-write-runtime.test.ts src/core/asset-upload-runtime.test.ts src/core/asset-upload-crash-child.test.ts src/core/asset-upload-pressure.test.ts src/public/asset-metadata.test.ts --coverage.enabled=false` | green; 7 files / 115 tests |
| Shared Asset conformance | `npx.cmd vitest run src/composition/local-sqlite-runtime.test.ts --coverage.enabled=false --reporter=verbose -t 'Asset metadata lifecycle'` | green; same production path on fake/SQLite, 1 passed / 8 filtered |
| New compound matrix | `npx.cmd vitest run src/core/asset-upload-runtime.test.ts --coverage.enabled=false --reporter=verbose -t 'compound action cut-point matrix'` | green; 8 passed / 27 filtered |
| Replacement/delete child crashes | `npx.cmd vitest run src/core/asset-upload-runtime.test.ts --coverage.enabled=false --reporter=verbose -t 'real compound-action process crash'` | green; replacement publish, ready delete, replacement-active delete before/after COMMIT, 6 passed / 29 filtered |
| Initial child crash | `npx.cmd vitest run src/core/asset-upload-runtime.test.ts --coverage.enabled=false --reporter=verbose -t 'recovers a real child-process crash'` | green; initial publish before/after COMMIT, 2 passed / 33 filtered |
| Full repository/package | `npm.cmd run check` | green; typecheck, clean build, ESLint, Prettier, 27 files / 301 tests, coverage, dry pack, publint, ATTW ESM-only, installed-tarball consumer |
| Resource process probe | `node 'memory/tasks/plan/TASK-07.26-0050-p4-vs1-concrete-resource-durability/RUN-001/resource-parity-process-probe.mjs'` | green; 2 Resources / 6 journal rows after restart; pre-COMMIT 0/0; post-COMMIT 1/1; semantic read-back true |
| Driver cut-point probe | `node 'memory/tasks/plan/TASK-07.26-0049-p4-wp1-local-sqlite-driver/RUN-001/driver-child-cutpoint-probe.mjs'` | green; compiled full driver, pre-COMMIT Resource/journal absent, post-COMMIT Resource/journal present |
| Upload pressure | `npx.cmd vitest run src/core/asset-upload-pressure.test.ts --coverage.enabled=false --reporter=verbose` | green; 1 test and fresh measurement below |
| Asset coherent-scan pressure | `node 'memory/tasks/plan/TASK-07.26-0051-p4-vs2-asset-metadata-lifecycle/RUN-001/asset-scan-pressure-probe.mjs'` | green; 32 Resources / 256 Assets, timings below |
| Double pack | Exact commands and output in the next section | green; 158 entries each, no list differences, byte-identical |

## Final full-gate measurements

- Tests: 27 files / 301 tests.
- Coverage: statements `86.32%` (`3434/3978`), branches `81.17%` (`2367/2916`), functions `96.30%` (`652/677`), lines `87.72%` (`3266/3723`).
- Tarball: 158 entries; size `214470` bytes; unpacked `1190082` bytes.
- Pack A/B SHA-256: `076385ADFB571F2581752D83B6F26E4A196273BCCB6E4664279B5BF5E9FC9235` for both; byte equality true; temporary pack samples removed after capture.
- ATTW: ESM-only profile green for supported ESM/bundler resolutions; reported CJS dynamic-import warning is explicitly ignored by configured `esm-only` profile and does not change the ESM package contract.

### Exact double-pack ledger

Commands executed from repository root, in order:

```powershell
New-Item -ItemType Directory -Force -Path '.tmp/p4-stab-repeat-pack-a','.tmp/p4-stab-repeat-pack-b' | Select-Object -ExpandProperty FullName
npm.cmd pack --pack-destination .tmp/p4-stab-repeat-pack-a
npm.cmd pack --pack-destination .tmp/p4-stab-repeat-pack-b
$a='.tmp/p4-stab-repeat-pack-a/sagifire-extensia-0.1.0.tgz'; $b='.tmp/p4-stab-repeat-pack-b/sagifire-extensia-0.1.0.tgz'; $hashes=Get-FileHash -Algorithm SHA256 -LiteralPath $a,$b; $listA=tar -tzf $a; $listB=tar -tzf $b; [pscustomobject]@{PackAHash=$hashes[0].Hash;PackBHash=$hashes[1].Hash;PackAEntries=$listA.Count;PackBEntries=$listB.Count;ListDifferences=@(Compare-Object $listA $listB).Count;ByteEqual=([System.Linq.Enumerable]::SequenceEqual([System.IO.File]::ReadAllBytes((Resolve-Path $a)),[System.IO.File]::ReadAllBytes((Resolve-Path $b))))} | ConvertTo-Json -Compress
```

Exact observed comparison output:

```json
{"PackAHash":"076385ADFB571F2581752D83B6F26E4A196273BCCB6E4664279B5BF5E9FC9235","PackBHash":"076385ADFB571F2581752D83B6F26E4A196273BCCB6E4664279B5BF5E9FC9235","PackAEntries":158,"PackBEntries":158,"ListDifferences":0,"ByteEqual":true}
```

Cleanup command resolved both targets under repository root before removal; samples were removed only after output capture.

## Cross-Phase-4 matrix

| Contract area | Fresh evidence and disposition |
|---|---|
| Fake-vs-SQLite Resource parity | Shared production scenario covers 11 contiguous semantic commits: create/update/move/dense order/Marks/KV/delete; focused/full gates green. |
| Fake-vs-SQLite Asset parity | One shared production scenario executes external create, canonical no-change, update, primary, normalized not-found, reassign and delete on both drivers; normalized Resources, Asset changes, payload actions and eight journal rows are equal. |
| Asset metadata breadth | Internal/external metadata, lineage, primary, reassign, delete, readonly precedence, hostile input, storage-wide integrity and concurrency included in the 115-test focused matrix. |
| Initial publication | Real child process before/after `generation.publish` COMMIT plus non-vacuous injected cut-point/restart matrix; initial bytes remain unreadable before commit and exactly one finish row appears after commit. |
| Replacement publication | Real child kill before/after COMMIT and non-vacuous injected matrix verify last-ready preservation, staged generation/payload cardinality, atomic replacement and exactly one additional finish row. `BUSY/READONLY/FULL/IOERR` replacement failure matrix also green. |
| Ready/replacement delete | Real child kill before/after COMMIT plus injected matrix cover `payload.delete` and `payload.delete-and-generation.discard`: failed commit preserves visible bytes and active generation where applicable; committed delete leaves no Asset, generation or payload rows and exactly one delete journal row. |
| Receipt/publication loss | Resource and Asset after-COMMIT reconciliation, after-stage-COMMIT retry and post-commit cleanup warning paths remain outcome-definite without duplicate journal rows. |
| Cleanup/orphan visibility | Initial abort, incomplete/stale handle, replacement abort, failed stage/finish, crash/restart and delete matrix show no orphan visibility; startup digest/length/chunk/generation integrity is fail-close. |
| Readonly | Hostile write input is rejected before inspection; full/readonly filesystem digests are equal; hot rollback journal/recovery-required state fails closed without durable-byte mutation. |
| Fault/corruption/lock | Controlled `BUSY`, `READONLY`, `FULL`, `IOERR`, reconciliation `CANTOPEN`, real ACL permission denial, exclusive cross-process lock/crash release, malformed format/schema/content/journal/payload and ready-runtime corruption are covered by the focused matrix. |
| Package/public boundary | Root runtime values remain `createExtensia` and `defineFullResourceDriver`; package exports remain `.` and `./package.json`; installed consumer rejects internal subpaths and observes no path/schema/connection/session/transaction/upload handle. |

## Pressure samples

Fresh upload sample for the bounded synchronous 16 MiB maximum:

```json
{"chunk_bytes":65536,"database_growth_bytes":16859136,"event_loop_delay_ms":91.72,"finish_event_loop_delay_ms":612.1,"finish_transaction_ms":611.74,"max_chunks":256,"max_payload_bytes":16777216,"observed_external_memory_peak_delta_bytes":33816580,"replacement_database_peak_bytes":33886208,"finish_rollback_journal_peak_bytes":17103632,"stage_rollback_journal_peak_bytes":42496,"stage_transaction_ms":91.39}
```

Fresh coherent Asset scan sample:

```json
{"assets":256,"coherent_update_wall_ms":38.833,"full_startup_wall_ms":24.636,"readonly_startup_wall_ms":25.385,"resources":32}
```

Both are current-host samples, not SLA or broader certification.

## Architecture and boundary scan

- Production SQL/DDL/DML scan: physical schema/payload/journal mutations occur only in `src/storage/local-sqlite-resource-driver.ts`; Core/public code contains no SQLite layout authority.
- Transaction authority scan: Resource and Asset Core runtimes stage through the shared `ResourceWriteTransaction`; concrete and deterministic drivers implement the same protocol; no independent journal append service or payload publication path exists.
- Public surface scan: `src/index.ts` does not export local SQLite composition, upload capability/port, path, session or transaction artifacts; `package.json` has only root and package-json export entries.
- Package smoke executes the installed tarball, validates exact root values/types and rejects emitted internal subpath specifiers.
- Deferred-scope scan/review found no P5 sync/global-index, plugin/hook, filesystem-native/client-server implementation, ordinary public bytes/file API or destructive power-loss claim.

## Evidence provenance

- Fresh: every command, count, hash, timing and scan disposition in this manifest was executed in P4-STAB RUN-001 after activation.
- Inherited: predecessor task results define accepted contracts and locate reusable probes only; their historical green status is not counted as current verification.

## Independent audit trail

- Initial verdict: `NOT_REVIEW_READY`; P0 `0`, P1 `1`, P2 `1`, P3 `2`.
- P1 shared Asset parity: remediated by one fake-vs-SQLite production-path scenario with normalized semantic failure, Resource/Asset state, payload action and journal equivalence.
- P2 matrix non-vacuity/crash scope: remediated by mandatory hook-consumption assertion and six real replacement/delete child-process kills in addition to two initial publish kills.
- P3 pack provenance: remediated by the exact command/output ledger above.
- P3 lifecycle: remediated in task dashboard, progress, state and result.
- Repeated code-snapshot audit independently confirmed shared conformance 1/1, injected matrix 8/8, real child crashes 6/6 + 2/2, focused 115/115, full 301/301, exact coverage, 158-file package gate and green `git diff --check`; one P3 stale provenance wording was remediated.
- Final consistency audit confirmed the exact three-test-file evidence scope and returned `REVIEW_READY`; open P0 `0`, P1 `0`, P2 `0`, P3 `0`.
