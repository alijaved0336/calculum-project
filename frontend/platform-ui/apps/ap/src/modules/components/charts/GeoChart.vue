<template>
<div class="chart" :id="chartName" :class="[forMetricsGeo ? 'my-geo-chart' : '', { 'has-selection': selectedRegion }]" :style="[isFull ? 'height: 800px; margin-left:10px': forMetricsGeo ? 'my-geo-chart' : '', selectionStyle]"></div>
</template>

<script >
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { getNumberWithDecimals } from '@/utils/FormatData'
import * as colorsGroups from "@/utils/ColorsGroups";

export default {
  name: 'GeoChart',
  props: {
    chartName: {type: String, required: true },
    data: {type: Object, required: true },
    options: {type: Object, required: true },
    isFull: {type: Boolean, required: false, default: false },
    renderImage: {type: Boolean, required: false, default: false },
    forMetricsGeo: { type: Boolean, required: false, default: false }
  },
  emits: ['imageGenerated', 'on-event-click'],
  setup(props, context) {
    // State for the selected region
    const selectedRegion = ref(null)
    let chartInstance = null
    
    // Selection color using colorsGroups
    const selectionColor = colorsGroups.supplierStandard
    
    // Dynamic CSS style to apply the selection color
    const selectionStyle = computed(() => {
      return {
        '--selection-color': selectionColor
      }
    })

    onMounted(() => {
      if (props.forMetricsGeo) {
        window.addEventListener('resize', drawChart)
      }
    })

    onBeforeUnmount(() => {
      window.removeEventListener('resize', drawChart);
    });


    google.charts.load('current', { packages: ['geochart'] })
    google.charts.setOnLoadCallback(drawChart)

    function drawChart() {
      
      const data = google.visualization.arrayToDataTable(props.data)
      const chart = new google.visualization.GeoChart(document.getElementById(props.chartName))
      chartInstance = chart

      const NumberFormat = new google.visualization.NumberFormat(
        {
          pattern: '###'
        })
      NumberFormat.format(data, 1)

      // number formatting
      data.Wf = data.Wf.map(wf => ({ ...wf, c: wf.c.map(c => Number.parseFloat(c.v) ? ({ ...c, f: getNumberWithDecimals(c.f, 0), v: Math.round(c.v) }) : c) }))

      if (props.renderImage) {
        google.visualization.events.addListener(chart, 'ready', function () {
          context.emit('imageGenerated', chart.getImageURI())
        })
      }

      // Listener to detect clicks on chart items
      google.visualization.events.addListener(chart, 'select', function () {
        const selection = chart.getSelection()
        
        if (selection.length > 0) {
          const selectedRow = selection[0].row
          if (selectedRow !== undefined && selectedRow !== null) {
            const categoryKey = data.getValue(selectedRow, 0)
            
            // Toggle: if already selected, deselect
            if (selectedRegion.value === categoryKey) {
              selectedRegion.value = null
              chart.setSelection([])
              context.emit('on-event-click', null)
            } else {
              selectedRegion.value = categoryKey
              // Keep the visual selection
              chart.setSelection([{ row: selectedRow }])
              context.emit('on-event-click', categoryKey)
            }
          }
        } else {
          // Click outside a region - deselect
          if (selectedRegion.value !== null) {
            selectedRegion.value = null
            context.emit('on-event-click', null)
          }
        }
      })

      /*
        Options for the GeoChart,
        includes the new colorGroups theme
      */
      const options = {
        ...props.options,
        region: 'world',
        colorAxis: {colors: ['#2e90fa', '#36BFFA', '#FF4405', '#FFB524', "#0E9384" ]},
        backgroundColor: "#fcfcfd",
        defaultColor: '#98A2B3',
        datalessRegionColor: '#eaecf0',
      }

      chart.draw(data, options)

      // Restore selection if it exists
      if (selectedRegion.value !== null) {
        // Find the index of the selected region
        for (let i = 0; i < data.getNumberOfRows(); i++) {
          if (data.getValue(i, 0) === selectedRegion.value) {
            chart.setSelection([{ row: i }])
            break
          }
        }
      }
    }

    return {
      selectedRegion,
      selectionStyle
    }
  }
}
</script>

<style lang="scss" scoped>
@media screen and (min-width: 1728px) and (min-height: 1117px) {
  .my-geo-chart {
    width: 100%;
    height: 800px;
  }

}

@media screen and (min-width: 1440px) and (min-height: 1024px) {
  .my-geo-chart {
    width: 100%;
    height: 600px;
  }
}

@media screen and (max-width: 1280px) and (min-height: 720px) {
  .my-geo-chart {
    width: 100%;
    height: 500px;
  }
}

.my-geo-chart {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100vh;
  //height: 500px;
}

.map_wrapper foreignObject div {
  width: 500px;
}

// Pointer cursor for clickable regions
.chart {
  :deep(svg) {
    path[fill]:not([fill="#eaecf0"]) {
      cursor: pointer;
    }
  }
}

// Styles for selection using colorsGroups.supplierStandard
.chart.has-selection {
  :deep(svg) {
    // Apply selection color to selected regions in Google GeoChart
    path[stroke-opacity="1"] {
      stroke: var(--selection-color) !important;
      stroke-width: 8px !important;
      filter: drop-shadow(0 0 3px var(--selection-color));
    }
  }
}
</style>
