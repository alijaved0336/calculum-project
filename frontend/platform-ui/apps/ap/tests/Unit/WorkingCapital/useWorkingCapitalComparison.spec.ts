import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { WCVersion } from '@/modules/home/workingCapital/types'

// ─── Module mocks ───────────────────────────────────────────────────────────
const { toastErrorSpy, fetchWorkingCapitalVersions, fetchWorkingCapitalComparison } = vi.hoisted(() => ({
  toastErrorSpy: vi.fn(),
  fetchWorkingCapitalVersions: vi.fn(),
  fetchWorkingCapitalComparison: vi.fn(),
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})
vi.mock('vue-toastification', () => ({
  useToast: () => ({ error: toastErrorSpy, info: vi.fn(), success: vi.fn(), warning: vi.fn(), dismiss: vi.fn() }),
}))
// A lightweight mock store, NOT the real module (which drags in a heavy, app-bootstrap-only
// dependency chain that isn't safe to load standalone in a unit test). It uses a genuine
// Vue ref internally — not a plain object — so the recovery watcher
// (watch(() => store.getDisableWatchers, ...)) can actually track and react to changes;
// a plain mocked getter/property wouldn't participate in Vue's reactivity at all.
vi.mock('@/stores/globalFilters', () => {
  const disableWatchers = ref(false)
  return {
    useGlobalFiltersStore: () => ({
      get getDisableWatchers() { return disableWatchers.value },
      setDisableWatchers(value: boolean) { disableWatchers.value = value },
    }),
  }
})
vi.mock('@/stores/workingCapital', () => ({
  useWorkingCapitalStore: () => ({ getMinDays: vi.fn(() => undefined), setMinDays: vi.fn() }),
}))
vi.mock('@/composables/useSpendFile', () => ({
  // Story 4 fix: toVersion is now built directly from spendFileVersionActive
  // (not looked up inside readyVersions, which the real backend deliberately
  // excludes it from) — this mirrors ACTIVE's identity/finalDate below so
  // existing test expectations keep holding.
  default: () => ({
    spendFileVersionActiveId: { value: 'uuid-active' },
    spendFileVersionActive: { value: { name: 'Acme', version: 2, initialDate: '2024-01-01', finalDate: '2025-06-30' } },
  }),
}))
vi.mock('@/modules/home/workingCapital/api', () => ({ fetchWorkingCapitalVersions, fetchWorkingCapitalComparison }))

import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useWorkingCapitalComparison } from '@/modules/home/workingCapital/composables/useWorkingCapitalComparison'

// ─── Helpers ────────────────────────────────────────────────────────────────

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve() }

function version(overrides: Partial<WCVersion>): WCVersion {
  return { uuid: 'uuid', version: 1, name: 'File', initialDate: '2024-01-01', finalDate: '2024-12-31', year: '2024', ...overrides }
}

const ACTIVE = version({ uuid: 'uuid-active', version: 2, name: 'Acme', finalDate: '2025-06-30' })

// Tracks every wrapper mounted via mountComposable() so afterEach can unmount them all —
// otherwise a component's watch()/computed() subscriptions (e.g. the recovery watcher on
// the mocked globalFilters store's shared ref) outlive their test and fire again when a
// later test mutates that same shared ref.
let activeWrappers: ReturnType<typeof mount>[] = []

function mountComposable() {
  let result: ReturnType<typeof useWorkingCapitalComparison>
  const wrapper = mount(defineComponent({
    setup() {
      result = useWorkingCapitalComparison()
      return () => h('div')
    },
  }))
  activeWrappers.push(wrapper)
  return { wrapper, get result() { return result } }
}

afterEach(() => {
  activeWrappers.forEach(w => w.unmount())
  activeWrappers = []
})

