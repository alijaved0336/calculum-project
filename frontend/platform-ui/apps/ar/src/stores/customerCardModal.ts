/**
 * Global "open the Customer Card as a modal" state (UC-UI-05 follow-up), read by
 * `CustomerCardModal.vue` (mounted once, at the app root - see `App.vue`) and written by any
 * screen that wants to open a buyer's Customer Card without navigating away from itself. Buyers'
 * card/grid views are the first caller; the whole reason this is its own global store rather than
 * component-local state is that they will not be the only one.
 *
 * Deliberately not persisted: a modal left open across a page refresh, re-opening against
 * whatever version/buyer ids happened to be in localStorage, would be more confusing than simply
 * closed - same reasoning `context.ts` gives for not persisting company/version identity.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { BuyerCardRow } from '@/modules/buyers/api/fetchBuyers'

/** The modal's own default when a caller doesn't ask for a specific width. */
export const DEFAULT_MODAL_WIDTH_PERCENT = 90

/**
 * The full buyer roster row a caller already has on hand (`BuyersView.vue`'s `BuyerCard`, from its
 * own `fetchBuyers` page) when it opens the modal - not trimmed down to name/role, so
 * `CustomerCardHeader` (or any future consumer) can read whatever this row carries without the
 * caller having had to predict which fields would eventually matter. Deliberately still not the
 * full `CustomerCardResponse`/`BuyerCompanyDetailsResponse` a tab's own fetch returns - those are
 * each tab's own richer, scoped shape; this is only ever what the roster already had before any
 * tab fetched anything.
 */
export type CustomerCardIdentity = BuyerCardRow

/**
 * The only fields `CustomerCardHeader` reads. A roster row (`CustomerCardIdentity`) satisfies it as
 * is; a view reached by direct URL builds one from its own Company Details fetch instead
 * (`toHeaderIdentity`), so the header no longer depends on how the view was reached (UC-UI-26 FR3).
 */
export type CustomerCardHeaderIdentity = Pick<BuyerCardRow, 'name' | 'originalName' | 'role' | 'logoUrl' | 'country' | 'countryFlagUrl'>

export interface OpenCustomerCardModalOptions {
  /** The modal content's width, as a percentage of the viewport (1-100). Defaults to
   * `DEFAULT_MODAL_WIDTH_PERCENT` when omitted - a caller only needs this when it wants something
   * narrower/wider than that default, not on every `open()` call. */
  widthPercent?: number
  /** Omitted when the caller has no roster row on hand (e.g. the grid view's row click) - the
   * header then falls back to `CustomerCardView`'s own Company Details fetch (UC-UI-26 FR3) rather
   * than staying unrendered. */
  initialBuyer?: CustomerCardIdentity
}

export const useCustomerCardModalStore = defineStore('ar-customer-card-modal', () => {
  const versionId = ref<number | null>(null)
  const buyerId = ref<number | null>(null)
  const widthPercent = ref(DEFAULT_MODAL_WIDTH_PERCENT)
  const initialBuyer = ref<CustomerCardIdentity | null>(null)

  const isOpen = computed(() => versionId.value !== null && buyerId.value !== null)

  function open(openVersionId: number, openBuyerId: number, options?: OpenCustomerCardModalOptions): void {
    versionId.value = openVersionId
    buyerId.value = openBuyerId
    // Clamped rather than trusted as-is: a caller passing 0/negative/>100 would otherwise produce
    // an invisible or viewport-overflowing modal with no visible cause.
    widthPercent.value = Math.min(100, Math.max(1, options?.widthPercent ?? DEFAULT_MODAL_WIDTH_PERCENT))
    initialBuyer.value = options?.initialBuyer ?? null
  }

  function close(): void {
    versionId.value = null
    buyerId.value = null
    widthPercent.value = DEFAULT_MODAL_WIDTH_PERCENT
    initialBuyer.value = null
  }

  return {
    versionId,
    buyerId,
    widthPercent,
    initialBuyer,
    isOpen,
    open,
    close,
  }
})
