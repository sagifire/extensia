import { describe, expect, it } from "vitest";

import { createExtensia, defineFullResourceDriver } from "../index.js";
import {
  createDeterministicFullDriverBacking,
  createDeterministicFullResourceDriver,
} from "../storage/deterministic-full-resource-driver.js";

async function startedFixture() {
  const fixture = createDeterministicFullResourceDriver();
  const extensia = createExtensia({
    storage: { driver: defineFullResourceDriver(fixture.adapter) },
  });
  await extensia.start();
  const created = await extensia.storage()!.createResource({
    title: "before",
    description: "old",
  });
  if (!created.ok) throw new Error("fixture create failed");
  return { extensia, fixture, created: created.value };
}

describe("public Resource update slice", () => {
  it("commits one exact own-metadata update and returns detached read-back", async () => {
    const { extensia, fixture, created } = await startedFixture();
    const updated = await extensia
      .storage()!
      .updateResource(created.resource.data.id, {
        title: " after ",
        description: null,
      });
    expect(updated).toMatchObject({
      ok: true,
      value: {
        committed: true,
        resource: { data: { title: " after ", description: null } },
        warnings: [],
      },
    });
    if (!updated.ok) throw new Error("update failed");
    expect(updated.value.resource.data.created_at).toBe(
      created.resource.data.created_at,
    );
    expect(updated.value.resource.data.updated_at).toBeGreaterThanOrEqual(
      created.resource.data.updated_at,
    );
    expect(fixture.inspect().journal.map((entry) => entry.type)).toEqual([
      "resource.create",
      "resource.update",
    ]);
    (updated.value.resource.data as { title: string }).title = "mutated";
    await expect(
      extensia.query()!.getResource(created.resource.data.id),
    ).resolves.toMatchObject({
      ok: true,
      value: { data: { title: " after " } },
    });
    await extensia.stop();
  });

  it("returns invalid, missing, and effective no-change outcomes without a commit", async () => {
    const { extensia, fixture, created } = await startedFixture();
    const journalLength = fixture.inspect().journal.length;
    await expect(
      extensia.storage()!.updateResource("invalid", { title: "next" }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_RESOURCE_ID" },
    });
    await expect(
      extensia
        .storage()!
        .updateResource("550e8400-e29b-41d4-a716-446655440000", {
          title: "next",
        }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NOT_FOUND" },
    });
    await expect(
      extensia.storage()!.updateResource(created.resource.data.id, {
        title: "before",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NO_CHANGES" },
    });
    expect(fixture.inspect().journal).toHaveLength(journalLength);
    await extensia.stop();
  });

  it.each([
    null,
    [],
    {},
    { title: "" },
    { title: "   " },
    { description: 1 },
    { title: "next", extra: true },
  ])("rejects invalid exact patch %#", async (patch) => {
    const { extensia, fixture, created } = await startedFixture();
    const journalLength = fixture.inspect().journal.length;
    await expect(
      extensia
        .storage()!
        .updateResource(created.resource.data.id, patch as { title?: string }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_INPUT_INVALID" },
    });
    expect(fixture.inspect().journal).toHaveLength(journalLength);
    await extensia.stop();
  });

  it("checks readonly capability before inspecting ID or patch", async () => {
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
    const patch = new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error("inspected");
        },
      },
    );
    await expect(
      extensia.storage()!.updateResource("invalid", patch),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "STORAGE_READONLY" },
    });
    await extensia.stop();
  });

  it("normalizes hostile traps and rejects inherited payload in full mode", async () => {
    const { extensia, created } = await startedFixture();
    const hostilePatches = [
      new Proxy(
        {},
        {
          ownKeys: () => {
            throw new Error("ownKeys trap");
          },
        },
      ),
      new Proxy(
        { title: "next" },
        {
          getOwnPropertyDescriptor: () => {
            throw new Error("descriptor trap");
          },
        },
      ),
      Object.assign(Object.create({ extra: true }) as object, {
        title: "next",
      }),
    ];
    for (const patch of hostilePatches) {
      await expect(
        extensia.storage()!.updateResource(created.resource.data.id, patch),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: "RESOURCE_INPUT_INVALID" },
      });
    }
    await extensia.stop();
  });

  it("serializes concurrent patches against latest committed state", async () => {
    const { extensia, fixture, created } = await startedFixture();
    const [title, description] = await Promise.all([
      extensia.storage()!.updateResource(created.resource.data.id, {
        title: "latest title",
      }),
      extensia.storage()!.updateResource(created.resource.data.id, {
        description: "latest description",
      }),
    ]);
    expect(title.ok).toBe(true);
    expect(description.ok).toBe(true);
    expect(fixture.inspect().journal).toHaveLength(3);
    await expect(
      extensia.query()!.getResource(created.resource.data.id),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        data: { title: "latest title", description: "latest description" },
      },
    });
    await extensia.stop();
  });

  it("recovers a post-durable update crash into a fresh runtime", async () => {
    const backing = createDeterministicFullDriverBacking();
    const crashed = createDeterministicFullResourceDriver(backing);
    const first = createExtensia({
      storage: { driver: defineFullResourceDriver(crashed.adapter) },
    });
    await first.start();
    const created = await first.storage()!.createResource({ title: "before" });
    if (!created.ok) throw new Error("create failed");
    crashed.crashNext("transaction.commit.after-durable");
    await expect(
      first.storage()!.updateResource(created.value.resource.data.id, {
        title: "recovered",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "STORAGE_WRITE_FAILED" },
    });

    const fresh = createDeterministicFullResourceDriver(backing);
    const second = createExtensia({
      storage: { driver: defineFullResourceDriver(fresh.adapter) },
    });
    await expect(second.start()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await expect(
      second.query()!.getResource(created.value.resource.data.id),
    ).resolves.toMatchObject({
      ok: true,
      value: { data: { title: "recovered" } },
    });
    expect(fresh.inspect().journal.map((entry) => entry.type)).toEqual([
      "resource.create",
      "resource.update",
    ]);
    await second.stop();
  });
});
