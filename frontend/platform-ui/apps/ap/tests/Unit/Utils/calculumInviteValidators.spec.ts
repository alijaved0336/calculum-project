/**
 * AB#20378 — inviting an @calculum.ai user must not be blocked by the company's allowed-domain
 * restriction. The client-side gate was the first of three: it rejected the address before the
 * request ever left the browser, and the only way past it was being a Super Admin.
 *
 * These exercise the real module the invite form imports (`@/utils/validators`), not a copy of
 * its logic.
 */

import { describe, it, expect } from 'vitest'
import { isValidEmailandAllowedDomains, isCalculumEmail } from '@/utils/validators'

describe('AB#20378 — Calculum addresses bypass the allowed-domain restriction', () => {
  const ALLOWED = 'bayer.com, novonesis.com'

  it('accepts an @calculum.ai address on a company that restricts its domains', () => {
    expect(isValidEmailandAllowedDomains('noa@calculum.ai', ALLOWED)).toBe(true)
  })

  it('accepts it whatever the casing', () => {
    expect(isValidEmailandAllowedDomains('Noa@Calculum.AI', ALLOWED)).toBe(true)
  })

  it('still accepts an address on one of the configured domains', () => {
    expect(isValidEmailandAllowedDomains('someone@bayer.com', ALLOWED)).toBe(true)
  })

  it('still rejects an address outside the configured domains', () => {
    expect(isValidEmailandAllowedDomains('someone@elsewhere.com', ALLOWED)).toBe(false)
  })

  it('still rejects a malformed address, Calculum domain or not', () => {
    expect(isValidEmailandAllowedDomains('not-an-email', ALLOWED)).toBe(false)
    expect(isValidEmailandAllowedDomains('@calculum.ai', ALLOWED)).toBe(false)
    expect(isValidEmailandAllowedDomains('', ALLOWED)).toBe(false)
  })

  it('does not let a look-alike domain through', () => {
    expect(isValidEmailandAllowedDomains('someone@notcalculum.ai', ALLOWED)).toBe(false)
    expect(isValidEmailandAllowedDomains('someone@calculum.ai.example.com', ALLOWED)).toBe(false)
  })
})

describe('AB#20378 — isCalculumEmail', () => {
  it('recognises internal addresses regardless of casing or surrounding spaces', () => {
    expect(isCalculumEmail('noa@calculum.ai')).toBe(true)
    expect(isCalculumEmail('  Joel+testsuperadmin@Calculum.AI  ')).toBe(true)
  })

  it('is anchored on the whole domain', () => {
    expect(isCalculumEmail('someone@notcalculum.ai')).toBe(false)
    expect(isCalculumEmail('someone@calculum.ai.example.com')).toBe(false)
    expect(isCalculumEmail('calculum.ai')).toBe(false)
    expect(isCalculumEmail('')).toBe(false)
    expect(isCalculumEmail(undefined)).toBe(false)
  })
})
