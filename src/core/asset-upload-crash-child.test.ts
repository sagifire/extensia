import { writeFileSync } from "node:fs";

import { expect, it } from "vitest";

import type { IDString } from "../domain/scalars.js";
import {
  createExtensia,
  resolveInternalAssetUploadPort,
} from "../public/extensia.js";
import { defineFullResourceDriver } from "../public/full-resource-driver.js";
import { createLocalSqliteFullResourceDriver } from "../storage/local-sqlite-resource-driver.js";

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing child-process input: ${name}`);
  }
  return value;
}

it("halts a production Asset finish at the requested SQLite cut point", async () => {
  const rootPath = required("EXTENSIA_ASSET_UPLOAD_ROOT");
  const markerPath = required("EXTENSIA_ASSET_UPLOAD_MARKER");
  const resourceId = required("EXTENSIA_ASSET_UPLOAD_RESOURCE") as IDString;
  const assetId = required("EXTENSIA_ASSET_UPLOAD_ASSET") as IDString;
  const mode = required("EXTENSIA_ASSET_UPLOAD_MODE");
  const cutPoint =
    mode === "before"
      ? "transaction.before-commit"
      : "transaction.after-commit";
  const module = createExtensia({
    storage: {
      driver: defineFullResourceDriver(
        createLocalSqliteFullResourceDriver({
          faults: {
            hit(point) {
              if (point !== cutPoint) return;
              writeFileSync(markerPath, point, "utf8");
              Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
            },
          },
          profile: "candidate-local-filesystem",
          reconciliationDelayMs: 1,
          rootPath,
          timeoutMs: 1_000,
        }),
      ),
    },
  });
  await expect(module.start()).resolves.toMatchObject({ ok: true });
  const port = resolveInternalAssetUploadPort(module);
  if (port === null) throw new Error("Asset upload port is missing");
  const handle = await port.resolve(resourceId, assetId);
  if (!handle.ok) throw new Error(handle.error.code);
  await port.finish(handle.value);
  throw new Error("Asset finish unexpectedly passed the crash cut point");
});
