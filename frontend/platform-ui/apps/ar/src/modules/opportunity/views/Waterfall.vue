<template>
<div class="waterfall-view">
  <NoDataAvailable
    v-if="!context.saleFileVersionUuid"
    :title="t('arOpportunity.waterfall.noVersion')"
    :message="t('arOpportunity.waterfall.noVersionHint')"
  />

  <template v-else>
    <!-- One bordered card for the title/unit-toggle/chart - AP's own single `waterfall-chart-
         wrapper` div (bg-white/border-radius-8/p-4), AR's own `ContentBox` card primitive
         (OpportunityOverview.vue's cards, and this same screen's nine-box tab, use the same one).
         The buyers grid below stays its OWN separate card, same two-card split nine-box uses
         (title+boxes+summary in one card, the rows grid below it in another). -->
    <ContentBox>
      <template #header-title>
        <div class="d-flex flex-column gap-1">
          <span class="font-bold text-base">{{ t('arOpportunity.waterfall.title') }}</span>
          <BodyText variant="sm" class="text-gray-500">{{ t('arOpportunity.waterfall.subtitle') }}</BodyText>
        </div>
      </template>
      <ContentBoxBody>
        <div class="strategy-unit-toggle d-flex gap-3 mb-3" role="radiogroup">
          <div
            class="strategy-unit-option"
            :class="{ 'strategy-unit-option--selected': strategyUnit === 'days' }"
            role="radio"
            :aria-checked="strategyUnit === 'days'"
            tabindex="0"
            @click="strategyUnit = 'days'"
            @keydown.enter.prevent="strategyUnit = 'days'"
            @keydown.space.prevent="strategyUnit = 'days'"
          >
            <span class="strategy-unit-option__indicator" aria-hidden="true">
              <svg v-if="strategyUnit === 'days'" class="strategy-unit-option__check" viewBox="0 0 17 16" fill="currentColor">
                <path d="M16.25 8C16.25 12.4183 12.6683 16 8.25 16C3.83172 16 0.25 12.4183 0.25 8C0.25 3.58172 3.83172 0 8.25 0C12.6683 0 16.25 3.58172 16.25 8ZM12.2803 4.96967C11.9874 4.67678 11.5126 4.67678 11.2197 4.96967C11.2126 4.97674 11.2059 4.98424 11.1998 4.9921L7.7274 9.41674L5.63388 7.32322C5.34098 7.03033 4.86611 7.03033 4.57322 7.32322C4.28032 7.61612 4.28032 8.09099 4.57322 8.38388L7.21966 11.0303C7.51256 11.3232 7.98743 11.3232 8.28032 11.0303C8.28685 11.0238 8.293 11.0169 8.29876 11.0097L12.291 6.01947C12.5732 5.72582 12.5696 5.25897 12.2803 4.96967Z" />
              </svg>
              <span v-else class="strategy-unit-option__circle" />
            </span>
            <span class="strategy-unit-option__text">
              <BodyText variant="sm" weight="semibold">{{ t('arOpportunity.waterfall.unitToggle.days') }}</BodyText>
              <BodyText variant="xs" class="text-gray-500">{{ t('arOpportunity.waterfall.unitToggle.daysHint') }}</BodyText>
            </span>
          </div>
          <div
            class="strategy-unit-option"
            :class="{ 'strategy-unit-option--selected': strategyUnit === 'cashFlow' }"
            role="radio"
            :aria-checked="strategyUnit === 'cashFlow'"
            tabindex="0"
            @click="strategyUnit = 'cashFlow'"
            @keydown.enter.prevent="strategyUnit = 'cashFlow'"
            @keydown.space.prevent="strategyUnit = 'cashFlow'"
          >
            <span class="strategy-unit-option__indicator" aria-hidden="true">
              <svg v-if="strategyUnit === 'cashFlow'" class="strategy-unit-option__check" viewBox="0 0 17 16" fill="currentColor">
                <path d="M16.25 8C16.25 12.4183 12.6683 16 8.25 16C3.83172 16 0.25 12.4183 0.25 8C0.25 3.58172 3.83172 0 8.25 0C12.6683 0 16.25 3.58172 16.25 8ZM12.2803 4.96967C11.9874 4.67678 11.5126 4.67678 11.2197 4.96967C11.2126 4.97674 11.2059 4.98424 11.1998 4.9921L7.7274 9.41674L5.63388 7.32322C5.34098 7.03033 4.86611 7.03033 4.57322 7.32322C4.28032 7.61612 4.28032 8.09099 4.57322 8.38388L7.21966 11.0303C7.51256 11.3232 7.98743 11.3232 8.28032 11.0303C8.28685 11.0238 8.293 11.0169 8.29876 11.0097L12.291 6.01947C12.5732 5.72582 12.5696 5.25897 12.2803 4.96967Z" />
              </svg>
              <span v-else class="strategy-unit-option__circle" />
            </span>
            <span class="strategy-unit-option__text">
              <BodyText variant="sm" weight="semibold">{{ t('arOpportunity.waterfall.unitToggle.cashFlow') }}</BodyText>
              <BodyText variant="xs" class="text-gray-500">{{ t('arOpportunity.waterfall.unitToggle.cashFlowHint') }}</BodyText>
            </span>
          </div>
        </div>

        <BodyText variant="md" weight="semibold" class="mb-2">{{ strategyChartTitle }}</BodyText>
        <NoDataAvailable
          v-if="chartError"
          :title="t('arOpportunity.waterfall.loadError')"
          :message="chartError"
        />
        <WaterfallChart
          v-else
          :data="strategyChartData"
          :height="chartHeight"
          :category-axis-title="t('arOpportunity.waterfall.strategy.xAxisTitle')"
          :value-axis-title="strategyValueAxisTitle"
          :value-axis-title-font-weight="700"
          category-axis-title-color="#98a2b3"
          :category-axis-title-font-weight="700"
          :category-axis-title-font-size="12"
          value-axis-label-color="#98a2b3"
          :value-axis-label-font-weight="700"
          :value-axis-label-rotation="'auto'"
          :value-labels-content="strategyValueLabelsContent"
          :legend-items="waterfallLegendItems"
          @bar-click="onStrategyBarClick"
        />
      </ContentBoxBody>
    </ContentBox>

    <!-- Always a grid area below the chart - even with nothing selected yet, Kendo's own Grid
         renders its native "no records" placeholder here (the same "grid always visible, even
         with zero rows" convention NineBoxRowsGrid already uses on the Buyer Prioritization tab)
         rather than a text-only prompt standing in for it. Live UC-API-18 data now: A1 (a step
         that moved no line) is a genuinely empty page, not a curated "no buyers yet" message, so
         this grid leans on GraphqlGrid's own empty state rather than a bespoke one. -->
    <ContentBox class="mt-3">
      <template v-slot:header-title>
        <BodyText variant="md" weight="semibold">{{ t('arOpportunity.waterfall.gridTitle') }}</BodyText>
      </template>
      <ContentBoxBody>
        <!-- AB#20420: a location indicator, same non-interactive single-item CustomTabs pattern as
             NineBoxOverview.vue's own (AB#20418) - this grid is always sale-line grain, so there is
             only ever the one item to show, never a real switcher. -->
        <CustomTabs
          class="mb-2"
          :items="[{ id: 'saleLines', label: t('arOpportunity.list.tabs.saleLines') }]"
          model-value="saleLines"
          appearance="segmented"
        />
        <GridExportStatus ref="exportStatus" :loading="drillInLoading" />
        <GraphqlGrid
          v-model:columns="drillInColumns"
          :items="drillInItems"
          :total="drillInTotal"
          :skip="drillInSkip"
          :take="drillInTake"
          :sort="drillInSort"
          :filter="drillInFilter"
          :sortable="{ allowUnsort: true, mode: 'single' }"
          :loading="drillInLoading"
          :pageable="drillInPageable"
          :height="DRILL_IN_GRID_HEIGHT"
          :totals-by-columns="drillInTotals"
          :loading-totals="drillInLoadingTotals"
          :analyze-store="analyzeStore"
          :column-menu="false"
          :column-selector-default-columns="drillInDefaultColumns"
          data-item-key="saleLineId"
          :allow-export="canExportDrillIn"
          :export-label="t('arGridExport.exportLabel')"
          :options-label="t('arGridExport.optionsLabel')"
          @datastatechange="onDrillInDataStateChange"
          @export="onDrillInExport"
        />
      </ContentBoxBody>
    </ContentBox>
  </template>
</div>
</template>

<script setup lang="ts">
/**
 * UC-UI-15: the portfolio broken down by winning strategy, one bar per strategy, plus a unit
 * toggle and a per-strategy sale-line drill-in. Both come from UC-API-18 (`POST
 * /api/opportunity-overview/waterfall-chart` for the bars, GraphQL `waterfallSaleLineRows` for the
 * drill-in) - this screen no longer reads the mock `data/waterfallStrategyBreakdown.ts` (retired).
 *
 * Modeled directly on AP's own Opportunity Waterfall screen (`apps/ap/src/modules/home/analyze/
 * views/HomeAnalyzeWaterfall.vue`): one bordered card (`ContentBox`, this screen's own primitive -
 * AP's own single `waterfall-chart-wrapper` div) holding the "Waterfall" title, a pair of
 * check-circle selectable cards for the unit (AP's own "Potential Payment Term (days)"/"Potential
 * Cash Flow" options - `unselected-circle-small`/`iconCheckCircleFill` in AP's own markup, ported
 * here as inline SVG rather than pulled in as a new cross-package dependency for one icon), and
 * the chart. A second, separate card below it holds the drill-in grid - always rendered, even with
 * nothing picked yet (Kendo's own Grid shows its native "no records" placeholder then, matching
 * AP's own `#select-waterfall-template` area, which is likewise never absent) rather than a
 * text-only prompt standing in for it. AP has no "close" affordance on that grid (a new bar click
 * simply redraws it), so neither does this screen.
 *
 * This view previously toggled between this Strategy Breakdown and a separate "Cash Flow Buckets"
 * view (UC-UI-03, fed by `fetchOpportunityWaterfallBuckets`/`fetchWaterfallBucketBuyers`) behind a
 * `CustomTabs` control. AP's real screen has no such toggle - it only ever shows what AR calls the
 * Strategy Breakdown - so per direct request the toggle is gone and this is now the tab's only
 * view. Retiring/relocating the Cash Flow Buckets view itself is out of this screen's scope now;
 * `fetchOpportunityWaterfallBuckets` (UC-API-03) and `data/waterfallBucketBuyers.ts` are untouched
 * and still independently tested, just no longer wired into this file.
 *
 * The version comes from the shared `useContextStore`, exactly as `ListMatch.vue` reads it,
 * because this module has no version-selection UI of its own - the app-wide navbar file/version
 * picker (`components/layout/Navbar.vue`) is what sets it.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BodyText,
  CHART_COLORS,
  ContentBox,
  ContentBoxBody,
  CustomTabs,
  NoDataAvailable,
  WaterfallChart,
  type ChartLegendItem,
  type WaterfallBarClickPayload,
  type WaterfallDataPoint,
} from '@ada/design-system'
import GraphqlGrid from '@ada/design-system/components/graphql-grid/Index.vue'
import {
  flattenGraphqlGridColumns,
  mergeCachedGraphqlGridColumns,
  normalizeGraphqlGridColumns,
  type GraphqlGridColumnOrGroup,
  type GraphqlGridDataState,
  type GraphqlGridFilterDescriptor,
  type GraphqlGridPageableSettings,
  type GraphqlGridSortDescriptor,
} from '@ada/design-system/components/graphql-grid/types'
import {
  flattenFilterDescriptors,
  kendoFilterToGraphqlWhere,
  kendoSortToGraphqlOrder,
  partitionFilterDescriptor,
} from '@ada/design-system/components/graphql-grid/kendoToGraphql'
import {
  getActiveColumnsArray,
  getTotalFieldsCountByTrueValue,
  getTotalFieldsPlainWeightedAvg,
  getTotalFieldsSummation,
  getTotalFieldsWeightedAvg,
} from '@ada/design-system/utils/totalColumnsUtils'
import { apolloClient } from '@/services/graphql/apolloClient'
import GridExportStatus from '@/components/GridExportStatus.vue'
import { buildGridExportRequest } from '@/utils/gridExportRequest'
import { useArCurrentUserStore } from '@/stores/arCurrentUser'
import { HttpError, SessionExpiredError } from '@/api/http'
import { useContextStore } from '@/stores/context'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { useGridColumnPreferencesStore } from '@/stores/gridColumnPreferences'
import { useLoadToken } from '@/composables/useLoadToken'
import { useCustomAttributesStore } from '@/stores/customAttributes'
import {
  applyCustomAttributeDefinitions,
  hideUnnamedCustomAttributes,
  isCustomDataPointField,
  toCustomAttributeFilters,
} from '@/utils/customAttributeColumns'
import {
  fetchFilterSummary,
  fetchOpportunityWaterfallChart,
  type MatchSummaryResponse,
  type OpportunitySummaryOperations,
  type OpportunitySummaryResponse,
  type WaterfallChartBar,
  type WaterfallChartResponse,
} from '@/api'
import {
  fetchWaterfallSaleLineRows,
  visibleWaterfallSaleLineFields,
  waterfallSaleLineColumns,
  type WaterfallSaleLineRow,
} from '../data/waterfallSaleLineRows'
import { CLIENT_ONLY_FIELDS, fetchOverviewRows, toDisplayOverviewRow, type SaleLineOverviewRow } from '../data/overviewRows'
import { chartFirstGroup, platformDataColor } from '@/utils/chartColors'

