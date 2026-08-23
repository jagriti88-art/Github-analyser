/**
 * Tiny in-memory TTL cache. Analyses are expensive (up to 8 GitHub calls plus an
 * LLM round trip), and a repo's metrics do not change minute to minute.
 */
export class TtlCache {
  #store = new Map();

  constructor(ttlMs) {
    this.ttlMs = ttlMs;
  }

  get(key) {
    const hit = this.#store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.#store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key, value) {
    this.#store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    return value;
  }

  get size() {
    return this.#store.size;
  }
}
