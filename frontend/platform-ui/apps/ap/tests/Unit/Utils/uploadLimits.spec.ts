/**
 * Unit tests for uploadLimits
 */

import { describe, it, expect } from 'vitest'
import {
  parseMbLimit,
  MAX_SPEND_FILE_MB,
  MAX_SPEND_FILE_BYTES,
  MAX_IMAGE_MB,
  MAX_IMAGE_BYTES
} from '@/utils/uploadLimits'

describe('uploadLimits', () => {
  describe('parseMbLimit', () => {
    it('should use the env value when it is a positive number', () => {
      expect(parseMbLimit('100', 5)).toBe(100)
      expect(parseMbLimit('12.5', 5)).toBe(12.5)
    })

    it('should fall back when the env value is missing', () => {
      expect(parseMbLimit(undefined, 5)).toBe(5)
      expect(parseMbLimit('', 5)).toBe(5)
    })

    it('should fall back when the env value is not a positive number', () => {
      expect(parseMbLimit('abc', 5)).toBe(5)
      expect(parseMbLimit('0', 5)).toBe(5)
      expect(parseMbLimit('-3', 5)).toBe(5)
      expect(parseMbLimit('Infinity', 5)).toBe(5)
    })
  })

  describe('exported limits', () => {
    it('should expose positive MB limits', () => {
      expect(MAX_SPEND_FILE_MB).toBeGreaterThan(0)
      expect(MAX_IMAGE_MB).toBeGreaterThan(0)
    })

    it('should derive byte limits from the MB limits', () => {
      expect(MAX_SPEND_FILE_BYTES).toBe(MAX_SPEND_FILE_MB * 1024 * 1024)
      expect(MAX_IMAGE_BYTES).toBe(MAX_IMAGE_MB * 1024 * 1024)
    })
  })
})
