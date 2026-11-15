/**
 * Fetches one buyer's `BuyerRatingsMetricsResponse` for `CustomerCardRatingNMetrics`.
 *
 * Mirrors `useBuyerCompanyDetails` exactly (same loading/notFound/loadError/data shape, scoped by
 * `useContextStore().saleFileVersionUuid` rather than a numeric `versionId`): the ratings-metrics
 * endpoint is `/api/buyers/{versionUuid}/{buyerId}/ratings-metrics`, the same uuid-scoped route
 * shape as company-details, not the numeric `/api/sale-file-versions/{versionId}/...` one
 * `useCustomerCard`/`useBuyerCorporateTree` read.
 */
import { onMounted, ref, watch, type Ref } from 'vue'
import { fetchBuyerRatingsMetrics, type BuyerRatingsMetricsResponse } from '@/api'
import { HttpError } from '@/api/http'
import { useLoadToken } from '@/composables/useLoadToken'
import { useContextStore } from '@/stores/context'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { parsePositiveRouteId } from '@/modules/match/utils/routeId'

export interface UseBuyerRatingsMetricsResult {
  loading: Ref<boolean>
  notFound: Ref<boolean>
  loadError: Ref<boolean>
  details: Ref<BuyerRatingsMetricsResponse | null>
}

export function useBuyerRatingsMetrics(getBuyerId: () => string): UseBuyerRatingsMetricsResult {
  const context = useContextStore()
  const currenciesStore = useArCurrenciesStore()
  const { start, isStale } = useLoadToken()

  const loading = ref(true)
  const notFound = ref(false)
  const loadError = ref(false)
  const details = ref<BuyerRatingsMetricsResponse | null>(null)

  async function load(): Promise<void> {
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
      const result = await fetchBuyerRatingsMetrics(versionUuid, buyerId, currenciesStore.currency)
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
  watch([() => context.saleFileVersionUuid, getBuyerId], load)

  return { loading, notFound, loadError, details }
}
