import { describe, expect, it } from "vitest";

import type { ReadModelSynchronizationActor } from "./read-model-synchronization.js";
import {
  createReadModelPollingController,
  type ReadModelPollingScheduler,
} from "./read-model-polling.js";

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe("read-model polling controller", () => {
  it("starts immediately, applies bounded success/exhaustion jitter and cancels timers", async () => {
    const calls: string[] = [];
    const scheduled: { canceled: boolean; delay: number; task: () => void }[] =
      [];
    const scheduler: ReadModelPollingScheduler = {
      schedule(delay, task) {
        const item = { canceled: false, delay, task };
        scheduled.push(item);
        return { cancel: () => (item.canceled = true) };
      },
    };
    const results = [
      { attempts: 1, changed: false, observed: true, ok: true as const },
      {
        attempts: 3,
        code: "READ_MODEL_REFRESH_EXHAUSTED" as const,
        last_failure: "storage-lock" as const,
        ok: false as const,
        reason: "attempts" as const,
      },
    ];
    const actor = {
      async refresh() {
        calls.push("refresh");
        return results.shift()!;
      },
    } as unknown as ReadModelSynchronizationActor;
    const random = [0, 0.999_999];
    const controller = createReadModelPollingController({
      actor,
      config: { intervalMs: 1_000, maxBackoffMs: 8_000 },
      random: () => random.shift()!,
      scheduler,
    });

    controller.start();
    controller.start();
    await flush();
    expect(calls).toEqual(["refresh"]);
    expect(scheduled.map((item) => item.delay)).toEqual([1_000]);

    scheduled[0]!.task();
    await flush();
    expect(calls).toEqual(["refresh", "refresh"]);
    expect(scheduled.map((item) => item.delay)).toEqual([1_000, 8_000]);

    controller.close();
    expect(scheduled[1]!.canceled).toBe(true);
    scheduled[1]!.task();
    await controller.drain();
    expect(calls).toHaveLength(2);
  });

  it("does not schedule after close while an observation settles", async () => {
    let settle!: () => void;
    const gate = new Promise<void>((resolve) => {
      settle = resolve;
    });
    const scheduled: number[] = [];
    const actor = {
      async refresh() {
        await gate;
        return {
          attempts: 1,
          changed: false,
          observed: true,
          ok: true as const,
        };
      },
    } as unknown as ReadModelSynchronizationActor;
    const controller = createReadModelPollingController({
      actor,
      config: { intervalMs: 250, maxBackoffMs: 4_000 },
      scheduler: {
        schedule(delay) {
          scheduled.push(delay);
          return { cancel() {} };
        },
      },
    });

    controller.start();
    controller.close();
    settle();
    await controller.drain();
    expect(scheduled).toEqual([]);
  });
});
