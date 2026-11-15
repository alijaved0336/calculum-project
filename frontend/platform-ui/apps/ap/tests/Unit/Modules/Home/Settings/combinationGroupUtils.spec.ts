import { describe, it, expect } from 'vitest'
import {
  CRITERION_KEYS,
  dedupeCombinationGroups,
  hasDuplicateGroups,
  groupHasAnyActiveCriterion,
  activeCriterionCount,
  SS2_DEFAULT_COMBINATION_GROUPS,
  PG2_DEFAULT_COMBINATION_GROUPS
} from '@/modules/home/views/settings/Modals/combinationGroupUtils'

/**
 * WI: US-02 (Sprint 114) - covers the group-level validation shared by SupplierStandardModal.vue
 * and PeerGroupStandardModal.vue: duplicate-criteria detection (both strategies) and the
 * "at least one active criterion" check (Peer Group Standard 2.0 only - see
 * groupHasAnyActiveCriterion's own doc comment for why Supplier Standard 2.0 is exempt).
 */

function emptyGroup(priorityOrder: number) {
  const group: Record<string, any> = { priorityOrder }
  CRITERION_KEYS.forEach((key) => { group[key] = false })
  return group
}

describe('groupHasAnyActiveCriterion', () => {
  it('is false for a group with every criterion false', () => {
    expect(groupHasAnyActiveCriterion(emptyGroup(1))).toBe(false)
  })

  it('is true when exactly one criterion is active', () => {
    expect(groupHasAnyActiveCriterion({ ...emptyGroup(1), supplier_region: true })).toBe(true)
  })

  it('is true when every criterion is active', () => {
    const group = emptyGroup(1)
    CRITERION_KEYS.forEach((key) => { group[key] = true })
    expect(groupHasAnyActiveCriterion(group)).toBe(true)
  })
})

describe('hasDuplicateGroups (regression: same count, different flags must NOT count as duplicate)', () => {
  it('is false when two groups have the same number of active flags but different flags', () => {
    const a = { ...emptyGroup(1), buyer_country: true }
    const b = { ...emptyGroup(2), buyer_region: true }
    expect(hasDuplicateGroups([a, b])).toBe(false)
  })

  it('is true only when two groups share the exact same active flags', () => {
    const a = { ...emptyGroup(1), buyer_country: true, commodity: true }
    const b = { ...emptyGroup(2), buyer_country: true, commodity: true }
    expect(hasDuplicateGroups([a, b])).toBe(true)
  })

  it('ignores priorityOrder when comparing', () => {
    const a = { ...emptyGroup(1), supplier_industry: true }
    const b = { ...emptyGroup(99), supplier_industry: true }
    expect(hasDuplicateGroups([a, b])).toBe(true)
  })

  it('is false for a single group, or an empty list', () => {
    expect(hasDuplicateGroups([emptyGroup(1)])).toBe(false)
    expect(hasDuplicateGroups([])).toBe(false)
  })
})

describe('activeCriterionCount (WI: US-02 "Sort by enabled attributes")', () => {
  it('is 0 for a fully empty group', () => {
    expect(activeCriterionCount(emptyGroup(1))).toBe(0)
  })

  it('counts each active criterion once', () => {
    const group = { ...emptyGroup(1), buyer_country: true, commodity: true, supplier_region: true }
    expect(activeCriterionCount(group)).toBe(3)
  })

  it('sorts groups most-restrictive-first (descending count), ties keep original order', () => {
    const oneFlag = { ...emptyGroup(1), commodity: true, label: 'one' }
    const threeFlags = { ...emptyGroup(2), commodity: true, buyer_country: true, buyer_region: true, label: 'three' }
    const zeroFlags = { ...emptyGroup(3), label: 'zero' }
    const anotherOneFlag = { ...emptyGroup(4), buyer_industry: true, label: 'one-b' }

    const sorted = [oneFlag, threeFlags, zeroFlags, anotherOneFlag]
      .slice()
      .sort((a, b) => activeCriterionCount(b) - activeCriterionCount(a))

    expect(sorted.map((g: any) => g.label)).toEqual(['three', 'one', 'one-b', 'zero'])
  })
})

describe('SS2_DEFAULT_COMBINATION_GROUPS / PG2_DEFAULT_COMBINATION_GROUPS (WI: US-02 "Restore to defaults")', () => {
  it('SS2.0 defaults have no duplicate criteria sets', () => {
    expect(hasDuplicateGroups(SS2_DEFAULT_COMBINATION_GROUPS)).toBe(false)
  })

  it('PG2.0 defaults have no duplicate criteria sets', () => {
    expect(hasDuplicateGroups(PG2_DEFAULT_COMBINATION_GROUPS)).toBe(false)
  })

  it('SS2.0 defaults end with a true-minimum (all-false) row', () => {
    const last = SS2_DEFAULT_COMBINATION_GROUPS[SS2_DEFAULT_COMBINATION_GROUPS.length - 1]
    expect(groupHasAnyActiveCriterion(last)).toBe(false)
  })

  it('PG2.0 defaults never include an all-false row (no forced-identity floor to fall back on)', () => {
    PG2_DEFAULT_COMBINATION_GROUPS.forEach((group) => {
      expect(groupHasAnyActiveCriterion(group)).toBe(true)
    })
  })

  it('both lists are sequentially numbered starting at 1', () => {
    expect(SS2_DEFAULT_COMBINATION_GROUPS.map((g) => g.priorityOrder)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(PG2_DEFAULT_COMBINATION_GROUPS.map((g) => g.priorityOrder)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe('dedupeCombinationGroups', () => {
  it('keeps the first (highest-priority) occurrence and drops later duplicates', () => {
    const a = { ...emptyGroup(1), buyer_leverage: true, source: 'first' }
    const b = { ...emptyGroup(2), buyer_leverage: true, source: 'second' }
    const result = dedupeCombinationGroups([a, b])
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('first')
  })
})
