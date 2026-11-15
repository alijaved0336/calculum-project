/**
 * AB#20023: getShowPayOnTerms gates every Pay on Terms column/row/bar in AP. hideAverageDaysPaid is
 * the cash flow basis switch (hide = Contractual), so a Contractual basis hides Pay on Terms too,
 * not only the Pay on Terms strategy switch being off.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// stores/user.ts imports these for its unrelated actions; neither getter nor setter below
// touches them.
vi.mock('@/services/user/api', () => ({}))
vi.mock('@/utils', () => ({ isNullOrUndefined: (v: unknown) => v == null, hasFeatureRole: () => false }))
vi.mock('@/utils/authWarningState', () => ({ authWarningState: {} }))
vi.mock('@/services/pinia/index', () => ({ secureStorage: {} }))
vi.mock('@/stores/entityCard', () => ({ useEntityCardStore: () => ({}) }))
vi.mock('@/stores/globalFilters', () => ({ useGlobalFiltersStore: () => ({}) }))
vi.mock('@/stores/analyze', () => ({ useAnalyzeStore: () => ({}) }))

import { useUserStore } from '@/stores/user'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useUserStore — getShowPayOnTerms', () => {
  it('shows Pay on Terms on an Avg. Days Paid basis with the strategy allowed (the defaults)', () => {
    expect(useUserStore().getShowPayOnTerms).toBe(true)
  })

  it('hides Pay on Terms on a Contractual basis even with the strategy allowed', () => {
    const store = useUserStore()
    store.setHideAverageDaysPaid(true)
    expect(store.getPayOnTermsStrategyAllowed).toBe(true)
    expect(store.getShowPayOnTerms).toBe(false)
  })

  it('hides Pay on Terms when its strategy is turned off, whatever the basis', () => {
    const store = useUserStore()
    store.setPayOnTermsStrategyAllowed(false)
    expect(store.getShowPayOnTerms).toBe(false)
  })

  it('shows it again when the basis goes back to Avg. Days Paid', () => {
    const store = useUserStore()
    store.setHideAverageDaysPaid(true)
    store.setHideAverageDaysPaid(false)
    expect(store.getShowPayOnTerms).toBe(true)
  })
})
