/**
 * Tests for utils/formatters.ts — pure functions.
 *
 * formatters.ts imports StringUtils (for formatSupplierCount) and getNumberWithDecimals
 * (for formatDays), both of which transitively pull in the `@/utils` barrel and
 * `@/utils/FormatData` — the same class of problem documented in
 * CalculumGridGraphqlDistinctValues.spec.ts and StringUtils.formatBigNumbers.spec.ts:
 * the barrel re-exports @/modules/paymentTermsAndTermsStrategies/utils, which pulls in
 * .vue components, and FormatData.ts calls useUserStore()/useAppStore() at call time
 * (no active Pinia in a bare unit test). Mock both, matching the established pattern.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// changeToCurrency is a controllable spy (not plain identity) so Story 2's currency
// conversion tests can simulate a real, non-1 exchange rate. vi.hoisted is required
// because vi.mock factories run before the rest of this file's top-level code.
const { changeToCurrencyMock } = vi.hoisted(() => ({
  changeToCurrencyMock: vi.fn((value: number) => value),
}))

vi.mock('@/utils', () => ({
  isNullOrUndefined: (value: unknown) => value === null || value === undefined,
}))

vi.mock('@/utils/FormatData', () => ({
  changeToCurrency: changeToCurrencyMock,
  // Faithful stand-in for the real implementation's "en-US" fallback branch
  // (real getNumberWithDecimals reads a user-preference locale from Pinia).
  getNumberWithDecimals: (num: number | string | null | undefined, maximumFractionDigits = 2) => {
    const n = num === null || num === undefined ? 0 : parseFloat(String(num))
    return new Intl.NumberFormat('en-US', { maximumFractionDigits, minimumFractionDigits: maximumFractionDigits }).format(n)
  },
}))

import {
  formatUSD,
  formatCashFlow,
  formatSupplierCount,
  formatExactCount,
  formatDays,
  computeSafeMax,
  formatVersionMonthYear,
  formatVersionLabel,
} from '@/modules/home/workingCapital/utils/formatters'
import type { WCVersion } from '@/modules/home/workingCapital/types'

beforeEach(() => {
  // Default to a 1:1 rate (identity) unless a test opts into a different one.
  changeToCurrencyMock.mockImplementation((value: number) => value)
})

describe('formatUSD (Story 2 AC-01/AC-02/AC-03 — currency conversion)', () => {
  it('reproduces Story 1\'s un-converted output at a 1:1 rate (regression guard)', () => {
    expect(formatUSD(159_091_748)).toBe('159,091,748')
  })

  it('multiplies by the currently selected currency rate', () => {
    changeToCurrencyMock.mockImplementation((value: number) => value * 1.1)
    expect(formatUSD(100)).toBe('110')
  })

  it('rounds to 0 decimals regardless of the converted amount\'s precision', () => {
    changeToCurrencyMock.mockImplementation((value: number) => value * 1.234)
    expect(formatUSD(100)).toBe('123')
  })
})

describe('formatCashFlow (Story 2 AC-01/AC-02/AC-03 — currency conversion)', () => {
  it('reproduces Story 1\'s un-converted, abbreviated output at a 1:1 rate (regression guard)', () => {
    expect(formatCashFlow(194_559_413)).toBe('194.6m')
  })

  it('multiplies by the currently selected currency rate before abbreviating', () => {
    changeToCurrencyMock.mockImplementation((value: number) => value * 2)
    expect(formatCashFlow(1_000)).toBe('2.0k')
  })

  it('falls back to "0" for a zero amount regardless of rate', () => {
    changeToCurrencyMock.mockImplementation((value: number) => value * 2)
    expect(formatCashFlow(0)).toBe('0')
  })
})

describe('formatSupplierCount (AC-01)', () => {
  it('renders sub-1000 counts with no decimal point', () => {
    expect(formatSupplierCount(47)).toBe('47')
  })

  it('renders 0 as "0"', () => {
    expect(formatSupplierCount(0)).toBe('0')
  })

  it('abbreviates large counts keeping one decimal, to avoid a >20% rounding error', () => {
    expect(formatSupplierCount(1236)).toBe('1.2k')
  })

  it('adds thousands separators for counts just under the abbreviation threshold', () => {
    expect(formatSupplierCount(999)).toBe('999')
  })
})

describe('formatExactCount (AC-02)', () => {
  it('returns the exact, comma-grouped value for an abbreviated count', () => {
    expect(formatExactCount(1236)).toBe('1,236')
  })

  it('returns a plain sub-1000 value unchanged', () => {
    expect(formatExactCount(47)).toBe('47')
  })
})

describe('formatDays (AC-05/AC-06 — whole-number days)', () => {
  // `t` is kept in the signature for callers that still build a days-unit label
  // themselves (e.g. around the whole "X → Y weighted terms" phrase), but
  // formatDays itself no longer appends it — callers that need the "Days" word
  // now compose it on their own instead of getting it baked into every value.
  const t = (key: string) => (key === 'global.days' ? 'Days' : key)

  it('rounds to a whole number by default (no decimals)', () => {
    expect(formatDays(85.1, t)).toBe('85')
    expect(formatDays(85.6, t)).toBe('86')
  })

  it('respects a custom decimals count', () => {
    expect(formatDays(85.12345, t, 2)).toBe('85.12')
  })

  it('formats negative values (e.g. a decrease)', () => {
    expect(formatDays(-3.4, t)).toBe('-3')
  })

  it('formats zero', () => {
    expect(formatDays(0, t)).toBe('0')
  })
})

describe('computeSafeMax (AC-03/AC-04)', () => {
  it('scales the max value up by the headroom factor', () => {
    expect(computeSafeMax([10, 20, 0])).toBeCloseTo(22, 5)
  })

  it('falls back to 1 when every value is zero, to guard a future division', () => {
    expect(computeSafeMax([0, 0, 0])).toBe(1)
  })

  it('supports a custom headroom factor', () => {
    expect(computeSafeMax([100], 1.0)).toBe(100)
  })
})

describe('formatVersionMonthYear (AC-07)', () => {
  it('returns an empty string for a falsy date', () => {
    expect(formatVersionMonthYear(null, 'en')).toBe('')
    expect(formatVersionMonthYear(undefined, 'en')).toBe('')
    expect(formatVersionMonthYear('', 'en')).toBe('')
  })

  it('returns an empty string for an invalid date', () => {
    expect(formatVersionMonthYear('not-a-date', 'en')).toBe('')
  })

  it('formats a bare YYYY-MM-DD date as month + year', () => {
    expect(formatVersionMonthYear('2024-12-31', 'en')).toBe('Dec 2024')
  })

  it('is not shifted a day by timezone parsing (matches formatISODateToUS technique)', () => {
    // A bare date's day-of-month must not roll back to the previous month near a boundary.
    expect(formatVersionMonthYear('2024-01-01', 'en')).toBe('Jan 2024')
  })

  it('respects the active locale for month names (NFR)', () => {
    expect(formatVersionMonthYear('2024-12-31', 'es')).toBe('dic 2024')
  })

  it('handles a full ISO datetime string the same as the bare-date form', () => {
    expect(formatVersionMonthYear('2024-12-31T00:00:00.000Z', 'en')).toBe('Dec 2024')
  })
})

describe('formatVersionLabel (AC-07/EF-1)', () => {
  const version = (overrides: Partial<WCVersion> = {}): WCVersion => ({
    uuid: 'uuid-1',
    version: 4,
    name: 'Acme Corp',
    initialDate: '2024-01-01',
    finalDate: '2024-12-31',
    year: '2024',
    ...overrides,
  })

  it('includes month + year when finalDate is present', () => {
    expect(formatVersionLabel(version(), 'en')).toBe('Acme Corp — Ver.4 (Dec 2024)')
  })

  it('falls back to the identity alone, with no dangling parens, when finalDate is missing (EF-1)', () => {
    expect(formatVersionLabel(version({ finalDate: '' }), 'en')).toBe('Acme Corp — Ver.4')
  })
})
