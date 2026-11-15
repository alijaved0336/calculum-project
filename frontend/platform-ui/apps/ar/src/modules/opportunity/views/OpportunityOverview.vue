<template>
  <div class="sub-main-sections">
    <CalculumLoadingAr v-if="loading" modal />

    <ContentBox v-else-if="!hasVersion" class="mt-3">
      <ContentBoxBody>
        <NoDataAvailable :title="t('arOpportunity.empty.noVersion')" />
      </ContentBoxBody>
    </ContentBox>

    <ContentBox v-else-if="forbidden" class="mt-3">
      <ContentBoxBody>
        <NoDataAvailable :title="t('arOpportunity.empty.forbidden')" />
      </ContentBoxBody>
    </ContentBox>

    <ContentBox v-else-if="loadError" class="mt-3">
      <ContentBoxBody>
        <NoDataAvailable :title="t('arOpportunity.empty.loadError')" />
      </ContentBoxBody>
    </ContentBox>

    <template v-else>
      <!-- AB#20609: the summary row - Payment Terms and the money columns in one card, then
           Sales & Entities as tiles. The undecided figures are wired but switched off
           (overviewSummaryFlags.ts). -->
      <div class="row g-3 mt-3">
        <div class="col-xl-9 col-12 d-flex summary-card-col">
          <OverviewOpportunitySummaryCard
            :payment-terms="summaryPaymentTerms"
            :metrics="summaryMetrics"
            :show-scf="showUndecided"
          />
        </div>
        <div class="col-xl-3 col-12 d-flex summary-card-col">
          <OverviewSalesEntitiesCard
            :period="period"
            :sales-volume="money(salesAndEntities.salesVolume)"
            :sales-volume-trend="salesVolumeTrend"
            :parents="count(salesAndEntities.parentCount)"
            :buyers="count(salesAndEntities.buyerCount)"
            :sales-lines="count(salesAndEntities.saleLineCount)"
          />
        </div>
      </div>

      <!--
        AP's Program Overview chart row: two independently configurable cards, each with its own
        Select Value / Select Metric pair. Each opens on whatever it last remembered for itself
        (useOverviewChartSelectionStore, keyed by card-index) - a first visit falls back to the
        catalog's own 1st/2nd served measure, cardIndex 0 and 1 respectively, rather than either
        card naming one. `chartSelection` is this screen's own copy of AP's
        `data.itemSelectedInCharts` - a single value shared by both cards (only one segment can be
        "active" at a time), so a click on either card can narrow the list below, and a click on
        the currently-selected segment (in either card) clears it via `selection-cleared`.
      -->
      <div class="row g-3 mt-1">
        <div class="col-lg-6 col-12 d-flex metric-card-col">
          <OverviewMetricsCard
            class="w-100"
            :card-index="0"
            :selection="chartSelection"
            @item-selected="chartSelection = $event"
            @selection-cleared="chartSelection = null"
          />
        </div>
        <div class="col-lg-6 col-12 d-flex metric-card-col">
          <OverviewMetricsCard
            class="w-100"
            :card-index="1"
            :selection="chartSelection"
            @item-selected="chartSelection = $event"
            @selection-cleared="chartSelection = null"
          />
        </div>
      </div>

      <!--
        AR's twin of AP's Program Overview list (`ListsByChartsValue`): its own `OverviewList`
        instance, filtered by whichever chart segment is selected above. The List tab
        (`OpportunityList.vue`) keeps its own unfiltered instance untouched - this one is the
        Overview screen's own, not a share of that one (product decision, see US#20527's plan).
      -->
      <div class="row mt-3">
        <div class="col-12">
          <OverviewList
            :chart-selection="chartSelection"
            @clear-chart-selection="chartSelection = null"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalculumLoadingAr, ContentBox, ContentBoxBody, NoDataAvailable } from '@ada/design-system'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { useContextStore } from '@/stores/context'
import { formatBigNumbers, getNumberWithDecimals } from '@/utils/chartFormatting'
import { toUSDate } from '@/utils/dateFormatting'
import { prependMoneySymbol } from '@/utils/moneyFormatting'
import { useOpportunityOverview } from '../composables/useOpportunityOverview'
import OverviewMetricsCard from '../components/OverviewMetricsCard.vue'
import OverviewOpportunitySummaryCard from '../components/OverviewOpportunitySummaryCard.vue'
import OverviewSalesEntitiesCard from '../components/OverviewSalesEntitiesCard.vue'
import type {
  OverviewSummaryMetric,
  OverviewSummaryPaymentTerms,
  OverviewSummaryTrend,
} from '../components/overviewSummaryTypes'
import { SHOW_UNDECIDED_SUMMARY_METRICS } from '../overviewSummaryFlags'
import OverviewList, { type OverviewChartSelection } from '../components/OverviewList.vue'

/** Shown wherever a figure has no value: the convention match/utils/format.ts already uses. */
const NO_VALUE = '—'

