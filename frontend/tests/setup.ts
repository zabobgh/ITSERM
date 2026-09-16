// Node 25 exposes an incomplete global localStorage when no backing file is set.
// Keep the browser-state tests deterministic with a standards-shaped memory store.
const values = new Map<string, string>()
const storage: Storage = {
  get length() { return values.size },
  clear() { values.clear() },
  getItem(key: string) { return values.has(key) ? values.get(key)! : null },
  key(index: number) { return Array.from(values.keys())[index] ?? null },
  removeItem(key: string) { values.delete(key) },
  setItem(key: string, value: string) { values.set(String(key), String(value)) }
}
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
Object.defineProperty(window, 'localStorage', { configurable: true, value: storage })
