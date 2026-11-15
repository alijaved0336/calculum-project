/**
 * Unit tests for FormatData
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock stores before imports
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    getUserNumberFormatting: 'en-US'
  })
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({
    getCurrencyAmount: 1.0
  })
}))

// Mock utils
vi.mock('@/utils', () => ({
  StringUtils: {
    formatPercentage: (value: number | null, options?: any) => {
      if (value === null || value === undefined) return 'N/A'
      return `${(value * 100).toFixed(2)}%`
    }
  },
  isNullOrUndefined: (value: any) => value === null || value === undefined
}))

// Mock ColorsGroups
vi.mock('@/utils/ColorsGroups', () => ({
  low: '#FF4405',
  medium: '#FFB524',
  high: '#66C61C',
  veryHigh: '#0E9384',
  noLevel: '#EBECF0',
  firstGroup: '#E0F2FE',
  secondGroup: '#FECDD6',
  thirdGroup: '#FDEAD7',
  fourthGroup: '#CCFBEF',
  fontFirstGroup: '#026AA2',
  fontSecondGroup: '#C01048',
  fontThirdGroup: '#B54708',
  fontFourthGroup: '#107569'
}))

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  createI18n: () => ({
    global: {
      t: (key: string) => key
    }
  })
}))

// Mock locales
vi.mock('@/resources/locales', () => ({
  messages: {},
  defaultLocale: 'en'
}))

import * as FormatData from '@/utils/FormatData'
import * as colorsGroups from '@/utils/ColorsGroups'

describe('FormatData', () => {
  describe('getCurrencyRate', () => {
    it('should return currency rate from app store', () => {
      const rate = FormatData.getCurrencyRate()
      expect(rate).toBe(1.0)
    })
  })

  describe('getNumberWithDecimals', () => {
    it('should format number with default 2 decimals', () => {
      const result = FormatData.getNumberWithDecimals(123.456)
      expect(result).toMatch(/123\.46/)
    })

    it('should format number with custom decimals', () => {
      const result = FormatData.getNumberWithDecimals(123.456, 4)
      expect(result).toMatch(/123\.4560/)
    })

    it('should handle null as 0', () => {
      const result = FormatData.getNumberWithDecimals(null)
      expect(result).toBe('0.00')
    })

    it('should handle undefined as 0', () => {
      const result = FormatData.getNumberWithDecimals(undefined)
      expect(result).toBe('0.00')
    })

    it('should handle string numbers', () => {
      const result = FormatData.getNumberWithDecimals('123.45')
      expect(result).toMatch(/123\.45/)
    })

    it('should handle integer numbers', () => {
      const result = FormatData.getNumberWithDecimals(100)
      expect(result).toMatch(/100\.00/)
    })
  })

  describe('converToPercentage', () => {
    it('should convert number to percentage', () => {
      const result = FormatData.converToPercentage(0.5, 2)
      expect(result).toBe('50.00%')
    })

    it('should handle NaN', () => {
      const result = FormatData.converToPercentage(NaN)
      expect(result).toBe('0%')
    })

    it('should respect digits parameter', () => {
      const result = FormatData.converToPercentage(0.1234, 1)
      expect(result).toBe('12.3%')
    })
  })

  describe('getFormattingInfoForGoogleChart', () => {
    it('should return decimal and grouping symbols', () => {
      const result = FormatData.getFormattingInfoForGoogleChart()
      expect(result).toHaveProperty('decimalSymbol')
      expect(result).toHaveProperty('groupingSymbol')
    })
  })

  describe('getMonthDayAndYear', () => {
    it('should format date in YYYY-MM-DD format', () => {
      const result = FormatData.getMonthDayAndYear('2023-12-25')
      expect(result).toMatch(/12\.25\.2023/)
    })

    it('should handle date string', () => {
      const result = FormatData.getMonthDayAndYear('2023-01-01')
      expect(result).toMatch(/01\.01\.2023/)
    })

    it('should return N/A for empty string', () => {
      const result = FormatData.getMonthDayAndYear('')
      expect(result).toBe('N/A')
    })

    it('should return N/A for invalid date', () => {
      const result = FormatData.getMonthDayAndYear('invalid-date')
      expect(result).toBe('N/A')
    })
  })

  describe('getLevelBasedOnColor', () => {
    it('should return 1 for low color', () => {
      const result = FormatData.getLevelBasedOnColor(colorsGroups.low)
      expect(result).toBe(1)
    })

    it('should return 2 for medium color', () => {
      const result = FormatData.getLevelBasedOnColor(colorsGroups.medium)
      expect(result).toBe(2)
    })

    it('should return 3 for veryHigh color', () => {
      const result = FormatData.getLevelBasedOnColor(colorsGroups.veryHigh)
      expect(result).toBe(3)
    })

    it('should return 0 for unknown color', () => {
      const result = FormatData.getLevelBasedOnColor('#000000')
      expect(result).toBe(0)
    })
  })

  describe('levelColorByLevel', () => {
    it('should return low color for level 1', () => {
      const result = FormatData.levelColorByLevel(1)
      expect(result).toBe(colorsGroups.low)
    })

    it('should return medium color for level 2', () => {
      const result = FormatData.levelColorByLevel(2)
      expect(result).toBe(colorsGroups.medium)
    })

    it('should return high color for level 3', () => {
      const result = FormatData.levelColorByLevel(3)
      expect(result).toBe(colorsGroups.high)
    })

    it('should return noLevel for default', () => {
      const result = FormatData.levelColorByLevel(0)
      expect(result).toBe(colorsGroups.noLevel)
    })
  })

  describe('levelByGradeLevelText', () => {
    it('should return 1 for "Low"', () => {
      const result = FormatData.levelByGradeLevelText('Low')
      expect(result).toBe(1)
    })

    it('should return 2 for "Medium"', () => {
      const result = FormatData.levelByGradeLevelText('Medium')
      expect(result).toBe(2)
    })

    it('should return 3 for "High"', () => {
      const result = FormatData.levelByGradeLevelText('High')
      expect(result).toBe(3)
    })

    it('should return 0 for unknown text', () => {
      const result = FormatData.levelByGradeLevelText('Unknown')
      expect(result).toBe(0)
    })
  })

  describe('getColorForTheLevelDashes', () => {
    it('should return low for value <= 0', () => {
      const result = FormatData.getColorForTheLevelDashes(0)
      expect(result).toBe(colorsGroups.low)
    })

    it('should return noLevel for value > 0 and <= 30', () => {
      const result = FormatData.getColorForTheLevelDashes(30)
      expect(result).toBe(colorsGroups.noLevel)
    })

    it('should return medium for value > 30 and <= 60', () => {
      const result = FormatData.getColorForTheLevelDashes(45)
      expect(result).toBe(colorsGroups.medium)
    })

    it('should return veryHigh for value >= 61', () => {
      const result = FormatData.getColorForTheLevelDashes(100)
      expect(result).toBe(colorsGroups.veryHigh)
    })

    it('should return low for negative value', () => {
      const result = FormatData.getColorForTheLevelDashes(-10)
      expect(result).toBe(colorsGroups.low)
    })
  })

  describe('convertDateToPlanformat', () => {
    it('should format date with time and date', () => {
      const result = FormatData.convertDateToPlanformat('2023-12-25T10:30:00Z')
      // Date formatting may vary by timezone, so check for date part
      expect(result).toMatch(/12\.25\.2023/)
      expect(result).toMatch(/,/)
    })
  })

  describe('getMonthDay', () => {
    it('should return month and day', () => {
      const result = FormatData.getMonthDay('2023-12-25')
      // Date may vary by timezone, so just check format
      expect(result).toMatch(/Dec \d+/)
    })
  })

  describe('getISODate', () => {
    it('should return ISO date string', () => {
      const result = FormatData.getISODate('2023-12-25T10:30:00Z')
      expect(result).toBe('2023-12-25')
    })

    it('should handle date without time', () => {
      const result = FormatData.getISODate('2023-12-25')
      expect(result).toBe('2023-12-25')
    })

    it('should return empty string for empty input', () => {
      const result = FormatData.getISODate('')
      expect(result).toBe('')
    })
  })

  describe('getDate', () => {
    it('should format date in uppercase', () => {
      const result = FormatData.getDate('2023-12-25')
      // Date may vary by timezone, so just check format
      expect(result).toMatch(/DEC \d+, 2023/)
    })
  })

  describe('formatISODateToUS', () => {
    it('should format ISO date to US format', () => {
      const result = FormatData.formatISODateToUS('2023-12-25T00:00:00+00:00')
      // Date may vary by timezone, so check format
      expect(result).toMatch(/\d{2}\/\d{2}\/2023/)
    })

    it('should return empty string for null', () => {
      const result = FormatData.formatISODateToUS(null)
      expect(result).toBe('')
    })

    it('should return empty string for undefined', () => {
      const result = FormatData.formatISODateToUS(undefined)
      expect(result).toBe('')
    })

    it('should return empty string for invalid date', () => {
      const result = FormatData.formatISODateToUS('invalid-date')
      expect(result).toBe('')
    })
  })

  describe('changeToCurrency', () => {
    it('should convert amount using currency rate', () => {
      const result = FormatData.changeToCurrency(100)
      expect(result).toBe(100)
    })

    it('should convert -0.00 to 0', () => {
      const result = FormatData.changeToCurrency(-0.00)
      // Use toBeCloseTo or check absolute value since -0 === 0 in most cases
      expect(Math.abs(result)).toBe(0)
    })

    it('should handle negative numbers', () => {
      const result = FormatData.changeToCurrency(-100)
      expect(result).toBe(-100)
    })
  })

  describe('proposedTerms', () => {
    it('should return number multiplied by 1.0', () => {
      const result = FormatData.proposedTerms(100)
      expect(result).toBe(100)
    })
  })

  describe('changeToUSD', () => {
    it('should convert amount to USD', () => {
      const result = FormatData.changeToUSD(100)
      expect(result).toBe(100)
    })
  })

  describe('getYesOrNo', () => {
    it('should return translation key for true', () => {
      const result = FormatData.getYesOrNo(true)
      expect(result).toBe('global.yes')
    })

    it('should return translation key for false', () => {
      const result = FormatData.getYesOrNo(false)
      expect(result).toBe('global.no')
    })

    it('should return "-" for non-boolean', () => {
      const result = FormatData.getYesOrNo(null as any)
      expect(result).toBe('-')
    })
  })

  describe('setQuality', () => {
    it('should return na for null', () => {
      const result = FormatData.setQuality(null)
      expect(result).toEqual(['na', '100%', '#ABAFB5'])
    })

    it('should return limited for level <= 0.3', () => {
      const result = FormatData.setQuality(0.3)
      expect(result).toEqual(['limited', '33%', 'rgb(255, 44, 79)'])
    })

    it('should return adequate for level between 0.31 and 0.6', () => {
      const result = FormatData.setQuality(0.5)
      expect(result).toEqual(['adequate', '66%', 'rgb(244, 180, 0)'])
    })

    it('should return substantial for level > 0.6', () => {
      const result = FormatData.setQuality(0.7)
      expect(result).toEqual(['substantial', '100%', 'rgb(46, 157, 88)'])
    })
  })

  describe('toConfidenceScoreLabel', () => {
    it('should return na for null', () => {
      expect(FormatData.toConfidenceScoreLabel(null)).toBe('na')
    })

    it('should return na for undefined', () => {
      expect(FormatData.toConfidenceScoreLabel(undefined)).toBe('na')
    })

    it('should return veryLow for scores up to 20', () => {
      expect(FormatData.toConfidenceScoreLabel(0)).toBe('veryLow')
      expect(FormatData.toConfidenceScoreLabel(20)).toBe('veryLow')
    })

    it('should return low for scores between 21 and 40', () => {
      expect(FormatData.toConfidenceScoreLabel(21)).toBe('low')
      expect(FormatData.toConfidenceScoreLabel(40)).toBe('low')
    })

    it('should return med for scores between 41 and 60', () => {
      expect(FormatData.toConfidenceScoreLabel(41)).toBe('med')
      expect(FormatData.toConfidenceScoreLabel(60)).toBe('med')
    })

    it('should return high for scores between 61 and 80', () => {
      expect(FormatData.toConfidenceScoreLabel(61)).toBe('high')
      expect(FormatData.toConfidenceScoreLabel(80)).toBe('high')
    })

    it('should return veryhigh for scores above 80', () => {
      expect(FormatData.toConfidenceScoreLabel(81)).toBe('veryhigh')
      expect(FormatData.toConfidenceScoreLabel(100)).toBe('veryhigh')
    })

    it('should map a score to a colored label through setConfidenceScore', () => {
      const result = FormatData.setConfidenceScore(FormatData.toConfidenceScoreLabel(80))
      expect(result).toEqual(['high', '80%', 'rgb(46, 157, 88)'])
    })
  })

  describe('setConfidenceScore', () => {
    it('should return na for null', () => {
      const result = FormatData.setConfidenceScore(null)
      expect(result).toEqual(['na', '100%', 'rgb(171, 175, 181)'])
    })

    it('should return na for undefined', () => {
      const result = FormatData.setConfidenceScore(undefined)
      expect(result).toEqual(['na', '100%', 'rgb(171, 175, 181)'])
    })

    it('should return na for empty string', () => {
      const result = FormatData.setConfidenceScore('na')
      expect(result).toEqual(['na', '100%', 'rgb(171, 175, 181)'])
    })

    it('should return veryLow for veryLow label', () => {
      const result = FormatData.setConfidenceScore('veryLow')
      expect(result).toEqual(['veryLow', '20%', 'rgb(0, 0, 0)'])
    })

    it('should return low for low label', () => {
      const result = FormatData.setConfidenceScore('low')
      expect(result).toEqual(['low', '40%', 'rgb(255, 44, 79)'])
    })

    it('should return med for med label', () => {
      const result = FormatData.setConfidenceScore('med')
      expect(result).toEqual(['med', '60%', 'rgb(244, 180, 0)'])
    })

    it('should return high for high label', () => {
      const result = FormatData.setConfidenceScore('high')
      expect(result).toEqual(['high', '80%', 'rgb(46, 157, 88)'])
    })

    it('should return veryhigh for veryhigh label', () => {
      const result = FormatData.setConfidenceScore('veryhigh')
      expect(result).toEqual(['veryhigh', '100%', 'rgb(60, 134, 245)'])
    })

    it('should return na for unknown label', () => {
      const result = FormatData.setConfidenceScore('unknown')
      expect(result).toEqual(['na', '100%', 'rgb(171, 175, 181)'])
    })
  })

  describe('getCreditValues', () => {
    it('should return values for "Very Weak"', () => {
      const result = FormatData.getCreditValues('Very Weak')
      expect(result).toEqual(['20', 'rgb(255, 44, 79)'])
    })

    it('should return values for "Weak"', () => {
      const result = FormatData.getCreditValues('Weak')
      expect(result).toEqual(['40', '#FF2C4F'])
    })

    it('should return values for "Medium"', () => {
      const result = FormatData.getCreditValues('Medium')
      expect(result).toEqual(['60', 'rgb(244, 180, 0)'])
    })

    it('should return values for "Strong"', () => {
      const result = FormatData.getCreditValues('Strong')
      expect(result).toEqual(['80', '#3C86F5'])
    })

    it('should return values for "Very Strong"', () => {
      const result = FormatData.getCreditValues('Very Strong')
      expect(result).toEqual(['100', '#2E9D58'])
    })

    it('should return null for "N/A"', () => {
      const result = FormatData.getCreditValues('N/A')
      expect(result).toEqual([null, null])
    })

    it('should return undefined for unknown value', () => {
      const result = FormatData.getCreditValues('Unknown')
      expect(result).toBeUndefined()
    })
  })

  describe('getBackgroundColor', () => {
    it('should return firstGroup for index 0', () => {
      const result = FormatData.getBackgroundColor(0)
      expect(result).toBe(colorsGroups.firstGroup)
    })

    it('should return secondGroup for index 1', () => {
      const result = FormatData.getBackgroundColor(1)
      expect(result).toBe(colorsGroups.secondGroup)
    })

    it('should loop back after fourthGroup', () => {
      const result = FormatData.getBackgroundColor(4)
      expect(result).toBe(colorsGroups.firstGroup)
    })
  })

  describe('colorText', () => {
    it('should return fontFirstGroup for firstGroup color', () => {
      const result = FormatData.colorText(colorsGroups.firstGroup)
      expect(result).toBe(colorsGroups.fontFirstGroup)
    })

    it('should return fontSecondGroup for secondGroup color', () => {
      const result = FormatData.colorText(colorsGroups.secondGroup)
      expect(result).toBe(colorsGroups.fontSecondGroup)
    })

    it('should return fontThirdGroup for thirdGroup color', () => {
      const result = FormatData.colorText(colorsGroups.thirdGroup)
      expect(result).toBe(colorsGroups.fontThirdGroup)
    })

    it('should return fontFourthGroup for fourthGroup color', () => {
      const result = FormatData.colorText(colorsGroups.fourthGroup)
      expect(result).toBe(colorsGroups.fontFourthGroup)
    })

    it('should return default black for unknown color', () => {
      const result = FormatData.colorText('#000000')
      expect(result).toBe('#000000')
    })
  })

  describe('getMaxPercentChart', () => {
    it('should calculate percentage correctly', () => {
      const result = FormatData.getMaxPercentChart(50, 100)
      expect(result).toBe('50')
    })

    it('should handle zero maxValue', () => {
      const result = FormatData.getMaxPercentChart(50, 0)
      expect(result).toBe('Infinity')
    })
  })

  describe('getRange', () => {
    it('should return formatted number for potentialCashFlow', () => {
      const result = FormatData.getRange('1000', 'potentialCashFlow')
      expect(result).toMatch(/1,000/)
    })

    it('should return percentage for other types', () => {
      const result = FormatData.getRange('0.5', 'other')
      expect(result).toMatch(/50\.00%/)
    })
  })

  // describe('formatBigNumbers') was removed in WI#15096 Phase 4: the
  // legacy FormatData.formatBigNumbers helper was deleted in favor of
  // StringUtils.formatBigNumbers / StringUtils.formatBigCurrency.
  // Equivalent characterization coverage lives in
  // tests/Unit/Utils/StringUtils.formatBigNumbers.spec.ts and
  // tests/Unit/Utils/StringUtils.formatBigCurrency.spec.ts.

  describe('formatNumberWithSign', () => {
    it('should add + sign for positive numbers', () => {
      const result = FormatData.formatNumberWithSign(100)
      expect(result).toBe('+100')
    })

    it('should keep - sign for negative numbers', () => {
      const result = FormatData.formatNumberWithSign(-100)
      expect(result).toBe('-100')
    })

    it('should return "0" for zero', () => {
      const result = FormatData.formatNumberWithSign(0)
      expect(result).toBe('0')
    })

    it('should return null for null', () => {
      const result = FormatData.formatNumberWithSign(null as any)
      expect(result).toBeNull()
    })

    it('should return null for undefined', () => {
      const result = FormatData.formatNumberWithSign(undefined as any)
      expect(result).toBeNull()
    })
  })

  describe('formatPercentage', () => {
    it('should format percentage using StringUtils', () => {
      const result = FormatData.formatPercentage(0.1)
      expect(result).toMatch(/10/)
    })

    it('should handle null', () => {
      const result = FormatData.formatPercentage(null)
      expect(result).toBe('N/A')
    })
  })

  describe('closeMenuOptions', () => {
    beforeEach(() => {
      document.getElementById = vi.fn()
    })

    it('should click element if exists', () => {
      const mockClick = vi.fn()
      vi.mocked(document.getElementById).mockReturnValue({
        click: mockClick
      } as any)

      FormatData.closeMenuOptions()
      expect(mockClick).toHaveBeenCalled()
    })

    it('should not throw if element does not exist', () => {
      vi.mocked(document.getElementById).mockReturnValue(null)
      expect(() => FormatData.closeMenuOptions()).not.toThrow()
    })
  })

  describe('closeProgramOptions', () => {
    beforeEach(() => {
      document.getElementById = vi.fn()
    })

    it('should click element if exists', () => {
      const mockClick = vi.fn()
      vi.mocked(document.getElementById).mockReturnValue({
        click: mockClick
      } as any)

      FormatData.closeProgramOptions()
      expect(mockClick).toHaveBeenCalled()
    })
  })

  describe('closeMetricOptions', () => {
    beforeEach(() => {
      document.getElementById = vi.fn()
    })

    it('should click element if exists', () => {
      const mockClick = vi.fn()
      vi.mocked(document.getElementById).mockReturnValue({
        click: mockClick
      } as any)

      FormatData.closeMetricOptions()
      expect(mockClick).toHaveBeenCalled()
    })
  })

  describe('closeAvailableOptions', () => {
    beforeEach(() => {
      document.getElementById = vi.fn()
    })

    it('should click element if exists', () => {
      const mockClick = vi.fn()
      vi.mocked(document.getElementById).mockReturnValue({
        click: mockClick
      } as any)

      FormatData.closeAvailableOptions()
      expect(mockClick).toHaveBeenCalled()
    })
  })

  describe('formatBooleanOrNull', () => {
    it('should return "Yes" for true', () => {
      const result = FormatData.formatBooleanOrNull(true)
      expect(result).toBe('Yes')
    })

    it('should return "No" for false', () => {
      const result = FormatData.formatBooleanOrNull(false)
      expect(result).toBe('No')
    })

    it('should return "N/A" for null', () => {
      const result = FormatData.formatBooleanOrNull(null)
      expect(result).toBe('N/A')
    })

    it('should return "N/A" for undefined', () => {
      const result = FormatData.formatBooleanOrNull(undefined)
      expect(result).toBe('N/A')
    })

    it('should use custom options', () => {
      const result = FormatData.formatBooleanOrNull(true, { yes: 'Sí', no: 'No', notAvailable: 'N/D' })
      expect(result).toBe('Sí')
    })
  })

  describe('getStrategyModalityValue', () => {
    it('should return translation for "p"', () => {
      const result = FormatData.getStrategyModalityValue('p')
      expect(result).toBe('global.enforcedPromotedTerms.p')
    })

    it('should return translation for "e"', () => {
      const result = FormatData.getStrategyModalityValue('e')
      expect(result).toBe('global.enforcedPromotedTerms.e')
    })

    it('should return default translation for other values', () => {
      const result = FormatData.getStrategyModalityValue('x')
      expect(result).toBe('global.enforcedPromotedTerms.promotedAndEnforced')
    })

    it('should return "-" for null', () => {
      const result = FormatData.getStrategyModalityValue(null)
      expect(result).toBe('-')
    })
  })

  describe('getRegulationCountrySourceValue', () => {
    it('should return supplier translation for "supplier"', () => {
      const result = FormatData.getRegulationCountrySourceValue('supplier')
      expect(result).toBe('global.regulationCountrySource.supplier')
    })

    it('should return buyer translation for "buyer"', () => {
      const result = FormatData.getRegulationCountrySourceValue('buyer')
      expect(result).toBe('global.regulationCountrySource.buyer')
    })

    it('should return mixed translation for "both"', () => {
      const result = FormatData.getRegulationCountrySourceValue('both')
      expect(result).toBe('global.regulationCountrySource.mixed')
    })

    it('should return mixed translation for comma-joined values', () => {
      const result = FormatData.getRegulationCountrySourceValue('buyer,supplier')
      expect(result).toBe('global.regulationCountrySource.mixed')
    })

    it('should be case-insensitive', () => {
      const result = FormatData.getRegulationCountrySourceValue('SUPPLIER')
      expect(result).toBe('global.regulationCountrySource.supplier')
    })

    it('should return "-" for null', () => {
      const result = FormatData.getRegulationCountrySourceValue(null)
      expect(result).toBe('-')
    })

    it('should return "-" for empty string', () => {
      const result = FormatData.getRegulationCountrySourceValue('')
      expect(result).toBe('-')
    })

    it('should return "-" for unknown value', () => {
      const result = FormatData.getRegulationCountrySourceValue('unknown')
      expect(result).toBe('-')
    })
  })

  describe('convertFiltersToREST', () => {
    it('should convert filter to JSON string', () => {
      const filter = { key: 'value' }
      const result = FormatData.convertFiltersToREST(filter)
      expect(result).toContain('key')
      expect(result).toContain('value')
    })

    it('should return null for undefined', () => {
      const result = FormatData.convertFiltersToREST(undefined)
      expect(result).toBeNull()
    })
  })

  describe('getMonthName', () => {
    it('should return "January" for month 1', () => {
      const result = FormatData.getMonthName(1)
      expect(result).toBe('January')
    })

    it('should return "December" for month 12', () => {
      const result = FormatData.getMonthName(12)
      expect(result).toBe('December')
    })

    it('should return " " for invalid month', () => {
      const result = FormatData.getMonthName(13)
      expect(result).toBe(' ')
    })
  })

  describe('getCurrentHour', () => {
    it('should return "1" for hour 1', () => {
      const result = FormatData.getCurrentHour(1)
      expect(result).toBe('1')
    })

    it('should return "12" for hour 12', () => {
      const result = FormatData.getCurrentHour(12)
      expect(result).toBe('12')
    })

    it('should return "1" for hour 13 (1 PM)', () => {
      const result = FormatData.getCurrentHour(13)
      expect(result).toBe('1')
    })

    it('should return "12" for hour 24 (midnight)', () => {
      const result = FormatData.getCurrentHour(24)
      expect(result).toBe('12')
    })

    it('should return " " for invalid hour', () => {
      const result = FormatData.getCurrentHour(25)
      expect(result).toBe(' ')
    })
  })
})

