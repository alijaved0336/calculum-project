<template>
<!--  Matched vs Unmatched Chart Full Screen -->
<CalculumFullScreen v-if="matchedUnmatchedChartIsShowingFullScreen" :title="$t('home.overview.overview')"
  @closeFullScreen="matchedUnmatchedChartIsShowingFullScreen = false">
  <template #fullScreenContent>
    <div class="card w-100" :class="matchedUnmatchedChartIsShowingFullScreen
        ? 'bootstrap-card-body-no-hover card-full-width'
        : ''
      ">
      <!-- Loading -->
      <CalculumLoading v-if="isLoading" block />

      <div class="card-body" :class="{ 'bg-blur': isLoading }">
        <div class="d-flex justify-content-between align-items-center mb-2" style="z-index: 97; position: relative">
          <h6 class="mb-1 font-bold text-base">
            {{ $t("home.overview.matchedData") }}
          </h6>

          <p v-if="!matchedUnmatchedChartIsShowingFullScreen" class="btn-extension"
            @click="matchedUnmatchedChartIsShowingFullScreen = true">
            <button class="btn btn-simple btn-icon link link--icon">
              <i class="fa-solid fa-up-right-and-down-left-from-center text-sm"></i>
            </button>
          </p>
        </div>

        <div class="row" style="z-index: 1">
          <div class="col-12 fullScreen">
            <Chart :style="{ height: '900px' }">
              <ChartLegend :position="'bottom'" />
              <ChartSeries>
                <ChartSeriesItem :type="'pie'" :data-items="matchedUnmatchedItemsFormatted" :field="'value'"
                  :category-field="'category'" :labels="{
                    visible: true,
                    content: chartsGetLabelContentFormatted,
                  }" :color-field="'pieSliceColor'" />
              </ChartSeries>
            </Chart>
          </div>
        </div>
      </div>
    </div>
  </template>
</CalculumFullScreen>

<!-- END Matched vs Unmatched Chart Full Screen -->

<!-- Included vs Excluded Chart Full Screen -->
<CalculumFullScreen v-if="includedExcludedChartIsShowingFullScreen" :title="$t('home.overview.overview')"
  @closeFullScreen="includedExcludedChartIsShowingFullScreen = false">
  <template #fullScreenContent>
    <div class="card w-100" :class="includedExcludedChartIsShowingFullScreen
        ? 'bootstrap-card-body-no-hover card-full-width'
        : ''
      ">
      <!-- Loading -->
      <CalculumLoading v-if="isLoading" block />

      <div class="card-body" :class="{ 'bg-blur': isLoading }">
        <div class="d-flex justify-content-between align-items-center mb-2" style="z-index: 97; position: relative">
          <h6 class="mb-1 font-bold text-base">
            {{ $t("home.overview.includedVsExcluded") }}
          </h6>

          <p v-if="!includedExcludedChartIsShowingFullScreen" class="btn-extension"
            @click="includedExcludedChartIsShowingFullScreen = true">
            <button class="btn btn-simple btn-icon link link--icon">
              <i class="fa-solid fa-up-right-and-down-left-from-center text-sm"></i>
            </button>
          </p>
        </div>

        <div class="row" style="z-index: 1">
          <div class="col-12 fullScreen">
            <Chart :style="{ height: '900px' }">
              <ChartSeries>
                <ChartSeriesItem :type="'pie'" :data-items="includedExcludedEntitiesFormatted" :field="'value'"
                  :category-field="'category'" :labels="{
                    visible: true,
                    content: chartsGetLabelContentFormatted,
                  }" :color-field="'pieSliceColor'" />
              </ChartSeries>
              <ChartLegend :position="'bottom'" />
            </Chart>
          </div>
        </div>
      </div>
    </div>
  </template>
</CalculumFullScreen>
<!-- END Included vs Excluded Chart Full Screen -->

<!-- Reason for Exclusion Chart Full Screen -->

<CalculumFullScreen v-if="reasonForExclusionChartIsShowingFullScreen" :title="$t('home.overview.overview')"
  @closeFullScreen="reasonForExclusionChartIsShowingFullScreen = false">
  <template #fullScreenContent>
    <div class="card w-100" :class="reasonForExclusionChartIsShowingFullScreen
        ? 'bootstrap-card-body-no-hover card-full-width'
        : ''
      ">
      <!-- Loading -->
      <CalculumLoading v-if="isLoading" block />

      <div class="card-body" :class="{ 'bg-blur': isLoading }">
        <div class="d-flex justify-content-between align-items-center mb-2" style="z-index: 97; position: relative">
          <h6 class="mb-1 font-bold text-base">
            {{ $t("home.overview.excludedData") }}
          </h6>

          <p v-if="!reasonForExclusionChartIsShowingFullScreen" class="btn-extension"
            @click="reasonForExclusionChartIsShowingFullScreen = true">
            <button class="btn btn-simple btn-icon link link--icon">
              <i class="fa-solid fa-up-right-and-down-left-from-center text-sm"></i>
            </button>
          </p>
        </div>

        <div class="row" style="z-index: 1">
          <div class="col-12 fullScreen">
            <!-- Horizontal Bar Chart -->

            <Chart v-if="!ArrayUtils.isEmpty(reasonForExclusionEntities)" :key="reasonForExclusionEntitiesTracker"
              :style="{
                height: `${reasonForExclusionEntities.length * 50}px`,
              }">
              <ChartCategoryAxis :crosshair="{ visible: false }">
                <ChartCategoryAxisItem :major-grid-lines="{ visible: false }">
                  <ChartCategoryAxisTitle :text="`${$t('global.metricCharts.reasonsFullScreen')} (Top ${reasonForExclusionEntities.length})`" />
                </ChartCategoryAxisItem>
              </ChartCategoryAxis>

              <ChartValueAxis :crosshair="{ visible: false }">
                <ChartValueAxisItem :major-grid-lines="{ visible: false }" :crosshair="{ visible: false }"
                  :font="'600 14px Inter '" :labels="{ visual: getCustomXAxisLabels }">
                </ChartValueAxisItem>
              </ChartValueAxis>
              <ChartSeries>
                <ChartSeriesItem :category-field="'reason'" :color="chartsGetItemColorMatch('excluded')"
                  :data-items="reasonForExclusionEntities" :field="'amount'"
                  :labels="{ visible: true, visual: convertBigNumber }" :labels-align="'center'"
                  :labels-position="'center'" :spacing="0.5" :type="'bar'" :rotation="'auto'" />
              </ChartSeries>
              <ChartLegend :position="'bottom'" :orientation="'horizontal'" />
            </Chart>
          </div>
        </div>
      </div>
    </div>
  </template>
</CalculumFullScreen>

<!-- END Reason for Exclusion Chart Full Screen -->

<div class="row flex-row-reverse">
  <div class="col-4">
    <!-- Metric Selection -->

    <div class="form-group">
      <label for="selected-category">
        <select id="selected-category" v-model="metricSelectionMetricSelected" class="custom-select"
          name="selected-category">
          <option v-for="(metric, index) in metricSelectionMetrics" :key="index" :value="metric.value">
            {{ $t(`match.metric.${metric.value}`) }}
          </option>
        </select>
        <span>{{ $t("global.metric") }}</span>
      </label>
    </div>
    <!-- END Metric Selection -->
  </div>
