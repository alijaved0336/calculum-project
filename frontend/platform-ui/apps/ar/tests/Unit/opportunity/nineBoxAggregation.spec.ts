import { describe, expect, it } from 'vitest'
import { aggregateNineBox } from '@/modules/opportunity/utils/nineBoxAggregation'
import type { OpportunityPortfolioRow } from '@/api'

function row(overrides: Partial<OpportunityPortfolioRow>): OpportunityPortfolioRow {
  return {
    id: 1,
    buyerId: 1,
    buyerName: 'Acme',
    role: 'Counterparty',
    winningStrategy: null,
    recommendedTerm: null,
    currentTerm: null,
    value: 0,
    economicProfitImpact: null,
    probabilityTier: 'High',
    cashFlowImpactTier: 'High',
    nineBoxCell: 'High/High',
    noOpportunityReason: null,
    ...overrides,
  }
}

describe('aggregateNineBox', () => {
  it('always returns exactly 9 cells, even with no rows', () => {
    const { cells } = aggregateNineBox([])

    expect(cells).toHaveLength(9)
    expect(cells.every((cell) => cell.buyerCount === 0 && cell.totalValue === 0)).toBe(true)
  })

  it('orders cells probability High→Low (rows), impact Low→High (columns) - High/High last (top-right)', () => {
    const { cells } = aggregateNineBox([])

    expect(cells.map((c) => `${c.probabilityTier}/${c.cashFlowImpactTier}`)).toEqual([
      'High/Low', 'High/Medium', 'High/High',
      'Medium/Low', 'Medium/Medium', 'Medium/High',
      'Low/Low', 'Low/Medium', 'Low/High',
    ])
  })

  it('buckets a buyer into its tier pair and sums value', () => {
    const rows = [
      row({ id: 1, probabilityTier: 'High', cashFlowImpactTier: 'High', value: 100 }),
      row({ id: 2, probabilityTier: 'High', cashFlowImpactTier: 'High', value: 50 }),
    ]

    const { cells } = aggregateNineBox(rows)
    const cell = cells.find((c) => c.probabilityTier === 'High' && c.cashFlowImpactTier === 'High')!

    expect(cell.buyerCount).toBe(2)
    expect(cell.totalValue).toBe(150)
    expect(cell.buyers).toEqual(rows)
  })

  it('treats a null value as 0 rather than dropping the buyer from the count', () => {
    const rows = [row({ id: 1, value: null })]

    const { cells } = aggregateNineBox(rows)
    const cell = cells.find((c) => c.probabilityTier === 'High' && c.cashFlowImpactTier === 'High')!

    expect(cell.buyerCount).toBe(1)
    expect(cell.totalValue).toBe(0)
  })

  it('surfaces a buyer with either tier absent as unranked, not in any cell (UC-OPP-17 A1)', () => {
    const noProbability = row({ id: 1, probabilityTier: null, value: 10 })
    const noImpact = row({ id: 2, cashFlowImpactTier: null, value: 20 })
    const bothMissing = row({ id: 3, probabilityTier: null, cashFlowImpactTier: null, value: 5 })

    const { cells, unranked } = aggregateNineBox([noProbability, noImpact, bothMissing])

    expect(cells.every((cell) => cell.buyerCount === 0)).toBe(true)
    expect(unranked.buyerCount).toBe(3)
    expect(unranked.totalValue).toBe(35)
    expect(unranked.buyers).toEqual([noProbability, noImpact, bothMissing])
  })

  it('routes a row with a tier value outside Low/Medium/High into unranked instead of dropping it (UC-OPP-17 A1)', () => {
    const unknownTier = row({
      id: 1,
      probabilityTier: 'VeryHigh' as never,
      cashFlowImpactTier: 'High',
      value: 42,
    })

    const { cells, unranked } = aggregateNineBox([unknownTier])

    expect(cells.every((cell) => cell.buyerCount === 0)).toBe(true)
    expect(unranked.buyerCount).toBe(1)
    expect(unranked.totalValue).toBe(42)
    expect(unranked.buyers).toEqual([unknownTier])
  })

  it('separates cells by both axes independently, not just one', () => {
    const rows = [
      row({ id: 1, probabilityTier: 'Low', cashFlowImpactTier: 'High', value: 7 }),
      row({ id: 2, probabilityTier: 'High', cashFlowImpactTier: 'Low', value: 3 }),
    ]

    const { cells } = aggregateNineBox(rows)
    const lowHigh = cells.find((c) => c.probabilityTier === 'Low' && c.cashFlowImpactTier === 'High')!
    const highLow = cells.find((c) => c.probabilityTier === 'High' && c.cashFlowImpactTier === 'Low')!

    expect(lowHigh.buyerCount).toBe(1)
    expect(lowHigh.totalValue).toBe(7)
    expect(highLow.buyerCount).toBe(1)
    expect(highLow.totalValue).toBe(3)
  })
})
