/**
 * Fetches one buyer's `BuyerOpportunityResponse` for `CustomerCardOpportunityTab`.
 *
 * Mirrors `useBuyerRatingsMetrics` exactly (same loading/notFound/loadError/data shape, scoped by
 * `useContextStore().saleFileVersionUuid` rather than a numeric `versionId`): the opportunity
 * endpoint is `/api/buyers/{versionUuid}/{buyerId}/opportunity`, the same uuid-scoped route shape
 * as ratings-metrics/company-details.
 */
import { onMounted, ref, watch, type Ref } from 'vue'
import { fetchBuyerOpportunity, type BuyerOpportunityResponse, type PartyRole } from '@/api'
import { HttpError } from '@/api/http'
import { useLoadToken } from '@/composables/useLoadToken'
import { useContextStore } from '@/stores/context'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { parsePositiveRouteId } from '@/modules/match/utils/routeId'

export interface UseBuyerOpportunityResult {
  loading: Ref<boolean>
  notFound: Ref<boolean>
  loadError: Ref<boolean>
  details: Ref<BuyerOpportunityResponse | null>
  /** Refetches the current buyer/line/role. `silent` (AB#20657, after a Target save) keeps the
   * current figures on screen - no `loading`, no skeleton - and swaps in the new ones when they
   * land, so the caller's own loading indicator is what the user sees until then. */
  reload: (options?: { silent?: boolean }) => Promise<void>
}

/** `getSaleLineId` is optional and, when it returns a value, re-fetches at that sale line's own
 * level (`level=SaleLine&saleLineId={n}`) instead of the buyer's - the Sale Line tab strip
 * (`CustomerCardOpportunityTab`'s own `activeSaleLineId`) is the only caller that passes one
 * today; omitted (or returning `undefined`, e.g. the leading "Buyer" tab is active) fetches the
 * buyer level, same as before this param existed.
 *
 * `getRole` is likewise optional - when it returns `'Parent'` (and `getSaleLineId` returns
 * `undefined`, which it always does for a `Parent` - see `CustomerCardOpportunityTab`'s own
 * `salesLineTabs` doc), the fetch sends `level=Parent` instead of the buyer-level default. */
export function useBuyerOpportunity(
  getBuyerId: () => string,
  getSaleLineId?: () => number | undefined,
  getRole?: () => PartyRole | undefined,
): UseBuyerOpportunityResult {
  const context = useContextStore()
  const currenciesStore = useArCurrenciesStore()
  const { start, isStale } = useLoadToken()

  const loading = ref(true)
  const notFound = ref(false)
  const loadError = ref(false)
  const details = ref<BuyerOpportunityResponse | null>(null)

  async function load({ silent = false }: { silent?: boolean } = {}): Promise<void> {
    const token = start()
    if (!silent) {
      loading.value = true
      notFound.value = false
      loadError.value = false
      details.value = null
    }

    const versionUuid = context.saleFileVersionUuid
    const buyerId = parsePositiveRouteId(getBuyerId())
    if (versionUuid === null || buyerId === undefined) {
      notFound.value = true
      loading.value = false
      return
    }

    try {
      const result = await fetchBuyerOpportunity(versionUuid, buyerId, currenciesStore.currency, getSaleLineId?.(), getRole?.() === 'Parent')
      if (isStale(token)) {
        // A newer load() has started since this one; that call owns the screen now.
        return
      }
      details.value = result
    } catch (error) {
      if (isStale(token)) {
        return
      }
      if (error instanceof HttpError && error.status === 404) {
        notFound.value = true
      } else {
        loadError.value = true
      }
    } finally {
      if (!isStale(token)) {
        loading.value = false
      }
    }
  }

  onMounted(() => load())
  watch([() => context.saleFileVersionUuid, getBuyerId, () => getSaleLineId?.(), () => getRole?.()], () => load())

  return { loading, notFound, loadError, details, reload: load }
}
