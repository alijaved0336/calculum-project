const TIER_KEYS: Record<string, string> = {
  Low: 'arEntityCard.opportunity.tiers.low',
  Medium: 'arEntityCard.opportunity.tiers.medium',
  High: 'arEntityCard.opportunity.tiers.high',
}

const TIER_KEYS_MASCULINE: Record<string, string> = {
  Low: 'arEntityCard.opportunity.tiers.lowMasculine',
  Medium: 'arEntityCard.opportunity.tiers.mediumMasculine',
  High: 'arEntityCard.opportunity.tiers.highMasculine',
}

/**
 * Translates one of the backend's three `OpportunityTier` names (`Low`/`Medium`/`High`, off
 * `ProbabilityTier`/`CashFlowImpactTier`'s `.ToString()`). Found by review, beyond the flagged
 * `formatDays` bypass: these tier names are the same kind of English-only string rendered
 * straight into a panel this PR just added Spanish labels for.
 *
 * `masculine`, when true, uses a separate key set. Found by review, second pass: es.json's tier
 * words are adjectives, and Spanish adjective gender must agree with whatever noun they modify -
 * "Probabilidad" (probability) is feminine ("Alta"), "Nivel" (impact level) is masculine
 * ("Alto"). One shared vocabulary cannot be grammatically correct for both callers; each caller
 * passes the gender its own label actually needs.
 *
 * Falls back to the raw value for anything outside the known three, rather than silently hiding
 * a tier this map doesn't yet know about.
 */
export function translateTier(tier: string, translate: (key: string) => string, masculine = false): string {
  const key = (masculine ? TIER_KEYS_MASCULINE : TIER_KEYS)[tier]
  return key ? translate(key) : tier
}
