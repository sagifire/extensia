import { describe, expect, it } from "vitest";
import { createExtensia, defineFullResourceDriver } from "../index.js";
import {
  createDeterministicFullDriverBacking,
  createDeterministicFullResourceDriver,
} from "../storage/deterministic-full-resource-driver.js";
import { computeResourceWriteSetFingerprint } from "../storage/resource-journal-integrity.js";

async function fixture() {
  const driver = createDeterministicFullResourceDriver();
  const extensia = createExtensia({
    storage: { driver: defineFullResourceDriver(driver.adapter) },
  });
  await extensia.start();
  const created = await extensia
    .storage()!
    .createResource({ title: "aggregate" });
  if (!created.ok) throw new Error("create failed");
  return { extensia, driver, id: created.value.resource.data.id };
}
describe("public Resource Marks/KV slice", () => {
  it("replaces, canonicalizes, clears/deletes and returns detached read-back", async () => {
    const { extensia, driver, id } = await fixture();
    const marks = await extensia.storage()!.setMarks(id, [
      { type: "z", name: "n", value: 1 },
      { type: "a", name: "n", value: null },
    ]);
    expect(marks).toMatchObject({
      ok: true,
      value: { resource: { marks: [{ type: "a" }, { type: "z" }] } },
    });
    if (!marks.ok) throw new Error("marks failed");
    const marksFingerprint = computeResourceWriteSetFingerprint([
      marks.value.resource,
    ]);
    (marks.value.resource.marks as { type: string }[])[0]!.type = "mutated";
    await expect(extensia.query()!.getResource(id)).resolves.toMatchObject({
      ok: true,
      value: { marks: [{ type: "a" }, { type: "z" }] },
    });
    await expect(
      extensia.storage()!.setKV(id, "app", { b: "2", a: "1" }),
    ).resolves.toMatchObject({
      ok: true,
      value: { resource: { kv: { app: { a: "1", b: "2" } } } },
    });
    await expect(
      extensia.storage()!.setKV(id, "app", { a: "1", b: "2" }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NO_CHANGES" },
    });
    await expect(extensia.storage()!.setMarks(id, [])).resolves.toMatchObject({
      ok: true,
      value: { resource: { marks: [] } },
    });
    await expect(
      extensia.storage()!.setKV(id, "app", {}),
    ).resolves.toMatchObject({ ok: true, value: { resource: { kv: {} } } });
    expect(driver.inspect().journal.map((entry) => entry.type)).toEqual([
      "resource.create",
      "resource.marks.set",
      "resource.kv.set",
      "resource.marks.set",
      "resource.kv.set",
    ]);
    expect(
      driver
        .inspect()
        .journal.slice(1)
        .every(
          (entry) =>
            entry.affected_resources.length === 1 &&
            entry.changes.length === 1 &&
            /^[0-9a-f]{64}$/.test(entry.write_set_fingerprint),
        ),
    ).toBe(true);
    expect(driver.inspect().journal[1]?.write_set_fingerprint).toBe(
      marksFingerprint,
    );
    await extensia.stop();
  });
  it("serializes same-Resource aggregate writes and rejects invalid/no-change without commit", async () => {
    const { extensia, driver, id } = await fixture();
    const before = driver.inspect().journal.length;
    await expect(
      extensia.storage()!.setMarks(id, new Array(1) as never),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_INPUT_INVALID" },
    });
    expect(driver.inspect().journal).toHaveLength(before);
    await expect(
      extensia.storage()!.setMarks("550e8400-e29b-41d4-a716-446655440000", []),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NOT_FOUND" },
    });
    const [marks, kv] = await Promise.all([
      extensia.storage()!.setMarks(id, [{ type: "t", name: "n", value: 1 }]),
      extensia.storage()!.setKV(id, "ns", { k: "v" }),
    ]);
    expect(marks.ok).toBe(true);
    expect(kv.ok).toBe(true);
    await expect(extensia.query()!.getResource(id)).resolves.toMatchObject({
      ok: true,
      value: { marks: [{ type: "t" }], kv: { ns: { k: "v" } } },
    });
    await extensia.stop();
  });
  it("recovers a durable aggregate commit in a fresh process", async () => {
    const backing = createDeterministicFullDriverBacking();
    const crashed = createDeterministicFullResourceDriver(backing);
    const first = createExtensia({
      storage: { driver: defineFullResourceDriver(crashed.adapter) },
    });
    await first.start();
    const created = await first
      .storage()!
      .createResource({ title: "recovery" });
    if (!created.ok) throw new Error("create failed");
    crashed.crashNext("transaction.commit.after-durable");
    await expect(
      first
        .storage()!
        .setKV(created.value.resource.data.id, "ns", { key: "recovered" }),
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
      value: { kv: { ns: { key: "recovered" } } },
    });
    expect(fresh.inspect().journal.at(-1)?.type).toBe("resource.kv.set");
    await second.stop();
  });
  it("checks readonly before hostile input inspection", async () => {
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
    const hostile = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("inspected");
        },
      },
    );
    await expect(
      extensia.storage()!.setKV("invalid", hostile as never, hostile as never),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "STORAGE_READONLY" },
    });
    await extensia.stop();
  });
});
