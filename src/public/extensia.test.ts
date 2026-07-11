import { describe, expect, it } from "vitest";

import {
  createExtensia,
  type IDString,
  type ReadonlyResourceDriver,
  type ResourceSnapshot,
  type Timestamp,
} from "../index.js";

const ROOT_ID = "550e8400-e29b-41d4-a716-446655440000" as IDString;
const CHILD_A_ID = "8f14e45f-ea6f-4d7a-923b-966f7356c001" as IDString;
const CHILD_B_ID = "9f14e45f-ea6f-4d7a-823b-966f7356c002" as IDString;
const MISSING_ID = "af14e45f-ea6f-4d7a-923b-966f7356c003" as IDString;
const NOW = 1_784_294_400_000 as Timestamp;
const SECRET = "private-driver-error-must-not-leak";

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

interface DriverFixture {
  readonly driver: ReadonlyResourceDriver;
  readonly events: string[];
}

function driverFixture(
  resources: readonly ResourceSnapshot[],
  options: Readonly<{
    openFailure?: boolean;
    scanFailure?: boolean;
    closeFailure?: boolean;
    openGate?: Promise<void>;
  }> = {},
): DriverFixture {
  const events: string[] = [];
  return {
    events,
    driver: {
      mode: "readonly",
      async open(): Promise<void> {
        events.push("open");
        if (options.openGate !== undefined) await options.openGate;
        if (options.openFailure === true) throw new Error(SECRET);
      },
      async close(): Promise<void> {
        events.push("close");
        if (options.closeFailure === true) throw new Error(SECRET);
      },
      async *listResources(): AsyncIterable<ResourceSnapshot> {
        events.push("scan");
        for (const item of resources) yield item;
        if (options.scanFailure === true) throw new Error(SECRET);
      },
    },
  };
}

