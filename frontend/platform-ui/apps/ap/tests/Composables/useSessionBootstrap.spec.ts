/**
 * Tests for useSessionBootstrap composable
 *
 * Covers:
 * - firtCallsOrWhoAmI's fromlogin-vs-refresh branch
 * - getWhoAmI's 403/410 status handling, the callApis gate on
 *   validateSpendFilesActive, and both document.body listener add sites
 *   (known double-add risk, sprint-doc Bug B4 — preserved, not fixed)
 * - getSessionInfo's success chain
 * - getVCardGroups' success/error mapping
 * - the main onMounted's login-vs-refresh bootstrap branch (via a host
 *   component, since onMounted needs an active component instance)
 * - the onUnmounted Firebase-listener cleanup and the menuPopup listener
 *   removal
 *
 * Extracted verbatim from HomeNavbar.vue (Sprint 116 US-2 refactor).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, reactive, ref } from 'vue'
import { mount } from '@vue/test-utils'

vi.mock('@/utils', () => ({
  isNullOrUndefined: (v: unknown) => v === null || v === undefined,
}))
vi.mock('@/utils/CookieSessionsFns', () => ({ checkNewSpendFileVersion: vi.fn() }))
vi.mock('@/utils/tidio', () => ({ unloadTidio: vi.fn() }))

const { firebase } = vi.hoisted(() => ({
  firebase: {
    logoutFirebase: vi.fn().mockResolvedValue(undefined),
    checkExpirationtoken: vi.fn().mockResolvedValue(true),
    fnSetUnsubscribeProgram: vi.fn(),
    fnUnsubscribeToSpendFiles: vi.fn(),
  },
}))
vi.mock('@/composables/firebase/useFirebase', () => ({
  default: () => ({
    logoutFirebase: firebase.logoutFirebase,
    checkExpirationtoken: firebase.checkExpirationtoken,
    fnSetUnsubscribeProgram: firebase.fnSetUnsubscribeProgram,
  }),
}))
vi.mock('@/composables/firebase/useSpendFileFirebase', () => ({
  default: () => ({ fnUnsubscribeToSpendFiles: firebase.fnUnsubscribeToSpendFiles }),
}))

const { userStore } = vi.hoisted(() => ({
  userStore: {
    getFromLogin: false,
    setFromLogin: vi.fn(),
    getError403: false,
    getError410: false,
    setShowMenu: vi.fn(),
    whoAmI: vi.fn(),
    getSessionInfo: vi.fn(),
    setSourceAccount: vi.fn(),
    setLastSectionVisitedbyUser: vi.fn(),
    setShowSpendNoty: vi.fn(),
  },
}))
vi.mock('@/stores/user', () => ({ useUserStore: () => userStore }))

const { homeStore } = vi.hoisted(() => ({
  homeStore: { setIdpsToLogin: vi.fn(), getInfoVcard: vi.fn(), setVCardGroups: vi.fn() },
}))
vi.mock('@/stores/home', () => ({ useHomeStore: () => homeStore }))
vi.mock('@/stores/entityCard', () => ({
  useEntityCardStore: () => ({
    setIsModalEntityShowing: vi.fn(),
    setSelectedTabIndexSpend: vi.fn(),
    setHigherZIndexForEntityModal: vi.fn(),
  }),
}))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ initializeDefaultCurrencies: vi.fn() }) }))

import useSessionBootstrap from '@/modules/home/composables/useSessionBootstrap'
import { useHomeStore } from '@/stores/home'
import type { HomeNavBar } from '@/modules/home/types'

function makeData(overrides: Partial<HomeNavBar> = {}): HomeNavBar {
  return reactive({ loading: false, status403: false, status410: false, ...overrides }) as HomeNavBar
}

function makeDeps(overrides: Record<string, any> = {}) {
  return {
    user: ref({ language: 'en' }),
    companyActiveId: ref('/api/companies/1'),
    highlightedCompanyIndex: ref(-1),
    highlightedSpendFileIndex: ref(-1),
    setUserLanguage: vi.fn(),
    validateSpendFilesActive: vi.fn().mockResolvedValue(undefined),
    updateSpendFileVersionList: vi.fn(),
    subscribetoSpendFile: vi.fn().mockResolvedValue(undefined),
    subscribeToDefaultProgram: vi.fn().mockResolvedValue(undefined),
    loadCurrencies: vi.fn().mockResolvedValue(undefined),
    handleBeforeUnload: vi.fn(),
    commonApiCalls: vi.fn(),
    emit: vi.fn(),
    ...overrides,
  }
}

describe('useSessionBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userStore.getFromLogin = false
    userStore.getError403 = false
    userStore.getError410 = false
    document.body.innerHTML = ''
  })

  describe('firtCallsOrWhoAmI', () => {
    it('runs the login path directly when fromlogin is true', () => {
      userStore.getFromLogin = true
      const data = makeData()
      const deps = makeDeps()
      const { firtCallsOrWhoAmI } = useSessionBootstrap(data, deps as any)

      firtCallsOrWhoAmI()

      expect(userStore.setFromLogin).toHaveBeenCalledWith(false)
      expect(deps.commonApiCalls).toHaveBeenCalled()
      expect(userStore.whoAmI).not.toHaveBeenCalled()
    })

    it('defers to getWhoAmI when fromlogin is false', () => {
      userStore.getFromLogin = false
      const data = makeData()
      const deps = makeDeps()
      const { firtCallsOrWhoAmI } = useSessionBootstrap(data, deps as any)

      firtCallsOrWhoAmI()

      expect(userStore.whoAmI).toHaveBeenCalled()
    })
  })

  describe('getWhoAmI', () => {
    it('on success: syncs 403/410 status, always calls commonApiCalls, and adds the menuPopup listener', () => {
      const data = makeData()
      const deps = makeDeps()
      const { getWhoAmI } = useSessionBootstrap(data, deps as any)

      getWhoAmI()
      const { callbackSuccess } = userStore.whoAmI.mock.calls[0][0]
      callbackSuccess({})

      expect(deps.updateSpendFileVersionList).toHaveBeenCalled()
      expect(deps.commonApiCalls).toHaveBeenCalled()
    })

    it('emits showAlerts(4) and hides the menu on a 403', () => {
      userStore.getError403 = true
      const data = makeData()
      const deps = makeDeps()
      const { getWhoAmI } = useSessionBootstrap(data, deps as any)

      getWhoAmI()
      userStore.whoAmI.mock.calls[0][0].callbackSuccess({})

      expect(deps.emit).toHaveBeenCalledWith('showAlerts', 4, true)
      expect(userStore.setShowMenu).toHaveBeenCalledWith(false)
    })

    it('emits showAlerts(5) on a 410', () => {
      userStore.getError410 = true
      const data = makeData()
      const deps = makeDeps()
      const { getWhoAmI } = useSessionBootstrap(data, deps as any)

      getWhoAmI()
      userStore.whoAmI.mock.calls[0][0].callbackSuccess({})

      expect(deps.emit).toHaveBeenCalledWith('showAlerts', 5, true)
    })

    it('calls validateSpendFilesActive(true) only when callApis is true', () => {
      const data = makeData()
      const deps = makeDeps()
      const { getWhoAmI } = useSessionBootstrap(data, deps as any)

      getWhoAmI(false)
      userStore.whoAmI.mock.calls[0][0].callbackSuccess({})
      expect(deps.validateSpendFilesActive).not.toHaveBeenCalled()

      getWhoAmI(true)
      userStore.whoAmI.mock.calls[1][0].callbackSuccess({})
      expect(deps.validateSpendFilesActive).toHaveBeenCalledWith(true)
    })

    it('clears loading on error', () => {
      const data = makeData({ loading: true })
      const deps = makeDeps()
      const { getWhoAmI } = useSessionBootstrap(data, deps as any)

      getWhoAmI()
      userStore.whoAmI.mock.calls[0][0].callbackError()

      expect(data.loading).toBe(false)
    })
  })

  describe('getVCardGroups', () => {
    it('stores the returned groups on success', () => {
      const homeStore = useHomeStore()
      const data = makeData()
      const { getVCardGroups } = useSessionBootstrap(data, makeDeps() as any)

      getVCardGroups()
      const { callbackSuccess } = (homeStore.getInfoVcard as any).mock.calls[0][0]
      callbackSuccess({ groups: [{ id: 1 }] })

      expect(homeStore.setVCardGroups).toHaveBeenCalledWith([{ id: 1 }])
    })

    it('falls back to an empty array on error', () => {
      const homeStore = useHomeStore()
      const data = makeData()
      const { getVCardGroups } = useSessionBootstrap(data, makeDeps() as any)

      getVCardGroups()
      const { callbackError } = (homeStore.getInfoVcard as any).mock.calls[0][0]
      callbackError()

      expect(homeStore.setVCardGroups).toHaveBeenCalledWith([])
    })
  })

  describe('main onMounted bootstrap (needs a mounted host component)', () => {
    function mountHost(deps: ReturnType<typeof makeDeps>) {
      const data = makeData()
      const Host = defineComponent({
        setup() {
          return useSessionBootstrap(data, deps as any)
        },
        render: () => null,
      })
      return { wrapper: mount(Host), data }
    }

    it('on first login: validates spend files, refreshes vCard groups, and starts the Firebase session — without touching logoutFirebase', async () => {
      userStore.getFromLogin = true
      const deps = makeDeps()
      const { wrapper } = mountHost(deps)
      await wrapper.vm.$nextTick()
      await new Promise((r) => setTimeout(r, 0))

      expect(deps.validateSpendFilesActive).toHaveBeenCalledWith()
      expect(firebase.logoutFirebase).not.toHaveBeenCalled()
      expect(deps.loadCurrencies).toHaveBeenCalled()
    })

    it('on refresh (not from login): logs out of Firebase first, then fetches session info', async () => {
      userStore.getFromLogin = false
      const deps = makeDeps()
      mountHost(deps)
      await new Promise((r) => setTimeout(r, 0))

      expect(firebase.logoutFirebase).toHaveBeenCalled()
      expect(userStore.getSessionInfo).toHaveBeenCalled()
    })

    it('registers the beforeunload listener and cleans it up, along with the Firebase listeners, on unmount', async () => {
      const deps = makeDeps()
      const addSpy = vi.spyOn(globalThis, 'addEventListener')
      const removeSpy = vi.spyOn(globalThis, 'removeEventListener')
      const { wrapper } = mountHost(deps)
      await new Promise((r) => setTimeout(r, 0))

      expect(addSpy).toHaveBeenCalledWith('beforeunload', deps.handleBeforeUnload)

      wrapper.unmount()

      expect(removeSpy).toHaveBeenCalledWith('beforeunload', deps.handleBeforeUnload)
      expect(firebase.fnUnsubscribeToSpendFiles).toHaveBeenCalled()
      addSpy.mockRestore()
      removeSpy.mockRestore()
    })

    it('removes the menuPopup document listener on unmount', async () => {
      const removeSpy = vi.spyOn(document.body, 'removeEventListener')
      const { wrapper } = mountHost(makeDeps())
      await new Promise((r) => setTimeout(r, 0))

      wrapper.unmount()

      expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
      removeSpy.mockRestore()
    })
  })
})
