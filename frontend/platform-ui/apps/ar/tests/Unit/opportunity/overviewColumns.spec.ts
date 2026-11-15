import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { GraphqlGridColumn } from '@ada/design-system/components/graphql-grid/types'
import {
  saleLineOverviewColumns,
  buyerOverviewColumns,
  parentOverviewColumns,
  saleLineNineBoxColumns,
  buyerNineBoxColumns,
  parentNineBoxColumns,
  waterfallSaleLineOverviewColumns,
  entityCardSaleLineColumns,
} from '@/modules/opportunity/data/overviewColumns'
import {
  CLIENT_ONLY_FIELDS,
  NOT_SORTABLE,
  NOT_YET_SORTABLE_OR_FILTERABLE,
  TOTALS_NOT_YET_SUPPORTED,
  visibleOverviewRowFields,
  type OverviewGridLevel,
} from '@/modules/opportunity/data/overviewRows'
import { useContextStore } from '@/stores/context'

const LISTS: [string, OverviewGridLevel, () => GraphqlGridColumn[]][] = [
  ['saleLineOverviewColumns', 'saleLines', saleLineOverviewColumns],
  ['buyerOverviewColumns', 'buyers', buyerOverviewColumns],
  ['parentOverviewColumns', 'parents', parentOverviewColumns],
  ['saleLineNineBoxColumns', 'saleLines', saleLineNineBoxColumns],
  ['buyerNineBoxColumns', 'buyers', buyerNineBoxColumns],
  ['parentNineBoxColumns', 'parents', parentNineBoxColumns],
  ['waterfallSaleLineOverviewColumns', 'saleLines', waterfallSaleLineOverviewColumns],
  ['entityCardSaleLineColumns', 'saleLines', entityCardSaleLineColumns],
]

const isCustom = (column: GraphqlGridColumn) => /^customDataPoint\d+$/.test(column.field)
const visibleTitles = (columns: GraphqlGridColumn[]) =>
  columns.filter((column) => !column.hidden && !isCustom(column)).map((column) => column.title)

