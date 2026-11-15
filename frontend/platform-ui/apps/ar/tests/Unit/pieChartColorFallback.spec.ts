import { describe, it, expect } from 'vitest'
import { buildPieChartOptions } from '@ada/design-system/components/charts/pie-chart/build-options'

/**
 * Regression guard for a bug found via AR Opportunity's OverviewMetricsCard.vue (the first
 * PieChart consumer that omits `color` per item): `colorField: "color"` on the Kendo pie series
 * looks up `dataItem.color` per point, and a point whose field is `undefined` renders with no
 * fill at all - not a palette color - even though PieChartItem's own doc comment promises "the
 * Kendo theme palette when omitted". Slices were invisible; only their floating value/percentage
 * labels showed. custom-pie/build-options.ts already resolves this the same way this test pins.
 */
describe('buildPieChartOptions - color fallback', () => {
  it('gives every item without its own color a concrete PIE_DEFAULT_COLORS entry', () => {
    const options = buildPieChartOptions({
      items: [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'C', value: 3 },
      ],
      legendVisible: false,
      tooltipVisible: false,
      labelsVisible: false,
    }) as { series: [{ data: { category: string; value: number; color: string }[] }] }

    const colors = options.series[0].data.map((item) => item.color)
    expect(colors.every((color) => typeof color === 'string' && color.length > 0)).toBe(true)
    // Distinct slices get distinct colors, not all falling back to the same single default.
    expect(new Set(colors).size).toBe(3)
  })

  it('keeps an item-supplied color untouched', () => {
    const options = buildPieChartOptions({
      items: [{ category: 'A', value: 1, color: '#ABCDEF' }],
      legendVisible: false,
      tooltipVisible: false,
      labelsVisible: false,
    }) as { series: [{ data: { color: string }[] }] }

    expect(options.series[0].data[0].color).toBe('#ABCDEF')
  })
})
