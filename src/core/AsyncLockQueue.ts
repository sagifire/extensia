type Releaser = () => void

export interface AcquireOptions {
    timeoutMs?: number
    signal?: AbortSignal
}

/**
 * A queue of asynchronous locks by key (e.g., file ID).
 * Guarantees FIFO for each key.
 */
export class AsyncLockQueue<K = string> {
    private queues = new Map<K, Array<(v: void) => void>>()
    private holders = new Map<K, number>() //debugging metric "how many holders now"

    /**
     * Grab the lock with the key.
     * Returns the release() function, which MUST be called in finally.
     */
    public async lock(key: K, opts: AcquireOptions = {}): Promise<{ release: Releaser }> {
        const q = this.ensureQueue(key)

        // fast track - if we are first in line, we go in right away
        let enter: () => void
        const entered = new Promise<void>(resolve => {
            enter = resolve
        })

        q.push(enter!)
        const isHead = q.length === 1
        if (!isHead) {
            await this.waitTurn(entered, opts)
        }

        // we are inside the critical section
        this.holders.set(key, (this.holders.get(key) ?? 0) + 1)

        let released = false
        const release = () => {
            if (released) {
                return
            }
            released = true

            // we get ourselves out of our heads and wake up the next one
            const qRef = this.queues.get(key)
            if (!qRef || qRef.length === 0) {
                // unsynchronized situation — but let's just remove the metrics
                this.holders.set(key, Math.max((this.holders.get(key) ?? 1) - 1, 0))
                return
            }

            // we should be at position 0
            qRef.shift()
            this.holders.set(key, Math.max((this.holders.get(key) ?? 1) - 1, 0))

            if (qRef.length === 0) {
                // empty queue — let's remove it
                this.queues.delete(key)
                this.holders.delete(key)
                return
            }

            // unlock next
            const next = qRef[0]
            next()
        }

        return { release }
    }

    /**
     * Perform an asynchronous action under lock.
     */
    public async withLock<T>(key: K, fn: () => Promise<T>, opts: AcquireOptions = {}): Promise<T> {
        const { release } = await this.lock(key, opts)
        try {
            return await fn()
        } finally {
            release()
        }
    }

    /**
     * Capture multiple keys at once, without deadlocks:
     * keys are ordered globally (String(key)).
     */
    public async lockMany(keys: K[], opts: AcquireOptions = {}): Promise<{ releaseAll: () => void }> {
        const ordered = [...keys].sort((a, b) => {
            const sa = String(a)
            const sb = String(b)
            if (sa < sb) { return -1 }
            if (sa > sb) { return 1 }
            return 0
        })

        const releasers: Releaser[] = []
        try {
            for (const k of ordered) {
                const { release } = await this.lock(k, opts)
                releasers.push(release)
            }
            return {
                releaseAll: () => {
                    // we release in reverse order
                    for (let i = releasers.length - 1; i >= 0; i--) {
                        releasers[i]()
                    }
                }
            }
        } catch (e) {
            // if something goes wrong - release what has already been captured
            for (let i = releasers.length - 1; i >= 0; i--) {
                releasers[i]()
            }
            throw e
        }
    }

    /**
     * A convenient option for multiple keys.
     */
    public async withLocks<T>(keys: K[], fn: () => Promise<T>, opts: AcquireOptions = {}): Promise<T> {
        const { releaseAll } = await this.lockMany(keys, opts)
        try {
            return await fn()
        } finally {
            releaseAll()
        }
    }

    private ensureQueue(key: K): Array<(v: void) => void> {
        let q = this.queues.get(key)
        if (!q) {
            q = []
            this.queues.set(key, q)
        }
        return q
    }

    private async waitTurn(entered: Promise<void>, opts: AcquireOptions): Promise<void> {
        const { timeoutMs, signal } = opts

        if (!timeoutMs && !signal) {
            await entered
            return
        }

        return new Promise<void>((resolve, reject) => {
            let settled = false
            const onResolve = () => {
                if (settled) { return }
                settled = true
                cleanup()
                resolve()
            }
            const onAbort = () => {
                if (settled) { return }
                settled = true
                cleanup()
                reject(new Error('Lock acquisition aborted'))
            }
            const onTimeout = () => {
                if (settled) { return }
                settled = true
                cleanup()
                reject(new Error('Lock acquisition timed out'))
            }

            let tm: NodeJS.Timeout | null = null
            const cleanup = () => {
                if (signal) {
                    signal.removeEventListener('abort', onAbort)
                }
                if (tm) {
                    clearTimeout(tm)
                }
            }

            if (signal) {
                if (signal.aborted) {
                    onAbort()
                    return
                }
                signal.addEventListener('abort', onAbort)
            }
            if (timeoutMs && timeoutMs > 0) {
                tm = setTimeout(onTimeout, timeoutMs)
            }

            entered.then(onResolve, reject)
        })
    }
}
