import { describe, it, expect } from 'vitest'
import { flattenGraphqlGridColumns, type GraphqlGridColumnFilterType } from '@ada/design-system/components/graphql-grid/types'
import { saleMatchColumnsGrid } from '@/modules/match/data/graphqlColumns'

/**
 * Filtering a `saleMatchRows` column takes two things agreeing at a distance: this grid's column
 * must set Kendo's `filter` type, AND Ada-Platform's `SaleMatchRowFilterInputType`
 * (Ada.Ar.Api/GraphQL/SaleMatchRowTypes.cs) must expose that same field, or the query is rejected
 * before a row is read. `filter` alone looks like it works - the column menu opens with a normal
 * text/number box - right up until the query round-trips and GraphQL refuses it.
 *
 * This pins the fields BOTH sides already agree on today, so a future edit that removes a column's
 * `filter` (or changes its type against what the backend field actually is) fails here instead of
 * silently reopening a broken filter box. It is not the full column list: several grid columns
 * (address, city, state, zipCode, domain, country, the payment-term and cash-discount fields,
 * confidenceScore, and others) are displayed but have no backend filter support yet - tracked
 * separately, not asserted here.
 *
 * isMatched/isExcluded are still backend-filterable but no longer grid columns (column parity,
 * 2026-10-02: Match Status replaces them); the chart drill-down still filters on them through
 * ListMatch's `chartFilter`, which builds its `where` without needing a column.
 */
const BACKEND_FILTERABLE_FIELDS: Record<string, GraphqlGridColumnFilterType> = {
  matchStatus: 'text',
  buyerName: 'text',
  originalBuyerName: 'text',
  aggregatedLinesCount: 'numeric',
  parentCompanyName: 'text',
  volume: 'numeric',
  commodity: 'text',
  buyerCountryCode: 'text',
  currency: 'text',
  actualPaymentTerms: 'numeric',
  noMatchReason: 'text',
}

describe('sale match grid filters', () => {
  const columns = flattenGraphqlGridColumns(saleMatchColumnsGrid)
  const byField = new Map(columns.map((column) => [column.field, column]))

  it('defines every backend-filterable field as a grid column', () => {
    for (const field of Object.keys(BACKEND_FILTERABLE_FIELDS)) {
      expect(byField.has(field), `column "${field}" is missing from saleMatchColumnsGrid`).toBe(true)
    }
  })

  it.each(Object.entries(BACKEND_FILTERABLE_FIELDS))(
    'sets "%s" to filter type %s',
    (field, expectedType) => {
      const column = byField.get(field)
      expect(column?.filter).toBe(expectedType)
    },
  )

  it('does not opt a backend-filterable column out of the column menu', () => {
    // `columnMenu: false` is how a column opts out of Kendo's default filter popup - ListMatch.vue
    // itself overrides this to `true` unconditionally, but a raw `false` here would still be a lie
    // about the column's own definition, worth catching independently of that override.
    for (const field of Object.keys(BACKEND_FILTERABLE_FIELDS)) {
      expect(byField.get(field)?.columnMenu).not.toBe(false)
    }
  })

  it('AB#20537: overrides only the volume column\'s title, keeping the rest of globalColumns.volume', () => {
    // Regression for a review finding on graphqlColumns.ts: the override used to spread
    // `globalColumns.volume[0]` alone rather than mapping the whole group, which would have
    // silently dropped any later entries the group gained. Asserting the non-title properties
    // survive alongside the AR-specific title is what a naive re-introduction of that shape
    // would still pass on today's single-entry group but a `.map` regression elsewhere would not.
    const volume = byField.get('volume')
    expect(volume?.title).toBe('Sales Volume')
    expect(volume?.cell).toBe('moneyTemplate')
    expect(volume?.footerCell).toBe('TotalsBycolumnsSum')
    expect(volume?.sortable).toBe(true)
    expect(volume?.resizable).toBe(true)
  })

  it('column parity: no Matched / Excluded columns, Match Status first, No Match Reason shown as Exclusion Reason', () => {
    expect(byField.has('isMatched')).toBe(false)
    expect(byField.has('isExcluded')).toBe(false)
    expect(columns[0].field).toBe('matchStatus')
    expect(columns[0].title).toBe('Match Status')
    expect(byField.get('noMatchReason')?.title).toBe('Exclusion Reason')
    expect(byField.get('noMatchReason')?.hidden).toBe(false)
    expect(byField.get('buyerName')?.hidden).toBe(false)
    expect(byField.get('originalBuyerName')?.hidden).toBe(false)
  })

  it('column parity: totals Sales Volume and the three payment terms, like AP, nothing else', () => {
    expect(Object.fromEntries(columns.filter((column) => column.footerCell).map((column) => [column.field, column.footerCell]))).toEqual({
      volume: 'TotalsBycolumnsSum',
      contractualPaymentTermsWithoutCashDiscounts: 'TotalsBycolumnsAvgWeightedCeil',
      actualPaymentTerms: 'TotalsBycolumnsAvgWeightedCeil',
      contractualPaymentTermsWithCashDiscounts: 'TotalsBycolumnsAvgWeightedCeil',
    })
  })
})
