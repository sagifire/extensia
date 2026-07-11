# Evidence manifests RUN-001 / R1

## Environment і baseline

- Source revision: `f96827892f46fb668149edbbac8d3e4836e1c915`.
- Node.js: `v24.17.0`.
- npm: `11.13.0`.
- `package-lock.json` SHA-256 до і після verification: `9855F95C1B9BE2166CBCA3CBDE37CAB6C667E036F50343F3B289B2C3FC39680C`.
- Initial worktree: clean; activation memory, remediation source/test/package hygiene та RUN-001 artifacts є змінами цієї задачі.
- Git запускався з per-command `safe.directory`; global configuration не змінювалась.

## Implementation candidate identity

SHA-256 binary diff candidate для exact path set `.gitignore`, `sagifire-extensia-0.1.0.tgz`, `src/public/resource-create.test.ts`, `src/system-extensions/default-api/facades.ts`:

```text
68275779748821E07C430DFE28FA955257B6E0436C2B47C0B1B63B077AB70D95
```

Алгоритм: bytes з `git -c safe.directory=... diff --binary -- <exact sorted path set>` передані без текстового перекодування до Node.js `createHash('sha256')`, digest у uppercase hex. Memory/process artifacts свідомо не входять у implementation candidate digest, щоб `result.md` не створював self-reference.

## Controlled build

- `dist/**`: 112 files.
- Aggregate SHA-256 до і після окремого clean rebuild: `16C6DF06C6E2930C17DCD9553FA4B59A3E50F5708BE2A8153C3B7A3F991C03FC`.
- Aggregate algorithm: relative POSIX path sort; для кожного file uppercase SHA-256 line `HASH␠␠path`; UTF-8 без BOM, LF після кожного line; SHA-256 aggregate bytes.

## Controlled package

- Pack A SHA-256: `470AAFD46E21CD64853A197C23918DABB654171229A1DA60E48F0A6ABC26651B`.
- Pack B SHA-256: `470AAFD46E21CD64853A197C23918DABB654171229A1DA60E48F0A6ABC26651B`.
- Обидва tarballs мають 114 paths і byte-identical content у цьому environment.
- Temporary samples створено лише у `.tmp/p3-stab1-pack-a` та `.tmp/p3-stab1-pack-b`; після фіксації hashes обидві директорії видалено з перевіркою resolved path у workspace.
- Результат не оголошує npm tar metadata compatibility contract; supported package boundary задається `exports`, public declarations/runtime snapshot і installed-tarball smoke.

## Команди відтворення

```text
npm.cmd ci --no-audit --no-fund
npm.cmd run check
npm.cmd exec -- vitest run src/core/resource-write-contracts.test.ts src/operations/async-lock-queue.test.ts src/operations/operation-engine.test.ts src/storage/deterministic-full-resource-driver.test.ts src/public/resource-create.test.ts src/public/resource-update.test.ts src/index.test.ts
npm.cmd run build
git -c safe.directory=D:/work/nodejs projects/extensia diff --check
```

Package reproducibility додатково відтворюється двома `npm.cmd pack --pack-destination <isolated-workspace-dir>` після final build.
