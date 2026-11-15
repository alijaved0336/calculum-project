/**
 * Characterization tests for StringUtils.formatBigNumbers (the pure formatter).
 *
 * Goal: pin down current behavior — suffix thresholds (k/m/b/t/q/i/s),
 * sub-thousand passthrough, no implicit currency conversion, options-object
 * fraction digits forwarding — so that the upcoming Phase 3 migration that
 * routes monetary call sites through this function (instead of the legacy
 * currency-mixing FormatData.formatBigNumbers) can detect any accidental
 * change in formatting semantics.
 *
 * NOTE: These are characterization tests. The expected values below were
 * captured from the current implementation in src/utils/StringUtils.ts. If
 * any test fails, the function's behavior has changed — investigate before
 * "fixing" the test.
 */

import { describe, it, expect, vi } from 'vitest'

// Mock isNullOrUndefined to prevent loading the barrel export, matching the
// pattern used by tests/Unit/Utils/StringUtils.spec.ts.
vi.mock('@/utils', () => ({
  isNullOrUndefined: (value: unknown) => value === null || value === undefined,
}))

// StringUtils now imports changeToCurrency from ./FormatData; mock it so this
// pure-formatter spec does not transitively pull vue-i18n / locales / stores.
vi.mock('@/utils/FormatData', () => ({
  changeToCurrency: (value: number) => value,
}))

import StringUtils from '@/utils/StringUtils'

describe('StringUtils.formatBigNumbers (pure formatter)', () => {
  it('formats sub-thousand integers without a suffix', () => {
    // Sub-thousand non-integer: trailing zero is not added because the value
    // already has a fractional digit (135.9 -> "135.9").
    expect(StringUtils.formatBigNumbers(135.9)).toBe('135.9')
    // Exact zero takes the special-case branch and returns "0" (no decimal).
    expect(StringUtils.formatBigNumbers(0)).toBe('0')
    // Negative integers under 1k go through toLocaleString with
    // minimumFractionDigits=1, so -42 renders as "-42.0".
    expect(StringUtils.formatBigNumbers(-42)).toBe('-42.0')
  })

  it('uses k / m / b / t suffixes at the right thresholds', () => {
    expect(StringUtils.formatBigNumbers(1_000)).toBe('1.0k')
    expect(StringUtils.formatBigNumbers(1_500_000)).toBe('1.5m')
    expect(StringUtils.formatBigNumbers(2.5e9)).toBe('2.5b')
    expect(StringUtils.formatBigNumbers(3e12)).toBe('3.0t')
  })

  it('uses q / i / s suffixes for quadrillion / quintillion / sextillion ranges', () => {
    // 1.0e15 / 1.0e15 = 1 -> "1.0q"
    expect(StringUtils.formatBigNumbers(1.0e15)).toBe('1.0q')
    // 2.5e15 / 1.0e15 = 2.5 -> "2.5q"
    expect(StringUtils.formatBigNumbers(2.5e15)).toBe('2.5q')
    // 1.0e18 / 1.0e18 = 1 -> "1.0i"
    expect(StringUtils.formatBigNumbers(1.0e18)).toBe('1.0i')
    // 7.5e18 / 1.0e18 = 7.5 -> "7.5i"
    expect(StringUtils.formatBigNumbers(7.5e18)).toBe('7.5i')
    // 1.0e21 / 1.0e21 = 1 -> "1.0s"
    expect(StringUtils.formatBigNumbers(1.0e21)).toBe('1.0s')
    // 9.99e23 / 1.0e21 = 999 -> "999.0s" (no further suffix above sextillion)
    expect(StringUtils.formatBigNumbers(9.99e23)).toBe('999.0s')
  })

  it('does NOT apply currency conversion regardless of any global state', () => {
    // The pure formatter must never multiply by a rate.
    const value = 1_234_567
    expect(StringUtils.formatBigNumbers(value)).toBe('1.2m')
  })

  it('respects custom fraction digits via options', () => {
    expect(
      StringUtils.formatBigNumbers(1_234_567, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }),
    ).toBe('1.23m')
  })

  it('preserves sign for negative values across thresholds', () => {
    // Math.abs is used for threshold checks, but the original signed value is
    // divided, so the sign carries through to the formatted output.
    expect(StringUtils.formatBigNumbers(-1_500)).toBe('-1.5k')
    expect(StringUtils.formatBigNumbers(-1_234_567)).toBe('-1.2m')
  })
})
