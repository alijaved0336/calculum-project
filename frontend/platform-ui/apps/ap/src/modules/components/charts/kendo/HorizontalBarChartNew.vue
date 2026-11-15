<template>
<Chart :key="chartKey" :style="{ height: getChartHeight() }" @seriesclick="handleBarClick($event)">
  <ChartTooltip :render="'defaultTooltipRender'">
    <template v-slot:defaultTooltipRender="{ props }">
      <div class="d-flex align-items-center flex-column tooltip-content">
        <h6 class="font-weight-bold text-center tooltip-category-title">{{ props.point.category }}</h6><span class="text-center">{{ chartTypeSelected !== '' ? getChartName(chartTypeSelected) + " " : '' }} {{ formatData.getNumberWithDecimals(props.point.value, 0) }}</span>
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
      <ChartValueAxisItem :major-grid-lines="{ visible: false }" :crosshair="{ visible: false }" :line="{ visible: false }" :min="valueAxisMin" :font="'600 14px Inter '" :labels="{ visual: getCustomXAxisLabels }">
        <ChartCategoryAxisTitle :text="xAxisTitle" :color="xAxisTitle === 'Label' ? '#fff' : '#98a2b3'" :font="'400 12px Inter '"></ChartCategoryAxisTitle>
        <ChartCategoryAxisLabels v-if="!isBigNumberConversionNeeded" :rotation="'auto'" align="center" :margin="10" :font="'600 14px Inter '" :labels="{ content: getLabels }"></ChartCategoryAxisLabels>
      </ChartValueAxisItem>
    </ChartValueAxis>
    <ChartSeries>
      <ChartSeriesItem :type="'bar'" :data-items="myDataSeries" :color="barItemColor" :font="'600 14px Inter '" :gap="0.5" :labels="{ visible: true, visual: getBarCustomValue }" :visual="roundedBarVisual"></ChartSeriesItem>
    </ChartSeries>
  </ChartTitle>
</Chart>
<button type="button" class="d-flex align-items-end justify-content-center btn-unstyled" v-if="dataFirstSeries.length > 6 && selectedChart !== 'lastCfi' && showMoreBtn" :class="toggleShowMore ? 'hide-details-container' : 'blur show-details-container-bottom'" @click="toggleShowMore = !toggleShowMore"><span class="show-details cursor-pointer">{{ toggleShowMore ? $t('global.showLess') : $t('global.showMore') }}
    <iconArrowDown class="icons ml-2 cursor-pointer" :class="[toggleShowMore ? 'up-action' : 'down-action']"></iconArrowDown></span></button>
</template>


<script lang="ts">
import { computed, defineComponent, reactive, toRefs } from 'vue'

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
  ChartValueAxisLabels,
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

