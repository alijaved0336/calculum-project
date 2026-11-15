import type { ApolloClient, NormalizedCacheObject } from '@apollo/client/core'
import { fetchGraphqlGridPage, type GraphqlGridPage, type GraphqlGridQueryConfig } from '@/utils/graphqlGridQuery'

/** One buyer row of a waterfall bucket's drill-in list (UC-UI-03 step 3). */
export interface WaterfallBucketBuyerRow {
  partyId: number
  name: string | null
  winningStrategy: string | null
  recommendedTerm: number | null
  currentTerm: number | null
  cashFlowImpact: number | null
  noOpportunityReason: string | null
}

const WATERFALL_BUCKET_BUYERS_FIELDS = [
  'partyId',
  'name',
  'winningStrategy',
  'recommendedTerm',
  'currentTerm',
  'cashFlowImpact',
  'noOpportunityReason',
]

// Ada.Ar.Api's `buyerOverviewRows` field (UC-API-05's GraphQL sibling for the party grid,
// pre-scoped to Counterparty rows server-side - see ArQuery.BuyerOverviewRows's own doc for why
// that predicate lives there rather than in a filter argument a caller could omit or get wrong).
// Same shape as modules/match/data/saleMatchRows.ts's SALE_MATCH_ROWS_QUERY_CONFIG.
const WATERFALL_BUCKET_BUYERS_QUERY_CONFIG: GraphqlGridQueryConfig = {
  queryField: 'buyerOverviewRows',
  operationName: 'WaterfallBucketBuyers',
  filteredOperationName: 'WaterfallBucketBuyersFiltered',
  filterInputType: 'PartyOverviewRowFactFilterInput',
  sortInputType: 'PartyOverviewRowFactSortInput',
  scopeVariables: { versionUuid: 'UUID!' },
}

/**
 * UC-UI-03 step 3: "Analyst opens a bucket into the filtered list." Filters `buyerOverviewRows` by
 * the exact same `waterfallBucketName` the chart's own bars are grouped by
 * (`fetchOpportunityWaterfallBuckets` in `src/api`), so the list a bar opens is drawn from the
 * same population its total was computed over, rather than reconstructed from a day range the
 * front end has no way to know (no endpoint exposes the bucket layout - G-481).
 *
 * `bucketName: null` asks for UC-OPP-13's out-of-waterfall row (a buyer no configured bucket
 * covers, G-179) - sent as a literal `eq: null`, not an omitted filter, so it narrows to exactly
 * that population instead of returning everyone.
 */
export function fetchWaterfallBucketBuyers(
  apolloClient: ApolloClient<NormalizedCacheObject>,
  versionUuid: string,
  bucketName: string | null,
  skip = 0,
  take = 50,
): Promise<GraphqlGridPage<WaterfallBucketBuyerRow>> {
  return fetchGraphqlGridPage<WaterfallBucketBuyerRow>(apolloClient, WATERFALL_BUCKET_BUYERS_QUERY_CONFIG, {
    scope: { versionUuid },
    fields: WATERFALL_BUCKET_BUYERS_FIELDS,
    skip,
    take,
    order: [{ cashFlowImpact: 'DESC' }],
    where: { waterfallBucketName: { eq: bucketName } },
  })
}
