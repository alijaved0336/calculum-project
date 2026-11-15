/**
 * Tests for the entityCard store `scfRefreshToken` added with US-18713. The SCF tab lives
 * inside a <KeepAlive> and is never remounted, so it watches this token on activation to
 * know its figures went stale after a Target/Agreed save.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/pinia/index', () => ({
  secureStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}))
// Factory mocks, not automocks: automocking these barrels makes vitest load the real
// modules to derive their shape, which drags in Vue views and blows up on import cycles.
vi.mock('@/modules/home/entityCard/api', () => ({}))
vi.mock('@/modules/home/analyze/api', () => ({}))
// The @/utils barrel reaches the route table through RedirectSection, and the route table
// pulls in Vue views that read NumberUtils off the barrel while it is still initializing.
// Cutting the router here breaks that cycle so the store can be imported at all.
vi.mock('@/services/router/Routing', () => ({}))

import { useEntityCardStore } from '@/stores/entityCard'

describe('entityCard store — scfRefreshToken', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts at 0 so a freshly mounted SCF tab has nothing to refetch', () => {
    const store = useEntityCardStore()
    expect(store.scfRefreshToken).toBe(0)
    expect(store.getScfRefreshToken).toBe(0)
  })

  it('bumps the token on every Target/Agreed save', () => {
    const store = useEntityCardStore()
    store.bumpScfRefreshToken()
    expect(store.getScfRefreshToken).toBe(1)
    store.bumpScfRefreshToken()
    expect(store.getScfRefreshToken).toBe(2)
  })

  it('keeps the getter in sync with the state ref', () => {
    const store = useEntityCardStore()
    store.bumpScfRefreshToken()
    expect(store.getScfRefreshToken).toBe(store.scfRefreshToken)
  })
})
