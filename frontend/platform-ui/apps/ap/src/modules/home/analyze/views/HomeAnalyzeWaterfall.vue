<template>
<div class="mt-5 bg-white border-radius-8 p-4 waterfall-chart-wrapper" @mousemove="handleChartMouseMove" @mouseleave="handleChartMouseLeave">
  <WaterfallSkeleton v-if="loadingPotentialCashFlowWaterfallData || loadingPotentialPaymentTemsWaterfallData">     </WaterfallSkeleton>
  <div class="row" v-else>
    <div class="col-12">
      <div class="d-flex flex-column">
        <h5 class="m-0"><span class="mr-1 text-base font-semibold text-gray-700" id="custom-margin-title">{{ $t('global.waterfall.itself') }}</span>
          <CalculumTooltipIcon :advancedTooltipClass="true" :uniqueIdentifier="waterfallPopover.dataClassName" :keyPopOver="waterfallPopover.key"></CalculumTooltipIcon>
        </h5><span class="subheader mb-3">{{ $t('global.selectWaterfallStrategy') }}            </span>
        <div class="row mb-2 mt-2">
          <div class="col-6">
            <div class="d-flex align-items-baseline selected-chart-container cursor-pointer" @click="selectWaterfallChart('potential-payment-terms')" :class="currentSelectedChart === 'potential-payment-terms' ? 'bg-gray-100' : 'bg-white'">
              <iconCheckCircleFill class="check-svg-small mr-3" v-if="currentSelectedChart === 'potential-payment-terms'"></iconCheckCircleFill>
              <div class="unselected-circle-small mr-3 cursor-pointer" v-if="currentSelectedChart !== 'potential-payment-terms'"></div>
              <div class="d-flex flex-column">
                <div class="d-flex align-items-center"><span class="text-base font-semibold text-gray-700 cursor-pointer">{{ $t('global.potentialPaymentTermsBasedOptimizationOnStrategy') }}
                    <CalculumTooltipIcon class="ml-1" v-if="true" :infoText="$t('global.waterfallPaymentTermsTooltip')"></CalculumTooltipIcon></span></div><span class="text-xs font-medium text-gray-500">{{ $t('global.potentialPaymentTermsBasedOptimizationOnStrategyDesc') }}</span>
              </div>
            </div>
          </div>
          <div class="col-6">
            <div class="d-flex align-items-baseline selected-chart-container cursor-pointer" @click="selectWaterfallChart('potential-cash-flow')" :class="currentSelectedChart === 'potential-cash-flow' ? 'bg-gray-100' : 'bg-white'">
              <iconCheckCircleFill class="check-svg-small mr-3" v-if="currentSelectedChart === 'potential-cash-flow'"></iconCheckCircleFill>
              <div class="unselected-circle-small mr-3 cursor-pointer" v-if="currentSelectedChart !== 'potential-cash-flow'"></div>
              <div class="d-flex flex-column">
                <div class="d-flex align-items-center"><span class="text-base font-semibold text-gray-700 cursor-pointer">{{ $t('global.potentialCashFlowBasedOnStrategy') }}</span>
                  <CalculumTooltipIcon class="ml-1" v-if="true" :infoText="$t('global.waterfallCashFlowTooltip')"></CalculumTooltipIcon>
                </div><span class="text-xs font-medium text-gray-500">{{ $t('global.potentialCashFlowBasedOnStrategyDesc') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="row" v-if="currentSelectedChart === 'potential-payment-terms' && !loadingPotentialCashFlowWaterfallData && !loadingPotentialPaymentTemsWaterfallData">
    <div class="waterfall-chart" v-if="currentSelectedChart === 'potential-payment-terms' && waterfallDataPotentialPaymentTerms.length > 0">
      <Chart :style="{ borderRadius: '8px', minHeight: chartHeight }" :transitions="false" @seriesclick="clickOnWaterfallChartStrategy">
        <ChartTooltip :render="'defaultTooltipRender'">
          <template v-slot:defaultTooltipRender="{ props }">
            <div class="d-flex align-items-center flex-column tooltip-content-waterfall home-analyze-waterfall-tooltip-marker" :data-sync="capturePaymentTermsTooltipContent(props)"><span>{{ props.point.value > -0.1 && props.point.value < 0.1 ? kendoChartRelated.compareValue(props.point.value) : formatData.getNumberWithDecimals(props.point.value.toString(), 1) }}</span></div>
          </template>
        </ChartTooltip>
        <ChartLegend :visible="false"></ChartLegend>
        <ChartTitle class="text-base" :text="$t('global.potentialPaymentTermsChartTitle')" align="left" color="#475467" :font="'600 16px Inter'" :margin="4"></ChartTitle>
        <ChartCategoryAxis>
          <ChartCategoryAxisItem :major-grid-lines="{ visible: false }">
            <ChartCategoryAxisTitle class="text-xs" :margin="4" :text="$t('global.strategiesXAxis')" color="#98a2b3" :font="'400 12px Inter'"></ChartCategoryAxisTitle>
            <ChartCategoryAxisLabels :rotation="'auto'" align="center" :margin="10" :font="'600 14px Inter '"></ChartCategoryAxisLabels>
          </ChartCategoryAxisItem>
        </ChartCategoryAxis>
        <ChartValueAxis class="custom-bold-text">
          <ChartValueAxisItem :major-grid-lines="{ visible: false }" :crosshair="{ visible: false }">
            <ChartCategoryAxisTitle class="text-xs" position="center" :text="$t('global.totalPaymentTermsDays')" color="#98a2b3" :font="'400 12px Inter '"></ChartCategoryAxisTitle>
            <ChartValueAxisLabels :format="'0'" :margin="10" :font="'600 14px Inter'"></ChartValueAxisLabels>
          </ChartValueAxisItem>
        </ChartValueAxis>
        <ChartSeries>
          <ChartSeriesItem class="cursor-pointer" :style="{ borderRadius: '25px' }" :type="'waterfall'" :data-items="waterfallDataPotentialPaymentTerms" :color="(e: any) => kendoChartRelated.barItemColor(e)" :field="'amount'" :gap="0.5" :line="{ width: 0.9, color: 'transparent' }" :categoryField="'strategy'" :summaryField="'summary'" :labels="{ visible: true, visual: (e: any) => kendoChartRelated.getDays(e) }" :labels-align="'center'" :labels-position="'center'"></ChartSeriesItem>
        </ChartSeries>
      </Chart>
      <CustomChartLegend :legendItems="waterfallLegendItems"></CustomChartLegend>
    </div>
    <div class="d-flex col-12 align-items-center justify-content-center mt-8" v-if="currentSelectedChart === 'potential-payment-terms' && waterfallDataPotentialPaymentTerms.length === 0">
      <div class="align-items-center justify-content-center"><span class="text-center">{{ $t('global.noDataAvailable') }}</span></div>
    </div>
  </div>
  <div class="row" v-if="currentSelectedChart === 'potential-cash-flow' && !loadingPotentialCashFlowWaterfallData && !loadingPotentialPaymentTemsWaterfallData">
    <div class="waterfall-chart" v-if="currentSelectedChart === 'potential-cash-flow' && waterfallDataPotentialCashFlow.length > 0">
      <Chart @seriesclick="clickOnWaterfallChartStrategy" :style="{ borderRadius: '8px', minHeight: chartHeight }" :transitions="false">
        <ChartLegend :visible="true"></ChartLegend>
        <ChartTitle class="text-base" :text="$t('global.potentialCashFlowChartTitle')" align="left" color="#475467" :font="'600 16px Inter'"></ChartTitle>
        <ChartTooltip :render="'cashflowValue'">
          <template v-slot:cashflowValue="{ props }">
            <div class="d-flex align-items-center flex-column tooltip-content-waterfall home-analyze-waterfall-tooltip-marker" :data-sync="captureCashFlowTooltipContent(props)"><span>{{ props.point.value && (props.point.value > -0.1 && props.point.value < 0.1) ? kendoChartRelated.compareValue(props.point.value) : formatData.getNumberWithDecimals(props.point.value.toString(), 1) }}</span></div>
          </template>
        </ChartTooltip>
        <ChartCategoryAxis>
          <ChartCategoryAxisItem :major-grid-lines="{ visible: false }">
            <ChartCategoryAxisTitle class="text-xxs" :margin="4" :text="$t('global.strategiesXAxis')" color="#98a2b3" :font="'400 12px Inter'"></ChartCategoryAxisTitle>
            <ChartCategoryAxisLabels :rotation="'auto'" :margin="10" :font="'600 14px Inter '"></ChartCategoryAxisLabels>
          </ChartCategoryAxisItem>
        </ChartCategoryAxis>
        <ChartValueAxis class="custom-bold-text">
          <ChartValueAxisItem :major-grid-lines="{ visible: false }" :crosshair="{ visible: false }" :labels="{ content: (e: any) => kendoChartRelated.cashFlowLabels(e), font: '600 14px Inter' }">
            <ChartCategoryAxisTitle class="text-xxs" position="center" :text="$t('global.amount')" color="#98a2b3" :font="'400 12px Inter'"></ChartCategoryAxisTitle>
          </ChartValueAxisItem>
        </ChartValueAxis>
        <ChartSeries>
          <ChartSeriesItem :style="{ borderRadius: '25px' }" :type="'waterfall'" :data-items="waterfallDataPotentialCashFlow" :color="(e: any) => kendoChartRelated.barItemColor(e)" :field="'amount'" :gap="0.5" :line="{ width: 0.9, color: 'transparent' }" :categoryField="'strategy'" :summaryField="'summary'" :labels="{ visible: true, visual: (e: any) => kendoChartRelated.convertBigNumber(e) }" :labels-align="'center'" :labels-position="'center'"></ChartSeriesItem>
        </ChartSeries>
      </Chart>
      <CustomChartLegend :legendItems="waterfallLegendItems"></CustomChartLegend>
    </div>
    <div class="d-flex col-12 align-items-center justify-content-center mt-8" v-if="currentSelectedChart === 'potential-cash-flow' && waterfallDataPotentialCashFlow.length === 0">
      <div class="align-items-center justify-content-center"><span class="text-center">{{ $t('global.noDataAvailable') }}</span></div>
    </div>
  </div>
  <div v-if="valueTooltip.visible" class="value-tooltip" :style="{ top: valueTooltip.y + 'px', left: valueTooltip.x + 'px', background: valueTooltip.color }">{{ valueTooltip.formattedValue }}</div>
</div>
<div class="p-1 mt-8" id="select-waterfall-template" v-if="!loadingPotentialCashFlowWaterfallData && !loadingPotentialPaymentTemsWaterfallData">
  <div class="col-12 d-flex align-items-center justify-content-center" id="nothing-selected-view" v-if="strategyCategorySelected === null">
    <div class="d-flex align-items-center justify-content-center">
      <SelectChart class="mr-4" id="select-strategy-svg"></SelectChart><span id="select-strategy">{{ $t('home.analyze.selectWaterfallStrategy') }}</span>
    </div>
  </div>
  <div class="col-12" id="selected-strategy-view" v-if="!loadingPotentialCashFlowWaterfallData && !loadingPotentialPaymentTemsWaterfallData && strategyCategorySelected !== null">
    <CalculumLoading v-if="loadExport" :modal="true" withDescription="withDescription" :description="exportLoadingMessage"></CalculumLoading>
    <CalculumModal v-if="showLargeExportConfirm" :size="'md'" :title="$t('home.analyze.list.largeExportTitle')" :showClose="true" @close="cancelLargeExport">
      <template v-slot:modalContent>
        <p>{{ $t('home.analyze.list.largeExportWarning', { count: pendingExportCount.toLocaleString() }) }}</p>
      </template>
      <template v-slot:modalButtons>
        <button class="btn outline-secondary-btn font-md" @click="cancelLargeExport" style="z-index: 1; width: fit-content"><span>{{ $t('global.cancel') }}</span></button>
        <button class="btn btn-primary font-md" @click="confirmLargeExport" style="z-index: 1; width: fit-content"><span>{{ $t('global.continue') }}</span></button>
      </template>
    </CalculumModal>
    <div class="row">
      <div class="col-12 d-flex flex-column overflow-auto" :class="{ 'bg-blur': loadingGridData }"><span class="grid-title" v-if="textForChart !== null">{{ textForChart }}</span>
        <CalculumGridGraphql v-if="dataForGridComputed" @dataChange="dataChange" @exportCSV="exportCSV" @pagechange="pageChangeHandler" @resetDefaultColumns="resetDefaultColumns" :allowExportExcel="true" :collectionQuery="'collectionQueryProgramListWaterfallSpends'" :defaultPageSize="filterSettings.paginationSpends.first" :enabledPagination="true" :filter="filterSettings.filterSpends" :filterable="true" :gridColumns="gridColumns" :gridData="dataForGridComputed" :gridHeight="gridHeight" :key="keyRefresh" :levelOfGrid="'spends'" :onlyShowActiveTab="true" :section="'program'" :selectedProgramId="programSelectedId" :selectedTabFromView="levelOfGrid" :showTabsLevels="true" :skip="filterSettings.paginationSpends.after" :sort="filterSettings.sortSpends" :sortable="true" :take="filterSettings.paginationSpends.first" :total="totalNumberOfEntities" :programInrecalculation="false"></CalculumGridGraphql>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onMounted,
  reactive,
  ref,
  toRefs,
  watch,
} from "vue";

// Types
import { Analyze } from "@/types";

/**
 * event.clientX/Y and getBoundingClientRect() report final, post-zoom screen pixels,
 * but assigning that value straight into an inline top/left gets scaled again by the
 * app-wide zoom:0.67 when the browser renders it (CSS lengths are interpreted in the
 * local, pre-render coordinate space of their zoomed ancestor). Multiplying a
 * real-pixel delta by this factor before writing it as a style value cancels that
 * out. Read dynamically instead of hardcoding 1/0.67 so it stays correct if the
 * global zoom value ever changes.
 */
function getZoomCompensation(): number {
  const zoom = Number((getComputedStyle(document.documentElement) as CSSStyleDeclaration & { zoom: string }).zoom)
  return zoom > 0 ? 1 / zoom : 1
}

// Kendo
import {
  Chart,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartCategoryAxisLabels,
  ChartCategoryAxisTitle,
  ChartLegend,
  ChartSeries,
  ChartSeriesItem,
  ChartSeriesItemTooltip,
  ChartSeriesLabels,
  ChartTitle,
  ChartTooltip,
  ChartValueAxis,
  ChartValueAxisItem,
  ChartValueAxisLabels,
  ChartValueAxisTitle,
  ChartXAxisTitle,
} from "@progress/kendo-vue-charts";

import { CustomChartLegend } from "@ada/design-system";

// Utils
import { StringUtils, ArrayUtils } from "@/utils";

import { FilterChangeEvent } from "@/types/filterSettings";
import { nodesEdges } from "../data/nodesEdges";
import { Program } from "../types";
import { saveExcel } from "@progress/kendo-vue-excel-export";
import { SortDescriptor } from "@progress/kendo-data-query/dist/npm/sort-descriptor";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useI18n } from "vue-i18n";
import { useProgram, useUser } from "@/composables";
import { useGlobalFiltersStore } from '@/stores/globalFilters';
import { useHomeStore } from '@/stores/home';
import { waterfallColumnsSpend } from "../data/waterfallGraphQlColumns";
import * as cacheGrid from "@/utils/dataGridClear";
import * as colorsGroups from "@/utils/ColorsGroups";
import * as formatData from "@/utils/FormatData";
import * as graphqlUtils from "@/utils/graphqlUtils";
import * as kendoChartRelated from "@/utils/kendoChartRelated";
import CalculumGridGraphql from "@/modules/components/grid/CalculumGridGraphql.vue";
import { CalculumLoading } from '@ada/design-system'
import CalculumModal from "@/modules/components/CalculumModal.vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import iconCheckCircleFill from "@/resources/assets/images/icons/checkDefault.vue";
import SelectChart from "@/resources/assets/images/icons/SelectChart.vue";
import type { PropType } from "vue";
import useSMEFeature from "@/composables/useSMEFeature";
import useSpendFile from "@/composables/useSpendFile";
import WaterfallSkeleton from "@/modules/home/components/skeletons/WaterfallSkeleton.vue";
import useFeatureCreditRating from "@/composables/useCreditRatingFeature";
import { useAnalyzeStore } from "@/stores/analyze";
import { useAppStore } from "@/stores/app";
import { useUserStore } from '@/stores/user';
import { useGridExport } from "@/modules/home/analyze/composables/useGridExport";

