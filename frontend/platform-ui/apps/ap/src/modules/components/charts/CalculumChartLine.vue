<template>
<div class="line-chart" :class="{ 'line-chart--span-title': spanTitle }">
  <div class="chart-line__title-span" v-if="spanTitle"><span>{{ spanTitle }}</span>
    <CalculumTooltipIcon v-if="calculumInfo || text" :infoText="text"></CalculumTooltipIcon>
  </div>
  <div class="chart-line ml-2" :style="'background:' + colorBase" :class="`${cursor && 'cursor-pointer' || ''} ${minHeight && 'chart-line__min-height' || ''} ${maxHeight && 'chart-line__max-height' || ''}`">
    <p class="titleShort" v-if="parseInt(sizeResult.replace('%', '')) <= 4" style="padding-left: 10px;">{{ styleSize }}</p>
    <div class="chart-line__title" :class="[minHeight ? 'chart-line__min-height' : '', maxHeight ? 'chart-line__max-height' : '', alignLeft ? 'text-align-left' : '']" :style="`transition: all ease 0.3s; background: ${colorResult}; width: ${sizeResult}; padding: ${sizeResult === '0%' && 0}; margin-left: ${marginLeft};`">
      <div class="chart-line__tooltip" data-toggle="tooltip" data-placement="top" :data-original-title="tooltipText" v-if="tooltipText">
        <!--tooltip.text-truncate(:open-delay='100' :anchor-element="'target'" :position="'top'")-->
      </div><span class="text-center text-truncate" v-if="parseInt(sizeResult.replace('%', '')) > 4" :title="styleSize" :class="[minHeight ? 'chart-line__min-height-title' : '', maxHeight ? 'chart-line__max-height-title' : '']" :style="'transition: all ease 0.3s; color: ' + colorTitle + '; font-size:' + fontSize + 'rem !important;'">{{ styleSize }}</span>
    </div>
  </div>
</div>
</template>

<script>
// ? - Add lang ts
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { computed } from 'vue'

// ? - Remove jquery
import $ from 'jquery'

export default {
  name: 'CalculumChartLine',
  components: { 
    CalculumTooltipIcon 
  },

  /**
   * calculumInfo: boolean to show or not tooltip icon text
   * text: tooltip icon text
   * tooltipText: chart line tooltip 
   */
  props: {
    fontSize: { type: Number, required: false, default: 0.75 },
    colorBase: { type: String, required: true },
    colorResult: { type: String, required: true },
    sizeResult: { type: String, required: true, default: '0%' },
    marginLeft: { type: String, required: false },
    title: { type: String, required: true },
    spanTitle: { type: String, required: false, default: '' },
    colorTitle: { type: String, required: false, default: '#FFFFFF' },
    cursor: { type: Boolean, required: false, default: false },
    minHeight: { type: Boolean, required: false, default: false },
    calculumInfo: { type: Boolean, required: false, default: false },
    text: { type: String, required: false },
    maxHeight: { type: Boolean, required: false, default: false },
    tooltipText: { type: String || Number, default: '' },
    alignLeft: { type: Boolean, required: false, default: false }
  },
  setup(props) {
    const styleSize = computed(() => {
      $(function () {
        $('[data-toggle="tooltip"]').tooltip()
        $('[data-toggle="tooltip"]').on('show.bs.tooltip', function () {
          if (props.innerClass === true) {
            $($(this).data('bs.tooltip').tip).addClass('line-break')
          }
        })
      })
      

      return props.title
    })

    return {
      styleSize,
      Tooltip
    }
  }
}
</script>

<style scoped lang="scss">
.line-chart {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;

  &--span-title {
    grid-template-columns: 1fr 50% 0.625fr;

    @media screen and (max-width: 1200px) {
      grid-template-columns: 50% 50%;
    }
  }
}

.text-align-left {
  text-align: left !important;
  justify-content: left !important;
  span {
    text-align: left !important;
    justify-content: left !important;
    margin-left: 5px;
  }
}
.chart-line__title {
  position: relative;
  padding: 0 4%;
  border-radius: 20px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 95;
  
  span {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    width: 250px !important;
    line-height: 40px;
    color: white;

    &:hover {
      color: white !important;
    }
  }

  .chart-line__tooltip {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 20px;
    z-index: 5;
  }
}

.chart-line__title-span {
  min-width: 200px;
  text-align: left;
}

.chart-line__min-height {
  height: 20px !important;
  max-height: 20px !important;
}

.chart-line__min-height-title {
  margin-top: 2px !important;
  font-size: 0.7em !important;
  height: 20px !important;
  max-height: 20px !important;
  line-height: 20px !important;
}

.titleShort {
  font-size: 0.7em !important;
  height: 20px !important;
  max-height: 20px !important;
  line-height: 20px !important;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: auto;
}

.chart-line__max-height {
  height: 3rem;
  border-radius: 2rem;
  min-height: 3rem;
  overflow: hidden;
}

.negotiation .chart-line {
  height: 30px !important;
}
</style>
