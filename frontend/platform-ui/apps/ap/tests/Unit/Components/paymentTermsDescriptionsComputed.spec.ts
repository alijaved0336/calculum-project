/**
 * Unit tests for joinPaymentTermsDescriptions
 *
 * Used by cashflow-or-savings-overview and spend-negotiation API responses.
 */

import { describe, it, expect } from 'vitest'
import { joinPaymentTermsDescriptions } from '@/modules/home/entityCard/utils'

describe('joinPaymentTermsDescriptions', () => {
  it('should return joined string when array has items', () => {
    expect(joinPaymentTermsDescriptions(['NET 30', '2/10 NET 30'])).toBe(
      'NET 30, 2/10 NET 30'
    )
  })

  it('should return empty string when array is empty', () => {
    expect(joinPaymentTermsDescriptions([])).toBe('')
  })

  it('should return empty string when null', () => {
    expect(joinPaymentTermsDescriptions(null)).toBe('')
  })

  it('should return empty string when undefined', () => {
    expect(joinPaymentTermsDescriptions(undefined)).toBe('')
  })

  it('should return single item without comma when array has one element', () => {
    expect(joinPaymentTermsDescriptions(['NET 45'])).toBe('NET 45')
  })
})
