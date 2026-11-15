import { describe, expect, it } from 'vitest'
import { initialsOf } from '@/modules/buyers/utils/initials'

describe('initialsOf', () => {
  it('takes the first letter of up to two words, upper-cased', () => {
    expect(initialsOf('Acme Corporation')).toBe('AC')
  })

  it('takes only what exists for a single-word name', () => {
    expect(initialsOf('Contoso')).toBe('C')
  })

  it('is empty for no name, so the neutral placeholder can render an empty circle rather than throw', () => {
    expect(initialsOf(null)).toBe('')
    expect(initialsOf(undefined)).toBe('')
    expect(initialsOf('')).toBe('')
  })

  it('collapses repeated internal whitespace before splitting into words', () => {
    expect(initialsOf('Global   Retail   Group')).toBe('GR')
  })

  it('ignores leading/trailing whitespace', () => {
    expect(initialsOf('  Fabrikam Inc  ')).toBe('FI')
  })

  it('respects a custom maxWords', () => {
    expect(initialsOf('Global Retail Group', 3)).toBe('GRG')
  })
})
