/**
 * Tests for SupplierMatchCoverageChart.vue's exportChartImage() — the fix for the
 * donut rendering broken (empty ring) in the Working Capital PDF export. The real
 * Kendo Chart pulls in a heavy rendering pipeline not safe to exercise in jsdom, so
 * `@progress/kendo-vue-charts` is stubbed out here (same reasoning as other specs in
 * this suite mocking heavy transitive deps) — exportChartImage() itself doesn't render
 * anything, it just reads `chartRef.value.chartInstance().exportVisual()` and hands
 * the result to `exportImage()`, both of which are exercised directly via mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const exportImageMock = vi.fn()

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})

vi.mock('@progress/kendo-drawing', () => ({
  exportImage: (...args: unknown[]) => exportImageMock(...args),
}))

vi.mock('@progress/kendo-vue-charts', () => ({
  Chart: { template: '<div><slot /></div>' },
  ChartArea: { template: '<div><slot /></div>' },
  ChartLegend: { template: '<div><slot /></div>' },
  ChartSeries: { template: '<div><slot /></div>' },
  ChartSeriesItem: { template: '<div />' },
}))

vi.mock('@/utils', () => ({
  ColorsUtils: { teal: { 500: '#15b79e' }, graycool: { 800: '#30374f' } },
  StringUtils: { isNullUndefinedOrEmpty: (v: unknown) => v === null || v === undefined || v === '' },
}))

vi.mock('@/modules/home/workingCapital/utils/formatters', () => ({
  formatSupplierCount: (n: number) => String(n),
  formatExactCount: (n: number) => String(n),
}))

import SupplierMatchCoverageChart from '@/modules/home/workingCapital/components/SupplierMatchCoverageChart.vue'
import type { WorkingCapitalComparisonResult } from '@/modules/home/workingCapital/types'

function makeResult(overrides: Partial<WorkingCapitalComparisonResult> = {}): WorkingCapitalComparisonResult {
  return {
    totalImprovedCashFlow: 0,
    targetCashFlow: 0,
    improvedTargetCashFlow: 0,
    suppliersImproved: 0,
    suppliersMatchNotIncreased: 85,
    suppliersNotMatched: 0,
    suppliersPresentOnlyInOlderFile: 0,
    totalAnalyzed: 85,
    waptGainDays: 0,
    waptFromDays: 0,
    waptToDays: 0,
    waptTargetFromDays: 0,
    waptTargetDays: 0,
    targetAchievementPct: 0,
    matchedSuppliers: { waptFrom: 0, waptTo: 0, waptTargetFrom: 0, waptTarget: 0 },
    improvedSuppliers: { waptFrom: 0, waptTo: 0, waptTargetFrom: 0, waptTarget: 0 },
    fromYear: '2022',
    toYear: '2025',
    fromDate: '2022-12-31',
    toDate: '2025-12-31',
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
  return mount(SupplierMatchCoverageChart, { props: { result: makeResult(), ...props } })
}

describe('SupplierMatchCoverageChart — subtitle', () => {
  it('renders the fromLabel/toLabel (month + year) range when both are given', () => {
    const wrapper = mountChart({ fromLabel: 'Dec 2022', toLabel: 'Dec 2025' })
    expect(wrapper.find('.wc-smc__subtitle').text()).toBe('Dec 2022 → Dec 2025, All Analyzed Suppliers')
  })

  it('falls back to the no-range text when the labels are missing', () => {
    const wrapper = mountChart()
    expect(wrapper.find('.wc-smc__subtitle').text()).toBe('All Analyzed Suppliers')
  })
})

describe('SupplierMatchCoverageChart — exportChartImage', () => {
  beforeEach(() => {
    exportImageMock.mockReset()
  })

  it('rasterizes the chart via chartInstance().exportVisual() + exportImage() and returns the data URI', async () => {
    const wrapper = mountChart()
    const fakeVisual = { fake: 'group' }
    exportImageMock.mockResolvedValue('data:image/png;base64,fake')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).chartRef = {
      chartInstance: () => ({ exportVisual: () => fakeVisual }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (wrapper.vm as any).exportChartImage()

    expect(exportImageMock).toHaveBeenCalledWith(fakeVisual)
    expect(result).toBe('data:image/png;base64,fake')
  })

  it('resolves to null when the chart ref has no chart instance yet', async () => {
    const wrapper = mountChart()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).chartRef = null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (wrapper.vm as any).exportChartImage()

    expect(result).toBeNull()
    expect(exportImageMock).not.toHaveBeenCalled()
  })

  it('resolves to null when the chart instance has no visual to export', async () => {
    const wrapper = mountChart()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).chartRef = {
      chartInstance: () => ({ exportVisual: () => undefined }),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (wrapper.vm as any).exportChartImage()

    expect(result).toBeNull()
    expect(exportImageMock).not.toHaveBeenCalled()
  })
})
