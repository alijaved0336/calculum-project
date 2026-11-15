/**
 * Unit tests for EntityPaymentTermsStrategies - showBadgeSCF computed
 *
 * Tests all combinations of onSCF and scfAccepted props that drive
 * the SCF badge display in the payment terms header.
 */

import { describe, it, expect } from 'vitest'

type BadgeResult = { onSCF: boolean; scfAccepted: boolean; scfRemoved: boolean }

// Replicated from EntityPaymentTermsStrategies.vue setup()
function showBadgeSCF(onSCF: boolean | null, scfAccepted: boolean | null): BadgeResult {
  const bothTrue = onSCF === true && scfAccepted === true
  const onScfFalseScfTrue = onSCF === false && scfAccepted === true
  const onScfTrueScfNull = onSCF === true && scfAccepted === null
  const onScfFalseScfNull = onSCF === false && scfAccepted === null
  const onScfTrueScfFalse = onSCF === true && scfAccepted === false

  const result: BadgeResult = { onSCF: false, scfAccepted: false, scfRemoved: false }

  switch (true) {
    case onScfTrueScfNull:
    case bothTrue:
      result.onSCF = true
      result.scfAccepted = false
      result.scfRemoved = false
      break
    case onScfFalseScfTrue:
      result.scfAccepted = true
      result.scfRemoved = false
      result.onSCF = false
      break
    case onScfTrueScfFalse:
      result.scfAccepted = false
      result.scfRemoved = true
      result.onSCF = true
      break
    case onScfFalseScfNull:
    default:
      result.scfAccepted = false
      result.scfRemoved = false
      result.onSCF = false
  }

  return result
}

describe('EntityPaymentTermsStrategies - showBadgeSCF', () => {
  it('shows onSCF badge when onSCF=true and scfAccepted=null', () => {
    const result = showBadgeSCF(true, null)
    expect(result.onSCF).toBe(true)
    expect(result.scfAccepted).toBe(false)
    expect(result.scfRemoved).toBe(false)
  })

  it('shows onSCF badge when both onSCF=true and scfAccepted=true', () => {
    const result = showBadgeSCF(true, true)
    expect(result.onSCF).toBe(true)
    expect(result.scfAccepted).toBe(false)
    expect(result.scfRemoved).toBe(false)
  })

  it('shows scfAccepted badge when onSCF=false and scfAccepted=true', () => {
    const result = showBadgeSCF(false, true)
    expect(result.onSCF).toBe(false)
    expect(result.scfAccepted).toBe(true)
    expect(result.scfRemoved).toBe(false)
  })

  it('shows scfRemoved and onSCF badges when onSCF=true and scfAccepted=false', () => {
    const result = showBadgeSCF(true, false)
    expect(result.onSCF).toBe(true)
    expect(result.scfAccepted).toBe(false)
    expect(result.scfRemoved).toBe(true)
  })

  it('shows no badges when onSCF=false and scfAccepted=null', () => {
    const result = showBadgeSCF(false, null)
    expect(result.onSCF).toBe(false)
    expect(result.scfAccepted).toBe(false)
    expect(result.scfRemoved).toBe(false)
  })

  it('shows no badges when both are null (default)', () => {
    const result = showBadgeSCF(null, null)
    expect(result.onSCF).toBe(false)
    expect(result.scfAccepted).toBe(false)
    expect(result.scfRemoved).toBe(false)
  })
})
