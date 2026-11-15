import { describe, expect, it } from 'vitest'
import { withDisclaimer } from '@/utils/disclaimers'

describe('withDisclaimer', () => {
  it('appends the disclaimer to the explanation when there is a real value to caveat', () => {
    expect(withDisclaimer('What this figure is.', 'Do not rely on it.', true)).toBe(
      'What this figure is. Do not rely on it.',
    )
  })

  it('returns the plain explanation, unchanged, when there is nothing to caveat (AF-1)', () => {
    expect(withDisclaimer('What this figure is.', 'Do not rely on it.', false)).toBe('What this figure is.')
  })

  it('does not leave a stray leading space when the explanation is empty', () => {
    expect(withDisclaimer('', 'Do not rely on it.', true)).toBe('Do not rely on it.')
  })
})
