/**
 * UC-UI-05's buyer roster for the card view: one page of buyers for a sale file version,
 * optionally narrowed by the navbar's free-text search term, paginated by page number (not a
 * cursor) - `page` starts at 1, and the response's own `total` (every buyer matching the current
 * filter, not just this page) is what a caller checks against `page * pageSize` to tell whether
 * there is a further page to request.
 *
 * `parentName` arrives already resolved server-side - unlike `fetchCompanies` (grid's own data
 * source, `@/api`), there is no client-side join against a separate `Parent`-role row here.
 */
import { get } from '@/api/http'
import type { BuyerCorporateTreeSalesLineDto, PartyRole } from '@/api'

export interface BuyerCardRow {
  id: number
  role: PartyRole
  resolution: string
  lifecycle: string
  name: string | null
  originalName: string | null
  url: string | null
  volume: number | null
  forecastVolume: number | null
  negotiationStatus: string | null
  negotiationStatusCode: number | null
  parentId: number | null
  parentName: string | null
  saleLineCount: number
  country: string | null
  industry: string | null
  isSme: boolean | null
  smeSource: string | null
  isPilot: boolean
  creditLimit: number | null
  creditRating: string | null
  actualPaymentTermsAvg: number | null
  contractualPaymentTermsWithCashDiscountsAvg: number | null
  contractualPaymentTermsWithoutCashDiscountsAvg: number | null
  countryFlagUrl: string | null
  logoUrl: string | null
  /** The buyer's own sale lines (`BuyerRosterDto.SalesLines`, always an array - empty for a
   * Parent), or a corporate-tree node's when a `CustomerCardIdentity` (this type, under that alias)
   * was built from one (`CustomerCardCorporateTreeTab.toCustomerCardIdentity`). Absent on an
   * identity built from a grid row (`partyRowToCustomerCardIdentity`), which `CustomerCardView`
   * reads as "fetch them from the corporate tree". */
  salesLines?: BuyerCorporateTreeSalesLineDto[]
}

export interface BuyersPage {
  items: BuyerCardRow[]
  /** The page number this response answers, 1-based - not necessarily the page requested (a
   * caller past the last page could in principle get back whatever the server clamps to), so a
   * caller reads this rather than assuming its own request echoed back. */
  page: number
  /** The page size the server actually used - can differ from what was requested, the same
   * reason `BuyerLinesGrid`'s own pager trusts its response's page size over what it asked for. */
  pageSize: number
  /** Every buyer matching the current filter, not just this page - what `page * pageSize` is
   * checked against to tell whether a further page exists. */
  total: number
}

/** AC-03's five sort options (`BuyersView`'s own `sortOptions`), sent verbatim as the `sort` query
 * value - the backend's enum matches these identifiers directly, with no translation layer. */
export type BuyersSortOption = 'nameAsc' | 'nameDesc' | 'recently' | 'volumeAsc' | 'volumeDesc'

export interface FetchBuyersParams {
  /** Omitted from the request entirely when empty - `get`'s own query builder already drops it. */
  search?: string
  /** 1-based. */
  page: number
  pageSize: number
  sort: BuyersSortOption
  /** Scales every money field on each row (volume, forecastVolume, creditLimit, ...) from USD
   * into the navbar's selected currency (`useArCurrenciesStore.currency`) - 1 leaves them in USD. */
  currencyRate?: number
}

export const fetchBuyers = (
  saleFileVersionUuid: string,
  params: FetchBuyersParams,
): Promise<BuyersPage> =>
  // A fresh object literal, not `params` itself: `Query` is a `Record<string, QueryValue>`, and a
  // named-interface-typed value (unlike a literal built at the call site) doesn't satisfy an index
  // signature even when every property's value type does.
  get(`/api/buyers/${saleFileVersionUuid}`, {
    search: params.search,
    page: params.page,
    pageSize: params.pageSize,
    sort: params.sort,
    currencyRate: params.currencyRate ?? 1,
  })
