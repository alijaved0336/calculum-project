import { get, postNoContent, del } from '@/api/http'
import type { BuyerCardRow, BuyersSortOption } from './fetchBuyers'

export interface RecentBuyersResponse {
  items: BuyerCardRow[]
}

/** The up-to-20 buyers this analyst most recently opened from this version's roster.
 * `currencyRate` scales every money field on each row (volume, forecastVolume, creditLimit, ...)
 * from USD into the navbar's selected currency (`useArCurrenciesStore.currency`) - 1 leaves them
 * in USD.
 *
 * `sort` is AC-03's own order, the same value `fetchBuyers` takes (#20412): the Buyers screen's
 * sort control sits above both this shelf and the roster below it, so an analyst who picks
 * "Name A-Z" means both. Omitting it, like asking for `recently`, keeps the visit order this
 * endpoint answers in by default. The ordering is the endpoint's rather than a comparator here
 * so that the two lists cannot drift apart on nulls, ties or collation. */
export const fetchRecentBuyers = (
  saleFileVersionUuid: string,
  currencyRate = 1,
  sort?: BuyersSortOption,
): Promise<RecentBuyersResponse> =>
  get(`/api/buyers/${saleFileVersionUuid}/recent`, { currencyRate, sort })

/** Records opening a buyer's Customer Card as a "recently viewed" visit. */
export const markBuyerRecent = (saleFileVersionUuid: string, companyId: number): Promise<void> =>
  postNoContent(`/api/buyers/${saleFileVersionUuid}/recent/${companyId}`)

/** Removes one buyer from the recently-viewed list (the card's own close button). */
export const deleteRecentBuyer = (saleFileVersionUuid: string, companyId: number): Promise<void> =>
  del(`/api/buyers/${saleFileVersionUuid}/recent/${companyId}`)
