import { describe, expect, it } from "vitest";

import { createExtensia, defineFullResourceDriver } from "../index.js";
import {
  createDeterministicFullDriverBacking,
  createDeterministicFullResourceDriver,
} from "../storage/deterministic-full-resource-driver.js";

describe("public Resource create slice", () => {
  it("publishes only the local effect after a manual-mode sequence jump", async () => {
    const backing = createDeterministicFullDriverBacking();
    const firstFixture = createDeterministicFullResourceDriver(backing);
    const secondFixture = createDeterministicFullResourceDriver(backing);
    const first = createExtensia({
      storage: { driver: defineFullResourceDriver(firstFixture.adapter) },
    });
    const second = createExtensia({
      storage: { driver: defineFullResourceDriver(secondFixture.adapter) },
    });
    await first.start();
    await second.start();
    const external = await first
      .storage()!
      .createResource({ title: "external" });
    const local = await second.storage()!.createResource({ title: "local" });
    if (!external.ok || !local.ok) throw new Error("create failed");
    expect(local.value.resource.data.order_index).toBe(1);
    await expect(
      second.query()!.getResource(local.value.resource.data.id),
    ).resolves.toMatchObject({
      ok: true,
      value: { data: { title: "local" } },
    });
    await expect(
      second.query()!.getResource(external.value.resource.data.id),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NOT_FOUND" },
    });
    await first.stop();
    await second.stop();
    const restarted = createExtensia({
      storage: {
        driver: defineFullResourceDriver(
          createDeterministicFullResourceDriver(backing).adapter,
        ),
      },
    });
    await restarted.start();
    await expect(
      restarted.query()!.getResource(external.value.resource.data.id),
    ).resolves.toMatchObject({ ok: true });
    await restarted.stop();
  });

  it("classifies a malformed acquired session as integrity and fail-closes", async () => {
    const fixture = createDeterministicFullResourceDriver();
    let acquisitions = 0;
    const driver = defineFullResourceDriver({
      open: () => fixture.adapter.open(),
      close: () => fixture.adapter.close(),
      async acquireStorageSession(signal) {
        acquisitions += 1;
        if (acquisitions > 1) return {} as never;
        return fixture.adapter.acquireStorageSession(signal);
      },
    });
    const extensia = createExtensia({ storage: { driver } });
    await extensia.start();
    await expect(
      extensia.storage()!.createResource({ title: "invalid session" }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "STORAGE_INTEGRITY_FAILED" },
    });
    expect(extensia.getState()).toBe("failed");
    await extensia.stop();
  });

  it("classifies duplicate stored Resource IDs as integrity", async () => {
    const fixture = createDeterministicFullResourceDriver();
    let duplicate = false;
    const driver = defineFullResourceDriver({
      open: () => fixture.adapter.open(),
      close: () => fixture.adapter.close(),
      async acquireStorageSession(signal) {
        const session = await fixture.adapter.acquireStorageSession(signal);
        return {
          ...session,
          async *listResources() {
            const resources = [];
            for await (const resource of session.listResources())
              resources.push(resource);
            yield* resources;
            if (duplicate) yield* resources;
          },
        };
      },
    });
    const extensia = createExtensia({ storage: { driver } });
    await extensia.start();
    const first = await extensia.storage()!.createResource({ title: "first" });
    if (!first.ok) throw new Error("create failed");
    duplicate = true;
    await expect(
      extensia.storage()!.createResource({ title: "second" }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "STORAGE_INTEGRITY_FAILED" },
    });
    expect(extensia.getState()).toBe("failed");
    await extensia.stop();
  });

  it("commits one root Resource and immediately reads back a detached snapshot", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const driver = defineFullResourceDriver(fixture.adapter);
    expect(Object.keys(driver)).toEqual(["mode"]);
    expect("open" in driver).toBe(false);

    const extensia = createExtensia({ storage: { driver } });
    await expect(extensia.start()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    const created = await extensia
      .storage()!
      .createResource({ title: " Root ", description: "description" });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error("create failed");
    expect(created.value).toMatchObject({
      committed: true,
      resource: {
        data: {
          title: " Root ",
          description: "description",
          locked: false,
          hidden: false,
          is_deleted: false,
          parent_id: null,
          order_index: 0,
        },
        assets: [],
        marks: [],
        kv: {},
      },
      warnings: [],
    });
    const durable = fixture.inspect();
    expect(durable.resources).toHaveLength(1);
    expect(durable.journal).toHaveLength(1);
    expect(durable.journal[0]).toMatchObject({
      type: "resource.create",
      operation_id: created.value.operation_id,
    });

    (created.value.resource.data as { title: string }).title = "mutated";
    const readBack = await extensia
      .query()!
      .getResource(created.value.resource.data.id);
    expect(readBack).toMatchObject({
      ok: true,
      value: { data: { title: " Root " } },
    });
    await extensia.stop();
  });

  it("checks readonly capability before inspecting hostile input", async () => {
    let inspected = false;
    const extensia = createExtensia({
      storage: {
        driver: {
          mode: "readonly",
          async open() {},
          async close() {},
          async *listResources() {},
        },
      },
    });
    await extensia.start();
    const input = Object.defineProperty({}, "title", {
      get() {
        inspected = true;
        throw new Error("must not inspect");
      },
    });
    await expect(
      extensia.storage()!.createResource(input as { title: string }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "STORAGE_READONLY" },
    });
    expect(inspected).toBe(false);
    await extensia.stop();
  });

  it("returns committed cleanup warning and fail-closes Module/facades", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();
    const staleQuery = extensia.query()!;
    fixture.failNext("session.release");
    const created = await extensia
      .storage()!
      .createResource({ title: "committed" });
    expect(created).toMatchObject({
      ok: true,
      value: {
        committed: true,
        warnings: [{ code: "POST_COMMIT_CLEANUP_FAILED" }],
      },
    });
    expect(extensia.getState()).toBe("failed");
    expect(extensia.query()).toBeNull();
    await expect(
      staleQuery.getResource("550e8400-e29b-41d4-a716-446655440000"),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "MODULE_NOT_READY" },
    });
    await extensia.stop();
  });

  it("normalizes hostile driver mode access without invoking it", async () => {
    let inspected = false;
    const driver = Object.defineProperty({}, "mode", {
      get() {
        inspected = true;
        throw new Error("must not escape");
      },
    });
    const extensia = createExtensia({ storage: { driver: driver as never } });
    await expect(extensia.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "CONFIG_INVALID" },
    });
    expect(inspected).toBe(false);
  });

  it("normalizes malformed full-driver session shapes at startup", async () => {
    const driver = defineFullResourceDriver({
      async open() {},
      async close() {},
      async acquireStorageSession() {
        return {} as never;
      },
    });
    const extensia = createExtensia({ storage: { driver } });
    await expect(extensia.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "START_FAILED" },
    });
  });

  it("preserves committed success and fail-closes on a malformed resolved receipt", async () => {
    const fixture = createDeterministicFullResourceDriver();
    let unblockRelease!: () => void;
    const releaseGate = new Promise<void>((resolve) => {
      unblockRelease = resolve;
    });
    let delayRelease = false;
    const driver = defineFullResourceDriver({
      open: () => fixture.adapter.open(),
      close: () => fixture.adapter.close(),
      async acquireStorageSession(signal) {
        const session = await fixture.adapter.acquireStorageSession(signal);
        return {
          ...session,
          async release() {
            if (delayRelease) await releaseGate;
            await session.release();
          },
          async begin(operationId) {
            const transaction = await session.begin(operationId);
            return {
              ...transaction,
              async commit(draft) {
                await transaction.commit(draft);
                delayRelease = true;
                return undefined as never;
              },
            };
          },
        };
      },
    });
    const extensia = createExtensia({ storage: { driver } });
    await extensia.start();
    const pending = extensia
      .storage()!
      .createResource({ title: "malformed commit" });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(extensia.getState()).toBe("failed");
    unblockRelease();
    await expect(pending).resolves.toMatchObject({
      ok: true,
      value: {
        committed: true,
        warnings: [{ code: "LOCAL_INDEX_PUBLICATION_FAILED" }],
      },
    });
    expect(fixture.inspect().resources).toHaveLength(1);
    expect(fixture.inspect().journal).toHaveLength(1);
    expect(extensia.getState()).toBe("failed");
    await extensia.stop();
  });

  it("normalizes hostile traps and rejects inherited payload in full mode", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();

    const hostile = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error("must not escape");
        },
      },
    );
    await expect(
      extensia.storage()!.createResource(hostile as { title: string }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_INPUT_INVALID" },
    });

    const inherited = Object.assign(
      Object.create({ description: "inherited" }) as object,
      { title: "own title" },
    );
    await expect(
      extensia.storage()!.createResource(inherited as { title: string }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_INPUT_INVALID" },
    });
    expect(fixture.inspect().journal).toHaveLength(0);
    await extensia.stop();
  });

  it.each([
    null,
    [],
    {},
    { title: "" },
    { title: "   " },
    { title: "ok", extra: true },
    { title: "ok", description: 1 },
  ])("rejects invalid exact input %#", async (input) => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();
    await expect(
      extensia.storage()!.createResource(input as { title: string }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_INPUT_INVALID" },
    });
    expect(fixture.inspect().journal).toHaveLength(0);
    await extensia.stop();
  });
});
