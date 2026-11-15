<template>
<div class="chart-wrapper" @mousemove="handleChartMouseMove" @mouseleave="handleChartMouseLeave">
  <KendoChart
    v-if="!isLoading"
    :key="chartKey"
    :style="{ height: chartHeight + 'px', width: widthChart }"
    @seriesclick="handleBarClick($event)"
  >
    <KendoChartTooltip
      :offset="20"
      :position="'top'"
      :render="'defaultTooltipRender'"
    >
      <template #defaultTooltipRender="{ props }">
        <div class="d-flex align-items-center flex-column tooltip-content vertical-bar-chart-tooltip-marker" :data-sync="captureTooltipContent(props)">
          <h6 class="font-weight-bold text-center tooltip-category-title">
            {{ props.point.category }}
          </h6>
          <span
            v-if="isBigNumberConversionNeeded"
            class="text-center"
          >
            {{
              chartTypeSelected !== ""
                ? getChartName(chartTypeSelected) + " "
                : ""
            }}
            {{ getNumberWithDecimals(props.point.value, maximumFractionDigits) }}
          </span>
          <span
            v-else
            class="text-center"
          >
            {{
              chartTypeSelected !== ""
                ? getChartName(chartTypeSelected) + " "
                : ""
            }}
            {{ props.point.value }}
          </span>
        </div>
      </template>
    </KendoChartTooltip>
    <KendoChartTitle
      :text="chartTitle"
      :align="'left'"
      :color="'#475467'"
      :font="'600 16px Inter'"
    />
    <KendoChartCategoryAxis>
      <!-- x axis labels -->
      <KendoChartCategoryAxisItem
        :categories="categoriesData"
        :major-grid-lines="{ visible: false }"
        :labels="{
          rotation: categoryAxisItemLabelsGetCustomRotation(),
          font: '600 14px Inter',
        }"
      >
        <KendoChartCategoryAxisTitle
          :text="yAxisTitle"
          :color="'#98a2b3'"
          :font="'400 12px Inter'"
        />
      </KendoChartCategoryAxisItem>
    </KendoChartCategoryAxis>
    <KendoChartValueAxis>
      <!-- x axis title -->
      <KendoChartValueAxisItem
        :min="0"
        :max="calculatedMax"
        :major-unit="calculatedMajorUnit"
        :major-grid-lines="{ visible: false }"
        :crosshair="{ visible: false }"
        :font="'600 18px Inter'"
      >
        <KendoChartCategoryAxisTitle
          :text="xAxisTitle"
          :color="'#98a2b3'"
          :font="'400 12px Inter'"
        />
        <KendoChartCategoryAxisLabels
          :rotation="'auto'"
          :align="'center'"
          :margin="20"
          :font="'600 14px Inter'"
          :content="formatLabel"
        />
      </KendoChartValueAxisItem>
    </KendoChartValueAxis>
    <KendoChartSeries>
      <!-- x axis series data for the horizontal bars -->
      <KendoChartSeriesItem
        :type="'column'"
        :data-items="dataFirstSeries"
        :color="barItemColor"
        :gap="0.2"
        :spacing="0.1"
        :labels="{ visible: true, visual: getBarCustomValue }"
      ></KendoChartSeriesItem>
    </KendoChartSeries>
  </KendoChart>

  <!--
    Loading Skeleton
  -->
  <div
    v-else
    class="row"
  >
    <div class="col-12">
      <h5 class="text-base font-semibold mb-4">{{ chartTitle }}</h5>
    </div>

    <div
      class="col-12 d-flex justify-content-center align-items-end gap-8 border-solid border-t-0 border-r-0 border-b border-l border-gray-200"
    >
      <KendoSkeleton
        class="skeletons-bg"
        shape="rectangle"
        :style="{ width: '15%', height: `${0.6 * chartHeight}px` }"
      />

      <KendoSkeleton
        class="skeletons-bg"
        shape="rectangle"
        :style="{ width: '15%', height: `${0.7 * chartHeight}px` }"
      />

      <KendoSkeleton
        class="skeletons-bg"
        shape="rectangle"
        :style="{ width: '15%', height: `${0.3 * chartHeight}px` }"
      />

      <KendoSkeleton
        class="skeletons-bg"
        shape="rectangle"
        :style="{ width: '15%', height: `${0.8 * chartHeight}px` }"
      />
    </div>
  </div>
  <div v-if="valueTooltip.visible" class="value-tooltip d-flex align-items-center flex-column" :style="{ top: valueTooltip.y + 'px', left: valueTooltip.x + 'px', background: valueTooltip.color }">
    <h6 class="font-weight-bold text-center tooltip-category-title">{{ valueTooltip.category }}</h6><span class="text-center">{{ valueTooltip.formattedValue }}</span>
  </div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, toRefs, watch, PropType } from "vue";

