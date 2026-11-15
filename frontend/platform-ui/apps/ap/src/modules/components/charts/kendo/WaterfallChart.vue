<template>
<div class="chart-wrapper" @mousemove="handleChartMouseMove" @mouseleave="handleChartMouseLeave">
<div class="d-flex flex-column">
  <Chart :style="{borderRadius: '8px' , minHeight: '420px' }" :transitions="false" @seriesclick="$emit('on-event-click', $event)">
    <ChartTitle class="text-base" :text="chartTitle" align="left" color="#475467" :font="'600 16px Inter'"></ChartTitle>
    <ChartTooltip :render="'cashflowValue'">
      <template v-slot:cashflowValue="{ props }"><span class="tooltip-content waterfall-chart-tooltip-marker" :data-sync="captureTooltipContent(props)">{{ props.point.value && ( props.point.value > -0.1 && props.point.value < 0.1) ? kendoChartRelated.compareValue(props.point.value) : formatData.getNumberWithDecimals(props.point.value.toString(), 1) }}</span></template>
    </ChartTooltip>
    <ChartCategoryAxis>
      <ChartCategoryAxisItem :major-grid-lines="{visible: false }">
        <ChartCategoryAxisTitle class="text-xxs" :margin="4" :text="xAxisTitle" color="#98a2b3" :font="'400 12px Inter'"></ChartCategoryAxisTitle>
        <ChartCategoryAxisLabels :rotation="rotationXAxisLabel ? 'auto': 0" :margin="10" :font="'600 14px Inter '"></ChartCategoryAxisLabels>
      </ChartCategoryAxisItem>
    </ChartCategoryAxis>
    <ChartValueAxis class="custom-bold-text">
      <ChartValueAxisItem :major-grid-lines="{visible: false }" :crosshair="{visible: false }" :labels="{ content: currencyLabels, font: '600 14px Inter' }">
        <ChartCategoryAxisTitle class="text-xxs" position="center" :text="titleYAxis" color="#98a2b3" :font="'400 12px Inter'"></ChartCategoryAxisTitle>
      </ChartValueAxisItem>
    </ChartValueAxis>
    <ChartSeries>
      <ChartSeriesItem :style="{borderRadius: '25px'}" :type="'waterfall'" :data-items="dataChartValues" :field="'value'" :color="(e:any) => kendoChartRelated.barItemColor(e)" :gap="0.5" :line="{ width: 0.9, color: 'transparent' }" :categoryField="'phaseName'" :summaryField="'summary'" :labels="{ visible: true, visual: convertBigNumber }" :labels-align="'center'" :labels-position="'center'"></ChartSeriesItem>
    </ChartSeries>
  </Chart>
</div>
<div class="row">
  <div class="col-12 d-flex align-items-center justify-content-center chart-legend-container-gap p-2 mt-1 mb-4 p-2" v-if="isLegendVisible && showLegends">
    <CustomChartLegend :legendItems="dataLegendItems"></CustomChartLegend>
  </div>
</div>
<div v-if="valueTooltip.visible" class="value-tooltip" :style="{ top: valueTooltip.y + 'px', left: valueTooltip.x + 'px', background: valueTooltip.color }">{{ valueTooltip.formattedValue }}</div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, toRefs } from "vue";
import { Path, Group, Text } from "@progress/kendo-drawing";
import * as colorsGroups from "@/utils/ColorsGroups";
import * as formatData from "@/utils/FormatData";
import iconArrowDown from "@/resources/assets/images/icons/iconArrowDown.vue";
import * as kendoChartRelated from "@/utils/kendoChartRelated";
import { CustomChartLegend } from "@ada/design-system";
import { StringUtils } from "@/utils";
import { useI18n } from 'vue-i18n'

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
  ChartValueAxisLabels,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartCategoryAxisTitle,
  ChartSeries,
  ChartLegend,
  ChartCategoryAxisLabels,
  ChartSeriesItem,
  ChartTitle,
  ChartTooltip,
  ChartValueAxis,
  ChartValueAxisItem,
} from "@progress/kendo-vue-charts";

