<template>
<div class="chart-wrapper" @mousemove="handleChartMouseMove" @mouseleave="handleChartMouseLeave">
<Chart class="m-4 p-5" id="range-bar-chart" @seriesclick="$emit('on-event-click', $event)" :style="{ height: getChartHeight() }">
  <ChartTooltip :render="'tooltipRender'" background="#fff" color="#000" position="left">
    <template v-slot:tooltipRender="{ props }">
      <div class="d-flex align-items-center flex-column tooltip-content range-bar-chart-tooltip-marker" :data-sync="captureTooltipContent(props)">
        <h6 class="font-weight-bold text-center tooltip-category-title">{{ props.point.category }}</h6>
        <div class="d-flex align-items-center"><span>{{ $t('home.rangeBarChart.date.start') }} : </span><span class="font-weight-bold ml-1">{{ labelContentFrom(props.point)}} </span></div>
        <div class="d-flex align-items-center"><span>{{ $t('home.rangeBarChart.date.end') }} : </span><span class="font-weight-bold ml-1">{{ labelContentTo(props.point)}} </span></div>
      </div>
    </template>
  </ChartTooltip>
  <ChartTitle v-if="chartTitle && chartTitle !== ''" :text="$t('home.rangeBarChart.'+ chartTitle + '.title' )" align="left" color="#475467" :font="'600 16px Inter'">
    <ChartCategoryAxisItem :categories="categoriesValues" :major-grid-lines="{visible: false }" :margin="10" :font="'600 14px Inter '"></ChartCategoryAxisItem>
  </ChartTitle>
  <ChartCategoryAxis>
    <ChartCategoryAxisItem :major-grid-lines="{visible: false }" :categories="categoriesValues" :margin="10" :font="'600 14px Inter '" :labels="{visible: true, visual: getYAxisLabels}"> </ChartCategoryAxisItem>
  </ChartCategoryAxis>
  <ChartValueAxis>
    <ChartValueAxisItem :major-grid-lines="{visible: false }" :crosshair="{visible: false }" :min="valueAxisObj.min" :max="valueAxisObj.max" :fromField="'min'" :toField="'max'" :font="'600 14px Inter '" :rotation="'auto'" :spacing="0.55" :gap="categoriesValues.length >= 4 ? 10 : 2" :labels="{ visual: getTimeLabels}">
      <ChartCategoryAxisTitle :text="xAxisTitle" :color="xAxisTitle === 'Label' ? '#fff' : '#98a2b3' " :font="'400 12px Inter '">   </ChartCategoryAxisTitle>
    </ChartValueAxisItem>
  </ChartValueAxis>
  <ChartSeries>
    <ChartSeriesItem :type="rangeBarType" :data-items="myDataItemsComputed" :category-field="'phase'" :font="'600 14px Inter '" :color="barItemColor"></ChartSeriesItem>
  </ChartSeries>
</Chart>
<div class="row">
  <div class="col-12 d-flex align-items-center justify-content-center" v-if="dataValues.length <= 6 && showLegend && forPlanPhases">
    <CustomChartLegend :legendItems="currentDataValuesComputed"></CustomChartLegend>
  </div>
</div>
<button type="button" class="d-flex align-items-end justify-content-center btn-unstyled" v-if="dataValues.length > 10" :class="toggleShowMore ? 'hide-details-container' : 'blur show-details-container-top'" @click="showDetails()"><span class="show-details cursor-pointer">{{ toggleShowMore ? $t('global.showLess') : $t('global.showMore') }}
    <iconArrowDown class="icons ml-2 cursor-pointer" :class="[toggleShowMore ? 'up' : 'down' ]"></iconArrowDown></span></button>
<div v-if="valueTooltip.visible" class="value-tooltip d-flex align-items-center flex-column" :style="{ top: valueTooltip.y + 'px', left: valueTooltip.x + 'px' }">
  <h6 class="font-weight-bold text-center tooltip-category-title">{{ valueTooltip.category }}</h6>
  <div class="d-flex align-items-center"><span>{{ $t('home.rangeBarChart.date.start') }} : </span><span class="font-weight-bold ml-1">{{ valueTooltip.from }} </span></div>
  <div class="d-flex align-items-center"><span>{{ $t('home.rangeBarChart.date.end') }} : </span><span class="font-weight-bold ml-1">{{ valueTooltip.to }} </span></div>
</div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, toRefs } from 'vue'
import * as colorsGroups from '@/utils/ColorsGroups'
import * as kendoChartRelated from '@/utils/kendoChartRelated'
import { Path, Group, Text } from "@progress/kendo-drawing";

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

// Icons
import iconArrowDown from '@/resources/assets/images/icons/iconArrowDown.vue'

