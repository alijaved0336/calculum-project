import { describe, it, expect } from 'vitest'
import {
  classifyTransition,
  requiresModal,
  STATUS_COLUMN_ORDER,
  type NegotiationStatus
} from '@/composables/useStatusTransitions'

describe('classifyTransition', () => {
  it('returns null for a no-op drop onto the same column', () => {
    STATUS_COLUMN_ORDER.forEach(status => {
      expect(classifyTransition(status, status)).toBeNull()
    })
  })

  it('classifies every forward pair (target code > source code, not agreed<->agreedExtended)', () => {
    const forwardPairs: Array<[NegotiationStatus, NegotiationStatus]> = [
      ['analyzed', 'onHold'],
      ['analyzed', 'planned'],
      ['analyzed', 'contacted'],
      ['analyzed', 'agreed'],
      ['analyzed', 'agreedExtended'],
      ['onHold', 'planned'],
      ['onHold', 'contacted'],
      ['onHold', 'agreed'],
      ['onHold', 'agreedExtended'],
      ['planned', 'contacted'],
      ['planned', 'agreed'],
      ['planned', 'agreedExtended'],
      ['contacted', 'agreed'],
      ['contacted', 'agreedExtended']
    ]
    forwardPairs.forEach(([source, target]) => {
      expect(classifyTransition(source, target)).toBe('forward')
    })
  })

  it('classifies every backward pair from a non-agreed source as tier1Backward', () => {
    const tier1Pairs: Array<[NegotiationStatus, NegotiationStatus]> = [
      ['onHold', 'analyzed'],
      ['planned', 'analyzed'],
      ['planned', 'onHold'],
      ['contacted', 'analyzed'],
      ['contacted', 'onHold'],
      ['contacted', 'planned']
    ]
    tier1Pairs.forEach(([source, target]) => {
      expect(classifyTransition(source, target)).toBe('tier1Backward')
    })
  })

  it('classifies every backward pair from an Agreed source to a non-agreed target as tier2ABackward', () => {
    const nonAgreedTargets: NegotiationStatus[] = ['analyzed', 'onHold', 'planned', 'contacted']
    nonAgreedTargets.forEach(target => {
      expect(classifyTransition('agreed', target)).toBe('tier2ABackward')
      expect(classifyTransition('agreedExtended', target)).toBe('tier2ABackward')
    })
  })

  it('classifies both directions between agreed and agreedExtended as tier2BReclassify, not forward/backward by code', () => {
    expect(classifyTransition('agreed', 'agreedExtended')).toBe('tier2BReclassify')
    expect(classifyTransition('agreedExtended', 'agreed')).toBe('tier2BReclassify')
  })

  it('covers all 30 directed pairs across the 6 columns with exactly one tier each', () => {
    let count = 0
    STATUS_COLUMN_ORDER.forEach(source => {
      STATUS_COLUMN_ORDER.forEach(target => {
        if (source === target) return
        count++
        expect(classifyTransition(source, target)).not.toBeNull()
      })
    })
    expect(count).toBe(30)
  })
})

describe('requiresModal', () => {
  it("returns 'plan' for the Planned column", () => {
    expect(requiresModal('planned')).toBe('plan')
  })

  it("returns 'agreedTerms' for both Agreed columns", () => {
    expect(requiresModal('agreed')).toBe('agreedTerms')
    expect(requiresModal('agreedExtended')).toBe('agreedTerms')
  })

  it('returns null for the simple columns', () => {
    expect(requiresModal('analyzed')).toBeNull()
    expect(requiresModal('onHold')).toBeNull()
    expect(requiresModal('contacted')).toBeNull()
  })
})
