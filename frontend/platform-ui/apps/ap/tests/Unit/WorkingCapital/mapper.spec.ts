import { describe, it, expect } from 'vitest'
import { mapApiResponseToResult } from '@/modules/home/workingCapital/utils/mapper'
import type { WorkingCapitalCompareApiResponse } from '@/modules/home/workingCapital/types'

const BASE_VERSION = { uuid: 'uuid-base', version: 3, name: 'Acme', initialDate: '2024-01-01', finalDate: '2024-12-31', year: '2024' }
const LATEST_VERSION = { uuid: 'uuid-latest', version: 4, name: 'Acme', initialDate: '2025-01-01', finalDate: '2025-12-31', year: '2025' }

function makeResponse(overrides: Partial<WorkingCapitalCompareApiResponse> = {}): WorkingCapitalCompareApiResponse {
  return {
    baseVersion:          BASE_VERSION,
    latestVersion:        LATEST_VERSION,
    minDays:              5,
    currency:             'USD',
    summary:              {},
    supplierCoverage:     {},
    wapt:                 {},
    cashFlowByCountry:    [],
    paymentTermsByCountry: [],
    topSuppliers:         [],
    topSuppliersTotal:    0,
    ...overrides,
  }
}

describe('mapApiResponseToResult', () => {
  describe('year fields', () => {
    it('maps baseVersion.year to fromYear and latestVersion.year to toYear', () => {
      const result = mapApiResponseToResult(makeResponse())
      expect(result.fromYear).toBe('2024')
      expect(result.toYear).toBe('2025')
    })
  })

  describe('date fields (month-aware labels, e.g. WAPT Improvement chart)', () => {
    it('maps baseVersion.finalDate to fromDate and latestVersion.finalDate to toDate', () => {
      const result = mapApiResponseToResult(makeResponse())
      expect(result.fromDate).toBe('2024-12-31')
      expect(result.toDate).toBe('2025-12-31')
    })
  })

  describe('empty sections (siblings WI#17229 / WI#17231 not yet shipped)', () => {
    it('returns zero defaults when summary is empty', () => {
      const result = mapApiResponseToResult(makeResponse())
      expect(result.totalImprovedCashFlow).toBe(0)
      expect(result.targetCashFlow).toBe(0)
      expect(result.improvedTargetCashFlow).toBe(0)
      expect(result.suppliersImproved).toBe(0)
      expect(result.targetAchievementPct).toBe(0)
    })

    it('returns zero defaults when supplierCoverage is empty', () => {
      const result = mapApiResponseToResult(makeResponse())
      expect(result.suppliersMatchNotIncreased).toBe(0)
      expect(result.suppliersNotMatched).toBe(0)
      expect(result.suppliersPresentOnlyInOlderFile).toBe(0)
      expect(result.totalAnalyzed).toBe(0)
    })

    it('returns zero defaults when wapt is empty', () => {
      const result = mapApiResponseToResult(makeResponse())
      expect(result.waptGainDays).toBe(0)
      expect(result.waptFromDays).toBe(0)
      expect(result.waptToDays).toBe(0)
      expect(result.waptTargetDays).toBe(0)
    })

    it('returns zero-value nested objects when wapt is empty', () => {
      const result = mapApiResponseToResult(makeResponse())
      expect(result.matchedSuppliers).toEqual({ waptFrom: 0, waptTo: 0, waptTargetFrom: 0, waptTarget: 0 })
      expect(result.improvedSuppliers).toEqual({ waptFrom: 0, waptTo: 0, waptTargetFrom: 0, waptTarget: 0 })
    })

    it('passes through empty arrays for cashFlowByCountry, paymentTermsByCountry, topSuppliers', () => {
      const result = mapApiResponseToResult(makeResponse())
      expect(result.cashFlowByCountry).toEqual([])
      expect(result.paymentTermsByCountry).toEqual([])
      expect(result.topSuppliers).toEqual([])
    })
  })

  describe('summary section (WI#17229)', () => {
    it('maps summary fields when present', () => {
      const result = mapApiResponseToResult(makeResponse({
        summary: {
          totalImprovedCashFlow: 194_559_413,
          targetCashFlow:        246_588_076,
          suppliersImproved:     1_236,
          targetAchievementPct:  79,
        },
      }))
      expect(result.totalImprovedCashFlow).toBe(194_559_413)
      expect(result.targetCashFlow).toBe(246_588_076)
      expect(result.suppliersImproved).toBe(1_236)
      expect(result.targetAchievementPct).toBe(79)
    })
  })

  describe('improvedTargetCashFlow field (AC-03 — not yet populated by the backend)', () => {
    it('defaults to 0 when summary.improvedTargetCashFlow is absent', () => {
      const result = mapApiResponseToResult(makeResponse({
        summary: { targetCashFlow: 246_588_076 },
      }))
      expect(result.improvedTargetCashFlow).toBe(0)
    })

    it('maps summary.improvedTargetCashFlow when present', () => {
      const result = mapApiResponseToResult(makeResponse({
        summary: { improvedTargetCashFlow: 120_000_000 },
      }))
      expect(result.improvedTargetCashFlow).toBe(120_000_000)
    })
  })

  describe('list caps (AC-08/AC-09)', () => {
    const country = (i: number) => ({ country: `Country ${i}`, amount: i })
    const paymentTerms = (i: number) => ({ country: `Country ${i}`, waptFrom: i, increase: i })
    const supplier = (i: number) => ({ supplier: `Supplier ${i}`, country: 'Japan', cashFlow: i, termsFrom: 30, termsTo: 60, extension: 30 })

    it('caps cashFlowByCountry, paymentTermsByCountry, and topSuppliers at 10 entries', () => {
      const result = mapApiResponseToResult(makeResponse({
        cashFlowByCountry:     Array.from({ length: 15 }, (_, i) => country(i)),
        paymentTermsByCountry: Array.from({ length: 12 }, (_, i) => paymentTerms(i)),
        topSuppliers:          Array.from({ length: 11 }, (_, i) => supplier(i)),
      }))
      expect(result.cashFlowByCountry).toHaveLength(10)
      expect(result.paymentTermsByCountry).toHaveLength(10)
      expect(result.topSuppliers).toHaveLength(10)
      // Preserves original order (first 10, not a random/sorted subset).
      expect(result.cashFlowByCountry).toEqual(Array.from({ length: 10 }, (_, i) => country(i)))
    })

    it('does not pad when fewer than 10 entries qualify (AC-09)', () => {
      const items = Array.from({ length: 3 }, (_, i) => country(i))
      const result = mapApiResponseToResult(makeResponse({ cashFlowByCountry: items }))
      expect(result.cashFlowByCountry).toEqual(items)
      expect(result.cashFlowByCountry).toHaveLength(3)
    })

    it('defaults to an empty array when a list field is omitted entirely', () => {
      const { cashFlowByCountry, paymentTermsByCountry, topSuppliers, ...rest } = makeResponse()
      const result = mapApiResponseToResult(rest as WorkingCapitalCompareApiResponse)
      expect(result.cashFlowByCountry).toEqual([])
      expect(result.paymentTermsByCountry).toEqual([])
      expect(result.topSuppliers).toEqual([])
    })
  })

  describe('supplierCoverage section (WI#17229)', () => {
    it('maps supplierCoverage fields when present', () => {
      const result = mapApiResponseToResult(makeResponse({
        supplierCoverage: {
          matchedIncreased:   1_236,
          matchedNotIncreased: 9_100,
          notMatched:          9_559,
          totalAnalyzed:       19_795,
        },
      }))
      expect(result.suppliersMatchNotIncreased).toBe(9_100)
      expect(result.suppliersNotMatched).toBe(9_559)
      expect(result.totalAnalyzed).toBe(19_795)
    })
  })

  describe('presentOnlyInOlderFile field (cross-file comparison)', () => {
    it('defaults to 0 when supplierCoverage.presentOnlyInOlderFile is absent', () => {
      const result = mapApiResponseToResult(makeResponse({
        supplierCoverage: { matchedIncreased: 1, matchedNotIncreased: 2, notMatched: 3, totalAnalyzed: 6 },
      }))
      expect(result.suppliersPresentOnlyInOlderFile).toBe(0)
    })

    it('maps supplierCoverage.presentOnlyInOlderFile when present', () => {
      const result = mapApiResponseToResult(makeResponse({
        supplierCoverage: { notMatched: 9_559, presentOnlyInOlderFile: 340, totalAnalyzed: 19_795 },
      }))
      expect(result.suppliersPresentOnlyInOlderFile).toBe(340)
    })
  })

  describe('wapt section (WI#17229)', () => {
    it('maps wapt fields when present', () => {
      const result = mapApiResponseToResult(makeResponse({
        wapt: {
          gainDays:   27.4,
          fromDays:   85.1,
          toDays:     112.5,
          targetDays: 116.8,
          targetFromDays: 98.2,
          matchedSuppliers:  { waptFrom: 70.7, waptTo: 76.5, waptTargetFrom: 81.0, waptTarget: 93.4 },
          improvedSuppliers: { waptFrom: 85.1, waptTo: 112.5, waptTargetFrom: 98.2, waptTarget: 116.8 },
        },
      }))
      expect(result.waptGainDays).toBe(27.4)
      expect(result.waptFromDays).toBe(85.1)
      expect(result.waptToDays).toBe(112.5)
      expect(result.waptTargetDays).toBe(116.8)
      expect(result.waptTargetFromDays).toBe(98.2)
      expect(result.matchedSuppliers).toEqual({ waptFrom: 70.7, waptTo: 76.5, waptTargetFrom: 81.0, waptTarget: 93.4 })
      expect(result.improvedSuppliers).toEqual({ waptFrom: 85.1, waptTo: 112.5, waptTargetFrom: 98.2, waptTarget: 116.8 })
    })
  })

  describe('suppliersImproved fallback (WI#17231 topSuppliersTotal)', () => {
    it('falls back to topSuppliersTotal when summary.suppliersImproved is absent', () => {
      const result = mapApiResponseToResult(makeResponse({ topSuppliersTotal: 1_236 }))
      expect(result.suppliersImproved).toBe(1_236)
    })

    it('prefers summary.suppliersImproved over topSuppliersTotal when both present', () => {
      const result = mapApiResponseToResult(makeResponse({
        summary: { suppliersImproved: 1_236 },
        topSuppliersTotal: 999,
      }))
      expect(result.suppliersImproved).toBe(1_236)
    })
  })

  describe('array passthrough (WI#17231)', () => {
    it('passes cashFlowByCountry through unchanged', () => {
      const items = [{ country: 'Japan', amount: 159_091_748 }]
      const result = mapApiResponseToResult(makeResponse({ cashFlowByCountry: items }))
      expect(result.cashFlowByCountry).toEqual(items)
    })

    it('passes topSuppliers through unchanged', () => {
      const suppliers = [{ supplier: 'Acme', country: 'Japan', cashFlow: 1000, termsFrom: 30, termsTo: 60, extension: 30 }]
      const result = mapApiResponseToResult(makeResponse({ topSuppliers: suppliers }))
      expect(result.topSuppliers).toEqual(suppliers)
    })
  })

  describe('allMatchedSuppliers field (AC-09 — full list, not yet populated by the backend)', () => {
    const supplier = (i: number) => ({ supplier: `Supplier ${i}`, country: 'Japan', cashFlow: i, termsFrom: 30, termsTo: 60, extension: 30 })

    it('defaults to an empty array when absent', () => {
      const result = mapApiResponseToResult(makeResponse())
      expect(result.allMatchedSuppliers).toEqual([])
    })

    it('passes through WITHOUT the 10-entry cap applied to topSuppliers/cashFlowByCountry', () => {
      const suppliers = Array.from({ length: 15 }, (_, i) => supplier(i))
      const result = mapApiResponseToResult(makeResponse({ allMatchedSuppliers: suppliers } as any))
      expect(result.allMatchedSuppliers).toHaveLength(15)
      expect(result.allMatchedSuppliers).toEqual(suppliers)
    })
  })

  describe('supplierList field (WI#20545 — the Achievement List)', () => {
    const row = (i: number) => ({
      supplier: `Supplier ${i}`, country: 'Japan', status: 'notMatched' as const,
      currentPt: 30, currentVolume: i, currentCfOpportunity: null, currentTargetPt: null,
      comparisonPt: null, comparisonVolume: null, comparisonCfOpportunity: null, comparisonTargetPt: null,
    })

    it('defaults to an empty array when an older backend does not send it', () => {
      expect(mapApiResponseToResult(makeResponse()).supplierList).toEqual([])
    })

    it('passes every supplier through, without the 10-entry cap (AC-02)', () => {
      const rows = Array.from({ length: 500 }, (_, i) => row(i))
      const result = mapApiResponseToResult(makeResponse({ supplierList: rows }))
      expect(result.supplierList).toHaveLength(500)
      expect(result.supplierList).toEqual(rows)
    })
  })
})
