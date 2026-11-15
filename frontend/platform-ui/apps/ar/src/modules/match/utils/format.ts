const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
/** One compact formatter per fraction-digit count, built on first use - `Intl.NumberFormat` is
 * costly to construct and these run once per rendered figure. */
const compactFormatters = new Map<number, Intl.NumberFormat>()
const getCompactFormatter = (fractionDigits: number): Intl.NumberFormat => {
  let formatter = compactFormatters.get(fractionDigits)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: fractionDigits })
    compactFormatters.set(fractionDigits, formatter)
  }
  return formatter
}

export const formatNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : numberFormatter.format(value)

/** Large amounts in tile-friendly form (16.34m) - lowercased: Intl's own en-US compact notation
 * capitalizes the suffix (16.34M), which AB#20356/AB#20367 both call out across every screen this
 * feeds (Buyer cards, Match, Entity Card). `fractionDigits` caps the decimals shown (default 2). */
export const formatCompact = (value: number | null | undefined, fractionDigits = 2): string =>
  value === null || value === undefined
    ? '—'
    : getCompactFormatter(fractionDigits).format(value).replaceAll(/[A-Z]/g, (letter) => letter.toLowerCase())

export const formatDateTime = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleString() : '—'

export const formatDate = (value: string | null | undefined): string =>
  value ? value.slice(0, 10) : '—'