const { t } = useI18n({ useScope: 'global' })
const context = useContextStore()
const currenciesStore = useArCurrenciesStore()
const preferences = useGridColumnPreferencesStore()
const customAttributesStore = useCustomAttributesStore()

const currentUser = useArCurrentUserStore()
const exportStatus = ref<InstanceType<typeof GridExportStatus> | null>(null)

const strategyUnit = ref<'days' | 'cashFlow'>('cashFlow')

// --- Chart -------------------------------------------------------------------------------------

const chart = ref<WaterfallChartResponse | null>(null)
const chartError = ref<string | null>(null)
const { start: startChart, isStale: isChartStale } = useLoadToken()

/** The currently-displayed unit's bars, in the exact order and shape UC-API-18 sent them - never
 * re-sorted or re-filtered here (a step that moved nothing is already dropped server-side, and the
 * last surviving bar already carries the reconciliation residue). */
const chartBars = computed<WaterfallChartBar[]>(() => {
  if (!chart.value) return []
  return strategyUnit.value === 'cashFlow' ? chart.value.byCashFlow : chart.value.byTerms
})

// AB#20517: which strategy periods count as the company's own data vs. the platform's benchmark
// data - same split AP's own Payables Waterfall legend uses (`waterfallLegendItems` in
// HomeAnalyzeWaterfall.vue), applied to Receivables' own period keys. `actual` (the untouched
// baseline, Payment Terms view only) counts as internal since it's the company's own starting
// figure, not a platform benchmark.
const INTERNAL_SOURCE_PERIODS = new Set([
  'buyerParentMin', 'industryRegion', 'payOnTerms', 'creditLimitMax', 'buyerPolicy',
  'regulatoryTerms', 'target', 'actual',
])
const PLATFORM_DATA_PERIODS = new Set(['buyerStandard', 'peerGroupStandard', 'clientStandard'])