export default defineComponent({
  name: "AnalyzeWaterfall",
  components: {
    CalculumGridGraphql,
    CalculumLoading,
    CalculumModal,
    CalculumTooltipIcon,
    Chart,
    ChartCategoryAxis,
    ChartCategoryAxisItem,
    ChartCategoryAxisLabels,
    ChartCategoryAxisTitle,
    ChartLegend,
    ChartSeries,
    ChartSeriesItem,
    ChartSeriesItemTooltip,
    ChartSeriesLabels,
    ChartTitle,
    ChartTooltip,
    ChartValueAxis,
    ChartValueAxisItem,
    ChartValueAxisLabels,
    ChartValueAxisTitle,
    ChartXAxisTitle,
    iconCheckCircleFill,
    CustomChartLegend,
    SelectChart,
    Tooltip,
    WaterfallSkeleton,
  },
  props: {
    forceReload: { type: Boolean, required: false, default: false },
    inRecalculation: { type: Boolean, required: true, default: false },
    programData: { type: Object as PropType<Program>, required: true },
    selectedProgramId: { type: String, required: true }
  },
  setup(props) {
    const parentContainerHeight = ref("40vh");
    const { useFeatureScfStrategy, isPilotAccount, useFeatureSupplierStandard, useFeaturePeerGroupStandard } = useUser();
    const { smeRelatedColumnsDisplayBasedOnSMEFeature } = useSMEFeature()
    const {
      programSelectedId,
      getFinacingEnabledStatus,
      getHarmonizationEnabledStatus,
    } = useProgram();

    const globalFiltersStore = useGlobalFiltersStore();
    const homeStore = useHomeStore();
    const analyzeStore = useAnalyzeStore();
    const userStore = useUserStore();
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid);
    const payOnTermsIsAllowed = computed(() => userStore.getShowPayOnTerms);
    const { creditRatingColumnsDisplayBasedOnCreditRatingFeature } = useFeatureCreditRating()

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    const {
      loadExport,
      exportLoadingMessage,
      showLargeExportConfirm,
      pendingExportCount,
      startExport,
      confirmLargeExport,
      cancelLargeExport,
    } = useGridExport({
      exportData: (params: any) => homeStore.exportData(params),
      saveExcel,
      t: translate.t,
      onError: error => {
        if (import.meta.env.DEV) console.error("Excel export generation failed", error);
      },
    });

    const {
      spendFileVersionActiveId,
      spendFileVersionActiveNameCustomDataPoints,
      spendFileVersionActiveCustomDataPointsHasData,
    } = useSpendFile();
    
    let setGlobalFilter = graphqlUtils.convertGlobalFilterToGraphQL(
      globalFiltersStore.getFiltersApplied,
    );

    // `loadExport` is now owned by the useGridExport composable, so it is
    // omitted from this component's reactive state.
    const analyzeWaterfall = reactive<Omit<Analyze.AnalyzeWaterfall, "loadExport">>({
      collectionQueryName: "collectionQueryProgramListWaterfallSpends",
      columnsToExport: [],
      currencyRate: useAppStore().getCurrencyAmount,
      currentSelectedChart: "potential-cash-flow",
      customHeaders: [],
      dataForGrid: [],
      defaultCardHeight: "200px",
      gridColumns: getGridColumns(),
      gridHeight: "auto",
      hasFinancing: false,
      hasHarmonization: false,
      isActive: false,
      keyRefresh: new Date().getUTCMilliseconds(),
      levelOfGrid: 0,
      list: [],
      loadingGridData: false,
      loadingPotentialCashFlowWaterfallData: true,
      loadingPotentialPaymentTemsWaterfallData: true,
      pendingRequest: null,
      programInrecalculation: true,
      setDisabled: false,
      showLoading: true,
      strategyCategorySelected: null,
      textForChart: "",
      textSizeForXAxis: "'500 12px Inter'",
      totalNumberOfEntities: 0,
      waterfallDataPotentialCashFlow: [],
      waterfallDataPotentialPaymentTerms: [],
    });

    // Kendo's own chart-tooltip popup is positioned using anchor coordinates that get
    // corrupted under the app-wide zoom:0.67 (see apps/ap/src/resources/assets/styles/layout/_general.scss,
    // .k-chart-tooltip-wrapper:has(.home-analyze-waterfall-tooltip-marker)), so its
    // visual output is hidden via CSS and this component renders its own cursor-tracked
    // tooltip instead. Content still comes from Kendo (capture*TooltipContent); only
    // positioning is ours. Both waterfall charts in this view share one tooltip/marker
    // since only one is ever rendered at a time (mutually exclusive via v-if).
    const valueTooltip = reactive({ visible: false, formattedValue: '', color: colorsGroups.totalWaterfall, x: 0, y: 0 })
    let kendoTooltipEl: Element | null = null

    function getProgram() {
      analyzeWaterfall.isActive = props.programData.isActive;
      analyzeWaterfall.programInrecalculation = props.inRecalculation;
      analyzeWaterfall.hasFinancing =
        props.programData.externalFinancingEnabled;
      analyzeWaterfall.hasHarmonization =
        props.programData.termHarmonizationEnabled;
    }
    // *** WATCHERS ***

    watch(
      () => analyzeWaterfall.hasFinancing,
      () => {
        analyzeWaterfall.gridColumns = getGridColumns();
        analyzeWaterfall.keyRefresh++;
      },
    );
    watch(
      () => analyzeWaterfall.hasHarmonization,
      () => {
        analyzeWaterfall.gridColumns = getGridColumns();
        analyzeWaterfall.keyRefresh++;
      },
    );

    watch(hideAverageDaysPaid, () => {
      analyzeWaterfall.gridColumns = getGridColumns();
      analyzeWaterfall.keyRefresh++;
    });

    watch(payOnTermsIsAllowed, () => {
      analyzeWaterfall.gridColumns = getGridColumns();
      analyzeWaterfall.keyRefresh++;
      getWaterfallData();
    });

    /**
     * watch for strategy category changes
     * call the grid data
     */
    watch(
      () => analyzeWaterfall.strategyCategorySelected,
      (newValue, oldValue) => {
        if (newValue !== oldValue) {
          fetchDataForGrid();
          analyzeWaterfall.keyRefresh++;
        }
      },
    );

    /** have to watch for the grid columns option changes */
    watch(
      () => analyzeWaterfall.gridColumns,
      () => {
        analyzeStore.setHomeAnalyzeWaterfallGridColumnsList(analyzeWaterfall.gridColumns);
        fetchDataForGrid();
      },
      { deep: true },
    );

    watch(
      () => props.inRecalculation,
      () => {
        analyzeWaterfall.programInrecalculation = props.inRecalculation;
      },
      { deep: true },
    );

    let filterSettings: FilterChangeEvent = {
      //- Suppliers Grid Data
      paginationSuppliers: {
        first: 25,
        after: 0,
        skip: 0,
      },
      filterSuppliers: [],
      sortSuppliers: [
        {
          field: isPilotAccount() ? "isPilot" : "entityName",
          dir: isPilotAccount() ? "desc" : "asc",
        },
      ],
      //- Parents Grid Data
      paginationParents: {
        first: 25,
        after: 0,
        skip: 0,
      },
      filterParents: [],
      sortParents: [
        {
          field: isPilotAccount() ? "isPilot" : "entityName",
          dir: isPilotAccount() ? "desc" : "asc",
        },
      ],
      //- Spends
      paginationSpends: {
        first: 25,
        after: 0,
        skip: 0,
      },
      filterSpends: [],
      sortSpends: [
        {
          field: isPilotAccount() ? "isPilot" : "entityName",
          dir: isPilotAccount() ? "desc" : "asc",
        },
      ],
    };

    function exportCSV(collection: any) {
      let filters = undefined;
      let title = "";
      let level = "";
      let columns: Array<any> = [];
      if (collection === analyzeWaterfall.collectionQueryName) {
        filters = filterSettings.filterSpends;
        columns = analyzeWaterfall.gridColumns;
        title = "Waterfall Strategy";
        level = "spends";
      }

      let currencyRate: number = useAppStore().getCurrencyAmount;
      let filtersGrid = {
        targetSpendFileVersionUuid: StringUtils.removeIRI(
          spendFileVersionActiveId.value,
        ),
        fullDisabled: false,
        waterfallSelectedStrategy: analyzeWaterfall.strategyCategorySelected,
        targetProgramUuid: programSelectedId.value,
        telerikFilter: formatData.convertFiltersToREST(filters),
        globalFilter: formatData.convertFiltersToREST(
          globalFiltersStore.getFiltersApplied,
        ),
        currencyRate,
      };

      startExport(
        { level, title, columns, filtersGrid, section: "waterfall" },
        analyzeWaterfall.totalNumberOfEntities,
      );
    }

    async function pageChangeHandler(event: any) {
      if (event.event.value) {
        filterSettings.paginationSpends = {
          first: event.event.value,
          after: 0,
          skip: 0,
        };
      } else {
        filterSettings.paginationSpends = {
          first: event.page.take,
          after: event.page.skip,
          skip: event.page.skip,
        };
      }
      await fetchDataForGrid();
    }

    /**
     * changes the waterfall chart type
     */
    function selectWaterfallChart(chart: string) {
      if (chart === "potential-payment-terms") {
        analyzeWaterfall.currentSelectedChart = "potential-payment-terms";
      }
      if (chart === "potential-cash-flow") {
        analyzeWaterfall.currentSelectedChart = "potential-cash-flow";
      }
    }

    /**
     * Side effect invoked by Kendo's own defaultTooltipRender slot (only fires while
     * Kendo intends to show a tooltip) to capture the hovered point's data for our
     * own custom-positioned tooltip. See valueTooltip declaration above for why.
     */
    function capturePaymentTermsTooltipContent(slotProps: any) {
      const value = slotProps.point.value
      valueTooltip.formattedValue = (value > -0.1 && value < 0.1)
        ? kendoChartRelated.compareValue(value)
        : formatData.getNumberWithDecimals(value.toString(), 1)
      valueTooltip.color = kendoChartRelated.barItemColor(slotProps.point) ?? colorsGroups.totalWaterfall
      return value
    }

    /**
     * Same as capturePaymentTermsTooltipContent but mirrors the extra `value &&` guard
     * the cashflowValue slot originally had (falsy 0 falls through to the formatted
     * branch there, unlike the payment-terms slot).
     */
    function captureCashFlowTooltipContent(slotProps: any) {
      const value = slotProps.point.value
      valueTooltip.formattedValue = (value && (value > -0.1 && value < 0.1))
        ? kendoChartRelated.compareValue(value)
        : formatData.getNumberWithDecimals(value.toString(), 1)
      valueTooltip.color = kendoChartRelated.barItemColor(slotProps.point) ?? colorsGroups.totalWaterfall
      return value
    }

    /**
     * Mirrors Kendo's own show/hide state (read from the DOM instead of trusting its
     * position) and places our custom tooltip next to the cursor.
     */
    function syncValueTooltip(event: MouseEvent) {
      const el = event.currentTarget as HTMLElement

      if (!kendoTooltipEl || !kendoTooltipEl.isConnected) {
        kendoTooltipEl = document.querySelector('.k-chart-tooltip-wrapper:has(.home-analyze-waterfall-tooltip-marker)')
      }

      if (!kendoTooltipEl || !kendoTooltipEl.classList.contains('k-animation-container-shown')) {
        valueTooltip.visible = false
        return
      }

      const containerRect = el.getBoundingClientRect()
      const zoomCompensation = getZoomCompensation()
      valueTooltip.visible = true
      valueTooltip.x = (event.clientX - containerRect.left + 16) * zoomCompensation
      valueTooltip.y = (event.clientY - containerRect.top - 40) * zoomCompensation
    }

    function handleChartMouseMove(event: MouseEvent) {
      syncValueTooltip(event)
    }

    function handleChartMouseLeave() {
      valueTooltip.visible = false
    }


    const dataForGridComputed = computed(() => {
      return analyzeWaterfall.dataForGrid;
    });


    function getGridColumns(): Array<any> {
      const columns: Array<any> = [];
      waterfallColumnsSpend.forEach((config: any) => {
        const congif = Object.assign({}, config);
        columns.push(congif);
      });
      let resetColumns = [];
      const gridCache =
        homeStore.getHomeAnalyzeWaterfallGridColumnsList;

      /**
       * If "gridCache" is not empty and different from default grid columns array
       */
      if (
        gridCache?.length &&
        JSON.stringify(columns) !== JSON.stringify(gridCache)
      ) {
        // Update cached data
        resetColumns = cacheGrid.clearCache(columns, gridCache);
      } else {
        // Use cached data
        resetColumns = columns;
      }

      if (isPilotAccount()) {
        const parentName = resetColumns.findIndex(
          (x: any) => x.field === "parentName",
        );
        if (parentName > -1) {
          resetColumns[parentName].cell = "restrictModalEntitySpend";
        }
      }

      resetColumns = cacheGrid.removescfGroupStandardStrategy(
        resetColumns,
        useFeatureScfStrategy(),
      );
      resetColumns = cacheGrid.removeSupplierStandard2Strategy(
        resetColumns,
        useFeatureSupplierStandard.value,
      );
      resetColumns = cacheGrid.removePeerGroupStandard2Strategy(
        resetColumns,
        useFeaturePeerGroupStandard.value,
      );

      /** SME Related */
      resetColumns = smeRelatedColumnsDisplayBasedOnSMEFeature(resetColumns)

      resetColumns = creditRatingColumnsDisplayBasedOnCreditRatingFeature(resetColumns)

      resetColumns = cacheGrid.removeFinancingRelatedColumns(
        resetColumns,
        props.programData.externalFinancingEnabled
      );



      resetColumns = ArrayUtils.cleanCustomColumns(
        resetColumns,
        spendFileVersionActiveNameCustomDataPoints.value,
        spendFileVersionActiveCustomDataPointsHasData.value,
      );

      resetColumns = cacheGrid.removePlanColumns(resetColumns)
      resetColumns = cacheGrid.removeForecastVolumeColumns(resetColumns)


      if (hideAverageDaysPaid.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'actualPaymentTerms');
      }

      if (!payOnTermsIsAllowed.value) {
        resetColumns = resetColumns.filter((col: any) => col.field !== 'contractualPaymentTermsWithoutCashDiscounts');
      }

      analyzeStore.setHomeAnalyzeWaterfallGridColumnsList(resetColumns);

      return resetColumns;
    }

    // *** Popover ***

    const waterfallPopover = {
      dataClassName: "program-waterfall-overview",
      key: "programWaterfallOverview",
    };

    // *** END Popover ***

    // *** Legend ***

    const waterfallLegendItems = computed(() => {
      const legend: { text: string; color: string }[] = [];

      // Source - Spend File (internal)
      const spendFileTerms = ["parentSupplierMax", "industryRegionStandard"];
      if (payOnTermsIsAllowed.value) spendFileTerms.push("payOnTerms");
      const isSourceSpendFileShowing =
        analyzeWaterfall.waterfallDataPotentialCashFlow.some((i) => {
          return spendFileTerms.some((term) => i.period.includes(term));
        });

      if (isSourceSpendFileShowing) {
        legend.push({
          text: translate.t("global.internalSourceSpendFile"),
          color: colorsGroups.defaultColor,
        });
      }

      // Source - Ada (external)
      const isSourceAdaShowing =
        analyzeWaterfall.waterfallDataPotentialCashFlow.some((i) => {
          return ["supplierStandard", "peerGroupStandard"].some((term) =>
            i.period.includes(term),
          );
        });

      if (isSourceAdaShowing) {
        legend.push({
          text: translate.t("global.externalSourceAda"),
          color: colorsGroups.supplierStandard,
        });
      }

      // Negative impact
      const isNegativeImpactShowing =
        analyzeWaterfall.waterfallDataPotentialCashFlow.some((i) => {
          return i.amount < 0;
        });

      if (isNegativeImpactShowing) {
        legend.push({
          text: translate.t("global.negativeImpact"),
          color: colorsGroups.negativeColorForStrategies,
        });
      }

      if (
        analyzeWaterfall.currentSelectedChart === "potential-cash-flow" ||
        analyzeWaterfall.currentSelectedChart === "potential-payment-terms"
      ) {
        legend.push({
          text: translate.t("global.total"),
          color: colorsGroups.totalWaterfall,
        });
      }

      return legend;
    });

    

    // *** END Legend ***

    // *** END Potential Cash Flow (Cash Flow Opportunity) ***

    // *** Potential Payment Terms ***

    /**
     * Parse the data for the waterfall chart - potentical payment terms
     *
     * @params myData : data from the api
     */

    function parseDataWaterfall(
      myData: any,
      strategyKey: string,
      totalKey: string,
    ): any[] {
      const parsedData: Array<any> = [];

      if (myData && myData.length > 0) {
        myData.forEach(function (config: any, index: number) {
          const newConfig = Object.assign({}, config);

          // Split the strategy text on spaces or slashes
          const strategyText = translate
            .t(`global.waterfall.${config.period}`)
            .split(/[ \/]/);

          // Ensure the string fits in two lines, first word on the first line, rest on the second line
          newConfig.strategy =
            strategyText.length > 1
              ? `${strategyText[0]}\n${strategyText.slice(1).join(" ")}`
              : strategyText[0];

          // Format amount based on strategyKey
          if (strategyKey === "payment-terms") {
            // Whole number for payment terms
            newConfig.amount = Math.round(config.amount ?? 0);
          } else if (strategyKey === "cashflow") {
            // Two decimal places for cashflow
            newConfig.amount = (config.amount ?? 0).toFixed(2);
          }
          newConfig.index = index;

          parsedData.push(newConfig);
        });

        // Handle the "total" row at the end
        parsedData.push({
          period: "",
          strategy: translate
            .t(`global.waterfall.${totalKey}`)
            .split(/ (?=Opportunity|Target\/)/)
            .slice(0, 1)
            .concat([
              translate
                .t(`global.waterfall.${totalKey}`)
                .split(/ (?=Opportunity|Target\/)/)
                .slice(1)
                .join(" "),
            ])
            .join("\n"),
          summary: "total",
        });

        return parsedData; // Return the parsed array
      }

      return []; // Return an empty array if myData is falsy or empty
    }

    /**
     * Get Waterfall DATA
     *
     * @returns {void}
     */
    function getWaterfallData(): void {
      try {
        const spendFileVersion = spendFileVersionActiveId.value;
        const globalFilters = formatData.convertFiltersToREST(
          globalFiltersStore.getFiltersApplied,
        );

        const params = {
          spendFileVersion,
          programUUID: programSelectedId.value,
          globalFilters,
          callbackSuccess: (
            callbackSuccessData: Analyze.WaterfallDataAPIResponse,
          ) => {
            // For Payment Terms
            analyzeWaterfall.waterfallDataPotentialPaymentTerms =
              parseDataWaterfall(
                callbackSuccessData.byTerms,
                "paymentTerms", // The strategy translation key
                "paymentTermsTargetOpportunity", // The total row translation key
              );

            // For Cash Flow
            analyzeWaterfall.waterfallDataPotentialCashFlow =
              parseDataWaterfall(
                callbackSuccessData.byCashFlow,
                "cashFlow", // The strategy translation key
                "cashflowOpportunity", // The total row translation key
              );

            if (!payOnTermsIsAllowed.value) {
              analyzeWaterfall.waterfallDataPotentialPaymentTerms =
                analyzeWaterfall.waterfallDataPotentialPaymentTerms.filter(
                  (item: any) => !item.period?.includes("payOnTerms"),
                );
              analyzeWaterfall.waterfallDataPotentialCashFlow =
                analyzeWaterfall.waterfallDataPotentialCashFlow.filter(
                  (item: any) => !item.period?.includes("payOnTerms"),
                );
            }

            // Disable loading

            analyzeWaterfall.loadingPotentialPaymentTemsWaterfallData = false;

            analyzeWaterfall.loadingPotentialCashFlowWaterfallData = false;
          },
          callbackError: (callbackErrorData: unknown) => {
            if (import.meta.env.DEV)
              console.log("Error in getWaterfallData.", callbackErrorData);

            // Disable loading

            analyzeWaterfall.loadingPotentialPaymentTemsWaterfallData = false;

            analyzeWaterfall.loadingPotentialCashFlowWaterfallData = false;
          },
        };

        analyzeStore.getWaterfallDataForChart(params);
      } catch (error) {
        if (import.meta.env.DEV) console.error(error);
      }
    }

    function convertSortToGraphQL(sort: SortDescriptor[]): string {
      if (sort.length === 0) {
        return 'entityName: "asc"';
      }
      return sort
        .map((descriptor) => `${descriptor.field}: "${descriptor.dir}"`)
        .join(", ");
    }

    function getQueryData(event: FilterChangeEvent): string {
      const getEdges = graphqlUtils.getActiveColumns(
        analyzeWaterfall.gridColumns,
        nodesEdges,
      );
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(
        event.filterSpends,
      );
      const graphqlOrderString = convertSortToGraphQL(event.sortSpends);
      const paginationString = `first: ${event.paginationSpends.first} ${event.paginationSpends.after
          ? `, after: "${btoa((event.paginationSpends.after - 1).toString())}"`
          : ""
        }`;
      const graphqlQuery = `
          {
            spends: ${analyzeWaterfall.collectionQueryName}(
              targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
              targetProgramUuid: "${props.selectedProgramId}",
              ${graphqlFilterString ? graphqlFilterString + "," : ""}
              order: {${graphqlOrderString}},
              currencyRate: ${analyzeWaterfall.currencyRate},
              fullDisabled: ${analyzeWaterfall.setDisabled},
              ${paginationString},
              ${setGlobalFilter ?? ""}
              waterfallSelectedStrategy: "${analyzeWaterfall.strategyCategorySelected
        }"
              ) {
              totalCount              
              edges {
                cursor
                node {
                    ${getEdges}
                }
              }
            }
          }
        `;
      return graphqlQuery;
    }

    async function fetchDataForGrid() {

      if (analyzeWaterfall.strategyCategorySelected === null) return;
      let queryString = getQueryData(filterSettings);
      analyzeWaterfall.loadingGridData = true;
      try {
        const response = await graphqlUtils.getCollectionData(queryString);
        const nodes = response.data.spends.edges.map((edge: any) => edge.node);
        const parsedData: Array<any> = [];
        nodes.forEach(function (data: any) {
          const datas = Object.assign({}, data);
          datas.spendsAmount = data.spendCounts;
          datas.buyerCountry = data.buyerCountry ?? "-";
          datas.buyerRegion = data.buyerRegion ?? "-";

          datas.entityEthnicMinorityOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityEthnicMinorityOwnedBusiness),
          );

          datas.entityWomanOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityWomanOwnedBusiness),
          );

          datas.entityVeteranOwnedBusiness = translate.t(
            formatData.getYesOrNo(data.entityVeteranOwnedBusiness),
          );
          datas.isVCardApplied = translate.t(
            formatData.getYesOrNo(data.isVCardApplied)
          );
          datas.level = "spend";

          const validateESG = [0, 1, 2, 3, 4, 100];
          let value = 0;
          if (validateESG.includes(parseInt(data.entityInvestVerteScore))) {
            value = parseInt(data.entityInvestVerteScore);
          } else {
            value = 404;
          }
          datas.entityInvestVerteScore = translate.t(
            "home.entityCard.rating.esgClassification.c" + value,
          );
          datas.entityRegulatoryTermsStrategyModality =
            data.entityRegulatoryTermsStrategyModality
              ? formatData.getStrategyModalityValue(
                data.entityRegulatoryTermsStrategyModality,
              )
              : "-";
          datas.isActive = !!data.activeProgram;
          datas.activeProgram = data.activeProgram
            ? data.activeProgram
            : translate.t("tableStatus.notAssigned");

          if (data.activeProgram && data.activeProgram !== null) {
            const programs = data.activeProgram.split(",");
            if (programs.length > 1) {
              datas.activeProgram = translate.t("tableStatus.multiple");
            }
          } else {
            datas.activeProgram = translate.t("tableStatus.notAssigned");
          }

          if (data.financings) {
            const splitFinancing = data.financings.split("|");
            if (splitFinancing.length > 1) {
              datas.financings = translate.t("tableStatus.multiple");
              datas.financingColors = "rgba(44,54,69,.1)";
            }
          }

          if (data.harmonizations) {
            const splitHarmonizations = data.harmonizations.split("|");
            if (splitHarmonizations.length > 1) {
              datas.harmonizations = translate.t("tableStatus.multiple");
              datas.harmColors = "rgba(44,54,69,.1)";
            }
          }

          parsedData.push(datas);
        });
        analyzeWaterfall.dataForGrid = parsedData;
        analyzeWaterfall.totalNumberOfEntities =
          response.data.spends.totalCount;

        analyzeWaterfall.loadingGridData = false;
      } catch (error) {
        //
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);

        analyzeWaterfall.loadingGridData = false;
      }
    }

    async function dataChange(filter: any, sort: any) {
      filterSettings.paginationSpends = {
        first: filterSettings.paginationSpends.first,
        after: 0,
        skip: 0,
      };
      filterSettings.filterSpends = filter;
      filterSettings.sortSpends = sort;
      clearTimeout(analyzeWaterfall.pendingRequest);
      await fetchDataForGrid();
    }

    /**
     * resets the grid columns
     */
    function resetDefaultColumns() {
      analyzeStore.setHomeAnalyzeWaterfallGridColumnsList([]);
      analyzeWaterfall.gridColumns = getGridColumns()
    }

    /**
     * returns the height of the card based on the number of rows
     */
    const cardHeightComputed = computed(() => {
      if (analyzeWaterfall.dataForGrid.length === 0) {
        return analyzeWaterfall.defaultCardHeight;
      }

      if (analyzeWaterfall.dataForGrid.length <= 10) {
        return analyzeWaterfall.dataForGrid.length * 100 + "px";
      } else {
        return analyzeWaterfall.dataForGrid.length * 87 + "px";
      }
    });

    /**
     * gets the selected strategy and calls the api for the grid
     */
    function clickOnWaterfallChartStrategy(strategyObj: any) {

      let index = strategyObj.point.categoryIx;
      let strategyName = "";
      let periodOrSummary = "";

      const dataKey =
        analyzeWaterfall.currentSelectedChart === "potential-payment-terms"
          ? "waterfallDataPotentialPaymentTerms"
          : "waterfallDataPotentialCashFlow";
      const dataArray = analyzeWaterfall[dataKey];

      const lastItemIndex = dataArray.length - 1;

      if (index === lastItemIndex) {
        // Last index, use 'total'
        strategyName = "total";
        analyzeWaterfall.strategyCategorySelected = strategyName;
        analyzeWaterfall.textForChart =
          analyzeWaterfall.currentSelectedChart === "potential-payment-terms"
            ? translate.t("global.waterfall.paymentTermsTargetOpportunity")
            : translate.t("global.waterfall.cashflowOpportunity");
      } else {
        // Not the last index, use 'period'
        periodOrSummary = dataArray[index]?.period;
        strategyName = periodOrSummary || "total";
        analyzeWaterfall.strategyCategorySelected = strategyName;
        analyzeWaterfall.textForChart = translate.t(
          `global.waterfall.${strategyName}`,
        );
      }
      fetchDataForGrid();
    }

    /**
     * On Mounted
     */

    function getInitProgramAPI() {
      analyzeWaterfall.loadingPotentialCashFlowWaterfallData = true;
      analyzeWaterfall.loadingPotentialPaymentTemsWaterfallData = true;
      analyzeWaterfall.programInrecalculation = true;
      analyzeWaterfall.hasFinancing = getFinacingEnabledStatus.value;
      analyzeWaterfall.hasHarmonization = getHarmonizationEnabledStatus.value;
      getProgram();
      getWaterfallData();
    }

    setTimeout(() => {
      analyzeWaterfall.showLoading = false;
    }, 1000);

    onMounted(async () => {
      getInitProgramAPI();

      /**
       * by default, api call the total for the waterfall chart
       */


      analyzeWaterfall.strategyCategorySelected = "total";
      analyzeWaterfall.textForChart =
        analyzeWaterfall.currentSelectedChart === "potential-payment-terms"
          ? translate.t("global.waterfall.paymentTermsTargetOpportunity")
          : translate.t("global.waterfall.cashflowOpportunity");
      // await fetchDataForGrid();
    });

    // Use a computed property to dynamically set the chart height
    const chartHeight = computed(() => parentContainerHeight.value);

    return {
      ...toRefs(analyzeWaterfall),
      captureCashFlowTooltipContent,
      capturePaymentTermsTooltipContent,
      cardHeightComputed,
      chartHeight,
      clickOnWaterfallChartStrategy,
      dataChange,
      dataForGridComputed,
      exportCSV,
      loadExport,
      exportLoadingMessage,
      showLargeExportConfirm,
      pendingExportCount,
      confirmLargeExport,
      cancelLargeExport,
      filterSettings,
      formatData,
      getProgram,
      handleChartMouseLeave,
      handleChartMouseMove,
      kendoChartRelated,
      pageChangeHandler,
      programSelectedId,
      resetDefaultColumns,
      selectWaterfallChart,
      spendFileVersionActiveId,
      valueTooltip,
      waterfallLegendItems,
      waterfallPopover,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/utils/_borders.scss";

#custom-position-icon {
  left: 27px;
  top: 15px;
  position: relative;
}