import { CustomChartLegend } from '@ada/design-system';

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
  ChartSeriesLabelsFrom,
  ChartSeriesLabelsTo,
  ChartTitle,
  ChartTooltip,
  ChartValueAxis,
  ChartValueAxisItem,
  ChartValueAxisLabels,
  ChartValueAxisTitle,
  ChartXAxisTitle,
} from "@progress/kendo-vue-charts"


export default defineComponent({
  name: 'RangeBarChart',
  components: {
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
    ChartSeriesLabelsFrom,
    ChartSeriesLabelsTo,
    ChartTitle,
    ChartTooltip,
    ChartValueAxis,
    ChartValueAxisItem,
    ChartValueAxisLabels,
    ChartValueAxisTitle,
    ChartXAxisTitle,
    Group,
    iconArrowDown,
    CustomChartLegend,
    Path,
    Text,
  },
  props: {
    chartTitle: { type: String, required: false, default: '' },
    dataValues: { type: Array, required: true },
    forDateRanges: { type: Boolean, required: false, default: false },
    forPlanPhases: { type: Boolean, required: false, default: false },
    key: { type: Number, required: false, default: 0 },
    rangeBarType: { type: String, required: false, default: 'rangeBar' },
    showLegend: { type: Boolean, required: false, default: false },
    valueAxisObj: { type: Object, required: false, default: null },
    xAxisTitle: { type: String, required: false, default: '' },
  },
  emits: ['on-event-click', 'showDetails'],
  setup(props, { emit }) {
    interface PhaseObj {
      from: number,
      id: number,
      myDate: Date,
      phase: string,
      to: number
    }
    interface RangeBarChart {
      dataItems: Array<any>,
      toggleShowMore: boolean
    }

    const rangeBarChart = reactive<RangeBarChart>({
      dataItems: [],
      toggleShowMore: false
    })

    // Kendo's own chart-tooltip popup is positioned using anchor coordinates that get
    // corrupted under the app-wide zoom:0.67 (see apps/ap/src/resources/assets/styles/layout/_general.scss,
    // .k-chart-tooltip-wrapper:has(.range-bar-chart-tooltip-marker)), so its visual
    // output is hidden via CSS and this component renders its own cursor-tracked tooltip
    // instead. Content still comes from Kendo (captureTooltipContent); only positioning is ours.
    const valueTooltip = reactive({ visible: false, category: '', from: '', to: '', x: 0, y: 0 })
    let kendoTooltipEl: Element | null = null

    const myDataItemsComputed = computed(() => {
      return rangeBarChart.toggleShowMore ? props.dataValues : props.dataValues.slice(0, 10)
    })

    const currentDataValuesComputed = computed(() => {

      
      let dataArray = props.dataValues.map((item: any, index: number) => {
        return {
          text:  item.phase,
          color: getColor(item) || colorsGroups.chartFirstGroup,
        }
      })
      return dataArray
    })


    const categoriesValues = computed(() => {
      if (props.dataValues && props.dataValues.length > 0) {
        return props.dataValues.map((item: any) => item.phase);
      } else {
        return [];
      }
    });

    function getYAxisLabels(e: any) {
      const centerX = e.rect.origin.x - 6
      return new Text(
        `${e.text}`,
        [centerX, e.rect.origin.y - 5],
        {
          font: "600 14px Inter",
          fill: {
            color: colorsGroups.color222222
          }
        }
      )
    }

    /**
     * converts to value from millis to human readable date
     */
    function labelContentFrom(e: any) {
      let timeInMillis = e.value.from;
      let newDate = new Date(timeInMillis);

      // Extracting components
      let month = newDate.toLocaleString('en-US', { month: 'short' });
      let day = newDate.getDate();
      let year = newDate.getFullYear();

      return `${month} ${day}, ${year}`;
    }

    function labelContentTo(e: any) {
      let timeInMillis = e.value.to;
      let newDate = new Date(timeInMillis);

      // Extracting components
      let month = newDate.toLocaleString('en-US', { month: 'short' });
      let day = newDate.getDate();
      let year = newDate.getFullYear();

      return `${month} ${day}, ${year}`;
    }

    /**
     * Side effect invoked by Kendo's own tooltipRender slot (only fires while Kendo
     * intends to show a tooltip) to capture the hovered point's data for our own
     * custom-positioned tooltip. See valueTooltip declaration above for why.
     */
    function captureTooltipContent(slotProps: any) {
      valueTooltip.category = slotProps.point.category
      valueTooltip.from = labelContentFrom(slotProps.point)
      valueTooltip.to = labelContentTo(slotProps.point)
      return slotProps.point.category
    }

    /**
     * Mirrors Kendo's own show/hide state (read from the DOM instead of trusting its
     * position) and places our custom tooltip next to the cursor.
     */
    function syncValueTooltip(event: MouseEvent) {
      const el = event.currentTarget as HTMLElement

      if (!kendoTooltipEl || !kendoTooltipEl.isConnected) {
        kendoTooltipEl = document.querySelector('.k-chart-tooltip-wrapper:has(.range-bar-chart-tooltip-marker)')
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

    /**
     * Returns the color of the bar
     */
    function barItemColor(point: any) {
      const category = point.category?.toLowerCase();

      if (category === "total") {
        return colorsGroups.totalWaterfall;
      }

      if (props.forDateRanges && props.forPlanPhases) {
        if (category === 'rest') {
          return colorsGroups.restColor;
        } else {
          return kendoChartRelated.getColor(point.index) || colorsGroups.chartFirstGroup;
        }
      }

      return colorsGroups.chartFirstGroup;
    }

    /**
     * Returns the height of the chart
     */
    function getChartHeight() {
       
      let getHeightBasedOnLength = props.dataValues.length <= 4 ? "280px" : (props.dataValues.length * 50) + 'px'
      /** emits the height for the parent card */
      emit('showDetails', rangeBarChart.toggleShowMore ? getHeightBasedOnLength : props.dataValues.length <= 4 ? "280px" : getHeightBasedOnLength)
      return rangeBarChart.toggleShowMore ? getHeightBasedOnLength : props.dataValues.length <= 4 ? "280px" : getHeightBasedOnLength
    }


    /**
     * show more or less, the user sees this if the array has more than 10 items
     */
    function showDetails() {
      rangeBarChart.toggleShowMore = !rangeBarChart.toggleShowMore
    }

    /**
     * for future use
     * get bg color for tooltip container
     */
    function getBgColorForToolltip(e: any) {
      return '#fcf8e3'
    }

    /**
     * get phase name
     */
    function getPhaseName(phaseObj: PhaseObj) {
      return phaseObj.phase

    }

    /**
     * return a human readable date
     */
    function getTimeLabels(e: any) {
      const minAllPhases = props.valueAxisObj.min;
      const maxAllPhases = props.valueAxisObj.max;

      let timeInMillis = e.value;
      let newDate = new Date(timeInMillis);

      // Calculate duration in milliseconds
      let duration = maxAllPhases - minAllPhases;

      // Convert duration to months
      let months = duration / (30.44 * 24 * 60 * 60 * 1000);

      // Extracting components
      let month = newDate.toLocaleString('en-US', { month: 'short' });
      let day = newDate.getDate();
      let year = newDate.getFullYear().toString().slice(-2);

      const centerX = e.rect.origin.x + 6


      if (months <= 12) {
        // Case 1: Less than or equal to a month
        return new Text(
          `${month} ${day}`,
          [centerX, e.rect.origin.y - 5],
          {
            font: "600 14px Inter",

          }
        )

      } else if (months >= 12 && months <= 24) {
        // Case 2: More than a month but less than a year
        return new Text(
          `${month} ${year}`,
          [centerX, e.rect.origin.y - 5],
          {
            font: "600 14px Inter",

          }
        )
      }
       else {
        // Case 3: More than 2 years
        return new Text(
          `${newDate.getFullYear().toString()}`,
          [centerX, e.rect.origin.y - 5],
          {
            font: "600 14px Inter",
          }
        )
       }
    }
    /**
     * retruns the color for the bar item
     * @param phase 
     */
    function getColor(phase: any) {
      if (phase.phase.toLowerCase() === "rest") {
        return colorsGroups.restColor;
      }
      if (phase.phase.toLowerCase() === "total") {
        return colorsGroups.totalWaterfall;
      } else {
        let color = kendoChartRelated.getColor(phase.id);
        return color || colorsGroups.chartFirstGroup
      }


    }


    return {
      ...toRefs(rangeBarChart),
      barItemColor,
      captureTooltipContent,
      categoriesValues,
      currentDataValuesComputed,
      getBgColorForToolltip,
      getChartHeight,
      getColor,
      getYAxisLabels,
      getPhaseName,
      getTimeLabels,
      handleChartMouseLeave,
      handleChartMouseMove,
      kendoChartRelated,
      labelContentFrom,
      labelContentTo,
      myDataItemsComputed,
      showDetails,
      valueTooltip,
    }
  },
})
</script>
<style lang="scss" scoped>
.chart-wrapper {
  position: relative;
}

.tooltip-content {
  padding: 1em;
  border-radius: 8px;
  width: 170px !important;
  font-size: 10px;
}

.value-tooltip {
  position: absolute;
  background: #fff;
  color: #000;
  padding: 1em;
  border-radius: 8px;
  width: 170px;
  font-size: 10px;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
}

span.tooltip-position {
  position: relative;
  left: 140px;
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
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.00) 0%, #FFF 35.42%);

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
  width: .75rem;
}

.down {
  transform: rotate(0deg);
}

.up {
  transform: rotate(180deg);
}

.tooltip-category-title {
  font-size: 1rem;
}

</style>
