/**
 * Unit tests for StringUtils
 */

import { describe, it, expect, vi } from 'vitest'

// Mock isNullOrUndefined to prevent loading the barrel export
vi.mock('@/utils', () => ({
  isNullOrUndefined: (value: any) => value === null || value === undefined
}))

// StringUtils now imports changeToCurrency from ./FormatData; mock it so this
// spec does not transitively pull vue-i18n / locales / stores.
vi.mock('@/utils/FormatData', () => ({
  changeToCurrency: (value: number) => value,
}))

import StringUtils from '@/utils/StringUtils'
import { removeDuplicateLines } from '@/utils/StringUtils'

describe('StringUtils', () => {
  describe('isEmpty', () => {
    it('should return true for empty string', () => {
      expect(StringUtils.isEmpty('')).toBe(true)
    })

    it('should return false for non-empty string', () => {
      expect(StringUtils.isEmpty('hello')).toBe(false)
    })

    it('should return false for string with whitespace', () => {
      expect(StringUtils.isEmpty(' ')).toBe(false)
    })
  })

  describe('isNullUndefinedOrEmpty', () => {
    it('should return true for empty string', () => {
      expect(StringUtils.isNullUndefinedOrEmpty('')).toBe(true)
    })

    it('should return true for null', () => {
      expect(StringUtils.isNullUndefinedOrEmpty(null)).toBe(true)
    })

    it('should return true for undefined', () => {
      expect(StringUtils.isNullUndefinedOrEmpty(undefined)).toBe(true)
    })

    it('should return false for non-empty string', () => {
      expect(StringUtils.isNullUndefinedOrEmpty('hello')).toBe(false)
    })
  })

  describe('capitalizeFirstCharacter', () => {
    it('should capitalize first character', () => {
      expect(StringUtils.capitalizeFirstCharacter('hello')).toBe('Hello')
    })

    it('should handle already capitalized string', () => {
      expect(StringUtils.capitalizeFirstCharacter('Hello')).toBe('Hello')
    })

    it('should handle single character', () => {
      expect(StringUtils.capitalizeFirstCharacter('a')).toBe('A')
    })

    it('should handle uppercase first character', () => {
      expect(StringUtils.capitalizeFirstCharacter('HELLO')).toBe('HELLO')
    })
  })

  describe('transformFromCamelCaseToReadable', () => {
    it('should transform camelCase to readable format', () => {
      expect(StringUtils.transformFromCamelCaseToReadable('companySize')).toBe('Company Size')
    })

    it('should handle PascalCase', () => {
      expect(StringUtils.transformFromCamelCaseToReadable('EntityIndustryName')).toBe('Entity Industry Name')
    })

    it('should return empty string for empty input', () => {
      expect(StringUtils.transformFromCamelCaseToReadable('')).toBe('')
    })

    it('should handle single word', () => {
      expect(StringUtils.transformFromCamelCaseToReadable('entity')).toBe('Entity')
    })

    it('should handle already spaced text', () => {
      expect(StringUtils.transformFromCamelCaseToReadable('entity')).toBe('Entity')
    })
  })

  describe('transformFromPipeSeparatedToArray', () => {
    it('should split pipe-separated string into array', () => {
      const result = StringUtils.transformFromPipeSeparatedToArray('entity|industry|name')
      expect(result).toEqual(['entity', 'industry', 'name'])
    })

    it('should handle single item', () => {
      const result = StringUtils.transformFromPipeSeparatedToArray('entity')
      expect(result).toEqual(['entity'])
    })

    it('should handle empty items', () => {
      const result = StringUtils.transformFromPipeSeparatedToArray('entity||name')
      expect(result).toEqual(['entity', '', 'name'])
    })
  })

  describe('formatBigNumbers', () => {
    it('should format millions with "m" suffix', () => {
      expect(StringUtils.formatBigNumbers(1000000)).toBe('1.0m')
    })

    it('should format thousands with "k" suffix', () => {
      expect(StringUtils.formatBigNumbers(1500)).toBe('1.5k')
    })

    it('should format billions with "b" suffix', () => {
      expect(StringUtils.formatBigNumbers(1000000000)).toBe('1.0b')
    })

    it('should format trillions with "t" suffix', () => {
      expect(StringUtils.formatBigNumbers(1000000000000)).toBe('1.0t')
    })

    it('should return "0" for zero', () => {
      expect(StringUtils.formatBigNumbers(0)).toBe('0')
    })

    it('should handle numbers less than 1000', () => {
      expect(StringUtils.formatBigNumbers(500)).toBe('500.0')
    })

    it('should respect maximumFractionDigits option', () => {
      const result = StringUtils.formatBigNumbers(1500000, { maximumFractionDigits: 2 })
      expect(result).toMatch(/1\.\d{1,2}m/)
    })

    it('should handle negative numbers', () => {
      const result = StringUtils.formatBigNumbers(-1000000)
      expect(result).toBe('-1.0m')
    })
  })

  describe('formatPercentage', () => {
    it('should format decimal as percentage', () => {
      expect(StringUtils.formatPercentage(0.1)).toMatch(/10/)
    })

    it('should format zero', () => {
      expect(StringUtils.formatPercentage(0)).toMatch(/0/)
    })

    it('should return N/A for null', () => {
      expect(StringUtils.formatPercentage(null)).toBe('N/A')
    })

    it('should return N/A for undefined', () => {
      expect(StringUtils.formatPercentage(undefined)).toBe('N/A')
    })

    it('should handle whole number percentages', () => {
      expect(StringUtils.formatPercentage(1)).toMatch(/100/)
    })
  })

  describe('removeIRI', () => {
    it('should extract ID from IRI', () => {
      const result = StringUtils.removeIRI('/api/users/9a56c19d-cccc-4f4f-4f4f-123473f60342')
      expect(result).toBe('9a56c19d-cccc-4f4f-4f4f-123473f60342')
    })

    it('should return empty string for null', () => {
      expect(StringUtils.removeIRI(null)).toBe('')
    })

    it('should return empty string for undefined', () => {
      expect(StringUtils.removeIRI(undefined)).toBe('')
    })

    it('should return original string if no slash found', () => {
      expect(StringUtils.removeIRI('simple-id')).toBe('simple-id')
    })

    it('should handle multiple slashes', () => {
      const result = StringUtils.removeIRI('/api/v1/users/123')
      expect(result).toBe('123')
    })
  })

  describe('getPlusPrefixItemsCountMinusOne', () => {
    it('should return empty string for single item', () => {
      expect(StringUtils.getPlusPrefixItemsCountMinusOne('item1')).toBe('')
    })

    it('should return +1 for two items', () => {
      expect(StringUtils.getPlusPrefixItemsCountMinusOne('item1,item2')).toBe('+1')
    })

    it('should return +2 for three items', () => {
      expect(StringUtils.getPlusPrefixItemsCountMinusOne('item1,item2,item3')).toBe('+2')
    })
  })

  describe('addPercentSignToString', () => {
    it('should add percent sign to number', () => {
      expect(StringUtils.addPercentSignToString(50)).toBe('50%')
    })

    it('should handle decimal numbers', () => {
      expect(StringUtils.addPercentSignToString(33.5)).toBe('33.5%')
    })
  })

  describe('validateFieldInArray', () => {
    it('should return true for fields in array', () => {
      expect(StringUtils.validateFieldInArray('entityName')).toBe(true)
      expect(StringUtils.validateFieldInArray('entityIndustryName')).toBe(true)
    })

    it('should return false for fields not in array', () => {
      expect(StringUtils.validateFieldInArray('otherField')).toBe(false)
    })
  })

  describe('getDomains', () => {
    it('should split comma-separated domains', () => {
      const result = StringUtils.getDomains('example.com, test.com, demo.com')
      expect(result).toEqual(['example.com', 'test.com', 'demo.com'])
    })

    it('should filter empty domains', () => {
      const result = StringUtils.getDomains('example.com, , test.com')
      expect(result).toEqual(['example.com', 'test.com'])
    })

    it('should return empty array for null', () => {
      const result = StringUtils.getDomains(null as any)
      expect(result).toEqual([])
    })
  })

  describe('getEmails', () => {
    it('should split comma-separated emails', () => {
      const result = StringUtils.getEmails('test@example.com, user@test.com')
      expect(result).toEqual(['test@example.com', 'user@test.com'])
    })

    it('should filter empty emails', () => {
      const result = StringUtils.getEmails('test@example.com, , user@test.com')
      expect(result).toEqual(['test@example.com', 'user@test.com'])
    })

    it('should return empty array for null', () => {
      const result = StringUtils.getEmails(null as any)
      expect(result).toEqual([])
    })

    it('should filter whitespace-only entries', () => {
      const result = StringUtils.getEmails('test@example.com,   ,\t,user@test.com')
      expect(result).toEqual(['test@example.com', 'user@test.com'])
    })

    it('should deduplicate exact matches', () => {
      const result = StringUtils.getEmails('test@example.com, user@test.com, test@example.com')
      expect(result).toEqual(['test@example.com', 'user@test.com'])
    })

    it('should deduplicate case-insensitively and keep first occurrence casing', () => {
      const result = StringUtils.getEmails('Test@Example.com, user@test.com, test@example.com')
      expect(result).toEqual(['Test@Example.com', 'user@test.com'])
    })
  })

  describe('formatNumberWithOneDecimal', () => {
    it('should format positive numbers with 1 decimal', () => {
      expect(StringUtils.formatNumberWithOneDecimal(1234.567)).toBe('1,234.6')
    })

    it('should format large numbers with thousands separators', () => {
      expect(StringUtils.formatNumberWithOneDecimal(1234567.89)).toBe('1,234,567.9')
    })

    it('should format zero with 1 decimal', () => {
      expect(StringUtils.formatNumberWithOneDecimal(0)).toBe('0.0')
    })

    it('should format negative numbers with 1 decimal', () => {
      expect(StringUtils.formatNumberWithOneDecimal(-1234.567)).toBe('-1,234.6')
    })

    it('should format integers with 1 decimal', () => {
      expect(StringUtils.formatNumberWithOneDecimal(1000)).toBe('1,000.0')
    })

    it('should format very small numbers with 1 decimal', () => {
      expect(StringUtils.formatNumberWithOneDecimal(0.123)).toBe('0.1')
    })

    it('should format very large numbers with 1 decimal', () => {
      // 999999999.99 rounds to 1000000000.0
      expect(StringUtils.formatNumberWithOneDecimal(999999999.99)).toBe('1,000,000,000.0')
    })

    it('should return "-" for null', () => {
      expect(StringUtils.formatNumberWithOneDecimal(null)).toBe('-')
    })

    it('should return "-" for undefined', () => {
      expect(StringUtils.formatNumberWithOneDecimal(undefined)).toBe('-')
    })

    it('should handle numbers that round up', () => {
      expect(StringUtils.formatNumberWithOneDecimal(1234.96)).toBe('1,235.0')
    })

    it('should handle numbers that round down', () => {
      expect(StringUtils.formatNumberWithOneDecimal(1234.94)).toBe('1,234.9')
    })

    it('should format numbers with exactly 1 decimal place', () => {
      expect(StringUtils.formatNumberWithOneDecimal(123.4)).toBe('123.4')
    })

    it('should format numbers with multiple decimal places correctly', () => {
      expect(StringUtils.formatNumberWithOneDecimal(123.456789)).toBe('123.5')
    })
  })
})

describe('removeDuplicateLines', () => {
  it('should remove duplicate words', () => {
    const result = removeDuplicateLines('hello world hello test')
    expect(result).toBe('hello world test')
  })

  it('should handle single word', () => {
    const result = removeDuplicateLines('hello')
    expect(result).toBe('hello')
  })

  it('should join with newlines when jumpLine is true', () => {
    const result = removeDuplicateLines('hello world hello', true)
    expect(result).toBe('hello\nworld')
  })

  it('should trim whitespace', () => {
    const result = removeDuplicateLines('  hello   world  hello  ')
    expect(result).toBe('hello world')
  })
})