/** AB#20517: platform-benchmark categories are always dark navy, in both views. Everything else
 * resolves by sign, but which sign gets which color FLIPS by unit - Cash Flow Opportunity keeps
 * its own colouring (never part of the reported color bug: grey negative / blue other-positive),
 * while Payment Terms swaps them (blue negative / grey other-positive) per explicit sign-off. The
 * Avg. Days Paid (DSO) baseline is the one exception in Payment Terms: it always matches
 * "Internal Source"'s own blue, even though every other positive bar there is grey. */
function resolveStrategyBarColor(bar: WaterfallChartBar, unit: 'days' | 'cashFlow'): string {
  if (PLATFORM_DATA_PERIODS.has(bar.period)) return platformDataColor
  if (unit === 'days' && bar.period === 'actual') return chartFirstGroup
  const isNegative = bar.amount < 0
  if (unit === 'days') {
    return isNegative ? chartFirstGroup : CHART_COLORS.neutral
  }
  return isNegative ? CHART_COLORS.neutral : chartFirstGroup
}

/** One bar per surviving step, plus AP's own trailing running-total bar (Kendo sums it from the
 * bars above, per WaterfallChart's own `summary: "total"` point) - clicking it selects `'total'`,
 * same as AP's screen and the same drill-in this screen opens on by default. Empty (no summary
 * bar either) while `chart` hasn't loaded yet or failed to - otherwise the chart would render a
 * lone "Total" bar at zero, reading as "this version's cascade totals zero" rather than as
 * loading/failed. */
