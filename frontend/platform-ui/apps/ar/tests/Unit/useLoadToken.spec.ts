import { describe, expect, it } from 'vitest'
import { useLoadToken } from '@/composables/useLoadToken'

describe('useLoadToken', () => {
  it('is not stale immediately after start()', () => {
    const { start, isStale } = useLoadToken()
    const token = start()
    expect(isStale(token)).toBe(false)
  })

  it('marks an earlier token stale once a newer one starts', () => {
    const { start, isStale } = useLoadToken()
    const first = start()
    const second = start()
    expect(isStale(first)).toBe(true)
    expect(isStale(second)).toBe(false)
  })

  it('gives every call() a fresh, independent counter', () => {
    const a = useLoadToken()
    const b = useLoadToken()
    const tokenA = a.start()
    b.start()
    b.start()
    // b's calls to start() must not affect a's notion of what's current.
    expect(a.isStale(tokenA)).toBe(false)
  })

  it('never issues 0 as a real token, so callers cannot forge staleness with a bare 0', () => {
    const { start } = useLoadToken()
    expect(start()).not.toBe(0)
    expect(start()).not.toBe(0)
  })
})
