/**
 * Fetches one buyer's `BuyerCorporateTreeResponse` for `CustomerCardCorporateTreeTab`.
 *
 * Follows `useBuyerCompanyDetails`'s own shape, not `useCustomerCard`'s: the corporate-tree
 * endpoint behind this tab is scoped by the active version's `uuid`
 * (`useContextStore().saleFileVersionUuid`, `/api/buyers/{versionUuid}/{buyerId}/corporate-tree`),
 * not the numeric `versionId` route param `useCustomerCard` takes - so this reads the context
 * store rather than taking a `getVersionId` getter the way it used to before that endpoint moved
 * off the numeric sale-file-version id.
 */
import { onMounted, ref, watch, type Ref } from 'vue'
import { fetchBuyerCorporateTree, type BuyerCorporateTreeResponse } from '@/api'
import { HttpError } from '@/api/http'
import { useLoadToken } from '@/composables/useLoadToken'
import { useContextStore } from '@/stores/context'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { parsePositiveRouteId } from '@/modules/match/utils/routeId'

export interface UseBuyerCorporateTreeResult {
  loading: Ref<boolean>
  notFound: Ref<boolean>
  loadError: Ref<boolean>
  tree: Ref<BuyerCorporateTreeResponse | null>
}

export function useBuyerCorporateTree(
  getBuyerId: () => string,
  // CustomerCardView only needs this fetch for the requested node's own `salesLines` when its
  // caller seeded none (a grid's entity cell, a direct URL), so it passes a guard; the Corporate
  // Tree tab keeps the default and always fetches.
  isEnabled: () => boolean = () => true,
): UseBuyerCorporateTreeResult {
  const context = useContextStore()
  const currenciesStore = useArCurrenciesStore()
  const { start, isStale } = useLoadToken()

  const loading = ref(true)
  const notFound = ref(false)
  const loadError = ref(false)
  const tree = ref<BuyerCorporateTreeResponse | null>(null)

  async function load(): Promise<void> {
    if (!isEnabled()) {
      start() // invalidates any in-flight request so it cannot land after the seed arrived
      loading.value = false
      notFound.value = false
      loadError.value = false
      tree.value = null
      return
    }

    const token = start()
    loading.value = true
    notFound.value = false
    loadError.value = false
    tree.value = null

    const versionUuid = context.saleFileVersionUuid
    // A malformed route segment (Number('abc') is NaN) must not reach the API as /buyers/.../NaN.
    const buyerId = parsePositiveRouteId(getBuyerId())
    if (versionUuid === null || buyerId === undefined) {
      notFound.value = true
      loading.value = false
      return
    }

    try {
      const result = await fetchBuyerCorporateTree(versionUuid, buyerId, currenciesStore.currency)
      if (isStale(token)) {
        // A newer load() has started since this one; that call owns the screen now.
        return
      }
      tree.value = result
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

  return { loading, notFound, loadError, tree }
}
