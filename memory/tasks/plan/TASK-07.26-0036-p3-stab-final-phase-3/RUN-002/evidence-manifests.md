# Evidence manifests: RUN-002

## Environment and clean baseline

- Node.js: `v24.17.0`.
- npm: `11.13.0`.
- `package-lock.json` SHA-256: `9855F95C1B9BE2166CBCA3CBDE37CAB6C667E036F50343F3B289B2C3FC39680C`.
- `npm.cmd ci --no-audit --no-fund`: green, 208 packages installed.
- Git використовував per-command `safe.directory`; global config не змінювався.

## Focused fresh matrices

- Public/API/semantics: 6 files / 54 tests green (`resource-create`, `resource-update`, `resource-move`, `resource-aggregates`, `resource-delete`, root exports).
- Protocol/recovery/concurrency/integrity: 7 files / 67 tests green (`resource-write-contracts`, read runtime, lock queue, operation engine, deterministic full driver, lifecycle, facades).
- Domain/detached DTO: 4 files / 18 tests green (`resource-aggregates`, snapshots, type contracts, public aggregates).

## Full package gate

- `npm.cmd run check`: green after remediation.
- Vitest: 20 files / 202 tests green.
- Coverage: statements 89.34%, branches 84.67%, functions 96.64%, lines 90.46%.
- Typecheck, clean build, lint, format, pack dry-run, publint, ATTW and installed-tarball runtime/type consumer: green.
- Packed allowlist: 126 paths.

## Controlled package reproducibility

- Pack A SHA-256: `320D983DF618790F3F2C5CC690503FAF58C0A47591BFCCDA92F77D2A22867978`.
- Pack B SHA-256: `320D983DF618790F3F2C5CC690503FAF58C0A47591BFCCDA92F77D2A22867978`.
- Both tarballs: 126 paths; byte-identical in this environment.
- Temporary samples were removed after recording hashes.
- This does not claim cross-environment npm tar metadata compatibility.

## Findings

- `P1-PACK-TYPES`: packed consumer omitted Phase 3 move/delete public input/result/error types. Fixed by extending the existing type probe; `test:package` and full gate green after remediation.
- No production correctness defect found.
- Source scan found one Core write authority in `resource-write-runtime.ts`, one driver session boundary, prepared batch publication, and no independent journal runtime/service or deferred restore/undelete/plugin/hook/sync implementation path.

## Exact commands

```powershell
node --version
npm.cmd --version
git -c safe.directory='D:/work/nodejs projects/extensia' status --short
Get-FileHash -Algorithm SHA256 -LiteralPath 'package-lock.json'
npm.cmd ci --no-audit --no-fund

npm.cmd exec -- vitest run src/public/resource-create.test.ts src/public/resource-update.test.ts src/public/resource-move.test.ts src/public/resource-aggregates.test.ts src/public/resource-delete.test.ts src/index.test.ts
npm.cmd exec -- vitest run src/core/resource-write-contracts.test.ts src/core/resource-read-runtime.test.ts src/operations/async-lock-queue.test.ts src/operations/operation-engine.test.ts src/storage/deterministic-full-resource-driver.test.ts src/runtime/lifecycle.test.ts src/runtime/facades.test.ts
npm.cmd exec -- vitest run src/domain/resource-aggregates.test.ts src/domain/snapshots.test.ts src/domain/type-contracts.test.ts src/public/resource-aggregates.test.ts

npm.cmd run check
npm.cmd run test:package

New-Item -ItemType Directory -Path '.tmp/p3-stab-final-pack-a','.tmp/p3-stab-final-pack-b'
npm.cmd pack --pack-destination .tmp/p3-stab-final-pack-a
npm.cmd pack --pack-destination .tmp/p3-stab-final-pack-b
Get-FileHash -Algorithm SHA256 -LiteralPath '.tmp/p3-stab-final-pack-a/sagifire-extensia-0.1.0.tgz','.tmp/p3-stab-final-pack-b/sagifire-extensia-0.1.0.tgz'
(tar -tzf '.tmp/p3-stab-final-pack-a/sagifire-extensia-0.1.0.tgz' | Measure-Object).Count
(tar -tzf '.tmp/p3-stab-final-pack-b/sagifire-extensia-0.1.0.tgz' | Measure-Object).Count

rg -n 'acquireStorageSession|\.begin\(|\.stageResource\(|\.commit\(|prepare(?:Upsert|Batch|Remove)|\.publish\(' src -g '*.ts' -g '!*.test.ts'
rg -n -i 'journal-(runtime|service)|restore|undelete|hard.?delete|plugin|hook|sync' src scripts package.json
Get-Content -LiteralPath 'src/index.ts' -Raw -Encoding UTF8
git -c safe.directory='D:/work/nodejs projects/extensia' diff --check
git -c safe.directory='D:/work/nodejs projects/extensia' status --short
```

The first sandboxed double-pack attempt failed with `EPERM` against the global npm cache before producing artifacts. The same two `npm.cmd pack` commands were rerun with approved cache access and produced the recorded identical artifacts. Temporary directories were then resolved under the workspace root, verified, and removed.
