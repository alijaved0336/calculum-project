/**
 * Tests for useCurrencySwitcher composable
 *
 * Covers:
 * - changeCurrencyStore's 4 branches (same currency, invalid currency,
 *   same-rate short-circuit, real rate change)
 * - changeCurrencyRate success/error paths and the onComplete ordering
 * - getMaxDateSpend's validation guard and success chain into
 *   changeCurrencyRate
 * - goToHomeDashboard's store resets
 * - loadCurrencies' force-fetch vs fetch branch
 *
 * Extracted verbatim from HomeNavbar.vue (Sprint 116 US-2 refactor).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { reactive } from 'vue'

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})

const { sectionTogo } = vi.hoisted(() => ({ sectionTogo: vi.fn() }))
vi.mock('@/utils/RedirectSection', () => ({ sectionTogo }))
vi.mock('@/utils/memoryMonitor', () => ({
  memoryMonitor: { getMemoryStats: vi.fn(() => null) },
}))

const { appStore, homeStore, globalFiltersStore, analyzeStore, userStore } = vi.hoisted(() => ({
  appStore: {
    getCurrencies: [] as any[],
    setCurrencyAmount: vi.fn(),
    setCurrencyTo: vi.fn(),
    setCurrencyDate: vi.fn(),
    setCurrencyConversionUnavailable: vi.fn(),
    forceFetchCurrencies: vi.fn(),
    fetchCurrencies: vi.fn(),
  },
  homeStore: {
    changeCurrency: vi.fn(),
    getMaxDateSpendFileVersion: vi.fn(),
  },
  globalFiltersStore: { setValuesByColumn: vi.fn() },
  analyzeStore: { setFinancingsGroupsbyProgram: vi.fn(), setHarmonizationsGroupsbyProgram: vi.fn() },
  userStore: { getGuardURI: null as any, setLastSectionVisitedbyUser: vi.fn(), setGuardURI: vi.fn() },
}))

vi.mock('@/stores/app', () => ({ useAppStore: () => appStore }))
vi.mock('@/stores/home', () => ({ useHomeStore: () => homeStore }))
vi.mock('@/stores/globalFilters', () => ({ useGlobalFiltersStore: () => globalFiltersStore }))
vi.mock('@/stores/analyze', () => ({ useAnalyzeStore: () => analyzeStore }))
vi.mock('@/stores/user', () => ({ useUserStore: () => userStore }))

import useCurrencySwitcher from '@/modules/home/composables/useCurrencySwitcher'
import type { HomeNavBar } from '@/modules/home/types'

function makeData(overrides: Partial<HomeNavBar> = {}): HomeNavBar {
  return reactive({
    currency: 'USD',
    currencyFrom: 'USD',
    currencyDate: '2026-01-01',
    loading: false,
    toggleCurrencyDropdown: true,
    notLoadingCurrency: false,
    searchCurrency: '',
    ...overrides,
  }) as HomeNavBar
}

describe('useCurrencySwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appStore.getCurrencies = []
    userStore.getGuardURI = null
  })

  describe('changeCurrencyStore', () => {
    it('is a no-op (loading cleared) when the same currency is picked', () => {
      const data = makeData({ currency: 'EUR' })
      const { changeCurrencyStore } = useCurrencySwitcher(data)
      changeCurrencyStore('EUR')
      expect(data.loading).toBe(false)
      expect(homeStore.changeCurrency).not.toHaveBeenCalled()
    })

    it('is a no-op when currencyTo is falsy', () => {
      const data = makeData()
      const { changeCurrencyStore } = useCurrencySwitcher(data)
      changeCurrencyStore('')
      expect(data.loading).toBe(false)
      expect(homeStore.changeCurrency).not.toHaveBeenCalled()
    })

    it('is a no-op when currencyTo is the "no results" placeholder', () => {
      const data = makeData()
      const { changeCurrencyStore } = useCurrencySwitcher(data)
      changeCurrencyStore('No results found.')
      expect(data.loading).toBe(false)
      expect(homeStore.changeCurrency).not.toHaveBeenCalled()
    })

    it('short-circuits (no API call) when currencyFrom equals currencyTo case-insensitively', () => {
      vi.useFakeTimers()
      const data = makeData({ currency: 'EUR', currencyFrom: 'usd' })
      const { changeCurrencyStore } = useCurrencySwitcher(data)
      changeCurrencyStore('USD')

      expect(appStore.setCurrencyAmount).toHaveBeenCalledWith(1)
      expect(appStore.setCurrencyTo).toHaveBeenCalledWith('USD')
      // AC-05/EF-1 — no conversion was attempted, so any stale notice is cleared.
      expect(appStore.setCurrencyConversionUnavailable).toHaveBeenCalledWith(false)
      expect(homeStore.changeCurrency).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1000)
      expect(sectionTogo).toHaveBeenCalled()
      vi.useRealTimers()
    })

    it('dispatches a real currency-rate change otherwise', () => {
      const data = makeData({ currency: 'EUR', currencyFrom: 'EUR' })
      const { changeCurrencyStore } = useCurrencySwitcher(data)
      changeCurrencyStore('GBP')
      expect(homeStore.changeCurrency).toHaveBeenCalledWith(
        expect.objectContaining({ currencyTo: 'GBP' }),
      )
    })
  })

  describe('changeCurrencyRate', () => {
    it('on success: commits the rate, navigates home, then calls onComplete', () => {
      const data = makeData()
      const { changeCurrencyRate } = useCurrencySwitcher(data)
      const onComplete = vi.fn()
      changeCurrencyRate('GBP', onComplete)

      const { callbackSuccess } = homeStore.changeCurrency.mock.calls[0][0]
      callbackSuccess({ result: 1.5 })

      expect(appStore.setCurrencyAmount).toHaveBeenCalledWith(1.5)
      expect(appStore.setCurrencyTo).toHaveBeenCalledWith('GBP')
      // AC-05/EF-1 — the rate fetch succeeded, so any prior notice is cleared.
      expect(appStore.setCurrencyConversionUnavailable).toHaveBeenCalledWith(false)
      expect(globalFiltersStore.setValuesByColumn).toHaveBeenCalled()
      expect(onComplete).toHaveBeenCalled()
    })

    it('on error: clears loading, flags the conversion as unavailable, and still calls onComplete', () => {
      const data = makeData()
      const { changeCurrencyRate } = useCurrencySwitcher(data)
      const onComplete = vi.fn()
      changeCurrencyRate('GBP', onComplete)

      const { callbackError } = homeStore.changeCurrency.mock.calls[0][0]
      callbackError()

      expect(data.loading).toBe(false)
      // AC-05/EF-1 — surface "conversion unavailable" to dashboards watching the flag.
      expect(appStore.setCurrencyConversionUnavailable).toHaveBeenCalledWith(true)
      expect(onComplete).toHaveBeenCalled()
    })
  })

  describe('getMaxDateSpend', () => {
    it('clears loading and calls onComplete when the spend-file version uuid is empty', () => {
      const data = makeData({ loading: true })
      const { getMaxDateSpend } = useCurrencySwitcher(data)
      const onComplete = vi.fn()
      getMaxDateSpend(true, '', onComplete)
      expect(data.loading).toBe(false)
      expect(onComplete).toHaveBeenCalled()
      expect(homeStore.getMaxDateSpendFileVersion).not.toHaveBeenCalled()
    })

    it('on success: stores the end date and chains into changeCurrencyRate', () => {
      const data = makeData({ currency: 'EUR' })
      const { getMaxDateSpend } = useCurrencySwitcher(data)
      getMaxDateSpend(true, '/api/spend_file_versions/1')

      const { callbackSuccess } = homeStore.getMaxDateSpendFileVersion.mock.calls[0][0]
      callbackSuccess({ endDate: '2026-02-01' })

      expect(appStore.setCurrencyDate).toHaveBeenCalledWith('2026-02-01')
      expect(data.currencyDate).toBe('2026-02-01')
      expect(homeStore.changeCurrency).toHaveBeenCalledWith(
        expect.objectContaining({ currencyTo: 'EUR' }),
      )
    })
  })

  describe('goToHomeDashboard', () => {
    it('clears loading and resets the transient global-filters/analyze state', () => {
      const data = makeData({ loading: true })
      const { goToHomeDashboard } = useCurrencySwitcher(data)
      goToHomeDashboard()

      expect(data.loading).toBe(false)
      expect(globalFiltersStore.setValuesByColumn).toHaveBeenCalledWith({
        spends: [], suppliers: [], parents: [], potentials: [],
      })
      expect(analyzeStore.setFinancingsGroupsbyProgram).toHaveBeenCalledWith([])
      expect(analyzeStore.setHarmonizationsGroupsbyProgram).toHaveBeenCalledWith([])
      expect(sectionTogo).toHaveBeenCalled()
    })

    it('clears the guard URI only when one is set', () => {
      userStore.getGuardURI = '/some/guarded/route'
      const data = makeData()
      const { goToHomeDashboard } = useCurrencySwitcher(data)
      goToHomeDashboard()

      expect(userStore.setLastSectionVisitedbyUser).toHaveBeenCalledWith(null)
      expect(userStore.setGuardURI).toHaveBeenCalledWith(null)
    })
  })

  describe('loadCurrencies', () => {
    it('force-fetches when the store has no currencies yet', async () => {
      appStore.getCurrencies = []
      appStore.forceFetchCurrencies.mockImplementation(async (onSuccess: any) => onSuccess())
      const data = makeData()
      const { loadCurrencies } = useCurrencySwitcher(data)

      await loadCurrencies()

      expect(appStore.forceFetchCurrencies).toHaveBeenCalled()
      expect(appStore.fetchCurrencies).not.toHaveBeenCalled()
      expect(data.notLoadingCurrency).toBe(true)
    })

    it('does a regular fetch when currencies are already loaded', async () => {
      appStore.getCurrencies = ['USD', 'EUR']
      appStore.fetchCurrencies.mockImplementation(async (onSuccess: any) => onSuccess())
      const data = makeData()
      const { loadCurrencies } = useCurrencySwitcher(data)

      await loadCurrencies()

      expect(appStore.fetchCurrencies).toHaveBeenCalled()
      expect(appStore.forceFetchCurrencies).not.toHaveBeenCalled()
      expect(data.notLoadingCurrency).toBe(true)
    })
  })

  describe('currencyFilteredList', () => {
    it('filters the currency list by the current search term', () => {
      appStore.getCurrencies = ['USD', 'EUR', 'GBP']
      const data = makeData({ searchCurrency: 'eu' })
      const { currencyFilteredList } = useCurrencySwitcher(data)
      expect(currencyFilteredList.value).toEqual(['EUR'])
    })

    it('returns a translated placeholder when nothing matches', () => {
      appStore.getCurrencies = ['USD', 'EUR']
      const data = makeData({ searchCurrency: 'zzz' })
      const { currencyFilteredList } = useCurrencySwitcher(data)
      expect(currencyFilteredList.value).toEqual(['home.components.navbar.topMenu.noResultsFound'])
    })
  })
})
