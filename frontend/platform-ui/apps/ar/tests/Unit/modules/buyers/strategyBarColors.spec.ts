import { describe, expect, it } from 'vitest'
import { getStrategyBarColor } from '@ada/design-system'

// Same mapping as AP's PaymentTermsStrategiesUtils.getColorByStrategyKeyDetailsSection.
describe('getStrategyBarColor', () => {
  it.each([
    ['contractualTerms', '#475569'],
    ['currentTerms', '#22ccee'],
    ['actualTerms', '#22ccee'],
    ['proposedTerms', '#6366f1'],
    ['opportunityTerms', '#6366f1'],
    ['supplierStandardStrategy', '#0040c1'],
    ['peerGroupAvgStrategy', '#0040c1'],
    ['scfStandardStrategy', '#FFB524'],
  ])('paints %s as %s', (key, color) => {
    expect(getStrategyBarColor(key)).toBe(color)
  })

  it.each(['BuyerMin', 'ParentBuyerMin', 'CounterPartyStandard2', 'PeerGroupStandard2', 'IndustryGroup'])(
    'paints every other key (%s) the default strategy blue',
    (key) => {
      expect(getStrategyBarColor(key)).toBe('#3B82F6')
    },
  )
})
