import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGridColumnPreferencesStore } from '@/stores/gridColumnPreferences'

describe('the AR grid column preferences store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has no cached columns for a grid until some are set', () => {
    expect(useGridColumnPreferencesStore().getColumns('sale-match-list')).toEqual([])
  })

  it('remembers each grid’s own column snapshot independently', () => {
    const store = useGridColumnPreferencesStore()
    const columns = [{ field: 'buyer', title: 'Buyer' }] as never

    store.setColumns('sale-match-list', columns)

    expect(store.getColumns('sale-match-list')).toEqual(columns)
    expect(store.getColumns('other-grid')).toEqual([])
  })

  /** Sign-out (UC-ENT-09): a cached snapshot can name a tenant's own custom-attribute columns, and
   * this store persists, so it must not survive into the next sign-in on this browser. */
  it('drops every grid’s cached columns on clear()', () => {
    const store = useGridColumnPreferencesStore()
    store.setColumns('sale-match-list', [{ field: 'buyer', title: 'Buyer' }] as never)

    store.clear()

    expect(store.getColumns('sale-match-list')).toEqual([])
  })
})
