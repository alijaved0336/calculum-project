/**
 * Component tests for Strategies.vue (WI#18682 — AC-08: consistent save/read
 * spend-file context).
 *
 * Covers the race-condition guard added around the Supplier/Peer Group Standard
 * 2.0 combination-group save & read flow:
 * - onMounted's initial fetch is skipped while a company/spend-file change is in
 *   flight (getDisableWatchers === true).
 * - retrieveStrategies() re-fires once the transition settles (true -> false).
 * - saveStrategies()/saveMax() refuse to post while the transition is in flight.
 *
 * Also covers the AB#20488 TEMPORARY gate: non super admins never get the
 * Supplier Standard 2.0 / Peer Group Standard 2.0 rows, nor send them on save.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { reactive, nextTick } from 'vue'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../Helpers/mountWithProviders'

const mockToast = { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }
vi.mock('vue-toastification', () => ({ useToast: () => mockToast }))

const globalFiltersStoreMock = reactive({ getDisableWatchers: false })
vi.mock('@/stores/globalFilters', () => ({
  useGlobalFiltersStore: () => globalFiltersStoreMock,
}))

const retrieveStrategiesMock = vi.fn()
const postConfigStrategiesMock = vi.fn()
const getCappedTableMock = vi.fn()
vi.mock('@/stores/home', () => ({
  useHomeStore: () => ({
    retrieveStrategies: retrieveStrategiesMock,
    postConfigStrategies: postConfigStrategiesMock,
    getCappedTable: getCappedTableMock,
  }),
}))

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    setPayOnTermsStrategyAllowed: vi.fn(),
  }),
}))

const mockUser = reactive({
  activeSpendFileVersion: { '@id': '/api/spend_file_versions/sfv-1' },
})
const mockUserIsSuperAdmin = { value: true }
vi.mock('@/services/user/composables/useUser', () => ({
  default: () => ({
    user: { value: mockUser },
    useFeatureScfStrategy: () => true,
    userIsSuperAdmin: mockUserIsSuperAdmin,
  }),
}))

vi.mock('@/services/router', () => ({
  default: { push: vi.fn() },
}))

import Strategies from '@/modules/home/views/settings/Strategies.vue'

function mountStrategies(): VueWrapper {
  return mountWithProviders(Strategies, {
    props: { showAlert: false, otherTab: null, sectionDefault: null, spendFileInrecalculation: false },
    shallow: true,
  })
}

describe('Strategies.vue — AC-08 save/read consistency guard', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    globalFiltersStoreMock.getDisableWatchers = false
    retrieveStrategiesMock.mockClear()
    postConfigStrategiesMock.mockClear()
    mockToast.error.mockClear()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('fetches strategies on mount when no company/spend-file change is in flight', () => {
    wrapper = mountStrategies()
    expect(retrieveStrategiesMock).toHaveBeenCalledTimes(1)
  })

  it('skips the initial fetch on mount while getDisableWatchers is true', () => {
    globalFiltersStoreMock.getDisableWatchers = true
    wrapper = mountStrategies()
    expect(retrieveStrategiesMock).not.toHaveBeenCalled()
  })

  it('re-fetches once the company/spend-file transition settles (true -> false)', async () => {
    globalFiltersStoreMock.getDisableWatchers = true
    wrapper = mountStrategies()
    expect(retrieveStrategiesMock).not.toHaveBeenCalled()

    globalFiltersStoreMock.getDisableWatchers = false
    await nextTick()

    expect(retrieveStrategiesMock).toHaveBeenCalledTimes(1)
  })

  it('does not re-fetch on unrelated flag noise (false -> false)', async () => {
    wrapper = mountStrategies()
    retrieveStrategiesMock.mockClear()

    globalFiltersStoreMock.getDisableWatchers = false
    await nextTick()

    expect(retrieveStrategiesMock).not.toHaveBeenCalled()
  })

  it('blocks saveStrategies() while getDisableWatchers is true, with no API call', async () => {
    wrapper = mountStrategies()
    globalFiltersStoreMock.getDisableWatchers = true
    await nextTick()

    ;(wrapper.vm as any).saveStrategies()

    expect(postConfigStrategiesMock).not.toHaveBeenCalled()
    expect(mockToast.error).toHaveBeenCalled()
  })

  it('allows saveStrategies() to post once the transition has settled', async () => {
    wrapper = mountStrategies()
    globalFiltersStoreMock.getDisableWatchers = false
    await nextTick()

    ;(wrapper.vm as any).saveStrategies()

    expect(postConfigStrategiesMock).toHaveBeenCalledTimes(1)
    const params = postConfigStrategiesMock.mock.calls[0][0]
    expect(params.spendUUID).toBe('/api/spend_file_versions/sfv-1')
  })
})

describe('Strategies.vue — AB#20488 SS2.0 / PG2.0 visible to super admins only', () => {
  let wrapper: VueWrapper

  const STRATEGY_KEYS_FROM_API = [
    'payOnTermsStrategy',
    'supplierStandardStrategy',
    'supplierStandard2Strategy',
    'peerGroupAvgStrategy',
    'peerGroupStandard2Strategy',
  ]

  /** Mount, then answer the Setup fetch the way the store would. */
  function mountAndLoadStrategies(): VueWrapper {
    const mounted = mountStrategies()
    const { callbackSuccess } = retrieveStrategiesMock.mock.calls[0][0]
    callbackSuccess({
      strategies: STRATEGY_KEYS_FROM_API.map((key) => ({ key, isAllowed: true })),
    })
    return mounted
  }

  function loadedKeys(): string[] {
    return (wrapper.vm as any).dataStrategies.map((strategy: { key: string }) => strategy.key)
  }

  beforeEach(() => {
    globalFiltersStoreMock.getDisableWatchers = false
    retrieveStrategiesMock.mockClear()
    postConfigStrategiesMock.mockClear()
    vi.mocked(localStorage.setItem).mockClear()
  })

  afterEach(() => {
    wrapper?.unmount()
    mockUserIsSuperAdmin.value = true
  })

  it('keeps both 2.0 strategies for a super admin', () => {
    mockUserIsSuperAdmin.value = true
    wrapper = mountAndLoadStrategies()

    expect(loadedKeys()).toEqual(STRATEGY_KEYS_FROM_API)
  })

  it('drops both 2.0 strategies for a non super admin and leaves the rest', () => {
    mockUserIsSuperAdmin.value = false
    wrapper = mountAndLoadStrategies()

    expect(loadedKeys()).toEqual(['payOnTermsStrategy', 'supplierStandardStrategy', 'peerGroupAvgStrategy'])
  })

  it('does not send the 2.0 strategies when a non super admin saves', async () => {
    mockUserIsSuperAdmin.value = false
    wrapper = mountAndLoadStrategies()
    await nextTick()

    ;(wrapper.vm as any).saveStrategies()

    expect(postConfigStrategiesMock).toHaveBeenCalledTimes(1)
    const sentKeys = postConfigStrategiesMock.mock.calls[0][0].strategies.map(
      (strategy: { key: string }) => strategy.key,
    )
    expect(sentKeys).not.toContain('supplierStandard2Strategy')
    expect(sentKeys).not.toContain('peerGroupStandard2Strategy')
  })

  it('caches the filtered list, so the unsaved-changes check does not see a difference', () => {
    mockUserIsSuperAdmin.value = false
    wrapper = mountAndLoadStrategies()

    // tests/setup.ts replaces localStorage with vi.fn() stubs, so read the write itself
    const cacheWrite = vi
      .mocked(localStorage.setItem)
      .mock.calls.find(([storageKey]) => storageKey === 'initialStrategies')
    expect(cacheWrite).toBeDefined()
    const cachedKeys = JSON.parse(cacheWrite![1]).map((strategy: { key: string }) => strategy.key)
    expect(cachedKeys).toEqual(loadedKeys())
  })
})
