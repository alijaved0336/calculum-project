<template>
<div class="chart-wrapper" @mousemove="handleChartMouseMove" @mouseleave="handleChartMouseLeave">
  <Chart :key="chartKey" :style="{ height: getChartHeight() }" @seriesclick="handleBarClick($event)">
    <ChartTooltip :render="'defaultTooltipRender'">
      <template v-slot:defaultTooltipRender="{ props }">
        <div class="d-flex align-items-center flex-column tooltip-content horizontal-bar-chart-tooltip-marker" :data-sync="captureTooltipContent(props)">
          <h6 class="font-weight-bold text-center tooltip-category-title">{{ props.point.category }}</h6><span class="text-center">{{ chartTypeSelected !== '' ? getChartName(chartTypeSelected) + " " : '' }} {{ formatData.getNumberWithDecimals(props.point.value, decimals) }}</span>
        </div>
      </template>
    </ChartTooltip>
    <ChartTitle :text="chartTitle" align="left" color="#475467" :font="'600 16px Inter'">
      <ChartCategoryAxis>
        <ChartCategoryAxisItem :categories="myDataCategories" :major-grid-lines="{ visible: false }" :margin="10" :font="'600 14px Inter '" :labels="{ visible: true, visual: getLabels }">
          <ChartCategoryAxisTitle :text="yAxisTitle" color="#98a2b3" :font="'400 12px Inter '" :margin="20"></ChartCategoryAxisTitle>
        </ChartCategoryAxisItem>
      </ChartCategoryAxis>
      <ChartValueAxis>
        <ChartValueAxisItem :major-grid-lines="{ visible: false }" :crosshair="{ visible: false }" :font="'600 14px Inter '" :labels="{ visual: getCustomXAxisLabels }">
          <ChartCategoryAxisTitle :text="xAxisTitle" :color="xAxisTitle === 'Label' ? '#fff' : '#98a2b3'" :font="'400 12px Inter '"></ChartCategoryAxisTitle>
          <ChartCategoryAxisLabels v-if="!isBigNumberConversionNeeded" :rotation="'auto'" align="center" :margin="10" :font="'600 14px Inter '" :labels="{ content: getLabels }"></ChartCategoryAxisLabels>
        </ChartValueAxisItem>
      </ChartValueAxis>
      <ChartSeries>
        <ChartSeriesItem :type="'bar'" :data-items="myDataSeries" :color="barItemColor" :font="'600 14px Inter '" :gap="0.7" :labels="{ visible: true, visual: getBarCustomValue }"></ChartSeriesItem>
      </ChartSeries>
    </ChartTitle>
  </Chart>
  <button type="button" class="d-flex align-items-end justify-content-center btn-unstyled" v-if="dataFirstSeries.length > 6 && selectedChart !== 'lastCfi' && showMoreBtn" :class="toggleShowMore ? 'hide-details-container' : 'blur show-details-container-bottom'" @click="toggleShowMore = !toggleShowMore"><span class="show-details cursor-pointer">{{ toggleShowMore ? $t('global.showLess') : $t('global.showMore') }}
      <iconArrowDown class="icons ml-2 cursor-pointer" :class="[toggleShowMore ? 'up-action' : 'down-action']"></iconArrowDown></span></button>
  <div v-if="showMaxValuesNotice" class="text-muted small mt-2">{{ $t('global.chartMaxValuesWarning') }}</div>
  <div class="label-tooltip" v-if="labelTooltip.visible" :style="{ top: labelTooltip.y + 'px', left: labelTooltip.x + 'px' }">{{ labelTooltip.text }}</div>
  <div v-if="valueTooltip.visible" class="value-tooltip d-flex align-items-center flex-column" :style="{ top: valueTooltip.y + 'px', left: valueTooltip.x + 'px', background: valueTooltip.color }">
    <h6 class="font-weight-bold text-center tooltip-category-title">{{ valueTooltip.category }}</h6><span class="text-center">{{ valueTooltip.formattedValue }}</span>
  </div>
</div>
</template>


<script lang="ts">
import { computed, defineComponent, reactive, toRefs, watch } from 'vue'

