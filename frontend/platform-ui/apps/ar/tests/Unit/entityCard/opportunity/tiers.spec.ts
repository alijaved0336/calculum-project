import { describe, expect, it } from 'vitest'
import { translateTier } from '@/modules/entityCard/components/opportunity/tiers'

describe('translateTier', () => {
  const translate = (key: string) => `translated:${key}`

  it('translates each of the three backend tier names', () => {
    expect(translateTier('Low', translate)).toBe('translated:arEntityCard.opportunity.tiers.low')
    expect(translateTier('Medium', translate)).toBe('translated:arEntityCard.opportunity.tiers.medium')
    expect(translateTier('High', translate)).toBe('translated:arEntityCard.opportunity.tiers.high')
  })

  /** Never silently hides a tier this map doesn't yet know about - shows the raw value instead,
   * the same "degrade honestly" rule every other formatter in this module follows. */
  it('falls back to the raw value for anything outside the known three', () => {
    expect(translateTier('Unknown', translate)).toBe('Unknown')
  })

  /** Found by review: es.json's tier words are adjectives, and Spanish adjective gender must
   * agree with whatever noun they modify - "Probabilidad" (probability) is feminine ("Alta"),
   * "Nivel" (impact level) is masculine ("Alto"). A single shared vocabulary cannot be correct
   * for both callers, so the masculine form is a distinct, explicit key set. */
  it('translates the masculine form under a separate key set when asked for one', () => {
    expect(translateTier('Low', translate, true)).toBe('translated:arEntityCard.opportunity.tiers.lowMasculine')
    expect(translateTier('Medium', translate, true)).toBe('translated:arEntityCard.opportunity.tiers.mediumMasculine')
    expect(translateTier('High', translate, true)).toBe('translated:arEntityCard.opportunity.tiers.highMasculine')
  })

  it('still falls back to the raw value for an unknown tier in the masculine form', () => {
    expect(translateTier('Unknown', translate, true)).toBe('Unknown')
  })
})
