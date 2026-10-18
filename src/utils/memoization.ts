/**
 * Memoization helpers for reducing unnecessary re-renders.
 *
 * @module
 */

/**
 * Deep-equality check for two values. Used by custom memo comparators
 * to avoid re-rendering when the props are structurally identical.
 */
export function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return a === b

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false

  const keysA = Object.keys(a as Record<string, unknown>)
  const keysB = Object.keys(b as Record<string, unknown>)
  if (keysA.length !== keysB.length) return false

  return keysA.every((key) =>
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  )
}

/**
 * Creates a memoized object from a factory function. Useful for building
 * `remainingSecondsMap`-style objects without creating a new reference
 * on every render.
 */
export function createMemoizedObject<K extends string, V>(
  keys: readonly K[],
  getter: (key: K) => V
): Record<K, V> {
  const result = {} as Record<K, V>
  for (const key of keys) {
    result[key] = getter(key)
  }
  return result
}