export default defineComponent({
  name: "HorizontalBarChartNew",
  components: {
    Chart,
    ChartValueAxisLabels,
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
  },
  emits: ['showDetails', 'on-event-click'],
  setup(props, { emit }) {
    const translate = useI18n()
    const componentBarColor = '#5266eb'

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

      return horizontalBarChart.toggleShowMore ? props.dataFirstSeries : props.dataFirstSeries.slice(0, 6)
    })

    let myDataCategories = computed(() => {

      if (props.selectedChart === 'lastCfi') {
        return props.categoriesData
      }

      return horizontalBarChart.toggleShowMore ? props.categoriesData : props.categoriesData.slice(0, 6)
    })

    let valueAxisMin = computed(() => {
      const values = props.dataFirstSeries
        .map((item: any) => {
          if (typeof item === 'number') {
            return item;
          }

          if (item && typeof item === 'object') {
            if (Number.isFinite(Number(item.value))) {
              return Number(item.value);
            }

            if (Number.isFinite(Number(item.y))) {
              return Number(item.y);
            }
          }

          return Number(item);
        })
        .filter((item: number) => Number.isFinite(item));

      if (!values.length) {
        return undefined;
      }

      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);

      // Keep natural range when dataset already has negatives
      if (minValue < 0) {
        return undefined;
      }

      // Add tiny left padding so rounded left edge is not glued to plot boundary
      return maxValue === 0 ? -1 : -(Math.abs(maxValue) * 0.02);
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

    /**
     * if has forPhasesChart, it will use the
     * getPhaseColor for the specific phase color else it will return default color
     * returns the bar item bg-color
     */
    function barItemColor(point: any) {


      if (horizontalBarChart.selectedBarIndex === point.index) {
        return colorsGroups.supplierStandard
      }

      let category = point.category;

      /** This only for Cash Flow Impact from Compare module*/
      if (props.selectedChart !== null && props.selectedChart === 'lastCfi') {
        const metrics = ["Average", "1st Quartile", "3rd Quartile", "Min", "Median", "Max", "Country Average", "Region Average", "Industry Average"]
        if (category && metrics.includes(category)) {
          return componentBarColor
        } else {
          return colorsGroups.chartSecondGroup
        }
      }


      if (category && category.toLowerCase() === "total" || category && category.toLowerCase() === "subtotal") {
        return colorsGroups.totalWaterfall
      } else if (props.forPhasesChart) {
        if (point.category.toLowerCase() === 'rest') {
          return colorsGroups.restColor
        } else {
          const color = kendoChartRelated.getColor(point.index)
          return color || componentBarColor
        }

      } else {
        return componentBarColor
      }

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

    function getConcatenatedLabels(e: any) {
      return e.value
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

      const centerX = e.rect.origin.x - 20;
      return new Text(
        `${e.value.length >= 28 ? e.value.slice(0, 28) + '...' : e.value}`,
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
     * custom x axis labels
    */

    function getCustomXAxisLabels(e: any) {
      let myValue = Number(e.value)
      let val = StringUtils.formatBigNumbers(e.value)
      const centerX = e.rect.origin.x + 5;
      if (props.isBigNumber) {
        return new Text(
          `${StringUtils.formatBigNumbers(myValue)}`,
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
          `${formatData.getNumberWithDecimals(e.value, 0)}`,
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

      let val = StringUtils.formatBigNumbers(e.value);


      let centerX = e.rect.origin.x;

      if (e.value > 0) {
        centerX += 5;
      } else if (e.value < 0) {
        centerX -= 20;
      }

      // Big Numbers
      if (props.isBigNumber) {
        return new Text(
          `  ${StringUtils.formatBigNumbers(myValue)}`,
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
        `${formatData.getNumberWithDecimals(e.value, 0)}`,
        [centerX, e.rect.origin.y + e.rect.size.height / 2 - 7],
        {
          font: "600 14px Inter",
          fill: {
            color: colorsGroups.color222222,
          },
        },
      );
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

    /**
     * Custom visual for bars with rounded corners on both sides
     */
    function roundedBarVisual(e: any) {
      const radius = 4;
      const rect = e.rect;
      const color = barItemColor({ index: e.categoryIx, category: e.category });

      const x = rect.origin.x;
      const y = rect.origin.y;
      const w = rect.size.width;
      const h = rect.size.height;

      const x0 = Math.min(x, x + w);
      const x1 = Math.max(x, x + w);
      const barWidth = x1 - x0;
      const r = Math.min(radius, barWidth / 2, h / 2);
      const k = 0.552; // cubic bezier quarter-circle approximation constant

      if (barWidth <= 0 || h <= 0) {
        return e.createVisual();
      }

      const path = new Path({
        fill: { color },
        stroke: { width: 0 }
      });

      path
        .moveTo(x0 + r, y)
        .lineTo(x1 - r, y)
        .curveTo([x1 - r + r * k, y], [x1, y + r - r * k], [x1, y + r])
        .lineTo(x1, y + h - r)
        .curveTo([x1, y + h - r + r * k], [x1 - r + r * k, y + h], [x1 - r, y + h])
        .lineTo(x0 + r, y + h)
        .curveTo([x0 + r - r * k, y + h], [x0, y + h - r + r * k], [x0, y + h - r])
        .lineTo(x0, y + r)
        .curveTo([x0, y + r - r * k], [x0 + r - r * k, y], [x0 + r, y])
        .close();

      const group = new Group();
      group.append(path);
      return group;
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
        return StringUtils.formatBigNumbers(myValue)
      }
      else {
        return formatData.getNumberWithDecimals(e.value, 0)
      }
    }
    return {
      ...toRefs(horizontalBarChart),
      barItemColor,
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
      isBigNumberConversionNeeded,
      myDataCategories,
      myDataSeries,
      valueAxisMin,
      StringUtils,
      roundedBarVisual
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

// Pointer cursor for clickable bars
:deep(.k-chart) {
  .k-chart-surface {
    rect {
      cursor: pointer;
    }
  }
}
</style>
