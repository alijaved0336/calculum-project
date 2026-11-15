import { describe, expect, it } from 'vitest'
import type { GraphqlGridColumnOrGroup } from '@ada/design-system/components/graphql-grid/types'
import { normalizeGraphqlGridColumns } from '@ada/design-system/components/graphql-grid/types'
import { buildGridExportRequest, toExportColumns } from '@/utils/gridExportRequest'
import { saleLineOverviewColumns } from '@/modules/opportunity/data/overviewColumns'
import { saleMatchColumnsGrid } from '@/modules/match/data/graphqlColumns'

const VERSION = '1653c234-9318-4707-a6c3-33f4b427126c'

const COLUMNS: GraphqlGridColumnOrGroup[] = [
  { field: 'buyerName', title: 'Buying Entity' },
  { field: 'volume', title: 'Spend Volume' },
  { field: 'alias', title: 'Alias', hidden: true },
  { field: 'paymentTermsAgreed', title: 'Payment Terms (Agreed)' },
  { field: 'customDataPoint3', title: 'Region manager' },
  {
    title: 'Group',
    children: [
      { field: 'currency', title: 'Currency' },
      { field: 'cashFlowAgreed', title: 'Cash Flow (Agreed)' },
      { field: 'dpo', title: 'DPO', hidden: true },
      { field: 'winningStrategy', title: 'Winning Strategy' },
    ],
  },
]

describe('toExportColumns', () => {
  it('keeps the visible GraphQL columns in display order, groups flattened', () => {
    expect(toExportColumns(COLUMNS).map((column) => column.field))
      .toEqual(['buyerName', 'volume', 'currency', 'winningStrategy'])
  })

  it('drops hidden, client-only and custom-attribute columns', () => {
    const fields = toExportColumns(COLUMNS).map((column) => column.field)

    expect(fields).not.toContain('alias')
    expect(fields).not.toContain('dpo')
    expect(fields).not.toContain('paymentTermsAgreed')
    expect(fields).not.toContain('cashFlowAgreed')
    expect(fields).not.toContain('customDataPoint3')
  })

  it("sends the column's title with it, never as hidden", () => {
    expect(toExportColumns(COLUMNS)[0]).toEqual({ field: 'buyerName', title: 'Buying Entity', hidden: false })
  })

  it('falls back to the field name when a column has no title', () => {
    expect(toExportColumns([{ field: 'volume' }])).toEqual([{ field: 'volume', title: 'volume', hidden: false }])
  })

  it('never offers a client-only or custom column of the real Opportunity sale-line set', () => {
    const fields = toExportColumns(normalizeGraphqlGridColumns(saleLineOverviewColumns())).map((column) => column.field)

    expect(fields.length).toBeGreaterThan(5)
    expect(fields.filter((field) => /^customDataPoint\d+$/.test(field))).toEqual([])
    expect(fields).not.toContain('paymentTermsAgreed')
    expect(fields).not.toContain('cashFlowAgreed')
  })

  it("drops only the given grain's client-only fields when the grid names them", () => {
    const columns: GraphqlGridColumnOrGroup[] = [{ field: 'creditLimit' }, { field: 'paymentTermsAgreed' }]

    expect(toExportColumns(columns, new Set(['paymentTermsAgreed'])).map((column) => column.field))
      .toEqual(['creditLimit'])
    expect(buildGridExportRequest({
      variables: { versionUuid: VERSION },
      columns,
      fileName: 'Buyers',
      clientOnlyFields: new Set(['paymentTermsAgreed']),
    })?.columns.map((column) => column.field)).toEqual(['creditLimit'])
  })

  it('exports the real Match set under its GraphQL names', () => {
    const fields = toExportColumns(normalizeGraphqlGridColumns(saleMatchColumnsGrid)).map((column) => column.field)

    expect(fields).toContain('matchStatus')
    expect(fields.filter((field) => /^customDataPoint\d+$/.test(field))).toEqual([])
  })
})

describe('buildGridExportRequest', () => {
  const variables = {
    versionUuid: VERSION,
    currencyRate: 0.92,
    where: { volume: { gte: 0 } },
    order: [{ volume: 'DESC' }],
    customFilters: [{ ordinal: 1, operator: 'EQ', value: 'x' }],
    step: 'payOnTerms',
    fullDisabled: false,
  }

  it("takes the grid's own last variables and nothing else of them", () => {
    const request = buildGridExportRequest({ variables, columns: COLUMNS, fileName: 'Sales' })

    expect(request).toEqual({
      versionUuid: VERSION,
      where: { volume: { gte: 0 } },
      order: [{ volume: 'DESC' }],
      customFilters: [{ ordinal: 1, operator: 'EQ', value: 'x' }],
      customSorts: null,
      currencyRate: 0.92,
      step: 'payOnTerms',
      columns: toExportColumns(COLUMNS),
      fileName: 'Sales',
    })
  })

  it('has no step key for a grid without a step, and nulls for an unfiltered, unsorted page', () => {
    const request = buildGridExportRequest({
      variables: { versionUuid: VERSION, currencyRate: 1, where: null, order: [] },
      columns: COLUMNS,
      fileName: 'Sales',
    })

    expect(request).not.toBeNull()
    expect('step' in request!).toBe(false)
    expect(request).toMatchObject({ where: null, order: [], customFilters: null, customSorts: null })
  })

  it('is null before the grid has fetched a page', () => {
    expect(buildGridExportRequest({ variables: undefined, columns: COLUMNS, fileName: 'Sales' })).toBeNull()
  })

  it('is null when no exportable column is visible', () => {
    expect(buildGridExportRequest({ variables, columns: [{ field: 'alias', hidden: true }], fileName: 'Sales' })).toBeNull()
  })
})
