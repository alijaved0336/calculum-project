/**
 * Guards an async load function against a stale response landing after a fresher one.
 *
 * Any `load()` bound to more than one trigger (`onMounted` plus a Refresh button, or
 * `onMounted` plus a `watch()` on a route param) can have two calls in flight at once, and
 * network timing gives no guarantee the one that started first also resolves first. Without
 * this guard, a slower response can land after a fresher one and silently revert the screen to
 * outdated data.
 *
 * ```ts
 * const { start, isStale } = useLoadToken()
 *
 * async function load() {
 *   const token = start()
 *   loading.value = true
 *   try {
 *     const result = await fetchThing()
 *     if (isStale(token)) return  // a newer call owns the screen now
 *     state.value = result
 *   } finally {
 *     if (!isStale(token)) loading.value = false
 *   }
 * }
 * ```
 */
export function useLoadToken() {
  let current = 0

  function start(): number {
    return ++current
  }

  function isStale(token: number): boolean {
    return token !== current
  }

  return { start, isStale }
}