// Kendo
import {
  Chart,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartCategoryAxisLabels,
  ChartCategoryAxisTitle,
  ChartSeries,
  ChartSeriesItem,
  ChartTitle,
  ChartTooltip,
  ChartValueAxis,
  ChartValueAxisItem,
} from "@progress/kendo-vue-charts";
import { Skeleton } from "@progress/kendo-vue-indicators";
import { Text } from "@progress/kendo-drawing";
import { getNumberWithDecimals } from "@/utils/FormatData";

import {
  StringUtils,
  NUMBER_OF_ACCEPTANCE_TYPES,
  ArrayUtils,
  ColorsUtils,
  isNullOrUndefined,
} from "@/utils";

import { useCompany } from "@/composables";
import { useI18n } from "vue-i18n";
import * as colorsGroups from "@/utils/ColorsGroups";
import { isNumber } from "lodash";

const COMPARE_METRICS = new Set([
  "1st Quartile",
  "3rd Quartile",
  "Average",
  "Country Average",
  "Industry Average",
  "Max",
  "Median",
  "Min",
  "Region Average",
]);

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

function getSectionBaseColor(section: string) {
  if (section === "vCardPrimary" || section === "vCardSecondary") {
    return colorsGroups.chartFirstGroup;
  }

  if (section === "paymentTermsDaysinStrategies") {
    return colorsGroups.supplierStandard;
  }

  return null;
}

function getRoleBasedColor(category: string) {
  const lower = category.toLowerCase();

  if (lower === "buyer" || lower.endsWith("buyer") || lower === "current") {
    return ColorsUtils.blue["500"];
  }

  if (lower === "supplier" || lower.endsWith("supplier") || lower === "supplier actual") {
    return ColorsUtils.indigo["500"];
  }

  if (lower === "contractual") {
    return ColorsUtils.graycool["600"];
  }

  if (lower === "new terms") {
    return ColorsUtils.cyan["500"];
  }

  return null;
}

interface Data {
    isBigNumber: boolean;
    chartType: string;
    dataFirstSeries: number[];
    categoriesData: string[];
    section: string;
    customHeightChart: number;
    categoryAxisItemLabelsCustomRotation: string | number;
    labelsTextMaxLength: number;
}

