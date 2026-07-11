import { describe, expect, it } from "vitest";

import type { IDString, Timestamp } from "../domain/scalars.js";
import {
  buildResourceSnapshot,
  type ResourceSnapshot,
} from "../domain/snapshots.js";
import {
  createDeterministicFullDriverBacking,
  createDeterministicFullResourceDriver,
  DeterministicDriverCrashError,
  type DeterministicFullDriverCutPoint,
} from "./deterministic-full-resource-driver.js";
import {
  computeResourceWriteSetFingerprint,
  ResourceStorageIntegrityError,
} from "./resource-journal-integrity.js";
import { scanRecoveryCleanResourceState } from "./resource-recovery-coordinator.js";
import type {
  CommittedOperationDraft,
  ResourceStorageSession,
} from "./resource-write-protocol.js";

const ACTOR_ID = "20000000-0000-4000-8000-000000000001" as IDString;
const OPERATION_ID = "30000000-0000-4000-8000-000000000001" as IDString;
const RESOURCE_ID = "10000000-0000-4000-8000-000000000001" as IDString;

function resource(id = RESOURCE_ID, title = "One"): ResourceSnapshot {
  return buildResourceSnapshot({
    assets: [],
    data: {
      created_at: 1 as Timestamp,
      description: null,
      hidden: false,
      id,
      is_deleted: false,
      locked: false,
      order_index: 0,
      parent_id: null,
      title,
      updated_at: 1 as Timestamp,
    },
    kv: {},
    marks: [],
  });
}

function draft(
  snapshot: ResourceSnapshot,
  operationId = OPERATION_ID,
): CommittedOperationDraft {
  return {
    actor_id: ACTOR_ID,
    affected_resources: [snapshot.data.id],
    changes: [{ kind: "resource.upsert", resource_id: snapshot.data.id }],
    committed_at: 2 as Timestamp,
    operation_id: operationId,
    schema_version: 1,
    type: "resource.create",
    write_set_fingerprint: computeResourceWriteSetFingerprint([snapshot]),
  };
}

async function openSession(): Promise<{
  fixture: ReturnType<typeof createDeterministicFullResourceDriver>;
  session: ResourceStorageSession;
}> {
  const fixture = createDeterministicFullResourceDriver();
  await fixture.adapter.open();
  return { fixture, session: await fixture.adapter.acquireStorageSession() };
}

