import { describe, expect, it } from "vitest";

import {
  composeExtensia,
  multiCapability,
  singleCapability,
  type ExtensiaCapabilityExports,
  type ExtensiaCompositionResult,
} from "../composition/root.js";
import {
  parseIDString,
  parseTimestamp,
  type IDString,
} from "../domain/scalars.js";
import type { ResourceSnapshot } from "../domain/snapshots.js";
import {
  composeRuntimeHost,
  LIFECYCLE_CONTRIBUTIONS,
} from "../runtime/lifecycle.js";
import {
  CORE_RESOURCE_READ_PORT,
  type CoreResourceReadPort,
} from "../system-extensions/default-api/resource-read-port.js";
import { createGreedyResourceIndex } from "./resource-index.js";
import {
  READONLY_RESOURCE_CORE_MODULE,
  READONLY_RESOURCE_DRIVER,
  type ReadonlyResourceDriver,
} from "./resource-read-runtime.js";

const ROOT_ID = parseIDString("550e8400-e29b-41d4-a716-446655440000");
const CHILD_A_ID = parseIDString("8f14e45f-ea6f-4d7a-923b-966f7356c001");
const CHILD_B_ID = parseIDString("9f14e45f-ea6f-4d7a-823b-966f7356c002");
const MISSING_ID = parseIDString("af14e45f-ea6f-4d7a-923b-966f7356c003");
const NOW = parseTimestamp(1_784_294_400_000);
const SECRET_SENTINEL = "secret-driver-failure-must-not-leak";

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

async function* asyncResources(
  resources: readonly ResourceSnapshot[],
): AsyncIterable<ResourceSnapshot> {
  yield* resources;
}

function permutations<T>(values: readonly T[]): readonly (readonly T[])[] {
  if (values.length <= 1) return [[...values]];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, candidate) => candidate !== index)).map(
      (tail) => [value, ...tail],
    ),
  );
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
  }> = {},
): DriverFixture {
  const events: string[] = [];
  return {
    events,
    driver: {
      mode: "readonly",
      async open(): Promise<void> {
        events.push("open");
        if (options.openFailure === true) {
          throw new Error(SECRET_SENTINEL);
        }
      },
      async close(): Promise<void> {
        events.push("close");
        if (options.closeFailure === true) {
          throw new Error(SECRET_SENTINEL);
        }
      },
      async *listResources(): AsyncIterable<ResourceSnapshot> {
        events.push("scan");
        for (const item of resources) yield item;
        if (options.scanFailure === true) {
          throw new Error(SECRET_SENTINEL);
        }
      },
    },
  };
}

const CORE_EXPORTS = {
  lifecycle: multiCapability(LIFECYCLE_CONTRIBUTIONS),
  read: singleCapability(CORE_RESOURCE_READ_PORT),
} as const satisfies ExtensiaCapabilityExports;

type CoreCompositionResult = ExtensiaCompositionResult<typeof CORE_EXPORTS>;

function assertCoreComposition(
  result: CoreCompositionResult,
): asserts result is Extract<CoreCompositionResult, { readonly ok: true }> {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.code);
}

async function composeCore(
  driver: ReadonlyResourceDriver,
): Promise<Extract<CoreCompositionResult, { readonly ok: true }>> {
  const result = await composeExtensia({
    register(registry) {
      registry.bindValue(READONLY_RESOURCE_DRIVER, driver);
      registry.use(READONLY_RESOURCE_CORE_MODULE);
    },
    exports: CORE_EXPORTS,
  });
  assertCoreComposition(result);
  return result;
}

async function readResource(
  port: CoreResourceReadPort,
  id: IDString,
): ReturnType<CoreResourceReadPort["read"]> {
  return port.read({ type: "resource.get", id });
}

describe("greedy Resource index", () => {
  it("derives one-level children deterministically for every fixture order", async () => {
    const fixtures = [
      resource(ROOT_ID),
      resource(CHILD_A_ID, { parentId: ROOT_ID, orderIndex: 2 }),
      resource(CHILD_B_ID, { parentId: ROOT_ID, orderIndex: 2 }),
    ];

    for (const order of permutations(fixtures)) {
      const index = createGreedyResourceIndex();
      await index.initialize(asyncResources(order));
      expect(index.getResourceTree(ROOT_ID)?.children).toEqual([
        { id: CHILD_A_ID, order_index: 2 },
        { id: CHILD_B_ID, order_index: 2 },
      ]);
      expect(index.getResourceTree(CHILD_A_ID)?.children).toEqual([]);
    }
  });

  it.each([
    {
      name: "invalid aggregate",
      fixtures: [
        {
          ...resource(ROOT_ID),
          data: { ...resource(ROOT_ID).data, title: 42 },
        } as unknown as ResourceSnapshot,
      ],
    },
    {
      name: "duplicate ID",
      fixtures: [resource(ROOT_ID), resource(ROOT_ID)],
    },
    {
      name: "two-node cycle",
      fixtures: [
        resource(ROOT_ID, { parentId: CHILD_A_ID }),
        resource(CHILD_A_ID, { parentId: ROOT_ID }),
      ],
    },
    {
      name: "self-parent cycle",
      fixtures: [resource(ROOT_ID, { parentId: ROOT_ID })],
    },
    {
      name: "orphan",
      fixtures: [resource(ROOT_ID, { parentId: MISSING_ID })],
    },
  ])(
    "rejects $name without publishing a partial model",
    async ({ fixtures }) => {
      const index = createGreedyResourceIndex();
      await expect(
        index.initialize(asyncResources(fixtures)),
      ).rejects.toThrow();
      expect(index.ready).toBe(false);
      expect(() => index.getResource(ROOT_ID)).toThrow("not ready");
    },
  );
});

