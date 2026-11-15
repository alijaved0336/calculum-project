import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useOverviewChartSelectionStore } from '@/stores/overviewChartSelection'

describe('the AR overview chart selection store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has no selection for a card until one is set', () => {
    const store = useOverviewChartSelectionStore()

    expect(store.getSelection('primary')).toBeNull()
  })

  it('remembers each card’s own selection independently', () => {
    const store = useOverviewChartSelectionStore()

    store.setSelection('primary', { measure: 'cashFlowOpportunity', dimension: 'buyer' })
    store.setSelection('secondary', { measure: 'volume', dimension: 'country', dimensionOrdinal: 3 })

    expect(store.getSelection('primary')).toEqual({ measure: 'cashFlowOpportunity', dimension: 'buyer' })
    expect(store.getSelection('secondary')).toEqual({
      measure: 'volume',
      dimension: 'country',
      dimensionOrdinal: 3,
    })
  })

  it('overwrites a card’s previous selection', () => {
    const store = useOverviewChartSelectionStore()

    store.setSelection('primary', { measure: 'cashFlowOpportunity', dimension: 'buyer' })
    store.setSelection('primary', { measure: 'volume', dimension: 'country' })

    expect(store.getSelection('primary')).toEqual({ measure: 'volume', dimension: 'country' })
  })

  /** Sign-out (UC-ENT-09): a selection can name a tenant's own custom attribute (`dimensionOrdinal`),
   * and this store persists, so it must not survive into the next sign-in on this browser. */
  it('drops every card’s selection on clear()', () => {
    const store = useOverviewChartSelectionStore()
    store.setSelection('primary', { measure: 'cashFlowOpportunity', dimension: 'buyer' })
    store.setSelection('secondary', { measure: 'volume', dimension: 'country', dimensionOrdinal: 3 })

    store.clear()

    expect(store.getSelection('primary')).toBeNull()
    expect(store.getSelection('secondary')).toBeNull()
  })
})