</div>

<div class="row">
  <!-- Metric Overview -->

  <div class="col-8">
    <div class="card">
      <CalculumLoading v-if="isLoading" block />

      <div class="card-body" :class="{ 'bg-blur': isLoading }">
        <div class="d-flex flex-column">
          <h6 class="mb-1 font-bold text-base">
            <span>{{ $t("home.match.dataReceived") }}</span>

            <CalculumTooltipIcon v-if="!StringUtils.isEmpty($t('home.match.dataReceived'))"
              :info-text="$t('home.match.summaryAllDataReceivedTooltip')" />
          </h6>

          <div class="text-left">
            <span class="mr-2">{{ $t("global.total") }}:</span>
            <span class="font-bold">
              {{ metricOverviewTotalFormatted }}
            </span>
          </div>
        </div>

        <!-- Stacked Horizontal Bar Chart -->
        <template v-if="!ArrayUtils.isEmpty(metricOverviewItemsFormatted)">
          <Tooltip :anchor-element="'target'" :position="'top'">
            <StackedSegmentBar :segments="metricOverviewSegments" @segment-click="handleDataReceivedClick" />
          </Tooltip>
          <!-- END Stacked Horizontal Bar Chart -->

          <!-- Footer -->

          <div class="d-flex justify-content-between align-items-center">
            <!-- Spacer to push the Legend to the center -->
            <div class="flex-grow-1 d-flex justify-content-center">
              <!-- Legend (Centered) -->
              <CustomChartLegend :legend-items="legendItemsArrayForDataReceived" />
              <!-- END Legend -->
            </div>
          </div>
          <!-- END Footer -->
        </template>

        <!-- No Data -->

        <template v-else>
          <div class="d-flex min-h-16 mb-4 pl-2 pb-1 align-items-end bg-gray-200" />
        </template>

        <!-- END No Data -->
      </div>
      <!-- END Card Body -->
    </div>
    <!-- END Card -->
  </div>
  <!-- END Metric Overview -->

  <!-- Data Quality -->
  <div class="col-4 d-flex">
    <div class="card grow">
      <CalculumLoading v-if="isLoading" block />

      <div class="card-body" :class="{ 'bg-blur': isLoading }">
        <div class="align-items-center">
          <span class="mb-1 font-bold text-base mr-1">
            {{ $t("home.match.matchedDataQuality") }}
          </span>
          <CalculumTooltipIcon 
            :info-text="$t('home.match.matchDataQuality')"
            :advanced-tooltip-class="true" :unique-identifier="'popover-match-data-quality'"
            :key-pop-over="'matchedDataQuality'">
          </CalculumTooltipIcon>
        </div>

        <OverviewDataQualityAndRequired :data="dataQuality" />
      </div>
    </div>
  </div>
  <!-- END Data Quality -->
</div>

<div class="row">
  <!-- Matched vs Unmatched Chart -->

  <div class="col-4">
    <div class="card">
      <!-- Loading -->
      <CalculumLoading v-if="isLoading" block />

      <div class="card-body" :class="{ 'bg-blur': isLoading }">
        <div class="d-flex justify-content-between align-items-center mb-2" style="position: relative">
          <div class="d-flex align-items-center">
            <h6 class="mb-1 font-bold text-base">
              {{ $t("home.overview.matchedUnmatchedData") }}
            </h6>
            <CalculumTooltipIcon class="mt-2" :info-text="$t('home.match.matchedUnmatchedDataTooltip')"
              :advanced-tooltip-class="true" :unique-identifier="'popover-match-unmatch-tooltip'"
              :key-pop-over="'matchedVsUnmatched'">
            </CalculumTooltipIcon>
          </div>

          <p v-if="!matchedUnmatchedChartIsShowingFullScreen" class="btn-extension"
            @click="matchedUnmatchedChartIsShowingFullScreen = true">
            <button class="btn btn-simple btn-icon link link--icon">
              <i class="fa-solid fa-up-right-and-down-left-from-center text-sm"></i>
            </button>
          </p>
        </div>

        <!-- Total -->
        <p>
          <span>{{ $t("global.totalAnalyzed") }}: </span>
          <span class="font-bold">
            {{ matchedUnmatchedTotalFormatted }}
          </span>
        </p>

        <PieChart
          :items="matchedUnmatchedPieItems"
          :label-content="chartsGetLabelContentFormatted"
          height="350px"
          @slice-click="handleMatchedUnmatchedClick"
        />
      </div>
    </div>
  </div>
  <!-- END Matched vs Unmatched Chart -->

  <!-- Included vs Excluded Chart -->

  <div class="col-4 d-flex">
    <div class="card grow">
      <CalculumLoading v-if="isLoading" block />

      <div class="card-body" :class="{ 'bg-blur': isLoading }">
        <div class="d-flex justify-content-between align-items-center mb-2" style="position: relative">
          <div class="d-flex align-items-center">
            <h6 class="mb-1 font-bold text-base">
              {{ $t("home.overview.includedExcludedData") }}
            </h6>
          </div>

          <p v-if="!includedExcludedChartIsShowingFullScreen" class="btn-extension"
            @click="includedExcludedChartIsShowingFullScreen = true">
            <button class="btn btn-simple btn-icon link link--icon">
              <i class="fa-solid fa-up-right-and-down-left-from-center text-sm"></i>
            </button>
          </p>
        </div>

        <!-- Total -->
        <p>
          <span>{{ $t("global.totalMatched") }}: </span>
          <span class="font-bold">
            {{ includedExcludedTotalFormatted }}
          </span>
        </p>

        <PieChart
          :items="includedExcludedPieItems"
          :label-content="chartsGetLabelContentFormatted"
          height="350px"
          @slice-click="handleIncludedExcludedClick"
        />
      </div>
    </div>
  </div>
  <!-- END  Included vs Excluded Chart -->

  <!-- Exclusion Reason Chart -->

  <div class="col-4 d-flex">
    <div class="card grow">
      <CalculumLoading v-if="isLoading" block />

      <div class="card-body d-flex flex-column" :class="{ 'bg-blur': isLoading }">
        <div class="d-flex justify-content-between align-items-center mb-2" style="position: relative">
          <h6 class="mb-1 font-bold text-base">
            {{ $t("home.overview.excludedData") }}
          </h6>

          <p v-if="!ArrayUtils.isEmpty(reasonForExclusionEntities) && reasonForExclusionEntitiesFirstFour.length > 1" class="btn-extension"
            @click="reasonForExclusionChartIsShowingFullScreen = true">
            <button class="btn btn-simple btn-icon link link--icon">
              <i class="fa-solid fa-up-right-and-down-left-from-center text-sm"></i>
            </button>
          </p>
        </div>

        <!-- Total -->
        <p v-if="!ArrayUtils.isEmpty(reasonForExclusionEntities)">
          <span>{{ $t("global.total") }}: </span>
          <span class="font-bold">{{ reasonForExclusionTotal }}</span>
        </p>

        <HorizontalBarChart
          v-if="!ArrayUtils.isEmpty(reasonForExclusionEntities)"
          :categories="reasonForExclusionCategories"
          :series="reasonForExclusionSeries"
          :category-axis-title="`${$t('global.metricCharts.reasonsFullScreen')} (Top ${reasonForExclusionEntitiesFirstFour.length})`"
          :category-axis-title-color="colorsGroups.color222222"
          :category-axis-title-font-weight="500"
          :category-axis-title-font-size="14"
          height="350px"
          value-labels-visible
          :value-labels-content="reasonForExclusionValueLabelContent"
          :value-axis-labels-content="reasonForExclusionValueLabelContent"
          :value-axis-label-rotation="45"
          :value-axis-label-color="colorsGroups.color222222"
          :value-axis-label-font-weight="700"
          :legend-visible="false"
          @bar-click="handleExclusionReasonClick"
        />

        <!-- No Data -->
        <div v-else class="d-flex flex-column justify-content-start align-items-center grow">
          <span>{{ $t("global.noDataExcludedFromAnalysis") }}</span>
        </div>
      </div>
    </div>
  </div>
  <!-- END Exclusion Reason Chart -->
