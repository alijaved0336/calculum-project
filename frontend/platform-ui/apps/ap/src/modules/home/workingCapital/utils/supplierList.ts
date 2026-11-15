import { changeToCurrency } from '@/utils/FormatData'
import type { SupplierListItem, SupplierListStatus } from '../types'

// WI#20545 — one Achievement List row as the grid and the Excel file show it: amounts
// converted to the display currency and the status as a translated label (the grid
// filters on what it shows, so filtering by "Matched" must find "Matched").
export interface SupplierListRow extends Omit<SupplierListItem, 'status'> {
  status: SupplierListStatus
  statusLabel: string
}

const STATUS_KEYS: Record<SupplierListStatus, string> = {
  matchedIncreased: 'home.workingCapital.list.status.matchedIncreased',
  matched: 'home.workingCapital.list.status.matched',
  notMatched: 'home.workingCapital.list.status.notMatched',
}

export function supplierListStatusLabel(status: SupplierListStatus, t: (key: string) => string): string {
  return t(STATUS_KEYS[status])
}

// EF-3 — when the rate could not be fetched the amounts stay in the company currency,
// on screen and in the Excel file, so the rate is 1 and the label is the company's.
export interface SupplierListCurrency {
  code: string
  convert: (amount: number) => number
}

export function resolveSupplierListCurrency(
  selectedCurrency: string,
  companyCurrency: string,
  conversionUnavailable: boolean,
): SupplierListCurrency {
  return conversionUnavailable
    ? { code: companyCurrency, convert: (amount) => amount }
    : { code: selectedCurrency, convert: changeToCurrency }
}

const convertOrNull = (value: number | null, convert: (amount: number) => number): number | null =>
  value == null ? null : convert(value)

/**
 * The same conversion feeds the grid and the Excel file, so the screen and the
 * download always agree (AC-12, AC-13). Payment terms are days and never converted.
 */
export function toSupplierListRows(
  items: SupplierListItem[],
  t: (key: string) => string,
  currency: SupplierListCurrency,
): SupplierListRow[] {
  return items.map((item) => ({
    ...item,
    statusLabel: supplierListStatusLabel(item.status, t),
    currentVolume: currency.convert(item.currentVolume),
    currentCfOpportunity: convertOrNull(item.currentCfOpportunity, currency.convert),
    comparisonVolume: convertOrNull(item.comparisonVolume, currency.convert),
    comparisonCfOpportunity: convertOrNull(item.comparisonCfOpportunity, currency.convert),
  }))
}
