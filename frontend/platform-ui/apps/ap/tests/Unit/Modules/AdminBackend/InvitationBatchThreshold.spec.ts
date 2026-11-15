import { describe, it, expect } from 'vitest'
import { MAX_EMAILS_PER_BATCH } from '@/modules/adminBackend/views/composables/constants'

describe('MAX_EMAILS_PER_BATCH', () => {
  it('should be 10', () => {
    expect(MAX_EMAILS_PER_BATCH).toBe(10)
  })
})

describe('large batch threshold logic (isLargeBatch = length > MAX_EMAILS_PER_BATCH)', () => {
  const isLargeBatch = (count: number) => count > MAX_EMAILS_PER_BATCH

  it('0 emails → sync path', () => {
    expect(isLargeBatch(0)).toBe(false)
  })

  it('1 email → sync path', () => {
    expect(isLargeBatch(1)).toBe(false)
  })

  it('exactly 10 emails → sync path (boundary)', () => {
    expect(isLargeBatch(10)).toBe(false)
  })

  it('11 emails → async path (boundary + 1)', () => {
    expect(isLargeBatch(11)).toBe(true)
  })

  it('large batch (50 emails) → async path', () => {
    expect(isLargeBatch(50)).toBe(true)
  })
})
