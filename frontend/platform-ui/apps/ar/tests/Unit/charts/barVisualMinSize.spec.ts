import { describe, expect, it } from 'vitest'
import { Path } from '@progress/kendo-drawing'
import { createBarVisual } from '@ada/design-system/components/charts/shared/bar-visual'
import { BAR_MIN_VISIBLE_PX } from '@ada/design-system/components/charts/shared/constants'
import { buildWaterfallOptions } from '@ada/design-system/components/charts/waterfall-chart/build-options'

/** AB#20904: a waterfall step far smaller than the axis scale must still show as a thin line. */
function drawColumn(value: number, height: number, minVisibleSize = true) {
  const visual = createBarVisual({ rounded: true, stackGap: false, orientation: 'vertical', corners: 'all', minVisibleSize })
  return visual({
    rect: { origin: { x: 10, y: 100 }, size: { width: 40, height } },
    options: { color: '#000' },
    value,
    createVisual: () => null,
  }) as Path
}

describe('createBarVisual minVisibleSize', () => {
  it('draws a sub-pixel non-zero bar at the minimum thickness, centered on its own position', () => {
    const box = drawColumn(17.2, 0.01).bbox()
    expect(box.size.height).toBeCloseTo(BAR_MIN_VISIBLE_PX)
    expect(box.center().y).toBeCloseTo(100.005)
  })

  it('also draws a non-zero bar Kendo gave no height at all', () => {
    expect(drawColumn(17.2, 0).bbox().size.height).toBeCloseTo(BAR_MIN_VISIBLE_PX)
  })

  it('still skips a zero value', () => {
    expect(drawColumn(0, 0).segments).toHaveLength(0)
  })

  it('leaves bars already thicker than the minimum untouched', () => {
    expect(drawColumn(500, 80).bbox().size.height).toBeCloseTo(80)
  })

  it('is off unless the chart opts in', () => {
    expect(drawColumn(17.2, 0, false).segments).toHaveLength(0)
  })
})

describe('buildWaterfallOptions', () => {
  it('uses the min-size visual whether or not bars are rounded', () => {
    for (const roundedBars of [true, false]) {
      const options = buildWaterfallOptions({
        data: [{ category: 'Regulatory Terms', value: 17.2 }],
        tooltipVisible: true,
        valueLabelsVisible: false,
        categoryLabelsRotated: true,
        roundedBars,
      })
      const series = (options.series as Array<{ visual?: (e: unknown) => Path }>)[0]
      const path = series.visual!({
        rect: { origin: { x: 0, y: 50 }, size: { width: 30, height: 0.004 } },
        options: { color: '#000' },
        value: 17.2,
        createVisual: () => null,
      })
      expect(path.bbox().size.height).toBeCloseTo(BAR_MIN_VISIBLE_PX)
    }
  })
})
