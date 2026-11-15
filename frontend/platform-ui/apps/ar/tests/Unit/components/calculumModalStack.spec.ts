import { describe, expect, it } from 'vitest'
import { acquireModal, isTopmostModal, releaseModal } from '@/components/calculumModalStack'

describe('calculumModalStack', () => {
  it('gives each acquired modal a strictly higher z-index than the one before it', () => {
    const first = acquireModal()
    const second = acquireModal()
    const third = acquireModal()

    expect(second.zIndex).toBeGreaterThan(first.zIndex)
    expect(third.zIndex).toBeGreaterThan(second.zIndex)

    releaseModal(first.token)
    releaseModal(second.token)
    releaseModal(third.token)
  })

  it('treats the most recently acquired, still-open modal as the topmost one', () => {
    const first = acquireModal()
    const second = acquireModal()

    expect(isTopmostModal(first.token)).toBe(false)
    expect(isTopmostModal(second.token)).toBe(true)

    releaseModal(first.token)
    releaseModal(second.token)
  })

  it('falls back to the previous modal as topmost once the current one releases', () => {
    const first = acquireModal()
    const second = acquireModal()

    releaseModal(second.token)

    expect(isTopmostModal(first.token)).toBe(true)

    releaseModal(first.token)
  })

  it('never reuses a z-index while something else acquired earlier is still open', () => {
    const first = acquireModal()
    const second = acquireModal()
    releaseModal(first.token)

    const third = acquireModal()

    expect(third.zIndex).toBeGreaterThan(second.zIndex)

    releaseModal(second.token)
    releaseModal(third.token)
  })

  it('resets back to the base z-index once every modal has closed, so a long session never climbs past Kendo\'s own popup z-index', () => {
    const first = acquireModal()
    releaseModal(first.token)

    const second = acquireModal()

    expect(second.zIndex).toBe(first.zIndex)

    releaseModal(second.token)
  })

  it('treats no modal as topmost once every modal has released', () => {
    const first = acquireModal()
    releaseModal(first.token)

    expect(isTopmostModal(first.token)).toBe(false)
  })

  it('ignores releasing a token that was already released, or was never acquired', () => {
    const first = acquireModal()
    releaseModal(first.token)

    expect(() => releaseModal(first.token)).not.toThrow()
    expect(() => releaseModal(Symbol('never-acquired'))).not.toThrow()
  })
})
