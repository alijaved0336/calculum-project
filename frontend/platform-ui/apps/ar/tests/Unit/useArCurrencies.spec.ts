import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'

const fetchCurrencies = vi.fn()
const fetchCurrencyConversionRate = vi.fn()
vi.mock('@/api', () => ({
  fetchCurrencies: (...args: unknown[]) => fetchCurrencies(...args),
  fetchCurrencyConversionRate: (...args: unknown[]) => fetchCurrencyConversionRate(...args),
}))

import { useArCurrencies } from '@/composables/useArCurrencies'
import { DEFAULT_CURRENCY_CODE, useArCurrenciesStore } from '@/stores/arCurrencies'
import { useContextStore } from '@/stores/context'

const catalog = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
]

describe('useArCurrencies', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchCurrencies.mockReset()
    fetchCurrencyConversionRate.mockReset()
  })

  it('loads the catalog and maps it to dropdown options labelled with symbol and code together (AC#5)', async () => {
    fetchCurrencies.mockResolvedValue(catalog)
    const { currencies, loadCurrencies } = useArCurrencies()

    await loadCurrencies()

    expect(currencies.value).toEqual([
      { value: 'USD', label: '$ USD' },
      { value: 'EUR', label: '€ EUR' },
    ])
  })

  it("labels an option with its own API symbol when the catalog carries one, not the Intl-derived guess", async () => {
    fetchCurrencies.mockResolvedValue([{ code: 'USD', name: 'US Dollar', symbol: 'US$' }])
    const { currencies, loadCurrencies } = useArCurrencies()

    await loadCurrencies()

    expect(currencies.value).toEqual([{ value: 'USD', label: 'US$ USD' }])
  })

  it('labels an option with the bare code alone when no symbol can be resolved at all, never duplicating it', async () => {
    fetchCurrencies.mockResolvedValue([{ code: 'ZZZ', name: 'Unrecognized' }])
    const { currencies, loadCurrencies } = useArCurrencies()

    await loadCurrencies()

    expect(currencies.value).toEqual([{ value: 'ZZZ', label: 'ZZZ' }])
  })

  it('exposes the selected currency symbol, defaulting to USD\'s before anything loads', () => {
    const { selectedCurrencySymbol } = useArCurrencies()

    expect(selectedCurrencySymbol.value).toBe('$')
  })

  it('does not refetch once the store already has a catalog (2.2)', async () => {
    fetchCurrencies.mockResolvedValue(catalog)
    const { loadCurrencies } = useArCurrencies()

    await loadCurrencies()
    await loadCurrencies()

    expect(fetchCurrencies).toHaveBeenCalledTimes(1)
  })

  it('defaults the selection to USD and keeps it selected on mount/reload', () => {
    const { selectedCurrency } = useArCurrencies()

    expect(selectedCurrency.value).toBe(DEFAULT_CURRENCY_CODE)
  })

  it('defaults the FX rate to 1', () => {
    const { currency } = useArCurrencies()

    expect(currency.value).toBe(1)
  })

  it('persists a real selection across composable instances (simulating a reload)', async () => {
    fetchCurrencyConversionRate.mockResolvedValue({ rate: 0.93225 })
    const first = useArCurrencies()
    await first.selectCurrency('EUR')

    const second = useArCurrencies()

    expect(second.selectedCurrency.value).toBe('EUR')
  })

  it('resets a selection that is no longer in the loaded catalog back to USD', async () => {
    const store = useArCurrenciesStore()
    store.setSelectedCurrency('GBP')
    fetchCurrencies.mockResolvedValue(catalog)

    const { selectedCurrency, loadCurrencies } = useArCurrencies()
    await loadCurrencies()

    expect(selectedCurrency.value).toBe(DEFAULT_CURRENCY_CODE)
  })

  it('selectCurrency writes straight into the store', async () => {
    fetchCurrencyConversionRate.mockResolvedValue({ rate: 0.93225 })
    const { selectCurrency } = useArCurrencies()

    await selectCurrency('EUR')

    expect(useArCurrenciesStore().selectedCurrency).toBe('EUR')
  })

  /**
   * The conversion request (1.1): `GET /api/currency-rate?from=USD&to=<code>&asOf=<date>` - the
   * date is the active sale file version's own `periodEndDate` off `useContextStore` - and the
   * response's `rate` lands in `store.currency` (1.2).
   */
  describe('currency conversion (/api/currency-rate)', () => {
    it('converts USD to the selected currency, dated to the context periodEndDate, and stores the rate', async () => {
      useContextStore().setPeriods('2026-01-01', '2026-01-31')
      fetchCurrencyConversionRate.mockResolvedValue({ rate: 0.93225 })

      const { selectCurrency, currency } = useArCurrencies()
      await selectCurrency('EUR')

      expect(fetchCurrencyConversionRate).toHaveBeenCalledWith('EUR', '2026-01-31')
      expect(currency.value).toBe(0.93225)
    })

    it('sends an empty asOf when the context has no periodEndDate yet', async () => {
      fetchCurrencyConversionRate.mockResolvedValue({ rate: 0.93225 })

      const { selectCurrency } = useArCurrencies()
      await selectCurrency('EUR')

      expect(fetchCurrencyConversionRate).toHaveBeenCalledWith('EUR', '')
    })

    it('skips the request and sets the rate to 1 when USD is (re)selected', async () => {
      const { selectCurrency, currency } = useArCurrencies()

      await selectCurrency('USD')

      expect(fetchCurrencyConversionRate).not.toHaveBeenCalled()
      expect(currency.value).toBe(1)
    })

    it('makes no store change at all when the conversion request fails - not even a revert-to-1', async () => {
      // Start from a real, already-confirmed selection (not the 1/USD defaults), so "no change"
      // is actually observable rather than coincidentally matching the initial state.
      fetchCurrencyConversionRate.mockResolvedValue({ rate: 0.93225 })
      const { selectCurrency, selectedCurrency, currency } = useArCurrencies()
      await selectCurrency('EUR')

      fetchCurrencyConversionRate.mockRejectedValue(new Error('not found'))
      await selectCurrency('GBP')

      expect(selectedCurrency.value).toBe('EUR')
      expect(currency.value).toBe(0.93225)
    })
  })

  /**
   * Regression: `selectedCurrency` is persisted (survives a reload), but `currency` (the FX rate)
   * is not - and it depends on `context.periodEndDate`, which is unknown yet at the moment
   * `loadCurrencies` runs on mount and only resolves later, once a company/spend-file/version has
   * loaded. Without re-fetching once that date becomes known, a reload that restored e.g. "EUR"
   * left the rate stuck at the default 1 forever.
   */
  describe('re-syncing the rate once periodEndDate becomes known (reload bug)', () => {
    it('fetches the rate for the already-persisted selection once periodEndDate resolves after mount', async () => {
      useArCurrenciesStore().setSelectedCurrency('EUR') // simulates the persisted restore on reload
      fetchCurrencyConversionRate.mockResolvedValue({ rate: 0.93225 })

      const { currency } = useArCurrencies()
      expect(currency.value).toBe(1) // unresolved yet, same as right after a reload

      useContextStore().setPeriods('2026-01-01', '2026-01-31')
      await flushPromises()

      expect(fetchCurrencyConversionRate).toHaveBeenCalledWith('EUR', '2026-01-31')
      expect(currency.value).toBe(0.93225)
    })

    it('does not request a rate when periodEndDate resolves for a USD (default) selection', async () => {
      const { currency } = useArCurrencies()

      useContextStore().setPeriods('2026-01-01', '2026-01-31')
      await flushPromises()

      expect(fetchCurrencyConversionRate).not.toHaveBeenCalled()
      expect(currency.value).toBe(1)
    })

    it('re-fetches again when periodEndDate changes a second time (a spend-file/version switch)', async () => {
      useArCurrenciesStore().setSelectedCurrency('EUR')
      fetchCurrencyConversionRate.mockResolvedValue({ rate: 0.93225 })

      const { currency } = useArCurrencies()
      const context = useContextStore()
      context.setPeriods('2026-01-01', '2026-01-31')
      await flushPromises()
      expect(currency.value).toBe(0.93225)

      fetchCurrencyConversionRate.mockResolvedValue({ rate: 0.95 })
      context.setPeriods('2026-02-01', '2026-02-28')
      await flushPromises()

      expect(fetchCurrencyConversionRate).toHaveBeenLastCalledWith('EUR', '2026-02-28')
      expect(currency.value).toBe(0.95)
    })
  })
})
