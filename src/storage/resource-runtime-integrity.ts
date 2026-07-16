export type ResourceRuntimeIntegrityCode =
  | "RESOURCE_STORAGE_INTEGRITY"
  | "RESOURCE_INDEX_INTEGRITY"
  | "ASSET_STORAGE_INTEGRITY";

export class ResourceRuntimeIntegrityError extends Error {
  readonly code: ResourceRuntimeIntegrityCode;

  constructor(code: ResourceRuntimeIntegrityCode, message: string) {
    super(message);
    this.name = "ResourceRuntimeIntegrityError";
    this.code = code;
  }
}

export class ResourceCommittedIntegrityError extends ResourceRuntimeIntegrityError {
  readonly committed = true;

  constructor(message: string) {
    super("RESOURCE_STORAGE_INTEGRITY", message);
    this.name = "ResourceCommittedIntegrityError";
  }
}

export class AssetStorageIntegrityError extends ResourceRuntimeIntegrityError {
  constructor(message: string) {
    super("ASSET_STORAGE_INTEGRITY", message);
    this.name = "AssetStorageIntegrityError";
  }
}
