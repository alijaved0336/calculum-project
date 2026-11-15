/**
 * Component tests for WAPTImprovementChart.vue. Unlike SupplierMatchCoverageChart.vue
 * (Kendo donut chart) this component is plain divs + SkeletonRectangle, so it's safely
 * mountable — no Kendo stubbing needed.
 *
 * ../utils/formatters is mocked directly (rather than mocking its own transitive
 * @/utils/FormatData dependency chain) since this suite tests the component's own
 * label/rendering logic, not formatDays'/computeSafeMax's internals — those already
 * have dedicated coverage in formatters.spec.ts.
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Shared between the setup-script t() (mocked below) and the template's global $t
// (mocked per-mount in mountChart) — the component uses both (buildRows() takes a t
// param; the legend's template calls $t directly), so both need the same translation.
const { translations } = vi.hoisted(() => ({
  translations: { 'home.workingCapital.wapt.target': 'Target' } as Record<string, string>,
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return { ...actual, useI18n: () => ({ t: (key: string) => translations[key] ?? key }) }
})
vi.mock('@/modules/home/workingCapital/utils/formatters', () => ({
  formatDays: (value: number) => Math.round(value).toString(),
  computeSafeMax: (values: number[], headroom = 1.1) => Math.max(...values) * headroom || 1,
}))
// SkeletonRectangle.vue (rendered when showSkeleton is true) imports the @/utils barrel,
// which transitively pulls in a heavy, app-bootstrap-only dependency chain not safe to
// load standalone in a unit test — same class of problem documented in formatters.spec.ts.
vi.mock('@/utils', () => ({
  StringUtils: { isNullUndefinedOrEmpty: (v: unknown) => v === null || v === undefined || v === '' },
}))

import WAPTImprovementChart from '@/modules/home/workingCapital/components/WAPTImprovementChart.vue'
import type { WorkingCapitalComparisonResult } from '@/modules/home/workingCapital/types'

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
    matchedSuppliers: { waptFrom: 71.7, waptTo: 93.6, waptTargetFrom: 88.0, waptTarget: 105.0 },
    improvedSuppliers: { waptFrom: 74.8, waptTo: 100.8, waptTargetFrom: 91.0, waptTarget: 111.6 },
    fromYear: '2023',
    toYear: '2024',
    fromDate: '2023-06-30',
    toDate: '2024-06-30',
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
  return mount(WAPTImprovementChart, {
    props: {
      result: makeResult(),
      fromLabel: 'Dec 2022',
      toLabel: 'Dec 2023',
      ...props,
    },
    global: {
      // The legend's template calls the global $t (apps/ap/tests/setup.ts mocks it as
      // identity) — override it here so "Target" assertions match the real i18n key.
      mocks: { $t: (key: string) => translations[key] ?? key },
    },
  })
}

describe('WAPTImprovementChart', () => {
  it('renders fromLabel/toLabel (month + year) in the top legend', () => {
    const wrapper = mountChart()
    const legend = wrapper.find('.wc-wapt__legend').text()
    expect(legend).toContain('Dec 2022')
    expect(legend).toContain('Dec 2023')
  })

  it('renders fromLabel/toLabel (month + year) in the "from"/"to" bar-row labels too', () => {
    const wrapper = mountChart()
    const rowLabels = wrapper.findAll('.wc-wapt__row-label').map(el => el.text())
    expect(rowLabels).toContain('Dec 2022')
    expect(rowLabels).toContain('Dec 2023')
  })

  // WI#19754 — the Target labels follow the compared endpoints (fromLabel/toLabel),
  // legend and bar rows alike. They used to read a bare year taken from the version's
  // INITIAL date, so a period crossing New Year (2025-06 -> 2026-06) labelled the
  // target one year behind the endpoint it belongs to.
  it('labels the Target of each side with the same month+year as its endpoint, in the legend and on the bar', () => {
    const wrapper = mountChart()
    const legend = wrapper.find('.wc-wapt__legend').text()
    expect(legend).toContain('Target Dec 2022')
    expect(legend).toContain('Target Dec 2023')
    const rowLabels = wrapper.findAll('.wc-wapt__row-label').map(el => el.text())
    expect(rowLabels).toContain('Target Dec 2022')
    expect(rowLabels).toContain('Target Dec 2023')
    // No bare-year form left anywhere on the card.
    expect(rowLabels).not.toContain('Target 2022')
    expect(rowLabels).not.toContain('Target 2023')
    expect(wrapper.text()).not.toContain("Target '")
  })

  it('keeps the Target labels on the endpoints when the compared period crosses New Year', () => {
    const wrapper = mountChart({ fromLabel: 'Dec 2022', toLabel: 'Jun 2026' })
    const rowLabels = wrapper.findAll('.wc-wapt__row-label').map(el => el.text())
    expect(rowLabels).toContain('Target Jun 2026')
    expect(rowLabels.join('|')).not.toContain('2025')
  })

  it('renders both targets as their own bars, so a target that moved between versions is visible', () => {
    const wrapper = mountChart()
    // 4 rows per section (from, to, target-from, target-to) x 2 sections.
    expect(wrapper.findAll('.wc-wapt__bar-row')).toHaveLength(8)
    expect(wrapper.findAll('.wc-wapt__bar--target-from')).toHaveLength(2)
    expect(wrapper.findAll('.wc-wapt__bar--target')).toHaveLength(2)
    // matched 88 -> 105, improved 91 -> 112: the base target is rendered, not dropped.
    const text = wrapper.text()
    expect(text).toContain('88')
    expect(text).toContain('105')
    expect(text).toContain('91')
    expect(text).toContain('112')
  })

  it('renders bar values and the change badge as whole numbers, not decimals', () => {
    const wrapper = mountChart({
      result: makeResult({
        matchedSuppliers: { waptFrom: 71.7, waptTo: 93.6, waptTargetFrom: 88.0, waptTarget: 105.0 },
        waptGainDays: 21.9,
      }),
    })
    const text = wrapper.text()
    expect(text).toContain('72') // 71.7 rounded
    expect(text).toContain('94') // 93.6 rounded
    expect(text).toContain('105')
    expect(text).toContain('+22') // waptGainDays rounded
    expect(text).not.toMatch(/\d+\.\d/) // no decimal point anywhere in a day value
  })

  it('shows the skeleton instead of rows when showSkeleton is true', () => {
    const wrapper = mountChart({ showSkeleton: true })
    expect(wrapper.findComponent({ name: 'SkeletonRectangle' }).exists()).toBe(true)
  })
})
