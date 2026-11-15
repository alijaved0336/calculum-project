/**
 * Fetches one buyer's `CustomerCardResponse` for whichever Customer Card tab calls it.
 *
 * Deliberately a composable, not a shared parent-owned fetch passed down as a prop: each of
 * `CustomerCardOpportunityTab`/`CustomerCardCorporateTreeTab`/`CustomerCardCompanyDetailsTab`
 * calls this independently, so switching tabs fetches fresh rather than reusing a sibling's copy
 * - each call gets its own `loading`/`notFound`/`loadError`/`card` state and its own
 * `useLoadToken` guard, exactly as if each tab were its own small view.
 *
 * `getVersionId`/`getBuyerId` are getters, not plain strings, so the internal `watch` re-fetches
 * when the caller's own props change (a route/prop update while a tab is already mounted) without
 * the caller having to wrap them in `computed`/`toRef` itself.
 */
import { onMounted, ref, watch, type Ref } from 'vue'
import { fetchCustomerCard, type CustomerCardResponse } from '@/api'
import { HttpError } from '@/api/http'
import { useLoadToken } from '@/composables/useLoadToken'
import { parsePositiveRouteId } from '@/modules/match/utils/routeId'
import { useArCurrenciesStore } from '@/stores/arCurrencies'

export interface UseCustomerCardResult {
  loading: Ref<boolean>
  notFound: Ref<boolean>
  loadError: Ref<boolean>
  card: Ref<CustomerCardResponse | null>
}

export function useCustomerCard(getVersionId: () => string, getBuyerId: () => string): UseCustomerCardResult {
  const loading = ref(true)
  const notFound = ref(false)
  const loadError = ref(false)
  const card = ref<CustomerCardResponse | null>(null)

  // Guards against a slower, stale response landing after a fresher one - the same reason every
  // other version/buyer-scoped load in this app (CustomerCardView's own load used to, before this
  // composable existed) applies this guard.
  const { start, isStale } = useLoadToken()
  const currenciesStore = useArCurrenciesStore()

  async function load(): Promise<void> {
    const token = start()
    loading.value = true
    notFound.value = false
    loadError.value = false
    card.value = null

    // A malformed route segment (Number('abc') is NaN) must not reach the API as /buyers/NaN.
    const versionId = parsePositiveRouteId(getVersionId())
    const buyerId = parsePositiveRouteId(getBuyerId())
    if (versionId === undefined || buyerId === undefined) {
      notFound.value = true
      loading.value = false
      return
    }

    try {
      const result = await fetchCustomerCard(versionId, buyerId, currenciesStore.currency)
      if (isStale(token)) {
        // A newer load() has started since this one; that call owns the screen now.
        return
      }
      card.value = result
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
  watch([getVersionId, getBuyerId], load)

  return { loading, notFound, loadError, card }
}
