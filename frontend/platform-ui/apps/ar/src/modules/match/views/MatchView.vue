<template>
    <CalculumFullScreen v-if="fullScreenChart === 'matched'" :title="t('home.overview.matchedUnmatchedData')" @closeFullScreen="closeFullScreenChart">
      <template v-slot:fullScreenContent>
        <p>
          <span>{{ t('global.totalAnalyzed') }}: </span>
          <span class="font-bold">{{ matchedUnmatchedTotalFormatted }}</span>
        </p>
        <PieChart :items="matchedPieItems" :label-content="pieLabelContent" height="650px" @slice-click="handleMatchedClick" />
      </template>
    </CalculumFullScreen>

    <CalculumFullScreen v-if="fullScreenChart === 'included'" :title="t('home.overview.includedExcludedData')" @closeFullScreen="closeFullScreenChart">
      <template v-slot:fullScreenContent>
        <p>
          <span>{{ t('global.totalMatched') }}: </span>
          <span class="font-bold">{{ includedExcludedTotalFormatted }}</span>
        </p>
        <PieChart :items="includedPieItems" :label-content="pieLabelContent" height="650px" @slice-click="handleIncludedClick" />
      </template>
    </CalculumFullScreen>

    <CalculumFullScreen v-if="fullScreenChart === 'exclusion'" :title="t('global.metricCharts.reasonsFullScreen')" @closeFullScreen="closeFullScreenChart">
      <template v-slot:fullScreenContent>
        <HorizontalBarChart
          :categories="exclusionCategories"
          :series="exclusionSeries"
          :category-axis-title="`${t('global.metricCharts.reasonsFullScreen')} (Top ${exclusionCategories.length})`"
          category-axis-title-color="#222222"
          :category-axis-title-font-weight="500"
          :category-axis-title-font-size="14"
          height="350px"
          value-labels-visible
          :value-labels-content="exclusionValueLabelContent"
          :value-axis-labels-content="exclusionValueLabelContent"
          :value-axis-label-rotation="'auto'"
          value-axis-label-color="#222222"
          :value-axis-label-font-weight="700"
          :category-label-max-length="18"
          :legend-visible="false"
          @bar-click="handleExclusionReasonClick"
        />
      </template>
    </CalculumFullScreen>

    <CalculumFullScreen v-if="fullScreenChart === 'map'" :title="`${t('arMatch.countriesMap.customers')} / ${t('arMatch.countriesMap.ownEntities')}`" @closeFullScreen="closeFullScreenChart">
      <template v-slot:fullScreenContent>
        <BubbleMap
          ar-loader
          :data="bubbleMapData"
          :metric="bubbleMapMetric"
          :supplier-label="t('arMatch.countriesMap.customers')"
          :buyer-label="t('arMatch.countriesMap.ownEntities')"
          :no-data-title="t('arMatch.empty')"
          :selected-country="selectedLocationCountry ?? undefined"
          height="750px"
          @location-clicked="handleLocationClick"
        />
      </template>
    </CalculumFullScreen>

    <div class="sub-main-sections">
      <CalculumLoadingAr v-if="loading" modal/>

      <ContentBox v-else-if="!matchInfo || isMatchInfoEmpty" class="mt-3">
        <ContentBoxBody>
          <NoDataAvailable :title="'No Data Available'" :message="'There is nothing to display yet.'" />
        </ContentBoxBody>
      </ContentBox>

      <template v-else>
        <div class="row g-3 mt-3">

          <div class="col-12 col-xl-8 d-flex metric-card-col">
            <ContentBox class="h-100">
              <template v-slot:header-title>
                <span class="mb-1 font-bold text-base">{{ t('home.match.dataReceived') }}</span>
              </template>              
              <ContentBoxBody>
                <div class="text-left">
                  <span class="mr-2">{{ t('global.total') }}: </span>
                  <span class="font-bold">{{ lineChartTotalFormatted }}</span>
                </div>
                <Tooltip :anchor-element="'target'" :position="'top'">
                  <StackedSegmentBar :segments="lineChartSegments" @segment-click="handleLineChartClick" />
                </Tooltip>
                <CustomChartLegend :legend-items="lineChartLegend" />
              </ContentBoxBody>
            </ContentBox>
          </div>

          <div class="col-12 col-xl-4 d-flex metric-card-col">
            <ContentBox class="h-100">
              <template v-slot:header-title>
                <span class="mb-1 font-bold text-base">{{ t('home.overview.dataQualityAndRequired.qualityDataReceived') }}</span>
              </template>
              <ContentBoxBody>
                <OverviewDataQualityAndRequired v-if="dataQuality" :data="dataQuality" />
              </ContentBoxBody>
            </ContentBox>
          </div>

          <div class="col-12 col-xl-4 d-flex metric-card-col">
            <ContentBox class="h-100">
              <template v-slot:header-title>
                <span class="mb-1 font-bold text-base">{{ t('home.overview.matchedUnmatchedData') }}</span>
              </template>
              <template v-slot:header-controls>
                <span class="fa-solid fa-up-right-and-down-left-from-center text-sm chart-fullscreen-toggle" @click="openFullScreenChart('matched')"></span>
              </template>
              <ContentBoxBody>
                <p>
                  <span>{{ t('global.totalAnalyzed') }}: </span>
                  <span class="font-bold">{{ matchedUnmatchedTotalFormatted }}</span>
                </p>
                <PieChart :items="matchedPieItems" :label-content="pieLabelContent" height="350px"
                  @slice-click="handleMatchedClick" />
              </ContentBoxBody>
            </ContentBox>
          </div>

          <div class="col-12 col-xl-4 d-flex metric-card-col">
            <ContentBox class="h-100">
              <template v-slot:header-title>
                <span class="mb-1 font-bold text-base">{{ t('home.overview.includedExcludedData') }}</span>
              </template>
              <template v-slot:header-controls>
                <span class="fa-solid fa-up-right-and-down-left-from-center text-sm chart-fullscreen-toggle" @click="openFullScreenChart('included')"></span>
              </template>
              <ContentBoxBody>
                <p>
                  <span>{{ t('global.totalMatched') }}: </span>
                  <span class="font-bold">{{ includedExcludedTotalFormatted }}</span>
                </p>
                <PieChart :items="includedPieItems" :label-content="pieLabelContent" height="350px"
                  @slice-click="handleIncludedClick" />
              </ContentBoxBody>
            </ContentBox>
          </div>

          <div class="col-12 col-xl-4 d-flex metric-card-col" v-if="exclusionCategories.length">
            <ContentBox class="h-100">
              <template v-slot:header-title>
                <span class="mb-1 font-bold text-base">{{ t('global.metricCharts.reasonsFullScreen') }}</span>
              </template>
              <template v-slot:header-controls>
                <span class="fa-solid fa-up-right-and-down-left-from-center text-sm chart-fullscreen-toggle" @click="openFullScreenChart('exclusion')"></span>
              </template>
              <ContentBoxBody>
                <HorizontalBarChart
                  :categories="exclusionCategories"
                  :series="exclusionSeries"
                  :category-axis-title="`${t('global.metricCharts.reasonsFullScreen')} (Top ${exclusionCategories.length})`"
                  category-axis-title-color="#222222"
                  :category-axis-title-font-weight="500"
                  :category-axis-title-font-size="14"
                  height="350px"
                  value-labels-visible
                  :value-labels-content="exclusionValueLabelContent"
                  :value-axis-labels-content="exclusionValueLabelContent"
                  :value-axis-label-rotation="'auto'"
                  value-axis-label-color="#222222"
                  :value-axis-label-font-weight="700"
                  :category-label-max-length="18"
                  :legend-visible="false"
                  @bar-click="handleExclusionReasonClick"
                />
              </ContentBoxBody>
            </ContentBox>
          </div>

          <div class="col-12">
            <ContentBox>
              <template v-slot:header-title>
                <span class="mb-1 font-bold text-base">{{ t('arMatch.countriesMap.customers') }} / {{ t('arMatch.countriesMap.ownEntities') }}</span>
              </template>
              <template v-slot:header-controls>
                <span class="fa-solid fa-up-right-and-down-left-from-center text-sm chart-fullscreen-toggle" @click="openFullScreenChart('map')"></span>
              </template>
              <ContentBoxBody>
                <BubbleMap
                  ar-loader
                  :data="bubbleMapData"
                  :metric="bubbleMapMetric"
                  :supplier-label="t('arMatch.countriesMap.customers')"
                  :buyer-label="t('arMatch.countriesMap.ownEntities')"
                  :no-data-title="t('arMatch.empty')"
                  :selected-country="selectedLocationCountry ?? undefined"
                  @location-clicked="handleLocationClick"
                />
              </ContentBoxBody>
            </ContentBox>
          </div>

          <div class="col-12">
            <ListMatch
              :chart-filter="chartFilter"
              :chart-filter-chips="chartFilterChips"
              @remove-chart-filter-chip="removeChartFilterChip"
              @clear-chart-filters="clearChartFilters"
            />
          </div>
        </div>
      </template>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CalculumLoadingAr,
  CalculumFullScreen,
  NoDataAvailable,
  ContentBox,
  ContentBoxBody,
  OverviewDataQualityAndRequired,
  CustomChartLegend,
  StackedSegmentBar,
  PieChart,
  HorizontalBarChart,
  BubbleMap,
  Tooltip,
} from '@ada/design-system'
import type {
  ChartLegendItem,
  StackedSegmentBarItem,
  PieChartItem,
  PieChartLabelArgs,
  PieChartSliceClickPayload,
  HorizontalBarSeries,
  HorizontalBarClickPayload,
  BubbleMapData,
  BubbleMapMetric,
  BubbleMapLocationClickedPayload,
} from '@ada/design-system'
import type { GraphqlGridFilterDescriptor } from '@ada/design-system/components/graphql-grid/types'
import { fetchDataMatchInfo, type MatchInfoResponse, type MatchMetric } from '../api'
import { useContextStore } from '@/stores/context'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { formatNumber } from '../utils/format'
import { formatCompactMetricValue, formatMoneyCompact } from '@/utils/moneyFormatting'
import ListMatch from '../components/ListMatch.vue'

