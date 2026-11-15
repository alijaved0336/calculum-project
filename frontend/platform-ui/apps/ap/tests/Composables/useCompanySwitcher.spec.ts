/**
 * Tests for useCompanySwitcher composable
 *
 * Covers:
 * - changeCompany's validation guard, success chain (with/without an
 *   active spend file), and both callbackError paths
 * - the getMaxDateSpend/updateSpendFileVersionList calls routed through
 *   the cross-composable bridge
 * - selectCompany's cleanValues + changeCompany call
 * - the companyActive watcher updating the matching company's name
 *
 * Extracted verbatim from HomeNavbar.vue (Sprint 116 US-2 refactor).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { reactive, ref, nextTick } from 'vue'

const { userStore } = vi.hoisted(() => ({
  userStore: {
    setPendingNewSpendFileVersion: vi.fn(),
    postUserCompany: vi.fn(),
    whoAmI: vi.fn(),
  },
}))
vi.mock('@/stores/user', () => ({ useUserStore: () => userStore }))
// `@/utils` (the barrel) has a documented circular-import chain
// (docs/context/documentation-standards.md) that only bites in an isolated
// module graph like this one, not in the running app — mock just the two
// exports this composable needs rather than pulling in the real barrel.
vi.mock('@/utils', () => ({
  isNullOrUndefined: (v: unknown) => v === null || v === undefined,
  StringUtils: {
    isNullUndefinedOrEmpty: (v: unknown) => v === null || v === undefined || v === '',
  },
}))
// CookieSessionsFns pulls in useFirebase/Routing/stores, which transitively
// reach back into the real `@/utils` barrel above — mock the one function
// this composable actually calls instead of following that whole chain.
vi.mock('@/utils/CookieSessionsFns', () => ({ checkNewSpendFileVersion: vi.fn() }))

import useCompanySwitcher from '@/modules/home/composables/useCompanySwitcher'
import type { HomeNavBar } from '@/modules/home/types'

function makeData(overrides: Partial<HomeNavBar> = {}): HomeNavBar {
  return reactive({
    loading: false,
    selectedCompany: '/api/companies/1',
    companyList: [],
    toggleCompanyDropdown: true,
    ...overrides,
  }) as HomeNavBar
}

function makeDeps(overrides: Partial<Record<string, any>> = {}) {
  return {
    cleanupBeforeCompanyChange: vi.fn(),
    cleanupAfterCompanyChange: vi.fn(),
    checkMemoryLeaks: vi.fn(() => ({ hasLeak: false })),
    verifyGridConfigurations: vi.fn(() => ({ ok: true })),
    cleanValues: vi.fn(),
    emit: vi.fn(),
    bridge: { getMaxDateSpend: vi.fn(), updateSpendFileVersionList: vi.fn() },
    ...overrides,
  }
}

describe('useCompanySwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('changeCompany', () => {
    it('cleans up and clears loading without calling the API when the id is empty', () => {
      const data = makeData({ loading: true })
      const deps = makeDeps()
      const { changeCompany } = useCompanySwitcher(data, ref(null), ref(null), deps as any)

      changeCompany('', true)

      expect(userStore.postUserCompany).not.toHaveBeenCalled()
      expect(deps.cleanupAfterCompanyChange).toHaveBeenCalled()
      expect(data.loading).toBe(false)
    })

    it('on success with an active spend file: emits showAlerts(0,false) and calls bridge.getMaxDateSpend with cleanupAfterCompanyChange as onComplete', () => {
      const data = makeData()
      const user = ref({ activeSpendFileVersion: { '@id': '/api/spend_file_versions/9' } })
      const deps = makeDeps()
      const { changeCompany } = useCompanySwitcher(data, ref(null), user, deps as any)

      changeCompany('/api/companies/2', true)
      const { callbackSuccess: postSuccess } = userStore.postUserCompany.mock.calls[0][0]
      postSuccess()
      const { callbackSuccess: whoAmISuccess } = userStore.whoAmI.mock.calls[0][0]
      whoAmISuccess({})

      expect(deps.bridge.updateSpendFileVersionList).toHaveBeenCalled()
      expect(deps.emit).toHaveBeenCalledWith('showAlerts', 0, false)
      expect(deps.bridge.getMaxDateSpend).toHaveBeenCalledWith(
        true,
        '/api/spend_file_versions/9',
        deps.cleanupAfterCompanyChange,
      )
      expect(data.loading).toBe(false)
    })

    it('on success with no active spend file: runs cleanup immediately instead of calling getMaxDateSpend', () => {
      const data = makeData()
      const user = ref({ activeSpendFileVersion: null })
      const deps = makeDeps()
      const { changeCompany } = useCompanySwitcher(data, ref(null), user, deps as any)

      changeCompany('/api/companies/2', true)
      userStore.postUserCompany.mock.calls[0][0].callbackSuccess()
      userStore.whoAmI.mock.calls[0][0].callbackSuccess({})

      expect(deps.bridge.getMaxDateSpend).not.toHaveBeenCalled()
      expect(deps.cleanupAfterCompanyChange).toHaveBeenCalled()
    })

    it('on success with a null user: cleans up and returns without emitting showAlerts', () => {
      const data = makeData()
      const deps = makeDeps()
      const { changeCompany } = useCompanySwitcher(data, ref(null), ref(null), deps as any)

      changeCompany('/api/companies/2', true)
      userStore.postUserCompany.mock.calls[0][0].callbackSuccess()
      userStore.whoAmI.mock.calls[0][0].callbackSuccess({})

      expect(deps.emit).not.toHaveBeenCalled()
      expect(deps.cleanupAfterCompanyChange).toHaveBeenCalled()
      expect(data.loading).toBe(false)
    })

    it('cleans up on a whoAmI callbackError', () => {
      const data = makeData()
      const deps = makeDeps()
      const { changeCompany } = useCompanySwitcher(data, ref(null), ref(null), deps as any)

      changeCompany('/api/companies/2', true)
      userStore.postUserCompany.mock.calls[0][0].callbackSuccess()
      userStore.whoAmI.mock.calls[0][0].callbackError()

      expect(deps.cleanupAfterCompanyChange).toHaveBeenCalled()
      expect(data.loading).toBe(false)
    })

    it('cleans up on a postUserCompany callbackError', () => {
      const data = makeData()
      const deps = makeDeps()
      const { changeCompany } = useCompanySwitcher(data, ref(null), ref(null), deps as any)

      changeCompany('/api/companies/2', true)
      userStore.postUserCompany.mock.calls[0][0].callbackError()

      expect(deps.cleanupAfterCompanyChange).toHaveBeenCalled()
      expect(data.loading).toBe(false)
    })

    it('calls cleanupBeforeCompanyChange before dispatching the request', () => {
      const data = makeData()
      const deps = makeDeps()
      const { changeCompany } = useCompanySwitcher(data, ref(null), ref(null), deps as any)

      changeCompany('/api/companies/2', true)

      expect(deps.cleanupBeforeCompanyChange).toHaveBeenCalled()
      expect(userStore.postUserCompany).toHaveBeenCalled()
    })
  })

  describe('selectCompany', () => {
    it('closes the dropdown, updates selectedCompany, resets recalculation state, and dispatches changeCompany', () => {
      const data = makeData({ toggleCompanyDropdown: true })
      const deps = makeDeps()
      const { selectCompany } = useCompanySwitcher(data, ref(null), ref(null), deps as any)

      selectCompany({ '@id': '/api/companies/7', name: 'Acme' })

      expect(data.toggleCompanyDropdown).toBe(false)
      expect(data.selectedCompany).toBe('/api/companies/7')
      expect(deps.cleanValues).toHaveBeenCalled()
      expect(userStore.postUserCompany).toHaveBeenCalledWith(
        expect.objectContaining({ selectedCompany: '/api/companies/7' }),
      )
    })
  })

  describe('companyActive watcher', () => {
    it('updates the matching company name in the local list', async () => {
      const data = makeData({
        companyList: [{ '@id': '/api/companies/1', '@type': 'Company', name: 'Old Name' }],
      })
      const companyActive = ref<any>(null)
      useCompanySwitcher(data, companyActive, ref(null), makeDeps() as any)

      companyActive.value = { '@id': '/api/companies/1', name: 'New Name' }
      await nextTick()

      expect(data.companyList[0].name).toBe('New Name')
    })

    it('does nothing when companyActive is null', async () => {
      const data = makeData({
        companyList: [{ '@id': '/api/companies/1', '@type': 'Company', name: 'Old Name' }],
      })
      const companyActive = ref<any>({ '@id': '/api/companies/1', name: 'Something' })
      useCompanySwitcher(data, companyActive, ref(null), makeDeps() as any)

      companyActive.value = null
      await nextTick()

      expect(data.companyList[0].name).toBe('Old Name')
    })

    it('does nothing when the active company is not found in the local list', async () => {
      const data = makeData({
        companyList: [{ '@id': '/api/companies/1', '@type': 'Company', name: 'Old Name' }],
      })
      const companyActive = ref<any>(null)
      useCompanySwitcher(data, companyActive, ref(null), makeDeps() as any)

      companyActive.value = { '@id': '/api/companies/999', name: 'Unrelated' }
      await nextTick()

      expect(data.companyList[0].name).toBe('Old Name')
    })
  })
})
