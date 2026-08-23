import { describe, expect, it } from "vitest";

import {
  createExtensia,
  defineFullResourceDriver,
  type IDString,
  type ReadonlyResourceDriver,
  type ResourceSnapshot,
  type Timestamp,
} from "../index.js";
import { ResourceStorageSessionTransientError } from "../storage/full-resource-driver-adapter.js";
import {
  createDeterministicFullDriverBacking,
  createDeterministicFullResourceDriver,
} from "../storage/deterministic-full-resource-driver.js";
import { READONLY_SYNCHRONIZED_OBSERVATION } from "../core/resource-read-runtime.js";
import { createObservationStamp } from "../core/read-model-generation.js";
import type { ReadonlySynchronizedObservationCapability } from "../core/read-model-observation.js";
import { journalSequence } from "../storage/resource-journal-integrity.js";

const ROOT_ID = "550e8400-e29b-41d4-a716-446655440000" as IDString;
const CHILD_ID = "8f14e45f-ea6f-4d7a-923b-966f7356c001" as IDString;
const MISSING_ID = "9f14e45f-ea6f-4d7a-823b-966f7356c002" as IDString;
const NOW = 1_784_294_400_000 as Timestamp;

function resource(
  id: IDString,
  options: Readonly<{
    parentId?: IDString | null;
    orderIndex?: number;
    title?: string;
  }> = {},
): ResourceSnapshot {
  return {
    assets: [],
    data: {
      created_at: NOW,
      description: null,
      hidden: false,
      id,
      is_deleted: false,
      locked: false,
      order_index: options.orderIndex ?? 0,
      parent_id: options.parentId ?? null,
      title: options.title ?? id,
      updated_at: NOW,
    },
    kv: {},
    marks: [],
  };
}

