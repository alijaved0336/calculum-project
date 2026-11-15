/**
 * Unit tests for totalColumnsUtils — custom data point bucket classification (WI#17313)
 */

import { describe, it, expect } from 'vitest'
import * as totalColumnsUtils from '@ada/design-system/utils/totalColumnsUtils'

describe('totalColumnsUtils — custom data point buckets', () => {
  const fields = ['volume', 'customDataPoint21', 'customDataPoint22', 'customDataPoint23', 'actualPaymentTerms']
  const types = {
    customDataPoint21: 'number',
    customDataPoint22: 'days',
    customDataPoint23: 'money',
  }

  it('routes a `days` custom data point to weighted avg, not sum', () => {
    expect(totalColumnsUtils.getTotalFieldsSummation(fields, types)).not.toContain('customDataPoint22')
    expect(totalColumnsUtils.getTotalFieldsWeightedAvg(fields, types)).toContain('customDataPoint22')
  })

  it('routes number/money custom data points to sum', () => {
    const sum = totalColumnsUtils.getTotalFieldsSummation(fields, types)
    expect(sum).toContain('customDataPoint21')
    expect(sum).toContain('customDataPoint23')
    expect(totalColumnsUtils.getTotalFieldsWeightedAvg(fields, types)).not.toContain('customDataPoint23')
  })

  it('keeps native fields in their static buckets', () => {
    expect(totalColumnsUtils.getTotalFieldsSummation(fields, types)).toContain('volume')
    expect(totalColumnsUtils.getTotalFieldsWeightedAvg(fields, types)).toContain('actualPaymentTerms')
  })

  it('falls back to sum for custom points when no type map is given (backward compatible)', () => {
    expect(totalColumnsUtils.getTotalFieldsSummation(fields)).toEqual(
      expect.arrayContaining(['customDataPoint21', 'customDataPoint22', 'customDataPoint23'])
    )
    expect(totalColumnsUtils.getTotalFieldsWeightedAvg(fields)).not.toContain('customDataPoint22')
  })

  it('never buckets text custom data points 1-20 (SUM(text) would null the whole summary)', () => {
    const textFields = ['customDataPoint1', 'customDataPoint9', 'customDataPoint20']
    expect(totalColumnsUtils.getTotalFieldsSummation(textFields)).toEqual([])
    expect(totalColumnsUtils.getTotalFieldsWeightedAvg(textFields)).toEqual([])
  })

  it('classifies true-value (count) fields', () => {
    const f = ['isSME', 'isVCardApplied', 'entityWomanOwnedBusiness', 'volume', 'customDataPoint21']
    const result = totalColumnsUtils.getTotalFieldsCountByTrueValue(f)
    expect(result).toEqual(['isSME', 'isVCardApplied', 'entityWomanOwnedBusiness'])
  })
})

describe('totalColumnsUtils — AR Opportunity Overview List field names (AB#20356)', () => {
  // These 3 lists are shared with AR's Opportunity Overview List grid (apps/ar), which gates a
  // column's footer on `footerCell` being set AND its field name appearing here. AR's own
  // `opportunity*`-prefixed globalColumns.ts exports introduced field names (notably the
  // "Avg"-suffixed buyer/parent-grain variants) that a footerCell alone doesn't make it into the
  // request for - this locks in that the backfill actually covers them.
  it('routes the buyer/parent-grain "Avg"-suffixed payment terms fields to weighted avg', () => {
    const avg = totalColumnsUtils.getTotalFieldsWeightedAvg([
      'actualPaymentTermsAvg',
      'contractualPaymentTermsWithoutCashDiscountsAvg',
      'contractualPaymentTermsWithCashDiscountsAvg',
    ])
    expect(avg).toEqual(expect.arrayContaining([
      'actualPaymentTermsAvg',
      'contractualPaymentTermsWithoutCashDiscountsAvg',
      'contractualPaymentTermsWithCashDiscountsAvg',
    ]))
  })

  // AB#20356 follow-up: Ada-Platform only ever defines this field under its WeightedAverage
  // summary nature (both grains) - listing it under sum 400'd the whole request the moment the
  // column had a footer (Ada-Platform's per-grain sum allow-list rejects it outright).
  it('routes AR\'s own Captured Cash Discount field (plural, unlike AP\'s singular one) to plain weighted avg, not sum', () => {
    expect(totalColumnsUtils.getTotalFieldsPlainWeightedAvg(['capturedCashDiscounts'])).toContain('capturedCashDiscounts')
    expect(totalColumnsUtils.getTotalFieldsSummation(['capturedCashDiscounts'])).not.toContain('capturedCashDiscounts')
  })

  it('routes AR\'s own Minority/Woman/Veteran-owned fields to count-true', () => {
    const trueValue = totalColumnsUtils.getTotalFieldsCountByTrueValue([
      'isMinorityOwned',
      'isWomanOwned',
      'isVeteranOwned',
    ])
    expect(trueValue).toEqual(expect.arrayContaining(['isMinorityOwned', 'isWomanOwned', 'isVeteranOwned']))
  })
})

describe('totalColumnsUtils.getActiveColumnsArray', () => {
  it('returns only the fields of columns that are not hidden', () => {
    const columns = [
      { field: 'volume', hidden: false },
      { field: 'actualPaymentTerms', hidden: true },
      { field: 'customDataPoint21', hidden: false },
    ]
    expect(totalColumnsUtils.getActiveColumnsArray(columns)).toEqual(['volume', 'customDataPoint21'])
  })

  it('returns an empty array when every column is hidden', () => {
    expect(totalColumnsUtils.getActiveColumnsArray([{ field: 'volume', hidden: true }])).toEqual([])
  })
})

describe('totalColumnsUtils.getTotalFieldsFooter', () => {
  const columnsGrid = [
    { field: 'volume' },
    { field: 'actualPaymentTerms' },
    { field: 'isSME' },
    { field: 'entityName' }, // present in grid but in none of the buckets -> blank
  ]
  // Note: the count.true branch is guarded on the avg-weighted value being numeric
  // (that is how the current implementation reads it), so isSME must also appear there.
  const totals = {
    sum: { volume: 1000 },
    'avg.weighted.ceil': { actualPaymentTerms: 45, isSME: 1 },
    'count.true': { isSME: 12 },
  }

  it('labels each field by its bucket (Sum / Avg Weighted / Count) and blanks the rest', async () => {
    const row = await totalColumnsUtils.getTotalFieldsFooter(
      totals as any,
      columnsGrid,
      [{ any: 'row' }], // non-empty successData
      ['volume'],
      ['actualPaymentTerms'],
      ['isSME'],
    )
    expect(row.volume).toBe('Sum: 1000')
    expect(row.actualPaymentTerms).toBe('Avg Weighted: 45')
    expect(row.isSME).toBe('Count: 12')
    expect(row.entityName).toBe('')
  })

  it('returns an empty row when there is no success data', async () => {
    const row = await totalColumnsUtils.getTotalFieldsFooter(
      totals as any,
      columnsGrid,
      [], // empty successData
      ['volume'],
      ['actualPaymentTerms'],
      ['isSME'],
    )
    expect(row).toEqual({})
  })
})