const strategyChartData = computed<WaterfallDataPoint[]>(() => {
  if (chartBars.value.length === 0) return []
  return [
    ...chartBars.value.map((bar) => ({
      category: t(`arOpportunity.waterfall.strategy.categories.${bar.period}`),
      value: bar.amount,
      color: resolveStrategyBarColor(bar, strategyUnit.value),
    })),
    { category: t('arOpportunity.waterfall.strategy.categories.total'), summary: 'total' as const },
  ]
})

// AB#20420: a generic "Amount" label regardless of unit, matching AP's own axis - the bars
// already say which unit they're in (the chart title above, and each bar's own value/tooltip).
const strategyValueAxisTitle = computed(() => t('arOpportunity.waterfall.yAxisTitle'))

// AB#20517: Payment Terms values are whole days - the bar-top label rounds to a plain integer,
// matching AP's own `kendoChartRelated.getDays`. The on-hover tooltip keeps its 1 decimal
// (WaterfallChart's own formatTooltipValue, unchanged and shared with the Cash Flow view) - only
// the number drawn on the bar itself differs by unit. Cash Flow keeps the component's own default
// (formatCompactChartNumber, 1 decimal + k/m suffix) by passing undefined.
const strategyValueLabelsContent = computed(() =>
  strategyUnit.value === 'days' ? (value: number) => String(Math.round(value)) : undefined,
)