export default defineComponent({
  name: "VerticalBarChart",
  components: {
    KendoChart: Chart,
    KendoChartCategoryAxis: ChartCategoryAxis,
    KendoChartCategoryAxisItem: ChartCategoryAxisItem,
    KendoChartCategoryAxisLabels: ChartCategoryAxisLabels,
    KendoChartCategoryAxisTitle: ChartCategoryAxisTitle,
    KendoChartSeries: ChartSeries,
    KendoChartSeriesItem: ChartSeriesItem,
    KendoChartTitle: ChartTitle,
    KendoChartTooltip: ChartTooltip,
    KendoChartValueAxis: ChartValueAxis,
    KendoChartValueAxisItem: ChartValueAxisItem,
    KendoSkeleton: Skeleton,
  },
  props: {
    isBigNumber: { type: Boolean, default: false },
    chartType: { type: String, required: true },
    dataFirstSeries: { type: Array as PropType<number[]>, required: true },
    categoriesData: { type: Array as PropType<string[]>, required: true },
    section: { type: String, default: '' },
    customHeightChart: { type: Number, default: 0 },
    categoryAxisItemLabelsCustomRotation: { type: [String, Number], default: 'auto' },
    labelsTextMaxLength: { type: Number, default: -1 },
    chartTitle: { type: String, default: "" },
    xAxisTitle: { type: String, default: "" },
    yAxisTitle: { type: String, default: "" },
    isLoading: { type: Boolean, default: false },
    widthChart: { type: String, default: '100%' },
    maximumFractionDigits: { type: Number, default: 1 },
    minimumFractionDigits: { type: Number, default: 1 },
    buyerLeverageDistribution: { type: String, required: false, default: null },
  },
  emits: ["showDetails", "on-event-click"],
  setup(props, { emit }) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    const { companyActiveName } = useCompany();

    let chartKey = computed(() => {
      return `chart-${horizontalBarChart.selectedBarIndex}`
    })

    // Kendo's own chart-tooltip popup is positioned using anchor coordinates that get
    // corrupted under the app-wide zoom:0.67 (see apps/ap/src/resources/assets/styles/layout/_general.scss,
    // .k-chart-tooltip-wrapper:has(.vertical-bar-chart-tooltip-marker)), so its visual
    // output is hidden via CSS and this component renders its own cursor-tracked tooltip
    // instead. Content still comes from Kendo (captureTooltipContent); only positioning is ours.
    const valueTooltip = reactive({ visible: false, category: '', formattedValue: '', color: colorsGroups.chartSecondGroup, x: 0, y: 0 })
    let kendoTooltipEl: Element | null = null

    interface HorizontalBarChart {
      categoriesSeriesData: Array<any>;
      entireDataCategoriesSet: Array<any>;
      entireDataSet: Array<any>;
      firstSeriesData: Array<any>;
      toggleShowMore: boolean;
      multiplierValue: number;
      chartHeight: number;
      selectedBarIndex: number | null,
    }

    let isBigNumberConversionNeeded = computed(() => {
      return props.isBigNumber;
    });

    let chartTypeSelected = computed(() => {
      return props.chartType;
    });

    const horizontalBarChart = reactive<HorizontalBarChart>({
      categoriesSeriesData: props.dataFirstSeries,
      entireDataCategoriesSet: props.categoriesData,
      entireDataSet: props.dataFirstSeries,
      firstSeriesData: [],
      toggleShowMore: true,
      multiplierValue: 40,
      chartHeight: setOnmountedChartHeight(),
      selectedBarIndex: null,
    });

    function setOnmountedChartHeight() {
      if (
        props.section === "vCardPrimary" ||
        props.section === "vCardSecondary"
      ) {
        return 70 * NUMBER_OF_ACCEPTANCE_TYPES;
      }

      else if (
        props.section === "leverageDistributionChartSection" || props.section === "paymentTermsDaysinStrategies"
      ) {
        return 200;
      }

      else {
        return 500;
      }
    }

    watch(
      () => props.customHeightChart,
      () => {
        horizontalBarChart.chartHeight = props.customHeightChart;
      },
      { deep: true },
    );


    function mappingLeverageLevels() {
      if (isNullOrUndefined(props.buyerLeverageDistribution)) {
        return '';
      }

      const leverageMap: Record<string, string> = {
        'low': 'Low Leverage',
        'medium': 'Medium Leverage',
        'high': 'High Leverage',
      };

      return leverageMap[props.buyerLeverageDistribution.toLowerCase()] || '';
    }

    function getLeverageDistributionColor(category: any) {
      if (props.section !== "leverageDistributionChartSection") {
        return null;
      }

      const level = mappingLeverageLevels();
      if (!isNullOrUndefined(props.buyerLeverageDistribution) && level === category) {
        return colorsGroups.supplierStandard;
      }

      return null;
    }

    function getCompareMetricsColor(category: any) {
      if (category && category === companyActiveName.value) {
        return colorsGroups.currentCompany;
      }

      if (category && COMPARE_METRICS.has(category)) {
        return colorsGroups.chartFirstGroup;
      }

      return null;
    }

    /**
     * Returns the color for a given bar item based on its category.
     *
     * @param {any} point - The bar item for which to determine the color.
     * @return {string} The color for the bar item.
     */
    function barItemColor(point: any) {
      if (horizontalBarChart.selectedBarIndex === point.index) {
        return colorsGroups.supplierStandard;
      }

      const sectionColor = getSectionBaseColor(props.section);
      if (sectionColor) {
        return sectionColor;
      }

      const category = point.category;

      const leverageColor = getLeverageDistributionColor(category);
      if (leverageColor) {
        return leverageColor;
      }

      const metricsColor = getCompareMetricsColor(category);
      if (metricsColor) {
        return metricsColor;
      }

      const roleColor = category ? getRoleBasedColor(category) : null;
      if (roleColor) {
        return roleColor;
      }

      return colorsGroups.chartSecondGroup;
    }

    /**
     * Side effect invoked by Kendo's own defaultTooltipRender slot (only fires while
     * Kendo intends to show a tooltip) to capture the hovered point's data for our
     * own custom-positioned tooltip. See valueTooltip declaration above for why.
     */
    function captureTooltipContent(slotProps: any) {
      const prefix = chartTypeSelected.value !== "" ? getChartName(chartTypeSelected.value) + " " : ""
      const value = isBigNumberConversionNeeded.value
        ? formatData.getNumberWithDecimals(slotProps.point.value, props.maximumFractionDigits)
        : slotProps.point.value

      valueTooltip.category = slotProps.point.category
      valueTooltip.formattedValue = `${prefix}${value}`
      valueTooltip.color = barItemColor({ index: slotProps.point.categoryIndex, category: slotProps.point.category })
      return slotProps.point.category
    }

    /**
     * Mirrors Kendo's own show/hide state (read from the DOM instead of trusting its
     * position) and places our custom tooltip next to the cursor.
     */
    function syncValueTooltip(event: MouseEvent) {
      const el = event.currentTarget as HTMLElement

      if (!kendoTooltipEl || !kendoTooltipEl.isConnected) {
        kendoTooltipEl = document.querySelector('.k-chart-tooltip-wrapper:has(.vertical-bar-chart-tooltip-marker)')
      }

      if (!kendoTooltipEl || !kendoTooltipEl.classList.contains('k-animation-container-shown')) {
        valueTooltip.visible = false
        return
      }

      const containerRect = el.getBoundingClientRect()
      const zoomCompensation = getZoomCompensation()
      valueTooltip.visible = true
      valueTooltip.x = (event.clientX - containerRect.left + 16) * zoomCompensation
      valueTooltip.y = (event.clientY - containerRect.top - 70) * zoomCompensation
    }

    function handleChartMouseMove(event: MouseEvent) {
      syncValueTooltip(event)
    }

    function handleChartMouseLeave() {
      valueTooltip.visible = false
    }

    function handleBarClick(event: any) {
      const clickedIndex = event.point.categoryIx
      if (horizontalBarChart.selectedBarIndex === clickedIndex) {
        horizontalBarChart.selectedBarIndex = null
      } else {
        horizontalBarChart.selectedBarIndex = clickedIndex
      }
      emit('on-event-click', !StringUtils.isNullUndefinedOrEmpty(horizontalBarChart.selectedBarIndex) ? event.category : null)
    }

    function getChartName(chart: string) {
      if (chart === "cashFlow") {
        return translate.t("global.cashFlow");
      } else {
        return "";
      }
    }

    const truncateText = (text: any, length: any) => {
      if (text.length > length) {
        return text.substring(0, length) + "...";
      }
      return text;
    };

    /**
     * Custom x axis labels
     *
     * @param {any} e
     * @returns {any}
     */
    function categoryAxisItemLabelsCustomVisual(e: any): Text | undefined {
      // Dont override if custom rotation is set
      if (!isNullOrUndefined(props.categoryAxisItemLabelsCustomRotation)) {
        return;
      }

      const series = props.dataFirstSeries.filter(
        (item) => typeof item === "number",
      );

      if (ArrayUtils.isEmpty(series)) {
        horizontalBarChart.chartHeight = 500;

        return;
      }

      const maxTextLength =
        props.labelsTextMaxLength === -1 ? 18 : props.labelsTextMaxLength;

      const text = truncateText(e.value, maxTextLength);

      const fontSize = 12.5;

      const charWidth = fontSize * 0.6;

      const textWidth = Math.min(text.length, maxTextLength) * charWidth;

      let centerX = e.rect.origin.x + (e.rect.size.width - textWidth) / 2;

      let centerY = e.rect.origin.y;

      const textElement = new Text(text, [centerX, centerY], {
        font: "600 14px Inter",
        fill: {
          color: colorsGroups.color222222,
        },
      });

      return textElement;
    }

    /**
     * Custom x axis labels
     *
     * @returns {number | "auto" | string | undefined}
     */
    function categoryAxisItemLabelsGetCustomRotation():
      | number
      | "auto"
      | string
      | undefined {
      // Calculate rotation angle based on number of categories
      const rotationAngle =
        props.categoryAxisItemLabelsCustomRotation ?? "auto";

      // Validate
      if (typeof rotationAngle === "string" && rotationAngle !== "auto") {
        return;
      }

      return rotationAngle;
    }

    /**
     * custom bar item labels
     */
    function getBarCustomValue(e: any) {
      if (isNullOrUndefined(e.value)) {
        return;
      }

      let value = Number(e.value);

      const text = truncateText(value.toString(), 6);
      const fontSize = 12.5;
      const charWidth = fontSize * 0.6;
      const textWidth = Math.min(text.length, 6) * charWidth;
      let centerX = e.rect.origin.x + (e.rect.size.width - textWidth) / 2;
      let centerY = e.rect.origin.y + e.rect.size.height / 2 - 12;

      if (e.value < 0) {
        centerY = centerY + 15;
      }

      if (props.isBigNumber) {
        return new Text(
          `${StringUtils.formatBigNumbers(value, { maximumFractionDigits: props.maximumFractionDigits, minimumFractionDigits: props.minimumFractionDigits })}`,
          [centerX, centerY],
          {
            font: "600 14px Inter",
            fill: {
              color: colorsGroups.color222222,
            },
          },
        );
      } else {
        return new Text(
          `${isNaN(e.value) ? "" : e.value}`,
          [centerX, centerY],
          {
            font: "600 14px Inter",
            fill: {
              color: colorsGroups.color222222,
            },
          },
        );
      }
    }

    /**
     * Returns the X-axis labels for the given value.
     *
     * @param {any} e - The input value.
     * @returns {any} - The X-axis labels.
     */
    function getXAxisLabels(e: any) {
      let myValue = Number(e.value);
      if (props.isBigNumber) {
        return StringUtils.formatBigNumbers(myValue, { maximumFractionDigits: props.maximumFractionDigits, minimumFractionDigits: props.minimumFractionDigits });
      } else {
        return e.value;
      }
    }

    const formatLabel = (e: { value: number }) => {
      const value = e.value;
      if (isNumber(value)){
        return StringUtils.formatBigNumbers(value, { maximumFractionDigits: props.maximumFractionDigits, minimumFractionDigits: props.minimumFractionDigits });
      }
      return value
    };

    const calculatedMax = computed(() => {
      const maxValue = Math.max(...props.dataFirstSeries);
      return Math.ceil(maxValue / 10) * 10 + 10;
    });

    const calculatedMajorUnit = computed(() => {
      const maxValue = Math.max(...props.dataFirstSeries);
      const range = Math.ceil(maxValue / 10) * 10 + 10;

      let unit = range / 10;

      if (unit < range / 5) {
        unit = range / 5;
      }

      const niceNumbers = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
      const roundedUnit = niceNumbers.find(num => num >= unit) || Math.ceil(unit);

      return roundedUnit;
    });

    return {
      ...toRefs(horizontalBarChart),
      barItemColor,
      captureTooltipContent,
      categoryAxisItemLabelsGetCustomRotation,
      categoryAxisItemLabelsCustomVisual,
      chartTypeSelected,
      getNumberWithDecimals,
      getBarCustomValue,
      getChartName,
      getXAxisLabels,
      handleChartMouseLeave,
      handleChartMouseMove,
      isBigNumberConversionNeeded,
      formatLabel,
      calculatedMax,
      calculatedMajorUnit,
      chartKey,
      handleBarClick,
      valueTooltip
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.chart-wrapper {
  position: relative;
}

.tooltip-content {
  padding: 1em;
  border-radius: 8px;
  width: 120px !important;
}

.value-tooltip {
  position: absolute;
  color: #fff;
  padding: 1em;
  border-radius: 8px;
  width: 120px;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);

  .tooltip-category-title {
    color: #fff;
  }
}

.blur::before {
  background: inherit;
  filter: blur(10px);
}

.blur {
  width: 100%;
  height: 120px;
  text-align: center;
  position: relative;
  z-index: 1;
  top: -142px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #fff 35.42%);

  .blur span {
    position: relative;
    backdrop-filter: none;
  }
}

.tooltip-category-title {
  font-size: 1rem;
}
</style>
