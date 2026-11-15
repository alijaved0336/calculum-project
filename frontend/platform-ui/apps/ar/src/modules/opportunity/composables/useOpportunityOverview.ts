import { computed, ref, watch } from 'vue'
import { fetchOpportunityOverviewSummary, type OpportunityOverviewSummaryResponse } from '@/api'
import { HttpError, SessionExpiredError } from '@/api/http'
import { useLoadToken } from '@/composables/useLoadToken'
import { useContextStore } from '@/stores/context'
import { useArCurrenciesStore } from '@/stores/arCurrencies'

/**
 * The Opportunity Overview's three cards, reloaded whenever the selected sale file version changes.
 *
 * A composable with local state rather than a store, matching `MatchView`: the only shared state in
 * this app is the context store, and this data belongs to one screen.
 */
export function useOpportunityOverview() {
  const context = useContextStore()
  const currenciesStore = useArCurrenciesStore()
  const { start, isStale } = useLoadToken()

  const loading = ref(true)
  const overview = ref<OpportunityOverviewSummaryResponse | null>(null)
  const loadError = ref(false)
  const forbidden = ref(false)

  /**
   * Whether there is anything to draw.
   *
   * **Gated on the payload, not on `status === 'ready'`.** A version that was parsed and never
   * calculated answers 200 with a status and nulls, and so does a status this app has never heard of
   * — a future one, or one renamed on the server. Both have to degrade to the placeholder, and only
   * a check on the data itself covers both. `status` decides what the placeholder SAYS; it does not
   * decide whether there is data.
   *
   * **Checks the four figures, not `paymentTerms` itself.** `OpportunityOverviewSummaryResponse`
   * declares `paymentTerms` as always present — only the figures inside it are nullable - so a
   * `paymentTerms != null` check would read `true` on every successful response, making this
   * placeholder unreachable against a server that honors its own declared contract. Defensively
   * still treats a `null` `paymentTerms` (which some test fixtures - and possibly an older backend
   * shape - use) as not calculated too, rather than throwing on it.
   */
  const isCalculated = computed(() => {
    const terms = overview.value?.paymentTerms
    if (terms == null) return false
    return terms.contractual !== null
      || terms.actual !== null
      || terms.opportunity !== null
      || terms.expected !== null
  })

  /** The version's own status, for the placeholder's message. Null before the first load lands. */
  const status = computed(() => overview.value?.status ?? null)

  /**
   * Loads for one version, named by uuid because that is what the endpoint's filter envelope takes.
   *
   * The store carries both identities and this watches the uuid rather than the id: watching the id
   * and then reading the uuid would fire on an intermediate tick where the id has been reassigned
   * and the uuid has not, sending the previous version's uuid. `setVersion` writes both together, so
   * watching the one that is actually sent removes the question.
   */
  async function load(versionUuid: string | null): Promise<void> {
    if (versionUuid === null) {
      // Invalidates a request already in flight for the previous version too - without this, that
      // request's own `isStale(token)` still reads false and it would write the old version's
      // payload back into `overview` right after this deliberately cleared it.
      start()
      overview.value = null
      loadError.value = false
      forbidden.value = false
      loading.value = false
      return
    }

    const token = start()
    loading.value = true
    loadError.value = false
    forbidden.value = false

    // Set only when the page is navigating to sign-in, in which case the loading state is held
    // rather than cleared: flashing an error over a document that is already leaving is worse than
    // showing a spinner that goes away with the page.
    let redirecting = false

    try {
      const result = await fetchOpportunityOverviewSummary(versionUuid, currenciesStore.currency)
      if (isStale(token)) {
        return
      }
      overview.value = result
    } catch (cause) {
      if (isStale(token)) {
        return
      }

      // The same three-way split `useVersionStatusPoll.applyPollFailure` makes, and for the same
      // reasons. 403 is separated from a generic failure because the backend answers it instead of
      // 401 precisely so the two get different treatment: this one means the session is fine and
      // the module is missing, which no retry and no re-login will fix.
      if (cause instanceof SessionExpiredError) {
        redirecting = true
      } else if (cause instanceof HttpError && cause.isForbidden) {
        forbidden.value = true
        overview.value = null
      } else {
        loadError.value = true
        overview.value = null
      }
    } finally {
      if (!isStale(token) && !redirecting) {
        loading.value = false
      }
    }
  }

  watch(() => context.saleFileVersionUuid, load, { immediate: true })

  return { loading, overview, loadError, forbidden, isCalculated, status, reload: load }
}