// AB#20517: 0 to 4 swatches, only for the sources actually present in this unit's bars - never
// hardcoded, so a version whose backend response happens to skip a source never shows a legend
// entry with nothing behind it. Same fixed colors in both views (per explicit request the legend
// matches Cash Flow Opportunity's own) even though Payment Terms' own bars still swap colors by
// sign - the legend intentionally does not derive from resolveStrategyBarColor here.
const waterfallLegendItems = computed<ChartLegendItem[]>(() => {
  if (chartBars.value.length === 0) return []
  const otherPositiveColor = chartFirstGroup
  const negativeColor = CHART_COLORS.neutral
  const items: ChartLegendItem[] = []
  if (chartBars.value.some((bar) => INTERNAL_SOURCE_PERIODS.has(bar.period))) {
    items.push({ text: t('arOpportunity.waterfall.legend.internalSource'), color: otherPositiveColor })
  }
  if (chartBars.value.some((bar) => PLATFORM_DATA_PERIODS.has(bar.period))) {
    items.push({ text: t('arOpportunity.waterfall.legend.platformData'), color: platformDataColor })
  }
  if (chartBars.value.some((bar) => bar.amount < 0)) {
    items.push({ text: t('arOpportunity.waterfall.legend.negativeImpact'), color: negativeColor })
  }
  items.push({ text: t('arOpportunity.waterfall.strategy.categories.total'), color: CHART_COLORS.total })
  return items
})

// The heading above the chart, same unit-switch strategyValueAxisTitle already does - the bars
// redraw in days when strategyUnit is 'days', so a heading stuck on "Cash Flow" would contradict
// both the axis label and the bar values themselves.
const strategyChartTitle = computed(() =>
  strategyUnit.value === 'cashFlow'
    ? t('arOpportunity.waterfall.strategy.chartTitle')
    : t('arOpportunity.waterfall.strategy.chartTitleDays'),
)

async function loadChart(): Promise<void> {
  const token = startChart()
  const versionUuid = context.saleFileVersionUuid
  if (!versionUuid) {
    chart.value = null
    chartError.value = null
    return
  }
  // Clear before refetching - a version/currency switch must never keep rendering the PREVIOUS
  // version's bars while (or after) the new request is in flight; see chartError below for the
  // failure case.
  chart.value = null
  chartError.value = null
  try {
    const response = await fetchOpportunityWaterfallChart(versionUuid, currenciesStore.currency)
    if (isChartStale(token)) return
    chart.value = response
  } catch (loadError) {
    if (isChartStale(token)) return
    if (loadError instanceof SessionExpiredError) {
      // The page is navigating away to sign in; hold the empty state rather than flashing an
      // error over a screen that is already leaving.
      return
    }
    chartError.value = loadError instanceof HttpError
      ? t('arOpportunity.waterfall.serverError', { status: loadError.status })
      : t('arOpportunity.waterfall.networkError')
  }
}

// --- Drill-in grid -------------------------------------------------------------------------------

// Its own cache key, distinct from the List tab's - this grid has its own column list. `v2`:
// column parity (2026-10-02) rebuilt it, and an old snapshot would restore its own visibility.
const DRILL_IN_GRID_KEY = 'opportunity-waterfall-sale-lines-v2'

// A fixed height, like the List tab's and the 9 Boxes grid: with none, GraphqlGrid falls back to
// its auto-height (non-scrollable) mode, where Kendo puts the header inside the body table with no
// `.k-grid-header` wrapper, so the theme's header rules never apply and each column's filter icon
// drops above its title instead of sitting at its right.
const DRILL_IN_GRID_HEIGHT = '600px'

// #21145: the tenant's custom-attribute declarations, as on the List tab - an unnamed Custom Data
// Point stays hidden, and a saved preference does not bring one back.
function drillInDefaults(): GraphqlGridColumnOrGroup[] {
  return applyCustomAttributeDefinitions(
    normalizeGraphqlGridColumns(waterfallSaleLineColumns()),
    customAttributesStore.definitions,
  )
}

function freshDrillInColumns(): GraphqlGridColumnOrGroup[] {
  const fresh = drillInDefaults()
  const cached = preferences.getColumns(DRILL_IN_GRID_KEY)
  return cached.length > 0
    ? hideUnnamedCustomAttributes(mergeCachedGraphqlGridColumns(fresh, cached), customAttributesStore.definitions)
    : fresh
}

const drillInColumns = ref<GraphqlGridColumnOrGroup[]>(freshDrillInColumns())

/** The snapshot the column selector's Reset restores to; without it Reset shows every column. */
const drillInDefaultColumns = computed(drillInDefaults)

// The schema reloads with the company or sale file version; this grid stays mounted across it.
watch(() => customAttributesStore.definitions, () => {
  drillInColumns.value = applyCustomAttributeDefinitions(drillInColumns.value, customAttributesStore.definitions)
})

