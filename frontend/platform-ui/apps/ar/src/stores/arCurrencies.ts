/**
 * The receivables navbar's currency picker: the catalog `useArCurrencies` loads it into, and
 * the tenant's selected display currency.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Currency } from '@/api'
import { secureStorage } from '@/services/pinia'
import { resolveCurrencySymbol } from '@/utils/currencySymbol'

export const DEFAULT_CURRENCY_CODE = 'USD'

export const useArCurrenciesStore = defineStore(
  'ar-currencies',
  () => {
    const currencies = ref<Currency[]>([])
    const selectedCurrency = ref<string>(DEFAULT_CURRENCY_CODE)

    // The USD -> selectedCurrency FX rate (`/api/convert`'s own `result`), refreshed every time
    // `useArCurrencies.selectCurrency` changes the selection. 1 until then, matching USD itself
    // being a 1:1 rate against its own default.
    const currency = ref<number>(1)

    function setCurrencies(list: Currency[]): void {
      currencies.value = list
    }

    function setSelectedCurrency(code: string): void {
      selectedCurrency.value = code || DEFAULT_CURRENCY_CODE
    }

    function setCurrency(rate: number): void {
      currency.value = rate
    }

    /**
     * The display symbol for an arbitrary currency CODE (UC-UI-23, PR 14881 review) - the API's own
     * `symbol` for whichever catalog entry matches `code`, falling back through
     * `resolveCurrencySymbol`'s own chain (Intl-derived, then the bare code) when the catalog
     * hasn't loaded yet or doesn't carry that entry. A falsy `code` (a sale line whose own
     * `currency` is null) resolves to an empty string rather than guessing, so a caller renders the
     * bare number instead of a wrong prefix - `MatchesTab`/`BuyerLinesGrid` need this for a row
     * denominated in its OWN currency, which is not necessarily `selectedCurrency`.
     */
    function symbolForCode(code: string | null | undefined): string {
      if (!code) {
        return ''
      }
      const currency = currencies.value.find((entry) => entry.code === code)
      return resolveCurrencySymbol(code, currency?.symbol)
    }

    /**
     * The selected currency's display symbol (UC-UI-23) - every money figure that is already in
     * the tenant's globally selected display currency (the vast majority of them) reads this
     * rather than calling `symbolForCode(selectedCurrency.value)` itself.
     */
    const selectedCurrencySymbol = computed(() => symbolForCode(selectedCurrency.value))

    /**
     * Sign-out (UC-ENT-09). Unlike `context.ts`'s own `buyersView` (a pure display toggle this
     * store's own exception deliberately leaves untouched), `selectedCurrency` is persisted
     * alongside a `currency` rate that is only ever valid for the sale file version it was
     * computed against - so a different tenant signing in on the same browser must not inherit
     * either: showing e.g. EUR preselected with a stale (or reset-to-1) rate would be silently
     * wrong, not just a cosmetic surprise.
     */
    function clear(): void {
      currencies.value = []
      selectedCurrency.value = DEFAULT_CURRENCY_CODE
      currency.value = 1
    }

    return {
      currencies,
      selectedCurrency,
      currency,
      selectedCurrencySymbol,
      symbolForCode,
      setCurrencies,
      setSelectedCurrency,
      setCurrency,
      clear,
    }
  },
  {
    /**
     * Only `selectedCurrency` is persisted, so it survives a reload (the whole point of this
     * store per the request that added it) and comes back preselected in the dropdown.
     * `currencies` is not: it's re-fetched each session, the same as `useCustomAttributesStore`
     * never persists `definitions` - a stale cached catalog is exactly the kind of second source
     * of truth `context.ts`'s own persist doc explains the harm of.
     */
    persist: {
      storage: secureStorage,
      key: 'ada-ar-currencies',
      pick: ['selectedCurrency'],
    },
  },
)
