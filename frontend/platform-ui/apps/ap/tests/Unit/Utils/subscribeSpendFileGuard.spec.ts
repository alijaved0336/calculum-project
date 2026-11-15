/**
 * Regression anchor for the two guards that prevent duplicate Firebase
 * subscriptions and duplicate spend-file-change API calls on recalculation.
 *
 * Both guards now live in their own composables and are imported here for
 * real — this file used to mirror them as local pure functions "to avoid
 * mounting the full component" (see git history), which is no longer
 * necessary now that each guard has its own composable with no Vue
 * component attached. The exhaustive case-by-case coverage lives in:
 *  - subscribetoSpendFile concurrency guard →
 *    tests/Composables/useSpendFileVersionSwitcher.spec.ts
 *  - "ready" recalculation guard (isLoadingChangeSpendFile check) →
 *    tests/Composables/useRecalculationStatus.spec.ts
 * This file just re-confirms both from the angle the old mirror spec's
 * name promised, importing the real functions instead of copies.
 *
 * The old mirror also asserted on a `getAuthFirestoreUser` precondition
 * that no longer exists: the store's authFirestoreUser stopped being a
 * factor in subscribetoSpendFile once the composables started
 * establishing their own Firebase session (WI#19104) — dropped here, not
 * carried forward as a stale case.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, ref } from 'vue'

vi.mock('@/utils', () => ({
  isNullOrUndefined: (v: unknown) => v === null || v === undefined,
  removeIRI: (iri: string | null | undefined) => (iri ? iri.split('/').pop() ?? '' : ''),
  ArrayUtils: {
    isEmpty: (arr: any[] | null | undefined) => !arr || arr.length === 0,
    sortAscBy: (arr: any[]) => arr,
  },
  StringUtils: { isEmpty: (v: string | null | undefined) => !v },
}))
vi.mock('@/utils/CookieSessionsFns', () => ({ checkNewSpendFileVersion: vi.fn() }))
vi.mock('@/utils/memoryMonitor', () => ({ memoryMonitor: { getMemoryStats: vi.fn(() => null) } }))
vi.mock('vue-toastification', () => ({ useToast: () => ({ error: vi.fn() }) }))
vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})

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
vi.mock('@/composables/firebase/firebaseSession', () => ({
  closeSubscription: vi.fn(),
  SUBSCRIPTION_KEYS: { plan: 'plan' },
}))
vi.mock('@/stores/globalFilters', () => ({
  useGlobalFiltersStore: () => ({ setDisableWatchers: vi.fn(), getDisableWatchers: false }),
}))
vi.mock('@/stores/entityCard', () => ({ useEntityCardStore: () => ({ setSelectedProgram: vi.fn() }) }))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    getUser: {},
    setError403: vi.fn(),
    setError410: vi.fn(),
    setShowSpendNoty: vi.fn(),
    setShowMenu: vi.fn(),
    setPendingNewSpendFileVersion: vi.fn(),
    setActualUser: vi.fn(),
    changeActualFile: vi.fn(),
  }),
}))
vi.mock('@/stores/compare', () => ({ useCompareStore: () => ({ setAddededCompanies: vi.fn() }) }))
vi.mock('@/stores/plan', () => ({ usePlanStore: () => ({ setDefaultPlan: vi.fn() }) }))
vi.mock('@/stores/analyze', () => ({
  useAnalyzeStore: () => ({
    setFinancingsGroupsbyProgram: vi.fn(),
    setHarmonizationsGroupsbyProgram: vi.fn(),
    setHasFinancing: vi.fn(),
    setHasHarmonization: vi.fn(),
    setGroups: vi.fn(),
    setFinancing: vi.fn(),
  }),
}))
// A real `reactive()` singleton (not a plain object, and not one recreated
// per call) so useRecalculationStatus's `watch()` on subscribeStore.* genuinely
// reacts to mutations — vi.mock factories are hoisted above every import
// (including `vue`), so the singleton is built after imports resolve and the
// mock reads it through a slot instead of closing over it directly.
vi.mock('@/stores/subscribe', () => ({
  useSubscribeStore: () => (globalThis as any).__mockSubscribeStore,
}))

import useSpendFileVersionSwitcher from '@/modules/home/composables/useSpendFileVersionSwitcher'
import useRecalculationStatus from '@/modules/home/composables/useRecalculationStatus'
import { useSubscribeStore } from '@/stores/subscribe'
import type { HomeNavBar } from '@/modules/home/types'

const subscribeStoreSingleton = reactive({
  refreshPrograms: '',
  setRefeshPlans: '',
  setRefeshSpendFiles: '' as any,
  refresh9boxes: '',
  getSpendFileProgress: null,
  getSpendFileProgressRemain: null,
  setAllowActionsInModules: vi.fn(),
})
;(globalThis as any).__mockSubscribeStore = subscribeStoreSingleton

describe('subscribetoSpendFile concurrency guard (real useSpendFileVersionSwitcher)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function build() {
    const data = reactive({ loading: false, isLoadingChangeSpendFile: false, companyList: [] }) as unknown as HomeNavBar
    return useSpendFileVersionSwitcher(
      data,
      ref([]),
      ref({ email: 'user@calculum.ai' }),
      {
        userIri: ref('/api/users/1'),
        programSelectedDefaultId: ref(''),
        spendFileVersionActive: ref(null),
        cleanValues: vi.fn(),
        getUnreadNotifications: vi.fn(),
        getNotificationAmount: vi.fn(),
        emit: vi.fn(),
        bridge: {},
      },
    )
  }

  it('drops a concurrent call while the first is still in-flight', async () => {
    let resolveFirst!: () => void
    firebase.fnUnsubscribeToSpendFiles.mockImplementation(
      () => new Promise<void>((resolve) => { resolveFirst = resolve }),
    )
    firebase.subscribeToSpendFiles.mockResolvedValue(undefined)
    const { subscribetoSpendFile } = build()

    const first = subscribetoSpendFile()
    const second = subscribetoSpendFile()
    resolveFirst()
    await Promise.all([first, second])

    expect(firebase.subscribeToSpendFiles).toHaveBeenCalledTimes(1)
  })

  it('allows a second call once the first has completed', async () => {
    firebase.fnUnsubscribeToSpendFiles.mockResolvedValue(undefined)
    firebase.subscribeToSpendFiles.mockResolvedValue(undefined)
    const { subscribetoSpendFile } = build()

    await subscribetoSpendFile()
    await subscribetoSpendFile()

    expect(firebase.subscribeToSpendFiles).toHaveBeenCalledTimes(2)
  })

  it('releases the lock even when subscribeToSpendFiles throws', async () => {
    firebase.fnUnsubscribeToSpendFiles.mockResolvedValue(undefined)
    firebase.subscribeToSpendFiles.mockRejectedValueOnce(new Error('firebase error')).mockResolvedValue(undefined)
    const { subscribetoSpendFile } = build()

    await subscribetoSpendFile().catch(() => {})
    await subscribetoSpendFile()

    expect(firebase.subscribeToSpendFiles).toHaveBeenCalledTimes(2)
  })
})

describe('"ready" recalculation guard — isLoadingChangeSpendFile (real useRecalculationStatus)', () => {
  const subscribeStore = useSubscribeStore()

  beforeEach(() => {
    // Each test needs setRefeshSpendFiles to actually *change* to 'ready' for
    // the watcher to fire — reset it first so a prior test's leftover value
    // doesn't make the assignment below a no-op.
    subscribeStore.setRefeshSpendFiles = ''
  })

  it('calls bridge.selectSpendFile when not loading and the URL has no exclusions', async () => {
    const selectSpendFile = vi.fn()
    useRecalculationStatus(
      () => '/api/companies/1',
      () => false,
      () => ({ '@id': '/api/spend_file_versions/1' }),
      { selectSpendFile },
    )

    subscribeStore.setRefeshSpendFiles = 'ready'
    await Promise.resolve()
    await Promise.resolve()

    expect(selectSpendFile).toHaveBeenCalledTimes(1)
  })

  it('skips bridge.selectSpendFile while a spend-file change is already loading', async () => {
    const selectSpendFile = vi.fn()
    useRecalculationStatus(
      () => '/api/companies/1',
      () => true,
      () => ({ '@id': '/api/spend_file_versions/1' }),
      { selectSpendFile },
    )

    subscribeStore.setRefeshSpendFiles = 'ready'
    await Promise.resolve()
    await Promise.resolve()

    expect(selectSpendFile).not.toHaveBeenCalled()
  })
})
