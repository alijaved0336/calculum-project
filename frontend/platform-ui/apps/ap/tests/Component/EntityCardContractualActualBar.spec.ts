/**
 * AB#20181 — the Contractual/Actual bar must be drawn from the Average Days Paid
 * when the spend has no Contractual payment term.
 *
 * Specified by US 10259 (EF 3.3 "No Contractual PT") and US 10813 (step 2.h): with no
 * Contractual value the bar still renders, using the Avg Days Paid value.
 *
 * The regression was a `Number(...)` coercion at the call site in EntityTermsChartLine:
 * `Number(null) === 0`, so the bar component's `contractualValue ?? actualValue` fallback
 * never fired and the bar was painted 0 days wide.
 *
 * The components under test are the real ones, so the tests fail if the coercion returns.
 */

import { describe, it, expect, vi } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'

// The `@/utils` barrel re-exports the router helpers, which drag every view into the
// module graph and blow up on a circular import under vitest. Only two trivial helpers
// are needed here and neither is the code under test.
vi.mock('@/utils', () => ({
  MAX_TERMS_DAYS_CHARTS: 180,
  getBarSize: (value: number, maxValue: number) => Math.min((value * 100) / maxValue, 100),
  isEmpty: (value: unknown) => value === null || value === undefined || value === '',
  StringUtils: {
    isNullUndefinedOrEmpty: (value: unknown) => value === null || value === undefined || value === '',
  },
  PaymentTermsStrategiesUtils: {
    STRATEGY_COLOR_DEFAULT: 'bg-gray-500',
    getColorByStrategyKey: () => 'bg-gray-500',
  },
}))

vi.mock('@/stores/entityCard', () => ({
  useEntityCardStore: () => ({ getSelectedEntity: null }),
}))

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ getHideAverageDaysPaid: false }),
}))

// The design-system barrel builds a real i18n instance at import time, so only
// useI18n() is stubbed out.
vi.mock('vue-i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-i18n')>()),
  useI18n: () => ({ t: (key: string) => key }),
}))

import ChartContractualActualBarComponent from '@/modules/components/ChartContractualActualBarComponent.vue'
import EntityTermsChartLine from '@/modules/home/entityCard/components/opportunity/EntityTermsChartLine.vue'

/** Width the bar ends up painting, in percent. */
function renderedBarWidthPercent(wrapper: ReturnType<typeof mount>): number {
  const style = wrapper.find('.line').attributes('style') ?? ''
  const match = /width:\s*([\d.]+)%/.exec(style)
  return match ? Number(match[1]) : NaN
}

describe('ChartContractualActualBarComponent — contractual/actual fallback', () => {
  it('paints the bar from the actual when the contractual is null', () => {
    const wrapper = mount(ChartContractualActualBarComponent, {
      props: { contractualValue: null, actualValue: 60 },
    })

    expect(renderedBarWidthPercent(wrapper)).toBeGreaterThan(0)
  })

  it('paints the same width as if the actual had been the contractual', () => {
    const fromActual = mount(ChartContractualActualBarComponent, {
      props: { contractualValue: null, actualValue: 60 },
    })
    const fromContractual = mount(ChartContractualActualBarComponent, {
      props: { contractualValue: 60, actualValue: null },
    })

    expect(renderedBarWidthPercent(fromActual)).toBe(renderedBarWidthPercent(fromContractual))
  })

  it('prefers the contractual when both are present', () => {
    const both = mount(ChartContractualActualBarComponent, {
      props: { contractualValue: 30, actualValue: 90 },
    })
    const contractualOnly = mount(ChartContractualActualBarComponent, {
      props: { contractualValue: 30, actualValue: null },
    })

    expect(renderedBarWidthPercent(both)).toBe(renderedBarWidthPercent(contractualOnly))
  })

  it('paints nothing when neither term is known', () => {
    const wrapper = mount(ChartContractualActualBarComponent, {
      props: { contractualValue: null, actualValue: null },
    })

    expect(renderedBarWidthPercent(wrapper)).toBe(0)
  })
})

describe('EntityTermsChartLine — values handed to the contractual/actual bar', () => {
  function mountContractualLine(terms: Array<{ key: string; terms: number | null }>) {
    return shallowMount(EntityTermsChartLine, {
      props: {
        chartName: 'contractualTerms',
        strategyKey: 'contractualTerms',
        value: terms.find((term) => term.key === 'contractualTerms')?.terms ?? null,
        terms,
      },
    })
  }

  it('forwards a null contractual as null, not as 0', () => {
    const bar = mountContractualLine([
      { key: 'contractualTerms', terms: null },
      { key: 'currentTerms', terms: 60 },
    ]).findComponent(ChartContractualActualBarComponent)

    expect(bar.exists()).toBe(true)
    expect(bar.props('contractualValue')).toBeNull()
    expect(bar.props('actualValue')).toBe(60)
  })

  it('forwards both terms untouched when the contractual is present', () => {
    const bar = mountContractualLine([
      { key: 'contractualTerms', terms: 30 },
      { key: 'currentTerms', terms: 60 },
    ]).findComponent(ChartContractualActualBarComponent)

    expect(bar.props('contractualValue')).toBe(30)
    expect(bar.props('actualValue')).toBe(60)
  })

  it('forwards a null actual as null when only the contractual is known', () => {
    const bar = mountContractualLine([
      { key: 'contractualTerms', terms: 45 },
      { key: 'currentTerms', terms: null },
    ]).findComponent(ChartContractualActualBarComponent)

    expect(bar.props('contractualValue')).toBe(45)
    expect(bar.props('actualValue')).toBeNull()
  })
})
