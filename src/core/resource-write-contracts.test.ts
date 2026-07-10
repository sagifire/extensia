import { describe, expect, expectTypeOf, it } from "vitest";

import type { IDString, Timestamp } from "../domain/scalars.js";
import type { ResourceSnapshot } from "../domain/snapshots.js";
import type {
  OperationClock,
  ResourceOperationIdentitySource,
} from "../operations/resource-operation-contracts.js";
import type { FullResourceDriverAdapter } from "../storage/full-resource-driver-adapter.js";
import type {
  CommittedOperationDraft,
  CommittedOperationEntry,
  ResourceStorageSession,
  ResourceWriteTransaction,
} from "../storage/resource-write-protocol.js";
import {
  CORE_RESOURCE_WRITE_PORT,
  type CoreResourceWritePort,
} from "../system-extensions/default-api/resource-write-port.js";
import type { MutableGreedyResourceIndex } from "./resource-index-write-contracts.js";

describe("shared Resource write protocol contracts", () => {
  it("materializes the one consumer-owned Core write token", () => {
    expect(CORE_RESOURCE_WRITE_PORT.id).toBe(
      "extensia.internal.system-extensions.default-api.core-resource-write-port",
    );
  });

  it("keeps exact source-only capability shapes", () => {
    expectTypeOf<FullResourceDriverAdapter>().toMatchTypeOf<{
      readonly mode: "full";
      acquireStorageSession(
        signal?: AbortSignal,
      ): Promise<ResourceStorageSession>;
    }>();
    expectTypeOf<ResourceWriteTransaction["commit"]>().toEqualTypeOf<
      (entry: CommittedOperationDraft) => Promise<CommittedOperationEntry>
    >();
    expectTypeOf<CoreResourceWritePort["write"]>().toBeFunction();
    expectTypeOf<MutableGreedyResourceIndex["prepareUpsert"]>().toEqualTypeOf<
      (resource: ResourceSnapshot) => {
        readonly resource: ResourceSnapshot;
        publish(): void;
      }
    >();
    expectTypeOf<
      ResourceOperationIdentitySource["create"]
    >().returns.toEqualTypeOf<{
      readonly operation_id: IDString;
      readonly actor_id: IDString;
    }>();
    expectTypeOf<OperationClock["now"]>().returns.toEqualTypeOf<Timestamp>();
  });
});
