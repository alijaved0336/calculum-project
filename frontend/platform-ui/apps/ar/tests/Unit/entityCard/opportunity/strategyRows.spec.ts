import { describe, expect, it } from 'vitest'
import { deriveStrategyRows } from '@/modules/entityCard/components/opportunity/strategyRows'
import type { BuyerCardStrategyResultDto } from '@/api'

describe('deriveStrategyRows', () => {
  const standard: BuyerCardStrategyResultDto = {
    strategy: 'BuyerStandardStrategy',
    proposedTerm: 30,
    applicabilityReason: null,
  }
  const parentMin: BuyerCardStrategyResultDto = {
    strategy: 'BuyerParentMinStrategy',
    proposedTerm: null,
    applicabilityReason: 'No parent on file',
  }

  it('marks the row whose strategy matches winningStrategy as the winner', () => {
    const rows = deriveStrategyRows([standard, parentMin], 'BuyerStandardStrategy')

    expect(rows.find((r) => r.strategy === 'BuyerStandardStrategy')?.isWinner).toBe(true)
    expect(rows.find((r) => r.strategy === 'BuyerParentMinStrategy')?.isWinner).toBe(false)
  })

  it('marks every row as a loser when winningStrategy is null (UC-OPP-12 A1/A2)', () => {
    const rows = deriveStrategyRows([standard, parentMin], null)

    expect(rows.every((r) => !r.isWinner)).toBe(true)
  })

  it('carries the proposed term and applicability reason through unchanged', () => {
    const rows = deriveStrategyRows([standard, parentMin], null)

    const loser = rows.find((r) => r.strategy === 'BuyerParentMinStrategy')
    expect(loser?.proposedTerm).toBeNull()
    expect(loser?.applicabilityReason).toBe('No parent on file')
  })

  it('returns an empty list for an empty breakdown', () => {
    expect(deriveStrategyRows([], null)).toEqual([])
  })
})
