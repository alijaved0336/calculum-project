/**
 * Focused test for useHomeStore's currentDashboardTab state — added so
 * HomeDashBoard.vue's local `currentTab` ref can survive the page-contents remount
 * that HomeBackend.vue's v-if="!getGlobalLoading" triggers on every platform-level
 * currency/spend-file switch (a ref's initial value would otherwise reset to
 * 'Dashboard' on every such remount, silently kicking the user out of whichever tab
 * they were on, e.g. Working Capital).
 *
 * Scoped to just this getter/setter pair, not the whole store (large, many API
 * dependencies) — see other tests under this directory for the established
 * setActivePinia/createPinia pattern.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// stores/home.ts imports these for its (many) unrelated actions — none of which this
// suite calls — but they transitively pull in a heavy, app-bootstrap-only .vue
// component chain that crashes standalone in Vitest. Mock them to empty modules;
// currentDashboardTab's getter/setter never touch them.
vi.mock('@/modules/home/api/index', () => ({}))
vi.mock('@/modules/home/api/clusterRelated', () => ({}))
vi.mock('@/services/pinia/index', () => ({ secureStorage: {} }))

import { useHomeStore } from '@/stores/home'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useHomeStore — currentDashboardTab', () => {
  it('defaults to "Dashboard"', () => {
    const store = useHomeStore()
    expect(store.getCurrentDashboardTab).toBe('Dashboard')
  })

  it('setCurrentDashboardTab updates the value read back via getCurrentDashboardTab', () => {
    const store = useHomeStore()
    store.setCurrentDashboardTab('WorkingCapital')
    expect(store.getCurrentDashboardTab).toBe('WorkingCapital')
  })

  it('survives being read from a second useHomeStore() call — the same active Pinia instance', () => {
    // Simulates HomeDashBoard.vue re-initializing currentTab from the store after a
    // remount: a fresh useHomeStore() call still sees the previously-set value,
    // because Pinia store state isn't torn down by a component unmount/remount.
    useHomeStore().setCurrentDashboardTab('WorkingCapital')
    expect(useHomeStore().getCurrentDashboardTab).toBe('WorkingCapital')
  })
})