function compareSuccessResponse(overrides: Record<string, any> = {}) {
  return {
    success: true,
    data: {
      baseVersion: ACTIVE,
      latestVersion: ACTIVE,
      minDays: 5,
      currency: 'USD',
      summary: {},
      supplierCoverage: {},
      wapt: {},
      cashFlowByCountry: [],
      paymentTermsByCountry: [],
      topSuppliers: [],
      topSuppliersTotal: 0,
      ...overrides,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useGlobalFiltersStore().setDisableWatchers(false)
  fetchWorkingCapitalVersions.mockResolvedValue({ success: true, data: { versions: [], minDays: 5 } })
  fetchWorkingCapitalComparison.mockResolvedValue(compareSuccessResponse())
})

describe('useWorkingCapitalComparison — fromVersionOptions (cross-file eligibility)', () => {
  it('excludes the active version itself', async () => {
    fetchWorkingCapitalVersions.mockResolvedValue({ success: true, data: { versions: [ACTIVE], minDays: 5 } })
    const { result } = mountComposable()
    await flush()
    expect(result.fromVersionOptions.value.find(v => v.uuid === ACTIVE.uuid)).toBeUndefined()
  })

  it('includes a candidate from a different named file whose finalDate predates the active file, even with a higher version number', async () => {
    const olderDifferentFile = version({ uuid: 'uuid-beta', version: 9, name: 'Beta', finalDate: '2023-01-01' })
    fetchWorkingCapitalVersions.mockResolvedValue({ success: true, data: { versions: [ACTIVE, olderDifferentFile], minDays: 5 } })
    const { result } = mountComposable()
    await flush()
    expect(result.fromVersionOptions.value.map(v => v.uuid)).toContain('uuid-beta')
  })

  it('excludes any candidate whose finalDate is on/after the active file finalDate', async () => {
    const laterFile = version({ uuid: 'uuid-later', version: 1, name: 'Gamma', finalDate: '2025-12-31' })
    const sameDateFile = version({ uuid: 'uuid-same', version: 1, name: 'Delta', finalDate: ACTIVE.finalDate })
    fetchWorkingCapitalVersions.mockResolvedValue({
      success: true,
      data: { versions: [ACTIVE, laterFile, sameDateFile], minDays: 5 },
    })
    const { result } = mountComposable()
    await flush()
    const uuids = result.fromVersionOptions.value.map(v => v.uuid)
    expect(uuids).not.toContain('uuid-later')
    expect(uuids).not.toContain('uuid-same')
  })
})

describe('useWorkingCapitalComparison — toVersion resolution (Story 4 fix)', () => {
  it('resolves toVersion from spendFileVersionActive even when readyVersions has no matching entry (the real backend contract)', async () => {
    // The real backend never includes the active version in /versions — this is
    // the realistic case, unlike other tests in this file that (harmlessly) still
    // include an 'uuid-active' entry to exercise the defensive uuid-mismatch guard.
    const otherFile = version({ uuid: 'uuid-other', version: 1, name: 'Other', finalDate: '2023-01-01' })
    fetchWorkingCapitalVersions.mockResolvedValue({ success: true, data: { versions: [otherFile], minDays: 5 } })
    const { result } = mountComposable()
    await flush()

    expect(result.toVersion.value?.uuid).toBe('uuid-active')
    expect(result.toVersion.value?.name).toBe('Acme')
    expect(result.toVersion.value?.finalDate).toBe('2025-06-30')
  })

  it('includes a candidate the old readyVersions[0]-fallback bug would have wrongly excluded (live repro regression)', async () => {
    // Simulates the reported bug: readyVersions[0] happens to be some unrelated,
    // earlier-dated file. The old code would have picked THIS as "toVersion",
    // wrongly excluding any candidate dated between it and the real active date.
    const wrongFallbackCandidate = version({ uuid: 'uuid-wrong-fallback', version: 1, name: 'Unrelated', finalDate: '2023-02-01' })
    const shouldBeIncluded = version({ uuid: 'uuid-should-include', version: 1, name: 'ShouldShow', finalDate: '2024-06-01' })
    fetchWorkingCapitalVersions.mockResolvedValue({
      success: true,
      data: { versions: [wrongFallbackCandidate, shouldBeIncluded], minDays: 5 },
    })
    const { result } = mountComposable()
    await flush()

    // Real active finalDate (2025-06-30) is after both candidates, so both are
    // legitimate "from" options — the bug would have excluded `shouldBeIncluded`
    // (2024-06-01 is not before the wrongly-resolved 2023-02-01).
    const uuids = result.fromVersionOptions.value.map(v => v.uuid)
    expect(uuids).toContain('uuid-wrong-fallback')
    expect(uuids).toContain('uuid-should-include')
  })
})

describe('useWorkingCapitalComparison — later-end-date rejection handling', () => {
  it('reverts fromVersion and shows a toast when the backend rejects a later-end-date selection', async () => {
    const olderFile = version({ uuid: 'uuid-older', version: 1, name: 'Beta', finalDate: '2023-01-01' })
    const anotherOlderFile = version({ uuid: 'uuid-older-2', version: 1, name: 'Gamma', finalDate: '2022-01-01' })
    fetchWorkingCapitalVersions.mockResolvedValue({
      success: true,
      data: { versions: [ACTIVE, olderFile, anotherOlderFile], minDays: 5 },
    })
    fetchWorkingCapitalComparison.mockResolvedValueOnce(compareSuccessResponse())
    const { result } = mountComposable()
    await flush()

    const initialSelection = result.fromVersion.value
    expect(initialSelection?.uuid).toBe('uuid-older')

    // Real backend shape (per Backend's handoff): `error` IS the user-facing
    // message itself, not a stable code — there's no separate `message` field.
    const backendMessage = 'The comparison base must end before the active spend file version. Pick a file or version with an earlier end date.'
    fetchWorkingCapitalComparison.mockResolvedValueOnce({
      success: false,
      data: { error: backendMessage },
    })
    result.selectFromVersion(anotherOlderFile)
    await flush()

    expect(toastErrorSpy).toHaveBeenCalledWith(backendMessage)
    expect(result.fromVersion.value?.uuid).toBe(initialSelection?.uuid)
  })

  it('keeps the new selection (no revert, no toast) when the backend accepts it', async () => {
    const olderFile = version({ uuid: 'uuid-older', version: 1, name: 'Beta', finalDate: '2023-01-01' })
    const anotherOlderFile = version({ uuid: 'uuid-older-2', version: 1, name: 'Gamma', finalDate: '2022-01-01' })
    fetchWorkingCapitalVersions.mockResolvedValue({
      success: true,
      data: { versions: [ACTIVE, olderFile, anotherOlderFile], minDays: 5 },
    })
    const { result } = mountComposable()
    await flush()

    result.selectFromVersion(anotherOlderFile)
    await flush()

    expect(toastErrorSpy).not.toHaveBeenCalled()
    expect(result.fromVersion.value?.uuid).toBe('uuid-older-2')
    expect(result.hasError.value).toBe(false)
  })

  it('flags the inline error state without a toast on a generic (non-rejection) failure', async () => {
    const olderFile = version({ uuid: 'uuid-older', version: 1, name: 'Beta', finalDate: '2023-01-01' })
    const anotherOlderFile = version({ uuid: 'uuid-older-2', version: 1, name: 'Gamma', finalDate: '2022-01-01' })
    fetchWorkingCapitalVersions.mockResolvedValue({
      success: true,
      data: { versions: [ACTIVE, olderFile, anotherOlderFile], minDays: 5 },
    })
    fetchWorkingCapitalComparison.mockResolvedValueOnce(compareSuccessResponse())
    const { result } = mountComposable()
    await flush()

    fetchWorkingCapitalComparison.mockResolvedValueOnce({ success: false, data: null })
    result.selectFromVersion(anotherOlderFile)
    await flush()

    expect(toastErrorSpy).not.toHaveBeenCalled()
    expect(result.hasError.value).toBe(true)
  })
})

describe('useWorkingCapitalComparison — live refresh on remount', () => {
  it('refetches versions on every mount, proving no cross-mount caching', async () => {
    const { wrapper } = mountComposable()
    await flush()
    expect(fetchWorkingCapitalVersions).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    const { wrapper: wrapper2 } = mountComposable()
    await flush()
    expect(fetchWorkingCapitalVersions).toHaveBeenCalledTimes(2)
    wrapper2.unmount()
  })
})

describe('useWorkingCapitalComparison — live refresh when the platform-level spend file changes', () => {
  // Simulates a company/spend-file switch completing: getDisableWatchers goes
  // true then back to false. Only the true→false transition should trigger a refresh.
  async function completeGuardedTransition() {
    const store = useGlobalFiltersStore()
    store.setDisableWatchers(true)
    await flush()
    store.setDisableWatchers(false)
    await flush()
  }

  it('refetches versions and reruns the comparison when the guard transitions true→false', async () => {
    const olderFile = version({ uuid: 'uuid-older', version: 1, name: 'Beta', finalDate: '2023-01-01' })
    fetchWorkingCapitalVersions.mockResolvedValue({ success: true, data: { versions: [olderFile], minDays: 5 } })
    mountComposable()
    await flush()
    expect(fetchWorkingCapitalVersions).toHaveBeenCalledTimes(1)

    await completeGuardedTransition()

    expect(fetchWorkingCapitalVersions).toHaveBeenCalledTimes(2)
  })

  it('does not refetch on a false→true transition (guard engaging, not clearing)', async () => {
    const olderFile = version({ uuid: 'uuid-older', version: 1, name: 'Beta', finalDate: '2023-01-01' })
    fetchWorkingCapitalVersions.mockResolvedValue({ success: true, data: { versions: [olderFile], minDays: 5 } })
    mountComposable()
    await flush()
    expect(fetchWorkingCapitalVersions).toHaveBeenCalledTimes(1)

    useGlobalFiltersStore().setDisableWatchers(true)
    await flush()

    expect(fetchWorkingCapitalVersions).toHaveBeenCalledTimes(1)
  })

  it('preserves the fromVersion selection across a refresh when it is still eligible', async () => {
    const olderFile = version({ uuid: 'uuid-older', version: 1, name: 'Beta', finalDate: '2023-01-01' })
    const anotherOlderFile = version({ uuid: 'uuid-older-2', version: 1, name: 'Gamma', finalDate: '2022-01-01' })
    fetchWorkingCapitalVersions.mockResolvedValue({
      success: true,
      data: { versions: [olderFile, anotherOlderFile], minDays: 5 },
    })
    const { result } = mountComposable()
    await flush()
    result.selectFromVersion(anotherOlderFile)
    await flush()
    expect(result.fromVersion.value?.uuid).toBe('uuid-older-2')

    await completeGuardedTransition()

    expect(result.fromVersion.value?.uuid).toBe('uuid-older-2')
  })

  it('falls back to the first eligible option when the previous selection is no longer eligible', async () => {
    const olderFile = version({ uuid: 'uuid-older', version: 1, name: 'Beta', finalDate: '2023-01-01' })
    fetchWorkingCapitalVersions.mockResolvedValue({ success: true, data: { versions: [olderFile], minDays: 5 } })
    const { result } = mountComposable()
    await flush()
    expect(result.fromVersion.value?.uuid).toBe('uuid-older')

    const newOlderFile = version({ uuid: 'uuid-new-older', version: 1, name: 'Delta', finalDate: '2021-01-01' })
    fetchWorkingCapitalVersions.mockResolvedValue({ success: true, data: { versions: [newOlderFile], minDays: 5 } })

    await completeGuardedTransition()

    expect(result.fromVersion.value?.uuid).toBe('uuid-new-older')
  })

  it('resets comparisonResult and fromVersion to null when a refresh finds zero eligible candidates', async () => {
    const olderFile = version({ uuid: 'uuid-older', version: 1, name: 'Beta', finalDate: '2023-01-01' })
    fetchWorkingCapitalVersions.mockResolvedValue({ success: true, data: { versions: [olderFile], minDays: 5 } })
    const { result } = mountComposable()
    await flush()
    expect(result.comparisonResult.value).not.toBeNull()

    fetchWorkingCapitalVersions.mockResolvedValue({ success: true, data: { versions: [], minDays: 5 } })

    await completeGuardedTransition()

    expect(result.comparisonResult.value).toBeNull()
    expect(result.fromVersion.value).toBeNull()
  })

  it('clears hasError on a successful refresh after a prior failure', async () => {
    fetchWorkingCapitalVersions.mockResolvedValueOnce({ success: false, data: null })
    const { result } = mountComposable()
    await flush()
    expect(result.hasError.value).toBe(true)

    const olderFile = version({ uuid: 'uuid-older', version: 1, name: 'Beta', finalDate: '2023-01-01' })
    fetchWorkingCapitalVersions.mockResolvedValue({ success: true, data: { versions: [olderFile], minDays: 5 } })

    await completeGuardedTransition()

    expect(result.hasError.value).toBe(false)
  })
})
