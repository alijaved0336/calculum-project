import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'

vi.mock('@/stores/analyze', () => ({ useAnalyzeStore: vi.fn() }))
vi.mock('@/stores/globalFilters', () => ({ useGlobalFiltersStore: vi.fn() }))
vi.mock('@/services/api/env', () => ({ DEBUG: false }))

import { useAnalyzeStore } from '@/stores/analyze'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useConsistentFetch } from '@/composables/useConsistentFetch'

// ─── Store factory helpers ───────────────────────────────────────────────────

function makeAnalyzeStore(programs: any[] = [{ '@id': '/api/programs/p1' }]) {
  return { getAllPrograms: programs }
}

function makeGlobalStore(disableWatchers = false) {
  return { getDisableWatchers: disableWatchers }
}

// ─── Test-component wrapper ──────────────────────────────────────────────────
// useConsistentFetch calls onMounted/watch, so it must run inside a component.

function mountHook(
  fetchFns: Array<() => void>,
  programId: () => string | null | undefined,
  sfvId: () => string | null | undefined,
) {
  const result: { triggerFetch?: () => void } = {}

  const wrapper = mount(
    defineComponent({
      setup() {
        const r = useConsistentFetch(fetchFns, programId, sfvId)
        result.triggerFetch = r.triggerFetch
        return {}
      },
      template: '<div />',
    }),
  )

  return { wrapper, result }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useConsistentFetch', () => {
  let fetchA: ReturnType<typeof vi.fn>
  let fetchB: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    fetchA = vi.fn()
    fetchB = vi.fn()
    vi.mocked(useAnalyzeStore).mockReturnValue(makeAnalyzeStore() as any)
    vi.mocked(useGlobalFiltersStore).mockReturnValue(makeGlobalStore() as any)
  })

  // ─── Company-change guard ────────────────────────────────────────────────

  it('does not call fetchFns when getDisableWatchers is true', () => {
    vi.mocked(useGlobalFiltersStore).mockReturnValue(makeGlobalStore(true) as any)
    mountHook([fetchA], () => 'p1', () => 'sfv1')
    expect(fetchA).not.toHaveBeenCalled()
  })

  // ─── Missing data guards ─────────────────────────────────────────────────

  it('does not call fetchFns when programs list is empty', () => {
    vi.mocked(useAnalyzeStore).mockReturnValue(makeAnalyzeStore([]) as any)
    mountHook([fetchA], () => 'p1', () => 'sfv1')
    expect(fetchA).not.toHaveBeenCalled()
  })

  it('does not call fetchFns when programId is null', () => {
    mountHook([fetchA], () => null, () => 'sfv1')
    expect(fetchA).not.toHaveBeenCalled()
  })

  it('does not call fetchFns when programId is undefined', () => {
    mountHook([fetchA], () => undefined, () => 'sfv1')
    expect(fetchA).not.toHaveBeenCalled()
  })

  it('does not call fetchFns when sfvId is null', () => {
    mountHook([fetchA], () => 'p1', () => null)
    expect(fetchA).not.toHaveBeenCalled()
  })

  it('does not call fetchFns when sfvId is empty string', () => {
    mountHook([fetchA], () => 'p1', () => '')
    expect(fetchA).not.toHaveBeenCalled()
  })

  // ─── Happy path ──────────────────────────────────────────────────────────

  it('calls all fetchFns on mount when all conditions are met', () => {
    mountHook([fetchA, fetchB], () => 'p1', () => 'sfv1')
    expect(fetchA).toHaveBeenCalledOnce()
    expect(fetchB).toHaveBeenCalledOnce()
  })

  // ─── Deduplication ───────────────────────────────────────────────────────

  it('does not call fetchFns again for the same programId:sfvId pair', async () => {
    const programId = ref('p1')
    const sfvId = ref('sfv1')
    const { wrapper } = mountHook([fetchA], () => programId.value, () => sfvId.value)

    expect(fetchA).toHaveBeenCalledTimes(1)

    // Simulate same values being set again (reactive deps unchanged)
    programId.value = 'p1'
    sfvId.value = 'sfv1'
    await wrapper.vm.$nextTick()

    expect(fetchA).toHaveBeenCalledTimes(1)
  })

  it('calls fetchFns again when programId changes to a different value', async () => {
    const programId = ref('p1')
    const sfvId = ref('sfv1')
    const { wrapper } = mountHook([fetchA], () => programId.value, () => sfvId.value)

    expect(fetchA).toHaveBeenCalledTimes(1)

    programId.value = 'p2'
    await wrapper.vm.$nextTick()

    expect(fetchA).toHaveBeenCalledTimes(2)
  })

  it('calls fetchFns again when sfvId changes to a different value', async () => {
    const programId = ref('p1')
    const sfvId = ref('sfv1')
    const { wrapper } = mountHook([fetchA], () => programId.value, () => sfvId.value)

    expect(fetchA).toHaveBeenCalledTimes(1)

    sfvId.value = 'sfv2'
    await wrapper.vm.$nextTick()

    expect(fetchA).toHaveBeenCalledTimes(2)
  })

  // ─── triggerFetch (force re-fetch) ───────────────────────────────────────

  it('triggerFetch() forces a re-fetch even with the same programId:sfvId pair', () => {
    const { result } = mountHook([fetchA], () => 'p1', () => 'sfv1')

    expect(fetchA).toHaveBeenCalledTimes(1)

    result.triggerFetch!()
    expect(fetchA).toHaveBeenCalledTimes(2)
  })

  it('triggerFetch() still respects getDisableWatchers', () => {
    vi.mocked(useGlobalFiltersStore).mockReturnValue(makeGlobalStore(true) as any)
    const { result } = mountHook([fetchA], () => 'p1', () => 'sfv1')

    result.triggerFetch!()
    expect(fetchA).not.toHaveBeenCalled()
  })

  it('triggerFetch() does not fire when programs are empty', () => {
    vi.mocked(useAnalyzeStore).mockReturnValue(makeAnalyzeStore([]) as any)
    const { result } = mountHook([fetchA], () => 'p1', () => 'sfv1')

    result.triggerFetch!()
    expect(fetchA).not.toHaveBeenCalled()
  })

  // ─── Async / AbortError swallowing ───────────────────────────────────────

  it('does not throw when a fetchFn returns a rejected AbortError promise', async () => {
    const abortingFetch = vi.fn().mockReturnValue(
      Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
    )
    expect(() => mountHook([abortingFetch], () => 'p1', () => 'sfv1')).not.toThrow()
    // Let the microtask queue drain so the .catch runs
    await new Promise(r => setTimeout(r, 0))
  })

  it('does not throw when a fetchFn throws synchronously with AbortError', () => {
    const throwingFetch = vi.fn().mockImplementation(() => {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    })
    expect(() => mountHook([throwingFetch], () => 'p1', () => 'sfv1')).not.toThrow()
  })
})