.waterfall-chart-wrapper {
  position: relative;
}

.value-tooltip {
  position: absolute;
  color: #fff;
  padding: 1em;
  border-radius: 8px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
}

.custom-fit-btn {
  min-width: 100px !important;
}

.all-programs-btn {
  min-width: 170px !important;
}

.header-title {
  font-family: "Inter var", sans-serif;
}

.m-b2 {
  margin-bottom: 2rem;
}

/* end of new header in program */

.custom-bold-text {
  font-weight: 800;
}

#custom-margin-title {
  margin-bottom: 1.5rem;
}



span.tooltip-position {
  position: relative;
  left: 40px;
}

.waterfall-chart {
  width: 100%;
}

.tooltip-content-waterfall {
  padding: 1em;
  border-radius: 8px;
  width: 100% !important;
  background-color: none !important;
}

#select-strategy {
  color: $color-gray-500;
  font-weight: 400;
  font-size: 1rem;
}

#select-strategy-svg {
  width: 6rem;
  height: 6.8125rem;
}

#select-waterfall-template {
  border-radius: 8px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.grid-title {
  color: $color-gray-600;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 1.5rem;
  margin-top: 1.5rem;
}

.subheader {
  color: $color-gray-400;
  font-size: 0.875rem;
  font-style: normal;
  font-weight: 400;
  line-height: 1.25rem;
}
</style>