// AB#20517: the backend's `waterfallSaleLineRows` step enum has no baseline value ("Unknown
// waterfall step 'actual'") - unlike AP, whose grid endpoint accepts its own baseline period as
// just another step. The Avg. Days Paid (DSO) bar drills into every sale line instead, unfiltered
// (the same `saleLineOverviewRows` the List tab uses) - these three fields don't exist on that
// query, so they're dropped from the request and just render "-" like any other null cell.
const BASELINE_ONLY_STEP_FIELDS = new Set(['previousTerm', 'stepTerm', 'cashFlowContribution'])

// UC-API-18's own default: the screen opens already populated, on the whole-cascade `total`
// drill-in - never "nothing selected" (11 Sep 2026 addendum to UC-UI-15/UC-API-18).
const selectedStrategyKey = ref<string>('total')

const drillInItems = ref<WaterfallSaleLineRow[]>([])
const drillInTotal = ref(0)
const drillInSkip = ref(0)
const drillInTake = ref(25)
/** AB#20611: the pager's items-per-page and "X - Y of Z items" block, off by default in
 * GraphqlGrid - same settings as OverviewList.vue. AB#20065 had dropped them with the old grid. */
const drillInPageable: GraphqlGridPageableSettings = {
  buttonCount: 5,
  info: true,
  type: 'numeric',
  pageSizes: [10, 25, 50, 100, 150],
  previousNext: true,
}
const drillInSort = ref<GraphqlGridSortDescriptor[]>([{ field: 'volume', dir: 'desc' }])
/** The columns' own filter (AB#21102): `column-menu: false` only turns off GraphqlGrid's header
 * popup, each column keeps Kendo's native menu. Kept across step changes - every step lists the
 * same sale-line fields. `first` is what SaleLineOverviewRowFactFilterInput knows; `second` holds
 * the custom attribute clauses, which travel as `customFilters` (a `where` naming one fails GraphQL
 * validation and blanks the grid), same split as OverviewList.vue. */
const drillInFilter = ref<GraphqlGridFilterDescriptor | undefined>(undefined)
const drillInSplitFilter = computed(() => partitionFilterDescriptor(drillInFilter.value, isCustomDataPointField))
const drillInLoading = ref(false)
// Set when the current step's last load failed - lets selectStrategy() below retry a re-click
// on the SAME bar (its own early-return guard would otherwise treat it as already selected and
// never call loadDrillIn() again, leaving the grid stuck empty until something else changes).
const drillInFailed = ref(false)
const { start: startDrillIn, isStale: isDrillInStale } = useLoadToken()
// The GraphQL variables (step included) of the drill-in page last fetched - what the export is built
// from. Plain: nothing renders from it.
let drillInVariables: Record<string, unknown> | null = null

// The baseline ('actual') drill-in is not the step grid: the server's step enum has no baseline (see
// BASELINE_ONLY_STEP_FIELDS above), so there is no WaterfallSaleLines export of it.
const canExportDrillIn = computed(() => currentUser.canExportLists && selectedStrategyKey.value !== 'actual')

// --- Drill-in footer totals (column parity, 2026-10-02) ------------------------------------------
// The Opportunity summary endpoint, narrowed to the selected step through `waterfallStep` (see
// OpportunitySummaryFilters) - except the Avg. Days Paid (DSO) baseline, whose drill-in is every
// sale line (saleLineOverviewRows), which the summary already totals without a step.
const { start: startDrillInTotals, isStale: isDrillInTotalsStale } = useLoadToken()
const drillInTotals = ref<MatchSummaryResponse | undefined>(undefined)
const drillInLoadingTotals = ref(false)
// AR has no custom-data-point types the footer needs - same stub the other grids pass.
const analyzeStore = { customDataPointTypes: {} as Record<string, string> }

/** Only the fields this grid opted a footer into (`footerCell`), the same gate as OverviewList.vue.
 * The baseline sends no `waterfallStep`, and the summary 400s the WHOLE request over a step-only
 * total asked without one (AB#20905) - so `cashFlowContribution` stays out of that request. */
function buildDrillInSummaryOperations(step: string): OpportunitySummaryOperations {
  const flat = flattenGraphqlGridColumns(drillInColumns.value)
  const withFooter = getActiveColumnsArray(flat)
    .filter((field: string) => flat.find((column) => column.field === field)?.footerCell)
    .filter((field: string) => step !== 'actual' || !BASELINE_ONLY_STEP_FIELDS.has(field))
  return {
    sum: getTotalFieldsSummation(withFooter),
    weightedCeilingAverage: getTotalFieldsWeightedAvg(withFooter),
    weightedAverage: getTotalFieldsPlainWeightedAvg(withFooter),
    countTrue: getTotalFieldsCountByTrueValue(withFooter),
  }
}

