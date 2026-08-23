type TrieNode<V> = TrieBranch<V> | TrieValue<V>;

interface TrieBranch<V> {
  readonly kind: "branch";
  readonly children: ReadonlyMap<number, TrieNode<V>>;
  readonly value: TrieValue<V> | null;
}

interface TrieValue<V> {
  readonly kind: "value";
  readonly key: string;
  readonly value: V;
}

const EMPTY_CHILDREN: ReadonlyMap<number, never> = new Map<number, never>();

function mapIterator<T>(iterator: IterableIterator<T>): MapIterator<T> {
  Object.defineProperty(iterator, Symbol.dispose, {
    configurable: true,
    value: () => undefined,
  });
  return iterator as MapIterator<T>;
}

function branch<V>(
  children: ReadonlyMap<number, TrieNode<V>> = EMPTY_CHILDREN,
  value: TrieValue<V> | null = null,
): TrieBranch<V> {
  return Object.freeze({ children, kind: "branch", value });
}

function valueNode<V>(key: string, value: V): TrieValue<V> {
  return Object.freeze({ key, kind: "value", value });
}

function lookup<V>(root: TrieBranch<V>, key: string): TrieValue<V> | null {
  let current = root;
  for (let index = 0; index < key.length; index += 1) {
    const child = current.children.get(key.charCodeAt(index));
    if (child === undefined || child.kind === "value") return null;
    current = child;
  }
  return current.value?.key === key ? current.value : null;
}

function insert<V>(
  current: TrieBranch<V>,
  key: string,
  nextValue: V,
  offset: number,
  writes: { count: number },
): TrieBranch<V> {
  writes.count += current.children.size + 1;
  if (offset === key.length) {
    return branch(current.children, valueNode(key, nextValue));
  }

  const code = key.charCodeAt(offset);
  const existing = current.children.get(code);
  const child = existing?.kind === "branch" ? existing : branch<V>();
  const nextChild = insert(child, key, nextValue, offset + 1, writes);
  const children = new Map(current.children);
  children.set(code, nextChild);
  return branch(children, current.value);
}

function remove<V>(
  current: TrieBranch<V>,
  key: string,
  offset: number,
  writes: { count: number },
): TrieBranch<V> | null {
  writes.count += current.children.size + 1;
  if (offset === key.length) {
    if (current.value === null) return current;
    return current.children.size === 0 ? null : branch(current.children, null);
  }

  const code = key.charCodeAt(offset);
  const existing = current.children.get(code);
  if (existing === undefined || existing.kind === "value") return current;
  const nextChild = remove(existing, key, offset + 1, writes);
  if (nextChild === existing) return current;
  const children = new Map(current.children);
  if (nextChild === null) children.delete(code);
  else children.set(code, nextChild);
  return children.size === 0 && current.value === null
    ? null
    : branch(children, current.value);
}

function* valuesOf<V>(node: TrieBranch<V>): IterableIterator<TrieValue<V>> {
  if (node.value !== null) yield node.value;
  for (const code of [...node.children.keys()].sort((a, b) => a - b)) {
    const child = node.children.get(code)!;
    if (child.kind === "value") yield child;
    else yield* valuesOf(child);
  }
}

export interface PersistentMapMutation<K extends string, V> {
  readonly map: PersistentStringMap<K, V>;
  readonly structural_writes: number;
}

export class PersistentStringMap<K extends string, V> implements ReadonlyMap<
  K,
  V
> {
  readonly #root: TrieBranch<V>;
  readonly #size: number;

  private constructor(root: TrieBranch<V>, size: number) {
    this.#root = root;
    this.#size = size;
  }

  static empty<K extends string, V>(): PersistentStringMap<K, V> {
    return new PersistentStringMap<K, V>(branch(), 0);
  }

  get size(): number {
    return this.#size;
  }

  get(key: K): V | undefined {
    return lookup(this.#root, key)?.value;
  }

  has(key: K): boolean {
    return lookup(this.#root, key) !== null;
  }

  set(key: K, value: V): PersistentMapMutation<K, V> {
    const writes = { count: 0 };
    const exists = this.has(key);
    return Object.freeze({
      map: new PersistentStringMap<K, V>(
        insert(this.#root, key, value, 0, writes),
        this.#size + (exists ? 0 : 1),
      ),
      structural_writes: writes.count,
    });
  }

  delete(key: K): PersistentMapMutation<K, V> {
    if (!this.has(key)) {
      return Object.freeze({ map: this, structural_writes: 0 });
    }
    const writes = { count: 0 };
    return Object.freeze({
      map: new PersistentStringMap<K, V>(
        remove(this.#root, key, 0, writes) ?? branch(),
        this.#size - 1,
      ),
      structural_writes: writes.count,
    });
  }

  entries(): MapIterator<[K, V]> {
    const root = this.#root;
    return mapIterator(
      (function* () {
        for (const entry of valuesOf(root)) {
          yield [entry.key as K, entry.value] as [K, V];
        }
      })(),
    );
  }

  keys(): MapIterator<K> {
    const source = this.entries();
    return mapIterator(
      (function* () {
        for (const [key] of source) yield key;
      })(),
    );
  }

  values(): MapIterator<V> {
    const source = this.entries();
    return mapIterator(
      (function* () {
        for (const [, value] of source) yield value;
      })(),
    );
  }

  forEach(
    callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
    thisArg?: unknown,
  ): void {
    for (const [key, value] of this.entries()) {
      callbackfn.call(thisArg, value, key, this);
    }
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }

  get [Symbol.toStringTag](): string {
    return "PersistentStringMap";
  }
}