import { useI18n } from 'vue-i18n'
import * as colorsGroups from '@/utils/ColorsGroups'
import * as formatData from '@/utils/FormatData'
import * as kendoChartRelated from '@/utils/kendoChartRelated'
import { StringUtils } from '@/utils'

// Icons
import iconArrowDown from '@/resources/assets/images/icons/iconArrowDown.vue'

// Kendo
import {
  Chart,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartCategoryAxisTitle,
  ChartSeries,
  ChartCategoryAxisLabels,
  ChartSeriesItem,
  ChartTitle,
  ChartTooltip,
  ChartValueAxis,
  ChartValueAxisItem,
} from "@progress/kendo-vue-charts";
import { Path, Group, Text } from "@progress/kendo-drawing";

// AB#20342: an expanded chart draws at most this many bars. The series arrives sorted
// descending by the selected value, so the first slice is its top 100.
const CHART_MAX_VALUES = 100

const LAST_CFI_METRICS = new Set(["Average", "1st Quartile", "3rd Quartile", "Min", "Median", "Max", "Country Average", "Region Average", "Industry Average"])

function getConcatenatedLabels(e: any) {
  return e.value
}

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

function getLabelPointForXAxis(value: number, strSize: number, origin: any, width: number) {
  return [origin.x + (width / 2 - (strSize * 2.7)), origin.y + (value >= 0 ? -5 : 5)]
}

function getLabelPoint(value: number, strSize: number, origin: any, width: number, height: number) {
  if (value < 0) {
    return [origin.x - 5, (origin.y + (height / 2 - (strSize * 2)))]
  }

  return [origin.x + (width / 2 - (strSize)), (origin.y + (height / 2 - (strSize * 2)))]
}

function isTotalOrSubtotalCategory(category: any) {
  const normalized = category && category.toLowerCase()
  return normalized === 'total' || normalized === 'subtotal'
}

function getLastCfiColor(category: any) {
  return category && LAST_CFI_METRICS.has(category) ? colorsGroups.chartFirstGroup : colorsGroups.chartSecondGroup
}

function getPhaseColor(point: any) {
  if (point.category.toLowerCase() === 'rest') {
    return colorsGroups.restColor
  }

  return kendoChartRelated.getColor(point.index) || colorsGroups.chartFirstGroup
}