type BucketKey = 'included' | 'excluded' | 'matched' | 'unmatched'

const BUCKET_COLORS: Record<BucketKey, string> = {
  included: '#2e90fa',
  excluded: '#4a5567',
  matched: '#36bffa',
  unmatched: '#98a2b3',
}

const BUBBLE_MAP_METRIC_BY_SORT: Record<MatchMetric, BubbleMapMetric> = {
  numberOfCustomers: 'numberOfSuppliers',
  numberOfInvoiceLines: 'numberOfSpends',
  saleVolume: 'spendVolume',
}

const MATCH_METRICS: MatchMetric[] = ['numberOfCustomers', 'numberOfInvoiceLines', 'saleVolume']

export default defineComponent({
  name: 'MatchView',
  components: {
    CalculumLoadingAr,
    CalculumFullScreen,
    NoDataAvailable,
    ContentBox,
    ContentBoxBody,
    OverviewDataQualityAndRequired,
    CustomChartLegend,
    StackedSegmentBar,
    PieChart,
    HorizontalBarChart,
    BubbleMap,
    Tooltip,
    ListMatch,
  },
  props: {
    sortBy: {
      type: String as PropType<MatchMetric>,
      required: true,
    },
  },
  emits: ['empty-change'],
  setup(props, { emit }) {
    const { t } = useI18n({ useScope: 'global' })
    const contextStore = useContextStore()
    const currenciesStore = useArCurrenciesStore()

    const loading = ref(true)
    const matchInfo = ref<MatchInfoResponse | null>(null)

    const metric = computed(() => props.sortBy)

    const isVolumeMetric = computed(() => metric.value === 'saleVolume')
    const formatMetricValue = (value: number) =>
      (isVolumeMetric.value ? formatMoneyCompact(value, currenciesStore.selectedCurrencySymbol) : formatNumber(value))

    const dataQuality = computed(() => matchInfo.value?.dataQuality ?? null)

    const isMatchInfoEmpty = computed(() => {
      if (!matchInfo.value) return false
      const info = matchInfo.value
      return MATCH_METRICS.every((m) => {
        const bucket = info.lineChart[m]
        return bucket.included === 0 && bucket.excluded === 0 && bucket.unmatched === 0
      })
    })

    watch(
      () => !matchInfo.value || isMatchInfoEmpty.value,
      (empty) => emit('empty-change', empty),
      { immediate: true },
    )

    const lineChartSegments = computed<StackedSegmentBarItem[]>(() => {
      const bucket = matchInfo.value?.lineChart[metric.value]
      if (!bucket) return []
      const total = bucket.included + bucket.excluded + bucket.unmatched
      return (['included', 'excluded', 'unmatched'] as const)
        .map((key) => ({ key, amount: bucket[key] }))
        .filter((item) => item.amount > 0)
        .map((item) => ({
          key: item.key,
          value: formatMetricValue(item.amount),
          percentage: total > 0 ? (item.amount / total) * 100 : 0,
          color: BUCKET_COLORS[item.key],
        }))
    })

    const lineChartTotalFormatted = computed(() => {
      const bucket = matchInfo.value?.lineChart[metric.value]
      if (!bucket) return formatMetricValue(0)
      return formatMetricValue(bucket.included + bucket.excluded + bucket.unmatched)
    })

    const lineChartLegend = computed<ChartLegendItem[]>(() =>
      lineChartSegments.value.map((segment) => ({
        text: t(`arMatch.bucket.${segment.key}`),
        color: segment.color,
      })),
    )

    const matchedPieItems = computed<PieChartItem[]>(() => {
      const bucket = matchInfo.value?.matchedPieChart[metric.value]
      if (!bucket) return []
      return (['matched', 'unmatched'] as const).map((key) => ({
        category: t(`arMatch.bucket.${key}`),
        value: bucket[key],
        color: BUCKET_COLORS[key],
      }))
    })

    const includedPieItems = computed<PieChartItem[]>(() => {
      const bucket = matchInfo.value?.includedPieChart[metric.value]
      if (!bucket) return []
      return (['included', 'excluded'] as const).map((key) => ({
        category: t(`arMatch.bucket.${key}`),
        value: bucket[key],
        color: BUCKET_COLORS[key],
      }))
    })

    const matchedUnmatchedTotalFormatted = computed(() => {
      const bucket = matchInfo.value?.matchedPieChart[metric.value]
      if (!bucket) return formatMetricValue(0)
      return formatMetricValue(bucket.matched + bucket.unmatched)
    })

    const includedExcludedTotalFormatted = computed(() => {
      const bucket = matchInfo.value?.includedPieChart[metric.value]
      if (!bucket) return formatMetricValue(0)
      return formatMetricValue(bucket.included + bucket.excluded)
    })

    const pieLabelContent = (e: PieChartLabelArgs) =>
      `${formatMetricValue(e.value)} (${(e.percentage * 100).toFixed(0)}%)`

    // Which chart card (if any) is currently expanded in CalculumFullScreen - null means none.
    type FullScreenChartKey = 'matched' | 'included' | 'exclusion' | 'map'
    const fullScreenChart = ref<FullScreenChartKey | null>(null)
    function openFullScreenChart(key: FullScreenChartKey) {
      fullScreenChart.value = key
    }
    function closeFullScreenChart() {
      fullScreenChart.value = null
    }

    // Collapsed to the top 4 reasons outside fullscreen so the card stays readable at its normal
    // size; expanding the "exclusion" chart into CalculumFullScreen reveals every reason.
    const exclusionReasons = computed(() => {
      const reasons = matchInfo.value?.excludedBarChart[metric.value] ?? []
      const sorted = [...reasons].sort((a, b) => b.amount - a.amount)
      return fullScreenChart.value === 'exclusion' ? sorted : sorted.slice(0, 4)
    })

    const exclusionCategories = computed(() => exclusionReasons.value.map((reason) => reason.reason))

    const exclusionSeries = computed<HorizontalBarSeries[]>(() => [
      { data: exclusionReasons.value.map((reason) => reason.amount), color: BUCKET_COLORS.excluded },
    ])

    // `formatCompactMetricValue`, not `formatMetricValue` (PR 14881 review): this chart's labels
    // were compact for EVERY metric before UC-UI-23, volume included - `formatMetricValue`'s own
    // non-volume branch is full/`formatNumber`, a different, pre-existing rule for the bars
    // elsewhere on this screen that would overflow these labels and contradict this story's own
    // "number formatting unchanged" claim (AC#3) for the two count metrics.
    const exclusionValueLabelContent = (e: { value: unknown }) =>
      formatCompactMetricValue(Number(e.value), isVolumeMetric.value, currenciesStore.selectedCurrencySymbol)

    const bubbleMapMetric = computed<BubbleMapMetric>(() => BUBBLE_MAP_METRIC_BY_SORT[metric.value])

    const toBubbleMapPoints = (rows: MatchInfoResponse['countriesMap']['counterparties']) =>
      rows.map((row) => ({
        country: row.countryCode ?? '',
        geoLat: row.geoLat ?? 0,
        geoLon: row.geoLon ?? 0,
        supplierOrBuyerCount: row.partyCount,
        spendCount: row.saleLineCount,
        volume: String(row.volume),
      }))

    const bubbleMapData = computed<BubbleMapData>(() => ({
      suppliers: toBubbleMapPoints(matchInfo.value?.countriesMap.counterparties ?? []),
      buyers: toBubbleMapPoints(matchInfo.value?.countriesMap.ownEntities ?? []),
    }))

    // ---- chart-click-to-filter (UC-API-10: narrowing the grid by clicking a chart segment).
    //
    // Mirrors apps/ap's OverviewCharts.vue pattern - a click toggles that segment's selection
    // (re-clicking the same one clears it), selecting one clears every other chart's selection, and
    // the resulting filter is handed straight to this view's own directly-nested ListMatch, no
    // emit/store round-trip needed. Unlike AP's generic groupName/optionName/name scheme (built for
    // its monolith's own data model), this builds a typed Kendo filter directly against the three
    // fields Ada-Platform's chart drill-down is built on: isMatched, isExcluded, exclusionReason
    // (SaleMatchRowFilterInputType / KendoFilterTranslator - the same fields both the GraphQL row
    // query and the REST totals endpoint already allow-list for this).
    type LineChartKey = 'included' | 'excluded' | 'unmatched'

    // One entry per atomic field/value condition, rather than one opaque composite - this is what
    // lets the grid render an individually-removable chip per condition (e.g. "included" is two
    // chips: "Matched" + "Not excluded") while `chartFilter` (below) stays the single composite the
    // GraphQL/REST queries actually need. `id` is the field name: within any one selection here each
    // field appears at most once, so it doubles as a stable removal key.
    interface ChartFilterEntry {
      id: string
      field: string
      operator: string
      value: unknown
      label: string
    }

    const selectedLineChartKey = ref<LineChartKey | null>(null)
    const selectedMatchedIndex = ref<number | null>(null)
    const selectedIncludedIndex = ref<number | null>(null)
    const selectedExclusionReasonIndex = ref<number | null>(null)
    const selectedLocationCountry = ref<string | null>(null)
    const chartFilterEntries = ref<ChartFilterEntry[]>([])
    const chartFilterLogic = ref<'and' | 'or'>('and')

    const chartFilter = computed<GraphqlGridFilterDescriptor | undefined>(() =>
      chartFilterEntries.value.length
        ? {
            logic: chartFilterLogic.value,
            filters: chartFilterEntries.value.map(({ field, operator, value }) => ({ field, operator, value })),
          }
        : undefined,
    )

    const chartFilterChips = computed(() =>
      chartFilterEntries.value.map(({ id, label }) => ({ id, label })),
    )

    function clearAllChartSelections() {
      selectedLineChartKey.value = null
      selectedMatchedIndex.value = null
      selectedIncludedIndex.value = null
      selectedExclusionReasonIndex.value = null
      selectedLocationCountry.value = null
      chartFilterEntries.value = []
    }

    function setChartFilterEntries(logic: 'and' | 'or', entries: ChartFilterEntry[]) {
      chartFilterLogic.value = logic
      chartFilterEntries.value = entries
    }

    // Removing one chip (as opposed to re-clicking the chart segment that produced it) can leave a
    // combination that no longer matches any single chart's selection (e.g. "included" minus its
    // "Not excluded" chip is just "isMatched: true" on its own) - so the source chart's highlighted
    // state is cleared too, same as a full clear, while the remaining entries stay in `chartFilter`.
    function removeChartFilterChip(id: string) {
      chartFilterEntries.value = chartFilterEntries.value.filter((entry) => entry.id !== id)
      selectedLineChartKey.value = null
      selectedMatchedIndex.value = null
      selectedIncludedIndex.value = null
      selectedExclusionReasonIndex.value = null
      selectedLocationCountry.value = null
    }

    function clearChartFilters() {
      clearAllChartSelections()
    }

    // "included" = matched and not excluded; "excluded" = excluded regardless of match (both
    // matched-but-excluded and never-matched-but-excluded land here); "unmatched" = neither matched
    // nor excluded. Matches MatchController's own bucket arithmetic exactly (lineChart/includedPieChart).
    function lineChartEntries(key: LineChartKey): ChartFilterEntry[] {
      if (key === 'included') {
        return [
          { id: 'isMatched', field: 'isMatched', operator: 'eq', value: true, label: t('arMatch.chartFilterChip.matched') },
          { id: 'isExcluded', field: 'isExcluded', operator: 'eq', value: false, label: t('arMatch.chartFilterChip.notExcluded') },
        ]
      }
      if (key === 'excluded') {
        return [{ id: 'isExcluded', field: 'isExcluded', operator: 'eq', value: true, label: t('arMatch.chartFilterChip.excluded') }]
      }
      return [
        { id: 'isMatched', field: 'isMatched', operator: 'eq', value: false, label: t('arMatch.chartFilterChip.notMatched') },
        { id: 'isExcluded', field: 'isExcluded', operator: 'eq', value: false, label: t('arMatch.chartFilterChip.notExcluded') },
      ]
    }

    function handleLineChartClick(key: string) {
      const typedKey = key as LineChartKey
      const reselecting = selectedLineChartKey.value === typedKey
      clearAllChartSelections()
      if (reselecting) return
      selectedLineChartKey.value = typedKey
      setChartFilterEntries('and', lineChartEntries(typedKey))
    }

    // matchedPieItems is built in that exact order below: ['matched', 'unmatched'].
    // "matched" here means "decided" (matched OR excluded) - a row excluded without ever matching
    // counts as decided rather than unmatched (UC-API-09), so it is NOT simply `isMatched: true`.
    function handleMatchedClick(payload: PieChartSliceClickPayload) {
      const reselecting = selectedMatchedIndex.value === payload.index
      clearAllChartSelections()
      if (reselecting) return
      selectedMatchedIndex.value = payload.index
      if (payload.index === 0) {
        setChartFilterEntries('or', [
          { id: 'isMatched', field: 'isMatched', operator: 'eq', value: true, label: t('arMatch.chartFilterChip.matched') },
          { id: 'isExcluded', field: 'isExcluded', operator: 'eq', value: true, label: t('arMatch.chartFilterChip.excluded') },
        ])
      } else {
        setChartFilterEntries('and', lineChartEntries('unmatched'))
      }
    }

    // includedPieItems is built in that exact order below: ['included', 'excluded'].
    function handleIncludedClick(payload: PieChartSliceClickPayload) {
      const reselecting = selectedIncludedIndex.value === payload.index
      clearAllChartSelections()
      if (reselecting) return
      selectedIncludedIndex.value = payload.index
      setChartFilterEntries('and', lineChartEntries(payload.index === 0 ? 'included' : 'excluded'))
    }

    function handleExclusionReasonClick(payload: HorizontalBarClickPayload) {
      const reselecting = selectedExclusionReasonIndex.value === payload.index
      clearAllChartSelections()
      if (reselecting) return
      selectedExclusionReasonIndex.value = payload.index
      setChartFilterEntries('and', [
        {
          id: 'exclusionReason',
          field: 'exclusionReason',
          operator: 'eq',
          value: payload.category,
          label: t('arMatch.chartFilterChip.reason', { reason: payload.category }),
        },
      ])
    }

    // BubbleMap plots two independent country dimensions - "suppliers" (labeled "customers" in this
    // view, the counterparty/buyer side of the trade - SaleMatchRowFact's own Buyer* columns) and
    // "buyers" (labeled "ownEntities", the supplier side). Only country, not the pin's group, drives
    // re-click detection - same simplification AP's own handleLocationClick makes, and the one
    // BubbleMap's own `selectedCountry` highlight is capable of (it isn't group-aware either).
    function handleLocationClick(payload: BubbleMapLocationClickedPayload) {
      const reselecting = selectedLocationCountry.value === payload.country
      clearAllChartSelections()
      if (reselecting) return
      selectedLocationCountry.value = payload.country
      const isSupplierPin = payload.type === 'suppliers'
      const field = isSupplierPin ? 'buyerCountryCode' : 'supplierCountryCode'
      const labelKey = isSupplierPin ? 'arMatch.chartFilterChip.customerCountry' : 'arMatch.chartFilterChip.ownEntityCountry'
      setChartFilterEntries('and', [
        { id: field, field, operator: 'eq', value: payload.country, label: t(labelKey, { country: payload.country }) },
      ])
    }

    // Same as AP: switching which metric the charts break down by invalidates whatever segment was
    // selected under the old one.
    watch(metric, clearAllChartSelections)

    async function load(versionUuid: string | null) {
      loading.value = true
      matchInfo.value = null
      clearAllChartSelections()
      if (versionUuid) {
        try {
          matchInfo.value = await fetchDataMatchInfo(versionUuid, currenciesStore.currency)
        } catch (error) {
          console.error(error)
        }
      }
      loading.value = false
    }

    watch(() => contextStore.saleFileVersionUuid, load, { immediate: true })

    return {
      t,
      loading,
      matchInfo,
      dataQuality,
      isMatchInfoEmpty,
      lineChartSegments,
      lineChartTotalFormatted,
      lineChartLegend,
      matchedPieItems,
      includedPieItems,
      matchedUnmatchedTotalFormatted,
      includedExcludedTotalFormatted,
      pieLabelContent,
      exclusionCategories,
      exclusionSeries,
      exclusionValueLabelContent,
      bubbleMapMetric,
      bubbleMapData,
      chartFilter,
      chartFilterChips,
      selectedLocationCountry,
      fullScreenChart,
      openFullScreenChart,
      closeFullScreenChart,
      handleLineChartClick,
      handleMatchedClick,
      handleIncludedClick,
      handleExclusionReasonClick,
      handleLocationClick,
      removeChartFilterChip,
      clearChartFilters,
    }
  },
})
</script>
<style scoped>

.metric-card-col :deep(.content-box) {
  flex: 1;
}

.metric-card-col :deep(.content-box__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.chart-fullscreen-toggle {
  cursor: pointer;
  color: var(--color-text-3);
}

</style>