</div>
<!-- END Row -->

<!-- Location Chart -->

<div class="row">
  <div class="col">
    <OverviewLocation 
      :resize-key="resizeKey" 
      :data="countriesMap" 
      :metric-selected="metricSelectionMetricSelected"
      :selected-country="selectedLocationCountry ?? undefined"
      @location-clicked="handleLocationClick" 
    />
  </div>
</div>

<!-- END Location Chart -->

<!-- Overview List with Chart Filtering -->
<div class="row mt-3">
  <div class="col">
    <CalculumLoading v-if="isLoading" block />
    <OverviewList
      v-else
      :spend-file-version-active-id="spendFileVersionActiveId"
      :item-selected-in-charts="itemSelectedInCharts"
      @reset-edit="$emit('reset-edit')"
    />
  </div>
</div>
<!-- END Overview List -->
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, ComputedRef, PropType } from "vue";

// Types
import { KeyValue, Match } from "@/types";
import type { Program } from "@/modules/home/analyze/types";

// Kendo
import {
Chart,
ChartCategoryAxis,
ChartCategoryAxisItem,
ChartCategoryAxisTitle,
ChartValueAxisItem,
ChartLegend,
ChartSeries,
ChartSeriesItem,
ChartValueAxis,
} from "@progress/kendo-vue-charts";
import { Text, geometry } from "@progress/kendo-drawing";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import "hammerjs";

import {
ArrayUtils,
isNullOrUndefined,
NumberUtils,
StringUtils,
} from "@/utils";

import { useI18n } from "vue-i18n";
import { useSpendFile } from "@/composables";
import { useOverviewStore } from "@/stores/overview";
import * as FormatData from "@/utils/FormatData";
import { CalculumFullScreen } from "@ada/design-system";
import { CalculumLoading, OverviewDataQualityAndRequired, CustomChartLegend, StackedSegmentBar, PieChart, HorizontalBarChart } from '@ada/design-system'
import type { StackedSegmentBarItem, PieChartItem, PieChartSliceClickPayload, HorizontalBarSeries, HorizontalBarClickPayload } from '@ada/design-system'
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import OverviewLocation from "@/modules/home/overview/components/OverviewLocation.vue";
import OverviewList from "@/modules/home/overview/components/OverviewList.vue";
import * as colorsGroups from "@/utils/ColorsGroups";
import { chartsGetItemColorMatch } from "@/modules/components/utils/utilsCharts";

