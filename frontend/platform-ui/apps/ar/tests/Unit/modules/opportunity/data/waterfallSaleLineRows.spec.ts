import { describe, expect, it, vi } from 'vitest'
import {
  fetchWaterfallSaleLineRows,
  visibleWaterfallSaleLineFields,
  waterfallSaleLineColumns,
} from '@/modules/opportunity/data/waterfallSaleLineRows'

/**
 * UC-API-18's drill-in: `waterfallSaleLineRows(versionUuid, step, currencyRate, fullDisabled, ...)`,
 * scoped by the selected waterfall step (or the literal `total`) rather than by `versionUuid` alone.
 */
describe('fetchWaterfallSaleLineRows', () => {
  function stubApolloClient(data: unknown) {
    return { query: vi.fn().mockResolvedValue({ data }) } as any
  }

  it('scopes the query to the version, the selected step and the currency rate', async () => {
    const apolloClient = stubApolloClient({
      waterfallSaleLineRows: {
        totalCount: 1,
        items: [{ saleLineId: 1, previousTerm: 45, stepTerm: 30, cashFlowContribution: 900 }],
      },
    })

    const page = await fetchWaterfallSaleLineRows(
      apolloClient,
      'version-uuid-1',
      'buyerStandard',
      ['saleLineId', 'previousTerm', 'stepTerm', 'cashFlowContribution'],
      { currencyRate: 1.2 },
    )

    expect(page.total).toBe(1)
    expect(page.items).toEqual([{ saleLineId: 1, previousTerm: 45, stepTerm: 30, cashFlowContribution: 900 }])

    const call = apolloClient.query.mock.calls[0][0]
    expect(call.variables).toMatchObject({
      versionUuid: 'version-uuid-1',
      step: 'buyerStandard',
      currencyRate: 1.2,
      fullDisabled: false,
    })
  })

  it('asks for the total drill-in with the literal "total" step', async () => {
    const apolloClient = stubApolloClient({ waterfallSaleLineRows: { totalCount: 0, items: [] } })

    await fetchWaterfallSaleLineRows(apolloClient, 'version-uuid-1', 'total', ['saleLineId'])

    expect(apolloClient.query.mock.calls[0][0].variables).toMatchObject({ step: 'total' })
  })

  it('passes the requested page through to the query', async () => {
    const apolloClient = stubApolloClient({ waterfallSaleLineRows: { totalCount: 120, items: [] } })

    await fetchWaterfallSaleLineRows(apolloClient, 'version-uuid-1', 'total', ['saleLineId'], { skip: 50, take: 25 })

    expect(apolloClient.query.mock.calls[0][0].variables).toMatchObject({ skip: 50, take: 25 })
  })

  it('AB#21102: sends the column filter as where and custom attributes as the customFilters argument', async () => {
    const apolloClient = stubApolloClient({ waterfallSaleLineRows: { totalCount: 0, items: [] } })
    const customFilters = [{ ordinal: 1, operator: 'contains', value: 'x' }] as any

    await fetchWaterfallSaleLineRows(apolloClient, 'version-uuid-1', 'total', ['saleLineId'], {
      where: { and: [{ buyerName: { contains: 'HP' } }] },
      customFilters,
    })

    const call = apolloClient.query.mock.calls[0][0]
    expect(call.variables).toMatchObject({ where: { and: [{ buyerName: { contains: 'HP' } }] }, customFilters })
    expect(call.query.loc.source.body).toContain('customFilters: $customFilters')
  })

  it('leaves customFilters out of an unfiltered page', async () => {
    const apolloClient = stubApolloClient({ waterfallSaleLineRows: { totalCount: 0, items: [] } })

    await fetchWaterfallSaleLineRows(apolloClient, 'version-uuid-1', 'total', ['saleLineId'])

    const call = apolloClient.query.mock.calls[0][0]
    expect(call.variables).not.toHaveProperty('customFilters')
    expect(call.query.loc.source.body).not.toContain('customFilters')
  })
})

describe('waterfallSaleLineColumns', () => {
  it("is the Waterfall's own list: Cash Flow - Contribution, without the before/after step columns", () => {
    const columns = waterfallSaleLineColumns()
    const fields = columns.map((column) => column.field)

    expect(fields).toContain('volume')
    expect(fields).toContain('cashFlowImpact')
    // Column parity (2026-10-02): the intermediate step is not a column.
    expect(fields).not.toContain('previousTerm')
    expect(fields).not.toContain('stepTerm')

    // Resolved per row after paging (UC-API-18), so neither filterable nor sortable.
    const contribution = columns.find((c) => c.field === 'cashFlowContribution')
    expect(contribution?.sortable).toBe(false)
    expect(contribution?.filter).toBeUndefined()
  })

  it('selects every visible field, including the step-scoped contribution', () => {
    const fields = visibleWaterfallSaleLineFields(waterfallSaleLineColumns())

    expect(fields).toContain('cashFlowContribution')
    expect(fields).toContain('volume')
  })
})
