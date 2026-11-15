/**
 * Fetches one buyer's `BuyerCompanyDetailsResponse` for `CustomerCardCompanyDetailsTab`.
 *
 * A separate composable from `useCustomerCard`, not a second mode of it: the endpoint behind this
 * one is scoped by the active version's `uuid` (`useContextStore().saleFileVersionUuid`), not the
 * numeric `versionId` route param `useCustomerCard` takes, so the two watch different sources and
 * have nothing to share beyond the loading/notFound/loadError/data shape every buyer-scoped fetch
 * on this screen already follows.
 */
import { onMounted, ref, watch, type Ref } from 'vue'
import { fetchBuyerCompanyDetails, type BuyerCompanyDetailsResponse } from '@/api'
import { HttpError } from '@/api/http'
import { useLoadToken } from '@/composables/useLoadToken'
import { useContextStore } from '@/stores/context'
import { parsePositiveRouteId } from '@/modules/match/utils/routeId'

export interface UseBuyerCompanyDetailsResult {
  loading: Ref<boolean>
  notFound: Ref<boolean>
  loadError: Ref<boolean>
  details: Ref<BuyerCompanyDetailsResponse | null>
}

export function useBuyerCompanyDetails(
  getBuyerId: () => string,
  // UC-UI-26 FR3: CustomerCardView only needs this fetch for its header when no caller seeded one,
  // so it passes `() => !initialBuyer`; every tab keeps the default and always fetches.
  isEnabled: () => boolean = () => true,
): UseBuyerCompanyDetailsResult {
  const context = useContextStore()
  const { start, isStale } = useLoadToken()

  const loading = ref(true)
  const notFound = ref(false)
  const loadError = ref(false)
  const details = ref<BuyerCompanyDetailsResponse | null>(null)

  async function load(): Promise<void> {
    if (!isEnabled()) {
      start() // invalidates any in-flight request so it cannot land after the seed arrived
      loading.value = false
      notFound.value = false
      loadError.value = false
      details.value = null
      return
    }

    const token = start()
    loading.value = true
    notFound.value = false
    loadError.value = false
    details.value = null

    const versionUuid = context.saleFileVersionUuid
    const buyerId = parsePositiveRouteId(getBuyerId())
    if (versionUuid === null || buyerId === undefined) {
      notFound.value = true
      loading.value = false
      return
    }

    try {
      const result = await fetchBuyerCompanyDetails(versionUuid, buyerId)
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

  onMounted(load)
  watch([() => context.saleFileVersionUuid, getBuyerId, isEnabled], load)

  return { loading, notFound, loadError, details }
}
