import type { ExtensiaModule } from "../public/contracts.js";
import { createExtensia } from "../public/extensia.js";
import { defineFullResourceDriver } from "../public/full-resource-driver.js";
import {
  createLocalSqliteFullResourceDriver,
  createLocalSqliteReadonlyResourceDriver,
  type LocalSqliteDriverOptions,
} from "../storage/local-sqlite-resource-driver.js";

export interface LocalSqliteExtensiaConfig {
  readonly mode: "full" | "readonly";
  readonly storage: LocalSqliteDriverOptions;
}

/**
 * Internal production composition for the concrete local-sqlite-v1 profile.
 * It deliberately remains outside the package export map until the public
 * default-driver construction contract has its own acceptance owner.
 */
export function createLocalSqliteExtensia(
  config: LocalSqliteExtensiaConfig,
): ExtensiaModule {
  const driver =
    config.mode === "full"
      ? defineFullResourceDriver(
          createLocalSqliteFullResourceDriver(config.storage),
        )
      : createLocalSqliteReadonlyResourceDriver(config.storage);

  return createExtensia({ storage: { driver } });
}
