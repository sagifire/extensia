import { describe, expect, it } from "vitest";

import {
  composeExtensia,
  multiCapability,
  singleCapability,
} from "../composition/root.js";
import {
  parseIDString,
  parseTimestamp,
  type IDString,
} from "../domain/scalars.js";
import type { AssetSnapshot, ResourceSnapshot } from "../domain/snapshots.js";
import {
  computeResourceWriteSetFingerprint,
  journalSequence,
} from "../storage/resource-journal-integrity.js";
import {
  createDeterministicFullDriverBacking,
  createDeterministicFullResourceDriver,
} from "../storage/deterministic-full-resource-driver.js";
import type {
  CommittedOperationDraft,
  CommittedOperationEntry,
} from "../storage/resource-write-protocol.js";
import {
  createDeterministicCommittedChangeObservationAdapter,
  createDeterministicMetadataObservationAdapter,
  createDeterministicObservationBarrier,
} from "./deterministic-read-model-observation.js";
import {
  applyCompleteReadModelDelta,
  buildCompleteReadModelGeneration,
  markIdentityKey,
} from "./read-model-generation.js";
import { createReadModelPublicationCoordinator } from "./read-model-coordinator.js";
import { READ_MODEL_SYNCHRONIZATION_ACTOR } from "./read-model-synchronization.js";
import {
  CORE_COMMITTED_CHANGE_OBSERVATION_PORT,
  CORE_METADATA_OBSERVATION_PORT,
} from "./read-model-observation.js";
import { createGreedyResourceIndex } from "./resource-index.js";
import {
  createFullCommittedChangeObservationPort,
  createReadonlyMetadataObservationPort,
} from "./read-model-storage-observation.js";
import {
  createRuntimeFaultSink,
  RUNTIME_FAULT_SINK,
} from "./runtime-fault-sink.js";
import {
  FULL_RESOURCE_CORE_MODULE,
  FULL_RESOURCE_DRIVER,
} from "./resource-write-runtime.js";
import {
  createRuntimeLifecycleHost,
  LIFECYCLE_CONTRIBUTIONS,
} from "../runtime/lifecycle.js";
import { FACADE_REGISTRY_ACCESS } from "../runtime/facades.js";
import {
  DEFAULT_API_FACADE_REGISTRY_MODULE,
  FULL_DEFAULT_API_SYSTEM_EXTENSION_MODULE,
  QUERY_FACADE,
  STORAGE_FACADE,
} from "../system-extensions/default-api/facades.js";
import { CORE_RESOURCE_READ_PORT } from "../system-extensions/default-api/resource-read-port.js";

const NOW = parseTimestamp(1_787_337_600_000);

function id(index: number): IDString {
  return parseIDString(
    `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`,
  );
}

function resource(
  index: number,
  options: Readonly<{
    parent_id?: IDString | null;
    order_index?: number;
    title?: string;
    assets?: readonly AssetSnapshot[];
    marks?: ResourceSnapshot["marks"];
  }> = {},
): ResourceSnapshot {
  return {
    assets: [...(options.assets ?? [])],
    data: {
      created_at: NOW,
      description: null,
      hidden: false,
      id: id(index),
      is_deleted: false,
      locked: false,
      order_index: options.order_index ?? index,
      parent_id: options.parent_id ?? null,
      title: options.title ?? `Resource ${index}`,
      updated_at: NOW,
    },
    kv: {},
    marks: [...(options.marks ?? [])],
  };
}

function externalAsset(
  index: number,
  options: Readonly<{ primary?: boolean; derived_from?: IDString | null }> = {},
): AssetSnapshot {
  return {
    created_at: NOW,
    data: { label: `asset-${index}` },
    derived_from: options.derived_from ?? null,
    extension: null,
    id: id(index),
    is_external: true,
    is_on_uploading: false,
    is_primary: options.primary ?? false,
    mime: null,
    role: "original",
    type: "image",
    updated_at: NOW,
    url: `https://example.com/${index}`,
  };
}