export default defineComponent({
name: "OverviewCharts",
components: {
  CalculumFullScreen,
  CalculumLoading,
  CalculumTooltipIcon,
  Chart,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartCategoryAxisTitle,
  ChartLegend,
  ChartSeries,
  ChartSeriesItem,
  ChartValueAxis,
  ChartValueAxisItem,
  OverviewDataQualityAndRequired,
  OverviewLocation,
  OverviewList,
  CustomChartLegend,
  StackedSegmentBar,
  PieChart,
  HorizontalBarChart,
  Tooltip,
},
props: {
  onEdit: { type: Boolean, required: false, default: false },
  selectedProgramId: { type: String, required: false, default: "" },
  programData: { type: Object as PropType<Program>, required: false, default: () => ({}) },
  programValues: { type: Object, required: false, default: () => ({ recalculationInProgress: false }) },
},
emits: ["reset-edit", "item-selected"],
setup(props, { emit }) {
  const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

  const overviewStore = useOverviewStore();

  const resizeKey = ref(NumberUtils.getRandomInt());

  interface ReasonKeyPair {
    reason: string;
    amount: number;
  }

  interface ReasonsInterface {
    numberOfSuppliers: Array<ReasonKeyPair>;
    numberOfSpends: Array<ReasonKeyPair>;
    spendVolume: Array<ReasonKeyPair>;
  }

  /**
   * Get the data of the excluded bar chart
   */
  const reasonsDataArray = computed<ReasonsInterface>(() => {
    return (
      data.value?.excludedBarChart || {
        numberOfSuppliers: [],
        numberOfSpends: [],
        spendVolume: [],
      }
    );
  });

  
  window.onresize = () => {
    resizeKey.value = NumberUtils.getRandomInt();
  };

  const isLoading = ref(false);

  const data = ref<Match.MatchAPIResponse | null>(null);

  // *** Metric Selection ***

  const metricSelectionMetrics: {
    name: string;
    value: "numberOfSuppliers" | "numberOfSpends" | "spendVolume";
  }[] = [
      { name: "Number of Suppliers", value: "numberOfSuppliers" },
      { name: "Number of Spend Lines", value: "numberOfSpends" },
      { name: "Spend Volume", value: "spendVolume" },
    ];

  const metricSelectionMetricSelected =
    ref<Match.Metric>("spendVolume");

  // *** END Metric Selection ***

  // *** Metric Overview Stacked Bar Chart ***

  const lineChart: ComputedRef<Match.LineChart | null> = computed(() => {
    // Validate
    if (data.value === null) {
      return null;
    }

    // Number of Suppliers

    const numberOfSuppliers = Object.entries(
      data.value.lineChart.numberOfSuppliers,
    ).map(([key, value]) => {
      // Validate
      if (value === null || typeof value !== "number") {
        return {
          key,
          value: 0,
        };
      }

      return {
        key,
        value,
      };
    });

    // Number of Spends

    const numberOfSpends = Object.entries(
      data.value.lineChart.numberOfSpends,
    ).map(([key, value]) => {
      // Validate
      if (value === null || typeof value !== "number") {
        return {
          key,
          value: 0,
        };
      }

      return {
        key,
        value,
      };
    });

    // Spend Volume

    const spendVolume = Object.entries(data.value.lineChart.spendVolume).map(
      ([key, value]) => {
        // Validate
        if (typeof value !== "number") {
          return {
            key,
            value: 0,
          };
        }

        return {
          key,
          value,
        };
      },
    );

    return {
      numberOfSuppliers,
      numberOfSpends,
      spendVolume,
    };
  });

  const metricOverviewItemsFormatted: ComputedRef<
    KeyValue<string, string>[]
  > = computed(() => {
    // Validate
    if (lineChart.value === null) {
      return [];
    }

    switch (metricSelectionMetricSelected.value) {
      case "numberOfSuppliers":
        if (lineChart.value.numberOfSuppliers === null) {
          return [];
        }

        return lineChart.value.numberOfSuppliers
          .filter((item) => item.value > 0)
          .map((item) => {
            return {
              ...item,
              value: FormatData.getNumberWithDecimals(item.value, 0) ?? null,
            };
          })
          .filter((item) => item.value !== null) as KeyValue<
            string,
            string
          >[];

      case "numberOfSpends":
        if (lineChart.value.numberOfSpends === null) {
          return [];
        }

        return lineChart.value.numberOfSpends
          .filter((item) => item.value > 0)
          .map((item) => {
            return {
              ...item,
              value: FormatData.getNumberWithDecimals(item.value, 0) ?? null,
            };
          })
          .filter((item) => item.value !== null) as KeyValue<
            string,
            string
          >[];

      case "spendVolume":
        if (lineChart.value.spendVolume === null) {
          return [];
        }

        return lineChart.value.spendVolume
          .filter((item) => item.value > 0)
          .map((item) => {
            return {
              key: item.key,
              value: StringUtils.formatBigNumbers(item.value),
            };
          });

      default:
        return [];
    }
  });

  /**
   * Get the total from the number of suppliers included, excluded, and unmatched properties
   *
   * @returns {number}
   */
  const metricOverviewNumberOfSuppliersTotal = computed(() => {
    // Validate
    if (lineChart.value === null) {
      return 0;
    }

    const { numberOfSuppliers } = lineChart.value;

    // Validate
    if (numberOfSuppliers === null) {
      return 0;
    }

    const total = numberOfSuppliers.reduce(
      (total, item) => total + item.value,
      0,
    );

    return total;
  });

  /**
   * Get the total from the spend volume included, excluded, and unmatched properties
   *
   * @returns {number}
   */
  const metricOverviewSpendVolumeTotal = computed(() => {
    // Validate
    if (lineChart.value === null) {
      return 0;
    }

    const { spendVolume } = lineChart.value;

    // Validate
    if (spendVolume === null) {
      return 0;
    }

    // Get the total
    const total = spendVolume.reduce((total, item) => total + item.value, 0);

    // Round to two decimal places
    return NumberUtils.round(total, { precision: 2 });
  });

  /**
   * Get the total from the number of spends included, excluded, and unmatched properties
   *
   * @returns {number}
   */
  const metricOverviewNumberOfSpendsTotal = computed(() => {
    // Validate
    if (lineChart.value === null) {
      return 0;
    }

    const { numberOfSpends } = lineChart.value;

    // Validate
    if (numberOfSpends === null) {
      return 0;
    }

    const total = numberOfSpends.reduce(
      (total, item) => total + item.value,
      0,
    );

    return total;
  });

  /**
   * Get the total from the metric selected
   *
   * @returns {number}
   */
  const metricOverviewTotalFormatted: ComputedRef<string> = computed(() => {
    switch (metricSelectionMetricSelected.value) {
      case "numberOfSuppliers":
        return (
          FormatData.getNumberWithDecimals(
            metricOverviewNumberOfSuppliersTotal.value,
            0,
          ) ?? "-"
        );

      case "numberOfSpends":
        return (
          FormatData.getNumberWithDecimals(
            metricOverviewNumberOfSpendsTotal.value,
            0,
          ) ?? "-"
        );

      case "spendVolume": {
        return StringUtils.formatBigNumbers(metricOverviewSpendVolumeTotal.value);
      }

      // Validate
      default:
        if (import.meta.env.DEV) {
          console.error(
            "** (metricOverviewTotalFormatted) Invalid metric selected. metric:",
            metricSelectionMetricSelected.value,
          );
        }

        return "-";
    }
  });

  /**
   * Get the percentage the with of the included category represents of the total of the categories
   *
   * @param {string} key
   * @returns {number}
   */
  function metricOverviewKeyPercentage(key: string): number {
    // Validate
    if (lineChart.value === null) {
      return 0;
    }

    let percentage = 0;

    const { numberOfSuppliers, numberOfSpends, spendVolume } =
      lineChart.value;

    switch (metricSelectionMetricSelected.value) {
      case "numberOfSuppliers":
        // Validate
        if (numberOfSuppliers === null) {
          break;
        }

        // Search for the key in numberOfSuppliers
        const numberOfSuppliersItem = numberOfSuppliers.find(
          (item) => item.key === key,
        );

        if (numberOfSuppliersItem === undefined) {
          break;
        }

        percentage =
          (numberOfSuppliersItem.value * 100) /
          metricOverviewNumberOfSuppliersTotal.value;

        break;

      case "numberOfSpends":
        // Validate
        if (numberOfSpends === null) {
          break;
        }

        // Search for the key in numberOfSpends
        const numberOfSpendsItem = numberOfSpends.find(
          (item) => item.key === key,
        );

        if (numberOfSpendsItem === undefined) {
          break;
        }

        percentage =
          (numberOfSpendsItem.value * 100) /
          metricOverviewNumberOfSpendsTotal.value;

        break;

      case "spendVolume":
        // Validate
        if (spendVolume === null) {
          break;
        }

        // Search for the key in spendVolume
        const spendVolumeItem = spendVolume.find((item) => item.key === key);

        if (spendVolumeItem === undefined) {
          break;
        }

        percentage =
          (spendVolumeItem.value * 100) /
          metricOverviewSpendVolumeTotal.value;

        break;

      default:
        break;
    }

    // Deal with very small numbers
    if (percentage < 0.001 && percentage > 0) {
      percentage = 1;
    }

    return percentage;
  }

  // *** END Metric Overview Stacked Bar Chart ***

  // *** Matched vs Unmatched Chart ***

  const matchedUnmatchedChartIsShowingFullScreen = ref(false);

  const matchedPieChart: ComputedRef<Match.MatchedPieChart | null> = computed(
    () => {
      // Validate
      if (data.value === null) {
        return null;
      }

      // Number of suppliers

      const numberOfSuppliers: Match.MatchedPieChart["numberOfSuppliers"] =
        Object.entries(data.value.matchedPieChart.numberOfSuppliers)
          .map(([key, value]) => {
            // Validate
            if (typeof value !== "number") {
              return {
                key,
                value: null,
              };
            }

            return {
              key,
              value,
            };
          })
          .filter(
            (item) => item.value !== null,
          ) as Match.MatchedPieChart["numberOfSuppliers"];

      // Number of Spends

      const numberOfSpends: Match.MatchedPieChart["numberOfSpends"] =
        Object.entries(data.value.matchedPieChart.numberOfSpends)
          .map(([key, value]) => {
            // Validate
            if (typeof value !== "number") {
              return {
                key,
                value: null,
              };
            }

            return {
              key,
              value,
            };
          })
          .filter(
            (item) => item.value !== null,
          ) as Match.MatchedPieChart["numberOfSpends"];

      // Spend Volume

      const spendVolume: Match.MatchedPieChart["spendVolume"] =
        Object.entries(data.value.matchedPieChart.spendVolume)
          .map(([key, value]) => {
            // Validate
            if (typeof value !== "number") {
              return {
                key,
                value: null,
              };
            }

            return {
              key,
              value,
            };
          })
          .filter(
            (item) => item.value !== null,
          ) as Match.MatchedPieChart["spendVolume"];

      return {
        numberOfSuppliers,
        numberOfSpends,
        spendVolume,
      };
    },
  );

  const matchedUnmatchedItemsFormatted: ComputedRef<
    {
      category: string;
      value: number;
      pieSliceColor: string;
    }[]
  > = computed(() => {
    // Validate
    if (matchedPieChart.value === null) {
      return [];
    }

    const { numberOfSuppliers, numberOfSpends, spendVolume } =
      matchedPieChart.value;

    switch (metricSelectionMetricSelected.value) {
      case "numberOfSuppliers":
        return numberOfSuppliers.map((item, index) => {
          return {
            category: StringUtils.capitalizeFirstCharacter(item.key),
            value: item.value,
            pieSliceColor: selectedMatchedUnmatchedIndex.value === index 
              ? colorsGroups.supplierStandard 
              : chartsGetItemColorMatch(item.key),
          };
        });

      case "numberOfSpends":
        return numberOfSpends.map((item, index) => {
          return {
            category: StringUtils.capitalizeFirstCharacter(item.key),
            value: item.value,
            pieSliceColor: selectedMatchedUnmatchedIndex.value === index 
              ? colorsGroups.supplierStandard 
              : chartsGetItemColorMatch(item.key),
          };
        });

      case "spendVolume":
        return spendVolume.map((item, index) => {
          return {
            category: StringUtils.capitalizeFirstCharacter(item.key),
            value: item.value,
            pieSliceColor: selectedMatchedUnmatchedIndex.value === index 
              ? colorsGroups.supplierStandard 
              : chartsGetItemColorMatch(item.key),
          };
        });

      default:
        return [];
    }
  });

  /**
   * Matched vs Unmatched items mapped to the design-system PieChart's item shape
   */
  const matchedUnmatchedPieItems: ComputedRef<PieChartItem[]> = computed(() =>
    matchedUnmatchedItemsFormatted.value.map(({ category, value, pieSliceColor }) => ({
      category,
      value,
      color: pieSliceColor,
    })),
  );

  function chartsGetLabelContentFormatted(props: {
    category?: string;
    dataItem: {
      category: string;
      value: number;
    };
    percentage: number;
    series?: any;
    value: number;
  }) {
    let formatedPercentage = StringUtils.formatPercentage(props.percentage);

    // Dealing with very small numbers
    if (props.percentage < 0.001 && props.percentage > 0) {
      formatedPercentage = "< 0.001%";
    }

    let number = props.dataItem.value;

    // Are we dealing with a big numbers?
    if (metricSelectionMetricSelected.value === "spendVolume") {
      return `${StringUtils.formatBigNumbers(
        number,
      )} (${formatedPercentage})`;
    }

    const formatedNumber = FormatData.getNumberWithDecimals(number, 0) ?? "-";

    return `${formatedNumber} (${formatedPercentage})`;
  }

  /**
   * Get the total from the metric selected for the matched vs unmatched chart
   *
   * @returns {ComputedRef<number>}
   */
  const matchedUnmatchedTotalFormatted: ComputedRef<string> = computed(() => {
    // Validate
    if (matchedPieChart.value === null) {
      return "-";
    }

    const { numberOfSuppliers, numberOfSpends, spendVolume } =
      matchedPieChart.value;

    switch (metricSelectionMetricSelected.value) {
      case "numberOfSuppliers":
        return (
          FormatData.getNumberWithDecimals(
            numberOfSuppliers.reduce((total, item) => total + item.value, 0),
            0,
          ) ?? "-"
        );

      case "numberOfSpends":
        return (
          FormatData.getNumberWithDecimals(
            numberOfSpends.reduce((total, item) => total + item.value, 0),
            0,
          ) ?? "-"
        );

      case "spendVolume": {
        const t = spendVolume.reduce((total, item) => total + item.value, 0);

        return StringUtils.formatBigNumbers(t);
      }

      default:
        if (import.meta.env.DEV) {
          console.error(
            "** (matchedUnmatchedTotalFormatted) Invalid metric selected. metric:",
            metricSelectionMetricSelected.value,
          );
        }

        return "-";
    }
  });

  const dataQuality: ComputedRef<Match.DataQuality> = computed(() => {
    // Validate
    if (data.value === null) {
      return {
        confidenceScore: null,
        quality: null,
      };
    }

    return data.value.dataQuality;
  });   

  // *** END Matched vs Unmatched Chart ***

  // *** Included vs Excluded Chart ***

  const includedExcludedChartIsShowingFullScreen = ref(false);

  const includedPieChart: ComputedRef<Match.IncludedPieChart | null> =
    computed(() => {
      if (data.value === null) {
        return null;
      }

      const numberOfSuppliers = Object.entries(
        data.value.includedPieChart.numberOfSuppliers,
      ).map(([key, value]) => {
        // Validate
        if (typeof value !== "number") {
          return {
            key,
            value: 0,
          };
        }

        return {
          key,
          value,
        };
      });

      // Number of Spends

      const numberOfSpends = Object.entries(
        data.value.includedPieChart.numberOfSpends,
      ).map(([key, value]) => {
        // Validate
        if (typeof value !== "number") {
          return {
            key,
            value: 0,
          };
        }

        return {
          key,
          value,
        };
      });

      // Spend Volume

      const spendVolume = Object.entries(
        data.value.includedPieChart.spendVolume,
      ).map(([key, value]) => {
        // Validate
        if (typeof value !== "number") {
          return {
            key,
            value: 0,
          };
        }

        return {
          key,
          value,
        };
      });

      return {
        numberOfSuppliers,
        numberOfSpends,
        spendVolume,
      };
    });

  const includedExcludedEntitiesFormatted: ComputedRef<
    {
      category: string;
      value: number;
      pieSliceColor: string;
    }[]
  > = computed(() => {
    // Validate
    if (includedPieChart.value === null) {
      return [];
    }

    const { numberOfSuppliers, numberOfSpends, spendVolume } =
      includedPieChart.value;

    switch (metricSelectionMetricSelected.value) {
      case "numberOfSuppliers":
        return numberOfSuppliers.map((item, index) => {
          return {
            category: StringUtils.capitalizeFirstCharacter(item.key),
            value: item.value,
            pieSliceColor: selectedIncludedExcludedIndex.value === index 
              ? colorsGroups.supplierStandard 
              : chartsGetItemColorMatch(item.key),
          };
        });

      case "numberOfSpends":
        return numberOfSpends.map((item, index) => {
          return {
            category: StringUtils.capitalizeFirstCharacter(item.key),
            value: item.value,
            pieSliceColor: selectedIncludedExcludedIndex.value === index 
              ? colorsGroups.supplierStandard 
              : chartsGetItemColorMatch(item.key),
          };
        });

      case "spendVolume":
        return spendVolume.map((item, index) => {
          return {
            category: StringUtils.capitalizeFirstCharacter(item.key),
            value: item.value,
            pieSliceColor: selectedIncludedExcludedIndex.value === index 
              ? colorsGroups.supplierStandard 
              : chartsGetItemColorMatch(item.key),
          };
        });

      default:
        return [];
    }
  });

  /**
   * Included vs Excluded items mapped to the design-system PieChart's item shape
   */
  const includedExcludedPieItems: ComputedRef<PieChartItem[]> = computed(() =>
    includedExcludedEntitiesFormatted.value.map(({ category, value, pieSliceColor }) => ({
      category,
      value,
      color: pieSliceColor,
    })),
  );

  /**
   * Get the total from the metric selected for the included vs excluded chart
   *
   * @returns {ComputedRef<string>}
   */
  const includedExcludedTotalFormatted: ComputedRef<string> = computed(() => {
    // Validate
    if (includedPieChart.value === null) {
      return "-";
    }

    const { numberOfSuppliers, numberOfSpends, spendVolume } =
      includedPieChart.value;

    switch (metricSelectionMetricSelected.value) {
      case "numberOfSuppliers":
        return (
          FormatData.getNumberWithDecimals(
            numberOfSuppliers.reduce((total, item) => total + item.value, 0),
            0,
          ) ?? "-"
        );

      case "numberOfSpends":
        return (
          FormatData.getNumberWithDecimals(
            numberOfSpends.reduce((total, item) => total + item.value, 0),
            0,
          ) ?? "-"
        );

      case "spendVolume": {
        const t = spendVolume.reduce((total, item) => total + item.value, 0);

        //use big numbers only for the labels, x and y axis values
        return StringUtils.formatBigNumbers(t);
      }

      // Validate
      default:
        return "-";
    }
  });

  // *** END Included vs Excluded Chart ***

  // *** Reason for Exclusion Chart ***

  const reasonForExclusionChartIsShowingFullScreen = ref(false);

  const reasonForExclusionEntitiesTracker = ref(NumberUtils.getRandomInt());

  // Rotation angle for X-axis labels (in degrees)
  const xAxisLabelsRotationAngle = ref<number | "auto" | undefined>(undefined);

  // Item selected in charts for ChartsLists component
  const itemSelectedInCharts = ref({
    groupName: '',
    optionName: '',
    name: '',
    value: '',
    secondaryName: ''
  });

  // Selected index for Matched vs Unmatched Chart
  const selectedMatchedUnmatchedIndex = ref<number | null>(null);

  // Selected index for Included vs Excluded Chart
  const selectedIncludedExcludedIndex = ref<number | null>(null);

  // Selected index for Exclusion Reason Chart
  const selectedExclusionReasonIndex = ref<number | null>(null);

  // Selected key for Data Received Stacked Bar Chart
  const selectedDataReceivedKey = ref<string | null>(null);

  // Selected country for Location Map
  const selectedLocationCountry = ref<string | null>(null);

  const excludedBarChart = computed(() => {
    if (data.value === null) {
      return [];
    }

    // Validate
    if (
      data.value.excludedBarChart === null ||
      data.value.excludedBarChart === undefined
    ) {
      return [];
    }

    return data.value.excludedBarChart;
  });

  const reasonForExclusionEntities = computed(() => {
    switch (metricSelectionMetricSelected.value) {
      case "numberOfSuppliers":
        return reasonsDataArray.value.numberOfSuppliers ?? [];
      case "numberOfSpends":
        return reasonsDataArray.value.numberOfSpends ?? [];
      case "spendVolume":
        return reasonsDataArray.value.spendVolume ?? [];
      default:
        return [];
    }
  });

  /**
   * Returns the first four items if there are more than four.
   */
  const reasonForExclusionEntitiesFirstFour: ComputedRef<
    {
      reason: string;
      amount: number;
    }[]
  > = computed(() => {
    if (!Array.isArray(reasonForExclusionEntities.value)) {
      return [];
    }

    if (reasonForExclusionEntities.value.length > 4) {
      return reasonForExclusionEntities.value.slice(0, 4);
    }

    return reasonForExclusionEntities.value;
  });

  /**
   * Category labels for the Exclusion Reason HorizontalBarChart
   */
  const reasonForExclusionCategories: ComputedRef<string[]> = computed(() =>
    reasonForExclusionEntitiesFirstFour.value.map((item) => item.reason),
  );

  /**
   * Series for the Exclusion Reason HorizontalBarChart. The selected bar
   * (if any) is colored individually; the rest fall back to the series color.
   */
  const reasonForExclusionSeries: ComputedRef<HorizontalBarSeries[]> = computed(() => [
    {
      data: reasonForExclusionEntitiesFirstFour.value.map((item, index) =>
        selectedExclusionReasonIndex.value === index
          ? { value: item.amount, color: colorsGroups.supplierStandard }
          : item.amount,
      ),
      color: chartsGetItemColorMatch("excluded"),
    },
  ]);

  /**
   * Formats the bar-end value labels and value-axis ticks for the Exclusion
   * Reason HorizontalBarChart as compact big numbers (e.g. "324.5k")
   */
  function reasonForExclusionValueLabelContent(e: { value: unknown }): string {
    const decimals =
      metricSelectionMetricSelected.value === "numberOfSuppliers" ||
      metricSelectionMetricSelected.value === "numberOfSpends"
        ? 0
        : 1;
    return StringUtils.formatBigNumbers(Number(e.value), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  // Refresh the chart when the data changes
  watch(excludedBarChart, () => {
    reasonForExclusionEntitiesTracker.value = NumberUtils.getRandomInt();
  });

  /**
   * Get the total from the metric selected for the matched vs unmatched chart
   *
   * @returns {ComputedRef<string>}
   */
  const reasonForExclusionTotal: ComputedRef<string | number> = computed(
    () => {
      // Check if reasonsDataArray is defined and has the required properties
      if (!reasonsDataArray.value) {
        return "-";
      }

      let totalAmount = 0;

      // Switch statement to handle the different metric selections
      switch (metricSelectionMetricSelected.value) {
        case "numberOfSuppliers":
          totalAmount = reasonsDataArray.value.numberOfSuppliers.reduce(
            (total, item) => {
              const amount = item.amount;
              // Handle cases where `amount` is a string, a number, or invalid
              return (
                total +
                (typeof amount === "string"
                  ? parseFloat(amount)
                  : typeof amount === "number"
                    ? amount
                    : 0)
              );
            },
            0,
          );
          return StringUtils.formatBigNumbers(totalAmount, { maximumFractionDigits: 0, minimumFractionDigits: 0, lang: "en-US" });

        case "numberOfSpends":
          totalAmount = reasonsDataArray.value.numberOfSpends.reduce(
            (total, item) => {
              const amount = item.amount;
              // Handle cases where `amount` is a string, a number, or invalid
              return (
                total +
                (typeof amount === "string"
                  ? parseFloat(amount)
                  : typeof amount === "number"
                    ? amount
                    : 0)
              );
            },
            0,
          );
          return StringUtils.formatBigNumbers(totalAmount, { maximumFractionDigits: 0, minimumFractionDigits: 0, lang: "en-US" });

        case "spendVolume":
          totalAmount = reasonsDataArray.value.spendVolume.reduce(
            (total, item) => {
              const amount = item.amount;
              // Handle cases where `amount` is a string, a number, or invalid
              return (
                total +
                (typeof amount === "string"
                  ? parseFloat(amount)
                  : typeof amount === "number"
                    ? amount
                    : 0)
              );
            },
            0,
          );
          return StringUtils.formatBigNumbers(totalAmount);

        default:
          return "-"; // Return "-" if no valid selection is made
      }

      // Format the total amount
      //return FormatData.getNumberWithDecimals(totalAmount, 0) ?? "-";
    },
  );

  // *** END Reason for Exclusion Chart ***

  // *** Location Map ***

  const countriesMap: ComputedRef<Match.CountriesMap> = computed(() => {
    // Validate
    if (
      isNullOrUndefined(data.value) ||
      isNullOrUndefined(data.value.countriesMap)
    ) {
      return {
        suppliers: [],
        buyers: [],
      };
    }

    return data.value.countriesMap;
  });

  // *** END Location Map ***

  /**
   * Checks if the global filters for API read are valid.
   *
   * @param {Object} params - The parameters for the function.
   *   - {number} currencyRate - The currency rate.
   *   - {Section} section - The section.
   *   - {string} globalFilter - The global filter.
   *   - {string} [programActiveId] - The active program ID.
   */
  async function matchDataAPIReadAll(params: { spendVersion: string }) {
    try {
      // Enable loading
      isLoading.value = true;
      overviewStore.setIsMatchInfoLoading(true);

      const callbackSuccessData = await new Promise<Match.MatchAPIResponse>(
        (resolve, reject) => {
          overviewStore.matchDataAPIReadAll({
            ...params,
            callbackSuccess: resolve,
            callbackError: reject,
          });
        },
      );

      data.value = callbackSuccessData;

      // Disable loading
      isLoading.value = false;
      overviewStore.setIsMatchInfoLoading(false);
    } catch (error) {
      // Disable loading
      isLoading.value = false;
      overviewStore.setIsMatchInfoLoading(false);
    }
  }

  const { spendFileVersionActiveId } = useSpendFile();

  matchDataAPIReadAll({
    spendVersion: spendFileVersionActiveId.value,
  });

  const legendItemsArrayForDataReceived = computed(() => {
    let dataArray = metricOverviewItemsFormatted.value.map((item: any) => {
      const capitalizeFirstLetter = (str: string) =>
        str.charAt(0).toUpperCase() + str.slice(1);
      return {
        text: capitalizeFirstLetter(item.key),
        color: chartsGetItemColorMatch(item.key),
      };
    });
    return dataArray;
  });

  function getChartAxisLabel() {
    return translate.t(
      `global.metricCharts.title.${metricSelectionMetricSelected.value}`,
    );
  }

  /***
   * converts long float number to a string with 1 decimal point, adds
   * k , m , b, t for the amount at the end of the string
   */
  function convertBigNumber(e: any) {
    const decimals = metricSelectionMetricSelected.value === 'numberOfSuppliers' || metricSelectionMetricSelected.value === 'numberOfSpends' ? 0 :  1
    let val = StringUtils.formatBigNumbers(e.value, { minimumFractionDigits: decimals, maximumFractionDigits: decimals } );
    if (e.value) {
      return new Text(
        `${val}`,
        getLabelPointPosition(
          val.length,
          e.rect.origin,
          e.rect.size.width,
          e.rect.size.height,
        ),
        {
          font: "500 14px Inter",
          fill: {
            color: colorsGroups.color222222,
          },
        },
      );
    } else {
      return new Text(
        "0",
        getLabelPointPosition(1, e.rect.origin, e.rect.size.width, e.rect.size.height),
        {
          font: "500 14px Inter",
          fill: {
            color: colorsGroups.color222222,
          },
        },
      );
    }
  }

  /**
   * returns the text position (center location)
   */
  function getLabelPointPosition(
    strSize: number,
    origin: any,
    width: number,
    height: number,
  ) {
    return [
      origin.x + (width / 2 - strSize * 2.7) + 4,
      origin.y + height / 2 - 7,
    ];
  }

  function getLabels(e: any) {
    const centerX = e.rect.origin.x - 20;
    return new Text(
      `${StringUtils.formatBigNumbers(e.value)}`,
      [centerX, e.rect.origin.y - 5],
      {
        font: "600 14px Inter",
        fill: {
          color: colorsGroups.color222222,
        },
      },
    );
  }

  function getLabelPointForXAxis(
    value: number,
    strSize: number,
    origin: any,
    width: number,
  ): [number, number] {
    return [
      origin.x + (width / 2 - strSize * 2.7),
      origin.y + (value >= 0 ? -5 : 5),
    ] as [number, number];
  }

  /**
   * Creates custom labels for the X-axis with rotation support
   * 
   * @param {any} e - The chart event with value and position information
   * @param {number | "auto" | undefined} rotationAngle - Rotation angle in degrees (optional)
   * @returns {Text} Kendo Drawing Text object with the formatted label
   */
  function getCustomXAxisLabels(e: any, rotationAngle?: number | "auto" | undefined) {
    // Use the angle provided as parameter or the reactive variable value
    const angle = 45
    
    let myValue = Number(e.value);
    let val = StringUtils.formatBigNumbers(e.value);
    const centerX = e.rect.origin.x + 5;
    
    let text: Text;
    let textPosition: [number, number];
    
    if (Number(e.value) >= 1000) {
      textPosition = getLabelPointForXAxis(
        e.value,
        val.length,
        e.rect.origin,
        e.rect.size.width,
      ) as [number, number];
      text = new Text(
        `${StringUtils.formatBigNumbers(myValue)}`,
        textPosition,
        {
          font: "600 14px Inter",
          fill: {
            color: colorsGroups.color222222,
          },
        },
      );
    } else {
      textPosition = [centerX, e.rect.origin.y - 5];
      text = new Text(`${e.value}`, textPosition, {
        font: "600 14px Inter",
        fill: {
          color: colorsGroups.color222222,
        },
      });
    }
    text.transform(geometry.transform().rotate(angle, new geometry.Point(textPosition[0], textPosition[1])));

    return text;
  }

  /**
   * Creates a wrapper function for getCustomXAxisLabels with a specific rotation angle
   * Useful when the angle needs to be passed as a parameter from the template
   * 
   * @param {number | "auto" | undefined} rotationAngle - Rotation angle in degrees
   * @returns {Function} Function that accepts event e and calls getCustomXAxisLabels with the angle
   */
  function getCustomXAxisLabelsWithRotation(rotationAngle?: number | "auto" | undefined) {
    return (e: any) => getCustomXAxisLabels(e, rotationAngle);
  }

  /**
   * Helper function to clear all chart selections
   */
  function clearAllChartSelections() {
    selectedMatchedUnmatchedIndex.value = null;
    selectedIncludedExcludedIndex.value = null;
    selectedExclusionReasonIndex.value = null;
    selectedDataReceivedKey.value = null;
    selectedLocationCountry.value = null;
  }

  /**
   * Helper function to clear itemSelectedInCharts
   */
  function clearItemSelection() {
    itemSelectedInCharts.value = {
      groupName: '',
      optionName: '',
      name: '',
      value: '',
      secondaryName: ''
    };
  }

  /**
   * Helper function to update itemSelectedInCharts
   * @param {string} optionName - The option name for the chart type
   * @param {string} name - The name/value of the selected item
   */
  function updateItemSelection(optionName: string, name: string) {
    itemSelectedInCharts.value = {
      groupName: metricSelectionMetricSelected.value,
      optionName: optionName,
      name: name,
      value: name,
      secondaryName: ''
    };
  }

  /**
   * Handles click event on Matched vs Unmatched Chart
   * Toggles selection and updates itemSelectedInCharts for grid filtering
   * Clears other charts selections
   * 
   * @param {PieChartSliceClickPayload} payload - Click payload from PieChart
   */
  function handleMatchedUnmatchedClick(payload: PieChartSliceClickPayload) {
    const clickedIndex = payload.index;

    // Toggle selection
    if (selectedMatchedUnmatchedIndex.value === clickedIndex) {
      selectedMatchedUnmatchedIndex.value = null;
      clearItemSelection();
    } else {
      clearAllChartSelections();
      selectedMatchedUnmatchedIndex.value = clickedIndex;
      updateItemSelection('matchedUnmatched', payload.category);
    }

    // Also emit event for parent components if needed
    const category = selectedMatchedUnmatchedIndex.value !== null ? payload.category : null;
    emit('item-selected', 'matchedUnmatched', 'status', category, 'overview');
  }

  /**
   * Handles click event on Included vs Excluded Chart
   * Toggles selection and updates itemSelectedInCharts for grid filtering
   * Clears other charts selections
   * 
   * @param {PieChartSliceClickPayload} payload - Click payload from PieChart
   */
  function handleIncludedExcludedClick(payload: PieChartSliceClickPayload) {
    const clickedIndex = payload.index;

    // Toggle selection
    if (selectedIncludedExcludedIndex.value === clickedIndex) {
      selectedIncludedExcludedIndex.value = null;
      clearItemSelection();
    } else {
      clearAllChartSelections();
      selectedIncludedExcludedIndex.value = clickedIndex;
      updateItemSelection('includedExcluded', payload.category);
    }

    // Also emit event for parent components if needed
    const category = selectedIncludedExcludedIndex.value !== null ? payload.category : null;
    emit('item-selected', 'includedExcluded', 'status', category, 'overview');
  }

  /**
   * Handles click event on Exclusion Reason Chart
   * Toggles selection and updates itemSelectedInCharts for grid filtering
   * Clears other charts selections
   * 
   * @param {HorizontalBarClickPayload} payload - Click payload from HorizontalBarChart
   */
  function handleExclusionReasonClick(payload: HorizontalBarClickPayload) {
    const clickedIndex = payload.index;

    // Toggle selection
    if (selectedExclusionReasonIndex.value === clickedIndex) {
      selectedExclusionReasonIndex.value = null;
      clearItemSelection();
    } else {
      clearAllChartSelections();
      selectedExclusionReasonIndex.value = clickedIndex;
      updateItemSelection('exclusionReason', payload.category);
    }

    // Also emit event for parent components if needed
    const category = selectedExclusionReasonIndex.value !== null ? payload.category : null;
    emit('item-selected', 'exclusionReason', 'reason', category, 'overview');
  }

  /**
   * Handles click event on Data Received Stacked Bar Chart
   * Toggles selection and updates itemSelectedInCharts for grid filtering
   * Clears other charts selections
   * 
   * @param {string} key - The key of the clicked segment
   */
  function handleDataReceivedClick(key: string) {
    // Toggle selection
    if (selectedDataReceivedKey.value === key) {
      selectedDataReceivedKey.value = null;
      clearItemSelection();
    } else {
      clearAllChartSelections();
      selectedDataReceivedKey.value = key;
      updateItemSelection('dataReceived', key);
    }
    
    // Also emit event for parent components if needed
    emit('item-selected', 'dataReceived', 'status', selectedDataReceivedKey.value, 'overview');
  }

  /**
   * Determines the background color for Data Received segments
   * Selected segment gets a different color
   * 
   * @param {string} key - The key of the segment
   * @returns {string} Color for the segment
   */
  function getDataReceivedSegmentColor(key: string): string {
    if (selectedDataReceivedKey.value === key) {
      return colorsGroups.supplierStandard; // Selected color
    }
    return chartsGetItemColorMatch(key); // Default color
  }

  /**
   * Segments for the Data Received Stacked Bar Chart, with the percentage width
   * and color already resolved for the StackedSegmentBar component
   */
  const metricOverviewSegments: ComputedRef<StackedSegmentBarItem[]> = computed(() =>
    metricOverviewItemsFormatted.value.map(({ key, value }) => ({
      key,
      value,
      percentage: metricOverviewKeyPercentage(key),
      color: getDataReceivedSegmentColor(key),
    })),
  );

  /**
   * Handles click event on Location Map
   * Toggles selection and updates itemSelectedInCharts for grid filtering
   * Clears other charts selections
   * 
   * @param {object} locationData - Data from the clicked location {country, type, amountFormatted}
   */
  function handleLocationClick(locationData: { country: string; type: string; amountFormatted: string }) {
    const { country, type } = locationData;
    
    // Toggle selection
    if (selectedLocationCountry.value === country) {
      selectedLocationCountry.value = null;
      clearItemSelection();
    } else {
      const isSupplier = type === 'supplier' || type === 'suppliers';
      /** This is until buyers will be setted in the API, if buyers is resolved remove the if statement if(isSupplier){...}*/
      if(isSupplier){
      clearAllChartSelections();
      selectedLocationCountry.value = country;
      
      // Determine optionName based on type (supplier or buyer)      
      const optionName = isSupplier ? 'locationSupplier' : 'locationBuyer';
      
      updateItemSelection(optionName, country);
      }
    }
    
    // Also emit event for parent components if needed
    emit('item-selected', 'location', 'country', selectedLocationCountry.value, 'overview');
  }

  /**
   * Watch for changes in metric selection dropdown
   * Clear all chart selections and filters when metric changes
   */
  watch(() => metricSelectionMetricSelected.value, () => {
    clearAllChartSelections();
    clearItemSelection();
  });

  return {
    ArrayUtils,
    chartsGetItemColorMatch,
    chartsGetLabelContentFormatted,
    colorsGroups,
    convertBigNumber,
    countriesMap,
    dataQuality,
    getChartAxisLabel,
    getCustomXAxisLabels,
    getDataReceivedSegmentColor,
    getLabelPointPosition,
    getLabels,
    handleDataReceivedClick,
    handleExclusionReasonClick,
    handleIncludedExcludedClick,
    handleLocationClick,
    handleMatchedUnmatchedClick,
    includedExcludedChartIsShowingFullScreen,
    includedExcludedEntitiesFormatted,
    includedExcludedPieItems,
    includedExcludedTotalFormatted,
    isLoading,
    itemSelectedInCharts,
    legendItemsArrayForDataReceived,
    matchedUnmatchedChartIsShowingFullScreen,
    matchedUnmatchedItemsFormatted,
    matchedUnmatchedPieItems,
    matchedUnmatchedTotalFormatted,
    metricOverviewItemsFormatted,
    metricOverviewKeyPercentage,
    metricOverviewTotalFormatted,
    metricSelectionMetrics,
    metricSelectionMetricSelected,
    reasonForExclusionCategories,
    reasonForExclusionChartIsShowingFullScreen,
    reasonForExclusionEntities,
    reasonForExclusionEntitiesFirstFour,
    reasonForExclusionEntitiesTracker,
    reasonForExclusionSeries,
    reasonForExclusionTotal,
    reasonForExclusionValueLabelContent,
    reasonsDataArray,
    resizeKey,
    selectedDataReceivedKey,
    selectedExclusionReasonIndex,
    selectedIncludedExcludedIndex,
    selectedLocationCountry,
    selectedMatchedUnmatchedIndex,
    spendFileVersionActiveId,
    StringUtils,
    xAxisLabelsRotationAngle,
    getCustomXAxisLabelsWithRotation,
    metricOverviewSegments
  };
},
});
</script>
<style lang="scss" scoped>
// Remove this when all views are updated
.card {
padding: 0;
margin-bottom: 16px;
min-height: 1px;
}

.card-body {
padding: 24px;
}
</style>
