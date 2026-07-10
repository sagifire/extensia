import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
    "dist/domain/json.d.ts",
    "dist/domain/json.d.ts.map",
    "dist/domain/json.js",
    "dist/domain/json.js.map",
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
    "package.json",
  ]);
  assert.ok(
    !packageContents.some((file) => file.endsWith(".cjs")),
    "Packed package must not contain CommonJS output.",
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
    'import "@sagifire/extensia";\n',
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
  run(
    process.execPath,
    ["--input-type=module", "--eval", 'await import("@sagifire/extensia");'],
    { cwd: consumer },
  );
  run(
    process.execPath,
    [
      join(consumer, "node_modules", "typescript", "bin", "tsc"),
      "--project",
      "tsconfig.json",
    ],
    { cwd: consumer },
  );
  for (const subpath of [
    "internal",
    "testkit",
    "driver",
    "plugin",
    "composition/diagnostics",
    "composition/inspection",
    "composition/root",
    "composition/tokens",
    "domain/json",
    "domain/scalars",
    "domain/snapshots",
    "dist/composition/root.js",
    "dist/domain/scalars.js",
  ]) {
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
