/**
 * Tests for useCreditRatingFeature composable
 *
 * Covers:
 * - featureCreditRatingEnabled computed property
 * - creditRatingColumnsDisplayBasedOnCreditRatingFeature() column filtering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

// Create a mutable ref for the feature flag
let mockUseFeatureCreditRating = ref<boolean>(false)

// Mock the useUser composable
vi.mock('@/composables', () => ({
  useUser: () => ({
    useFeatureCreditRating: mockUseFeatureCreditRating,
  }),
}))

import useFeatureCreditRating from '@/composables/useCreditRatingFeature'

describe('useCreditRatingFeature', () => {
  beforeEach(() => {
    mockUseFeatureCreditRating.value = false
  })

  describe('featureCreditRatingEnabled', () => {
    it('should return false when feature is disabled', () => {
      mockUseFeatureCreditRating.value = false
      const { featureCreditRatingEnabled } = useFeatureCreditRating()

      expect(featureCreditRatingEnabled.value).toBe(false)
    })

    it('should return true when feature is enabled', () => {
      mockUseFeatureCreditRating.value = true
      const { featureCreditRatingEnabled } = useFeatureCreditRating()

      expect(featureCreditRatingEnabled.value).toBe(true)
    })

    it('should be reactive to changes', () => {
      mockUseFeatureCreditRating.value = false
      const { featureCreditRatingEnabled } = useFeatureCreditRating()

      expect(featureCreditRatingEnabled.value).toBe(false)

      mockUseFeatureCreditRating.value = true
      expect(featureCreditRatingEnabled.value).toBe(true)
    })
  })

  describe('creditRatingColumnsDisplayBasedOnCreditRatingFeature', () => {
    const allColumns = [
      { field: 'entityName', title: 'Name' },
      { field: 'spendAmount', title: 'Spend' },
      { field: 'creditRating', title: 'Credit Rating' },
      { field: 'entityStockPerformanceMarketIndex', title: 'Market Index' },
      { field: 'creditScoreSource', title: 'Score Source' },
      { field: 'creditScore', title: 'Credit Score' },
      { field: 'paymentTerms', title: 'Payment Terms' },
    ]

    it('should return all columns when feature is enabled', () => {
      mockUseFeatureCreditRating.value = true
      const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()

      const result = creditRatingColumnsDisplayBasedOnCreditRatingFeature(allColumns)

      expect(result).toEqual(allColumns)
      expect(result).toHaveLength(7)
    })

    it('should filter out credit rating columns when feature is disabled', () => {
      mockUseFeatureCreditRating.value = false
      const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()

      const result = creditRatingColumnsDisplayBasedOnCreditRatingFeature(allColumns)

      expect(result).toHaveLength(3)
      expect(result.map((c: any) => c.field)).toEqual([
        'entityName',
        'spendAmount',
        'paymentTerms',
      ])
    })

    it('should filter out creditRating field when feature is disabled', () => {
      mockUseFeatureCreditRating.value = false
      const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()

      const result = creditRatingColumnsDisplayBasedOnCreditRatingFeature(allColumns)

      expect(result.find((c: any) => c.field === 'creditRating')).toBeUndefined()
    })

    it('should filter out creditScore field when feature is disabled', () => {
      mockUseFeatureCreditRating.value = false
      const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()

      const result = creditRatingColumnsDisplayBasedOnCreditRatingFeature(allColumns)

      expect(result.find((c: any) => c.field === 'creditScore')).toBeUndefined()
    })

    it('should filter out entityStockPerformanceMarketIndex field when feature is disabled', () => {
      mockUseFeatureCreditRating.value = false
      const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()

      const result = creditRatingColumnsDisplayBasedOnCreditRatingFeature(allColumns)

      expect(result.find((c: any) => c.field === 'entityStockPerformanceMarketIndex')).toBeUndefined()
    })

    it('should filter out creditScoreSource field when feature is disabled', () => {
      mockUseFeatureCreditRating.value = false
      const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()

      const result = creditRatingColumnsDisplayBasedOnCreditRatingFeature(allColumns)

      expect(result.find((c: any) => c.field === 'creditScoreSource')).toBeUndefined()
    })

    it('should NOT filter out countryCreditRating (out of scope)', () => {
      mockUseFeatureCreditRating.value = false
      const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()

      const columnsWithCountry = [
        ...allColumns,
        { field: 'countryCreditRating', title: 'Country Credit Rating' },
      ]

      const result = creditRatingColumnsDisplayBasedOnCreditRatingFeature(columnsWithCountry)

      expect(result.find((c: any) => c.field === 'countryCreditRating')).toBeDefined()
    })

    it('should return empty array when input is empty', () => {
      mockUseFeatureCreditRating.value = false
      const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()

      const result = creditRatingColumnsDisplayBasedOnCreditRatingFeature([])

      expect(result).toEqual([])
    })

    it('should return all columns unchanged when no credit rating columns exist', () => {
      mockUseFeatureCreditRating.value = false
      const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()

      const nonCreditColumns = [
        { field: 'entityName', title: 'Name' },
        { field: 'spendAmount', title: 'Spend' },
        { field: 'paymentTerms', title: 'Payment Terms' },
      ]

      const result = creditRatingColumnsDisplayBasedOnCreditRatingFeature(nonCreditColumns)

      expect(result).toEqual(nonCreditColumns)
      expect(result).toHaveLength(3)
    })
  })
})
