import { describe, expect, it } from "vitest";

import {
  AsyncLockQueue,
  LockAcquireCanceledError,
} from "./async-lock-queue.js";

describe("AsyncLockQueue", () => {
  it("normalizes keys and grants them atomically", async () => {
    const queue = new AsyncLockQueue();
    const first = await queue.acquire([
      " resource:b ",
      "resource:a",
      "resource:a",
    ]);
    expect(first.keys).toEqual(["resource:a", "resource:b"]);

    let acquired = false;
    const secondPromise = queue
      .acquire(["resource:b", "resource:c"])
      .then((lease) => {
        acquired = true;
        return lease;
      });
    await Promise.resolve();
    expect(acquired).toBe(false);
    first.release();
    const second = await secondPromise;
    expect(second.keys).toEqual(["resource:b", "resource:c"]);
    second.release();
  });

  it("keeps FIFO for conflicts while non-conflicting work progresses", async () => {
    const queue = new AsyncLockQueue();
    const held = await queue.acquire(["resource:a"]);
    const order: string[] = [];
    const earlier = queue
      .acquire(["resource:a", "resource:b"])
      .then((lease) => {
        order.push("earlier");
        return lease;
      });
    const later = queue.acquire(["resource:b"]).then((lease) => {
      order.push("later");
      return lease;
    });
    const independent = await queue.acquire(["resource:c"]);
    expect(order).toEqual([]);
    independent.release();
    held.release();
    const earlierLease = await earlier;
    expect(order).toEqual(["earlier"]);
    earlierLease.release();
    const laterLease = await later;
    expect(order).toEqual(["earlier", "later"]);
    laterLease.release();
  });

  it("removes a canceled waiter without disturbing the queue", async () => {
    const queue = new AsyncLockQueue();
    const held = await queue.acquire(["resource:a"]);
    const controller = new AbortController();
    const canceled = queue.acquire(["resource:a"], controller.signal);
    const next = queue.acquire(["resource:a"]);
    controller.abort();
    await expect(canceled).rejects.toBeInstanceOf(LockAcquireCanceledError);
    held.release();
    (await next).release();
  });

  it("rejects invalid or already canceled requests", async () => {
    const queue = new AsyncLockQueue();
    expect(() => queue.acquire([])).toThrow(TypeError);
    expect(() => queue.acquire([" "])).toThrow(TypeError);
    const controller = new AbortController();
    controller.abort();
    await expect(
      queue.acquire(["resource:a"], controller.signal),
    ).rejects.toBeInstanceOf(LockAcquireCanceledError);
  });
});
