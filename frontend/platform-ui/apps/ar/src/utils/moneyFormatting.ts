/**
 * The single shared money formatter for apps/ar (UC-UI-23): every money-rendering surface prepends
 * the selected display currency's symbol through one of the two functions below rather than
 * inventing its own concatenation, so a change to how a symbol is placed (or suppressed) needs one
 * edit, not one per call site.
 *
 * Deliberately a plain formatter, not a composable or a store reader: the symbol is a parameter,
 * the same shape `formatDays` (modules/entityCard/components/opportunity/format.ts) already takes
 * its own context (`translate`) as, rather than reaching for Pinia itself. A caller resolves its
 * own symbol - in practice almost always `useArCurrenciesStore().selectedCurrencySymbol` - and
 * this file stays trivially unit-testable and reusable from both `<script setup>` and
 * `defineComponent` components alike.
 *
 * Wraps `formatNumber`/`formatCompact` (modules/match/utils/format.ts) rather than reimplementing
 * their numeric formatting: the number itself - separators, decimals, compact abbreviation - stays
 * byte-for-byte what those two already produce (AC#3); this file only ever adds a prefix.
 */
import { formatCompact, formatNumber } from '@/modules/match/utils/format'

/** Matches `formatNumber`/`formatCompact`'s own "no value" marker - a money figure with nothing to
 * show keeps rendering as a bare dash, never a symbol glued onto one (AC#7). */
const NO_VALUE_MARKER = '—'

/**
 * Inserts `symbol` immediately after a leading minus sign, if any - "-$4,200", never the
 * unconventional "$-4,200" a bare `${symbol}${formatted}` concatenation would produce.
 * `formatNumber`/`formatCompact` (and `chartFormatting.ts`'s `formatBigNumbers`, which the
 * Opportunity Nine Box/chart surfaces build their own money labels on top of) all put a negative
 * value's sign at the very front of the string, so this is the one place that rule is honored -
 * every money-prefixing call site in apps/ar routes through this rather than reimplementing it.
 */
export function prependMoneySymbol(formatted: string, symbol: string): string {
  return formatted.startsWith('-') ? `-${symbol}${formatted.slice(1)}` : `${symbol}${formatted}`
}

function withSymbol(formatted: string, symbol: string): string {
  return formatted === NO_VALUE_MARKER ? formatted : prependMoneySymbol(formatted, symbol)
}

/** The money counterpart of `formatNumber` - full precision, comma-grouped, symbol-prefixed. */
export const formatMoney = (value: number | null | undefined, symbol: string): string =>
  withSymbol(formatNumber(value), symbol)

const tooltipNumberFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** The full, unabbreviated money figure a tooltip shows behind a compact value - comma-grouped,
 * always exactly one decimal, sign kept ahead of the symbol ("-$16,345,678.9"). */
export const formatMoneyTooltip = (value: number | null | undefined, symbol: string): string =>
  value === null || value === undefined ? NO_VALUE_MARKER : prependMoneySymbol(tooltipNumberFormatter.format(value), symbol)

/** The money counterpart of `formatCompact` - abbreviated (16.3m), symbol-prefixed. `fractionDigits`
 * caps the decimals shown after the abbreviation (default 1). */
export const formatMoneyCompact = (
  value: number | null | undefined,
  symbol: string,
  fractionDigits = 1,
): string => withSymbol(formatCompact(value, fractionDigits), symbol)

/**
 * A chart's own compact metric label (UC-UI-23, PR 14881 review) - compact for every metric, and
 * money-symbol-prefixed only when `isVolumeMetric`. `MatchView`'s exclusion-reasons chart rendered
 * every metric (volume or count) through a bare `formatCompact` before this story; routing all of
 * them through `formatMetricValue` instead (full `formatNumber` for a non-volume metric) changed
 * that for the two count metrics too, which was never the intent - only the volume metric was
 * meant to gain a symbol. This keeps every metric compact, the same as before, and adds the symbol
 * to the one that is actually money.
 */
export const formatCompactMetricValue = (
  value: number | null | undefined,
  isVolumeMetric: boolean,
  symbol: string,
): string => (isVolumeMetric ? formatMoneyCompact(value, symbol) : formatCompact(value))