describe("deterministic full Resource driver", () => {
  it("keeps staging private and commits Resource plus exactly one contiguous entry", async () => {
    const { fixture, session } = await openSession();
    const snapshot = resource();
    const transaction = await session.begin(OPERATION_ID);
    await transaction.stageResource(snapshot);
    expect(await session.readResource(RESOURCE_ID)).toBeNull();
    expect(fixture.inspect().journal).toEqual([]);

    const entry = await transaction.commit(draft(snapshot));
    expect(entry.sequence).toBe("1");
    expect((await session.readResource(RESOURCE_ID))?.data.title).toBe("One");
    expect(fixture.inspect().journal).toHaveLength(1);
    await session.release();
    await fixture.adapter.close();
  });

  it("provides idempotent identical operation commits and rejects integrity mismatch", async () => {
    const { session } = await openSession();
    const snapshot = resource();
    const first = await session.begin(OPERATION_ID);
    await first.stageResource(snapshot);
    await first.commit(draft(snapshot));

    const retry = await session.begin(OPERATION_ID);
    await retry.stageResource(snapshot);
    expect((await retry.commit(draft(snapshot))).sequence).toBe("1");

    const mismatch = await session.begin(OPERATION_ID);
    await mismatch.stageResource(resource(RESOURCE_ID, "Changed"));
    await expect(
      mismatch.commit(draft(resource(RESOURCE_ID, "Changed"))),
    ).rejects.toBeInstanceOf(ResourceStorageIntegrityError);
    await mismatch.abort();
    await session.release();
  });

  it("validates canonical cursors and returns entries strictly after an existing cursor", async () => {
    const { session } = await openSession();
    const ids = [
      RESOURCE_ID,
      "10000000-0000-4000-8000-000000000002" as IDString,
    ];
    for (let index = 0; index < ids.length; index += 1) {
      const snapshot = resource(ids[index], String(index));
      const operationId =
        `30000000-0000-4000-8000-00000000000${index + 1}` as IDString;
      const transaction = await session.begin(operationId);
      await transaction.stageResource(snapshot);
      await transaction.commit(draft(snapshot, operationId));
    }
    const after: string[] = [];
    for await (const entry of session.readCommittedOperationsAfter(
      "1" as never,
    ))
      after.push(entry.sequence);
    expect(after).toEqual(["2"]);
    await expect(async () => {
      for await (const _entry of session.readCommittedOperationsAfter(
        "01" as never,
      ))
        void _entry;
    }).rejects.toBeInstanceOf(ResourceStorageIntegrityError);
    await expect(async () => {
      for await (const _entry of session.readCommittedOperationsAfter(
        "3" as never,
      ))
        void _entry;
    }).rejects.toBeInstanceOf(ResourceStorageIntegrityError);
    await session.release();
  });

  it("serializes shared-backing sessions and supports cancellation while waiting", async () => {
    const backing = createDeterministicFullDriverBacking();
    const first = createDeterministicFullResourceDriver(backing);
    const second = createDeterministicFullResourceDriver(backing);
    await first.adapter.open();
    await second.adapter.open();
    const held = await first.adapter.acquireStorageSession();
    const controller = new AbortController();
    const waiting = second.adapter.acquireStorageSession(controller.signal);
    controller.abort(new Error("cancelled"));
    await expect(waiting).rejects.toThrow("cancelled");
    await held.release();
    const acquired = await second.adapter.acquireStorageSession();
    await acquired.release();
  });

  it("recovers incomplete staging by rollback on a fresh adapter", async () => {
    const backing = createDeterministicFullDriverBacking();
    const crashed = createDeterministicFullResourceDriver(backing);
    await crashed.adapter.open();
    const session = await crashed.adapter.acquireStorageSession();
    const transaction = await session.begin(OPERATION_ID);
    crashed.crashNext("transaction.stage.after");
    await expect(transaction.stageResource(resource())).rejects.toBeInstanceOf(
      DeterministicDriverCrashError,
    );

    const fresh = createDeterministicFullResourceDriver(backing);
    await fresh.adapter.open();
    const recovered = await fresh.adapter.acquireStorageSession();
    expect(recovered.recovery).toEqual({
      completed_operations: 0,
      rolled_back_operations: 1,
      status: "recovered",
    });
    expect(fresh.inspect().staging_operations).toEqual([]);
    await recovered.release();
  });

  it("finalizes an unambiguous durable commit after crash without duplicating journal", async () => {
    const backing = createDeterministicFullDriverBacking();
    const crashed = createDeterministicFullResourceDriver(backing);
    await crashed.adapter.open();
    const session = await crashed.adapter.acquireStorageSession();
    const transaction = await session.begin(OPERATION_ID);
    const snapshot = resource();
    await transaction.stageResource(snapshot);
    crashed.crashNext("transaction.commit.after-durable");
    await expect(transaction.commit(draft(snapshot))).rejects.toBeInstanceOf(
      DeterministicDriverCrashError,
    );

    const fresh = createDeterministicFullResourceDriver(backing);
    await fresh.adapter.open();
    const recovered = await fresh.adapter.acquireStorageSession();
    expect(recovered.recovery.completed_operations).toBe(1);
    expect(fresh.inspect().journal.map((entry) => entry.sequence)).toEqual([
      "1",
    ]);
    expect((await recovered.readResource(RESOURCE_ID))?.data.title).toBe("One");
    await recovered.release();
  });

  it("fails closed for ambiguous owned staging and corrupt journal", async () => {
    const ambiguous = createDeterministicFullResourceDriver();
    ambiguous.injectUnknownStaging(OPERATION_ID);
    await ambiguous.adapter.open();
    await expect(
      ambiguous.adapter.acquireStorageSession(),
    ).rejects.toBeInstanceOf(ResourceStorageIntegrityError);

    const { fixture, session } = await openSession();
    const snapshot = resource();
    const transaction = await session.begin(OPERATION_ID);
    await transaction.stageResource(snapshot);
    await transaction.commit(draft(snapshot));
    await session.release();
    fixture.corruptJournal((journal) => {
      journal[0] = { ...journal[0]!, sequence: "2" as never };
    });
    await expect(
      fixture.adapter.acquireStorageSession(),
    ).rejects.toBeInstanceOf(ResourceStorageIntegrityError);
  });

  it("injects failures at every non-crash protocol cut point without accidental commit", async () => {
    const points: readonly DeterministicFullDriverCutPoint[] = [
      "transaction.begin",
      "transaction.stage.before",
      "transaction.stage.after",
      "transaction.commit.before",
      "transaction.abort",
      "resource.list",
      "resource.read",
      "journal.read",
    ];
    expect(points).toHaveLength(8);
    for (const point of points) {
      const { fixture, session } = await openSession();
      fixture.failNext(point);
      if (point === "transaction.begin") {
        await expect(session.begin(OPERATION_ID)).rejects.toThrow(
          "Injected failure",
        );
      } else if (point.startsWith("transaction.")) {
        const transaction = await session.begin(OPERATION_ID);
        if (point.startsWith("transaction.stage")) {
          await expect(transaction.stageResource(resource())).rejects.toThrow(
            "Injected failure",
          );
        } else if (point === "transaction.commit.before") {
          await transaction.stageResource(resource());
          await expect(transaction.commit(draft(resource()))).rejects.toThrow(
            "Injected failure",
          );
        } else {
          await expect(transaction.abort()).rejects.toThrow("Injected failure");
        }
      } else if (point === "resource.read") {
        await expect(session.readResource(RESOURCE_ID)).rejects.toThrow(
          "Injected failure",
        );
      } else {
        await expect(async () => {
          const stream =
            point === "resource.list"
              ? session.listResources()
              : session.readCommittedOperationsAfter(null);
          for await (const item of stream) void item;
        }).rejects.toThrow("Injected failure");
      }
      expect(fixture.inspect().journal).toEqual([]);
      await session.release();
    }
  });

  it("injects lifecycle, acquisition and recovery failures at their exact cut points", async () => {
    const openFailure = createDeterministicFullResourceDriver();
    openFailure.failNext("open");
    await expect(openFailure.adapter.open()).rejects.toThrow(
      "Injected failure",
    );

    const closeFailure = createDeterministicFullResourceDriver();
    await closeFailure.adapter.open();
    closeFailure.failNext("close");
    await expect(closeFailure.adapter.close()).rejects.toThrow(
      "Injected failure",
    );

    const acquireFailure = createDeterministicFullResourceDriver();
    await acquireFailure.adapter.open();
    acquireFailure.failNext("session.acquire");
    await expect(
      acquireFailure.adapter.acquireStorageSession(),
    ).rejects.toThrow("Injected failure");

    for (const point of ["recovery.rollback", "recovery.finalize"] as const) {
      const backing = createDeterministicFullDriverBacking();
      const crashed = createDeterministicFullResourceDriver(backing);
      await crashed.adapter.open();
      const session = await crashed.adapter.acquireStorageSession();
      const transaction = await session.begin(OPERATION_ID);
      const snapshot = resource();
      if (point === "recovery.rollback") {
        crashed.crashNext("transaction.stage.after");
        await expect(
          transaction.stageResource(snapshot),
        ).rejects.toBeInstanceOf(DeterministicDriverCrashError);
      } else {
        await transaction.stageResource(snapshot);
        crashed.crashNext("transaction.commit.after-durable");
        await expect(
          transaction.commit(draft(snapshot)),
        ).rejects.toBeInstanceOf(DeterministicDriverCrashError);
      }
      const fresh = createDeterministicFullResourceDriver(backing);
      await fresh.adapter.open();
      fresh.failNext(point);
      await expect(fresh.adapter.acquireStorageSession()).rejects.toThrow(
        "Injected failure",
      );
    }
  });

  it("injects post-durable crash and release cleanup failures without rewriting commit", async () => {
    const backing = createDeterministicFullDriverBacking();
    const crashed = createDeterministicFullResourceDriver(backing);
    await crashed.adapter.open();
    const session = await crashed.adapter.acquireStorageSession();
    const transaction = await session.begin(OPERATION_ID);
    const snapshot = resource();
    await transaction.stageResource(snapshot);
    crashed.crashNext("transaction.commit.after-durable");
    await expect(transaction.commit(draft(snapshot))).rejects.toBeInstanceOf(
      DeterministicDriverCrashError,
    );
    expect(crashed.inspect().journal).toHaveLength(1);

    const fresh = createDeterministicFullResourceDriver(backing);
    await fresh.adapter.open();
    const recovered = await fresh.adapter.acquireStorageSession();
    fresh.failNext("session.release");
    await expect(recovered.release()).rejects.toThrow("Injected failure");
    expect(fresh.inspect().journal).toHaveLength(1);
    const reacquired = await fresh.adapter.acquireStorageSession();
    await reacquired.release();
  });

  it("does not allow ordinary error injection after durable commit", () => {
    const fixture = createDeterministicFullResourceDriver();
    expect(() => fixture.failNext("transaction.commit.after-durable")).toThrow(
      "must use crashNext",
    );
  });

  it("invalidates stale session and transaction handles across a crash generation", async () => {
    const backing = createDeterministicFullDriverBacking();
    const crashed = createDeterministicFullResourceDriver(backing);
    await crashed.adapter.open();
    const staleSession = await crashed.adapter.acquireStorageSession();
    const staleTransaction = await staleSession.begin(OPERATION_ID);
    crashed.crashNext("transaction.stage.after");
    await expect(
      staleTransaction.stageResource(resource()),
    ).rejects.toBeInstanceOf(DeterministicDriverCrashError);

    const fresh = createDeterministicFullResourceDriver(backing);
    await fresh.adapter.open();
    const currentSession = await fresh.adapter.acquireStorageSession();
    await expect(staleSession.readResource(RESOURCE_ID)).rejects.toThrow(
      "crashed generation",
    );
    await expect(staleTransaction.commit(draft(resource()))).rejects.toThrow(
      "crashed generation",
    );
    await currentSession.release();
  });

  it.each(["resources", "journal"] as const)(
    "invalidates a partially consumed stale %s iterator after crash",
    async (kind) => {
      const backing = createDeterministicFullDriverBacking();
      const crashed = createDeterministicFullResourceDriver(backing);
      await crashed.adapter.open();
      const staleSession = await crashed.adapter.acquireStorageSession();
      for (let index = 1; index <= 2; index += 1) {
        const resourceId =
          `10000000-0000-4000-8000-00000000000${index}` as IDString;
        const operationId =
          `30000000-0000-4000-8000-00000000000${index}` as IDString;
        const snapshot = resource(resourceId, String(index));
        const transaction = await staleSession.begin(operationId);
        await transaction.stageResource(snapshot);
        await transaction.commit(draft(snapshot, operationId));
      }
      const stream =
        kind === "resources"
          ? staleSession.listResources()
          : staleSession.readCommittedOperationsAfter(null);
      const iterator = stream[Symbol.asyncIterator]();
      expect((await iterator.next()).done).toBe(false);
      crashed.crashNext("resource.read");
      await expect(
        staleSession.readResource(RESOURCE_ID),
      ).rejects.toBeInstanceOf(DeterministicDriverCrashError);

      const fresh = createDeterministicFullResourceDriver(backing);
      await fresh.adapter.open();
      const currentSession = await fresh.adapter.acquireStorageSession();
      await expect(iterator.next()).rejects.toThrow("crashed generation");
      await currentSession.release();
    },
  );

  it("requires journal affected Resources and changes to exactly describe the staged order", async () => {
    const { fixture, session } = await openSession();
    const snapshot = resource();
    const transaction = await session.begin(OPERATION_ID);
    await transaction.stageResource(snapshot);
    await expect(
      transaction.commit({
        ...draft(snapshot),
        affected_resources: [],
        changes: [],
      }),
    ).rejects.toBeInstanceOf(ResourceStorageIntegrityError);
    expect(fixture.inspect().journal).toEqual([]);
    await transaction.abort();
    await session.release();
  });

  it("fails recovery when durable Resource content no longer matches committed staging", async () => {
    const backing = createDeterministicFullDriverBacking();
    const crashed = createDeterministicFullResourceDriver(backing);
    await crashed.adapter.open();
    const session = await crashed.adapter.acquireStorageSession();
    const snapshot = resource();
    const transaction = await session.begin(OPERATION_ID);
    await transaction.stageResource(snapshot);
    crashed.crashNext("transaction.commit.after-durable");
    await expect(transaction.commit(draft(snapshot))).rejects.toBeInstanceOf(
      DeterministicDriverCrashError,
    );
    backing.resources.set(RESOURCE_ID, resource(RESOURCE_ID, "corrupt"));

    const fresh = createDeterministicFullResourceDriver(backing);
    await fresh.adapter.open();
    await expect(fresh.adapter.acquireStorageSession()).rejects.toBeInstanceOf(
      ResourceStorageIntegrityError,
    );
  });

  it("rejects an untrusted fingerprint before durable visibility", async () => {
    const { fixture, session } = await openSession();
    const transaction = await session.begin(OPERATION_ID);
    const snapshot = resource();
    await transaction.stageResource(snapshot);
    await expect(
      transaction.commit({
        ...draft(snapshot),
        write_set_fingerprint: "0".repeat(64) as never,
      }),
    ).rejects.toBeInstanceOf(ResourceStorageIntegrityError);
    expect(fixture.inspect().journal).toEqual([]);
    expect(await session.readResource(RESOURCE_ID)).toBeNull();
    await transaction.abort();
    await session.release();
  });

  it("scans recovery, Resources and journal head coherently under the same session", async () => {
    const fixture = createDeterministicFullResourceDriver();
    await fixture.adapter.open();
    const session = await fixture.adapter.acquireStorageSession();
    const snapshot = resource();
    const transaction = await session.begin(OPERATION_ID);
    await transaction.stageResource(snapshot);
    await transaction.commit(draft(snapshot));
    await session.release();

    const state = await scanRecoveryCleanResourceState(fixture.adapter);
    expect(state.recovery.status).toBe("clean");
    expect(state.resources).toHaveLength(1);
    expect(state.journal_head).toBe("1");
    expect(state.journal).toHaveLength(1);
  });

  it("exposes full capability only and does not change the readonly contract", () => {
    const fixture = createDeterministicFullResourceDriver();
    expect(fixture.adapter.mode).toBe("full");
    expect("listResources" in fixture.adapter).toBe(false);
    expect("acquireStorageSession" in fixture.adapter).toBe(true);
  });
});
