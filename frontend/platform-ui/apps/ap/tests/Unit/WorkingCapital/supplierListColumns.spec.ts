/**
 * WI#20545 — Achievement List columns: both files side by side (AC-06), every column
 * filterable (FR-06), totals that add amounts and weight each file's terms by that
 * file's own volume (AC-11), and the currency in the money headers (AC-13).
 */

import { describe, it, expect } from 'vitest'
import {
  buildSupplierListColumns,
  buildSupplierListExcelColumns,
} from '@/modules/home/workingCapital/data/supplierListColumns'

const t = (key: string, values?: Record<string, unknown>) =>
  values?.currency ? `${key}(${values.currency})` : key

type Column = Record<string, any>
const leaves = (columns: Column[]): Column[] =>
  columns.flatMap((c) => (c.children ? leaves(c.children) : [c]))

describe('buildSupplierListColumns', () => {
  const columns = buildSupplierListColumns(t, 'EUR') as Column[]
  const byField = Object.fromEntries(leaves(columns).map((c) => [c.field, c]))

  it('groups the four values under the current file and the comparison file', () => {
    const groups = columns.filter((c) => c.children)
    expect(groups.map((g) => g.title)).toEqual([
      'home.workingCapital.list.columns.currentFile',
      'home.workingCapital.list.columns.comparisonFile',
    ])
    expect(groups[0].children.map((c: Column) => c.field)).toEqual(['currentPt', 'currentVolume', 'currentCfOpportunity', 'currentTargetPt'])
    expect(groups[1].children.map((c: Column) => c.field)).toEqual(['comparisonPt', 'comparisonVolume', 'comparisonCfOpportunity', 'comparisonTargetPt'])
  })

  it('shows name, country and the translated status first', () => {
    expect(columns.slice(0, 3).map((c) => c.field)).toEqual(['supplier', 'country', 'statusLabel'])
  })

  it('lets every column be filtered (FR-06)', () => {
    for (const column of leaves(columns)) {
      expect(column.columnMenu, column.field).toBe('columnMenuTemplate')
      expect(column.filter, column.field).toBeTruthy()
    }
  })

  it('adds up volumes and opportunities in the totals row', () => {
    for (const field of ['currentVolume', 'currentCfOpportunity', 'comparisonVolume', 'comparisonCfOpportunity']) {
      expect(byField[field].footerCell, field).toBe('moneyRoundSummaryTemplate')
    }
  })

  it('weights each file\'s terms and target by that file\'s own volume (AC-11)', () => {
    for (const field of ['currentPt', 'currentTargetPt']) {
      expect(byField[field].footerCell).toBe('weightAvgRoundSummaryNoneDecimalsTemplate')
      expect(byField[field].footerWeightField).toBe('currentVolume')
    }
    for (const field of ['comparisonPt', 'comparisonTargetPt']) {
      expect(byField[field].footerCell).toBe('weightAvgRoundSummaryNoneDecimalsTemplate')
      expect(byField[field].footerWeightField).toBe('comparisonVolume')
    }
  })

  it('puts the currency in the money headers', () => {
    expect(byField.currentVolume.title).toBe('home.workingCapital.list.columns.spendVolume(EUR)')
    expect(byField.comparisonCfOpportunity.title).toBe('home.workingCapital.list.columns.cfOpportunity(EUR)')
  })

  it('sets no fixed widths, so the columns fit the screen without scrolling sideways', () => {
    for (const column of leaves(columns)) {
      expect(column.width, column.field).toBeUndefined()
    }
  })
})

describe('buildSupplierListExcelColumns', () => {
  const columns = buildSupplierListExcelColumns(t, 'USD', { current: 'Pagero', comparison: 'Pagero old' }) as Column[]
  const excelLeaves = (cols: Column[]): Column[] => cols.flatMap((c) => (c.children ? excelLeaves(c.children) : [c]))

  it('exports every List column', () => {
    expect(excelLeaves(columns).map((c) => c.field)).toEqual([
      'supplier', 'country', 'statusLabel',
      'currentPt', 'currentVolume', 'currentCfOpportunity', 'currentTargetPt',
      'comparisonPt', 'comparisonVolume', 'comparisonCfOpportunity', 'comparisonTargetPt',
    ])
  })

  it('groups each file under a header with its name, like the grid', () => {
    expect(columns.filter((c) => c.children).map((c) => c.title)).toEqual([
      'home.workingCapital.list.columns.currentFile: Pagero',
      'home.workingCapital.list.columns.comparisonFile: Pagero old',
    ])
  })

  it('names the currency in the money headers (AC-13)', () => {
    const volume = excelLeaves(columns).find((c) => c.field === 'comparisonVolume')!
    expect(volume.title).toBe('home.workingCapital.list.columns.spendVolume(USD)')
  })
})
