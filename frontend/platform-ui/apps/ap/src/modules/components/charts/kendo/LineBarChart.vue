<template>
<div class="mt-md k-d-flex k-flex-wrap">
  <div class="k-flex-grow mb-md kd-border kd-rounded chart-item">
    <Chart :style="{ height: '500px', width: '100%' }" @legenditemclick="(e) => e?.preventDefault?.()">
      <ChartLegend :position="chartPosition" :labels="{ font: labelSizeColumns }" :orientation="'horizontal'" :align="'center'">
        <ChartCategoryAxis>
          <ChartCategoryAxisItem :labels="{          rotation: 'auto',           padding: { top: fix_padding_axys_x, right: 0, bottom: 20, left: 0 },           font: '600 14px Inter'          }" :categories="setDataForXAxis"></ChartCategoryAxisItem>
        </ChartCategoryAxis>
        <ChartValueAxis>
          <ChartValueAxisItem :major-grid-lines="{visible: false }" :crosshair="{visible: false }">
            <ChartCategoryAxisTitle :text="yAxisTitle" :color="'#98a2b3'" :font="'400 12px Inter'"></ChartCategoryAxisTitle>
            <ChartCategoryAxisLabels :rotation="'auto'" :align="'center'" :margin="20" :font="'600 14px Inter '"></ChartCategoryAxisLabels>
          </ChartValueAxisItem>
        </ChartValueAxis>
        <ChartSeries>
          <ChartSeriesItem v-for="(dataSet, index) in setDataForYAxis" :key="index" :type="'line'" :line-style="'smooth'" :width="3" :name="`${dataSet[0]}`" :data-items="dataSet.slice(1)">
            <ChartSeriesItemTooltip :render="'nestedTooltipRender'">
              <template #nestedtooltiprender="{ props }"><span>{{ props.point.series.name }}: <strong> {{ props.point.value }} </strong></span></template>
            </ChartSeriesItemTooltip>
          </ChartSeriesItem>
        </ChartSeries>
      </ChartLegend>
    </Chart>
  </div>
</div>
</template>
<script>
import {
  ChartLegend,
  Chart,
  ChartSeries,
  ChartSeriesItem,
  ChartCategoryAxis,
  ChartCategoryAxisItem,
  ChartValueAxis,
  ChartValueAxisItem,
  ChartSeriesItemTooltip,
  ChartCategoryAxisLabels,
  ChartCategoryAxisTitle

} from '@progress/kendo-vue-charts';
import { computed, defineComponent, reactive, toRefs, onMounted } from 'vue'
import * as colorsGroups from '@/utils/ColorsGroups'

export default defineComponent({
  name: "LineBarChart",
  components: {
    ChartLegend,
    Chart,
    ChartSeries,
    ChartSeriesItem,
    ChartCategoryAxis,
    ChartCategoryAxisItem,
    ChartValueAxis,
    ChartValueAxisItem,
    ChartSeriesItemTooltip,
    ChartCategoryAxisLabels,
    ChartCategoryAxisTitle
  },
  props: {
    rows: { type: Array, required: true },
    columns: { type: Array, required: true },
    yAxisTitle: { type: String, required: false, default: 'Days' },
  },
  setup( props ) {
    
    const data = reactive({      
      categories_x_axys: [],
      categories_y_axys: [],
      fix_padding_axys_x: 5,
      legendWidth: 700,    
      negativeValues: []
    })    
    
    const setDataForXAxis = computed(() => {
      return props.rows.map(row => row[0])
    })

    const setDataForYAxis = computed(() => {
      const result = []
      const negatives = []
      props.columns.forEach(function(config, index) {
        if (config.type !== 'string') {
          const series = [config.value]
          for (const row of props.rows) {
            const val = row[index]
            if (!Number.isNaN(val) && val !== null && val < 0) {
              negatives.push(val)
            }
            series.push(Number.isNaN(val) ? null : val)
          }
          result[index - 1] = series
        }
      });

      if (negatives.length > 0) {
        negatives.sort((a, b) => a - b)
        const mostNegativeValue = negatives[0]
        data.fix_padding_axys_x = Math.abs(mostNegativeValue) > 150 ? 160 : Math.abs(mostNegativeValue) + 10
      }

      return result
    }) 
  
    const chartPosition = computed(() => {
      return 'bottom'
    })

    const labelSize = computed(() => {
      return '14px Inter'      
    })

    const labelSizeColumns = computed(() => {
      return '16px Inter'      
    })
    

    function getCustomXAxisLabels(e) {
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
          `${e.value}`,
          [centerX, e.rectect.origin.y - 5],
          {
            font: "600 54px Inter",
            fill: {
              color: colorsGroups.color222222
            }
          }
        )
      }
    }

    return {
      ...toRefs(data),
      chartPosition,
      labelSize,
      setDataForYAxis,
      setDataForXAxis,
      getCustomXAxisLabels,
      labelSizeColumns
    } 
  }

})
</script>

<style scoped>
.k-chart-legend {
  display: flex;
  flex-wrap: wrap;
}

.k-legend-item {
  flex: 1 1 100px; /* Adjust the 100px to your desired column width */
}
</style>