export default defineComponent({
  name: "HorizontalBarChart",
  components: {
    Chart,
    ChartCategoryAxis,
    ChartCategoryAxisItem,
    ChartCategoryAxisTitle,
    ChartSeries,
    ChartCategoryAxisLabels,
    ChartSeriesItem,
    ChartTitle,
    ChartTooltip,
    ChartValueAxis,
    ChartValueAxisItem,
    iconArrowDown,
    Group,
    // eslint-disable-next-line vue/no-reserved-component-names
    Path,
    // eslint-disable-next-line vue/no-reserved-component-names
    Text,
  },
  props: {
    chartTitle: { type: String, required: false, default: '' },
    xAxisTitle: { type: String, required: false, default: '' },
    yAxisTitle: { type: String, required: false, default: '' },
    dataFirstSeries: { type: Array, required: true },
    categoriesData: { type: Array, required: true },
    isBigNumber: { type: Boolean, required: false, default: false },
    chartType: { type: String, required: true },
    forPhasesChart: { type: Boolean, required: false, default: false },
    selectedChart: { type: String, required: false, default: null },
    section: { type: String, required: false, default: '' },
    showMoreBtn: { type: Boolean, required: false, default: true },
    entityName: { type: String, required: false, default: '' },
    decimals: { type: Number, required: false, default: 0 },
    decimalsBignumber: { type: Number, required: false, default: 1 },
  },
  emits: ['showDetails', 'on-event-click'],
  setup(props, { emit }) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    interface HorizontalBarChart {
      categoriesSeriesData: Array<any>,
      entireDataCategoriesSet: Array<any>,
      entireDataSet: Array<any>,
      firstSeriesData: Array<any>,
      toggleShowMore: boolean,
      multiplierValue: number,
      selectedBarIndex: number | null,
    }

    let myDataSeries = computed(() => {

      if (props.selectedChart === 'lastCfi') {
        return props.dataFirstSeries
      }

      return horizontalBarChart.toggleShowMore
        ? props.dataFirstSeries.slice(0, CHART_MAX_VALUES)
        : props.dataFirstSeries.slice(0, 6)
    })

    let myDataCategories = computed(() => {

      if (props.selectedChart === 'lastCfi') {
        return props.categoriesData
      }

      return horizontalBarChart.toggleShowMore
        ? props.categoriesData.slice(0, CHART_MAX_VALUES)
        : props.categoriesData.slice(0, 6)
    })

    // AB#20342: keyed off the FULL series, not myDataSeries - that one is already capped and
    // would never exceed the limit, so the notice could never appear.
    let showMaxValuesNotice = computed(() => {
      return horizontalBarChart.toggleShowMore && props.dataFirstSeries.length > CHART_MAX_VALUES
    })

    let isBigNumberConversionNeeded = computed(() => {
      return props.isBigNumber
    })

    let chartTypeSelected = computed(() => {
      return props.chartType
    })

    // Key para forzar re-renderizado del gráfico cuando cambia la selección
    let chartKey = computed(() => {
      return `chart-${horizontalBarChart.selectedBarIndex}`
    })

    const horizontalBarChart = reactive<HorizontalBarChart>({
      categoriesSeriesData: props.dataFirstSeries,
      entireDataCategoriesSet: props.categoriesData,
      entireDataSet: props.dataFirstSeries,
      firstSeriesData: [],
      toggleShowMore: false,
      multiplierValue: 40,
      selectedBarIndex: null,
    })

    const labelTooltip = reactive({ visible: false, text: '', x: 0, y: 0 })
    let truncatedLabelBounds: Array<{ text: string; x: number; y: number; w: number; h: number }> = []
    let pendingClearBounds = true

    // Kendo's own chart-tooltip popup is positioned using anchor coordinates that get
    // corrupted under the app-wide zoom:0.67 (see apps/ap/src/resources/assets/styles/layout/_general.scss,
    // .k-chart-tooltip-wrapper:has(.horizontal-bar-chart-tooltip-marker)), so its visual
    // output is hidden via CSS and this component renders its own cursor-tracked tooltip
    // instead. Content still comes from Kendo (captureTooltipContent); only positioning is ours.
    const valueTooltip = reactive({ visible: false, category: '', formattedValue: '', color: colorsGroups.chartFirstGroup, x: 0, y: 0 })
    let kendoTooltipEl: Element | null = null

    watch(myDataCategories, () => {
      pendingClearBounds = true
    })

    /**
     * if has forPhasesChart, it will use the
     * getPhaseColor for the specific phase color else it will return default color
     * returns the bar item bg-color
     */
    function barItemColor(point: any) {

      if (horizontalBarChart.selectedBarIndex === point.index) {
        return colorsGroups.supplierStandard
      }

      const category = point.category;

      if (category === props?.entityName) {
        return colorsGroups.supplierStandard
      }

      /** This only for Cash Flow Impact from Compare module*/
      if (props.selectedChart === 'lastCfi') {
        return getLastCfiColor(category)
      }

      if (isTotalOrSubtotalCategory(category)) {
        return colorsGroups.totalWaterfall
      }

      if (props.forPhasesChart) {
        return getPhaseColor(point)
      }

      return colorsGroups.chartFirstGroup
    }



    /**
     * Maneja el evento de clic en una barra del gráfico
     * Actualiza el índice seleccionado y emite el evento
     */
    function handleBarClick(event: any) {
      const clickedIndex = event.point.categoryIx
      if (horizontalBarChart.selectedBarIndex === clickedIndex) {
        horizontalBarChart.selectedBarIndex = null
      } else {
        horizontalBarChart.selectedBarIndex = clickedIndex
      }
      emit('on-event-click', !StringUtils.isNullUndefinedOrEmpty(horizontalBarChart.selectedBarIndex) ? event.category : null,props.section)
    }

    function getChartName(chart: string) {
      if (chart === 'cashFlow') {
        return translate.t('global.cashFlow')
      } else {
        return ''
      }
    }

    /**
     * calculates the chart height
     */
    function getChartHeight() {
      let formula = 0

      if (props.section === 'vCardPrimary' || props.section === 'vCardSecondary') {

        //If existe only one data series, it will return 280px
        if (myDataSeries.value.length === 1) {
          formula = 280
        } else {
          formula = myDataSeries.value.length * 70
        }

      } else {
        formula = myDataSeries.value.length * horizontalBarChart.multiplierValue + 83 + 36
      }
      //multiplier, 83 : x axis bottom section, 36 :  padding and margin 
      emit('showDetails', formula + 'px')
      return formula + 'px'
    }
    /**
     * Checks the props for isBigNumber,
     * if true, it will return the number with 1 decimal
     *else it will return the original value
    * @param {any} e - The argument passed to the function.
    * @return {any} - The return value based on the condition.
    */
    function getLabels(e: any) {
      if (pendingClearBounds) {
        truncatedLabelBounds = []
        pendingClearBounds = false
      }

      const centerX = e.rect.origin.x - 20;
      const isTruncated = e.value.length >= 28

      truncatedLabelBounds.push({
        text: e.value,
        x: e.rect.origin.x,
        y: e.rect.origin.y,
        w: e.rect.size.width,
        h: e.rect.size.height,
      })

      return new Text(
        `${isTruncated ? e.value.slice(0, 28) + '...' : e.value}`,
        [centerX, e.rect.origin.y - 5],
        {
          font: "600 14px Inter",
          fill: {
            color: colorsGroups.color222222
          }
        }
      )
    }

    function handleLabelHover(event: MouseEvent) {
      const el = event.currentTarget as HTMLElement
      const svg = el.querySelector('svg') as SVGSVGElement | null
      if (!svg) return

      const ctm = svg.getScreenCTM()
      if (!ctm) return

      const pt = svg.createSVGPoint()
      pt.x = event.clientX
      pt.y = event.clientY
      const svgP = pt.matrixTransform(ctm.inverse())

      const hit = truncatedLabelBounds.find(lb =>
        svgP.x >= lb.x && svgP.x <= lb.x + lb.w &&
        svgP.y >= lb.y && svgP.y <= lb.y + lb.h
      )

      const containerRect = el.getBoundingClientRect()
      if (hit) {
        const zoomCompensation = getZoomCompensation()
        labelTooltip.visible = true
        labelTooltip.text = hit.text
        labelTooltip.x = (event.clientX - containerRect.left + 12) * zoomCompensation
        labelTooltip.y = (event.clientY - containerRect.top - 32) * zoomCompensation
      } else {
        labelTooltip.visible = false
      }
    }

    function hideLabelTooltip() {
      labelTooltip.visible = false
    }

    /**
     * Side effect invoked by Kendo's own defaultTooltipRender slot (only fires while
     * Kendo intends to show a tooltip) to capture the hovered point's data for our
     * own custom-positioned tooltip. See valueTooltip declaration above for why.
     */
    function captureTooltipContent(slotProps: any) {
      valueTooltip.category = slotProps.point.category
      valueTooltip.formattedValue = `${chartTypeSelected.value !== '' ? getChartName(chartTypeSelected.value) + ' ' : ''}${formatData.getNumberWithDecimals(slotProps.point.value, props.decimals)}`
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
        kendoTooltipEl = document.querySelector('.k-chart-tooltip-wrapper:has(.horizontal-bar-chart-tooltip-marker)')
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
      handleLabelHover(event)
      syncValueTooltip(event)
    }

    function handleChartMouseLeave() {
      hideLabelTooltip()
      valueTooltip.visible = false
    }

    /**
     * custom x axis labels
    */

    function getCustomXAxisLabels(e: any) {
      let myValue = Number(e.value)
      let val = StringUtils.formatBigNumbers(e.value, { maximumFractionDigits: props.decimalsBignumber, minimumFractionDigits: props.decimalsBignumber, lang: "en-US" })
      const centerX = e.rect.origin.x + 5;
      if (props.isBigNumber) {
        return new Text(
          `${StringUtils.formatBigNumbers(myValue, { maximumFractionDigits: props.decimalsBignumber, minimumFractionDigits: props.decimalsBignumber, lang: "en-US" } )}`,
          getLabelPointForXAxis(e.value, val.length, e.rect.origin, e.rect.size.width),
          {
            font: "600 14px Inter",
            fill: {
              color: colorsGroups.color222222
            }
          }
        )

      } else {
        return new Text(
          `${formatData.getNumberWithDecimals(e.value, props.decimals)}`,
          [centerX, e.rectect.origin.y - 5],
          {
            font: "600 14px Inter",
            fill: {
              color: colorsGroups.color222222
            }
          }
        )

      }
    }

    /**
     * Custom bar item labels
     */
    function getBarCustomValue(e: any) {
      let myValue = Number(e.value);

      let val = StringUtils.formatBigNumbers(e.value, { maximumFractionDigits: props.decimalsBignumber, minimumFractionDigits: props.decimalsBignumber, lang: "en-US" });


      let centerX = e.rect.origin.x;

      if (e.value > 0) {
        centerX += 5;
      } else if (e.value < 0) {
        centerX -= 20;
      }

      // Big Numbers
      if (props.isBigNumber) {
        return new Text(
          `  ${StringUtils.formatBigNumbers(myValue, { maximumFractionDigits: props.decimalsBignumber, minimumFractionDigits: props.decimalsBignumber, lang: "en-US" })}`,
          getLabelPoint(
            e.value,
            val.length,
            e.rect.origin,
            e.rect.size.width,
            e.rect.size.height,
          ),
          {
            font: "600 14px Inter",
            fill: {
              color: colorsGroups.color222222,
            },
          },
        );
      }
      return new Text(
        `${formatData.getNumberWithDecimals(e.value, props.decimals)}`,
        [centerX, e.rect.origin.y + e.rect.size.height / 2 - 7],
        {
          font: "600 14px Inter",
          fill: {
            color: colorsGroups.color222222,
          },
        },
      );
    }

    /**
     * Returns the X-axis labels for the given value.
     *
     * @param {any} e - The input value.
     * @returns {any} - The X-axis labels.
     */
    function getXAxisLabels(e: any) {

      let myValue = Number(e.value)

      if (props.isBigNumber) {
        return StringUtils.formatBigNumbers(myValue, { maximumFractionDigits: props.decimalsBignumber, minimumFractionDigits: props.decimalsBignumber, lang: "en-US" })
      }
      else {
        return formatData.getNumberWithDecimals(e.value, props.decimals)
      }
    }
    return {
      ...toRefs(horizontalBarChart),
      barItemColor,
      captureTooltipContent,
      chartKey,
      chartTypeSelected,
      formatData,
      getBarCustomValue,
      getChartHeight,
      getChartName,
      getConcatenatedLabels,
      getCustomXAxisLabels,
      getLabelPoint,
      getLabels,
      getXAxisLabels,
      handleBarClick,
      handleChartMouseLeave,
      handleChartMouseMove,
      handleLabelHover,
      hideLabelTooltip,
      isBigNumberConversionNeeded,
      labelTooltip,
      myDataCategories,
      myDataSeries,
      showMaxValuesNotice,
      StringUtils,
      valueTooltip
    }
  },
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";



.tooltip-content {
  padding: 1em;
  border-radius: 8px;
  width: 120px !important;
}

.blur::before {
  background: inherit;
  filter: blur(10px);
}

.blur {
  width: 100%;  
  text-align: center;
  position: absolute;
  z-index: 1;  
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.00) 0%, #FFF 35.42%);

  .blur span {
    position: relative;
    backdrop-filter: none;
  }
}

.hide-details-container {
  width: 100%;
  text-align: center;  
  backdrop-filter: none;

}

.show-details {
  color: var(--gray-500, #667085);
  font-size: 0.875rem;
  font-weight: 400;
}

.icons {
  width: .75rem;
}

.down-action {
  transform: rotate(0deg);
}

.up-action {
  transform: rotate(180deg);
}

.tooltip-category-title {
  font-size: 1rem;
}

.chart-wrapper {
  position: relative;
}

.label-tooltip {
  position: absolute;
  background: #101828;
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-family: Inter, sans-serif;
  font-weight: 500;
  pointer-events: none;
  z-index: 100;
  white-space: nowrap;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
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

// Pointer cursor for clickable bars
:deep(.k-chart) {
  .k-chart-surface {
    rect {
      cursor: pointer;
    }
  }
}
</style>
