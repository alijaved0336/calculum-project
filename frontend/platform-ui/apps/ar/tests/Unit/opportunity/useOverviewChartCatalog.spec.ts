import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

const fetchOpportunityChartCatalog = vi.fn()

vi.mock('@/api', () => ({
  fetchOpportunityChartCatalog: (...args: unknown[]) => fetchOpportunityChartCatalog(...args),
}))

vi.mock('@ada/auth', () => ({ authLogin: vi.fn() }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

import { HttpError, SessionExpiredError } from '@/api/http'
import {
  resetOverviewChartCatalogCache,
  useOverviewChartCatalog,
} from '@/modules/opportunity/composables/useOverviewChartCatalog'
import { useContextStore } from '@/stores/context'

const VERSION = '1653c234-9318-4707-a6c3-33f4b427126c'
const OTHER_VERSION = '2764d345-a429-5818-b7d4-44f5c5382237'

const catalog = [
  { groupName: 'volume', index: 0, numericType: 'money', type: 'category', selected: true, translation: null, options: [] },
]
const otherCatalog = [
  { groupName: 'buyers', index: 0, numericType: 'count', type: 'category', selected: true, translation: null, options: [] },
]

/** Lets the immediate watcher and its awaited fetch settle before anything is asserted. */
async function settle(): Promise<void> {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('useOverviewChartCatalog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchOpportunityChartCatalog.mockReset()
    resetOverviewChartCatalogCache()
  })

  afterEach(() => {
    resetOverviewChartCatalogCache()
  })

  it('does not fetch while no version is selected', async () => {
    const menu = useOverviewChartCatalog()
    await settle()

    expect(fetchOpportunityChartCatalog).not.toHaveBeenCalled()
    expect(menu.loading.value).toBe(true)
  })

  it('loads the catalog for the selected version', async () => {
    fetchOpportunityChartCatalog.mockResolvedValue(catalog)
    const context = useContextStore()

    const menu = useOverviewChartCatalog()
    context.setVersion(7, VERSION)
    await settle()

    expect(fetchOpportunityChartCatalog).toHaveBeenCalledWith(VERSION)
    expect(menu.measures.value).toEqual(catalog)
    expect(menu.loading.value).toBe(false)
  })

  it('flags a non-forbidden failure as a load error', async () => {
    fetchOpportunityChartCatalog.mockRejectedValue(new HttpError(500, 'GET /x', 'boom'))
    const context = useContextStore()

    const menu = useOverviewChartCatalog()
    context.setVersion(7, VERSION)
    await settle()

    expect(menu.loadError.value).toBe(true)
    expect(menu.loading.value).toBe(false)
  })

  it('does not treat a 403 (module missing) as a load error', async () => {
    fetchOpportunityChartCatalog.mockRejectedValue(new HttpError(403, 'GET /x', 'no module'))
    const context = useContextStore()

    const menu = useOverviewChartCatalog()
    context.setVersion(7, VERSION)
    await settle()

    expect(menu.loadError.value).toBe(false)
    expect(menu.loading.value).toBe(false)
  })

  it('holds the loading state when the session expired, because the page is leaving', async () => {
    fetchOpportunityChartCatalog.mockRejectedValue(new SessionExpiredError('GET /x'))
    const context = useContextStore()

    const menu = useOverviewChartCatalog()
    context.setVersion(7, VERSION)
    await settle()

    expect(menu.loading.value).toBe(true)
    expect(menu.loadError.value).toBe(false)
  })

  /**
   * Regression for threads 129655/129675: without re-raising `loading` (and resetting
   * `loadError`) at the start of a new version's load, `menuReady` (`!loading`) would read true
   * for the new version's card while its own fetch was still in flight, letting
   * useOverviewChart's watcher fire with the PREVIOUS version's measure/dimension - a request the
   * server's per-version allow-list refuses.
   */
  it('re-raises loading (and clears loadError) on every version change, not just the first', async () => {
    fetchOpportunityChartCatalog.mockRejectedValueOnce(new HttpError(500, 'GET /x', 'boom'))
    const context = useContextStore()

    const menu = useOverviewChartCatalog()
    context.setVersion(7, VERSION)
    await settle()

    expect(menu.loadError.value).toBe(true)
    expect(menu.loading.value).toBe(false)

    let releaseSecond: (value: unknown) => void = () => {}
    fetchOpportunityChartCatalog.mockReturnValueOnce(
      new Promise((resolve) => {
        releaseSecond = resolve
      }),
    )

    context.setVersion(8, OTHER_VERSION)
    await nextTick()

    // The new version's fetch is still in flight: loading must be back on, and the previous
    // failure must not still be showing.
    expect(menu.loading.value).toBe(true)
    expect(menu.loadError.value).toBe(false)

    releaseSecond(otherCatalog)
    await settle()

    expect(menu.measures.value).toEqual(otherCatalog)
    expect(menu.loading.value).toBe(false)
  })

  /**
   * Regression for thread 129655: a stale, slower version response landing after a fresher one
   * must not overwrite the fresher version's menu.
   */
  it('lets a stale response lose to a fresher one', async () => {
    const context = useContextStore()

    let releaseFirst: (value: unknown) => void = () => {}
    const first = new Promise((resolve) => {
      releaseFirst = resolve
    })

    fetchOpportunityChartCatalog.mockReturnValueOnce(first).mockResolvedValueOnce(otherCatalog)

    const menu = useOverviewChartCatalog()
    context.setVersion(7, VERSION)
    await nextTick()

    context.setVersion(8, OTHER_VERSION)
    await settle()

    releaseFirst(catalog)
    await settle()

    expect(menu.measures.value).toEqual(otherCatalog)
    expect(menu.loading.value).toBe(false)
  })
})
