/**
 * Tests for utils/kpiCards.ts — buildKpiCards().
 *
 * kpiCards.ts imports from ./formatters, which in turn imports StringUtils/getNumberWithDecimals
 * and transitively pulls in the `@/utils` barrel and `@/utils/FormatData` (Pinia store calls at
 * call time). Mock both, matching the established pattern in formatters.spec.ts.
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/utils', () => ({
  isNullOrUndefined: (value: unknown) => value === null || value === undefined,
}))

vi.mock('@/utils/FormatData', () => ({
  changeToCurrency: (value: number) => value,
  getNumberWithDecimals: (num: number | string | null | undefined, maximumFractionDigits = 2) => {
    const n = num === null || num === undefined ? 0 : parseFloat(String(num))
    return new Intl.NumberFormat('en-US', { maximumFractionDigits, minimumFractionDigits: maximumFractionDigits }).format(n)
  },
}))

import { buildKpiCards } from '@/modules/home/workingCapital/utils/kpiCards'
import type { WorkingCapitalComparisonResult } from '@/modules/home/workingCapital/types'

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key

function makeResult(overrides: Partial<WorkingCapitalComparisonResult> = {}): WorkingCapitalComparisonResult {
  return {
    totalImprovedCashFlow: 0,
    targetCashFlow: 0,
    improvedTargetCashFlow: 0,
    suppliersImproved: 0,
    suppliersMatchNotIncreased: 0,
    suppliersNotMatched: 0,
    suppliersPresentOnlyInOlderFile: 0,
    totalAnalyzed: 0,
    waptGainDays: 0,
    waptFromDays: 0,
    waptToDays: 0,
    waptTargetFromDays: 0,
    waptTargetDays: 0,
    targetAchievementPct: 0,
    matchedSuppliers: { waptFrom: 0, waptTo: 0, waptTargetFrom: 0, waptTarget: 0 },
    improvedSuppliers: { waptFrom: 0, waptTo: 0, waptTargetFrom: 0, waptTarget: 0 },
    fromYear: '2023',
    toYear: '2024',
    fromDate: '2023-12-31',
    toDate: '2024-12-31',
    currency: 'USD',
    cashFlowByCountry: [],
    paymentTermsByCountry: [],
    topSuppliers: [],
    allMatchedSuppliers: [],
    supplierList: [],
    ...overrides,
  }
}

describe('buildKpiCards', () => {
  it('shows a placeholder for every card when result is null', () => {
    const cards = buildKpiCards(null, t)
    expect(cards).toHaveLength(4)
    cards.forEach(card => expect(card.bigValue).toBe('—'))
  })

  describe('Cash Flow Improvement card — exact-value tooltips', () => {
    it('shows the full-precision amount in bigValueTooltip', () => {
      const cards = buildKpiCards(makeResult({ totalImprovedCashFlow: 194_559_413 }), t)
      expect(cards[0].bigValueTooltip).toBe('194,559,413')
    })

    it('includes the full-precision shortfall in the sub-line tooltip', () => {
      const cards = buildKpiCards(
        makeResult({ totalImprovedCashFlow: 194_559_413, targetCashFlow: 246_588_076 }),
        t,
      )
      const subLine = cards[0].subLines[0] as { text: string; tooltip: string }
      expect(subLine.tooltip).toContain('"shortfall":"52,028,663"')
    })
  })

  describe('Target Achievement card — big-value and sub-line tooltips', () => {
    it('recomputes a 1-decimal-precision percentage in the big value tooltip', () => {
      const cards = buildKpiCards(
        makeResult({ totalImprovedCashFlow: 789, targetCashFlow: 1000, targetAchievementPct: 79 }),
        t,
      )
      expect(cards[3].bigValueTooltip).toBe('78.9%')
    })

    it('has no bigValueTooltip when targetCashFlow is zero (avoids a division by zero)', () => {
      const cards = buildKpiCards(makeResult({ totalImprovedCashFlow: 0, targetCashFlow: 0 }), t)
      expect(cards[3].bigValueTooltip).toBeUndefined()
    })

    it('includes full-precision improved/target amounts in the sub-line tooltip', () => {
      const cards = buildKpiCards(
        makeResult({ totalImprovedCashFlow: 194_559_413, targetCashFlow: 246_588_076 }),
        t,
      )
      const subLine = cards[3].subLines[0] as { text: string; tooltip: string }
      expect(subLine.tooltip).toContain('"improved":"194,559,413"')
      expect(subLine.tooltip).toContain('"target":"246,588,076"')
    })
  })

  describe('WAPT Gain card — whole-number days, with 1-decimal-precision tooltips', () => {
    it('renders the big value as a signed whole number, not a decimal', () => {
      const cards = buildKpiCards(makeResult({ waptGainDays: 21.9 }), t)
      expect(cards[2].bigValue).toBe('+22')
    })

    it('shows 1-decimal precision in the big value tooltip', () => {
      const cards = buildKpiCards(makeResult({ waptGainDays: 21.9 }), t)
      expect(cards[2].bigValueTooltip).toBe('+21.9')
    })

    it('renders the weighted-terms sub-line days as whole numbers, with 1-decimal tooltips', () => {
      const cards = buildKpiCards(makeResult({ waptFromDays: 71.7, waptToDays: 93.6 }), t)
      const subLine = cards[2].subLines[0] as { text: string; tooltip: string }
      expect(subLine.text).toContain('"from":"72"')
      expect(subLine.text).toContain('"to":"94"')
      expect(subLine.tooltip).toContain('"from":"71.7"')
      expect(subLine.tooltip).toContain('"to":"93.6"')
    })

    it('does not prefix a plus to a negative WAPT gain', () => {
      const cards = buildKpiCards(makeResult({ waptGainDays: -3.4 }), t)
      expect(cards[2].bigValue).toBe('-3')
      expect(cards[2].bigValueTooltip).toBe('-3.4')
    })

    it('keeps the plus on a zero gain', () => {
      const cards = buildKpiCards(makeResult({ waptGainDays: 0 }), t)
      expect(cards[2].bigValue).toBe('+0')
    })
  })
})
