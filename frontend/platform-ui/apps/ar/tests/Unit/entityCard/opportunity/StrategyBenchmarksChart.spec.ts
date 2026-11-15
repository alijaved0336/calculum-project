import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

// RadarChart itself wraps Kendo's chart primitives directly (untested per this repo's existing
// convention for NineBoxes.vue - see radarData.spec.ts for the tested data derivation this
// component composes with it).
vi.mock('@/components/charts/RadarChart.vue', () => ({
  default: { props: ['points'], template: '<div class="radar-chart">{{ points.length }}</div>' },
}))

import StrategyBenchmarksChart from '@/modules/entityCard/components/opportunity/StrategyBenchmarksChart.vue'
import type { BuyerCardStrategyResultDto } from '@/api'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: { arEntityCard: { opportunity: { benchmarks: { title: 'Payment Term Benchmarks', empty: 'No confirmed strategy yet.' } } } },
  },
})

function mountChart(breakdown: BuyerCardStrategyResultDto[]) {
  return mount(StrategyBenchmarksChart, { props: { strategyBreakdown: breakdown }, global: { plugins: [i18n] } })
}

describe('StrategyBenchmarksChart', () => {
  it('renders one radar point per confirmed strategy (AC-03)', () => {
    const chart = mountChart([
      { strategy: 'BuyerStandardStrategy', proposedTerm: 30, applicabilityReason: null },
      { strategy: 'RegulationsStrategy', proposedTerm: 45, applicabilityReason: null },
    ])

    expect(chart.find('.radar-chart').text()).toBe('2')
  })

  /** AC-05: a strategy still pending is absent, and if that leaves nothing confirmed, the
   * radar's own empty state shows rather than an empty/broken chart. */
  it('shows an empty-state message instead of the chart when no strategy has a confirmed term', () => {
    const chart = mountChart([{ strategy: 'BuyerParentMinStrategy', proposedTerm: null, applicabilityReason: 'No parent on file' }])

    expect(chart.find('.radar-chart').exists()).toBe(false)
    expect(chart.text()).toContain('No confirmed strategy yet.')
  })
})
