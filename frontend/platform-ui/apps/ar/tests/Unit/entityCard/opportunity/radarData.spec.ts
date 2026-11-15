import { describe, expect, it } from 'vitest'
import { deriveRadarPoints } from '@/modules/entityCard/components/opportunity/radarData'
import type { BuyerCardStrategyResultDto } from '@/api'

describe('deriveRadarPoints', () => {
  it('plots one point per strategy with a proposed term, axis value equal to the term', () => {
    const breakdown: BuyerCardStrategyResultDto[] = [
      { strategy: 'BuyerStandardStrategy', proposedTerm: 30, applicabilityReason: null },
      { strategy: 'RegulationsStrategy', proposedTerm: 45, applicabilityReason: null },
    ]

    expect(deriveRadarPoints(breakdown)).toEqual([
      { name: 'Buyer Standard Strategy', term: 30 },
      { name: 'Regulations Strategy', term: 45 },
    ])
  })

  /** The axis label reads the same as StrategyList's own row for the same strategy, rather than
   * showing the raw backend identifier on one and the humanized name on the other. */
  it('humanizes the strategy identifier the same way StrategyList does', () => {
    const breakdown: BuyerCardStrategyResultDto[] = [
      { strategy: 'IndustryRegionStandardStrategy', proposedTerm: 20, applicabilityReason: null },
    ]

    expect(deriveRadarPoints(breakdown)).toEqual([{ name: 'Industry Region Standard Strategy', term: 20 }])
  })

  /** AC-05: a strategy still pending a decision (no proposed term yet) is simply absent from
   * the chart rather than plotted as a zero. */
  it('omits a strategy with no proposed term', () => {
    const breakdown: BuyerCardStrategyResultDto[] = [
      { strategy: 'BuyerStandardStrategy', proposedTerm: 30, applicabilityReason: null },
      { strategy: 'BuyerParentMinStrategy', proposedTerm: null, applicabilityReason: 'No parent on file' },
    ]

    expect(deriveRadarPoints(breakdown)).toEqual([{ name: 'Buyer Standard Strategy', term: 30 }])
  })

  it('returns an empty list for an empty breakdown', () => {
    expect(deriveRadarPoints([])).toEqual([])
  })
})