async function loadDrillInTotals(): Promise<void> {
  const token = startDrillInTotals()
  const versionUuid = context.saleFileVersionUuid
  if (!versionUuid) {
    drillInTotals.value = undefined
    drillInLoadingTotals.value = false
    return
  }

  const step = selectedStrategyKey.value
  drillInLoadingTotals.value = true
  try {
    const response = await fetchFilterSummary<OpportunitySummaryOperations, OpportunitySummaryResponse>({
      endpoint: { transaction: 'filters', section: 'opportunity', level: 'sales', operation: 'summary' },
      filters: {
        currencyRate: currenciesStore.currency,
        targetSaleFileVersionUuid: versionUuid,
        // Custom attribute clauses dropped, as OverviewList.vue does: the endpoint knows none of them.
        telerikFilter: JSON.stringify(drillInSplitFilter.value.first ?? { logic: 'and', filters: [] }),
        chartsFilter: '[]',
        searchText: '',
        fullDisabled: false,
        ...(step === 'actual' ? {} : { waterfallStep: step }),
      },
      summary: buildDrillInSummaryOperations(step),
    })
    if (isDrillInTotalsStale(token)) return
    drillInTotals.value = {
      sum: response.sum,
      'avg.weighted.ceil': response.weightedCeilingAverage,
      'avg.weighted': response.weightedAverage,
      'count.true': response.countTrue,
      totalCount: response.totalCount,
    }
  } catch {
    // A failed total must not leave the previous step's figures under the new selection.
    if (isDrillInTotalsStale(token)) return
    drillInTotals.value = undefined
  } finally {
    if (!isDrillInTotalsStale(token)) drillInLoadingTotals.value = false
  }
}

async function loadDrillIn(): Promise<void> {
  const token = startDrillIn()
  // Loading, failed (the catch below) or no version: nothing from an earlier step/version to export.
  drillInVariables = null
  const versionUuid = context.saleFileVersionUuid
  if (!versionUuid) {
    drillInItems.value = []
    drillInTotal.value = 0
    drillInLoading.value = false
    drillInFailed.value = false
    return
  }

  drillInLoading.value = true
  try {
    const page = selectedStrategyKey.value === 'actual'
      ? await fetchOverviewRows<SaleLineOverviewRow>(
          apolloClient,
          'saleLines',
          versionUuid,
          visibleWaterfallSaleLineFields(drillInColumns.value).filter((field) => !BASELINE_ONLY_STEP_FIELDS.has(field)),
          {
            skip: drillInSkip.value,
            take: drillInTake.value,
            // Same reason the field list above is filtered: saleLineOverviewRows has no
            // previousTerm/stepTerm/cashFlowContribution to sort by either, so a sort applied
            // while those columns were still visible (or from before switching to the baseline
            // bar) must not reach this query - the grid still renders them, just as "-".
            order: kendoSortToGraphqlOrder(
              drillInSort.value.filter((descriptor) => !BASELINE_ONLY_STEP_FIELDS.has(descriptor.field)),
            ),
            where: kendoFilterToGraphqlWhere(drillInSplitFilter.value.first),
            customFilters: toCustomAttributeFilters(flattenFilterDescriptors(drillInSplitFilter.value.second)),
            currencyRate: currenciesStore.currency,
          },
        ).then((result) => ({
          ...result,
          // The baseline has no step, so none of the step-only fields apply - "-" like any other
          // null cell, same as GraphqlGrid already renders for every other blank in this grid.
          items: result.items.map((item): WaterfallSaleLineRow => ({
            ...item,
            previousTerm: null,
            stepTerm: null,
            cashFlowContribution: null,
          })),
        }))
      : await fetchWaterfallSaleLineRows(
          apolloClient,
          versionUuid,
          selectedStrategyKey.value,
          visibleWaterfallSaleLineFields(drillInColumns.value),
          {
            skip: drillInSkip.value,
            take: drillInTake.value,
            order: kendoSortToGraphqlOrder(drillInSort.value),
            where: kendoFilterToGraphqlWhere(drillInSplitFilter.value.first),
            customFilters: toCustomAttributeFilters(flattenFilterDescriptors(drillInSplitFilter.value.second)),
            currencyRate: currenciesStore.currency,
          },
        )

    if (isDrillInStale(token)) return
    drillInItems.value = page.items.map(toDisplayOverviewRow)
    drillInTotal.value = page.total
    drillInVariables = (page.variables as Record<string, unknown> | undefined) ?? null
    drillInFailed.value = false
  } catch {
    // A failed page must not leave the PREVIOUS step's rows rendered under the newly selected
    // label - fall back to GraphqlGrid's own empty state instead, same convention this grid
    // already relies on for a genuinely empty step (see this file's header comment).
    if (isDrillInStale(token)) return
    drillInItems.value = []
    drillInTotal.value = 0
    drillInFailed.value = true
  } finally {
    if (!isDrillInStale(token)) drillInLoading.value = false
  }
}

