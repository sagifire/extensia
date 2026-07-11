import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const npmCli = process.env.npm_execpath;
function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function assertNode24() {
  const major = Number.parseInt(process.versions.node.split(".")[0], 10);
  assert.ok(
    major >= 24,
    `Package smoke requires Node.js 24 or later; found ${process.version}.`,
  );
}

function runNpm(args, options) {
  assert.ok(npmCli, "Package smoke must run from an npm script.");

  return run(process.execPath, [npmCli, ...args], options);
}

assertNode24();

const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);
assert.deepEqual(Object.keys(packageJson.exports).sort(), [
  ".",
  "./package.json",
]);
assert.deepEqual(Object.keys(packageJson.exports["."]).sort(), [
  "default",
  "import",
  "types",
]);
assert.ok(
  !("require" in packageJson.exports["."]),
  "Root exports must not expose CommonJS.",
);
assert.deepEqual(packageJson.dependencies, { "@sagifire/ioc": "0.0.2" });

let tarballPath;
let consumer;

try {
  const packed = JSON.parse(runNpm(["pack", "--json"]));
  assert.equal(packed.length, 1, "npm pack must produce exactly one tarball.");
  tarballPath = join(root, packed[0].filename);
  const packageContents = packed[0].files.map((entry) => entry.path).sort();

  assert.deepEqual(packageContents, [
    "LICENSE",
    "dist/composition/diagnostics.d.ts",
    "dist/composition/diagnostics.d.ts.map",
    "dist/composition/diagnostics.js",
    "dist/composition/diagnostics.js.map",
    "dist/composition/inspection.d.ts",
    "dist/composition/inspection.d.ts.map",
    "dist/composition/inspection.js",
    "dist/composition/inspection.js.map",
    "dist/composition/root.d.ts",
    "dist/composition/root.d.ts.map",
    "dist/composition/root.js",
    "dist/composition/root.js.map",
    "dist/composition/tokens.d.ts",
    "dist/composition/tokens.d.ts.map",
    "dist/composition/tokens.js",
    "dist/composition/tokens.js.map",
    "dist/core/resource-index-write-contracts.d.ts",
    "dist/core/resource-index-write-contracts.d.ts.map",
    "dist/core/resource-index-write-contracts.js",
    "dist/core/resource-index-write-contracts.js.map",
    "dist/core/resource-index.d.ts",
    "dist/core/resource-index.d.ts.map",
    "dist/core/resource-index.js",
    "dist/core/resource-index.js.map",
    "dist/core/resource-read-runtime.d.ts",
    "dist/core/resource-read-runtime.d.ts.map",
    "dist/core/resource-read-runtime.js",
    "dist/core/resource-read-runtime.js.map",
    "dist/core/resource-write-runtime.d.ts",
    "dist/core/resource-write-runtime.d.ts.map",
    "dist/core/resource-write-runtime.js",
    "dist/core/resource-write-runtime.js.map",
    "dist/domain/json.d.ts",
    "dist/domain/json.d.ts.map",
    "dist/domain/json.js",
    "dist/domain/json.js.map",
    "dist/domain/resource-hierarchy.d.ts",
    "dist/domain/resource-hierarchy.d.ts.map",
    "dist/domain/resource-hierarchy.js",
    "dist/domain/resource-hierarchy.js.map",
    "dist/domain/scalars.d.ts",
    "dist/domain/scalars.d.ts.map",
    "dist/domain/scalars.js",
    "dist/domain/scalars.js.map",
    "dist/domain/snapshots.d.ts",
    "dist/domain/snapshots.d.ts.map",
    "dist/domain/snapshots.js",
    "dist/domain/snapshots.js.map",
    "dist/index.d.ts",
    "dist/index.d.ts.map",
    "dist/index.js",
    "dist/index.js.map",
    "dist/operations/async-lock-queue.d.ts",
    "dist/operations/async-lock-queue.d.ts.map",
    "dist/operations/async-lock-queue.js",
    "dist/operations/async-lock-queue.js.map",
    "dist/operations/operation-engine.d.ts",
    "dist/operations/operation-engine.d.ts.map",
    "dist/operations/operation-engine.js",
    "dist/operations/operation-engine.js.map",
    "dist/operations/resource-operation-contracts.d.ts",
    "dist/operations/resource-operation-contracts.d.ts.map",
    "dist/operations/resource-operation-contracts.js",
    "dist/operations/resource-operation-contracts.js.map",
    "dist/public/contracts.d.ts",
    "dist/public/contracts.d.ts.map",
    "dist/public/contracts.js",
    "dist/public/contracts.js.map",
    "dist/public/extensia.d.ts",
    "dist/public/extensia.d.ts.map",
    "dist/public/extensia.js",
    "dist/public/extensia.js.map",
    "dist/public/full-resource-driver.d.ts",
    "dist/public/full-resource-driver.d.ts.map",
    "dist/public/full-resource-driver.js",
    "dist/public/full-resource-driver.js.map",
    "dist/runtime/facades.d.ts",
    "dist/runtime/facades.d.ts.map",
    "dist/runtime/facades.js",
    "dist/runtime/facades.js.map",
    "dist/runtime/lifecycle.d.ts",
    "dist/runtime/lifecycle.d.ts.map",
    "dist/runtime/lifecycle.js",
    "dist/runtime/lifecycle.js.map",
    "dist/storage/deterministic-full-resource-driver.d.ts",
    "dist/storage/deterministic-full-resource-driver.d.ts.map",
    "dist/storage/deterministic-full-resource-driver.js",
    "dist/storage/deterministic-full-resource-driver.js.map",
    "dist/storage/full-resource-driver-adapter.d.ts",
    "dist/storage/full-resource-driver-adapter.d.ts.map",
    "dist/storage/full-resource-driver-adapter.js",
    "dist/storage/full-resource-driver-adapter.js.map",
    "dist/storage/resource-journal-integrity.d.ts",
    "dist/storage/resource-journal-integrity.d.ts.map",
    "dist/storage/resource-journal-integrity.js",
    "dist/storage/resource-journal-integrity.js.map",
    "dist/storage/resource-recovery-coordinator.d.ts",
    "dist/storage/resource-recovery-coordinator.d.ts.map",
    "dist/storage/resource-recovery-coordinator.js",
    "dist/storage/resource-recovery-coordinator.js.map",
    "dist/storage/resource-runtime-integrity.d.ts",
    "dist/storage/resource-runtime-integrity.d.ts.map",
    "dist/storage/resource-runtime-integrity.js",
    "dist/storage/resource-runtime-integrity.js.map",
    "dist/storage/resource-write-protocol.d.ts",
    "dist/storage/resource-write-protocol.d.ts.map",
    "dist/storage/resource-write-protocol.js",
    "dist/storage/resource-write-protocol.js.map",
    "dist/system-extensions/default-api/facades.d.ts",
    "dist/system-extensions/default-api/facades.d.ts.map",
    "dist/system-extensions/default-api/facades.js",
    "dist/system-extensions/default-api/facades.js.map",
    "dist/system-extensions/default-api/resource-read-port.d.ts",
    "dist/system-extensions/default-api/resource-read-port.d.ts.map",
    "dist/system-extensions/default-api/resource-read-port.js",
    "dist/system-extensions/default-api/resource-read-port.js.map",
    "dist/system-extensions/default-api/resource-write-port.d.ts",
    "dist/system-extensions/default-api/resource-write-port.d.ts.map",
    "dist/system-extensions/default-api/resource-write-port.js",
    "dist/system-extensions/default-api/resource-write-port.js.map",
    "package.json",
  ]);
  assert.ok(
    !packageContents.some(
      (file) => file.endsWith(".cjs") || file.endsWith(".cts"),
    ),
    "Packed package must not contain CommonJS output.",
  );
  assert.ok(
    !packageContents.some((file) => /journal-(?:runtime|service)/i.test(file)),
    "Package must not contain a persistence or Journal runtime implementation path.",
  );
  const publicRuntimeSource = readFileSync(
    join(root, "dist", "public", "extensia.js"),
    "utf8",
  );
  assert.ok(
    !/(?:journal-runtime|journal-service)/i.test(publicRuntimeSource),
    "Public integration must not depend on an independent Journal runtime path.",
  );

  consumer = mkdtempSync(join(tmpdir(), "extensia-package-consumer-"));
  writeFileSync(
    join(consumer, "package.json"),
    `${JSON.stringify({ name: "extensia-package-consumer", private: true, type: "module" }, null, 2)}\n`,
  );
  writeFileSync(
    join(consumer, "tsconfig.json"),
    `${JSON.stringify({ compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext", noEmit: true, strict: true, target: "ES2024" } }, null, 2)}\n`,
  );
  writeFileSync(
    join(consumer, "consumer.ts"),
    `import { createExtensia, defineFullResourceDriver } from "@sagifire/extensia";
import type {
  AssetSnapshot,
  ExtensiaConfig,
  ExtensiaError,
  ExtensiaErrorCode,
  ExtensiaInspection,
  ExtensiaModule,
  ExtensiaModuleState,
  ExtensiaResult,
  CreateResourceInput,
  UpdateResourceInput,
  FullResourceDriver,
  FullResourceDriverDefinition,
  IDString,
  JSONArray,
  JSONObject,
  JSONPrimitive,
  JSONValue,
  MarkSnapshot,
  QueryFacade,
  ReadonlyResourceDriver,
  ResourceChildRefSnapshot,
  ResourceDataSnapshot,
  ResourceKVSnapshot,
  ResourceSnapshot,
  ResourceTreeViewSnapshot,
  ResourceWriteError,
  ResourceWriteSuccess,
  ResourceWriteWarning,
  ResourceWriteWarningCode,
  SafeDiagnostic,
  StorageFacade,
  Timestamp,
} from "@sagifire/extensia";

declare const config: ExtensiaConfig;
const module: ExtensiaModule = createExtensia(config);
const state: ExtensiaModuleState = module.getState();
class TypeDriver implements ReadonlyResourceDriver {
  readonly mode = "readonly";
  async open(): Promise<void> {}
  async close(): Promise<void> {}
  async *listResources(): AsyncIterable<ResourceSnapshot> {}
}
const classDriverModule: ExtensiaModule = createExtensia({
  storage: { driver: new TypeDriver() },
});
type PublicContract = readonly [
  AssetSnapshot,
  ExtensiaError,
  ExtensiaErrorCode,
  ExtensiaInspection,
  ExtensiaResult<unknown>,
  IDString,
  JSONArray,
  JSONObject,
  JSONPrimitive,
  JSONValue,
  MarkSnapshot,
  QueryFacade,
  ReadonlyResourceDriver,
  ResourceChildRefSnapshot,
  ResourceDataSnapshot,
  ResourceKVSnapshot,
  ResourceSnapshot,
  ResourceTreeViewSnapshot,
  SafeDiagnostic,
  StorageFacade,
  Timestamp,
  CreateResourceInput,
  UpdateResourceInput,
  FullResourceDriver,
  FullResourceDriverDefinition,
  ResourceWriteError,
  ResourceWriteSuccess,
  ResourceWriteWarning,
  ResourceWriteWarningCode,
];
void defineFullResourceDriver;
void state;
void classDriverModule;
export type { PublicContract };
`,
  );

  runNpm(
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      tarballPath,
      "typescript@6.0.3",
      "@types/node@24.12.0",
    ],
    { cwd: consumer },
  );
  const rootImportProbe = `
    import assert from "node:assert/strict";

    const globalKeys = Reflect.ownKeys(globalThis);
    const environment = { ...process.env };
    const listeners = process.eventNames().map((name) => [name, process.listenerCount(name)]);
    const namespace = await import("@sagifire/extensia");

    assert.deepEqual(Object.keys(namespace), ["createExtensia", "defineFullResourceDriver"]);
    assert.equal(typeof namespace.createExtensia, "function");
    assert.equal(typeof namespace.defineFullResourceDriver, "function");
    assert.deepEqual(Reflect.ownKeys(globalThis), globalKeys);
    assert.deepEqual({ ...process.env }, environment);
    assert.deepEqual(
      process.eventNames().map((name) => [name, process.listenerCount(name)]),
      listeners,
    );

    const id = "550e8400-e29b-41d4-a716-446655440000";
    const events = [];
    const snapshot = {
      assets: [],
      data: {
        created_at: 1_784_294_400_000,
        description: null,
        hidden: false,
        id,
        is_deleted: false,
        locked: false,
        order_index: 0,
        parent_id: null,
        title: "packed consumer",
        updated_at: 1_784_294_400_000,
      },
      kv: {},
      marks: [],
    };
    class Driver {
      mode = "readonly";
      async open() { events.push("open"); }
      async close() { events.push("close"); }
      async *listResources() { events.push("scan"); yield snapshot; }
    }
    const driver = new Driver();
    const extensia = namespace.createExtensia({ storage: { driver } });
    assert.deepEqual(await extensia.start(), { ok: true, value: undefined });
    assert.deepEqual(await extensia.query().getResource(id), {
      ok: true,
      value: snapshot,
    });
    const uninspectable = new Proxy({}, {
      get() { throw new Error("readonly input was inspected"); },
      ownKeys() { throw new Error("readonly input was inspected"); },
    });
    assert.equal(
      (await extensia.storage().createResource(uninspectable)).error.code,
      "STORAGE_READONLY",
    );
    const staleQuery = extensia.query();
    assert.deepEqual(await extensia.stop(), { ok: true, value: undefined });
    assert.equal((await staleQuery.getResource(id)).error.code, "MODULE_NOT_READY");
    assert.deepEqual(events, ["open", "scan", "close"]);

    const mutableDriver = new Driver();
    const invalid = namespace.createExtensia({
      storage: { driver: mutableDriver },
    });
    mutableDriver.mode = "full";
    assert.equal((await invalid.start()).error.code, "CONFIG_INVALID");
  `;
  run(process.execPath, ["--input-type=module", "--eval", rootImportProbe], {
    cwd: consumer,
    timeout: 5_000,
  });
  run(
    process.execPath,
    [
      join(consumer, "node_modules", "typescript", "bin", "tsc"),
      "--project",
      "tsconfig.json",
    ],
    { cwd: consumer },
  );
  const emittedJavaScript = packageContents.filter(
    (file) => file.startsWith("dist/") && file.endsWith(".js"),
  );
  const rejectedSubpaths = new Set(["internal", "testkit", "driver", "plugin"]);
  for (const emittedPath of emittedJavaScript) {
    const directPath = emittedPath.slice("dist/".length);
    rejectedSubpaths.add(emittedPath);
    rejectedSubpaths.add(directPath);
    rejectedSubpaths.add(directPath.slice(0, -".js".length));
  }

  for (const subpath of [...rejectedSubpaths].sort()) {
    const specifier = `@sagifire/extensia/${subpath}`;
    run(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `import(${JSON.stringify(specifier)}).then(() => process.exit(1), (error) => { if (error?.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") throw error; });`,
      ],
      { cwd: consumer },
    );
  }
} finally {
  if (consumer) {
    rmSync(consumer, { force: true, recursive: true });
  }
  if (tarballPath) {
    rmSync(tarballPath, { force: true });
  }
}
