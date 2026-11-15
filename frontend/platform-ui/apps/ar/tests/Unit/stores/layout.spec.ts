import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLayoutStore } from '@/stores/layout'

describe('the AR layout store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts unvalidated', () => {
    expect(useLayoutStore().isSessionValidated).toBe(false)
  })

  it('toggles the session-validated gate', () => {
    const store = useLayoutStore()

    store.setSessionValidated(true)

    expect(store.isSessionValidated).toBe(true)
  })

  /** Sign-out (UC-ENT-09): the gate must not still read validated for a session that just ended. */
  it('resets the gate to false on clear()', () => {
    const store = useLayoutStore()
    store.setSessionValidated(true)

    store.clear()

    expect(store.isSessionValidated).toBe(false)
  })
})