describe("readonly Core Resource runtime", () => {
  it("implements the exact shared port with fresh detached JSON-safe snapshots", async () => {
    const root = resource(ROOT_ID, { title: "Original" });
    const child = resource(CHILD_A_ID, {
      parentId: ROOT_ID,
      orderIndex: 1,
    });
    const fixture = driverFixture([child, root]);
    const result = await composeCore(fixture.driver);
    const [lifecycle] = result.composition.capabilities.lifecycle;
    expect(lifecycle).toBeDefined();
    await lifecycle?.start();

    const first = await readResource(
      result.composition.capabilities.read,
      ROOT_ID,
    );
    const second = await readResource(
      result.composition.capabilities.read,
      ROOT_ID,
    );
    expect(first).toEqual({ ok: true, value: root });
    expect(second).toEqual(first);
    expect(first.ok && second.ok && first.value).not.toBe(
      second.ok && second.value,
    );

    if (first.ok) {
      (first.value.data as { title: string }).title = "caller mutation";
    }
    root.data.title = "driver mutation";
    const afterMutation = await readResource(
      result.composition.capabilities.read,
      ROOT_ID,
    );
    expect(afterMutation).toMatchObject({
      ok: true,
      value: { data: { title: "Original" } },
    });
    expect(JSON.parse(JSON.stringify(afterMutation))).toEqual(afterMutation);

    await expect(
      result.composition.capabilities.read.read({
        type: "resource.tree.get",
        id: ROOT_ID,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: { children: [{ id: CHILD_A_ID, order_index: 1 }] },
    });
    await expect(
      readResource(result.composition.capabilities.read, MISSING_ID),
    ).resolves.toEqual({
      ok: false,
      error: { code: "RESOURCE_NOT_FOUND" },
    });

    await lifecycle?.stop();
    expect(fixture.events).toEqual(["open", "scan", "close"]);
    await expect(
      result.composition.capabilities.read.read({
        type: "resource.get",
        id: ROOT_ID,
      }),
    ).rejects.toThrow("not ready");
    await result.composition.dispose();
  });

  it.each([
    {
      name: "open failure",
      options: { openFailure: true },
      resources: [resource(ROOT_ID)],
    },
    {
      name: "scan failure",
      options: { scanFailure: true },
      resources: [resource(ROOT_ID)],
    },
    {
      name: "invalid fixture",
      options: {},
      resources: [resource(ROOT_ID, { parentId: MISSING_ID })],
    },
  ])(
    "self-cleans $name and exposes only safe lifecycle diagnostics",
    async ({ options, resources }) => {
      const fixture = driverFixture(resources, options);
      const result = await composeRuntimeHost({
        register(registry) {
          registry.bindValue(READONLY_RESOURCE_DRIVER, fixture.driver);
          registry.use(READONLY_RESOURCE_CORE_MODULE);
        },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const start = await result.host.start();
      expect(start).toEqual({
        ok: false,
        state: "failed",
        failures: [
          {
            code: "LIFECYCLE_START_FAILED",
            stage: "start",
            contributionId: "core.resource-read",
          },
        ],
      });
      expect(fixture.events.at(-1)).toBe("close");
      expect(JSON.stringify(start)).not.toContain(SECRET_SENTINEL);
      await expect(result.host.stop()).resolves.toEqual({
        ok: true,
        state: "stopped",
      });
      expect(fixture.events.filter((event) => event === "close")).toHaveLength(
        1,
      );
    },
  );

  it("clears the index and normalizes driver close failure", async () => {
    const fixture = driverFixture([resource(ROOT_ID)], {
      closeFailure: true,
    });
    const result = await composeRuntimeHost({
      register(registry) {
        registry.bindValue(READONLY_RESOURCE_DRIVER, fixture.driver);
        registry.use(READONLY_RESOURCE_CORE_MODULE);
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    await expect(result.host.start()).resolves.toEqual({
      ok: true,
      state: "started",
    });
    const stop = await result.host.stop();
    expect(stop).toEqual({
      ok: false,
      state: "stopped",
      failures: [
        {
          code: "LIFECYCLE_STOP_FAILED",
          stage: "stop",
          contributionId: "core.resource-read",
        },
      ],
    });
    expect(JSON.stringify(stop)).not.toContain(SECRET_SENTINEL);
    expect(fixture.events).toEqual(["open", "scan", "close"]);
  });

  it("uses normal lifecycle cleanup and isolates fresh compositions", async () => {
    const firstFixture = driverFixture([resource(ROOT_ID, { title: "first" })]);
    const secondFixture = driverFixture([
      resource(ROOT_ID, { title: "second" }),
    ]);
    const first = await composeCore(firstFixture.driver);
    const second = await composeCore(secondFixture.driver);
    await first.composition.capabilities.lifecycle[0]?.start();
    await second.composition.capabilities.lifecycle[0]?.start();

    await expect(
      readResource(first.composition.capabilities.read, ROOT_ID),
    ).resolves.toMatchObject({ value: { data: { title: "first" } } });
    await expect(
      readResource(second.composition.capabilities.read, ROOT_ID),
    ).resolves.toMatchObject({ value: { data: { title: "second" } } });

    await first.composition.capabilities.lifecycle[0]?.stop();
    await expect(
      readResource(second.composition.capabilities.read, ROOT_ID),
    ).resolves.toMatchObject({ value: { data: { title: "second" } } });
    await second.composition.capabilities.lifecycle[0]?.stop();
    await first.composition.dispose();
    await second.composition.dispose();
  });
});