function committed(
  sequence: bigint,
  snapshot: ResourceSnapshot,
): CommittedOperationEntry {
  const draft: CommittedOperationDraft = {
    actor_id: id(90_001),
    affected_resources: [snapshot.data.id],
    changes: [{ kind: "resource.upsert", resource_id: snapshot.data.id }],
    committed_at: NOW,
    operation_id: id(90_000 + Number(sequence)),
    schema_version: 1,
    type: "resource.update",
    write_set_fingerprint: computeResourceWriteSetFingerprint([snapshot]),
  };
  return Object.freeze({ ...draft, sequence: journalSequence(sequence) });
}

describe("read-model generation", () => {
  it("publishes all greedy projections and exact complete coverage as one immutable root", () => {
    const primary = externalAsset(101, { primary: true });
    const derivative = externalAsset(102, { derived_from: primary.id });
    const root = resource(1, {
      assets: [primary, derivative],
      marks: [{ name: "hero", type: "usage", value: null }],
      order_index: 0,
    });
    const child = resource(2, { parent_id: root.data.id, order_index: 0 });
    const generation = buildCompleteReadModelGeneration([child, root]);

    expect(generation.coverage).toEqual({
      asset_points_and_owners: "all",
      kind: "complete",
      mark_selectors: "all",
      resource_one_level: "all",
      resource_points: "all",
      storage_global: true,
    });
    expect(generation.childrenByParent.get(root.data.id)).toEqual([
      { id: child.data.id, order_index: 0 },
    ]);
    expect(generation.assetOwnerById.get(derivative.id)).toBe(root.data.id);
    expect(generation.primaryAssetByResource.get(root.data.id)).toBe(
      primary.id,
    );
    expect(generation.lineageDependentsByAsset.get(primary.id)).toEqual([
      derivative.id,
    ]);
    expect(
      generation.resourcesByMark.get(
        markIdentityKey({ name: "hero", type: "usage" }),
      ),
    ).toEqual([root.data.id]);
    expect(Object.isFrozen(generation)).toBe(true);
    expect(Object.isFrozen(generation.resourcesById.get(root.data.id))).toBe(
      true,
    );
    expect(Object.isFrozen(generation.assetById.get(primary.id)?.data)).toBe(
      true,
    );
  });

  it("uses the production index changed-key path without size-dependent structural writes", async () => {
    const measure = async (size: number) => {
      const resources = Array.from({ length: size }, (_, index) =>
        resource(index + 1, { order_index: index }),
      );
      const index = createGreedyResourceIndex();
      await index.initialize(
        (async function* () {
          yield* resources;
        })(),
      );
      const target = resources.at(-1)!;
      const prepared = index.prepareBatch([
        {
          ...target,
          data: { ...target.data, title: "changed", updated_at: NOW },
        },
      ]);
      prepared.publish(committed(1n, prepared.resources[0]!));
      expect(index.getResource(target.data.id)?.data.title).toBe("changed");
      const statistics = index.inspectStatistics();
      expect(statistics.full_rebuilds).toBe(1);
      expect(statistics.delta_publications).toBe(1);
      expect(statistics.changed_resources).toBe(1);
      return statistics.structural_writes;
    };

    const small = await measure(16);
    const large = await measure(2_048);
    expect(large).toBeLessThanOrEqual(small + 64);
  });

  it("atomically removes old and adds new Mark/Asset/lineage projection keys", () => {
    const target = externalAsset(201, { primary: true });
    const derived = externalAsset(202, { derived_from: target.id });
    const currentResource = resource(3, {
      assets: [target, derived],
      marks: [{ name: "old", type: "tag", value: null }],
      order_index: 0,
    });
    const current = buildCompleteReadModelGeneration([currentResource]);
    const nextResource = resource(3, {
      assets: [target],
      marks: [{ name: "new", type: "tag", value: null }],
      order_index: 0,
    });
    const next = applyCompleteReadModelDelta(current, [nextResource]);

    expect(next.assetById.has(derived.id)).toBe(false);
    expect(next.lineageDependentsByAsset.has(target.id)).toBe(false);
    expect(
      next.resourcesByMark.has(markIdentityKey({ name: "old", type: "tag" })),
    ).toBe(false);
    expect(
      next.resourcesByMark.get(markIdentityKey({ name: "new", type: "tag" })),
    ).toEqual([nextResource.data.id]);
  });
});

