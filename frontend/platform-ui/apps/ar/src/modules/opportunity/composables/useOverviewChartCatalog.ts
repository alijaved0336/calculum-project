import { ref, watch } from 'vue'
import {
  fetchOpportunityChartCatalog,
  type OpportunityOverviewChartCatalogResponse,
  type OverviewChartMeasureOption,
} from '@/api'
import { HttpError, SessionExpiredError } from '@/api/http'
import { useLoadToken } from '@/composables/useLoadToken'
import { useContextStore } from '@/stores/context'

/**
 * The chart menu, fetched once per version and shared by every card showing that version.
 *
 * <b>Cached per VERSION at module scope.</b> The cache used to be a single promise on the premise
 * that the menu is the same for every version — true while it held only fixed columns, and false the
 * moment it started carrying the tenant's own declared attributes, which are per version. A single
 * cache would then have shown one version's attributes on another's screen. Keyed by uuid, two cards
 * on the same version still share one request, which is the saving that mattered: chart DATA is
 * per-card and recalculated, so it is deliberately not cached, while the MENU is one static answer
 * per version.
 *
 * The promise is cached rather than its result, so cards mounting in the same tick share the
 * in-flight request instead of racing two. A failure is not cached: the next mount retries, because
 * caching a rejection would leave a screen with no dropdowns until reload over one lost request.
 */
const inFlight = new Map<string, Promise<OpportunityOverviewChartCatalogResponse>>()

function load(versionUuid: string): Promise<OpportunityOverviewChartCatalogResponse> {
  const cached = inFlight.get(versionUuid)
  if (cached) {
    return cached
  }

  const pending = fetchOpportunityChartCatalog(versionUuid).catch((cause) => {
    inFlight.delete(versionUuid)
    throw cause
  })
  inFlight.set(versionUuid, pending)
  return pending
}

/** Test seam: the module cache outlives a component, so a suite mounting twice would otherwise get
 * the first test's menu. Called from spec setup, never from application code. */
export function resetOverviewChartCatalogCache(): void {
  inFlight.clear()
}

/**
 * Fetches and caches the raw catalog; every "what does this mean" question (which measure/dimension
 * is the default, what a measure's own options are, which chart a pairing renders as) is the
 * caller's — OverviewMetricsCard.vue's own computeds — since those all need the CURRENTLY SELECTED
 * measure to answer, which this composable has no notion of.
 */
export function useOverviewChartCatalog() {
  const context = useContextStore()
  const { start, isStale } = useLoadToken()

  const loading = ref(true)
  const loadError = ref(false)
  const measures = ref<OverviewChartMeasureOption[]>([])

  async function read(versionUuid: string | null): Promise<void> {
    if (versionUuid === null) {
      // No version yet: the screen has nothing to draw either, and staying in the loading state is
      // what the card already shows for that.
      return
    }

    // Guards against a slower version's response landing after a fresher one - the same pattern
    // useOpportunityOverview/useOverviewChart use. Without it, `menuReady` (`!loading`) could read
    // true - and `loading`/`loadError` could read as the PREVIOUS version's - while this version's
    // own fetch is still in flight, letting a stale (measure, dimension) pick through.
    const token = start()
    loading.value = true
    loadError.value = false

    let redirecting = false

    try {
      const result = await load(versionUuid)
      if (isStale(token)) {
        return
      }
      measures.value = result
    } catch (cause) {
      if (isStale(token)) {
        return
      }

      if (cause instanceof SessionExpiredError) {
        // A redirect is already under way. Staying in the loading state keeps the spinner rather than
        // flashing an error on a screen about to be replaced — useOverviewChart's own reason.
        redirecting = true
      } else {
        // Forbidden is not an error state: without the Opportunity module there is no menu to show,
        // and the empty state the card falls back to says the same thing more quietly.
        loadError.value = !(cause instanceof HttpError && cause.isForbidden)
      }
    } finally {
      if (!isStale(token) && !redirecting) {
        loading.value = false
      }
    }
  }

  // Watched rather than fetched once on mount: the version can change under the screen (the header's
  // own picker), and the menu belongs to the version.
  watch(() => context.saleFileVersionUuid, read, { immediate: true })

  return { loading, loadError, measures }
}
