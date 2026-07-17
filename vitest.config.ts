import { defineConfig } from "vitest/config";

const assetUploadCrashChild =
  process.env["EXTENSIA_ASSET_UPLOAD_CRASH_CHILD"] === "1";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["src/**/*.test.ts"],
      include: ["src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "json-summary"],
    },
    environment: "node",
    exclude: assetUploadCrashChild
      ? []
      : ["src/core/asset-upload-crash-child.test.ts"],
    include: assetUploadCrashChild
      ? ["src/core/asset-upload-crash-child.test.ts"]
      : ["src/**/*.test.ts"],
  },
});