describe('AR grid column lists (column parity, 2026-10-02)', () => {
  /** AB#20485: two exports sharing one field once gave the column chooser two rows for it. */
  it.each(LISTS)('%s declares each field once', (_name, _level, build) => {
    const fields = build().map((column) => column.field)
    expect(fields.filter((field, index) => fields.indexOf(field) !== index)).toEqual([])
  })

  it.each(LISTS)('%s shows Credit Rating from the creditRating label, never the numeric creditScore', (_name, _level, build) => {
    const columns = build()
    expect(columns.some((column) => column.field === 'creditScore')).toBe(false)
    const creditRating = columns.find((column) => column.field === 'creditRating')
    if (creditRating) {
      expect(creditRating.title).toBe('Credit Rating')
      expect(creditRating.hidden).toBe(false)
      expect(creditRating.filter).toBe('text')
    }
  })

  it.each(LISTS)('%s keeps a field the backend does not expose yet hidden, empty and out of the query', (_name, level, build) => {
    const columns = build()
    const placeholders = columns.filter((column) => CLIENT_ONLY_FIELDS[level].has(column.field))
    for (const column of placeholders) {
      expect(column.hidden, column.field).toBe(true)
      expect(column.sortable, column.field).toBe(false)
      expect(column.filter, column.field).toBeUndefined()
      expect(column.columnMenu, column.field).toBe(false)
      expect(column.footerCell, column.field).toBeUndefined()
    }
    // Even with every column switched on, none of them reaches the GraphQL selection.
    const allVisible = columns.map((column) => ({ ...column, hidden: false }))
    const selected = visibleOverviewRowFields(level, allVisible)
    expect(selected.filter((field) => CLIENT_ONLY_FIELDS[level].has(field))).toEqual([])
  })

  it.each(LISTS)('%s never lets a field the backend cannot sort or filter by yet be sorted or filtered', (_name, level, build) => {
    const columns = build().filter((column) => NOT_YET_SORTABLE_OR_FILTERABLE[level].has(column.field))
    for (const column of columns) {
      expect(column.sortable, column.field).toBe(false)
      expect(column.filter, column.field).toBeUndefined()
      // AB#21102: `filter: undefined` alone still leaves Kendo's menu offering a text filter.
      expect(column.columnMenu, column.field).toBe(false)
    }
  })

  it.each(LISTS)('%s lets a leverage band be filtered but never sorted', (_name, level, build) => {
    const columns = build().filter((column) => NOT_SORTABLE[level].has(column.field))
    for (const column of columns) {
      expect(column.sortable, column.field).toBe(false)
      expect(column.filter, column.field).toBe('text')
    }
  })

  /** AB#20905: the backend now serves, sorts and filters every strategy candidate and the party roll-ups. */
  it('the strategy candidates and the new projections are real, sortable and filterable columns', () => {
    const lines = saleLineOverviewColumns()
    for (const field of [
      'payOnTermsStrategy', 'clientStandardStrategy', 'buyerPolicyStrategy', 'creditLimitMaxStrategy',
      'regulatoryTermsStrategy', 'buyerStandardStrategy', 'companySize', 'creditLimit', 'creditOutstanding',
      'creditOutstandingWithPastDue', 'negotiationStatus',
    ]) {
      expect(lines.find((column) => column.field === field), field).toMatchObject({ sortable: true })
      expect(lines.find((column) => column.field === field)?.filter, field).toBeDefined()
    }
    const parents = parentOverviewColumns()
    for (const field of ['exclusionReasons', 'supplierEntities', 'buyerCount', 'companySize', 'negotiationStatus']) {
      expect(parents.find((column) => column.field === field), field).toMatchObject({ sortable: true })
    }
    // Shown on demand, they now reach the GraphQL selection.
    const allVisible = lines.map((column) => ({ ...column, hidden: false }))
    expect(visibleOverviewRowFields('saleLines', allVisible)).toEqual(
      expect.arrayContaining(['payOnTermsStrategy', 'companySize', 'creditOutstanding', 'regulatoryTermsEnforced', 'industryCode']),
    )
  })

  it("reads Agreed, Regulation Type, NAICS 4 and Supplying Entities under the backend's own names", () => {
    const fields = (columns: GraphqlGridColumn[]) => columns.map((column) => column.field)
    for (const [, , build] of LISTS) {
      for (const old of ['paymentTermsAgreed', 'cashFlowAgreed', 'regulationType', 'industryNaics4', 'supplierNames']) {
        expect(fields(build()), old).not.toContain(old)
      }
    }
    const lines = saleLineOverviewColumns()
    expect(lines.find((column) => column.field === 'regulatoryTermsEnforced')).toMatchObject({
      title: 'Regulation Type', cell: 'regulationTypeTemplate', filter: 'boolean',
    })
    expect(lines.find((column) => column.field === 'industryCode')?.title).toBe('Industry (NAICS 4)')
    expect(lines.find((column) => column.field === 'termsWithoutCashDiscount')).toMatchObject({
      title: 'Payment Terms - Agreed (days)', sortable: false, filter: undefined, footerCell: undefined,
    })
    expect(lines.find((column) => column.field === 'agreedCashFlow')?.footerCell).toBeUndefined()
    expect(buyerOverviewColumns().find((column) => column.field === 'supplierEntities')?.title).toBe('Supplying Entities')
  })

  it('Pay on Terms is a line-grain column only: a party reads it as its Contractual Payment Terms', () => {
    for (const build of [buyerOverviewColumns, parentOverviewColumns]) {
      expect(build().some((column) => column.field === 'payOnTermsStrategy')).toBe(false)
    }
    expect(saleLineOverviewColumns().some((column) => column.field === 'payOnTermsStrategy')).toBe(true)
  })

  it('Opportunity › Buyers opens on the parity document\'s visible columns, in order', () => {
    expect(visibleTitles(buyerOverviewColumns())).toEqual([
      'Buyer Name', 'Number of Sales Lines', 'Parents', 'Sales Volume',
      'Payment Terms - Contractual (days)', 'Avg. Days Paid (DSO) (days)', '9 Boxes - Terms Reduction',
      'Economic Profit Impact', 'Probability of Success', 'Payment Terms - Opportunity (days)',
      'Cash Flow - Opportunity', 'Parent / Buyer Min (Strategy)', 'Industry / Region Standard (Strategy)',
      'Buyer Standard (Strategy)', 'Peer Group Standard (Strategy)', 'Regulatory Terms (Strategy)',
      'Sales Team', 'Buyer Leverage', 'Country (Buyer)', 'Industry Name', 'Commodity', 'Credit Rating',
      'Credit Limit', 'Supplier Impact (Cash Flow)',
    ])
  })

  it('AB#21131: Excluded and Exclusion Reason close every list that shows them, at the right end, hidden by default', () => {
    for (const build of [saleLineOverviewColumns, buyerOverviewColumns, parentOverviewColumns]) {
      const [excluded, reason] = build().slice(-2)
      expect([excluded.title, reason.title]).toEqual(['Excluded', 'Exclusion Reason'])
      expect([excluded.hidden, reason.hidden]).toEqual([true, true])
    }
  })

  it('AB#21129: the Sales Lines level titles its alias column "Sales Alias"', () => {
    expect(saleLineOverviewColumns().find((column) => column.field === 'alias')?.title).toBe('Sales Alias')
  })

  it('the Parents level names its own entity column "Parents" and has no separate Parents column', () => {
    const columns = parentOverviewColumns()
    expect(columns[0]).toMatchObject({ field: 'name', title: 'Parents' })
    expect(columns.some((column) => column.field === 'parentName')).toBe(false)
  })

  it('9 Boxes carries no strategy columns', () => {
    for (const build of [saleLineNineBoxColumns, buyerNineBoxColumns, parentNineBoxColumns]) {
      expect(build().filter((column) => column.field.endsWith('Strategy'))).toEqual([])
    }
  })

  it('the Waterfall keeps Cash Flow - Contribution and drops the before/after step columns', () => {
    const columns = waterfallSaleLineOverviewColumns()
    expect(columns.find((column) => column.field === 'cashFlowContribution')).toMatchObject({
      title: 'Cash Flow - Contribution', hidden: false, sortable: false, filter: undefined, columnMenu: false,
    })
    expect(columns.some((column) => column.field === 'previousTerm' || column.field === 'stepTerm')).toBe(false)
  })

  const footers = (columns: GraphqlGridColumn[]) =>
    Object.fromEntries(columns.filter((column) => column.footerCell).map((column) => [column.field, column.footerCell]))
  const SUM = 'TotalsBycolumnsSum'
  const AVG = 'TotalsBycolumnsAvgWeightedCeil'

  it('footer totals follow the parity document (AR Column Parity (2)), nothing else totals', () => {
    expect(footers(saleLineOverviewColumns())).toEqual({
      volume: SUM, cashFlowImpact: SUM, outstanding: SUM,
      contractualPaymentTermsWithoutCashDiscounts: AVG, actualPaymentTerms: AVG,
      contractualPaymentTermsWithCashDiscounts: AVG, recommendedTerm: AVG,
    })
    expect(footers(buyerOverviewColumns())).toEqual({
      saleLineCount: SUM, volume: SUM, cashFlowImpact: SUM, outstanding: SUM,
      contractualPaymentTermsWithoutCashDiscountsAvg: AVG, actualPaymentTermsAvg: AVG,
      contractualPaymentTermsWithCashDiscountsAvg: AVG, recommendedTerm: AVG,
    })
    expect(footers(parentNineBoxColumns())).toEqual({
      buyerCount: SUM, volume: SUM, cashFlowImpact: SUM,
      contractualPaymentTermsWithoutCashDiscountsAvg: AVG, actualPaymentTermsAvg: AVG,
      contractualPaymentTermsWithCashDiscountsAvg: AVG, recommendedTerm: AVG,
    })
  })

  it('the Waterfall drill-in totals like the line lists, plus its own Cash Flow - Contribution', () => {
    expect(footers(waterfallSaleLineOverviewColumns())).toEqual({
      volume: SUM, cashFlowImpact: SUM, cashFlowContribution: SUM,
      contractualPaymentTermsWithoutCashDiscounts: AVG, actualPaymentTerms: AVG,
      contractualPaymentTermsWithCashDiscounts: AVG, recommendedTerm: AVG,
    })
  })

  it.each(LISTS)('%s keeps no footer on a total the backend cannot compute yet', (_name, level, build) => {
    const pending = build().filter((column) => TOTALS_NOT_YET_SUPPORTED[level].has(column.field))
    expect(pending.filter((column) => column.footerCell).map((column) => column.field)).toEqual([])
  })

  it("titles the client's own standard strategy with the signed-in company's name", () => {
    expect(saleLineOverviewColumns().find((column) => column.field === 'clientStandardStrategy')?.title)
      .toBe('Client Standard (Strategy)')

    setActivePinia(createPinia())
    useContextStore().companyName = 'Novonesis'
    expect(saleLineOverviewColumns().find((column) => column.field === 'clientStandardStrategy')?.title)
      .toBe('Novonesis Standard (Strategy)')
  })
})

/**
 * AB#20657 (AC-09): the backend applies a line's Target over its strategy winner upstream, so the
 * Opportunity columns already carry the target-adjusted values ("Opportunity/Target") and no
 * separate Target column is shown. The AR Column Parity document (2026-10-02) still lists Target
 * Payment Terms / Cash Flow - Target in the column chooser, hidden by default - offered, not shown.
 */
describe('Opportunity Overview columns - Target columns hidden by default (AB#20657)', () => {
  it.each([
    ['saleLineOverviewColumns', saleLineOverviewColumns],
    ['buyerOverviewColumns', buyerOverviewColumns],
    ['parentOverviewColumns', parentOverviewColumns],
  ])('%s shows the coalesced pair and keeps any targetPaymentTerms/targetCashFlow column hidden', (_name, buildColumns) => {
    const columns = buildColumns()
    const byField = (field: string) => columns.find((column) => column.field === field)

    expect(byField('recommendedTerm')?.hidden).toBe(false)
    expect(byField('cashFlowImpact')?.hidden).toBe(false)
    for (const field of ['targetPaymentTerms', 'targetCashFlow']) {
      const column = byField(field)
      if (column) expect(column.hidden).toBe(true)
    }
  })
})
