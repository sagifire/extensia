import { describe, expect, it } from "vitest";

import { createExtensia, defineFullResourceDriver } from "../index.js";
import { buildResourceSnapshot } from "../domain/snapshots.js";
import { computeResourceWriteSetFingerprint } from "../storage/resource-journal-integrity.js";
import {
  createDeterministicFullDriverBacking,
  createDeterministicFullResourceDriver,
} from "../storage/deterministic-full-resource-driver.js";

describe("public Resource soft-delete slice", () => {
  it("returns a tombstone, hides it from reads, and densely reindexes siblings", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();
    const first = await extensia.storage()!.createResource({ title: "first" });
    const middle = await extensia
      .storage()!
      .createResource({ title: "middle" });
    const last = await extensia.storage()!.createResource({ title: "last" });
    if (!first.ok || !middle.ok || !last.ok) throw new Error("create failed");
    await extensia
      .storage()!
      .setMarks(middle.value.resource.data.id, [
        { type: "kind", name: "kept", value: 1 },
      ]);
    await extensia.storage()!.setKV(middle.value.resource.data.id, "meta", {
      kept: "yes",
    });
    const deleted = await extensia
      .storage()!
      .deleteResource(middle.value.resource.data.id);
    expect(deleted).toMatchObject({
      ok: true,
      value: {
        warnings: [],
        resource: {
          data: {
            id: middle.value.resource.data.id,
            order_index: 1,
            is_deleted: true,
          },
          marks: [{ type: "kind", name: "kept", value: 1 }],
          kv: { meta: { kept: "yes" } },
        },
      },
    });
    expect(extensia.getState()).toBe("started");
    const durable = fixture.inspect();
    const tombstone = durable.resources.find(
      (item) => item.data.id === middle.value.resource.data.id,
    )!;
    const sibling = durable.resources.find(
      (item) => item.data.id === last.value.resource.data.id,
    )!;
    expect(durable.journal.at(-1)).toMatchObject({ type: "resource.delete" });
    const entry = durable.journal.at(-1)!;
    const changed = durable.resources
      .filter((item) => entry.affected_resources.includes(item.data.id))
      .sort((a, b) => a.data.id.localeCompare(b.data.id));
    expect(entry.affected_resources).toEqual(
      [...entry.affected_resources].sort(),
    );
    expect(entry.write_set_fingerprint).toBe(
      computeResourceWriteSetFingerprint(changed),
    );
    expect(sibling.data.order_index).toBe(1);
    expect(sibling.data.updated_at).toBe(tombstone.data.updated_at);
    await expect(
      extensia.query()!.getResource(middle.value.resource.data.id),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NOT_FOUND" },
    });
    await expect(
      extensia.query()!.getResourceTree(middle.value.resource.data.id),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NOT_FOUND" },
    });
    await extensia.stop();
  });

  it("rejects parents, distinguishes repeat delete, and hides tombstones from writes", async () => {
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
      extensia.storage()!.deleteResource(parent.value.resource.data.id),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_HAS_CHILDREN" },
    });
    expect(fixture.inspect().journal).toHaveLength(before);
    await expect(
      extensia.storage()!.deleteResource(child.value.resource.data.id),
    ).resolves.toMatchObject({ ok: true, value: { warnings: [] } });
    expect(extensia.getState()).toBe("started");
    await expect(
      extensia.storage()!.deleteResource(child.value.resource.data.id),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_ALREADY_DELETED" },
    });
    await expect(
      extensia
        .storage()!
        .updateResource(child.value.resource.data.id, { title: "hidden" }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NOT_FOUND" },
    });
    await expect(
      extensia.storage()!.setMarks(child.value.resource.data.id, []),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NOT_FOUND" },
    });
    await extensia.stop();
  });

  it("deletes an only non-root locked/hidden leaf while preserving its state", async () => {
    const backing = createDeterministicFullDriverBacking();
    const fixture = createDeterministicFullResourceDriver(backing);
    const first = createExtensia({
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await first.start();
    const parent = await first.storage()!.createResource({ title: "parent" });
    const child = await first.storage()!.createResource({ title: "child" });
    if (!parent.ok || !child.ok) throw new Error("create failed");
    await first.storage()!.moveResource(child.value.resource.data.id, {
      parent_id: parent.value.resource.data.id,
      order_index: 0,
    });
    await first.stop();
    const stored = backing.resources.get(child.value.resource.data.id)!;
    backing.resources.set(
      child.value.resource.data.id,
      buildResourceSnapshot({
        ...stored,
        data: { ...stored.data, locked: true, hidden: true },
      }),
    );
    const fresh = createDeterministicFullResourceDriver(backing);
    const second = createExtensia({
      storage: { driver: defineFullResourceDriver(fresh.adapter) },
    });
    await second.start();
    await expect(
      second.storage()!.deleteResource(child.value.resource.data.id),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        resource: {
          data: {
            parent_id: parent.value.resource.data.id,
            order_index: 0,
            locked: true,
            hidden: true,
            is_deleted: true,
          },
        },
      },
    });
    await second.stop();
  });

  it.each([
    "transaction.begin",
    "transaction.stage.before",
    "transaction.stage.after",
    "transaction.commit.before",
  ] as const)("does not commit when %s fails", async (point) => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();
    const created = await extensia.storage()!.createResource({ title: "leaf" });
    if (!created.ok) throw new Error("create failed");
    const before = fixture.inspect().journal.length;
    fixture.failNext(point);
    await expect(
      extensia.storage()!.deleteResource(created.value.resource.data.id),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "STORAGE_WRITE_FAILED" },
    });
    expect(fixture.inspect().journal).toHaveLength(before);
    expect(fixture.inspect().resources[0]!.data.is_deleted).toBe(false);
    await extensia.stop();
  });

  it("recovers a post-durable delete crash in a fresh runtime", async () => {
    const backing = createDeterministicFullDriverBacking();
    const crashed = createDeterministicFullResourceDriver(backing);
    const first = createExtensia({
      storage: { driver: defineFullResourceDriver(crashed.adapter) },
    });
    await first.start();
    const created = await first.storage()!.createResource({ title: "leaf" });
    if (!created.ok) throw new Error("create failed");
    crashed.crashNext("transaction.commit.after-durable");
    await expect(
      first.storage()!.deleteResource(created.value.resource.data.id),
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
      ok: false,
      error: { code: "RESOURCE_NOT_FOUND" },
    });
    expect(fresh.inspect().journal.map((entry) => entry.type)).toEqual([
      "resource.create",
      "resource.delete",
    ]);
    await second.stop();
  });

  it("returns a committed cleanup warning and fail-closes after delete", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();
    const created = await extensia.storage()!.createResource({ title: "leaf" });
    if (!created.ok) throw new Error("create failed");
    fixture.failNext("session.release");
    await expect(
      extensia.storage()!.deleteResource(created.value.resource.data.id),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        committed: true,
        warnings: [{ code: "POST_COMMIT_CLEANUP_FAILED" }],
      },
    });
    expect(extensia.getState()).toBe("failed");
    expect(fixture.inspect().journal.at(-1)?.type).toBe("resource.delete");
    await extensia.stop();
  });

  it("serializes concurrent repeated delete and does not journal a missing target", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();
    const created = await extensia.storage()!.createResource({ title: "leaf" });
    if (!created.ok) throw new Error("create failed");
    const before = fixture.inspect().journal.length;
    await expect(
      extensia
        .storage()!
        .deleteResource("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NOT_FOUND" },
    });
    expect(fixture.inspect().journal).toHaveLength(before);
    const results = await Promise.all([
      extensia.storage()!.deleteResource(created.value.resource.data.id),
      extensia.storage()!.deleteResource(created.value.resource.data.id),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(
      results
        .filter((result) => !result.ok)
        .map((result) => !result.ok && result.error.code),
    ).toEqual(["RESOURCE_ALREADY_DELETED"]);
    expect(
      fixture
        .inspect()
        .journal.filter((entry) => entry.type === "resource.delete"),
    ).toHaveLength(1);
    await extensia.stop();
  });

  it("densely reindexes first and last root deletions", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();
    const roots = await Promise.all(
      ["first", "middle", "last"].map((title) =>
        extensia.storage()!.createResource({ title }),
      ),
    );
    if (roots.some((item) => !item.ok)) throw new Error("create failed");
    const ids = roots.map(
      (item) => item.ok && item.value.resource.data.id,
    ) as string[];
    await expect(
      extensia.storage()!.deleteResource(ids[0]!),
    ).resolves.toMatchObject({ ok: true });
    expect(
      fixture
        .inspect()
        .resources.filter((item) => !item.data.is_deleted)
        .map((item) => item.data.order_index)
        .sort(),
    ).toEqual([0, 1]);
    await expect(
      extensia.storage()!.deleteResource(ids[2]!),
    ).resolves.toMatchObject({ ok: true });
    expect(
      fixture
        .inspect()
        .resources.filter((item) => !item.data.is_deleted)
        .map((item) => item.data.order_index),
    ).toEqual([0]);
    await extensia.stop();
  });

  it("serializes delete against move, create, aggregate writes and stop drain", async () => {
    const fixture = createDeterministicFullResourceDriver();
    const extensia = createExtensia({
      storage: { driver: defineFullResourceDriver(fixture.adapter) },
    });
    await extensia.start();
    const target = await extensia
      .storage()!
      .createResource({ title: "target" });
    const sibling = await extensia
      .storage()!
      .createResource({ title: "sibling" });
    if (!target.ok || !sibling.ok) throw new Error("create failed");
    const [deleted, moved] = await Promise.all([
      extensia.storage()!.deleteResource(target.value.resource.data.id),
      extensia.storage()!.moveResource(target.value.resource.data.id, {
        parent_id: null,
        order_index: 0,
      }),
    ]);
    expect(deleted.ok).toBe(true);
    expect(moved).toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NOT_FOUND" },
    });
    const another = await extensia
      .storage()!
      .createResource({ title: "another" });
    if (!another.ok) throw new Error("create failed");
    const [created, aggregated, deletedAnother] = await Promise.all([
      extensia.storage()!.createResource({ title: "concurrent create" }),
      extensia
        .storage()!
        .setKV(sibling.value.resource.data.id, "meta", { kept: "yes" }),
      extensia.storage()!.deleteResource(another.value.resource.data.id),
    ]);
    expect(created.ok).toBe(true);
    expect(aggregated.ok).toBe(true);
    expect(deletedAnother.ok).toBe(true);
    expect(
      fixture
        .inspect()
        .resources.find(
          (item) => item.data.id === sibling.value.resource.data.id,
        )?.kv,
    ).toEqual({ meta: { kept: "yes" } });
    const finalLeaf = await extensia
      .storage()!
      .createResource({ title: "drained" });
    if (!finalLeaf.ok) throw new Error("create failed");
    const admittedDelete = extensia
      .storage()!
      .deleteResource(finalLeaf.value.resource.data.id);
    const stopping = extensia.stop();
    await expect(admittedDelete).resolves.toMatchObject({ ok: true });
    await expect(stopping).resolves.toEqual({ ok: true, value: undefined });
    expect(fixture.inspect().journal.at(-1)?.type).toBe("resource.delete");
  });
});