describe("publication coordinator", () => {
  it("keeps legacy state cursorless and publishes a local generation delta", () => {
    const coordinator = createReadModelPublicationCoordinator();
    const initial = resource(1, { order_index: 0 });
    coordinator.initializeStatic(buildCompleteReadModelGeneration([initial]));
    const updated = resource(1, { order_index: 0, title: "updated" });
    const state = coordinator
      .prepareLocal([updated])
      .publish(committed(1n, updated));

    expect(state.kind).toBe("static-unsupported");
    expect("cursor" in state).toBe(false);
    expect(
      state.generation.resourcesById.get(initial.data.id)?.data.title,
    ).toBe("updated");
  });

  it("atomically advances exact-next cursor, retains it on jump, and rejects stale candidates", () => {
    const coordinator = createReadModelPublicationCoordinator();
    const initial = resource(1, { order_index: 0 });
    const first = buildCompleteReadModelGeneration([initial]);
    coordinator.initializeSynchronized(first, null);
    const external = resource(1, { order_index: 0, title: "external" });
    const stale = coordinator.candidate(
      applyCompleteReadModelDelta(first, [external]),
      journalSequence(1n),
    );

    const local = resource(1, { order_index: 0, title: "local" });
    const exact = coordinator
      .prepareLocal([local])
      .publish(committed(1n, local));
    expect(exact).toMatchObject({ kind: "synchronized", cursor: "1" });
    expect(coordinator.isCursorBehind()).toBe(false);
    expect(
      exact.generation.resourcesById.get(initial.data.id)?.data.title,
    ).toBe("local");
    expect(coordinator.publishCandidate(stale)).toBe(false);

    const jumped = resource(1, { order_index: 0, title: "jumped" });
    const jump = coordinator
      .prepareLocal([jumped])
      .publish(committed(3n, jumped));
    expect(jump).toMatchObject({ kind: "synchronized", cursor: "1" });
    expect(coordinator.isCursorBehind()).toBe(true);
    expect(jump.generation.resourcesById.get(initial.data.id)?.data.title).toBe(
      "jumped",
    );
  });

  it("rejects stale local publication without rebuilding over a newer candidate", () => {
    const coordinator = createReadModelPublicationCoordinator();
    const initial = resource(1, { order_index: 0 });
    coordinator.initializeSynchronized(
      buildCompleteReadModelGeneration([initial]),
      null,
    );
    const local = resource(1, { order_index: 0, title: "local" });
    const preparedLocal = coordinator.prepareLocal([local]);
    const external = resource(1, { order_index: 0, title: "external" });
    const externalCandidate = coordinator.candidate(
      buildCompleteReadModelGeneration([external]),
      journalSequence(1n),
    );
    expect(coordinator.publishCandidate(externalCandidate)).toBe(true);
    expect(() => preparedLocal.publish(committed(2n, local))).toThrow(
      "Prepared local read-model publication is stale",
    );
    expect(
      coordinator.capture().generation.resourcesById.get(initial.data.id)?.data
        .title,
    ).toBe("external");
  });

  it("rejects synchronized candidate cursor regression and removal", () => {
    const coordinator = createReadModelPublicationCoordinator();
    const initial = buildCompleteReadModelGeneration([
      resource(1, { order_index: 0 }),
    ]);
    coordinator.initializeSynchronized(initial, journalSequence(2n));
    expect(() => coordinator.candidate(initial, journalSequence(1n))).toThrow(
      "regresses synchronized authority",
    );
    expect(() => coordinator.candidate(initial, null)).toThrow(
      "regresses synchronized authority",
    );
  });

  it("rejects duplicate or regressive local committed receipt sequences", () => {
    const generation = buildCompleteReadModelGeneration([
      resource(1, { order_index: 0 }),
    ]);
    for (const sequence of [2n, 1n]) {
      const coordinator = createReadModelPublicationCoordinator();
      coordinator.initializeSynchronized(generation, journalSequence(2n));
      const changed = resource(1, { order_index: 0, title: "changed" });
      expect(() =>
        coordinator
          .prepareLocal([changed])
          .publish(committed(sequence, changed)),
      ).toThrow("does not advance journal authority");
      expect(coordinator.capture()).toMatchObject({
        cursor: "2",
        revision: 0,
      });
    }
  });
});

