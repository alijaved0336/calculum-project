import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const fetchCustomAttributes = vi.fn()
vi.mock('@/api', () => ({
  fetchCustomAttributes: (...args: unknown[]) => fetchCustomAttributes(...args),
}))

import { useCustomAttributesStore } from '@/stores/customAttributes'

const definitionsV1 = [{ ordinal: 1, title: 'Region', dataType: 'text', aggregation: 'list', hasData: true }]
const definitionsV2 = [{ ordinal: 2, title: 'Segment', dataType: 'text', aggregation: 'list', hasData: true }]

describe('the AR custom attributes store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchCustomAttributes.mockReset()
  })

  it('loads the schema for a version', async () => {
    fetchCustomAttributes.mockResolvedValue(definitionsV1)
    const store = useCustomAttributesStore()

    const ok = await store.load(1)

    expect(ok).toBe(true)
    expect(store.definitions).toEqual(definitionsV1)
    expect(store.loading).toBe(false)
  })

  it('clears the schema for a null version without fetching', async () => {
    const store = useCustomAttributesStore()

    const ok = await store.load(null)

    expect(ok).toBe(true)
    expect(store.definitions).toEqual([])
    expect(fetchCustomAttributes).not.toHaveBeenCalled()
  })

  it('resolves false and clears definitions on a failed fetch', async () => {
    fetchCustomAttributes.mockRejectedValue(new Error('network error'))
    const store = useCustomAttributesStore()

    const ok = await store.load(1)

    expect(ok).toBe(false)
    expect(store.definitions).toEqual([])
  })

  it('no-ops a second call for the already-loaded version', async () => {
    fetchCustomAttributes.mockResolvedValue(definitionsV1)
    const store = useCustomAttributesStore()

    await store.load(1)
    const ok = await store.load(1)

    expect(ok).toBe(true)
    expect(fetchCustomAttributes).toHaveBeenCalledTimes(1)
  })

  /**
   * Regression for thread 129672 / Navbar.vue's own watch(selectedSpendFile) race: Navbar can
   * call `load()` for the same NEW version from two places in the same tick (loadSpendFiles'
   * explicit await, and the watcher its own preselection triggers). The second call must await
   * the SAME in-flight request rather than resolving immediately - resolving early let a caller
   * open layoutStore's session-validated gate before the real fetch had actually landed.
   */
  it('makes a duplicate call for the same in-flight version await the real request instead of resolving early', async () => {
    let resolveFetch: ((value: typeof definitionsV1) => void) | undefined
    fetchCustomAttributes.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )
    const store = useCustomAttributesStore()

    const first = store.load(1)
    const second = store.load(1)
    let secondResolved = false
    second.then(() => {
      secondResolved = true
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(secondResolved).toBe(false) // still waiting on the real fetch, not resolved early

    resolveFetch?.(definitionsV1)
    await first
    await second

    expect(secondResolved).toBe(true)
    expect(store.definitions).toEqual(definitionsV1)
    expect(fetchCustomAttributes).toHaveBeenCalledTimes(1)
  })

  it('discards a stale response for an older version that resolves after a newer one', async () => {
    let resolveFirst: ((value: typeof definitionsV1) => void) | undefined
    fetchCustomAttributes
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(() => Promise.resolve(definitionsV2))
    const store = useCustomAttributesStore()

    const first = store.load(1)
    const second = store.load(2)
    await second

    expect(store.definitions).toEqual(definitionsV2)

    resolveFirst?.(definitionsV1)
    await first

    // The late, stale response for version 1 must not overwrite version 2's data.
    expect(store.definitions).toEqual(definitionsV2)
  })

  /** Sign-out (UC-ENT-09): the tenant's schema must not survive into the next sign-in. */
  it('resets everything on clear(), including an in-flight request', async () => {
    let resolveFetch: ((value: typeof definitionsV1) => void) | undefined
    fetchCustomAttributes.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )
    const store = useCustomAttributesStore()
    const pending = store.load(1)

    store.clear()

    expect(store.definitions).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.loadedVersionId).toBeNull()

    // The in-flight request from before clear() must not repopulate the store once it resolves.
    resolveFetch?.(definitionsV1)
    await pending
    expect(store.definitions).toEqual([])
  })
})
