import { describe, expect, it } from 'vitest'
import { resolveCurrencySymbol } from '@/utils/currencySymbol'

describe('resolveCurrencySymbol', () => {
  it('prefers the API-supplied symbol when present', () => {
    expect(resolveCurrencySymbol('USD', '$')).toBe('$')
    expect(resolveCurrencySymbol('EUR', '€')).toBe('€')
  })

  it('falls back to the Intl-derived symbol when the API symbol is absent (A1: backend not yet merged)', () => {
    expect(resolveCurrencySymbol('USD', undefined)).toBe('$')
    expect(resolveCurrencySymbol('EUR', undefined)).toBe('€')
    expect(resolveCurrencySymbol('GBP', null)).toBe('£')
    expect(resolveCurrencySymbol('JPY', null)).toBe('¥')
  })

  it('falls back to the Intl-derived symbol when the API symbol is an empty string, never an empty prefix', () => {
    expect(resolveCurrencySymbol('USD', '')).toBe('$')
  })

  it('falls back to the bare code when Intl cannot resolve a symbol for it (an unrecognized ISO 4217 code)', () => {
    expect(resolveCurrencySymbol('ZZZ', null)).toBe('ZZZ')
  })

  it('never throws for a malformed code, even with no API symbol to fall back on first', () => {
    expect(() => resolveCurrencySymbol('', null)).not.toThrow()
    expect(() => resolveCurrencySymbol('NOTACODE', undefined)).not.toThrow()
  })
})
