/**
 * WI#20545 — the Achievement List rows: one conversion for the grid and the Excel file,
 * so the two always agree. Covers AC-05 (empty comparison values), AC-12 (amounts in the
 * selected currency), EF-1 (missing values stay empty) and EF-3 (no rate -> company
 * currency, unconverted).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { rate } = vi.hoisted(() => ({ rate: { value: 2 } }))
vi.mock('@/utils/FormatData', () => ({
  changeToCurrency: (amount: number) => Number(amount) * rate.value,
}))

import {
  resolveSupplierListCurrency,
  supplierListStatusLabel,
  toSupplierListRows,
} from '@/modules/home/workingCapital/utils/supplierList'
import type { SupplierListItem } from '@/modules/home/workingCapital/types'

const t = (key: string) => `t:${key}`

const matched: SupplierListItem = {
  supplier: 'Aska',
  country: 'Japan',
  status: 'matchedIncreased',
  currentPt: 60,
  currentVolume: 1000,
  currentCfOpportunity: 82,
  currentTargetPt: 90,
  comparisonPt: 30,
  comparisonVolume: 730,
  comparisonCfOpportunity: -40,
  comparisonTargetPt: 70,
}

const notMatched: SupplierListItem = {
  supplier: 'Beta',
  country: 'Spain',
  status: 'notMatched',
  currentPt: null,
  currentVolume: 500,
  currentCfOpportunity: null,
  currentTargetPt: null,
  comparisonPt: null,
  comparisonVolume: null,
  comparisonCfOpportunity: null,
  comparisonTargetPt: null,
}

describe('supplierList rows', () => {
  beforeEach(() => {
    rate.value = 2
  })

  it('translates each status', () => {
    expect(supplierListStatusLabel('matchedIncreased', t)).toBe('t:home.workingCapital.list.status.matchedIncreased')
    expect(supplierListStatusLabel('matched', t)).toBe('t:home.workingCapital.list.status.matched')
    expect(supplierListStatusLabel('notMatched', t)).toBe('t:home.workingCapital.list.status.notMatched')
  })

  it('converts every amount to the selected currency and leaves the days alone (AC-12)', () => {
    const [row] = toSupplierListRows([matched], t, resolveSupplierListCurrency('EUR', 'USD', false))

    expect(row.currentVolume).toBe(2000)
    expect(row.currentCfOpportunity).toBe(164)
    expect(row.comparisonVolume).toBe(1460)
    // AF-4: a negative opportunity stays negative.
    expect(row.comparisonCfOpportunity).toBe(-80)
    expect(row.currentPt).toBe(60)
    expect(row.currentTargetPt).toBe(90)
    expect(row.comparisonPt).toBe(30)
    expect(row.comparisonTargetPt).toBe(70)
    expect(row.statusLabel).toBe('t:home.workingCapital.list.status.matchedIncreased')
  })

  it('keeps the empty values empty instead of converting them to 0 (AC-05, EF-1)', () => {
    const [row] = toSupplierListRows([notMatched], t, resolveSupplierListCurrency('EUR', 'USD', false))

    expect(row.comparisonPt).toBeNull()
    expect(row.comparisonVolume).toBeNull()
    expect(row.comparisonCfOpportunity).toBeNull()
    expect(row.comparisonTargetPt).toBeNull()
    expect(row.currentCfOpportunity).toBeNull()
    expect(row.currentVolume).toBe(1000)
  })

  it('follows a new rate on the next call (AC-12)', () => {
    const currency = resolveSupplierListCurrency('EUR', 'USD', false)
    expect(toSupplierListRows([matched], t, currency)[0].currentVolume).toBe(2000)

    rate.value = 3
    expect(toSupplierListRows([matched], t, currency)[0].currentVolume).toBe(3000)
  })

  it('stays in the company currency when the conversion is unavailable (EF-3)', () => {
    const currency = resolveSupplierListCurrency('EUR', 'USD', true)
    const [row] = toSupplierListRows([matched], t, currency)

    expect(currency.code).toBe('USD')
    expect(row.currentVolume).toBe(1000)
    expect(row.comparisonCfOpportunity).toBe(-40)
  })

  it('uses the selected currency code when the conversion works', () => {
    expect(resolveSupplierListCurrency('EUR', 'USD', false).code).toBe('EUR')
  })

  it('keeps one row per supplier, in the order received', () => {
    const rows = toSupplierListRows([matched, notMatched], t, resolveSupplierListCurrency('EUR', 'USD', false))
    expect(rows.map((r) => r.supplier)).toEqual(['Aska', 'Beta'])
  })
})
