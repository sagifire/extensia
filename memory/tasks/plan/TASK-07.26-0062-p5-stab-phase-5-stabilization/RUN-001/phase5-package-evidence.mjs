import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const runDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(runDirectory, "../../../../..");
const harnessPath = join(runDirectory, "phase5-stabilization-evidence.mjs");
const packedProcessEvidencePath = join(
  runDirectory,
  "packed-process-evidence.json",
);
const packageEvidencePath = join(runDirectory, "package-evidence.json");
const temporaryRoots = [];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function createTemporaryRoot(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

function resolveNpmCli() {
  const candidates = [
    process.env.npm_execpath,
    join(
      dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
    resolve(
      dirname(process.execPath),
      "..",
      "lib",
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
  ].filter(Boolean);

  const locator = spawnSync(
    process.platform === "win32" ? "where.exe" : "which",
    [process.platform === "win32" ? "npm.cmd" : "npm"],
    { encoding: "utf8", windowsHide: true },
  );
  if (locator.status === 0) {
    for (const located of locator.stdout.split(/\r?\n/u).filter(Boolean)) {
      candidates.push(located);
      candidates.push(
        join(dirname(located), "node_modules", "npm", "bin", "npm-cli.js"),
      );
    }
  }

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const resolved = realpathSync(candidate);
    if (basename(resolved) === "npm-cli.js") return resolved;
    const adjacent = join(
      dirname(resolved),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    );
    if (existsSync(adjacent)) return realpathSync(adjacent);
  }

  throw new Error(
    "Unable to locate npm-cli.js. Run this evidence tool through npm or install npm beside Node.js.",
  );
}

function run(command, args, options, label) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
    ...options,
  });
  if (result.error !== undefined) {
    throw new Error(`${label} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = [result.stderr, result.stdout]
      .map((value) => value.trim())
      .filter(Boolean)
      .join("\n");
    throw new Error(
      `${label} exited with status ${String(result.status)}${detail === "" ? "" : `:\n${detail}`}`,
    );
  }
  return result.stdout.trim();
}

function runNpm(npmCli, args, options, label) {
  return run(process.execPath, [npmCli, ...args], options, label);
}

function parseJsonOutput(output, label) {
  const lines = output.split(/\r?\n/u).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      // Some tools print progress before their final compact JSON record.
    }
  }
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`${label} did not emit parseable JSON: ${error.message}`);
  }
}

function normalizedPath(root, path) {
  return relative(root, path).split(sep).join("/");
}

function collectContentManifest(root) {
  const entries = [];

  function visit(path) {
    const stat = lstatSync(path);
    const archivePath = normalizedPath(root, path).replace(/^package\//u, "");
    if (stat.isDirectory()) {
      for (const name of readdirSync(path).sort()) visit(join(path, name));
      return;
    }
    if (stat.isSymbolicLink()) {
      entries.push({
        path: archivePath,
        target: readlinkSync(path),
        type: "symlink",
      });
      return;
    }
    assert.ok(stat.isFile(), `Unsupported packed entry type: ${archivePath}`);
    const bytes = readFileSync(path);
    entries.push({
      bytes: bytes.length,
      path: archivePath,
      sha256: sha256(bytes),
      type: "file",
    });
  }

  visit(root);
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function packArchive(npmCli, label, root) {
  const output = runNpm(
    npmCli,
    ["pack", "--json", "--pack-destination", root],
    { cwd: repositoryRoot },
    `npm pack ${label}`,
  );
  const packed = parseJsonOutput(output, `npm pack ${label}`);
  assert.ok(
    Array.isArray(packed) && packed.length === 1,
    `npm pack ${label} must produce exactly one archive`,
  );
  const metadata = packed[0];
  const archivePath = join(root, metadata.filename);
  assert.ok(existsSync(archivePath), `npm pack ${label} archive is missing`);

  const extractionRoot = join(root, "extracted");
  mkdirSync(extractionRoot);
  run(
    "tar",
    ["-xzf", archivePath, "-C", extractionRoot],
    { cwd: repositoryRoot },
    `tar extraction ${label}`,
  );
  const extractedPackageRoot = join(extractionRoot, "package");
  assert.ok(
    existsSync(extractedPackageRoot),
    `npm pack ${label} did not contain the package/ root`,
  );

  const archiveBytes = readFileSync(archivePath);
  const contentManifest = collectContentManifest(extractedPackageRoot);
  const npmManifest = metadata.files
    .map((entry) => ({
      bytes: entry.size,
      mode: entry.mode ?? null,
      path: entry.path,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  assert.deepEqual(
    contentManifest.map((entry) => entry.path),
    npmManifest.map((entry) => entry.path),
    `npm and extracted manifests differ for pack ${label}`,
  );

  return {
    archiveBytes,
    archivePath,
    record: {
      archive_bytes: archiveBytes.length,
      archive_sha256: sha256(archiveBytes),
      content_manifest: contentManifest,
      entry_count: contentManifest.length,
      filename: basename(archivePath),
      label,
      npm_manifest: npmManifest,
    },
  };
}

function assertNoTemporaryPath(value) {
  if (typeof value === "string") {
    assert.ok(
      temporaryRoots.every((root) => !value.includes(root)),
      "Evidence contains a temporary filesystem path",
    );
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertNoTemporaryPath(item);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) assertNoTemporaryPath(item);
  }
}

const publicProbeSource = String.raw`
  import assert from "node:assert/strict";

  const globalKeys = Reflect.ownKeys(globalThis);
  const environment = { ...process.env };
  const listeners = process.eventNames().map((name) => [
    String(name),
    process.listenerCount(name),
  ]);
  const namespace = await import("@sagifire/extensia");
  const exports = Object.keys(namespace).sort();

  assert.deepEqual(exports, ["createExtensia", "defineFullResourceDriver"]);
  assert.equal(typeof namespace.createExtensia, "function");
  assert.equal(typeof namespace.defineFullResourceDriver, "function");
  assert.deepEqual(Reflect.ownKeys(globalThis), globalKeys);
  assert.deepEqual({ ...process.env }, environment);
  assert.deepEqual(
    process.eventNames().map((name) => [String(name), process.listenerCount(name)]),
    listeners,
  );

  let internalBoundary = "unexpectedly-importable";
  try {
    await import("@sagifire/extensia/dist/composition/local-sqlite-runtime.js");
  } catch (error) {
    internalBoundary = error?.code ?? "rejected";
  }
  assert.equal(internalBoundary, "ERR_PACKAGE_PATH_NOT_EXPORTED");

  process.stdout.write(JSON.stringify({
    environment_unchanged: true,
    exports,
    globals_unchanged: true,
    internal_subpath: "rejected",
    listeners_unchanged: true,
    status: "PASS",
  }) + "\n");
`;

const npmCli = resolveNpmCli();
let completed = false;

try {
  rmSync(packageEvidencePath, { force: true });
  rmSync(packedProcessEvidencePath, { force: true });

  const packRootA = createTemporaryRoot("extensia-p5-stab-pack-a-");
  const packRootB = createTemporaryRoot("extensia-p5-stab-pack-b-");
  const consumerRoot = createTemporaryRoot("extensia-p5-stab-consumer-");

  const packA = packArchive(npmCli, "A", packRootA);
  const packB = packArchive(npmCli, "B", packRootB);
  const contentEqual =
    JSON.stringify(packA.record.content_manifest) ===
    JSON.stringify(packB.record.content_manifest);
  const npmManifestEqual =
    JSON.stringify(packA.record.npm_manifest) ===
    JSON.stringify(packB.record.npm_manifest);
  const byteEqual = packA.archiveBytes.equals(packB.archiveBytes);
  assert.ok(contentEqual, "Independent pack content manifests differ");
  assert.ok(npmManifestEqual, "Independent npm pack manifests differ");
  assert.ok(byteEqual, "Independent npm pack archives are not byte-identical");

  writeFileSync(
    join(consumerRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "extensia-p5-stab-packed-consumer",
        private: true,
        type: "module",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  runNpm(
    npmCli,
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      packA.archivePath,
    ],
    { cwd: consumerRoot },
    "fresh packed consumer install",
  );

  const publicProbePath = join(consumerRoot, "public-root-probe.mjs");
  writeFileSync(publicProbePath, publicProbeSource, "utf8");
  const publicProbe = parseJsonOutput(
    run(
      process.execPath,
      [publicProbePath],
      { cwd: consumerRoot },
      "packed public root probe",
    ),
    "packed public root probe",
  );
  assert.equal(publicProbe.status, "PASS", "Packed public root probe failed");

  assert.ok(
    existsSync(harnessPath),
    "Missing task-local phase5-stabilization-evidence.mjs",
  );
  const harnessSource = readFileSync(harnessPath, "utf8");
  for (const variable of [
    "EXTENSIA_PACKAGE_ROOT",
    "EXTENSIA_EVIDENCE_OUTPUT",
    "EXTENSIA_REPETITIONS",
  ]) {
    assert.ok(
      harnessSource.includes(variable),
      `phase5-stabilization-evidence.mjs does not support required ${variable}`,
    );
  }

  const installedPackageRoot = join(
    consumerRoot,
    "node_modules",
    "@sagifire",
    "extensia",
  );
  assert.ok(existsSync(installedPackageRoot), "Installed package root is missing");
  const harnessRecord = parseJsonOutput(
    run(
      process.execPath,
      [harnessPath],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          EXTENSIA_EVIDENCE_OUTPUT: packedProcessEvidencePath,
          EXTENSIA_PACKAGE_ROOT: installedPackageRoot,
          EXTENSIA_REPETITIONS: "1",
        },
      },
      "packed Phase 5 stabilization harness",
    ),
    "packed Phase 5 stabilization harness",
  );
  assert.equal(
    harnessRecord.status,
    "PASS",
    "Packed Phase 5 stabilization harness did not report PASS",
  );
  assert.ok(
    existsSync(packedProcessEvidencePath),
    "Packed Phase 5 stabilization harness did not write its evidence file",
  );
  const packedProcessEvidenceBytes = readFileSync(packedProcessEvidencePath);
  const packedProcessEvidence = JSON.parse(packedProcessEvidenceBytes.toString("utf8"));
  assertNoTemporaryPath(packedProcessEvidence);

  const packageEvidence = {
    archives: [packA.record, packB.record],
    comparison: {
      archive_byte_equal: byteEqual,
      archive_sha256_equal:
        packA.record.archive_sha256 === packB.record.archive_sha256,
      content_equal: contentEqual,
      npm_manifest_equal: npmManifestEqual,
    },
    consumer_install: {
      ignore_scripts: true,
      status: "PASS",
    },
    packed_process_matrix: {
      evidence_file: basename(packedProcessEvidencePath),
      evidence_sha256: sha256(packedProcessEvidenceBytes),
      repetitions: 1,
      source: "installed-tarball",
      status: harnessRecord.status,
    },
    public_root_probe: publicProbe,
    status: "PASS",
  };
  assertNoTemporaryPath(packageEvidence);
  writeFileSync(
    packageEvidencePath,
    `${JSON.stringify(packageEvidence, null, 2)}\n`,
    "utf8",
  );
  completed = true;
  process.stdout.write(
    `${JSON.stringify({ output: basename(packageEvidencePath), status: "PASS" })}\n`,
  );
} finally {
  for (const root of temporaryRoots.reverse()) {
    rmSync(root, { force: true, recursive: true });
  }
  if (!completed) rmSync(packageEvidencePath, { force: true });
}
