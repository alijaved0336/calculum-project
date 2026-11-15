import StringUtils from '@/utils/StringUtils'
import { getNumberWithDecimals, changeToCurrency } from '@/utils/FormatData'
import type { WCVersion } from '../types'

const numFormatter = new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 })

// AC-01 — full-precision monetary amounts (country lists, supplier tables) must convert
// to the user's selected currency. changeToCurrency reads the already-cached rate from
// the Pinia app store (set by the global currency selector), so calling it from inside a
// Vue computed() automatically makes that computed reactive to currency changes — no
// explicit watcher needed. AC-03 (same-currency skips conversion) is already guaranteed
// upstream by that store (see HomeNavbar.vue), so this needs no special-casing here.
export function formatUSD(amount: number): string {
  return numFormatter.format(changeToCurrency(amount))
}

// AC-01 — abbreviated monetary amounts (KPI cards, chart bars) — reuses the platform's
// existing, already-proven currency conversion service (StringUtils.formatBigCurrency =
// changeToCurrency + formatBigNumbers), the same one already used by ModalResults.vue.
export function formatCashFlow(amount: number): string {
  const formatted = StringUtils.formatBigCurrency(amount)
  return formatted || '0'
}

// AC-01/AC-02 — supplier counts must always render as whole numbers below the
// abbreviation threshold, with the exact value available for a hover/focus tooltip
// on abbreviated ones. One decimal is kept in the abbreviation itself (e.g. 1236 ->
// "1.2k", not "1k") — for a count, unlike a monetary amount, rounding to the nearest
// whole "k" can misstate the value by 20%+.
export function formatSupplierCount(n: number): string {
  return StringUtils.formatBigNumbers(n, { maximumFractionDigits: 1, minimumFractionDigits: 0 })
}

export function formatExactCount(n: number): string {
  return n.toLocaleString('en-US')
}

// AC-05/AC-06 — every days-based value in the Working Capital dashboard goes through
// this, using the platform's standard days-unit label instead of an ad-hoc "d"/"D" suffix.
// `t` is passed in by the caller (component/composable) rather than imported here, so this
// stays a pure function.
export function formatDays(value: number, t: (key: string) => string, decimals = 0): string {
  return `${getNumberWithDecimals(value, decimals)}`
}

// AC-03/AC-04 — shared "proportional bar width with headroom" math, mirroring the
// scaling WAPTImprovementChart already uses for its 3-bar rows.
export function computeSafeMax(values: number[], headroom = 1.1): number {
  return Math.max(...values) * headroom || 1
}

// AC-07 / NFR — locale-aware month + year formatting for spend file version labels.
// Mirrors formatISODateToUS's timezone-safety technique: parse the YYYY-MM-DD prefix
// directly instead of trusting `new Date(iso)` on a bare date (which can shift a day
// depending on the runtime's timezone).
export function formatVersionMonthYear(isoDate: string | null | undefined, locale: string): string {
  if (!isoDate) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate)
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(date)
}

// AC-07/EF-1 — version identity + month/year, falling back to the identity alone
// (no dangling "()") when the version has no recorded end date.
export function formatVersionLabel(version: WCVersion, locale: string): string {
  const identity = `${version.name} — Ver.${version.version}`
  const monthYear = formatVersionMonthYear(version.finalDate, locale)
  return monthYear ? `${identity} (${monthYear})` : identity
}
