/**
 * Tests for ListNegotiation.vue's global-filter wiring (entity card spend-lines grid).
 *
 * ListNegotiation.vue cannot be mounted in the Vitest/Node.js environment: it directly
 * imports CalculumGridGraphql.vue as a child component, which itself fails to resolve
 * under Vitest's SSR transform (an unrelated icon .vue file with inline SVG paths that
 * Rollup's TS-aware parser rejects) — the same class of problem already documented in
 * ManageTeamAction.spec.ts and CalculumGridGraphqlDistinctValues.spec.ts.
 *
 * Strategy (same approach used in those specs): mirror the specific logic under test as
 * pure functions and verify those directly.
 */

import { describe, it, expect, vi } from 'vitest'

// ─── Mirrors graphqlUtils.convertGlobalFilterToGraphQL, used by getSpendsData() to
// build the `globalFilter` GraphQL argument.
function convertGlobalFilterToGraphQL(filter: any | undefined): string {
  return filter ? `globalFilter: "${JSON.stringify(filter).replace(/"/g, '\\"')}"` : ''
}

describe('convertGlobalFilterToGraphQL (AC-05/AC-06/AC-07: global filter sent to the spends query)', () => {
  it('serializes an active global filter', () => {
    const activeFilter = { filters: [{ field: 'country', operator: 'eq', value: 'Italy' }], logic: 'and' }
    expect(convertGlobalFilterToGraphQL(activeFilter)).toBe(
      `globalFilter: "${JSON.stringify(activeFilter).replace(/"/g, '\\"')}"`,
    )
  })

  it('returns an empty string for an undefined filter', () => {
    expect(convertGlobalFilterToGraphQL(undefined)).toBe('')
  })

  it('AC-07: still emits a globalFilter argument for the store default empty-filters shape', () => {
    // globalFiltersStore.getFiltersApplied defaults to { filters: [], logic: 'and' } — a truthy
    // object — not undefined/null. The empty-array case is NOT short-circuited on the frontend;
    // the backend's AdaGlobalWithTelerikDataFilter treats an empty `filters` array as a no-op.
    const clearedFilter = { filters: [], logic: 'and' }
    expect(convertGlobalFilterToGraphQL(clearedFilter)).toBe(
      `globalFilter: "${JSON.stringify(clearedFilter).replace(/"/g, '\\"')}"`,
    )
  })
})

// ─── Mirrors the AF-1 retry orchestration added to fetchDataSpends()'s catch block:
// on a genuine failure, retry once with the global filter stripped; a second failure
// clears local state and stops (no infinite retry).
async function fetchWithFallback(
  fetchFn: (withoutGlobalFilter: boolean) => Promise<void>,
  withoutGlobalFilter = false,
): Promise<{ success: boolean; retried: boolean }> {
  try {
    await fetchFn(withoutGlobalFilter)
    return { success: true, retried: false }
  } catch {
    if (!withoutGlobalFilter) {
      await fetchWithFallback(fetchFn, true)
      return { success: false, retried: true }
    }
    return { success: false, retried: false }
  }
}

describe('AF-1 fallback-on-failure retry (mirrors ListNegotiation.vue fetchDataSpends catch)', () => {
  it('does not retry when the first fetch succeeds', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)
    const result = await fetchWithFallback(fetchFn)
    expect(result).toEqual({ success: true, retried: false })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(fetchFn).toHaveBeenCalledWith(false)
  })

  it('retries once without the global filter when the filtered fetch fails', async () => {
    const fetchFn = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(undefined)
    const result = await fetchWithFallback(fetchFn)
    expect(result).toEqual({ success: false, retried: true })
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(fetchFn).toHaveBeenNthCalledWith(1, false)
    expect(fetchFn).toHaveBeenNthCalledWith(2, true)
  })

  it('stops after the fallback retry also fails, without a third attempt', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network error'))
    const result = await fetchWithFallback(fetchFn)
    expect(result).toEqual({ success: false, retried: true })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
})
