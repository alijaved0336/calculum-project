import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useArCurrentUserStore } from '@/stores/arCurrentUser'

describe('the AR current user store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has no user until one is set', () => {
    expect(useArCurrentUserStore().user).toBeNull()
  })

  it('sets the signed-in user', () => {
    const store = useArCurrentUserStore()
    const user = { email: 'user@calculum.ai', idps: 'b2c', authenticationSource: 'b2c', sessionExpiresAt: 0 }

    store.setUser(user)

    expect(store.user).toEqual(user)
  })

  /** Sign-out (UC-ENT-09): the previous user's identity must not still be readable if the same
   * browser signs in again as somebody else. */
  it('drops the user on clear()', () => {
    const store = useArCurrentUserStore()
    store.setUser({ email: 'user@calculum.ai', idps: 'b2c', authenticationSource: 'b2c', sessionExpiresAt: 0 })

    store.clear()

    expect(store.user).toBeNull()
  })

  it('derives the export getters and hasRole from the session roles', () => {
    const store = useArCurrentUserStore()
    const base = { email: 'user@calculum.ai', idps: 'b2c', authenticationSource: 'b2c', sessionExpiresAt: 0 }

    expect([store.canExportLists, store.canExportMatch, store.hasRole('ROLE_ADMIN')]).toEqual([false, false, false])

    store.setUser({ ...base, roles: ['ROLE_USER', 'ROLE_COMPANY_ADMIN', 'FEATURE_DOWNLOAD_EXCEL'] })
    expect([store.canExportLists, store.canExportMatch, store.hasRole('ROLE_COMPANY_ADMIN')]).toEqual([true, false, true])

    store.setUser({ ...base, roles: ['ROLE_ADMIN', 'ROLE_SALES', 'ROLE_USER'] })
    expect([store.canExportLists, store.canExportMatch, store.hasRole('ROLE_ADMIN')]).toEqual([true, true, true])
  })
})
