/**
 * AB#20488 — TEMPORARY gate: Supplier Standard 2.0 / Peer Group Standard 2.0 are
 * visible to super admins only. Imports the real module (no mirrored logic).
 */

import { describe, it, expect } from 'vitest'
import {
  STANDARD_2_STRATEGY_KEYS,
  isStandard2StrategyVisibleForUser,
  removeStandard2StrategiesForNonAdmin,
} from '@/utils/standard2StrategiesVisibility'

describe('isStandard2StrategyVisibleForUser', () => {
  it('is true only when the feature allows it and the user is a super admin', () => {
    expect(isStandard2StrategyVisibleForUser(true, true)).toBe(true)
    expect(isStandard2StrategyVisibleForUser(true, false)).toBe(false)
    expect(isStandard2StrategyVisibleForUser(false, true)).toBe(false)
    expect(isStandard2StrategyVisibleForUser(false, false)).toBe(false)
  })
})

describe('removeStandard2StrategiesForNonAdmin', () => {
  const strategies = () => [
    { key: 'payOnTermsStrategy' },
    { key: 'supplierStandard2Strategy' },
    { key: 'supplierStandardStrategy' },
    { key: 'peerGroupStandard2Strategy' },
  ]

  it('covers exactly the two 2.0 strategy keys', () => {
    expect([...STANDARD_2_STRATEGY_KEYS]).toEqual(['supplierStandard2Strategy', 'peerGroupStandard2Strategy'])
  })

  it('returns the list untouched for a super admin', () => {
    const input = strategies()
    expect(removeStandard2StrategiesForNonAdmin(input, true)).toBe(input)
  })

  it('drops only the 2.0 strategies for a non super admin, keeping the order', () => {
    expect(removeStandard2StrategiesForNonAdmin(strategies(), false).map((s) => s.key)).toEqual([
      'payOnTermsStrategy',
      'supplierStandardStrategy',
    ])
  })

  it('does not mutate the input list', () => {
    const input = strategies()
    removeStandard2StrategiesForNonAdmin(input, false)
    expect(input).toHaveLength(4)
  })
})
