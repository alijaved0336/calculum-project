import { computed, watch } from 'vue'
import { fetchCurrencies, fetchCurrencyConversionRate } from '@/api'
import { DEFAULT_CURRENCY_CODE, useArCurrenciesStore } from '@/stores/arCurrencies'
import { useContextStore } from '@/stores/context'
import { resolveCurrencySymbol } from '@/utils/currencySymbol'

/** The navbar dropdown's "Most Used" shortcut row - the same six codes AP's own currency
 * switcher (`useCurrencySwitcher.ts`) pins, in the same order. */
export const MOST_USED_CURRENCY_CODES = ['USD', 'EUR', 'CHF', 'CNY', 'JPY', 'GBP']

/**
 * Loads the currency catalog for the navbar's picker and exposes the tenant's selected currency,
 * keeping the API call - and its "don't refetch what's already there" guard - out of Navbar.vue.
 *
 * The store, not this composable, is what makes the selection survive a reload; `loadCurrencies`
 * re-validates it against the freshly loaded catalog every time it runs; a currency that is no
 * longer in the list (or was never a real one) falls back to USD rather than showing a selection
 * the dropdown cannot resolve to a label.
 */
export function useArCurrencies() {
  const store = useArCurrenciesStore()
  const context = useContextStore()

  /** Each option's own symbol beside its code (AC#5, e.g. "$ USD") - the same
   * `resolveCurrencySymbol` fallback chain `store.selectedCurrencySymbol` uses for the active
   * selection, applied per-row here since every option needs its OWN symbol, not just the
   * selected one's. A code that resolves to no symbol at all (falls back to the bare code) is
   * shown alone, never duplicated ("ZZZ ZZZ"). */
  const currencyOptions = computed(() =>
    store.currencies.map((currency) => {
      const symbol = resolveCurrencySymbol(currency.code, currency.symbol)
      return {
        value: currency.code,
        label: symbol === currency.code ? currency.code : `${symbol} ${currency.code}`,
      }
    }),
  )

  async function loadCurrencies(): Promise<void> {
    if (store.currencies.length === 0) {
      const list = await fetchCurrencies().catch(() => [])
      store.setCurrencies(list)
    }

    const isSelectedCurrencyAvailable = store.currencies.some(
      (currency) => currency.code === store.selectedCurrency,
    )
    if (store.currencies.length > 0 && !isSelectedCurrencyAvailable) {
      store.setSelectedCurrency(DEFAULT_CURRENCY_CODE)
    }
  }

  /**
   * The FX rate for `code`, as of the active version's `periodEndDate` - or `null` on a failed
   * request, so a caller can tell "the endpoint refused/errored" apart from a real rate (which
   * could in principle be falsy-looking in no realistic case, but never `null`).
   */
  async function fetchRateFor(code: string): Promise<number | null> {
    try {
      const { rate } = await fetchCurrencyConversionRate(code, context.periodEndDate ?? '')
      return rate
    } catch {
      return null
    }
  }

  /**
   * Selects a display currency and refreshes the USD -> `code` FX rate that backs it
   * (`store.currency`). USD itself short-circuits to a rate of 1 without a request - converting
   * USD to USD is always 1:1, so asking the endpoint for it would be a request for nothing, and
   * that request can never fail.
   *
   * **Applied only on a successful response, both fields at once.** A failed (or refused)
   * request makes NO store change at all - not even a revert-to-1 on the rate - so the dropdown
   * and the rate both stay exactly where the last CONFIRMED currency left them, the same
   * "renders where the server actually is, and simply never moves when the request fails"
   * reasoning `useCompanyPicker.select` documents for its own one-way-bound revert.
   */
  async function selectCurrency(code: string): Promise<void> {
    if (code === DEFAULT_CURRENCY_CODE) {
      store.setSelectedCurrency(code)
      store.setCurrency(1)
      return
    }

    const rate = await fetchRateFor(code)
    if (rate !== null) {
      store.setSelectedCurrency(code)
      store.setCurrency(rate)
    }
  }

  /**
   * Re-fetches the rate for whichever currency is ALREADY selected, without touching the
   * selection itself.
   *
   * Only `selectedCurrency` is persisted (see `useArCurrenciesStore`'s own doc) - `currency` (the
   * rate) is not, and it depends on `periodEndDate`, which is not known yet at the point
   * `loadCurrencies` runs on mount (it resolves later, once a company/spend-file/version has
   * loaded). Without this, a reload that restores a non-USD selection from persistence left the
   * rate stuck at the default `1` forever, silently under- or over-converting every money figure
   * in the app - a real bug, not a cosmetic one.
   */
  async function refreshCurrentRate(): Promise<void> {
    const code = store.selectedCurrency
    if (code === DEFAULT_CURRENCY_CODE) {
      store.setCurrency(1)
      return
    }

    const rate = await fetchRateFor(code)
    if (rate !== null) {
      store.setCurrency(rate)
    }
  }

  // Fires once `periodEndDate` becomes known (covers the reload case above) and again on every
  // later change (a spend-file/version switch), so the rate never gets to disagree with the
  // period it was supposedly computed for. Deliberately ungated/fire-and-forget, the same as
  // `loadCurrencies` itself - this is a background correction, not a user-initiated action.
  watch(
    () => context.periodEndDate,
    (periodEndDate) => {
      if (periodEndDate !== null) {
        void refreshCurrentRate()
      }
    },
  )

  return {
    currencies: currencyOptions,
    selectedCurrency: computed(() => store.selectedCurrency),
    selectedCurrencySymbol: computed(() => store.selectedCurrencySymbol),
    currency: computed(() => store.currency),
    mostUsedCurrencyCodes: MOST_USED_CURRENCY_CODES,
    loadCurrencies,
    selectCurrency,
  }
}