describe("experimental Phase 5 read-model integration", () => {
  it("loads exact lazy point and one-level coverage without partial success", async () => {
    let scans = 0;
    let failScan = false;
    const resources = [
      resource(ROOT_ID, { title: "root" }),
      resource(CHILD_ID, { parentId: ROOT_ID, title: "child" }),
    ];
    const driver: ReadonlyResourceDriver = {
      mode: "readonly",
      async open() {},
      async close() {},
      async *listResources() {
        scans += 1;
        if (failScan) throw new Error("private read failure");
        yield* resources;
      },
    };
    const extensia = createExtensia({
      readModel: { loading: "lazy" },
      storage: { driver },
    });

    await expect(extensia.start()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    expect(scans).toBe(1);
    expect(extensia.inspect().read_model).toMatchObject({
      coverage: "selective",
      lifecycle: "ready",
      loading: "lazy",
    });

    await expect(extensia.query()!.getResource(ROOT_ID)).resolves.toMatchObject(
      {
        ok: true,
        value: { data: { title: "root" } },
      },
    );
    expect(scans).toBe(2);
    await extensia.query()!.getResource(ROOT_ID);
    expect(scans).toBe(2);

    await expect(
      extensia.query()!.getResourceTree(ROOT_ID),
    ).resolves.toMatchObject({
      ok: true,
      value: { children: [{ id: CHILD_ID, order_index: 0 }] },
    });
    expect(scans).toBe(3);
    await extensia.query()!.getResourceTree(ROOT_ID);
    expect(scans).toBe(3);

    await expect(
      extensia.query()!.getResource(MISSING_ID),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NOT_FOUND" },
    });
    expect(scans).toBe(4);
    await extensia.query()!.getResource(MISSING_ID);
    expect(scans).toBe(4);

    failScan = true;
    await expect(
      extensia.query()!.getResource(CHILD_ID),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "STORAGE_READ_FAILED" },
    });
    await extensia.stop();
  });

  it("preserves exact lazy tree coverage after local hierarchy publication", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      readModel: { loading: "lazy" },
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();
    const parent = await extensia
      .storage()!
      .createResource({ title: "parent" });
    const child = await extensia.storage()!.createResource({ title: "child" });
    if (!parent.ok || !child.ok) throw new Error("fixture create failed");
    const moved = await extensia
      .storage()!
      .moveResource(child.value.resource.data.id, {
        order_index: 0,
        parent_id: parent.value.resource.data.id,
      });
    if (!moved.ok) throw new Error("fixture move failed");

    await expect(
      extensia.query()!.getResourceTree(parent.value.resource.data.id),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        children: [{ id: child.value.resource.data.id, order_index: 0 }],
        resource: { data: { id: parent.value.resource.data.id } },
      },
    });
    const deleted = await extensia
      .storage()!
      .deleteResource(child.value.resource.data.id);
    if (!deleted.ok) throw new Error("fixture delete failed");
    await expect(
      extensia.query()!.getResourceTree(parent.value.resource.data.id),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        children: [],
        resource: { data: { id: parent.value.resource.data.id } },
      },
    });
    await extensia.stop();
  });

  it("keeps legacy manual readonly refresh exactly unsupported and descriptor-safe", async () => {
    let optionGetterCalls = 0;
    const driver: ReadonlyResourceDriver = {
      mode: "readonly",
      async open() {},
      async close() {},
      async *listResources() {},
    };
    const extensia = createExtensia({ storage: { driver } });
    expect(Object.isFrozen(extensia.inspect().read_model)).toBe(true);
    expect(Object.isFrozen(extensia.inspect().read_model.synchronization)).toBe(
      true,
    );
    await extensia.start();
    const query = extensia.query()!;
    const hostile = Object.defineProperty({}, "signal", {
      get() {
        optionGetterCalls += 1;
        return new AbortController().signal;
      },
    });
    await expect(query.refresh(hostile as never)).resolves.toMatchObject({
      ok: false,
      error: { code: "READ_MODEL_REFRESH_UNAVAILABLE" },
    });
    expect(optionGetterCalls).toBe(0);
    expect(extensia.inspect().read_model.synchronization).toEqual({
      freshness: "startup",
      last_failure: null,
      last_observed_at: null,
      mode: "manual",
      state: "unsupported",
    });
    await extensia.stop();
    await expect(query.refresh()).resolves.toMatchObject({
      ok: false,
      error: { code: "MODULE_NOT_READY" },
    });
  });

  it("maps explicit full refresh success, no-change, options and cancellation", async () => {
    const backing = createDeterministicFullDriverBacking();
    const writer = createExtensia({
      storage: {
        driver: defineFullResourceDriver(
          createDeterministicFullResourceDriver(backing).adapter,
        ),
      },
    });
    const observer = createExtensia({
      storage: {
        driver: defineFullResourceDriver(
          createDeterministicFullResourceDriver(backing).adapter,
        ),
      },
    });
    await writer.start();
    await observer.start();
    const created = await writer
      .storage()!
      .createResource({ title: "external" });
    if (!created.ok) throw new Error("create failed");
    await expect(
      observer.query()!.getResource(created.value.resource.data.id),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NOT_FOUND" },
    });
    const startupObservedAt =
      observer.inspect().read_model.synchronization.last_observed_at;
    const localAfterGap = await observer
      .storage()!
      .createResource({ title: "local after external gap" });
    if (!localAfterGap.ok) throw new Error("local create failed");
    expect(observer.inspect().read_model.synchronization).toMatchObject({
      freshness: "unknown",
      last_failure: null,
      last_observed_at: startupObservedAt,
      state: "idle",
    });

    await expect(observer.query()!.refresh()).resolves.toEqual({
      ok: true,
      value: { changed: true, observed: true },
    });
    await expect(
      observer.query()!.getResource(created.value.resource.data.id),
    ).resolves.toMatchObject({ ok: true });
    await expect(observer.query()!.refresh()).resolves.toEqual({
      ok: true,
      value: { changed: false, observed: true },
    });
    expect(
      observer.inspect().read_model.synchronization.last_observed_at,
    ).toEqual(expect.any(Number));

    let getterCalls = 0;
    const accessor = Object.defineProperty({}, "signal", {
      get() {
        getterCalls += 1;
        return new AbortController().signal;
      },
    });
    await expect(
      observer.query()!.refresh(accessor as never),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "READ_MODEL_REFRESH_OPTIONS_INVALID" },
    });
    expect(getterCalls).toBe(0);
    await expect(
      observer.query()!.refresh(Object.create(null) as never),
    ).resolves.toEqual({
      ok: true,
      value: { changed: false, observed: true },
    });
    for (const invalidOptions of [
      null,
      [],
      { unknown: true },
      { signal: { aborted: false } },
      Object.create({ signal: new AbortController().signal }),
      { [Symbol("unknown")]: true },
    ]) {
      await expect(
        observer.query()!.refresh(invalidOptions as never),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: "READ_MODEL_REFRESH_OPTIONS_INVALID" },
      });
    }
    const canceled = new AbortController();
    canceled.abort();
    await expect(
      observer.query()!.refresh({ signal: canceled.signal }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "READ_MODEL_REFRESH_CANCELED" },
    });
    await writer.stop();
    await observer.stop();
  });

  it("gives a supported readonly semantic adapter the same refresh result without mutation", async () => {
    let resources: readonly ResourceSnapshot[] = [];
    let head: ReturnType<typeof journalSequence> | null = null;
    const observationEvents: string[] = [];
    const complete = () =>
      Object.freeze({
        asset_readiness: Object.freeze([]),
        kind: "storage-complete" as const,
        observation_stamp: createObservationStamp(),
        resources: Object.freeze([...resources]),
      });
    const synchronization: ReadonlySynchronizedObservationCapability = {
      async observeStartup() {
        observationEvents.push("observe-startup");
        return Object.freeze({ complete: complete(), observed_head: head });
      },
      async observeCommittedChanges(request) {
        observationEvents.push("observe-committed-changes");
        if (request.after === head) {
          return Object.freeze({
            kind: "at-head" as const,
            observation_stamp: createObservationStamp(),
            observed_head: head,
          });
        }
        return Object.freeze({
          complete: complete(),
          kind: "rebuild" as const,
          observed_head: head,
          validated_range: "all-after-cursor-through-head" as const,
        });
      },
    };
    const driver: ReadonlyResourceDriver & {
      readonly [READONLY_SYNCHRONIZED_OBSERVATION]: ReadonlySynchronizedObservationCapability;
    } = {
      mode: "readonly",
      [READONLY_SYNCHRONIZED_OBSERVATION]: synchronization,
      async open() {
        observationEvents.push("open");
      },
      async close() {
        observationEvents.push("close");
      },
      async *listResources() {
        observationEvents.push("list-resources");
        yield* resources;
      },
    };
    const extensia = createExtensia({ storage: { driver } });
    await extensia.start();
    resources = [resource(ROOT_ID, { title: "readonly external" })];
    head = journalSequence(1n);
    const authorityBeforeRefresh = Object.freeze({ head, resources });

    await expect(extensia.query()!.refresh()).resolves.toEqual({
      ok: true,
      value: { changed: true, observed: true },
    });
    await expect(extensia.query()!.getResource(ROOT_ID)).resolves.toMatchObject(
      {
        ok: true,
        value: { data: { title: "readonly external" } },
      },
    );
    expect({ head, resources }).toEqual(authorityBeforeRefresh);
    expect(observationEvents).toEqual([
      "open",
      "observe-startup",
      "observe-committed-changes",
    ]);
    expect(extensia.inspect().read_model.synchronization).toMatchObject({
      freshness: "observed",
      mode: "manual",
      state: "idle",
    });
    await extensia.stop();
    expect({ head, resources }).toEqual(authorityBeforeRefresh);
    expect(observationEvents).toEqual([
      "open",
      "observe-startup",
      "observe-committed-changes",
      "close",
    ]);
  });

  it("classifies malformed supported readonly startup authority as integrity", async () => {
    const duplicateAssetId = ROOT_ID;
    const proof = Object.freeze({
      asset_id: duplicateAssetId,
      has_committed_representation: true,
    });
    const synchronization: ReadonlySynchronizedObservationCapability = {
      async observeStartup() {
        return Object.freeze({
          complete: Object.freeze({
            asset_readiness: Object.freeze([proof, proof]),
            kind: "storage-complete" as const,
            observation_stamp: createObservationStamp(),
            resources: Object.freeze([]),
          }),
          observed_head: null,
        });
      },
      async observeCommittedChanges() {
        throw new Error("refresh must not be reachable after failed startup");
      },
    };
    const driver: ReadonlyResourceDriver & {
      readonly [READONLY_SYNCHRONIZED_OBSERVATION]: ReadonlySynchronizedObservationCapability;
    } = {
      mode: "readonly",
      [READONLY_SYNCHRONIZED_OBSERVATION]: synchronization,
      async open() {},
      async close() {},
      async *listResources() {},
    };
    const extensia = createExtensia({ storage: { driver } });

    await expect(extensia.start()).resolves.toMatchObject({
      error: { code: "START_FAILED" },
      ok: false,
    });
    expect(extensia.query()).toBeNull();
    expect(extensia.inspect().read_model).toMatchObject({
      coverage: "none",
      lifecycle: "failed",
      synchronization: {
        freshness: "failed",
        last_failure: "integrity",
        state: "failed",
      },
    });
    await extensia.stop();
  });

  it("maps exact exhausted outcome and retry category", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      readModel: {
        synchronization: { retry: { maxAttempts: 1 } },
      },
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();
    fixture.failNext(
      "session.acquire",
      new ResourceStorageSessionTransientError("lock"),
    );
    await expect(extensia.query()!.refresh()).resolves.toEqual({
      ok: false,
      error: {
        code: "READ_MODEL_REFRESH_EXHAUSTED",
        last_failure: "storage-lock",
        message: "Read-model refresh exhausted its retry budget",
        reason: "attempts",
      },
    });
    expect(extensia.inspect().read_model.synchronization).toMatchObject({
      last_failure: "retry-exhausted",
      state: "degraded",
    });
    await extensia.stop();
  });

  it("uses the same bounded actor for supported startup observation", async () => {
    const fixture = createDeterministicFullResourceDriver();
    fixture.failNext(
      "session.acquire",
      new ResourceStorageSessionTransientError("unavailable"),
    );
    const extensia = createExtensia({
      readModel: {
        synchronization: { retry: { maxAttempts: 1 } },
      },
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });

    await expect(extensia.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "START_FAILED" },
    });
    expect(extensia.query()).toBeNull();
    expect(extensia.inspect()).toMatchObject({
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          code: "READ_MODEL_STARTUP_OBSERVATION_EXHAUSTED",
        }),
      ]),
      read_model: {
        lifecycle: "failed",
        synchronization: {
          freshness: "failed",
          last_failure: "retry-exhausted",
          state: "failed",
        },
      },
    });
    await extensia.stop();
  });

  it("validates nested config descriptors, defaults and polling constraints before open", async () => {
    const invalidConfigs: unknown[] = [
      { storage: { driver: null }, readModel: [] },
      { storage: { driver: null }, readModel: { unknown: true } },
      { storage: { driver: null }, readModel: { loading: "partial" } },
      { storage: { driver: null }, readModel: { loading: null } },
      {
        storage: { driver: null },
        readModel: { synchronization: { mode: null } },
      },
      {
        storage: { driver: null },
        readModel: { synchronization: { retry: { maxAttempts: 0 } } },
      },
      ...["maxAttempts", "deadlineMs", "initialDelayMs", "maxDelayMs"].map(
        (key) => ({
          storage: { driver: null },
          readModel: { synchronization: { retry: { [key]: null } } },
        }),
      ),
      {
        storage: { driver: null },
        readModel: Object.defineProperty({}, "loading", {
          get() {
            throw new Error("config accessor must not run");
          },
        }),
      },
      {
        storage: { driver: null },
        readModel: {
          synchronization: {
            mode: "polling",
            polling: { intervalMs: 500, maxBackoffMs: 499 },
          },
        },
      },
      {
        storage: { driver: null },
        readModel: {
          synchronization: {
            mode: "polling",
            polling: { intervalMs: 500, maxBackoffMs: null },
          },
        },
      },
      {
        storage: { driver: null },
        readModel: {
          synchronization: {
            retry: { deadlineMs: 100, initialDelayMs: 101 },
          },
        },
      },
      {
        storage: { driver: null },
        readModel: { synchronization: { mode: "manual", polling: undefined } },
      },
      {
        storage: { driver: null },
        readModel: { synchronization: { mode: "polling" } },
      },
      {
        storage: { driver: null },
        readModel: {
          synchronization: {
            mode: "polling",
            polling: { intervalMs: 249 },
          },
        },
      },
    ];
    for (const candidate of invalidConfigs) {
      const opened: string[] = [];
      const driver: ReadonlyResourceDriver = {
        mode: "readonly",
        async open() {
          opened.push("open");
        },
        async close() {},
        async *listResources() {},
      };
      (candidate as { storage: { driver: unknown } }).storage.driver = driver;
      const module = createExtensia(candidate as never);
      await expect(module.start()).resolves.toMatchObject({
        ok: false,
        error: { code: "CONFIG_INVALID" },
      });
      expect(opened).toEqual([]);
    }

    const events: string[] = [];
    const pollingDriver: ReadonlyResourceDriver = {
      mode: "readonly",
      async open() {
        events.push("open");
      },
      async close() {
        events.push("close");
      },
      async *listResources() {},
    };
    const polling = createExtensia({
      readModel: {
        synchronization: {
          mode: "polling",
          polling: { intervalMs: 60_001 },
        },
      },
      storage: { driver: pollingDriver },
    });
    await expect(polling.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "START_FAILED" },
    });
    expect(events).toEqual([]);

    const defaultsFixture = createDeterministicFullResourceDriver();
    const defaults = createExtensia({
      readModel: {
        synchronization: { retry: { deadlineMs: 100 } },
      },
      storage: { driver: defineFullResourceDriver(defaultsFixture.adapter) },
    });
    await expect(defaults.start()).resolves.toMatchObject({ ok: true });
    await defaults.stop();
  });
});
