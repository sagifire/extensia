import type { ResourceStorageSession } from "./resource-write-protocol.js";

export type ResourceStorageSessionTransientCategory =
  "lock" | "unavailable" | "read";

export class ResourceStorageSessionTransientError extends Error {
  readonly category: ResourceStorageSessionTransientCategory;

  constructor(category: ResourceStorageSessionTransientCategory) {
    super("Resource storage session is transiently unavailable");
    this.name = "ResourceStorageSessionTransientError";
    this.category = category;
  }
}

export interface FullResourceDriverAdapter {
  readonly mode: "full";
  open(): Promise<void>;
  close(): Promise<void>;
  acquireStorageSession(signal?: AbortSignal): Promise<ResourceStorageSession>;
}
