import { describe, expect, it, vi } from 'vitest'
import { fetchGraphqlGridPage, type GraphqlGridQueryConfig } from '@/utils/graphqlGridQuery'

/**
 * fetchGraphqlGridPage's fetchPolicy — regression test for the "Clear all filters" bug: the
 * default 'cache-first' policy served a stale snapshot whenever a page/filter/sort combination had
 * already been fetched once, most commonly page 1 unfiltered with the default sort - exactly what
 * clearing a filter returns to. Every call must ask the server directly rather than risk that hit.
 */
describe('fetchGraphqlGridPage', () => {
  const config: GraphqlGridQueryConfig = {
    queryField: 'saleLineOverviewRows',
    operationName: 'SaleLineOverviewRows',
    filteredOperationName: 'SaleLineOverviewRowsFiltered',
    filterInputType: 'SaleLineOverviewRowFactFilterInput',
    sortInputType: 'SaleLineOverviewRowFactSortInput',
    scopeVariables: { versionUuid: 'UUID!' },
  }

  function mockApolloClient() {
    return {
      query: vi.fn().mockResolvedValue({
        data: { saleLineOverviewRows: { items: [], totalCount: 0 } },
      }),
    }
  }

  it('always fetches network-only, unfiltered', async () => {
    const apolloClient = mockApolloClient()

    await fetchGraphqlGridPage(apolloClient as never, config, {
      scope: { versionUuid: 'v1' },
      fields: ['saleLineId'],
    })

    expect(apolloClient.query).toHaveBeenCalledWith(
      expect.objectContaining({ fetchPolicy: 'network-only' }),
    )
  })

  it('always fetches network-only, filtered', async () => {
    const apolloClient = mockApolloClient()

    await fetchGraphqlGridPage(apolloClient as never, config, {
      scope: { versionUuid: 'v1' },
      fields: ['saleLineId'],
      where: { buyerName: { contains: 'Acme' } },
    })

    expect(apolloClient.query).toHaveBeenCalledWith(
      expect.objectContaining({ fetchPolicy: 'network-only' }),
    )
  })
})
