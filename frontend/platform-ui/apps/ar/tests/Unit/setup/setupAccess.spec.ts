import { describe, expect, it } from 'vitest'
import { SETUP_TABS, hasSetupAccess } from '@/modules/setup/setupAccess'

/** AB#20702 FR-01 / EF-1: the sidebar link and the view show Setup to administrators only. */
describe('Setup access', () => {
  it('lets in a super admin', () => {
    expect(hasSetupAccess(['ROLE_USER', 'ROLE_ADMIN'])).toBe(true)
  })

  it('lets in an admin of the active company', () => {
    expect(hasSetupAccess(['ROLE_COMPANY_ADMIN', 'ROLE_USER'])).toBe(true)
  })

  it('keeps out an account without an admin role, and one whose session reports no roles', () => {
    expect(hasSetupAccess(['ROLE_USER', 'MODULE_SETUP'])).toBe(false)
    expect(hasSetupAccess([])).toBe(false)
    expect(hasSetupAccess(undefined)).toBe(false)
  })

  it('lists the three tabs in display order, Payment Terms Reduction first (FR-02)', () => {
    expect(SETUP_TABS).toEqual(['payment-terms', 'client-standard', 'cash-flow'])
  })
})
