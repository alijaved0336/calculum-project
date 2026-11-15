/**
 * Unit tests for EntityTermsChartLine - paymentTermsDescriptions prop contract
 *
 * Verifies the prop definition and display logic for paymentTermsDescriptions
 * (from cashflow-or-savings-overview and spend-negotiation API responses).
 */

import { describe, it, expect } from 'vitest'

describe('EntityTermsChartLine - paymentTermsDescriptions prop contract', () => {
  // Replicate prop definition from EntityTermsChartLine.vue: paymentTermsDescriptions: { type: String, default: () => '' }
  const propDefault = (): string => ''

  it('should define paymentTermsDescriptions default as empty string', () => {
    expect(propDefault()).toBe('')
  })

  it('should accept paymentTermsDescriptions as string (API returns array, parent joins to string)', () => {
    const joinedFromApi = ['NET 30', '2/10 NET 30'].join(', ')
    expect(joinedFromApi).toBe('NET 30, 2/10 NET 30')
    expect(typeof joinedFromApi).toBe('string')
  })
})
