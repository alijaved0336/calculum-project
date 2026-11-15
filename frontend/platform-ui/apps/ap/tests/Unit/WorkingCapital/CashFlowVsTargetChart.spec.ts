/**
 * Component tests for CashFlowVsTargetChart.vue. No Kendo-chart dependency (plain
 * divs/bars + SkeletonRectangle + Kendo's lightweight Tooltip), so it's safely
 * mountable — same reasoning as WAPTImprovementChart.spec.ts.
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/modules/home/workingCapital/utils/formatters', () => ({
  formatCashFlow: (amount: number) => `${(amount / 1000).toFixed(1)}k`,
  formatUSD: (amount: number) => amount.toLocaleString('en-US'),
  computeSafeMax: (values: number[], headroom = 1.1) => Math.max(...values) * headroom || 1,
}))
// SkeletonRectangle.vue (rendered when showSkeleton is true) imports the @/utils barrel,
// which transitively pulls in a heavy, app-bootstrap-only dependency chain not safe to
// load standalone in a unit test — same class of problem documented in formatters.spec.ts.
vi.mock('@/utils', () => ({
  StringUtils: { isNullUndefinedOrEmpty: (v: unknown) => v === null || v === undefined || v === '' },
}))

import CashFlowVsTargetChart from '@/modules/home/workingCapital/components/CashFlowVsTargetChart.vue'
import type { WorkingCapitalComparisonResult } from '@/modules/home/workingCapital/types'

function makeResult(overrides: Partial<WorkingCapitalComparisonResult> = {}): WorkingCapitalComparisonResult {
  return {
    totalImprovedCashFlow: 689_000,
    targetCashFlow: 1_355_200,
    improvedTargetCashFlow: 1_355_200,
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
    targetAchievementPct: 51,
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

function mountChart(props: Record<string, unknown> = {}) {
  return mount(CashFlowVsTargetChart, {
    props: { result: makeResult(), ...props },
    global: { mocks: { $t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key) } },
  })
}

describe('CashFlowVsTargetChart', () => {
  it('shows the exact improved/target/improved-target amounts as hover titles', () => {
    const wrapper = mountChart()
    const amounts = wrapper.findAll('.wc-cfvt__bar-amount')
    expect(amounts).toHaveLength(3)
    expect(amounts[0].attributes('title')).toBe('689,000')
    expect(amounts[1].attributes('title')).toBe('1,355,200')
    expect(amounts[2].attributes('title')).toBe('1,355,200')
  })

  it('shows the exact remaining amount as a hover title, positioned flush right', () => {
    const wrapper = mountChart()
    const remaining = wrapper.find('.wc-cfvt__remaining-amount')
    expect(remaining.attributes('title')).toBe('666,200')
    // Regression guard: the amount must be a direct child of .wc-cfvt__remaining
    // (sibling of .wc-cfvt__remaining-meta) for justify-content: space-between to
    // push it to the right — nesting it one level deeper silently breaks that.
    const row = wrapper.find('.wc-cfvt__remaining')
    expect(row.element.children).toHaveLength(2)
    expect(row.element.children[0].classList.contains('wc-cfvt__remaining-meta')).toBe(true)
  })

  it('shows the more-precise achieved percentage as a hover title on the hero value', () => {
    const wrapper = mountChart({ result: makeResult({ totalImprovedCashFlow: 789, targetCashFlow: 1000, targetAchievementPct: 79 }) })
    const pct = wrapper.find('.wc-cfvt__pct')
    expect(pct.attributes('title')).toBe('78.9%')
    expect(pct.text()).toBe('79%')
  })

  it('renders the empty state instead of tooltips when every amount is zero', () => {
    const wrapper = mountChart({ result: makeResult({ totalImprovedCashFlow: 0, targetCashFlow: 0, improvedTargetCashFlow: 0 }) })
    expect(wrapper.find('.wc-cfvt__empty').exists()).toBe(true)
    expect(wrapper.find('.wc-cfvt__bar-amount').exists()).toBe(false)
  })

  it('shows the skeleton instead of content when showSkeleton is true', () => {
    const wrapper = mountChart({ showSkeleton: true })
    expect(wrapper.findComponent({ name: 'SkeletonRectangle' }).exists()).toBe(true)
  })
})