describe("observation ports and deterministic seams", () => {
  it("wires full production composition to the same metadata/change/fault source contracts", async () => {
    const fixture = createDeterministicFullResourceDriver(
      createDeterministicFullDriverBacking(),
    );
    const result = await composeExtensia({
      register(registry) {
        registry.bindValue(FULL_RESOURCE_DRIVER, fixture.adapter);
        registry.use(FULL_RESOURCE_CORE_MODULE);
      },
      exports: {
        actor: singleCapability(READ_MODEL_SYNCHRONIZATION_ACTOR),
        committed: singleCapability(CORE_COMMITTED_CHANGE_OBSERVATION_PORT),
        faults: singleCapability(RUNTIME_FAULT_SINK),
        lifecycle: multiCapability(LIFECYCLE_CONTRIBUTIONS),
        metadata: singleCapability(CORE_METADATA_OBSERVATION_PORT),
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    await expect(
      result.composition.capabilities.actor.refresh(),
    ).resolves.toEqual({ code: "MODULE_NOT_READY", ok: false });
    await result.composition.capabilities.lifecycle[0]!.start();
    await expect(
      result.composition.capabilities.actor.refresh(),
    ).resolves.toMatchObject({ attempts: 1, changed: false, ok: true });
    await expect(
      result.composition.capabilities.metadata.observeMetadata({
        kind: "storage-complete",
      }),
    ).resolves.toMatchObject({ kind: "storage-complete", resources: [] });
    await expect(
      result.composition.capabilities.committed.observeCommittedChanges({
        after: null,
        attempt_admission_deadline_monotonic_ms: 100,
        incremental_entry_limit: 256,
        incremental_resource_limit: 256,
      }),
    ).resolves.toMatchObject({ kind: "at-head", observed_head: null });
    expect(result.composition.capabilities.faults.failed).toBe(false);
    await result.composition.capabilities.lifecycle[0]!.stop();
    await result.composition.dispose();
  });

  it("supports deterministic barriers/faults with detached semantic metadata", async () => {
    const original = resource(1, { order_index: 0, title: "original" });
    const adapter = createDeterministicMetadataObservationAdapter([original]);
    const barrier = createDeterministicObservationBarrier();
    adapter.blockNext(barrier);
    const pending = adapter.port.observeMetadata({
      id: original.data.id,
      kind: "resource-point",
    });
    await barrier.entered;
    adapter.replace([resource(1, { order_index: 0, title: "replacement" })]);
    barrier.release();
    const observed = await pending;
    expect(observed).toMatchObject({
      kind: "resource-point",
      resource: { data: { title: "replacement" } },
    });
    if (observed.kind === "resource-point" && observed.resource !== null) {
      expect(Object.isFrozen(observed.resource)).toBe(true);
      expect(() => {
        observed.resource!.data.title = "caller mutation";
      }).toThrow(TypeError);
    }
    expect(
      await adapter.port.observeMetadata({
        id: original.data.id,
        kind: "resource-point",
      }),
    ).toMatchObject({ resource: { data: { title: "replacement" } } });
    adapter.failNext(new Error("fault"));
    await expect(
      adapter.port.observeMetadata({ kind: "storage-complete" }),
    ).rejects.toThrow("fault");
    expect(adapter.reads).toBe(3);
  });

  it("uses one legacy readonly Resource stream without a skew-prone proof read", async () => {
    let reads = 0;
    const snapshot = resource(1, { order_index: 0 });
    const port = createReadonlyMetadataObservationPort({
      async *listResources() {
        reads += 1;
        yield snapshot;
      },
    });
    const result = await port.observeMetadata({ kind: "storage-complete" });
    expect(result).toMatchObject({ kind: "storage-complete" });
    expect(reads).toBe(1);
  });

  it("observes a coherent full-driver delta and at-head state through the same source contract", async () => {
    const backing = createDeterministicFullDriverBacking();
    const fixture = createDeterministicFullResourceDriver(backing);
    await fixture.adapter.open();
    const snapshot = resource(1, { order_index: 0 });
    const session = await fixture.adapter.acquireStorageSession();
    const transaction = await session.begin(id(70_001));
    await transaction.stageResource(snapshot);
    const draft: CommittedOperationDraft = {
      actor_id: id(70_000),
      affected_resources: [snapshot.data.id],
      changes: [{ kind: "resource.upsert", resource_id: snapshot.data.id }],
      committed_at: NOW,
      operation_id: id(70_001),
      schema_version: 1,
      type: "resource.create",
      write_set_fingerprint: computeResourceWriteSetFingerprint([snapshot]),
    };
    const entry = await transaction.commit(draft);
    await session.release();

    const port = createFullCommittedChangeObservationPort(fixture.adapter);
    const request = {
      after: null,
      attempt_admission_deadline_monotonic_ms: 100,
      incremental_entry_limit: 256 as const,
      incremental_resource_limit: 256 as const,
    };
    await expect(port.observeCommittedChanges(request)).resolves.toMatchObject({
      entries: [{ operation_id: draft.operation_id, sequence: "1" }],
      kind: "delta",
      observed_head: "1",
      resources: [{ data: { id: snapshot.data.id } }],
    });
    await expect(
      port.observeCommittedChanges({ ...request, after: entry.sequence }),
    ).resolves.toMatchObject({ kind: "at-head", observed_head: "1" });
    await expect(
      port.observeCommittedChanges({
        ...request,
        after: journalSequence(2n),
      }),
    ).rejects.toThrow("ahead of the observed journal head");
    await fixture.adapter.close();
  });

  it("provides deterministic committed-change barriers and faults", async () => {
    const observation = Object.freeze({
      kind: "at-head" as const,
      observed_head: null,
      observation_stamp: buildCompleteReadModelGeneration([]).observationStamp,
    });
    const adapter =
      createDeterministicCommittedChangeObservationAdapter(observation);
    const barrier = createDeterministicObservationBarrier();
    adapter.blockNext(barrier);
    const pending = adapter.port.observeCommittedChanges({
      after: null,
      attempt_admission_deadline_monotonic_ms: 100,
      incremental_entry_limit: 256,
      incremental_resource_limit: 256,
    });
    await barrier.entered;
    let settled = false;
    void pending.finally(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    barrier.release();
    const observed = await pending;
    expect(observed).toEqual(observation);
    expect(observed).not.toBe(observation);
    expect(Object.isFrozen(observed)).toBe(true);
    adapter.failNext(new Error("committed fault"));
    await expect(
      adapter.port.observeCommittedChanges({
        after: null,
        attempt_admission_deadline_monotonic_ms: 100,
        incremental_entry_limit: 256,
        incremental_resource_limit: 256,
      }),
    ).rejects.toThrow("committed fault");
    expect(adapter.reads).toBe(2);
  });
});

describe("RuntimeFaultSink", () => {
  it("closes intake synchronously, keeps the first typed fault, and drains cleanup once", async () => {
    const events: string[] = [];
    const sink = createRuntimeFaultSink({
      closeIntake: () => events.push("close-intake"),
      cleanup: async (fault) => {
        events.push(`cleanup:${fault.code}`);
      },
    });
    sink.report({ kind: "integrity", code: "RESOURCE_INDEX_INTEGRITY" });
    sink.report({ kind: "fatal-runtime", code: "READ_MODEL_RUNTIME_FAILED" });
    expect(sink.failed).toBe(true);
    expect(sink.fault).toEqual({
      kind: "integrity",
      code: "RESOURCE_INDEX_INTEGRITY",
    });
    expect(events).toEqual(["close-intake"]);
    await sink.drain();
    expect(events).toEqual([
      "close-intake",
      "cleanup:RESOURCE_INDEX_INTEGRITY",
    ]);
  });

  it("fail-closes the composed Core read/write and Facade boundary synchronously", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const result = await composeExtensia({
      register(registry) {
        registry.bindValue(FULL_RESOURCE_DRIVER, fixture.adapter);
        registry.use(FULL_RESOURCE_CORE_MODULE);
        registry.use(FULL_DEFAULT_API_SYSTEM_EXTENSION_MODULE);
        registry.use(DEFAULT_API_FACADE_REGISTRY_MODULE);
      },
      exports: {
        facades: singleCapability(FACADE_REGISTRY_ACCESS),
        faults: singleCapability(RUNTIME_FAULT_SINK),
        lifecycle: multiCapability(LIFECYCLE_CONTRIBUTIONS),
        reads: singleCapability(CORE_RESOURCE_READ_PORT),
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const host = createRuntimeLifecycleHost(result.composition);
    await expect(host.start()).resolves.toMatchObject({ ok: true });
    expect(
      result.composition.capabilities.facades.get(QUERY_FACADE),
    ).not.toBeNull();

    result.composition.capabilities.faults.report({
      code: "RESOURCE_INDEX_INTEGRITY",
      kind: "integrity",
    });

    expect(
      result.composition.capabilities.facades.get(QUERY_FACADE),
    ).toBeNull();
    await expect(
      result.composition.capabilities.reads.read({
        id: id(1),
        type: "resource.get",
      }),
    ).rejects.toThrow("not ready");
    await expect(host.stop()).resolves.toMatchObject({ ok: true });
    await result.composition.dispose();
  });

  it("routes production post-commit cleanup failure through the common fault sink", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const result = await composeExtensia({
      register(registry) {
        registry.bindValue(FULL_RESOURCE_DRIVER, fixture.adapter);
        registry.use(FULL_RESOURCE_CORE_MODULE);
        registry.use(FULL_DEFAULT_API_SYSTEM_EXTENSION_MODULE);
        registry.use(DEFAULT_API_FACADE_REGISTRY_MODULE);
      },
      exports: {
        facades: singleCapability(FACADE_REGISTRY_ACCESS),
        faults: singleCapability(RUNTIME_FAULT_SINK),
        lifecycle: multiCapability(LIFECYCLE_CONTRIBUTIONS),
        reads: singleCapability(CORE_RESOURCE_READ_PORT),
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const host = createRuntimeLifecycleHost(result.composition);
    await expect(host.start()).resolves.toMatchObject({ ok: true });
    const storage = result.composition.capabilities.facades.get(STORAGE_FACADE);
    expect(storage).not.toBeNull();
    if (storage === null) throw new Error("Storage facade is unavailable");
    fixture.failNext("session.release");

    await expect(
      storage.createResource({ title: "committed before cleanup failure" }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        committed: true,
        warnings: [{ code: "POST_COMMIT_CLEANUP_FAILED" }],
      },
    });

    expect(result.composition.capabilities.faults).toMatchObject({
      failed: true,
      fault: {
        code: "READ_MODEL_RUNTIME_FAILED",
        kind: "fatal-runtime",
      },
    });
    expect(
      result.composition.capabilities.facades.get(QUERY_FACADE),
    ).toBeNull();
    await expect(
      result.composition.capabilities.reads.read({
        id: id(1),
        type: "resource.get",
      }),
    ).rejects.toThrow("not ready");
    await expect(
      result.composition.capabilities.faults.drain(),
    ).resolves.toBeUndefined();
    await expect(host.stop()).resolves.toMatchObject({ ok: true });
    await result.composition.dispose();
  });
});