function onDrillInDataStateChange(state: GraphqlGridDataState): void {
  drillInSkip.value = state.skip ?? 0
  drillInTake.value = state.take ?? drillInTake.value
  drillInSort.value = state.sort ?? []
  // A new filter is a new result set (first page, fresh totals); paging/sorting leaves totals as-is.
  const filterChanged = JSON.stringify(state.filter) !== JSON.stringify(drillInFilter.value)
  drillInFilter.value = state.filter
  if (filterChanged) drillInSkip.value = 0
  loadDrillIn()
  if (filterChanged) loadDrillInTotals()
}

/** The drill-in grid's "Export Excel": the selected step's last query and the visible columns. */
function onDrillInExport(): void {
  if (selectedStrategyKey.value === 'actual') return
  if (drillInVariables?.step !== selectedStrategyKey.value) {
    // drillInVariables is cleared for the whole duration of a fetch: say why nothing happens.
    if (drillInLoading.value) exportStatus.value?.notice('arGridExport.stillLoading')
    return
  }
  const request = buildGridExportRequest({
    variables: drillInVariables,
    columns: drillInColumns.value,
    fileName: t('arGridExport.fileName.waterfall'),
    clientOnlyFields: CLIENT_ONLY_FIELDS.saleLines,
  })
  if (!request) return
  exportStatus.value?.start('WaterfallSaleLines', request, drillInTotal.value)?.catch(() => undefined)
}

function selectStrategy(step: string): void {
  // A re-click on the already-selected bar is normally a no-op, EXCEPT when its last load
  // failed - otherwise a failed step could never be retried short of the version, currency or
  // column set changing (nothing else calls loadDrillIn() for the current step again).
  if (selectedStrategyKey.value === step && !drillInFailed.value) return
  selectedStrategyKey.value = step
  drillInSkip.value = 0
  loadDrillIn()
  loadDrillInTotals()
}

function onStrategyBarClick(payload: WaterfallBarClickPayload): void {
  if (payload.isSummary) {
    selectStrategy('total')
    return
  }
  const bar = chartBars.value[payload.index]
  if (!bar) return
  selectStrategy(bar.period)
}

watch(drillInColumns, () => {
  preferences.setColumns(DRILL_IN_GRID_KEY, drillInColumns.value)
  loadDrillIn()
  // A shown/hidden column can change which footers exist.
  loadDrillInTotals()
})

/**
 * 40% of CalculumLayout's own scrollable main section - same convention OverviewList.vue and
 * ListMatch.vue already use to fill the space that section leaves, read on mount and kept in
 * sync on resize since the section's own height is the viewport's, not a layout constant.
 */
const chartHeight = ref(320)

function setChartHeight() {
  const container = document.getElementById('container-main-id')
  if (!container) return
  chartHeight.value = Math.round(Math.max(container.clientHeight * 0.4, 250))
}

onMounted(() => {
  setChartHeight()
  window.addEventListener('resize', setChartHeight)
  loadChart()
  loadDrillIn()
  loadDrillInTotals()
})
onUnmounted(() => window.removeEventListener('resize', setChartHeight))

// A version switch resets the selection to `total` (this screen's own default) rather than to
// nothing, and refetches both the chart and the drill-in against the new version.
watch(() => context.saleFileVersionUuid, () => {
  selectedStrategyKey.value = 'total'
  drillInSkip.value = 0
  loadChart()
  loadDrillIn()
  loadDrillInTotals()
})

// The navbar's currency picker rescales every money figure this screen shows (byCashFlow bars,
// cashFlowContribution) - both requests carry the rate, so both refetch when it changes.
watch(() => currenciesStore.currency, () => {
  loadChart()
  loadDrillIn()
  loadDrillInTotals()
})
</script>

<style scoped>
/* UC-UI-15's unit toggle, modeled on AP's own "Potential Payment Term (days)"/"Cash Flow
   Opportunity" selectable boxes (Opportunity Waterfall screen) - a bordered card per option, its
   own check-circle indicator (AP's `iconCheckCircleFill`/`unselected-circle-small`) rather than a
   native radio input, `role="radio"`/`aria-checked` plus Enter/Space handling keeping it keyboard/
   screen-reader accessible without one. */
.strategy-unit-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--neutral-200);
  border-radius: 8px;
  cursor: pointer;
}

.strategy-unit-option--selected {
  border-color: var(--brand-500);
}

.strategy-unit-option__indicator {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-top: 2px;
}

.strategy-unit-option__check {
  width: 16px;
  height: 16px;
  color: var(--brand-500);
}

.strategy-unit-option__circle {
  width: 14px;
  height: 14px;
  background: var(--bg-surface);
  border: 1px solid var(--neutral-300);
  border-radius: 50%;
}

.strategy-unit-option__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
