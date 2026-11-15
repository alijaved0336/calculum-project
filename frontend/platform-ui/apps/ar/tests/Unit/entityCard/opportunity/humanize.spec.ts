import { describe, expect, it } from 'vitest'
import { humanizePascalCase } from '@/modules/entityCard/components/opportunity/humanize'

describe('humanizePascalCase', () => {
  it('splits a PascalCase identifier into space-separated words', () => {
    expect(humanizePascalCase('BuyerLeverage')).toBe('Buyer Leverage')
  })

  it('handles a single word unchanged', () => {
    expect(humanizePascalCase('Strategy')).toBe('Strategy')
  })

  it('handles three or more words', () => {
    expect(humanizePascalCase('TermReductionScore')).toBe('Term Reduction Score')
  })
})
