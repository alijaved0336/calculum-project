import { ref, watch, type Ref } from 'vue'
import {
  fetchOpportunityOverviewChart,
  type OverviewChartDimension,
  type OverviewChartMeasure,
  type OverviewChartPoint,
} from '@/api'
import { HttpError, SessionExpiredError } from '@/api/http'
import { useLoadToken } from '@/composables/useLoadToken'
import { useContextStore } from '@/stores/context'
import { useArCurrenciesStore } from '@/stores/arCurrencies'

/**
 * One chart's data, reloaded when the version, the measure or the dimension changes.
 *
 * Each chart card instantiates its own copy: two independent fetches with no shared cache. A cache
 * keyed by (version, measure, dimension) would save a request only when a user returns to a
 * selection they already viewed, and would then have to be invalidated on every recalculation —
 * which is a correctness problem traded for a saving nobody asked for.
 */
export function useOverviewChart(
  measure: Ref<OverviewChartMeasure | null>,
  dimension: Ref<OverviewChartDimension | null>,
  /** Which of the tenant's attributes to group by, when the dimension is `customAttribute`. */
  dimensionOrdinal: Ref<number | undefined> = ref(undefined),
  /**
   * Whether the chart MENU has answered.
   *
   * A selection is only knowable against the menu, and a card can hold one before the menu arrives:
   * OverviewMetricsCard seeds a remembered pick synchronously out of its store, and one the served
   * menu no longer offers has to be replaced before it is requested (the card's own guard does that
   * the moment the menu lands). Asking first would send a key the endpoint's allow-list — which IS
   * that menu — refuses, for a 400 nobody can act on and a chart that corrects itself a tick later.
   */
  menuReady: Ref<boolean> = ref(true),
) {
  const context = useContextStore()
  const currenciesStore = useArCurrenciesStore()
  const { start, isStale } = useLoadToken()

  const loading = ref(true)
  const points = ref<OverviewChartPoint[]>([])
  const loadError = ref(false)
  const forbidden = ref(false)

  async function load(): Promise<void> {
    // The uuid, because that is what the endpoint's filter envelope names the version by.
    const versionUuid = context.saleFileVersionUuid

    if (versionUuid === null) {
      points.value = []
      loadError.value = false
      forbidden.value = false
      loading.value = false
      return
    }

    // Nothing to ask for until the chart CATALOG has answered: the card takes its default from the
    // menu rather than hard-coding one (so there is a tick where nothing has been chosen yet), and a
    // selection it seeded from its own store is not known to be one the menu still offers until then.
    // Staying in the loading state rather than clearing it: the card is genuinely still loading, and
    // a false "no data" between the menu arriving and the bars arriving would flicker on every open.
    if (!menuReady.value || measure.value === null || dimension.value === null) {
      points.value = []
      loadError.value = false
      forbidden.value = false
      return
    }

    const token = start()
    loading.value = true
    loadError.value = false
    forbidden.value = false
    let redirecting = false

    try {
      const result = await fetchOpportunityOverviewChart(
        versionUuid, measure.value, dimension.value, currenciesStore.currency, false, dimensionOrdinal.value)
      if (isStale(token)) {
        return
      }
      points.value = result.points
    } catch (cause) {
      if (isStale(token)) {
        return
      }

      if (cause instanceof SessionExpiredError) {
        redirecting = true
      } else if (cause instanceof HttpError && cause.isForbidden) {
        forbidden.value = true
        points.value = []
      } else {
        loadError.value = true
        points.value = []
      }
    } finally {
      if (!isStale(token) && !redirecting) {
        loading.value = false
      }
    }
  }

  // One watcher over all of them, so switching measure and dimension in the same tick is one request
  // rather than two — and the load token makes the ordering safe either way. The ordinal is in the
  // list because switching between two custom attributes changes nothing else: same dimension key,
  // different attribute, and without it the chart would keep the first one's bars.
  watch(
    [() => context.saleFileVersionUuid, measure, dimension, dimensionOrdinal, menuReady],
    load,
    { immediate: true })

  return { loading, points, loadError, forbidden, reload: load }
}
