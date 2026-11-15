/**
 * Shared helpers for Supplier Standard 2.0 / Peer Group Standard 2.0 combination groups.
 * Used by SupplierStandardModal.vue and PeerGroupStandardModal.vue, whose group shapes
 * (`Group` / `SupplierCardGroup`) share this exact set of criterion keys.
 */

export const CRITERION_KEYS = [
  'commodity',
  'buyer_leverage',
  'buyer_country',
  'buyer_region',
  'buyer_industry',
  'buyer_credit_rating',
  'supplier_country',
  'supplier_region',
  'supplier_industry',
  'supplier_credit_rating'
] as const

//- Some companies' default combination-group lists contain groups with identical criteria
//- (different priorityOrder only). Drop later duplicates so the Super Admin never sees two
//- visually-identical group cards; the first (highest-priority) occurrence is kept.
export function dedupeCombinationGroups<T extends Record<string, any>>(groups: T[]): T[] {
  const seenFingerprints = new Set<string>()
  return groups.filter((group) => {
    const fingerprint = CRITERION_KEYS.map((key) => group[key]).join(',')
    if (seenFingerprints.has(fingerprint)) return false
    seenFingerprints.add(fingerprint)
    return true
  })
}

//- True when two or more groups in the list share the exact same criteria (regardless of
//- priorityOrder) — used to block Save with a toast rather than silently keep/drop anything.
export function hasDuplicateGroups<T extends Record<string, any>>(groups: T[]): boolean {
  return dedupeCombinationGroups(groups).length !== groups.length
}

//- True when a group has at least one active criterion. A genuinely empty (all-false) group is a
//- deliberate, valid "unrestricted, supplier-identity-only" match for Supplier Standard 2.0 - it
//- still has SS2.0's always-on forced-identity comparison behind it. Peer Group Standard 2.0 has no
//- such floor (every comparison is purely toggle-driven), so an empty PG2.0 group would match
//- unconditionally against the whole dataset - meaningless as a "peer group". Used to block Save
//- for PG2.0 only; Supplier Standard 2.0 never calls this.
export function groupHasAnyActiveCriterion<T extends Record<string, any>>(group: T): boolean {
  return CRITERION_KEYS.some((key) => group[key] === true)
}

//- Count of active criteria on a group - used by "Sort by enabled attributes" (WI: US-02) to order
//- groups most-restrictive-first. Purely a display/ordering convenience the Super Admin opts into
//- by clicking a button; it does not change matching logic or override manual drag-and-drop.
export function activeCriterionCount<T extends Record<string, any>>(group: T): number {
  return CRITERION_KEYS.filter((key) => group[key] === true).length
}

export interface DefaultCombinationGroup {
  priorityOrder: number
  commodity: boolean
  buyer_leverage: boolean
  buyer_country: boolean
  buyer_region: boolean
  buyer_industry: boolean
  buyer_credit_rating: boolean
  supplier_country: boolean
  supplier_region: boolean
  supplier_industry: boolean
  supplier_credit_rating: boolean
}

/**
 * "Restore to defaults" (WI: US-02) is a pure frontend action - it only resets local form state,
 * nothing is fetched or saved - so these mirror Back-End's
 * `CompanyPaymentTermStrategyConfigService::defaultCombinationGroups()` by hand. If the backend
 * defaults ever change, update both sides.
 *
 * SS2.0's last row (priorityOrder 7) is the "true minimum" - a genuinely unrestricted,
 * supplier-identity-only match, valid because SS2.0's forced-identity comparison is always on.
 * PG2.0 has no such floor, so every one of its rows keeps at least one active criterion.
 */
export const SS2_DEFAULT_COMBINATION_GROUPS: DefaultCombinationGroup[] = [
  { priorityOrder: 1, commodity: true, buyer_leverage: true, buyer_country: true, buyer_region: true, buyer_industry: true, buyer_credit_rating: true, supplier_country: false, supplier_region: false, supplier_industry: false, supplier_credit_rating: false },
  { priorityOrder: 2, commodity: false, buyer_leverage: true, buyer_country: true, buyer_region: true, buyer_industry: true, buyer_credit_rating: true, supplier_country: false, supplier_region: false, supplier_industry: false, supplier_credit_rating: false },
  { priorityOrder: 3, commodity: false, buyer_leverage: true, buyer_country: true, buyer_region: true, buyer_industry: true, buyer_credit_rating: false, supplier_country: false, supplier_region: false, supplier_industry: false, supplier_credit_rating: false },
  { priorityOrder: 4, commodity: false, buyer_leverage: true, buyer_country: false, buyer_region: true, buyer_industry: true, buyer_credit_rating: false, supplier_country: false, supplier_region: false, supplier_industry: false, supplier_credit_rating: false },
  { priorityOrder: 5, commodity: false, buyer_leverage: false, buyer_country: false, buyer_region: true, buyer_industry: true, buyer_credit_rating: false, supplier_country: false, supplier_region: false, supplier_industry: false, supplier_credit_rating: false },
  { priorityOrder: 6, commodity: false, buyer_leverage: false, buyer_country: false, buyer_region: true, buyer_industry: false, buyer_credit_rating: false, supplier_country: false, supplier_region: false, supplier_industry: false, supplier_credit_rating: false },
  { priorityOrder: 7, commodity: false, buyer_leverage: false, buyer_country: false, buyer_region: false, buyer_industry: false, buyer_credit_rating: false, supplier_country: false, supplier_region: false, supplier_industry: false, supplier_credit_rating: false }
]

export const PG2_DEFAULT_COMBINATION_GROUPS: DefaultCombinationGroup[] = [
  { priorityOrder: 1, commodity: true, buyer_leverage: true, buyer_country: true, buyer_region: true, buyer_industry: true, buyer_credit_rating: true, supplier_country: true, supplier_region: true, supplier_industry: true, supplier_credit_rating: true },
  { priorityOrder: 2, commodity: false, buyer_leverage: true, buyer_country: true, buyer_region: true, buyer_industry: true, buyer_credit_rating: true, supplier_country: true, supplier_region: true, supplier_industry: true, supplier_credit_rating: true },
  { priorityOrder: 3, commodity: false, buyer_leverage: true, buyer_country: true, buyer_region: true, buyer_industry: true, buyer_credit_rating: false, supplier_country: true, supplier_region: true, supplier_industry: true, supplier_credit_rating: false },
  { priorityOrder: 4, commodity: false, buyer_leverage: true, buyer_country: false, buyer_region: true, buyer_industry: true, buyer_credit_rating: false, supplier_country: true, supplier_region: true, supplier_industry: true, supplier_credit_rating: false },
  { priorityOrder: 5, commodity: false, buyer_leverage: true, buyer_country: false, buyer_region: true, buyer_industry: true, buyer_credit_rating: false, supplier_country: false, supplier_region: true, supplier_industry: true, supplier_credit_rating: false },
  { priorityOrder: 6, commodity: false, buyer_leverage: false, buyer_country: false, buyer_region: true, buyer_industry: true, buyer_credit_rating: false, supplier_country: false, supplier_region: true, supplier_industry: true, supplier_credit_rating: false },
  { priorityOrder: 7, commodity: false, buyer_leverage: false, buyer_country: false, buyer_region: true, buyer_industry: false, buyer_credit_rating: false, supplier_country: false, supplier_region: false, supplier_industry: true, supplier_credit_rating: false }
]
