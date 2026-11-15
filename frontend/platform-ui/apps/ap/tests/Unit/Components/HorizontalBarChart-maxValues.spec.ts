/**
 * AB#20342: an expanded chart draws at most 100 bars, and says so when it had more to draw.
 * The collapsed view (6 bars) and charts under the limit are untouched.
 */

import { describe, it, expect, vi } from 'vitest'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../../Helpers/mountWithProviders'
import HorizontalBarChart from '@/modules/components/charts/kendo/HorizontalBarChart.vue'

// The Kendo chart draws to a canvas and is irrelevant here: every assertion is on the arrays
// the component hands it and on the notice next to the Show More control.
const kendoStub = { template: '<div><slot /></div>' }
const stubs = {
  Chart: kendoStub,
  ChartTooltip: kendoStub,
  ChartTitle: kendoStub,
  ChartCategoryAxis: kendoStub,
  ChartCategoryAxisItem: kendoStub,
  ChartCategoryAxisTitle: kendoStub,
  ChartCategoryAxisLabels: kendoStub,
  ChartValueAxis: kendoStub,
  ChartValueAxisItem: kendoStub,
  ChartSeries: kendoStub,
  ChartSeriesItem: kendoStub,
  iconArrowDown: { template: '<svg></svg>' }
}

const NOTICE = 'global.chartMaxValuesWarning'

const series = (n: number) => Array.from({ length: n }, (_, i) => n - i)
const categories = (n: number) => Array.from({ length: n }, (_, i) => `Category ${i + 1}`)

const createWrapper = (n: number) => mountWithProviders(HorizontalBarChart, {
  props: {
    dataFirstSeries: series(n),
    categoriesData: categories(n),
    chartType: 'spend'
  },
  global: { stubs }
})

/** Clicks Show More, the only thing that expands the chart. */
const expand = async (wrapper: VueWrapper) => {
  await wrapper.find('button').trigger('click')
}

describe('HorizontalBarChart - 100-value cap', () => {
  it('draws 6 bars and no notice while collapsed, however much data it has', () => {
    const wrapper = createWrapper(250)

    expect((wrapper.vm as any).myDataSeries).toHaveLength(6)
    expect((wrapper.vm as any).myDataCategories).toHaveLength(6)
    expect(wrapper.text()).not.toContain(NOTICE)
  })

  it('caps the expanded view at 100 bars and says so', async () => {
    const wrapper = createWrapper(250)

    await expand(wrapper)

    expect((wrapper.vm as any).myDataSeries).toHaveLength(100)
    expect((wrapper.vm as any).myDataCategories).toHaveLength(100)
    expect(wrapper.text()).toContain(NOTICE)
  })

  it('keeps the top values, not an arbitrary slice', async () => {
    const wrapper = createWrapper(250)

    await expand(wrapper)

    // series(250) arrives sorted descending (250, 249, ...), as the backend returns it.
    expect((wrapper.vm as any).myDataSeries[0]).toBe(250)
    expect((wrapper.vm as any).myDataSeries[99]).toBe(151)
  })

  it('draws all 100 and stays quiet when the data is exactly at the limit', async () => {
    const wrapper = createWrapper(100)

    await expand(wrapper)

    expect((wrapper.vm as any).myDataSeries).toHaveLength(100)
    expect(wrapper.text()).not.toContain(NOTICE)
  })

  it('draws everything and stays quiet under the limit', async () => {
    const wrapper = createWrapper(40)

    await expand(wrapper)

    expect((wrapper.vm as any).myDataSeries).toHaveLength(40)
    expect(wrapper.text()).not.toContain(NOTICE)
  })
})
