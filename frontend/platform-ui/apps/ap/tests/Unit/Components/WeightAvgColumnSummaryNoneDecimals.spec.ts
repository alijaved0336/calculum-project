/**
 * WI#20545 — the weighted-average total can weight by a named column (each file's
 * terms by that file's own volume, AC-11). Without it, the weighting every other grid
 * uses (spend_volume, then volume) is unchanged.
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Number formatting reads the user store; the weighting is what is under test here.
vi.mock('@/utils/FormatData', () => ({
  getNumberWithDecimals: (value: string | number) => String(value),
}))
import WeightAvgColumnSummaryNoneDecimals from '@/modules/components/grid/columns/WeightAvgColumnSummaryNoneDecimals.vue'

const render = (props: { field: string; dataSet: Record<string, unknown>[]; weightField?: string }) =>
  mount(WeightAvgColumnSummaryNoneDecimals, { props, global: { provide: { kendoIntlService: null } } }).text()

describe('WeightAvgColumnSummaryNoneDecimals', () => {
  // 30 days on 100 and 60 days on 300 by comparisonVolume -> 52.5 -> 53;
  // by spend_volume (300 and 100) -> 37.5 -> 38.
  const rows = [
    { comparisonPt: 30, comparisonVolume: 100, spend_volume: 300 },
    { comparisonPt: 60, comparisonVolume: 300, spend_volume: 100 },
  ]

  it('weights by the named column when given one', () => {
    expect(render({ field: 'comparisonPt', dataSet: rows, weightField: 'comparisonVolume' })).toBe('53')
  })

  it('keeps weighting by spend_volume when no weight column is given', () => {
    expect(render({ field: 'comparisonPt', dataSet: rows })).toBe('38')
  })

  it('falls back to volume when there is no spend_volume, as before', () => {
    expect(render({ field: 'pt', dataSet: [{ pt: 30, volume: 1 }, { pt: 60, volume: 1 }] })).toBe('45')
  })

  it('leaves out rows with no value or no weight, and shows "-" when none is left (EF-1, EF-4)', () => {
    const withGaps = [
      { comparisonPt: null, comparisonVolume: 100 },
      { comparisonPt: 40, comparisonVolume: null },
    ]
    expect(render({ field: 'comparisonPt', dataSet: withGaps, weightField: 'comparisonVolume' })).toBe('-')
    expect(render({ field: 'comparisonPt', dataSet: [], weightField: 'comparisonVolume' })).toBe('-')
  })
})
