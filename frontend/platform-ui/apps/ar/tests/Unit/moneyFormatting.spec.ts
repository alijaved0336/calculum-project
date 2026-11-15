import { describe, expect, it } from 'vitest'
import { formatCompactMetricValue, formatMoney, formatMoneyCompact, formatMoneyTooltip, prependMoneySymbol } from '@/utils/moneyFormatting'

describe('formatMoney', () => {
  it('prepends the symbol immediately to the left of the number, unchanged otherwise', () => {
    expect(formatMoney(18_500, '$')).toBe('$18,500')
    expect(formatMoney(1_234.5, '€')).toBe('€1,234.5')
  })

  it('places the symbol after the minus sign for a negative value, never "$-4,200"', () => {
    expect(formatMoney(-4_200, '$')).toBe('-$4,200')
  })

  it('renders null/undefined as the bare "no value" marker, never a symbol glued onto one (AC#7)', () => {
    expect(formatMoney(null, '$')).toBe('—')
    expect(formatMoney(undefined, '$')).toBe('—')
  })

  it('renders zero with the symbol - a real, distinct-from-null figure', () => {
    expect(formatMoney(0, '$')).toBe('$0')
  })

  it('uses whichever symbol the caller resolved, not a hardcoded one', () => {
    expect(formatMoney(100, '£')).toBe('£100')
    expect(formatMoney(100, 'JPY')).toBe('JPY100')
  })
})

describe('formatMoneyCompact', () => {
  it('prepends the symbol to the compact/abbreviated form, one decimal by default', () => {
    expect(formatMoneyCompact(16_340_000, '$')).toBe('$16.3m')
  })

  it('honors an explicit fraction-digit count', () => {
    expect(formatMoneyCompact(16_345_000, '$', 2)).toBe('$16.35m')
    expect(formatMoneyCompact(16_345_000, '$', 0)).toBe('$16m')
  })

  it('places the symbol after the minus sign for a negative compact value', () => {
    expect(formatMoneyCompact(-16_340_000, '$')).toBe('-$16.3m')
  })

  it('renders null/undefined as the bare "no value" marker', () => {
    expect(formatMoneyCompact(null, '$')).toBe('—')
    expect(formatMoneyCompact(undefined, '$')).toBe('—')
  })
})

describe('formatMoneyTooltip', () => {
  it('shows the full figure with thousands separators and exactly one decimal', () => {
    expect(formatMoneyTooltip(16_345_678.94, '$')).toBe('$16,345,678.9')
    expect(formatMoneyTooltip(18_500, '$')).toBe('$18,500.0')
  })

  it('keeps the sign ahead of the symbol for a negative value', () => {
    expect(formatMoneyTooltip(-4_200.25, '$')).toBe('-$4,200.3')
  })

  it('renders null/undefined as the bare "no value" marker', () => {
    expect(formatMoneyTooltip(null, '$')).toBe('—')
    expect(formatMoneyTooltip(undefined, '$')).toBe('—')
  })
})

/**
 * The primitive `formatMoney`/`formatMoneyCompact` are themselves built on (UC-UI-23) - exported
 * separately for call sites that build their own number formatting on top of a different
 * underlying formatter (chartFormatting.ts's `formatBigNumbers`, used by the Opportunity Nine Box
 * and chart surfaces) rather than `formatNumber`/`formatCompact`, so they still get correct sign
 * placement without duplicating this rule a third time.
 */
describe('prependMoneySymbol', () => {
  it('prepends the symbol for a positive already-formatted number', () => {
    expect(prependMoneySymbol('548.3k', '$')).toBe('$548.3k')
  })

  it('inserts the symbol after the leading minus sign for a negative already-formatted number', () => {
    expect(prependMoneySymbol('-548.3k', '$')).toBe('-$548.3k')
  })

  it('prepends the symbol for zero, unchanged', () => {
    expect(prependMoneySymbol('0', '$')).toBe('$0')
  })
})

/**
 * `MatchView`'s own exclusion chart labels (PR 14881 review) - compact for every metric, exactly
 * as they rendered before UC-UI-23, and money-symbol-prefixed ONLY for the volume metric. Kept
 * separate from `formatMetricValue`'s own full/compact split (`formatNumber` for a non-volume
 * metric elsewhere on the same screen) - that is a different, pre-existing rule this one must not
 * disturb.
 */
describe('formatCompactMetricValue', () => {
  it('prefixes the symbol on the compact form for the volume metric', () => {
    expect(formatCompactMetricValue(16_340_000, true, '$')).toBe('$16.3m')
  })

  it('stays plain compact, no symbol, for a non-volume metric (a count)', () => {
    expect(formatCompactMetricValue(1_234_567, false, '$')).toBe('1.23m')
  })

  it('renders null/undefined as the bare "no value" marker regardless of metric', () => {
    expect(formatCompactMetricValue(null, true, '$')).toBe('—')
    expect(formatCompactMetricValue(undefined, false, '$')).toBe('—')
  })
})
