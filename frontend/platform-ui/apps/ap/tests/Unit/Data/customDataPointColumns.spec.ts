/**
 * Structural tests for the column/filter definitions added with custom data points 21-26.
 *
 * These grid/filter config modules are plain data. The tests import them (which executes
 * every column definition) and assert that the six new numeric custom data points 21-26
 * are present and correctly shaped — guarding against an accidental rename/deletion of the
 * `customDataPoint21..26` fields the PR wired through the analyze, plan, overview and
 * global-filter surfaces.
 */

import { describe, it, expect } from 'vitest'

import * as globalColumns from '@ada/design-system/data/globalColumns'
import * as analyzeCols from '@/modules/home/analyze/data/graphqlColums'
import * as nineBoxesCols from '@/modules/home/analyze/data/9boxesGraphQlColumns'
import * as waterfallCols from '@/modules/home/analyze/data/waterfallGraphQlColumns'
import * as planCols from '@/modules/home/plan/data/graphqlColumns'
import * as overviewCols from '@/modules/home/overview/data/graphqlColumns'
import { panelBarItemsCustomDataPointsDefault, panelBarItemsDefault } from '@/modules/globalFilters/data'

const NUMERIC_CDPS = [21, 22, 23, 24, 25, 26] as const

// Flatten any nested column definition (children[]) into a flat list of leaf columns.
function flattenColumns(cols: any[]): any[] {
  const out: any[] = []
  for (const c of cols ?? []) {
    if (c && Array.isArray(c.children)) out.push(...flattenColumns(c.children))
    else out.push(c)
  }
  return out
}

function allFieldsOf(mod: Record<string, unknown>): Set<string> {
  const fields = new Set<string>()
  for (const value of Object.values(mod)) {
    if (Array.isArray(value)) {
      for (const col of flattenColumns(value)) {
        if (col && typeof col.field === 'string') fields.add(col.field)
      }
    }
  }
  return fields
}

describe('globalColumns — numeric custom data points 21-26', () => {
  it('exports a non-empty column definition for every numeric custom data point 21-26', () => {
    for (const n of NUMERIC_CDPS) {
      const col = (globalColumns as any)[`customDataPoint${n}`]
      expect(Array.isArray(col), `customDataPoint${n} should be an array`).toBe(true)
      expect(col.length).toBeGreaterThan(0)
      expect(col[0].field).toBe(`customDataPoint${n}`)
    }
  })
})

describe('grid column sets expose the numeric custom data points', () => {
  const modules: Array<[string, Record<string, unknown>]> = [
    ['analyze graphqlColums', analyzeCols],
    ['9boxes', nineBoxesCols],
    ['waterfall', waterfallCols],
    ['plan', planCols],
    ['overview', overviewCols],
  ]

  it.each(modules)('%s exports only non-empty column arrays', (_name, mod) => {
    const arrays = Object.values(mod).filter(Array.isArray) as any[][]
    expect(arrays.length).toBeGreaterThan(0)
    for (const arr of arrays) expect(arr.length).toBeGreaterThan(0)
  })

  it('at least one analyze/plan grid set references customDataPoint21..26', () => {
    const analyzeFields = allFieldsOf(analyzeCols)
    const planFields = allFieldsOf(planCols)
    const nineBoxFields = allFieldsOf(nineBoxesCols)
    const union = new Set([...analyzeFields, ...planFields, ...nineBoxFields])
    for (const n of NUMERIC_CDPS) {
      expect(union.has(`customDataPoint${n}`), `customDataPoint${n} missing from analyze/plan/9boxes grids`).toBe(true)
    }
  })
})

describe('global filter panel — custom data points 21-26 use rangeSlider', () => {
  it('exposes the default panel bar items as a non-empty array', () => {
    expect(Array.isArray(panelBarItemsDefault)).toBe(true)
    expect(panelBarItemsDefault.length).toBeGreaterThan(0)
  })

  it('defines each numeric custom data point 21-26 as a rangeSlider filter', () => {
    const byField = new Map(
      panelBarItemsCustomDataPointsDefault.map((item: any) => [item.field, item])
    )
    for (const n of NUMERIC_CDPS) {
      const item = byField.get(`customDataPoint${n}`)
      expect(item, `customDataPoint${n} missing from panelBarItemsCustomDataPointsDefault`).toBeDefined()
      expect(item.filterType).toBe('rangeSlider')
    }
  })
})
