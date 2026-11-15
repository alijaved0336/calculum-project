import { describe, expect, it } from 'vitest'
import { formatBigNumbers, getNumberWithDecimals } from '@/utils/chartFormatting'

describe('getNumberWithDecimals', () => {
  it('formats a number to the requested decimal count', () => {
    expect(getNumberWithDecimals(1234.5678, 2)).toBe('1,234.57')
  })

  it('formats a numeric string the same as the equivalent number', () => {
    expect(getNumberWithDecimals('1234.5678', 2)).toBe(getNumberWithDecimals(1234.5678, 2))
  })

  it('treats null/undefined as zero, same as every other formatter in apps/ar', () => {
    expect(getNumberWithDecimals(null)).toBe('0.00')
    expect(getNumberWithDecimals(undefined)).toBe('0.00')
  })

  it('defaults to two decimal places', () => {
    expect(getNumberWithDecimals(1)).toBe('1.00')
  })
})

describe('formatBigNumbers', () => {
  it('leaves small numbers unsuffixed', () => {
    expect(formatBigNumbers(42)).toBe('42.0')
  })

  it('suffixes thousands, millions and billions', () => {
    expect(formatBigNumbers(1500)).toBe('1.5k')
    expect(formatBigNumbers(2_500_000)).toBe('2.5m')
    expect(formatBigNumbers(3_500_000_000)).toBe('3.5b')
  })

  it('renders exactly zero as "0", not "0.0"', () => {
    expect(formatBigNumbers(0)).toBe('0')
  })

  it('suffixes a negative value the same way as its positive counterpart', () => {
    expect(formatBigNumbers(-1500)).toBe('-1.5k')
  })

  it('honors an explicit fraction-digit override', () => {
    expect(formatBigNumbers(1234, { maximumFractionDigits: 0, minimumFractionDigits: 0 })).toBe('1k')
  })
})
