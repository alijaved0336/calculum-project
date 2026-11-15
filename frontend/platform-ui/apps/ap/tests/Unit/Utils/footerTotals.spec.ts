/**
 * WI#20545 — opt-in grid totals. With footerFollowsFilter the totals cover the filtered
 * rows (AC-10, EF-4); off, every grid keeps totalling the whole list (regression safety).
 * A column can name the field its weighted average weights by (AC-11).
 */

import { describe, it, expect } from 'vitest'
import {
  findFooterWeightField,
  resolveFooterDataSet,
} from '@/modules/components/grid/calculum-grid/utils/footerTotals'

const rows = [
  { supplier: 'A', country: 'Spain', currentVolume: 100 },
  { supplier: 'B', country: 'France', currentVolume: 200 },
  { supplier: 'C', country: 'Spain', currentVolume: 300 },
]
const spainOnly = { logic: 'and', filters: [{ field: 'country', operator: 'eq', value: 'Spain' }] }

describe('resolveFooterDataSet', () => {
  it('totals only the filtered rows when the grid opts in (AC-10)', () => {
    expect(resolveFooterDataSet(rows, spainOnly, true).map((r) => r.supplier)).toEqual(['A', 'C'])
  })

  it('keeps totalling the whole list when the grid does not opt in', () => {
    expect(resolveFooterDataSet(rows, spainOnly, false)).toBe(rows)
  })

  it('totals the whole list when no filter is applied or the filters were cleared', () => {
    expect(resolveFooterDataSet(rows, undefined, true)).toBe(rows)
    expect(resolveFooterDataSet(rows, { logic: 'and', filters: [] }, true)).toBe(rows)
  })

  it('is empty when nothing matches, so the totals show "-" (EF-4)', () => {
    const none = { logic: 'and', filters: [{ field: 'country', operator: 'eq', value: 'Peru' }] }
    expect(resolveFooterDataSet(rows, none, true)).toEqual([])
  })

  it('reads the current rows, so a refreshed list (currency, Min Days) is totalled as it is now', () => {
    const converted = rows.map((r) => ({ ...r, currentVolume: r.currentVolume * 2 }))
    expect(resolveFooterDataSet(converted, spainOnly, true).map((r) => r.currentVolume)).toEqual([200, 600])
  })
})

describe('findFooterWeightField', () => {
  const columns = [
    { field: 'supplier' },
    { title: 'Current file', children: [{ field: 'currentPt', footerWeightField: 'currentVolume' }] },
    { title: 'Comparison file', children: [{ field: 'comparisonPt', footerWeightField: 'comparisonVolume' }] },
  ]

  it('finds the weight field inside grouped columns', () => {
    expect(findFooterWeightField(columns, 'currentPt')).toBe('currentVolume')
    expect(findFooterWeightField(columns, 'comparisonPt')).toBe('comparisonVolume')
  })

  it('is undefined for columns without one, so other grids keep their weighting', () => {
    expect(findFooterWeightField(columns, 'supplier')).toBeUndefined()
    expect(findFooterWeightField([{ field: 'actualPaymentTerms' }], 'actualPaymentTerms')).toBeUndefined()
    expect(findFooterWeightField(undefined, 'x')).toBeUndefined()
  })
})
