import {
  closeSync,
  constants,
  fdatasyncSync,
  fsyncSync,
  lstatSync,
  mkdtempSync,
  openSync,
  renameSync,
  rmSync,
  statfsSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";

function errorCode(error) {
  return error?.code ?? error?.name ?? "unknown";
}

if (process.argv[2] === "--try-exclusive-create") {
  try {
    const fd = openSync(process.argv[3], "wx", 0o600);
    closeSync(fd);
    process.stdout.write("created");
    process.exitCode = 0;
  } catch (error) {
    process.stdout.write(errorCode(error));
    process.exitCode = 2;
  }
} else {
  const root = mkdtempSync(join(tmpdir(), "extensia-fs-native-probe-"));
  const result = {
    schema: "extensia.filesystem-capability-probe/v1",
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd_filesystem: null,
    capabilities: {},
    limitations: {},
    certification: "not-certified",
  };

  try {
    const fsInfo = statfsSync(root, { bigint: true });
    result.cwd_filesystem = {
      type_hex: `0x${BigInt.asUintN(64, fsInfo.type).toString(16)}`,
      block_size: fsInfo.bsize.toString(),
    };

    const lockPath = join(root, "LOCK");
    const lockFd = openSync(lockPath, "wx+", 0o600);
    writeFileSync(lockFd, "owner-a", { encoding: "utf8" });
    fsyncSync(lockFd);
    const contender = spawnSync(process.execPath, [process.argv[1], "--try-exclusive-create", lockPath], {
      encoding: "utf8",
    });
    result.capabilities.create_exclusive_contention = contender.stdout.trim();
    closeSync(lockFd);
    const staleContender = spawnSync(process.execPath, [process.argv[1], "--try-exclusive-create", lockPath], {
      encoding: "utf8",
    });
    result.limitations.create_exclusive_after_owner_close = staleContender.stdout.trim();

    const source = join(root, "HEAD.new");
    const target = join(root, "HEAD");
    writeFileSync(source, "new-head", { mode: 0o600 });
    writeFileSync(target, "old-head", { mode: 0o600 });
    const sourceFd = openSync(source, "r+");
    fdatasyncSync(sourceFd);
    fsyncSync(sourceFd);
    closeSync(sourceFd);
    renameSync(source, target);
    result.capabilities.file_sync_and_same_directory_replace = "ok";

    try {
      const directoryFd = openSync(dirname(target), "r");
      try {
        fsyncSync(directoryFd);
        result.capabilities.directory_fsync = "ok";
      } finally {
        closeSync(directoryFd);
      }
    } catch (error) {
      result.capabilities.directory_fsync = errorCode(error);
    }

    const real = join(root, "regular");
    const link = join(root, "link");
    writeFileSync(real, "data", { mode: 0o600 });
    try {
      symlinkSync(real, link, "file");
      result.capabilities.symlink_creation = "ok";
      result.capabilities.symlink_lstat = lstatSync(link).isSymbolicLink() ? "identified" : "not-identified";
      if (typeof constants.O_NOFOLLOW === "number") {
        try {
          const fd = openSync(link, constants.O_RDONLY | constants.O_NOFOLLOW);
          closeSync(fd);
          result.capabilities.open_nofollow = "followed-or-ignored";
        } catch (error) {
          result.capabilities.open_nofollow = errorCode(error);
        }
      } else {
        result.capabilities.open_nofollow = "constant-unavailable";
      }
    } catch (error) {
      result.capabilities.symlink_creation = errorCode(error);
    }

    const fsModule = await import("node:fs");
    result.limitations.node_flock = typeof fsModule.flock;
    result.limitations.node_lockf = typeof fsModule.lockf;
    result.limitations.native_lock_helper = "not-loaded-by-research-probe";
    result.limitations.power_loss_durability = "not-proven-by-live-process-probe";

    console.log(JSON.stringify(result, null, 2));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
