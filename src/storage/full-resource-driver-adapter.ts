import type { ResourceStorageSession } from "./resource-write-protocol.js";

export interface FullResourceDriverAdapter {
  readonly mode: "full";
  open(): Promise<void>;
  close(): Promise<void>;
  acquireStorageSession(signal?: AbortSignal): Promise<ResourceStorageSession>;
}
