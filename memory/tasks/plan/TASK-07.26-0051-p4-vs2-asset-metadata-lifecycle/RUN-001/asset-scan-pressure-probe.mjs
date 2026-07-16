import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

const resourceCount = 32;
const assetsPerResource = 8;
const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../../../../../");
const runtimeUrl = pathToFileURL(
  join(projectRoot, "dist/composition/local-sqlite-runtime.js"),
).href;

function value(result) {
  if (!result.ok) throw new Error(`Operation failed: ${result.error.code}`);
  return result.value;
}

function storage(rootPath) {
  return {
    profile: "candidate-local-filesystem",
    reconciliationDelayMs: 1,
    rootPath,
    timeoutMs: 100,
  };
}

async function measured(action) {
  const started = performance.now();
  await action();
  return Number((performance.now() - started).toFixed(3));
}

const rootPath = mkdtempSync(join(tmpdir(), "extensia-vs2-scan-"));
try {
  const { createLocalSqliteExtensia } = await import(runtimeUrl);
  const seed = createLocalSqliteExtensia({
    mode: "full",
    storage: storage(rootPath),
  });
  value(await seed.start());
  let measuredResourceId;
  let measuredAssetId;
  for (let resourceIndex = 0; resourceIndex < resourceCount; resourceIndex++) {
    const resource = value(
      await seed
        .storage()
        .createResource({ title: `scan-resource-${resourceIndex}` }),
    ).resource;
    for (let assetIndex = 0; assetIndex < assetsPerResource; assetIndex++) {
      const asset = value(
        await seed.storage().createAsset(resource.data.id, {
          extension: "jpg",
          kind: "external",
          mime: "image/jpeg",
          role: "scan",
          type: "image",
          url: `https://example.test/${resourceIndex}/${assetIndex}.jpg`,
        }),
      ).asset;
      if (asset === null) throw new Error("Created Asset is missing");
      measuredResourceId = resource.data.id;
      measuredAssetId = asset.id;
    }
  }
  value(await seed.stop());
  if (measuredResourceId === undefined || measuredAssetId === undefined) {
    throw new Error("Probe corpus was not created");
  }

  const full = createLocalSqliteExtensia({
    mode: "full",
    storage: storage(rootPath),
  });
  const fullStartupWallMs = await measured(async () => value(await full.start()));
  const coherentUpdateWallMs = await measured(async () =>
    value(
      await full
        .storage()
        .updateAsset(measuredResourceId, measuredAssetId, { role: "measured" }),
    ),
  );
  value(await full.stop());

  const readonly = createLocalSqliteExtensia({
    mode: "readonly",
    storage: storage(rootPath),
  });
  const readonlyStartupWallMs = await measured(async () =>
    value(await readonly.start()),
  );
  value(await readonly.stop());

  console.log(
    JSON.stringify(
      {
        assets: resourceCount * assetsPerResource,
        coherent_update_wall_ms: coherentUpdateWallMs,
        full_startup_wall_ms: fullStartupWallMs,
        lock_scope:
          "coherent update scans after Operation Engine resource/Asset locks and exclusive storage-session acquisition",
        readonly_startup_wall_ms: readonlyStartupWallMs,
        resources: resourceCount,
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(rootPath, { force: true, recursive: true });
}
