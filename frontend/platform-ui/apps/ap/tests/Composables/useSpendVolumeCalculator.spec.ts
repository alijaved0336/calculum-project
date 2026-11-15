/**
 * Tests for useSpendVolumeCalculator
 *
 * Covers:
 * - shouldIncludeSpendVolumeInPayload() — only send spendVolume when the user
 *   actually changed it away from its default (0)
 */

import { describe, it, expect } from 'vitest'
import { shouldIncludeSpendVolumeInPayload } from '@/modules/home/entityCard/composables/useSpendVolumeCalculator'

describe('useSpendVolumeCalculator', () => {
  describe('shouldIncludeSpendVolumeInPayload', () => {
    it('returns false for 0 (unchanged default)', () => {
      expect(shouldIncludeSpendVolumeInPayload(0)).toBe(false)
    })

    it('returns false for null', () => {
      expect(shouldIncludeSpendVolumeInPayload(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(shouldIncludeSpendVolumeInPayload(undefined)).toBe(false)
    })

    it('returns true for a positive number', () => {
      expect(shouldIncludeSpendVolumeInPayload(1000)).toBe(true)
    })

    it('returns true for a negative number (a spend decrease)', () => {
      expect(shouldIncludeSpendVolumeInPayload(-500)).toBe(true)
    })

    it('returns true for a small non-zero fractional value', () => {
      expect(shouldIncludeSpendVolumeInPayload(0.01)).toBe(true)
    })
  })
})
