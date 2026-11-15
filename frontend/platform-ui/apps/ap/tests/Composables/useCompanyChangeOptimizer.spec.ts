import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/stores/entityCard', () => ({ useEntityCardStore: vi.fn() }))
vi.mock('@/stores/globalFilters', () => ({ useGlobalFiltersStore: vi.fn() }))
vi.mock('@/stores/user', () => ({ useUserStore: vi.fn() }))
vi.mock('@/stores/subscribe', () => ({ useSubscribeStore: vi.fn() }))
vi.mock('@/stores/compare', () => ({ useCompareStore: vi.fn() }))
vi.mock('@/stores/home', () => ({ useHomeStore: vi.fn() }))
vi.mock('@/stores/plan', () => ({ usePlanStore: vi.fn() }))
vi.mock('@/stores/analyze', () => ({ useAnalyzeStore: vi.fn() }))
vi.mock('@/utils/memoryMonitor', () => ({ memoryMonitor: { getMemoryStats: vi.fn(() => null) } }))
vi.mock('@/composables/useListenersCleanup', () => ({
  useListenersCleanup: vi.fn(() => ({
    cleanupForCompanyChange: vi.fn(() => 0),
    cleanupAllListeners: vi.fn(),
    getCleanupInfo: vi.fn(),
    checkActiveListeners: vi.fn(() => ({})),
  })),
}))
vi.mock('@/composables/firebase/useFirebase', () => ({
  default: vi.fn(() => ({ fnSetUnsubscribeProgram: vi.fn() })),
}))
// Mocking useFirebase is not enough: the composable also pulls in
// firebase/firebaseSession, which imports `config`, and that module calls
// getAuth() at load time. Stub the leaf so no import path can reach it.
vi.mock('@/composables/firebase/config', () => ({
  auth: {},
  firestore: {},
  storage: {},
  appFirebase: {},
}))

import { useEntityCardStore } from '@/stores/entityCard'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useUserStore } from '@/stores/user'
import { useSubscribeStore } from '@/stores/subscribe'
import { useCompareStore } from '@/stores/compare'
import { useHomeStore } from '@/stores/home'
import { usePlanStore } from '@/stores/plan'
import { useAnalyzeStore } from '@/stores/analyze'
import { useCompanyChangeOptimizer } from '@/composables/useCompanyChangeOptimizer'

// ─── Store factory helpers ───────────────────────────────────────────────────

function makeGlobalFiltersStore() {
  const state = { disableWatchers: false }
  return {
    setDisableWatchers: vi.fn((value: boolean) => {
      state.disableWatchers = value
    }),
    get getDisableWatchers() {
      return state.disableWatchers
    },
    setFiltersApplied: vi.fn(),
    setValuesByColumn: vi.fn(),
  }
}

describe('useCompanyChangeOptimizer', () => {
  let globalFiltersStore: ReturnType<typeof makeGlobalFiltersStore>

  beforeEach(() => {
    vi.useFakeTimers()

    globalFiltersStore = makeGlobalFiltersStore()
    vi.mocked(useGlobalFiltersStore).mockReturnValue(globalFiltersStore as any)
    vi.mocked(useEntityCardStore).mockReturnValue({
      setSelectedProgram: vi.fn(),
      setAppliedFilter: vi.fn(),
    } as any)
    vi.mocked(useUserStore).mockReturnValue({ setBatchUpdate: vi.fn() } as any)
    vi.mocked(useSubscribeStore).mockReturnValue({
      setLastStatusDate: vi.fn(),
      setLastStatusPlanSubscribe: vi.fn(),
      setPlanSubscribe: vi.fn(),
      setSupplierStandardClusterStatus: vi.fn(),
      setLastStatusSpendFileSubscribe: vi.fn(),
      setAllowActionsInModules: vi.fn(),
      setSetRefeshSpendFiles: vi.fn(),
    } as any)
    vi.mocked(useCompareStore).mockReturnValue({ setAddededCompanies: vi.fn() } as any)
    vi.mocked(useHomeStore).mockReturnValue({} as any)
    vi.mocked(usePlanStore).mockReturnValue({ setDefaultPlan: vi.fn() } as any)
    vi.mocked(useAnalyzeStore).mockReturnValue({
      setFinancingsGroupsbyProgram: vi.fn(),
      setHarmonizationsGroupsbyProgram: vi.fn(),
      setHasFinancing: vi.fn(),
      setHasHarmonization: vi.fn(),
      setGroups: vi.fn(),
      setFinancing: vi.fn(),
    } as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('cleanupBeforeCompanyChange disables watchers', () => {
    const { cleanupBeforeCompanyChange } = useCompanyChangeOptimizer()
    cleanupBeforeCompanyChange()
    expect(globalFiltersStore.getDisableWatchers).toBe(true)
  })

  it('cleanupAfterCompanyChange re-enables watchers', () => {
    const { cleanupBeforeCompanyChange, cleanupAfterCompanyChange } = useCompanyChangeOptimizer()
    cleanupBeforeCompanyChange()
    cleanupAfterCompanyChange()
    expect(globalFiltersStore.getDisableWatchers).toBe(false)
  })

  // ─── AC-10: 5-second safety timeout ─────────────────────────────────────

  it('does not clear the guard before 5 seconds have elapsed', () => {
    const { cleanupBeforeCompanyChange } = useCompanyChangeOptimizer()
    cleanupBeforeCompanyChange()

    vi.advanceTimersByTime(4999)

    expect(globalFiltersStore.getDisableWatchers).toBe(true)
  })

  it('auto-clears the guard after 5 seconds if cleanupAfterCompanyChange never runs', () => {
    const { cleanupBeforeCompanyChange } = useCompanyChangeOptimizer()
    cleanupBeforeCompanyChange()

    vi.advanceTimersByTime(5000)

    expect(globalFiltersStore.getDisableWatchers).toBe(false)
  })

  it('does not redundantly force the guard when cleanupAfterCompanyChange already ran', () => {
    const { cleanupBeforeCompanyChange, cleanupAfterCompanyChange } = useCompanyChangeOptimizer()
    cleanupBeforeCompanyChange()
    cleanupAfterCompanyChange()

    const callsBeforeTimeout = globalFiltersStore.setDisableWatchers.mock.calls.length
    vi.advanceTimersByTime(5000)

    expect(globalFiltersStore.setDisableWatchers.mock.calls.length).toBe(callsBeforeTimeout)
    expect(globalFiltersStore.getDisableWatchers).toBe(false)
  })
})
