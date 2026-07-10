export interface AsyncLockLease {
  readonly keys: readonly string[];
  release(): void;
}

interface PendingRequest {
  readonly keys: readonly string[];
  readonly resolve: (lease: AsyncLockLease) => void;
  readonly reject: (error: Error) => void;
  readonly signal: AbortSignal | undefined;
  readonly onAbort: () => void;
}

export class LockAcquireCanceledError extends Error {
  constructor() {
    super("Operation lock acquisition canceled");
    this.name = "LockAcquireCanceledError";
  }
}

function normalizeKeys(keys: readonly string[]): readonly string[] {
  const normalized = [...new Set(keys.map((key) => key.trim()))].sort();
  if (normalized.length === 0 || normalized.some((key) => key.length === 0)) {
    throw new TypeError("Operation lock keys must be non-empty strings");
  }
  return Object.freeze(normalized);
}

function overlaps(left: readonly string[], right: readonly string[]): boolean {
  return left.some((key) => right.includes(key));
}

export class AsyncLockQueue {
  readonly #active = new Set<string>();
  readonly #pending: PendingRequest[] = [];

  acquire(
    keys: readonly string[],
    signal?: AbortSignal,
  ): Promise<AsyncLockLease> {
    const normalized = normalizeKeys(keys);
    if (signal?.aborted === true) {
      return Promise.reject(new LockAcquireCanceledError());
    }

    return new Promise((resolve, reject) => {
      const onAbort = (): void => {
        const index = this.#pending.indexOf(request);
        if (index < 0) return;
        this.#pending.splice(index, 1);
        reject(new LockAcquireCanceledError());
        this.#dispatch();
      };
      const request: PendingRequest = {
        keys: normalized,
        resolve,
        reject,
        signal,
        onAbort,
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.#pending.push(request);
      this.#dispatch();
    });
  }

  #dispatch(): void {
    for (let index = 0; index < this.#pending.length;) {
      const request = this.#pending[index];
      if (request === undefined) break;
      const blockedByActive = request.keys.some((key) => this.#active.has(key));
      const blockedByEarlier = this.#pending
        .slice(0, index)
        .some((earlier) => overlaps(earlier.keys, request.keys));
      if (blockedByActive || blockedByEarlier) {
        index += 1;
        continue;
      }

      this.#pending.splice(index, 1);
      request.signal?.removeEventListener("abort", request.onAbort);
      request.keys.forEach((key) => this.#active.add(key));
      let released = false;
      request.resolve(
        Object.freeze({
          keys: request.keys,
          release: (): void => {
            if (released) return;
            released = true;
            request.keys.forEach((key) => this.#active.delete(key));
            this.#dispatch();
          },
        }),
      );
    }
  }
}
