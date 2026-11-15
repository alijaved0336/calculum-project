/**
 * Tests for the AF-1 fallback-on-failure added to the Suppliers tab of
 * apps/ap/src/modules/home/analyze/views/Lists.vue and
 * apps/ap/src/modules/home/plan/components/PlanLists.vue (fetchDataSuppliers /
 * getSupplierData). Both files are large, template-heavy, and not mountable in the
 * Vitest/Node.js environment (same class of problem documented in
 * ManageTeamAction.spec.ts and the other specs in this series) — the retry-decision
 * and filter-shadowing logic are mirrored as pure functions instead.
 */

import { describe, it, expect, vi } from 'vitest'

// ─── Mirrors: const activeGlobalFilter = withoutGlobalFilter ? "" : setGlobalFilter;
// added to getSupplierData() in both files. Shadows the module-level setGlobalFilter
// locally so the fallback retry never mutates the shared variable used by the
// spends/parents fetchers.
function buildActiveGlobalFilter(setGlobalFilter: string, withoutGlobalFilter: boolean): string {
  return withoutGlobalFilter ? '' : setGlobalFilter
}

describe('getSupplierData global-filter shadowing (Lists.vue / PlanLists.vue)', () => {
  it('uses the shared global filter when not falling back', () => {
    const setGlobalFilter = 'globalFilter: "{\\"filters\\":[{\\"field\\":\\"country\\"}]}"'
    expect(buildActiveGlobalFilter(setGlobalFilter, false)).toBe(setGlobalFilter)
  })

  it('omits the global filter during the AF-1 fallback retry, regardless of the shared value', () => {
    const setGlobalFilter = 'globalFilter: "{\\"filters\\":[{\\"field\\":\\"country\\"}]}"'
    expect(buildActiveGlobalFilter(setGlobalFilter, true)).toBe('')
  })
})

// ─── Mirrors the retry orchestration added to fetchDataSuppliers()'s catch block in
// both files: on a genuine failure, retry once with the global filter stripped; a
// second failure clears data.dataSuppliers and stops (no infinite retry).
async function fetchSuppliersWithFallback(
  fetchFn: (withoutGlobalFilter: boolean) => Promise<void>,
  withoutGlobalFilter = false,
): Promise<{ success: boolean; retried: boolean }> {
  try {
    await fetchFn(withoutGlobalFilter)
    return { success: true, retried: false }
  } catch {
    if (!withoutGlobalFilter) {
      await fetchSuppliersWithFallback(fetchFn, true)
      return { success: false, retried: true }
    }
    return { success: false, retried: false }
  }
}

describe('fetchDataSuppliers AF-1 fallback retry (Lists.vue / PlanLists.vue)', () => {
  it('does not retry when the first fetch succeeds', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)
    const result = await fetchSuppliersWithFallback(fetchFn)
    expect(result).toEqual({ success: true, retried: false })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(fetchFn).toHaveBeenCalledWith(false)
  })

  it('retries once without the global filter when the filtered fetch fails', async () => {
    const fetchFn = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(undefined)
    const result = await fetchSuppliersWithFallback(fetchFn)
    expect(result).toEqual({ success: false, retried: true })
    expect(fetchFn).toHaveBeenNthCalledWith(1, false)
    expect(fetchFn).toHaveBeenNthCalledWith(2, true)
  })

  it('stops after the fallback retry also fails, without a third attempt', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network error'))
    const result = await fetchSuppliersWithFallback(fetchFn)
    expect(result).toEqual({ success: false, retried: true })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
})
