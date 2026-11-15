/**
 * Unit tests for NumberUtils
 */

import { describe, it, expect } from 'vitest'
import NumberUtils from '@/utils/NumberUtils'

describe('NumberUtils', () => {
  describe('round', () => {
    it('should round to default precision (0)', () => {
      expect(NumberUtils.round(3.7)).toBe(4)
      expect(NumberUtils.round(3.2)).toBe(3)
    })

    it('should round to specified precision', () => {
      expect(NumberUtils.round(3.14159, { precision: 2 })).toBe(3.14)
      expect(NumberUtils.round(3.14159, { precision: 3 })).toBe(3.142)
    })

    it('should handle negative numbers', () => {
      expect(NumberUtils.round(-3.7)).toBe(-4)
      expect(NumberUtils.round(-3.14159, { precision: 2 })).toBe(-3.14)
    })

    it('should handle zero', () => {
      expect(NumberUtils.round(0)).toBe(0)
      expect(NumberUtils.round(0, { precision: 2 })).toBe(0)
    })
  })

  describe('getRandomInt', () => {
    it('should return integer within default range (0-10000)', () => {
      const result = NumberUtils.getRandomInt()
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(10000)
      expect(Number.isInteger(result)).toBe(true)
    })

    it('should return integer within custom range', () => {
      const result = NumberUtils.getRandomInt({ min: 5, max: 10 })
      expect(result).toBeGreaterThanOrEqual(5)
      expect(result).toBeLessThan(10)
      expect(Number.isInteger(result)).toBe(true)
    })

    it('should handle min equal to max', () => {
      const result = NumberUtils.getRandomInt({ min: 5, max: 5 })
      expect(result).toBe(5)
    })

    it('should handle negative ranges', () => {
      const result = NumberUtils.getRandomInt({ min: -10, max: -5 })
      expect(result).toBeGreaterThanOrEqual(-10)
      expect(result).toBeLessThan(-5)
    })

    it('should generate different values (randomness check)', () => {
      const results = new Set()
      for (let i = 0; i < 100; i++) {
        results.add(NumberUtils.getRandomInt({ min: 0, max: 1000 }))
      }
      // Should have generated multiple different values
      expect(results.size).toBeGreaterThan(50)
    })
  })

  describe('toInteger', () => {
    it('should convert decimal to integer', () => {
      expect(NumberUtils.toInteger(3.7)).toBe(3)
      expect(NumberUtils.toInteger(3.2)).toBe(3)
    })

    it('should handle negative decimals', () => {
      expect(NumberUtils.toInteger(-3.7)).toBe(-3)
    })

    it('should keep integers unchanged', () => {
      expect(NumberUtils.toInteger(5)).toBe(5)
      expect(NumberUtils.toInteger(-5)).toBe(-5)
    })

    it('should handle zero', () => {
      expect(NumberUtils.toInteger(0)).toBe(0)
    })

    it('should handle large numbers', () => {
      expect(NumberUtils.toInteger(1000000.9)).toBe(1000000)
    })
  })

  describe('addThousandsSeparator', () => {
    it('should add thousands separator to integer', () => {
      expect(NumberUtils.addThousandsSeparator(1000)).toBe('1,000')
      expect(NumberUtils.addThousandsSeparator(1000000)).toBe('1,000,000')
    })

    it('should handle numbers with decimals', () => {
      expect(NumberUtils.addThousandsSeparator(1000.50)).toBe('1,000.5')
    })

    it('should use custom separator', () => {
      expect(NumberUtils.addThousandsSeparator(1000, '.')).toBe('1.000')
      expect(NumberUtils.addThousandsSeparator(1000000, ' ')).toBe('1 000 000')
    })

    it('should handle numbers less than 1000', () => {
      expect(NumberUtils.addThousandsSeparator(999)).toBe('999')
      expect(NumberUtils.addThousandsSeparator(100)).toBe('100')
    })

    it('should handle zero', () => {
      expect(NumberUtils.addThousandsSeparator(0)).toBe('0')
    })

    it('should handle negative numbers', () => {
      expect(NumberUtils.addThousandsSeparator(-1000)).toBe('-1,000')
    })
  })

  describe('removeThousandsSeparator', () => {
    it('should remove default comma separator', () => {
      expect(NumberUtils.removeThousandsSeparator('1,000')).toBe('1000')
      expect(NumberUtils.removeThousandsSeparator('1,000,000')).toBe('1000000')
    })

    it('should handle decimals', () => {
      expect(NumberUtils.removeThousandsSeparator('1,000.50')).toBe('1000.50')
    })

    it('should use custom separator', () => {
      expect(NumberUtils.removeThousandsSeparator('1.000', '.')).toBe('1000')
      expect(NumberUtils.removeThousandsSeparator('1 000 000', ' ')).toBe('1000000')
    })

    it('should handle string without separators', () => {
      expect(NumberUtils.removeThousandsSeparator('1000')).toBe('1000')
    })

    it('should handle empty string', () => {
      expect(NumberUtils.removeThousandsSeparator('')).toBe('')
    })

    it('should handle negative numbers', () => {
      expect(NumberUtils.removeThousandsSeparator('-1,000')).toBe('-1000')
    })
  })

  describe('differenceBetweenTwoNumbers', () => {
    it('should calculate difference (a - b)', () => {
      expect(NumberUtils.differenceBetweenTwoNumbers(10, 5)).toBe(5)
      expect(NumberUtils.differenceBetweenTwoNumbers(5, 10)).toBe(-5)
    })

    it('should handle zero', () => {
      expect(NumberUtils.differenceBetweenTwoNumbers(10, 0)).toBe(10)
      expect(NumberUtils.differenceBetweenTwoNumbers(0, 10)).toBe(-10)
    })

    it('should handle negative numbers', () => {
      expect(NumberUtils.differenceBetweenTwoNumbers(-5, -10)).toBe(5)
      expect(NumberUtils.differenceBetweenTwoNumbers(-10, 5)).toBe(-15)
    })

    it('should handle decimals', () => {
      expect(NumberUtils.differenceBetweenTwoNumbers(10.5, 5.2)).toBeCloseTo(5.3)
    })

    it('should handle identical numbers', () => {
      expect(NumberUtils.differenceBetweenTwoNumbers(5, 5)).toBe(0)
    })
  })
})

