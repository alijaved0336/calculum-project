/**
 * Tests for usePilotAccount composable
 *
 * Covers:
 * - isPilotCompanyBeingUsed
 * - disableElementPilotIsExpired (super-admin bypass, expired vs still-active label)
 * - getLimitTime (translated "expired" label vs raw days-left label)
 *
 * Extracted verbatim from HomeNavbar.vue (Sprint 116 US-2 refactor).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})

let mockIsPilotAccount = vi.fn()
let mockGetPilotTimeExpire = vi.fn()
let mockUserIsSuperAdmin = { value: false }

vi.mock('@/composables', () => ({
  useUser: () => ({
    isPilotAccount: mockIsPilotAccount,
    getPilotTimeExpire: mockGetPilotTimeExpire,
    userIsSuperAdmin: mockUserIsSuperAdmin,
  }),
}))

import usePilotAccount, { PILOT_EXPIRED_LABEL } from '@/modules/home/composables/usePilotAccount'

describe('usePilotAccount', () => {
  beforeEach(() => {
    mockIsPilotAccount = vi.fn(() => false)
    mockGetPilotTimeExpire = vi.fn(() => '5 days left in Pilot')
    mockUserIsSuperAdmin = { value: false }
  })

  describe('isPilotCompanyBeingUsed', () => {
    it('mirrors isPilotAccount()', () => {
      mockIsPilotAccount.mockReturnValue(true)
      const { isPilotCompanyBeingUsed } = usePilotAccount()
      expect(isPilotCompanyBeingUsed.value).toBe(true)
    })

    it('is false when not a pilot account', () => {
      mockIsPilotAccount.mockReturnValue(false)
      const { isPilotCompanyBeingUsed } = usePilotAccount()
      expect(isPilotCompanyBeingUsed.value).toBe(false)
    })
  })

  describe('disableElementPilotIsExpired', () => {
    it('is false when the account is not a pilot account', () => {
      mockIsPilotAccount.mockReturnValue(false)
      const { disableElementPilotIsExpired } = usePilotAccount()
      expect(disableElementPilotIsExpired.value).toBe(false)
    })

    it('is false for a super admin even if the pilot expired', () => {
      mockIsPilotAccount.mockReturnValue(true)
      mockGetPilotTimeExpire.mockReturnValue(PILOT_EXPIRED_LABEL)
      mockUserIsSuperAdmin.value = true
      const { disableElementPilotIsExpired } = usePilotAccount()
      expect(disableElementPilotIsExpired.value).toBe(false)
    })

    it('is true when the pilot expired and the user is not a super admin', () => {
      mockIsPilotAccount.mockReturnValue(true)
      mockGetPilotTimeExpire.mockReturnValue(PILOT_EXPIRED_LABEL)
      mockUserIsSuperAdmin.value = false
      const { disableElementPilotIsExpired } = usePilotAccount()
      expect(disableElementPilotIsExpired.value).toBe(true)
    })

    it('is false when the pilot is still within its trial window', () => {
      mockIsPilotAccount.mockReturnValue(true)
      mockGetPilotTimeExpire.mockReturnValue('3 days left in Pilot')
      mockUserIsSuperAdmin.value = false
      const { disableElementPilotIsExpired } = usePilotAccount()
      expect(disableElementPilotIsExpired.value).toBe(false)
    })
  })

  describe('getLimitTime', () => {
    it('returns the translated "pilot expired" label when expired', () => {
      mockGetPilotTimeExpire.mockReturnValue(PILOT_EXPIRED_LABEL)
      const { getLimitTime } = usePilotAccount()
      expect(getLimitTime.value).toBe('global.pilotExpired')
    })

    it('returns the raw days-left label when not expired', () => {
      mockGetPilotTimeExpire.mockReturnValue('3 days left in Pilot')
      const { getLimitTime } = usePilotAccount()
      expect(getLimitTime.value).toBe('3 days left in Pilot')
    })
  })
})
