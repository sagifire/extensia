import { describe, expect, it } from "vitest";

import { createExtensia, defineFullResourceDriver } from "../index.js";
import { createDeterministicFullResourceDriver } from "../storage/deterministic-full-resource-driver.js";

describe("public Resource create slice", () => {
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

  it("rejects a malformed resolved commit instead of declaring success", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const driver = defineFullResourceDriver({
      open: () => fixture.adapter.open(),
      close: () => fixture.adapter.close(),
      async acquireStorageSession(signal) {
        const session = await fixture.adapter.acquireStorageSession(signal);
        return {
          ...session,
          async begin(operationId) {
            const transaction = await session.begin(operationId);
            return {
              ...transaction,
              async commit(draft) {
                await transaction.commit(draft);
                return undefined as never;
              },
            };
          },
        };
      },
    });
    const extensia = createExtensia({ storage: { driver } });
    await extensia.start();
    await expect(
      extensia.storage()!.createResource({ title: "malformed commit" }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "STORAGE_WRITE_FAILED" },
    });
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
