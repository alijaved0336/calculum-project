import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_CURRENCY_CODE, useArCurrenciesStore } from '@/stores/arCurrencies'

describe('the AR currencies store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('defaults the selected currency to USD before anything loads', () => {
    const store = useArCurrenciesStore()

    expect(store.selectedCurrency).toBe(DEFAULT_CURRENCY_CODE)
    expect(store.currencies).toEqual([])
  })

  it('defaults the FX rate to 1, matching USD-to-USD', () => {
    const store = useArCurrenciesStore()

    expect(store.currency).toBe(1)
  })

  it('replaces the FX rate on setCurrency', () => {
    const store = useArCurrenciesStore()

    store.setCurrency(0.93225)

    expect(store.currency).toBe(0.93225)
  })

  it('replaces the catalog on setCurrencies', () => {
    const store = useArCurrenciesStore()
    const list = [{ code: 'EUR', name: 'Euro' }]

    store.setCurrencies(list)

    expect(store.currencies).toEqual(list)
  })

  it('falls back to USD rather than storing an empty selection', () => {
    const store = useArCurrenciesStore()

    store.setSelectedCurrency('')

    expect(store.selectedCurrency).toBe(DEFAULT_CURRENCY_CODE)
  })

  /**
   * Sign-out (UC-ENT-09). Unlike `context.ts`'s `buyersView` (a pure display toggle deliberately
   * left untouched), `selectedCurrency`/`currency` must both reset: a different tenant signing in
   * on the same browser inheriting e.g. EUR preselected with a stale rate would be silently wrong.
   */
  it('resets the catalog, selection and FX rate to their defaults on clear()', () => {
    const store = useArCurrenciesStore()
    store.setCurrencies([{ code: 'EUR', name: 'Euro' }])
    store.setSelectedCurrency('EUR')
    store.setCurrency(0.93225)

    store.clear()

    expect(store.currencies).toEqual([])
    expect(store.selectedCurrency).toBe(DEFAULT_CURRENCY_CODE)
    expect(store.currency).toBe(1)
  })

  /**
   * UC-UI-23's fallback chain, as seen from the store: the API's own `symbol` when the loaded
   * catalog entry carries one, else the Intl-derived symbol for the selected code, else the bare
   * code - never an empty prefix (AC#6), and correct before the catalog has even loaded (USD's
   * default selection with an empty catalog, matching a failed catalog fetch - A2).
   */
  describe('selectedCurrencySymbol', () => {
    it('resolves the default USD selection before any catalog has loaded', () => {
      const store = useArCurrenciesStore()

      expect(store.selectedCurrencySymbol).toBe('$')
    })

    it("uses the selected currency's own API symbol when the catalog carries one", () => {
      const store = useArCurrenciesStore()
      store.setCurrencies([{ code: 'EUR', name: 'Euro', symbol: '€' }])
      store.setSelectedCurrency('EUR')

      expect(store.selectedCurrencySymbol).toBe('€')
    })

    it('falls back to the Intl-derived symbol when the catalog entry has none (A1: backend half not yet merged)', () => {
      const store = useArCurrenciesStore()
      store.setCurrencies([{ code: 'EUR', name: 'Euro' }])
      store.setSelectedCurrency('EUR')

      expect(store.selectedCurrencySymbol).toBe('€')
    })

    it('falls back to the Intl-derived symbol when the catalog entry has a null symbol (AC#6)', () => {
      const store = useArCurrenciesStore()
      store.setCurrencies([{ code: 'GBP', name: 'Pound Sterling', symbol: null }])
      store.setSelectedCurrency('GBP')

      expect(store.selectedCurrencySymbol).toBe('£')
    })

    it('re-resolves reactively when the selection changes', () => {
      const store = useArCurrenciesStore()
      store.setCurrencies([
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      ])

      store.setSelectedCurrency('EUR')
      expect(store.selectedCurrencySymbol).toBe('€')

      store.setSelectedCurrency('JPY')
      expect(store.selectedCurrencySymbol).toBe('¥')
    })
  })

  /**
   * The generalized lookup `selectedCurrencySymbol` itself is now built on (PR 14881 review) - a
   * grid row denominated in its OWN currency (`MatchesTab`/`BuyerLinesGrid`'s own `volume` column)
   * is not necessarily the tenant's globally selected one, so it resolves the ROW's code, not
   * `selectedCurrency`.
   */
  describe('symbolForCode', () => {
    it("resolves an arbitrary code's own symbol, independent of the current selection", () => {
      const store = useArCurrenciesStore()
      store.setCurrencies([{ code: 'EUR', name: 'Euro', symbol: '€' }])
      store.setSelectedCurrency('USD')

      expect(store.symbolForCode('EUR')).toBe('€')
      expect(store.selectedCurrencySymbol).toBe('$')
    })

    it('falls back to the Intl-derived symbol for a code the catalog has not loaded yet', () => {
      const store = useArCurrenciesStore()

      expect(store.symbolForCode('GBP')).toBe('£')
    })

    it('resolves a falsy code to an empty string rather than guessing (a sale line with no currency)', () => {
      const store = useArCurrenciesStore()

      expect(store.symbolForCode(null)).toBe('')
      expect(store.symbolForCode(undefined)).toBe('')
      expect(store.symbolForCode('')).toBe('')
    })
  })
})
