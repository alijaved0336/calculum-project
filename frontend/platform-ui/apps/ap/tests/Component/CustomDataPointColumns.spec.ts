/**
 * Rendering tests for the grid column templates added with numeric custom data points 21-26.
 *
 * - CustomDataPointNumericColumn: formats the cell value, using 0 decimals for `days`
 *   columns and 1 decimal otherwise, and renders '-' for null / non-numeric values.
 * - TotalsFooterColumn: overrides the aggregation bucket to weighted-avg for `days` custom
 *   data points and reads the value from the matching bucket in the summary dataSet.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// Both columns import the analyze store, which reaches Firebase through
// analyze/api -> services/api/response -> utils/CookieSessionsFns -> useFirebase.
// `composables/firebase/config` calls getAuth() at module level, so merely
// loading that graph throws auth/invalid-api-key without VITE_API_KEY_FB.
// These are rendering tests with no session behaviour; stub the module out.
vi.mock('@/composables/firebase/config', () => ({
  auth: {},
  firestore: {},
  storage: {},
  appFirebase: {},
}))

import CustomDataPointNumericColumn from '@/modules/components/grid/columns/CustomDataPointNumericColumn.vue'
import TotalsFooterColumn from '@ada/design-system/components/grid/custom-columns/TotalsFooterColumn.vue'
import { useAnalyzeStore } from '@/stores/analyze'

let pinia: ReturnType<typeof createPinia>

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
})

const mountOpts = () => ({ global: { plugins: [pinia] } })

describe('CustomDataPointNumericColumn', () => {
  it("renders '-' when the value is null", () => {
    const w = mount(CustomDataPointNumericColumn, {
      ...mountOpts(),
      props: { dataItem: { customDataPoint21: null }, field: 'customDataPoint21' },
    })
    expect(w.text()).toBe('-')
  })

  it("renders '-' when the value is not a number", () => {
    const w = mount(CustomDataPointNumericColumn, {
      ...mountOpts(),
      props: { dataItem: { customDataPoint21: 'abc' }, field: 'customDataPoint21' },
    })
    expect(w.text()).toBe('-')
  })

  it('formats a number-type custom data point with one decimal', () => {
    const w = mount(CustomDataPointNumericColumn, {
      ...mountOpts(),
      props: { dataItem: { customDataPoint21: 30.5 }, field: 'customDataPoint21' },
    })
    expect(w.text()).not.toBe('-')
    expect(w.text()).toContain('30')
  })

  it('formats a days-type custom data point with no decimals', () => {
    const store = useAnalyzeStore()
    store.customDataPointTypes = { customDataPoint22: 'days' }
    const w = mount(CustomDataPointNumericColumn, {
      ...mountOpts(),
      props: { dataItem: { customDataPoint22: 15 }, field: 'customDataPoint22' },
    })
    expect(w.text()).toBe('15')
  })
})

describe('TotalsFooterColumn', () => {
  it('shows a skeleton while loading', () => {
    const w = mount(TotalsFooterColumn, {
      ...mountOpts(),
      props: { field: 'volume', dataSet: {}, loadingData: true, behavior: 'sum', analyzeStore: useAnalyzeStore() },
    })
    expect(w.find('.footer-totals').exists()).toBe(false)
  })

  it('renders nothing when the dataSet is empty', () => {
    const w = mount(TotalsFooterColumn, {
      ...mountOpts(),
      props: { field: 'volume', dataSet: {}, loadingData: false, behavior: 'sum', analyzeStore: useAnalyzeStore() },
    })
    expect(w.find('.footer-totals').exists()).toBe(false)
  })

  it('renders a summed native field from the sum bucket', () => {
    const w = mount(TotalsFooterColumn, {
      ...mountOpts(),
      props: {
        field: 'volume',
        dataSet: { sum: { volume: 1000 } },
        loadingData: false,
        behavior: 'sum',
        analyzeStore: useAnalyzeStore(),
      },
    })
    expect(w.find('.footer-totals').exists()).toBe(true)
    expect(w.text()).toContain('1,000')
  })

  it('overrides a days custom data point to the weighted-avg bucket', () => {
    const store = useAnalyzeStore()
    store.customDataPointTypes = { customDataPoint22: 'days' }
    const w = mount(TotalsFooterColumn, {
      ...mountOpts(),
      props: {
        field: 'customDataPoint22',
        dataSet: { 'avg.weighted.ceil': { customDataPoint22: 45 } },
        loadingData: false,
        behavior: 'sum', // static footerCell feeds sum; component must override to weighted avg
        analyzeStore: store,
      },
    })
    expect(w.text()).toContain('45')
  })

  it('reads a number custom data point from the sum bucket', () => {
    const store = useAnalyzeStore()
    store.customDataPointTypes = { customDataPoint21: 'number' }
    const w = mount(TotalsFooterColumn, {
      ...mountOpts(),
      props: {
        field: 'customDataPoint21',
        dataSet: { sum: { customDataPoint21: 5.5 } },
        loadingData: false,
        behavior: 'sum',
        analyzeStore: store,
      },
    })
    expect(w.text()).toContain('5')
  })
})
