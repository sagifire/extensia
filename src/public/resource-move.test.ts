import { describe, expect, it } from "vitest";

import { createExtensia, defineFullResourceDriver } from "../index.js";
import { createDeterministicFullResourceDriver } from "../storage/deterministic-full-resource-driver.js";

describe("public Resource hierarchy/move slice", () => {
  it("appends roots and atomically moves across parents with dense groups", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();
    const first = await extensia.storage()!.createResource({ title: "first" });
    const second = await extensia
      .storage()!
      .createResource({ title: "second" });
    const third = await extensia.storage()!.createResource({ title: "third" });
    if (!first.ok || !second.ok || !third.ok) throw new Error("create failed");
    expect(
      [first, second, third].map(
        (item) => item.ok && item.value.resource.data.order_index,
      ),
    ).toEqual([0, 1, 2]);

    const moved = await extensia
      .storage()!
      .moveResource(third.value.resource.data.id, {
        parent_id: first.value.resource.data.id,
        order_index: 0,
      });
    expect(moved).toMatchObject({
      ok: true,
      value: {
        resource: {
          data: { parent_id: first.value.resource.data.id, order_index: 0 },
        },
      },
    });
    const durable = fixture.inspect();
    expect(durable.journal.at(-1)).toMatchObject({
      type: "resource.move",
      affected_resources: [third.value.resource.data.id],
    });
    expect(
      durable.resources
        .filter((item) => item.data.parent_id === null)
        .map((item) => item.data.order_index)
        .sort(),
    ).toEqual([0, 1]);
    await extensia.stop();
  });

  it("rejects no-change, range, missing parent and cycle without a transaction", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();
    const parent = await extensia
      .storage()!
      .createResource({ title: "parent" });
    const child = await extensia.storage()!.createResource({ title: "child" });
    if (!parent.ok || !child.ok) throw new Error("create failed");
    await extensia.storage()!.moveResource(child.value.resource.data.id, {
      parent_id: parent.value.resource.data.id,
      order_index: 0,
    });
    const before = fixture.inspect().journal.length;
    await expect(
      extensia.storage()!.moveResource(child.value.resource.data.id, {
        parent_id: parent.value.resource.data.id,
        order_index: 0,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NO_CHANGES" },
    });
    await expect(
      extensia.storage()!.moveResource(child.value.resource.data.id, {
        parent_id: null,
        order_index: 5,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_ORDER_OUT_OF_RANGE" },
    });
    await expect(
      extensia.storage()!.moveResource(parent.value.resource.data.id, {
        parent_id: child.value.resource.data.id,
        order_index: 0,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_MOVE_CYCLE" },
    });
    await expect(
      extensia.storage()!.moveResource(child.value.resource.data.id, {
        parent_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        order_index: 0,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_PARENT_NOT_FOUND" },
    });
    expect(fixture.inspect().journal).toHaveLength(before);
    await extensia.stop();
  });

  it("checks readonly before inspecting move input", async () => {
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
    const hostile = Object.defineProperty({}, "parent_id", {
      get() {
        inspected = true;
        throw new Error("no");
      },
    });
    await expect(
      extensia.storage()!.moveResource("not-an-id", hostile as never),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "STORAGE_READONLY" },
    });
    expect(inspected).toBe(false);
    await extensia.stop();
  });

  it("rejects non-enumerable exact move fields", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();
    const created = await extensia.storage()!.createResource({ title: "root" });
    if (!created.ok) throw new Error("create failed");
    const input = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(input, "parent_id", {
      value: null,
      enumerable: false,
    });
    Object.defineProperty(input, "order_index", { value: 0, enumerable: true });
    await expect(
      extensia
        .storage()!
        .moveResource(created.value.resource.data.id, input as never),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_INPUT_INVALID" },
    });
    await extensia.stop();
  });

  it("maps proven storage integrity separately and fail-closes facades", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();
    const created = await extensia.storage()!.createResource({ title: "root" });
    if (!created.ok) throw new Error("create failed");
    const staleStorage = extensia.storage()!;
    fixture.corruptJournal((journal) => {
      journal[0] = { ...journal[0]!, sequence: "2" as never };
    });
    await expect(
      staleStorage.moveResource(created.value.resource.data.id, {
        parent_id: null,
        order_index: 0,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "STORAGE_INTEGRITY_FAILED" },
    });
    expect(extensia.getState()).toBe("failed");
    expect(extensia.storage()).toBeNull();
    expect(extensia.inspect().diagnostics).toEqual([
      expect.objectContaining({
        code: "RESOURCE_STORAGE_INTEGRITY",
        stage: "operation",
        subject: expect.any(String),
      }),
    ]);
    await expect(
      staleStorage.moveResource(created.value.resource.data.id, {
        parent_id: null,
        order_index: 0,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "MODULE_NOT_READY" },
    });
    await extensia.stop();
  });
});