export default defineComponent({
  name: 'OpportunityOverview',
  components: {
    CalculumLoadingAr,
    ContentBox,
    ContentBoxBody,
    NoDataAvailable,
    OverviewMetricsCard,
    OverviewOpportunitySummaryCard,
    OverviewSalesEntitiesCard,
    OverviewList,
  },
  setup() {
    const { t } = useI18n()
    const context = useContextStore()
    const currenciesStore = useArCurrenciesStore()
    const { loading, overview, loadError, forbidden } = useOpportunityOverview()

    // AP parity (US#20527): a single shared selection between both chart cards and the list
    // below - see the template comment above the chart row for why one ref covers both cards.
    const chartSelection = ref<OverviewChartSelection | null>(null)

    const hasVersion = computed(() => context.hasVersion)

    // AB#20321: the version's own period, same source and format the Navbar's file/version picker
    // already shows it in (context.setPeriods, set at the same moment saleFileVersionUuid changes
    // - no separate loading state to coordinate with this screen's own fetch). Blank rather than a
    // placeholder when absent (EF-1), same convention `days`/`money` below already follow for their
    // own missing figures.
    const period = computed(() => {
      if (!context.periodStartDate || !context.periodEndDate) return ''
      return `${toUSDate(context.periodStartDate)} - ${toUSDate(context.periodEndDate)}`
    })

    // Empty objects rather than optional chaining at every binding: a version whose pipeline
    // hasn't produced these figures yet still renders the cards, with each field falling back to
    // its own dash/empty display below, so these ARE read while null.
    const paymentTerms = computed(() => overview.value?.paymentTerms ?? {
      contractual: null, actual: null, opportunity: null, expected: null,
    })
    const cashFlow = computed(() => overview.value?.cashFlow ?? { opportunity: null, expected: null })
    const plImpact = computed(() => overview.value?.plImpact ?? { opportunity: null, expected: null })
    const economicProfit = computed(() =>
      overview.value?.economicProfit ?? { opportunity: null, expected: null })
    const salesAndEntities = computed(() => overview.value?.salesAndEntities ?? {
      salesVolume: null, parentCount: null, buyerCount: null, saleLineCount: null,
    })

    /**
     * Payment terms are whole days everywhere else in the product, and the card prints these
     * verbatim - a "37.5" would be the only place they are not. `== null` rather than `=== null`:
     * a response that omits the key is still valid JS at runtime, and must read as absent too.
     */
    const days = (value: number | null | undefined): string =>
      value == null ? NO_VALUE : String(Math.round(value))

    /** For a caption that is left out entirely, rather than dashed, when its figure is absent. */
    const optionalDays = (value: number | null | undefined): string | null =>
      value == null ? null : String(Math.round(value))

    /**
     * For the metric cards: empty on absence, not a dash. OpportunityExpectedValues renders its own
     * styled "N/A" for an empty value — the same face AP's screen shows — and passing a dash was
     * suppressing behaviour the component already had.
     *
     * UC-UI-23: prepends the selected display currency's symbol - null/absent stays untouched,
     * same convention `moneyOrDash` (NineBoxOverview.vue) and every other PR 14881 call site follow.
     */
    const metricMoney = (value: number | null): string =>
      value === null ? '' : prependMoneySymbol(formatBigNumbers(value), currenciesStore.selectedCurrencySymbol)

    /** For Sales & Entities, whose component has no absent-value handling of its own. */
    const money = (value: number | null): string =>
      value === null ? NO_VALUE : prependMoneySymbol(formatBigNumbers(value), currenciesStore.selectedCurrencySymbol)

    const count = (value: number | null): string =>
      value === null ? NO_VALUE : getNumberWithDecimals(value, 0)

    const showUndecided = SHOW_UNDECIDED_SUMMARY_METRICS

    const summaryPaymentTerms = computed<OverviewSummaryPaymentTerms>(() => ({
      contractual: days(paymentTerms.value.contractual),
      // AB#20321 AF-1: no "Avg. Days Paid" caption at all for a version with no actual term.
      avgDaysPaid: optionalDays(paymentTerms.value.actual),
      opportunity: days(paymentTerms.value.opportunity),
      expected: days(paymentTerms.value.expected),
      opportunityPaymentFloat: showUndecided ? optionalDays(paymentTerms.value.opportunityPaymentFloat) : null,
      expectedPaymentFloat: showUndecided ? optionalDays(paymentTerms.value.expectedPaymentFloat) : null,
    }))

    const summaryMetrics = computed<OverviewSummaryMetric[]>(() => [
      {
        id: 'cashFlow',
        title: t('global.cashFlow'),
        tooltip: t('arOpportunity.cards.cashFlowTooltip'),
        opportunity: metricMoney(cashFlow.value.opportunity),
        expected: metricMoney(cashFlow.value.expected),
      },
      // The mockup's middle column (briefly "Rebate", AP's vCard concept; renamed by product
      // decision, 25 Aug). `plImpact` stays null until G-372, so it would only ever say N/A.
      ...(showUndecided
        ? [{
          id: 'plImpact',
          title: t('arOpportunity.cards.plImpactTitle'),
          tooltip: t('arOpportunity.cards.plImpactTooltip'),
          opportunity: metricMoney(plImpact.value.opportunity),
          expected: metricMoney(plImpact.value.expected),
        }]
        : []),
      {
        id: 'economicProfit',
        title: t('home.analyze.vCard.economicProfit'),
        tooltip: t('arOpportunity.cards.economicProfitTooltip'),
        opportunity: metricMoney(economicProfit.value.opportunity),
        expected: metricMoney(economicProfit.value.expected),
        highlighted: true,
      },
    ])

    const salesVolumeTrend = computed<OverviewSummaryTrend | null>(() => {
      const trend = salesAndEntities.value.salesVolumeTrend
      if (!showUndecided || trend == null) return null
      return {
        text: `${trend >= 0 ? '↗' : '↘'} ${Math.abs(trend).toFixed(2)}%`,
        direction: trend >= 0 ? 'up' : 'down',
      }
    })

    return {
      t,
      loading,
      loadError,
      forbidden,
      hasVersion,
      chartSelection,
      period,
      salesAndEntities,
      showUndecided,
      summaryPaymentTerms,
      summaryMetrics,
      salesVolumeTrend,
      money,
      count,
    }
  },
})
</script>

<style scoped>
.metric-card-col :deep(.content-box),
.summary-card-col :deep(.content-box) {
  flex: 1;
}

/* Chart row only: the summary cards lay out their own bodies (grids of panels and tiles). */
.metric-card-col :deep(.content-box__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
}
</style>
