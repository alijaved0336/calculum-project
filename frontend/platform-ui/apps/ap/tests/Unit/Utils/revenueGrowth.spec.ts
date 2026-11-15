import { describe, it, expect } from 'vitest'
import { computeRevenueGrowthPercent } from '@/utils/revenueGrowth'

describe('computeRevenueGrowthPercent', () => {
  it('positive growth: y=120, y1=100 → 20', () => {
    expect(computeRevenueGrowthPercent(120, 100)).toBeCloseTo(20, 10)
  })

  it('negative growth: y=80, y1=100 → -20', () => {
    expect(computeRevenueGrowthPercent(80, 100)).toBeCloseTo(-20, 10)
  })

  it('y1 === 0 → null (division by zero guard)', () => {
    expect(computeRevenueGrowthPercent(100, 0)).toBeNull()
  })

  it('y === null → null', () => {
    expect(computeRevenueGrowthPercent(null, 100)).toBeNull()
  })

  it('y1 === null → null', () => {
    expect(computeRevenueGrowthPercent(100, null)).toBeNull()
  })

  it('both null → null', () => {
    expect(computeRevenueGrowthPercent(null, null)).toBeNull()
  })

  it('negative y1: uses Math.abs divisor — y=50, y1=-100 → 150', () => {
    // Formula: ((50 - (-100)) / |-100|) * 100 = (150 / 100) * 100 = 150
    // Note: the formula uses Math.abs(y1), so the divisor is always positive.
    // If the requirement is growth relative to a signed base, flag to product.
    expect(computeRevenueGrowthPercent(50, -100)).toBeCloseTo(150, 10)
  })

  it('floating-point accuracy at 1/3 boundary', () => {
    // ((133.335 - 100) / 100) * 100 = 33.335
    // The view applies .toFixed(2) separately; this asserts the raw value is correct.
    expect(computeRevenueGrowthPercent(133.335, 100)).toBeCloseTo(33.335, 3)
  })

  it('zero growth: y === y1 → 0', () => {
    expect(computeRevenueGrowthPercent(100, 100)).toBeCloseTo(0, 10)
  })
})