export default defineComponent({
  name: "WaterfallChart",
  components: {
    Chart,
    ChartCategoryAxis,
    ChartCategoryAxisItem,
    ChartCategoryAxisLabels,
    ChartCategoryAxisTitle,
    ChartLegend,
    ChartSeries,
    ChartSeriesItem,
    ChartTitle,
    ChartTooltip,
    ChartValueAxis,
    ChartValueAxisItem,
    ChartValueAxisLabels,
    Group,
    iconArrowDown,
    CustomChartLegend,
    Path,
    Text,
  },
  props: {
    chartTitle: { type: String, required: false, default: "" },
    dataValues: { type: Array, required: true },
    xAxisTitle: { type: String, required: false, default: "" },
    yAxisTitle: { type: String, required: false, default: "" },
    fromWaterFall: { type: Boolean, required: false, default: false },
    rotationXAxisLabel: { type: Boolean, required: false, default: true },
    showLegends: { type: Boolean, required: false, default: true }
  },
  emits: ["on-event-click"],
  setup(props, { emit }) {

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    interface WaterfallChart {
      categoriesSeriesData: Array<any>;
      entireDataCategoriesSet: Array<any>;
      entireDataSet: Array<any>;
      firstSeriesData: Array<any>;
      isLegendVisible: boolean;
      loadingWaterfallData: boolean;
      toggleShowMore: boolean;
    }

    const data = reactive<WaterfallChart>({
      categoriesSeriesData: [],
      entireDataCategoriesSet: [],
      entireDataSet: [],
      firstSeriesData: [],
      isLegendVisible: false,
      loadingWaterfallData: true,
      toggleShowMore: false,
    });

    // Kendo's own chart-tooltip popup is positioned using anchor coordinates that get
    // corrupted under the app-wide zoom:0.67 (see apps/ap/src/resources/assets/styles/layout/_general.scss,
    // .k-chart-tooltip-wrapper:has(.waterfall-chart-tooltip-marker)), so its visual
    // output is hidden via CSS and this component renders its own cursor-tracked tooltip
    // instead. Content still comes from Kendo (captureTooltipContent); only positioning is ours.
    const valueTooltip = reactive({ visible: false, formattedValue: '', color: colorsGroups.totalWaterfall, x: 0, y: 0 })
    let kendoTooltipEl: Element | null = null

    /**
     * data for the waterfall chart
     * phaseName is category (y axis)
     * value is the value ( x axis )
     */
    const dataChartValues = computed(() => {
      const parsedData: Array<any> = [];
      props.dataValues.forEach(function (config: any) {
        const newConfig = Object.assign({}, config);
        newConfig.phaseName = config.phaseName ?? "";
        newConfig.value = Number(config.value || 0);
        parsedData.push(newConfig);
      });
      parsedData.push({ phaseName: props.fromWaterFall ? "Target" : "Total", summary: "total" });

      data.entireDataSet = parsedData;
      data.isLegendVisible = kendoChartRelated.isChartLegendVisible(
        data.entireDataSet,
        6,
      );

      data.loadingWaterfallData = false;
      return data.entireDataSet;
    });

    const dataLegendItems = computed(() => {
      let dataArray = dataChartValues.value.map((item: any, index: number) => {

        return {
          text: item.isRest
            ? "Rest"
            : item.summary
              ? props.fromWaterFall ? "Target" : "Total"
              : item.phaseName,
          color: kendoChartRelated.getColorForLegend(item) || colorsGroups.chartFirstGroup,
        };      
      });
      return dataArray;
    });

    /***
     * for the cf y axis labels
     *
     */
    function currencyLabels(e: any) {
      return StringUtils.formatBigNumbers(e.value);
    }

    /**
     * if point is total returns totalWaterfall color,
     * else calls the getPhaseColor
     * returns the bar item bg-color
     */
    function barItemColor(point: any) {
      let summary = point.dataItem.summary;

      if (summary && summary.toLowerCase() === "total") {
        return colorsGroups.totalWaterfall;
      } else if (point.category.toLowerCase() === "rest") {
        return colorsGroups.restColor;
      } else {
        return kendoChartRelated.getPhaseColor(point);
      }
    }

    /**
     * Side effect invoked by Kendo's own cashflowValue render slot (only fires while
     * Kendo intends to show a tooltip) to capture the hovered point's data for our
     * own custom-positioned tooltip. See valueTooltip declaration above for why.
     */
    function captureTooltipContent(slotProps: any) {
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
        kendoTooltipEl = document.querySelector('.k-chart-tooltip-wrapper:has(.waterfall-chart-tooltip-marker)')
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

    /***
     * converts long float number to a string with 1 decimal point, adds
     * k , m , b, t for the amount at the end of the string
     */
    function convertBigNumber(e: any) {
      let val =  StringUtils.formatBigNumbers(e.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      if (e.value) {
        return new Text(
          `${val}`,
          //[centerX, e.rect.origin.y - 10],
          getCashFlowLabelPoint(
            e.value,
            val.length,
            e.rect.origin,
            e.rect.size.width,
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
          getCashFlowLabelPoint(0, 1, e.rect.origin, e.rect.size.width),
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
    function getCashFlowLabelPoint(
      value: number,
      strSize: number,
      origin: any,
      width: number,
    ) {
      return [
        origin.x + (width / 2 - strSize * 2.7),
        origin.y + (value >= 0 ? -5 : 5),
      ];
    }

    const titleYAxis = computed(() => {

      if (StringUtils.isNullUndefinedOrEmpty(props.yAxisTitle)) {
        return translate.t("global.amount")
      }
      
      return props.yAxisTitle



    })


    return {
      ...toRefs(data),
      barItemColor,
      captureTooltipContent,
      convertBigNumber,
      currencyLabels,
      dataChartValues,
      dataLegendItems,
      formatData,
      getCashFlowLabelPoint,
      handleChartMouseLeave,
      handleChartMouseMove,
      kendoChartRelated,
      titleYAxis,
      valueTooltip
    };
  },
});
</script>

<style lang="scss" scoped>
.chart-wrapper {
  position: relative;
}

.tooltip-content {
  padding: 1em;
  border-radius: 8px;
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
  //top: -112px;
  top: -142px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #fff 35.42%);

  .blur span {
    position: relative;
    backdrop-filter: none;
  }
}

.hide-details-container {
  width: 100%;
  text-align: center;
  position: relative;
  top: 0;
  backdrop-filter: none;
}

.show-details {
  color: var(--gray-500, #667085);
  font-size: 0.875rem;
  font-weight: 400;
}

.icons {
  width: 0.75rem;
}

.down {
  transform: rotate(0deg);
}

.up {
  transform: rotate(180deg);
}

.k-chart-surface {
  svg {
    height: 100% !important;
  }
}
</style>
