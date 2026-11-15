/**
 * Component tests for PaymentTermsByCountryChart.vue. Same mountable pattern as
 * WAPTImprovementChart.spec.ts: no Kendo-chart dependency (plain divs + SkeletonRectangle),
 * so no Kendo stubbing needed.
 *
 * ../utils/formatters is mocked directly (rather than its own transitive @/utils/FormatData
 * dependency chain) since this suite tests the component's own label/rendering logic, not
 * formatDays' internals — that already has dedicated coverage in formatters.spec.ts.
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Mirrors the real translation templates (packages/design-system/src/locales/languages/en.json)
// closely enough to assert on interpolated output, since apps/ap/tests/setup.ts's default
// global $t mock is a plain identity function that ignores params.
const { translate } = vi.hoisted(() => ({
  translate: (key: string, params?: Record<string, unknown>) => {
    const templates: Record<string, string> = {
      'home.workingCapital.paymentTermsByCountry.subtitleWithYears': '{fromYear} base + {toYear} increase, in days',
      'home.workingCapital.paymentTermsByCountry.subtitleDefault': 'Base + increase, in days',
      'home.workingCapital.paymentTermsByCountry.ptLabel': 'PT {year}',
    }
    let result = templates[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) result = result.replace(`{${k}}`, String(v))
    }
    return result
  },
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return { ...actual, useI18n: () => ({ t: translate }) }
})
vi.mock('@/modules/home/workingCapital/utils/formatters', () => ({
  formatDays: (value: number) => Math.round(value).toString(),
}))
// SkeletonRectangle.vue (rendered when showSkeleton is true) imports the @/utils barrel,
// which transitively pulls in a heavy, app-bootstrap-only dependency chain not safe to
// load standalone in a unit test — same class of problem documented in formatters.spec.ts.
vi.mock('@/utils', () => ({
  StringUtils: { isNullUndefinedOrEmpty: (v: unknown) => v === null || v === undefined || v === '' },
}))

import PaymentTermsByCountryChart from '@/modules/home/workingCapital/components/PaymentTermsByCountryChart.vue'
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
    matchedSuppliers: { waptFrom: 0, waptTo: 0, waptTargetFrom: 0, waptTarget: 0 },
    improvedSuppliers: { waptFrom: 0, waptTo: 0, waptTargetFrom: 0, waptTarget: 0 },
    fromYear: '2022',
    toYear: '2023',
    fromDate: '2022-12-31',
    toDate: '2023-12-31',
    currency: 'USD',
    cashFlowByCountry: [],
    paymentTermsByCountry: [{ country: 'Japan', waptFrom: 90, increase: 20 }],
    topSuppliers: [],
    allMatchedSuppliers: [],
    supplierList: [],
    ...overrides,
  }
}

function mountChart(props: Record<string, unknown> = {}) {
  return mount(PaymentTermsByCountryChart, {
    props: {
      result: makeResult(),
      // Deliberately not bare years — proves the component uses whatever it's given
      // (month + year) rather than assuming a 4-digit year string.
      fromLabel: 'Dec 2022',
      toLabel: 'Dec 2023',
      ...props,
    },
    global: {
      mocks: { $t: translate },
    },
  })
}

describe('PaymentTermsByCountryChart', () => {
  it('renders the subtitle with month + year, not a bare year', () => {
    const wrapper = mountChart()
    expect(wrapper.find('.wc-ptbc__subtitle').text()).toBe('Dec 2022 base + Dec 2023 increase, in days')
  })

  it('falls back to the default subtitle when a label is missing', () => {
    const wrapper = mountChart({ fromLabel: '', toLabel: '' })
    expect(wrapper.find('.wc-ptbc__subtitle').text()).toBe('Base + increase, in days')
  })

  it('renders the legend base-year chip with month + year', () => {
    const wrapper = mountChart()
    const legend = wrapper.find('.wc-ptbc__legend').text()
    expect(legend).toContain('PT Dec 2022')
    expect(legend).not.toContain('PT 2022')
  })
})
