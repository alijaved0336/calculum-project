import { describe, expect, it, vi } from 'vitest'
import { fetchWaterfallBucketBuyers } from '@/modules/opportunity/data/waterfallBucketBuyers'

/**
 * UC-UI-03 step 3: "Analyst opens a bucket into the filtered list." The list has to be drawn from
 * the exact population the clicked bar's total was computed over, so this filters
 * `buyerOverviewRows` by the same `waterfallBucketName` the chart groups by
 * (see fetchOpportunityWaterfallBuckets in src/api) - never by reconstructing bucket membership
 * from a day range the front end has no way to know (G-481).
 */
describe('fetchWaterfallBucketBuyers', () => {
  function stubApolloClient(data: unknown) {
    return { query: vi.fn().mockResolvedValue({ data }) } as any
  }

  it('scopes the query to the version and filters by the clicked bucket name', async () => {
    const apolloClient = stubApolloClient({
      buyerOverviewRows: {
        totalCount: 1,
        items: [{ partyId: 42, name: 'Acme', cashFlowImpact: 900 }],
      },
    })

    const page = await fetchWaterfallBucketBuyers(apolloClient, 'version-uuid-1', '0-30')

    // `variables` rides along for the export (see GraphqlGridPage); this test is about rows + total.
    expect(page).toMatchObject({ items: [{ partyId: 42, name: 'Acme', cashFlowImpact: 900 }], total: 1 })

    const call = apolloClient.query.mock.calls[0][0]
    expect(call.variables).toMatchObject({
      versionUuid: 'version-uuid-1',
      where: { waterfallBucketName: { eq: '0-30' } },
    })
  })

  it('asks for the null bucket (UC-OPP-13 out-of-waterfall row) with a literal null, not a missing filter', async () => {
    const apolloClient = stubApolloClient({ buyerOverviewRows: { totalCount: 0, items: [] } })

    await fetchWaterfallBucketBuyers(apolloClient, 'version-uuid-1', null)

    const call = apolloClient.query.mock.calls[0][0]
    expect(call.variables.where).toEqual({ waterfallBucketName: { eq: null } })
  })

  it('passes the requested page through to the query and total back from the response', async () => {
    const apolloClient = stubApolloClient({ buyerOverviewRows: { totalCount: 120, items: [] } })

    const page = await fetchWaterfallBucketBuyers(apolloClient, 'version-uuid-1', '31-60', 50, 25)

    expect(page.total).toBe(120)
    expect(apolloClient.query.mock.calls[0][0].variables).toMatchObject({ skip: 50, take: 25 })
  })
})