describe("public Extensia Resource read slice", () => {
  it("runs the exact application lifecycle and publishes stable facades", async () => {
    const fixture = driverFixture([
      resource(CHILD_B_ID, { parentId: ROOT_ID, orderIndex: 1 }),
      resource(ROOT_ID, { title: "Root" }),
      resource(CHILD_A_ID, { parentId: ROOT_ID, orderIndex: 0 }),
    ]);
    const extensia = createExtensia({ storage: { driver: fixture.driver } });

    expect(extensia.getState()).toBe("created");
    expect(extensia.query()).toBeNull();
    expect(extensia.storage()).toBeNull();
    expect(extensia.inspect()).toEqual({
      state: "created",
      ready: false,
      facades: [],
      diagnostics: [],
    });

    await expect(extensia.start()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    const query = extensia.query();
    const storage = extensia.storage();
    expect(query).not.toBeNull();
    expect(storage).not.toBeNull();
    expect(extensia.query()).toBe(query);
    expect(extensia.storage()).toBe(storage);
    expect(extensia.inspect()).toEqual({
      state: "started",
      ready: true,
      facades: ["query", "storage"],
      diagnostics: [],
    });

    await expect(query?.getResource(ROOT_ID)).resolves.toEqual({
      ok: true,
      value: resource(ROOT_ID, { title: "Root" }),
    });
    await expect(query?.getResourceTree(ROOT_ID)).resolves.toEqual({
      ok: true,
      value: {
        resource: resource(ROOT_ID, { title: "Root" }),
        children: [
          { id: CHILD_A_ID, order_index: 0 },
          { id: CHILD_B_ID, order_index: 1 },
        ],
      },
    });
    await expect(extensia.start()).resolves.toEqual({
      ok: true,
      value: undefined,
    });

    await expect(extensia.stop()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    expect(extensia.getState()).toBe("stopped");
    expect(extensia.query()).toBeNull();
    expect(extensia.storage()).toBeNull();
    await expect(query?.getResource(ROOT_ID)).resolves.toEqual({
      ok: false,
      error: { code: "MODULE_NOT_READY", message: "Extensia is not ready" },
    });
    await expect(storage?.createResource({})).resolves.toEqual({
      ok: false,
      error: { code: "MODULE_NOT_READY", message: "Extensia is not ready" },
    });
    expect(fixture.events).toEqual(["open", "scan", "close"]);
  });

  it("normalizes invalid and missing IDs without ambiguous null success", async () => {
    const fixture = driverFixture([resource(ROOT_ID)]);
    const extensia = createExtensia({ storage: { driver: fixture.driver } });
    await extensia.start();
    const query = extensia.query()!;

    for (const invalid of [
      "not-a-uuid",
      "550E8400E29B41D4A716446655440000",
      "{550e8400-e29b-41d4-a716-446655440000}",
      42,
    ]) {
      await expect(query.getResource(invalid as string)).resolves.toMatchObject(
        {
          ok: false,
          error: { code: "INVALID_RESOURCE_ID" },
        },
      );
    }
    await expect(query.getResource(MISSING_ID)).resolves.toMatchObject({
      ok: false,
      error: { code: "RESOURCE_NOT_FOUND" },
    });

    await extensia.stop();
  });

  it("returns fresh detached snapshots across reads and driver aliases", async () => {
    const source = resource(ROOT_ID, { title: "Original" });
    const fixture = driverFixture([source]);
    const extensia = createExtensia({ storage: { driver: fixture.driver } });
    await extensia.start();
    const query = extensia.query()!;
    const first = await query.getResource(ROOT_ID);
    const second = await query.getResource(ROOT_ID);

    expect(first).toEqual(second);
    expect(first.ok && second.ok && first.value).not.toBe(
      second.ok && second.value,
    );
    if (first.ok) {
      (first.value.data as { title: string }).title = "caller mutation";
    }
    source.data.title = "driver mutation";
    await expect(query.getResource(ROOT_ID)).resolves.toMatchObject({
      ok: true,
      value: { data: { title: "Original" } },
    });
    await extensia.stop();
  });

  it("rejects readonly storage before inspecting input or mutating the driver", async () => {
    const fixture = driverFixture([resource(ROOT_ID)]);
    const extensia = createExtensia({ storage: { driver: fixture.driver } });
    await extensia.start();
    const eventsBefore = [...fixture.events];
    const input = new Proxy(
      {},
      {
        get(): never {
          throw new Error("input must not be read");
        },
        ownKeys(): never {
          throw new Error("input must not be inspected");
        },
      },
    );

    await expect(extensia.storage()!.createResource(input)).resolves.toEqual({
      ok: false,
      error: {
        code: "STORAGE_READONLY",
        message: "Resource storage is readonly in this runtime",
      },
    });
    expect(fixture.events).toEqual(eventsBefore);
    await extensia.stop();
  });

  it("captures config envelopes without invoking accessors or rereading callers", async () => {
    const first = driverFixture([resource(ROOT_ID, { title: "captured" })]);
    const second = driverFixture([resource(ROOT_ID, { title: "mutated" })]);
    const mutableConfig = { storage: { driver: first.driver } };
    const extensia = createExtensia(mutableConfig);
    mutableConfig.storage = { driver: second.driver };

    await extensia.start();
    await expect(extensia.query()!.getResource(ROOT_ID)).resolves.toMatchObject(
      {
        ok: true,
        value: { data: { title: "captured" } },
      },
    );
    expect(first.events).toEqual(["open", "scan"]);
    expect(second.events).toEqual([]);
    await extensia.stop();

    let getterCalls = 0;
    const accessorConfig = Object.defineProperty({}, "storage", {
      enumerable: true,
      get(): unknown {
        getterCalls += 1;
        return { driver: first.driver };
      },
    });
    const invalid = createExtensia(accessorConfig as never);
    expect(getterCalls).toBe(0);
    await expect(invalid.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "CONFIG_INVALID" },
    });
    expect(getterCalls).toBe(0);
    expect(first.events).toEqual(["open", "scan", "close"]);
  });

  it("accepts class drivers and revalidates captured shared shape at start", async () => {
    const events: string[] = [];
    class ClassDriver implements ReadonlyResourceDriver {
      readonly mode = "readonly";

      async open(): Promise<void> {
        events.push("open");
      }

      async close(): Promise<void> {
        events.push("close");
      }

      async *listResources(): AsyncIterable<ResourceSnapshot> {
        events.push("scan");
        yield resource(ROOT_ID);
      }
    }

    const classModule = createExtensia({
      storage: { driver: new ClassDriver() },
    });
    await expect(classModule.start()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await classModule.stop();
    expect(events).toEqual(["open", "scan", "close"]);

    const fixture = driverFixture([resource(ROOT_ID)]);
    const mutatedMode = createExtensia({
      storage: { driver: fixture.driver },
    });
    (fixture.driver as { mode: string }).mode = "full";
    await expect(mutatedMode.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "CONFIG_INVALID" },
    });
    expect(fixture.events).toEqual([]);

    const methodFixture = driverFixture([resource(ROOT_ID)]);
    const mutatedMethod = createExtensia({
      storage: { driver: methodFixture.driver },
    });
    (methodFixture.driver as { open: unknown }).open = null;
    await expect(mutatedMethod.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "CONFIG_INVALID" },
    });
    expect(methodFixture.events).toEqual([]);
  });

  it("rejects accessor-backed driver shape without invoking it", async () => {
    let getterCalls = 0;
    const driver = {
      mode: "readonly",
      async close(): Promise<void> {},
      async *listResources(): AsyncIterable<ResourceSnapshot> {},
    };
    Object.defineProperty(driver, "open", {
      enumerable: true,
      get(): unknown {
        getterCalls += 1;
        return async (): Promise<void> => undefined;
      },
    });
    const extensia = createExtensia({
      storage: { driver: driver as never },
    });

    expect(getterCalls).toBe(0);
    await expect(extensia.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "CONFIG_INVALID" },
    });
    expect(getterCalls).toBe(0);
  });

  it.each([
    { name: "open failure", options: { openFailure: true } },
    { name: "scan failure", options: { scanFailure: true } },
  ])("normalizes and cleans $name", async ({ options }) => {
    const fixture = driverFixture([resource(ROOT_ID)], options);
    const extensia = createExtensia({ storage: { driver: fixture.driver } });
    const result = await extensia.start();

    expect(result).toMatchObject({
      ok: false,
      error: { code: "START_FAILED" },
    });
    expect(extensia.getState()).toBe("failed");
    expect(extensia.query()).toBeNull();
    expect(fixture.events.at(-1)).toBe("close");
    expect(JSON.stringify(extensia.inspect())).not.toContain(SECRET);
    await expect(extensia.stop()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    expect(fixture.events.filter((event) => event === "close")).toHaveLength(1);
  });

  it("normalizes invalid loaded models and close failures", async () => {
    const invalidFixture = driverFixture([
      resource(ROOT_ID, { parentId: MISSING_ID }),
    ]);
    const invalid = createExtensia({
      storage: { driver: invalidFixture.driver },
    });
    await expect(invalid.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "START_FAILED" },
    });
    expect(invalidFixture.events).toEqual(["open", "scan", "close"]);

    const closingFixture = driverFixture([resource(ROOT_ID)], {
      closeFailure: true,
    });
    const closing = createExtensia({
      storage: { driver: closingFixture.driver },
    });
    await closing.start();
    await expect(closing.stop()).resolves.toMatchObject({
      ok: false,
      error: { code: "STOP_FAILED" },
    });
    expect(closing.getState()).toBe("stopped");
    expect(JSON.stringify(closing.inspect())).not.toContain(SECRET);
  });

  it("enforces transition semantics while startup is in flight", async () => {
    const gate = Promise.withResolvers<void>();
    const fixture = driverFixture([resource(ROOT_ID)], {
      openGate: gate.promise,
    });
    const extensia = createExtensia({ storage: { driver: fixture.driver } });
    const starting = extensia.start();

    expect(extensia.getState()).toBe("starting");
    await expect(extensia.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "MODULE_BUSY" },
    });
    await expect(extensia.stop()).resolves.toMatchObject({
      ok: false,
      error: { code: "MODULE_BUSY" },
    });
    expect(extensia.query()).toBeNull();
    expect(extensia.inspect().facades).toEqual([]);

    gate.resolve();
    await expect(starting).resolves.toEqual({ ok: true, value: undefined });
    await extensia.stop();
    await expect(extensia.start()).resolves.toMatchObject({
      ok: false,
      error: { code: "MODULE_INVALID_STATE" },
    });
  });

  it("stops idempotently before start and isolates fresh runtimes", async () => {
    const unusedFixture = driverFixture([resource(ROOT_ID)]);
    const unused = createExtensia({
      storage: { driver: unusedFixture.driver },
    });
    await expect(unused.stop()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await expect(unused.stop()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    expect(unusedFixture.events).toEqual([]);

    const firstFixture = driverFixture([resource(ROOT_ID, { title: "first" })]);
    const secondFixture = driverFixture([
      resource(ROOT_ID, { title: "second" }),
    ]);
    const first = createExtensia({ storage: { driver: firstFixture.driver } });
    const second = createExtensia({
      storage: { driver: secondFixture.driver },
    });
    await Promise.all([first.start(), second.start()]);
    await expect(first.query()!.getResource(ROOT_ID)).resolves.toMatchObject({
      value: { data: { title: "first" } },
    });
    await expect(second.query()!.getResource(ROOT_ID)).resolves.toMatchObject({
      value: { data: { title: "second" } },
    });
    await first.stop();
    await expect(second.query()!.getResource(ROOT_ID)).resolves.toMatchObject({
      value: { data: { title: "second" } },
    });
    await second.stop();
  });
});
