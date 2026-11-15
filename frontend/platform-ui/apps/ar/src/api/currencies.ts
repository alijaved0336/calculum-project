/**
 * The currency catalog for the receivables navbar's currency picker.
 */
import { get } from './http'

export interface Currency {
  code: string
  name: string
  /**
   * The currency's display symbol (UC-UI-23), optional and possibly absent even once the backend
   * half of this story ships (a null/unmapped code) - `resolveCurrencySymbol`
   * (utils/currencySymbol.ts) is what every caller uses to fall back rather than checking this
   * field directly.
   */
  symbol?: string | null
}

export const fetchCurrencies = (): Promise<Currency[]> => get('/api/currencies')

export interface CurrencyConversionRate {
  rate: number
}

/**
 * The FX rate to convert `USD` into `to`, as of `asOf`
 * (`GET /api/currency-rate?from=USD&to=...&asOf=...`). Unlike `fetchCurrencies` above, this calls
 * the real route already rather than standing in with mock data - `/api/currency-rate` does not
 * exist on the backend yet either, so it 404s until that endpoint ships.
 */
export const fetchCurrencyConversionRate = (to: string, asOf: string): Promise<CurrencyConversionRate> =>
  get('/api/currency-rate', { from: 'USD', to, asOf })
