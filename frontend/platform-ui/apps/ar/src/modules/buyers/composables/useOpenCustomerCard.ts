/**
 * The one way a screen opens a buyer's Customer Card modal: records the visit in the buyer's
 * "recently viewed" list (the Buyers screen's recent shelf) and then opens the modal. Every caller -
 * `BuyersView`'s roster, the Corporate Tree tab re-targeting the modal to another node, the grids'
 * entity cells (`useEntityLogoCustomerCard`) - goes through here, so a new entry point can't open the
 * card without also counting as a visit.
 *
 * Kept out of `useCustomerCardModalStore.open` itself: that store is plain modal state, and a
 * network side effect there would make every caller (and test) of `open` hit the API.
 */
import { useContextStore } from '@/stores/context'
import { useCustomerCardModalStore, type OpenCustomerCardModalOptions } from '@/stores/customerCardModal'
import { markBuyerRecent } from '../api/recentBuyers'

export function useOpenCustomerCard() {
  const context = useContextStore()
  const modal = useCustomerCardModalStore()

  function openCustomerCard(versionId: number, buyerId: number, options?: OpenCustomerCardModalOptions): void {
    // Fire-and-forget: a tracking side effect, not something opening the modal should wait on or
    // fail alongside.
    if (context.saleFileVersionUuid) {
      markBuyerRecent(context.saleFileVersionUuid, buyerId).catch((error) => {
        console.warn('Marking buyer as recently viewed failed.', error)
      })
    }
    modal.open(versionId, buyerId, options)
  }

  return { openCustomerCard }
}
