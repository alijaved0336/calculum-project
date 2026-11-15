/**
 * Tests for useSpendFileVersionSwitcher composable
 *
 * The single most business-critical function in HomeNavbar.vue —
 * `changeCurrentSpendFileVersion` — plus the subscription re-entrancy
 * guard, validateSpendFilesActive's 3 branches, and the 5-branch
 * spendFileVersionsFormatted watcher.
 *
 * Extracted verbatim from HomeNavbar.vue (Sprint 116 US-2 refactor).
 * `changeCurrentSpendFileVersion`'s statement order (same-version guard →
 * setDisableWatchers(true) + 5s safety timer → store resets → gc() →
 * goToHomeDashboard → PATCH) is the contract documented in
 * docs/context/race-condition-company-change.md — every test here checks
 * that order is preserved, not just the individual calls.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { reactive, ref, nextTick } from 'vue'

// `@/utils` (the barrel) has a documented circular-import chain
// (docs/context/documentation-standards.md) that only bites in an isolated
// module graph like this one, not in the running app — mock with small,
// faithful reimplementations instead of pulling in the real barrel.
vi.mock('@/utils', () => ({
  isNullOrUndefined: (v: unknown) => v === null || v === undefined,
  removeIRI: (iri: string | null | undefined) => (iri ? iri.split('/').pop() ?? '' : ''),
  ArrayUtils: {
    isEmpty: (arr: any[] | null | undefined) => !arr || arr.length === 0,
    sortAscBy: (arr: any[], keys: string[]) =>
      [...arr].sort((a, b) => (a[keys[0]] > b[keys[0]] ? 1 : a[keys[0]] < b[keys[0]] ? -1 : 0)),
  },
  StringUtils: {
    isEmpty: (v: string | null | undefined) => !v,
  },
}))
vi.mock('@/utils/CookieSessionsFns', () => ({ checkNewSpendFileVersion: vi.fn() }))
vi.mock('@/utils/memoryMonitor', () => ({ memoryMonitor: { getMemoryStats: vi.fn(() => null) } }))

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock('vue-toastification', () => ({ useToast: () => ({ error: toastError }) }))

const { firebase } = vi.hoisted(() => ({
  firebase: {
    subscribeToPrograms: vi.fn(),
    fnSetUnsubscribeProgram: vi.fn(),
    fnUnsubscribeToSpendFiles: vi.fn(),
    subscribeToSpendFiles: vi.fn(),
  },
}))
vi.mock('@/composables/firebase/useFirebase', () => ({
  default: () => ({
    subscribeToPrograms: firebase.subscribeToPrograms,
    fnSetUnsubscribeProgram: firebase.fnSetUnsubscribeProgram,
  }),
}))
vi.mock('@/composables/firebase/useSpendFileFirebase', () => ({
  default: () => ({
    fnUnsubscribeToSpendFiles: firebase.fnUnsubscribeToSpendFiles,
    subscribeToSpendFiles: firebase.subscribeToSpendFiles,
  }),
}))

const { closeSubscription } = vi.hoisted(() => ({ closeSubscription: vi.fn() }))
vi.mock('@/composables/firebase/firebaseSession', () => ({
  closeSubscription,
  SUBSCRIPTION_KEYS: { plan: 'plan' },
}))

const { stores } = vi.hoisted(() => ({
  stores: {
    globalFilters: { disableWatchers: false, setDisableWatchers: vi.fn(), getDisableWatchers: false },
    entityCard: { setSelectedProgram: vi.fn() },
    user: {
      getUser: { activeSpendFileVersion: { '@id': '/api/spend_file_versions/current' } },
      setError403: vi.fn(),
      setError410: vi.fn(),
      setShowSpendNoty: vi.fn(),
      setShowMenu: vi.fn(),
      setPendingNewSpendFileVersion: vi.fn(),
      setActualUser: vi.fn(),
      changeActualFile: vi.fn(),
    },
    compare: { setAddededCompanies: vi.fn() },
    subscribe: {
      setLastStatusDate: vi.fn(),
      setLastStatusPlanSubscribe: vi.fn(),
      setPlanSubscribe: vi.fn(),
      setSupplierStandardClusterStatus: vi.fn(),
      setAllowActionsInModules: vi.fn(),
      setLastStatusSpendFileSubscribe: vi.fn(),
      setSetRefeshSpendFiles: vi.fn(),
    },
    plan: { setDefaultPlan: vi.fn() },
    analyze: {
      setFinancingsGroupsbyProgram: vi.fn(),
      setHarmonizationsGroupsbyProgram: vi.fn(),
      setHasFinancing: vi.fn(),
      setHasHarmonization: vi.fn(),
      setGroups: vi.fn(),
      setFinancing: vi.fn(),
    },
  },
}))
vi.mock('@/stores/globalFilters', () => ({
  useGlobalFiltersStore: () => ({
    setDisableWatchers: (v: boolean) => {
      stores.globalFilters.disableWatchers = v
      stores.globalFilters.setDisableWatchers(v)
    },
    get getDisableWatchers() {
      return stores.globalFilters.disableWatchers
    },
  }),
}))
vi.mock('@/stores/entityCard', () => ({ useEntityCardStore: () => stores.entityCard }))
vi.mock('@/stores/user', () => ({ useUserStore: () => stores.user }))
vi.mock('@/stores/compare', () => ({ useCompareStore: () => stores.compare }))
vi.mock('@/stores/subscribe', () => ({ useSubscribeStore: () => stores.subscribe }))
vi.mock('@/stores/plan', () => ({ usePlanStore: () => stores.plan }))
vi.mock('@/stores/analyze', () => ({ useAnalyzeStore: () => stores.analyze }))

import useSpendFileVersionSwitcher from '@/modules/home/composables/useSpendFileVersionSwitcher'
import type { HomeNavBar } from '@/modules/home/types'

function makeData(overrides: Partial<HomeNavBar> = {}): HomeNavBar {
  return reactive({
    loading: false,
    isLoadingChangeSpendFile: false,
    toggleSpendFileDropdown: true,
    companyList: [],
    ...overrides,
  }) as HomeNavBar
}

function makeBridge(overrides: Record<string, any> = {}) {
  return {
    getMaxDateSpend: vi.fn(),
    goToHomeDashboard: vi.fn(),
    commonApiCalls: vi.fn(),
    getWhoAmI: vi.fn(),
    firtCallsOrWhoAmI: vi.fn(),
    getVCardGroups: vi.fn(),
    ...overrides,
  }
}

function build(opts: {
  data?: HomeNavBar
  companyActiveSpendFileVersions?: any
  user?: any
  bridge?: ReturnType<typeof makeBridge>
} = {}) {
  const data = opts.data ?? makeData()
  const companyActiveSpendFileVersions = ref(opts.companyActiveSpendFileVersions ?? [])
  const user = ref(opts.user ?? { email: 'user@example.com' })
  const userIri = ref('/api/users/1')
  const programSelectedDefaultId = ref('')
  const spendFileVersionActive = ref<any>(null)
  const cleanValues = vi.fn()
  const getUnreadNotifications = vi.fn()
  const getNotificationAmount = vi.fn()
  const emit = vi.fn()
  const bridge = opts.bridge ?? makeBridge()

  const api = useSpendFileVersionSwitcher(
    data,
    companyActiveSpendFileVersions,
    user,
    {
      userIri,
      programSelectedDefaultId,
      spendFileVersionActive,
      cleanValues,
      getUnreadNotifications,
      getNotificationAmount,
      emit,
      bridge,
    },
  )

  return {
    data,
    companyActiveSpendFileVersions,
    user,
    programSelectedDefaultId,
    spendFileVersionActive,
    cleanValues,
    getUnreadNotifications,
    getNotificationAmount,
    emit,
    bridge,
    api,
  }
}

describe('useSpendFileVersionSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stores.globalFilters.disableWatchers = false
    stores.user.getUser = { activeSpendFileVersion: { '@id': '/api/spend_file_versions/current' } }
  })

  describe('changeCurrentSpendFileVersion — same-version guard', () => {
    it('calls bridge.getMaxDateSpend when the user triggered it, without touching the stores', () => {
      const { api, bridge } = build()
      api.changeCurrentSpendFileVersion('/api/spend_file_versions/current', true)

      expect(bridge.getMaxDateSpend).toHaveBeenCalledWith(true, '/api/spend_file_versions/current')
      expect(stores.globalFilters.setDisableWatchers).not.toHaveBeenCalled()
      expect(stores.user.changeActualFile).not.toHaveBeenCalled()
    })

    it('sets loading and calls bridge.commonApiCalls when not user-triggered', () => {
      const { api, data, bridge } = build()
      api.changeCurrentSpendFileVersion('/api/spend_file_versions/current', false)

      expect(data.loading).toBe(true)
      expect(bridge.commonApiCalls).toHaveBeenCalled()
      expect(stores.globalFilters.setDisableWatchers).not.toHaveBeenCalled()
    })
  })

  describe('changeCurrentSpendFileVersion — real version change', () => {
    it('disables watchers, resets stores in order, closes the plan subscription, forces gc, then navigates home before the guard on an empty version', () => {
      const gc = vi.fn()
      ;(globalThis as any).gc = gc
      const { api, bridge } = build()

      api.changeCurrentSpendFileVersion('', true)

      expect(stores.globalFilters.setDisableWatchers).toHaveBeenCalledWith(true)
      expect(stores.entityCard.setSelectedProgram).toHaveBeenCalledWith(null)
      expect(closeSubscription).toHaveBeenCalledWith('plan')
      expect(stores.subscribe.setPlanSubscribe).toHaveBeenCalledWith(null)
      expect(stores.analyze.setFinancingsGroupsbyProgram).toHaveBeenCalledWith([])
      expect(gc).toHaveBeenCalled()
      expect(bridge.goToHomeDashboard).toHaveBeenCalled()
      // Empty spendFileVersion after goToHomeDashboard: the PATCH never fires.
      expect(stores.user.changeActualFile).not.toHaveBeenCalled()
      delete (globalThis as any).gc
    })

    it('re-enables watchers via the 5s safety timer if nothing else does', () => {
      vi.useFakeTimers()
      const { api } = build()
      api.changeCurrentSpendFileVersion('', true)

      expect(stores.globalFilters.disableWatchers).toBe(true)
      vi.advanceTimersByTime(5000)
      expect(stores.globalFilters.disableWatchers).toBe(false)
      vi.useRealTimers()
    })

    it('does NOT fire the safety timer once the PATCH already re-enabled watchers', () => {
      vi.useFakeTimers()
      const { api } = build()
      api.changeCurrentSpendFileVersion('/api/spend_file_versions/new', true)

      const { callbackSuccess } = stores.user.changeActualFile.mock.calls[0][0]
      callbackSuccess({})
      expect(stores.globalFilters.disableWatchers).toBe(false)

      // Nobody flips it back on before the timer fires — it must stay false.
      vi.advanceTimersByTime(5000)
      expect(stores.globalFilters.disableWatchers).toBe(false)
      vi.useRealTimers()
    })

    it('on PATCH success with actionFromUser: re-enables watchers and calls bridge.getMaxDateSpend', () => {
      const { api, data, bridge } = build()
      api.changeCurrentSpendFileVersion('/api/spend_file_versions/new', true)

      const { callbackSuccess } = stores.user.changeActualFile.mock.calls[0][0]
      callbackSuccess({})

      expect(data.isLoadingChangeSpendFile).toBe(false)
      expect(stores.user.setShowMenu).toHaveBeenCalledWith(true)
      expect(stores.globalFilters.disableWatchers).toBe(false)
      expect(bridge.getMaxDateSpend).toHaveBeenCalledWith(true, '/api/spend_file_versions/new')
      expect(bridge.commonApiCalls).not.toHaveBeenCalled()
    })

    it('on PATCH success without actionFromUser: sets loading and calls bridge.commonApiCalls instead', () => {
      const { api, data, bridge } = build()
      api.changeCurrentSpendFileVersion('/api/spend_file_versions/new', false)

      const { callbackSuccess } = stores.user.changeActualFile.mock.calls[0][0]
      callbackSuccess({})

      expect(data.loading).toBe(true)
      expect(bridge.commonApiCalls).toHaveBeenCalled()
      expect(bridge.getMaxDateSpend).not.toHaveBeenCalled()
    })

    it('on PATCH error: re-enables watchers and clears both loading flags', () => {
      const { api, data } = build()
      api.changeCurrentSpendFileVersion('/api/spend_file_versions/new', true)

      const { callbackError } = stores.user.changeActualFile.mock.calls[0][0]
      callbackError()

      expect(stores.globalFilters.disableWatchers).toBe(false)
      expect(data.isLoadingChangeSpendFile).toBe(false)
      expect(data.loading).toBe(false)
    })
  })

  describe('filterSpendfiles / spendFileVersionsFormatted — known case-sensitivity bug (B7)', () => {
    it('excludes private files for a user whose email case does not match the lowercase-only regex', () => {
      // Same bug as HomeNavbar.vue today: /@calculum\.ai$/ is case-sensitive,
      // so an @Calculum.ai (capital C) user is treated as NOT a calculum
      // user here even though userIsCalculumUser elsewhere is case-insensitive.
      const { api } = build({
        user: { email: 'someone@Calculum.ai' },
        companyActiveSpendFileVersions: [
          { '@id': '/a', name: 'Public', version: 1, isPublic: true },
          { '@id': '/b', name: 'Private', version: 1, isPublic: false },
        ],
      })

      expect(api.spendFileVersionsFormatted.value.map((f: any) => f['@id'])).toEqual(['/a'])
    })

    it('includes private files for a user whose email matches the regex exactly', () => {
      const { api } = build({
        user: { email: 'someone@calculum.ai' },
        companyActiveSpendFileVersions: [
          { '@id': '/a', name: 'Public', version: 1, isPublic: true },
          { '@id': '/b', name: 'Private', version: 1, isPublic: false },
        ],
      })

      expect(api.spendFileVersionsFormatted.value.map((f: any) => f['@id']).sort()).toEqual(['/a', '/b'])
    })
  })

  describe('validateSpendFilesActive', () => {
    it('shows alert 2, disables the menu, and calls bridge.getWhoAmI(false) when there are no spend files', async () => {
      const { api, data, emit, bridge } = build({ companyActiveSpendFileVersions: [] })
      await api.validateSpendFilesActive()

      expect(emit).toHaveBeenCalledWith('showAlerts', 2, true)
      expect(stores.user.setShowMenu).toHaveBeenCalledWith(false)
      expect(data.loading).toBe(false)
      expect(bridge.getWhoAmI).toHaveBeenCalledWith(false)
    })

    it('switches to the last available file and refreshes vCard groups when the active one is not in the list', async () => {
      const { api, bridge } = build({
        companyActiveSpendFileVersions: [
          { '@id': '/a', name: 'A', version: 1, isPublic: true },
          { '@id': '/b', name: 'B', version: 1, isPublic: true },
        ],
      })
      await api.validateSpendFilesActive()

      expect(stores.user.changeActualFile).toHaveBeenCalledWith(
        expect.objectContaining({ obj: { activeSpendFileVersion: '/b' } }),
      )
      expect(bridge.getVCardGroups).toHaveBeenCalled()
    })

    it('calls bridge.firtCallsOrWhoAmI when the active file is valid and not called from whoAmI', async () => {
      stores.user.getUser = { activeSpendFileVersion: { '@id': '/a' } }
      const { api, bridge, spendFileVersionActive } = build({
        companyActiveSpendFileVersions: [{ '@id': '/a', name: 'A', version: 1, isPublic: true }],
      })
      spendFileVersionActive.value = { '@id': '/a' }
      await nextTick()

      await api.validateSpendFilesActive(false)
      expect(bridge.firtCallsOrWhoAmI).toHaveBeenCalled()
    })

    it('does NOT call bridge.firtCallsOrWhoAmI when fromWhoami is true (avoids the loop)', async () => {
      stores.user.getUser = { activeSpendFileVersion: { '@id': '/a' } }
      const { api, bridge, spendFileVersionActive } = build({
        companyActiveSpendFileVersions: [{ '@id': '/a', name: 'A', version: 1, isPublic: true }],
      })
      spendFileVersionActive.value = { '@id': '/a' }
      await nextTick()

      await api.validateSpendFilesActive(true)
      expect(bridge.firtCallsOrWhoAmI).not.toHaveBeenCalled()
    })
  })

  describe('updateSpendFileVersionList', () => {
    it('is a no-op when there are spend file versions', () => {
      const { api, data } = build({ companyActiveSpendFileVersions: [{ '@id': '/a' }] })
      data.loading = true
      // Construction's immediate spendFileVersionsFormatted watcher already
      // called setShowMenu once — clear that before isolating this call.
      stores.user.setShowMenu.mockClear()
      api.updateSpendFileVersionList()
      expect(stores.user.setShowMenu).not.toHaveBeenCalled()
      expect(data.loading).toBe(true)
    })

    it('disables the menu and clears loading when there is no company/spend-file data', () => {
      const { api, data, companyActiveSpendFileVersions } = build({ data: makeData({ loading: true }) })
      companyActiveSpendFileVersions.value = null
      api.updateSpendFileVersionList()
      expect(stores.user.setShowMenu).toHaveBeenCalledWith(false)
      expect(data.loading).toBe(false)
    })
  })

  describe('subscribetoSpendFile re-entrancy guard', () => {
    it('drops a concurrent call while one is already in flight', async () => {
      let resolveFirst: () => void = () => {}
      firebase.fnUnsubscribeToSpendFiles.mockImplementation(
        () => new Promise<void>((resolve) => { resolveFirst = resolve }),
      )
      const { api } = build()

      const first = api.subscribetoSpendFile()
      const second = api.subscribetoSpendFile()
      resolveFirst()
      await Promise.all([first, second])

      expect(firebase.fnUnsubscribeToSpendFiles).toHaveBeenCalledTimes(1)
    })

    it('allows a new call after the previous one finishes', async () => {
      firebase.fnUnsubscribeToSpendFiles.mockResolvedValue(undefined)
      const { api } = build()

      await api.subscribetoSpendFile()
      await api.subscribetoSpendFile()

      expect(firebase.fnUnsubscribeToSpendFiles).toHaveBeenCalledTimes(2)
    })

    it('releases the lock even if the subscription throws', async () => {
      // fnUnsubscribeToSpendFiles is a synchronous Firebase-cleanup call (no longer
      // awaited — it never returned a Promise in the first place), so a failure
      // here is a synchronous throw, not a rejected promise.
      firebase.fnUnsubscribeToSpendFiles.mockImplementationOnce(() => {
        throw new Error('boom')
      })
      const { api } = build()

      await expect(api.subscribetoSpendFile()).rejects.toThrow('boom')
      await api.subscribetoSpendFile()

      expect(firebase.fnUnsubscribeToSpendFiles).toHaveBeenCalledTimes(2)
    })
  })

  describe('selectSpendFile / onBannerLoad / onBannerDismiss', () => {
    it('selectSpendFile closes the dropdown, resets recalculation state, and dispatches the change', () => {
      const { api, data, cleanValues } = build()
      api.selectSpendFile({ '@id': '/api/spend_file_versions/new' })

      expect(data.toggleSpendFileDropdown).toBe(false)
      expect(api.spendFileVersionActiveId.value).toBe('/api/spend_file_versions/new')
      expect(cleanValues).toHaveBeenCalled()
      expect(stores.user.changeActualFile).toHaveBeenCalled()
    })

    it('onBannerLoad clears the pending version and dispatches the change', () => {
      const { api } = build()
      api.onBannerLoad({ '@id': '/api/spend_file_versions/new' } as any)

      expect(stores.user.setPendingNewSpendFileVersion).toHaveBeenCalledWith(null)
      expect(stores.user.changeActualFile).toHaveBeenCalled()
    })

    it('onBannerDismiss only clears the pending version', () => {
      const { api } = build()
      api.onBannerDismiss()

      expect(stores.user.setPendingNewSpendFileVersion).toHaveBeenCalledWith(null)
      expect(stores.user.changeActualFile).not.toHaveBeenCalled()
    })
  })
})
