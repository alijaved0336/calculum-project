/**
 * Unit tests for DateUtils
 */

import { describe, it, expect, vi } from 'vitest'

// Mock the barrel export to prevent loading PaymentTermsStrategiesUtils
vi.mock('@/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils/DateUtils')>('@/utils/DateUtils')
  return {
    DateUtils: actual.default
  }
})

// DateUtils -> StringUtils -> FormatData; mock FormatData so this spec does
// not transitively pull vue-i18n / locales / stores.
vi.mock('@/utils/FormatData', () => ({
  changeToCurrency: (value: number) => value,
}))

import DateUtils from '@/utils/DateUtils'

describe('DateUtils', () => {
  describe('getDateFromDateSpaceTimeFormat', () => {
    it('should extract date from date-time string', () => {
      const result = DateUtils.getDateFromDateSpaceTimeFormat('2015-10-29 00:00:00.000000')
      expect(result).toBe('2015-10-29')
    })

    it('should return empty string for empty input', () => {
      const result = DateUtils.getDateFromDateSpaceTimeFormat('')
      expect(result).toBe('')
    })

    it('should handle date with different time format', () => {
      const result = DateUtils.getDateFromDateSpaceTimeFormat('2024-01-15 14:30:45')
      expect(result).toBe('2024-01-15')
    })
  })

  describe('getISODate', () => {
    it('should return ISO date format from valid date string', () => {
      const result = DateUtils.getISODate('2024-01-15')
      expect(result).toBe('2024-01-15')
    })

    it('should handle ISO datetime string', () => {
      const result = DateUtils.getISODate('2024-01-15T10:30:00Z')
      expect(result).toBe('2024-01-15')
    })

    it('should return empty string for empty input', () => {
      const result = DateUtils.getISODate('')
      expect(result).toBe('')
    })

    it('should return empty string for invalid date', () => {
      const result = DateUtils.getISODate('invalid-date')
      expect(result).toBe('')
    })
  })

  describe('formatDate', () => {
    it('should format date with default locale', () => {
      const result = DateUtils.formatDate('2024-01-15T12:00:00Z', 'en')
      expect(result).toMatch(/1\/15\/2024/)
    })

    it('should format date with Spanish locale', () => {
      const result = DateUtils.formatDate('2024-01-15T12:00:00Z', 'es')
      expect(result).toMatch(/15\/1\/2024/)
    })

    it('should return empty string for null date', () => {
      const result = DateUtils.formatDate(null as any)
      expect(result).toBe('')
    })

    it('should return empty string for invalid date', () => {
      const result = DateUtils.formatDate('invalid-date')
      expect(result).toBe('')
    })

    it('should format Date object', () => {
      const date = new Date('2024-01-15T12:00:00Z')
      const result = DateUtils.formatDate(date, 'en')
      expect(result).toMatch(/1\/15\/2024/)
    })
  })

  describe('addDays', () => {
    it('should add days to a date string', () => {
      const result = DateUtils.addDays('2024-01-15', 5)
      expect(result.getDate()).toBe(20)
    })

    it('should add negative days (subtract)', () => {
      const result = DateUtils.addDays('2024-01-15', -5)
      expect(result.getDate()).toBe(10)
    })

    it('should handle Date object', () => {
      const date = new Date('2024-01-15T12:00:00Z')
      const result = DateUtils.addDays(date, 10)
      expect(result.getUTCDate()).toBe(25)
    })

    it('should throw error for empty date', () => {
      expect(() => DateUtils.addDays('', 5)).toThrow('Date parameter is required')
    })

    it('should throw error for invalid date', () => {
      expect(() => DateUtils.addDays('invalid-date', 5)).toThrow('Invalid date provided')
    })
  })

  describe('diffInDays', () => {
    it('should calculate difference between two dates', () => {
      const result = DateUtils.diffInDays('2024-01-01', '2024-01-11')
      expect(result).toBe(10)
    })

    it('should return negative value when date2 is before date1', () => {
      const result = DateUtils.diffInDays('2024-01-11', '2024-01-01')
      expect(result).toBe(-10)
    })

    it('should handle Date objects', () => {
      const date1 = new Date('2024-01-01')
      const date2 = new Date('2024-01-06')
      const result = DateUtils.diffInDays(date1, date2)
      expect(result).toBe(5)
    })

    it('should throw error for missing dates', () => {
      expect(() => DateUtils.diffInDays('', '2024-01-01')).toThrow('Both date parameters are required')
    })

    it('should throw error for invalid dates', () => {
      expect(() => DateUtils.diffInDays('invalid', '2024-01-01')).toThrow('Invalid date provided')
    })
  })

  describe('isAfter', () => {
    it('should return true when date1 is after date2', () => {
      const result = DateUtils.isAfter('2024-01-15', '2024-01-10')
      expect(result).toBe(true)
    })

    it('should return false when date1 is before date2', () => {
      const result = DateUtils.isAfter('2024-01-10', '2024-01-15')
      expect(result).toBe(false)
    })

    it('should return false when dates are equal', () => {
      const result = DateUtils.isAfter('2024-01-15', '2024-01-15')
      expect(result).toBe(false)
    })

    it('should return false for invalid dates', () => {
      const result = DateUtils.isAfter('invalid', '2024-01-15')
      expect(result).toBe(false)
    })

    it('should return false for empty dates', () => {
      const result = DateUtils.isAfter('', '2024-01-15')
      expect(result).toBe(false)
    })
  })

  describe('formatYYYYMMDD', () => {
    it('should format date as YYYY-MM-DD', () => {
      const result = DateUtils.formatYYYYMMDD('2024-01-05T12:00:00Z')
      expect(result).toBe('2024-01-05')
    })

    it('should pad single digit months and days', () => {
      const date = new Date(2024, 0, 5) // January 5, 2024
      const result = DateUtils.formatYYYYMMDD(date)
      expect(result).toBe('2024-01-05')
    })

    it('should return empty string for empty input', () => {
      const result = DateUtils.formatYYYYMMDD('')
      expect(result).toBe('')
    })

    it('should return empty string for invalid date', () => {
      const result = DateUtils.formatYYYYMMDD('invalid-date')
      expect(result).toBe('')
    })
  })

  describe('getTimezoneNames', () => {
    it('should return array of timezone names', () => {
      const result = DateUtils.getTimezoneNames()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should include UTC timezone', () => {
      const result = DateUtils.getTimezoneNames()
      expect(result).toContain('UTC')
    })

    it('should include common timezones', () => {
      const result = DateUtils.getTimezoneNames()
      expect(result).toContain('America/New_York')
      expect(result).toContain('Europe/London')
      expect(result).toContain('Asia/Tokyo')
    })
  })

  describe('formatDateForTimestamp', () => {
    it('should format date for timestamp', () => {
      const date = new Date('2024-01-15T10:30:45.123Z')
      const result = DateUtils.formatDateForTimestamp(date)
      expect(result).toBe('2024-01-15 10:30:45.123Z')
    })

    it('should pad single digits correctly', () => {
      const date = new Date('2024-01-05T01:02:03.004Z')
      const result = DateUtils.formatDateForTimestamp(date)
      expect(result).toBe('2024-01-05 01:02:03.004Z')
    })
  })

  describe('formatDateForInput', () => {
    it('should format date for input field', () => {
      const result = DateUtils.formatDateForInput('2024-01-15T10:30:00')
      expect(result).toMatch(/2024-01-15 \d{2}:\d{2}/)
    })

    it('should throw error for invalid date string', () => {
      expect(() => DateUtils.formatDateForInput('invalid-date')).toThrow('Invalid date string')
    })
  })

  describe('parseDateValidation', () => {
    it('should parse ISO date string', () => {
      const result = DateUtils.parseDateValidation('2024-01-15')
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2024)
    })

    it('should parse Spanish date format (dd/mm/yyyy)', () => {
      const result = DateUtils.parseDateValidation('15/01/2024', 'es-ES')
      expect(result).toBeInstanceOf(Date)
      expect(result?.getDate()).toBe(15)
      expect(result?.getMonth()).toBe(0) // January = 0
    })

    it('should parse US date format (mm/dd/yyyy)', () => {
      const result = DateUtils.parseDateValidation('01/15/2024', 'en-US')
      expect(result).toBeInstanceOf(Date)
      expect(result?.getDate()).toBe(15)
      expect(result?.getMonth()).toBe(0) // January = 0
    })

    it('should return null for empty string', () => {
      const result = DateUtils.parseDateValidation('')
      expect(result).toBeNull()
    })

    it('should return null for unsupported locale', () => {
      const result = DateUtils.parseDateValidation('15/01/2024', 'fr-FR')
      expect(result).toBeNull()
    })
  })
})

