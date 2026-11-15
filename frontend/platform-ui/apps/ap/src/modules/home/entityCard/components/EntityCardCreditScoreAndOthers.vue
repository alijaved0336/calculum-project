<template>
<div class="card-body d-flex flex-column credit-score-card-and-others shadow-none">
  <div class="d-flex align-items-center"><span class="text-base font-semibold">{{title}}</span>
    <CalculumInfoButton class="ml-2" :infoText="$t('home.overview.overallCreditScore')" :size="15"></CalculumInfoButton>
  </div>
  <div class="d-flex flex-grow-1 mt-5">
    <div class="col-xl-6 col-lg-6 pl-0">
      <div class="d-flex flex-column align-items-center justify-content-center h-100">
        <CustomPieChart textColor="black" textSize="1" :widthPieRing="widthPieRing" :percentPie="percentPie" :colorPie="colorPie" :hasLetterGradeAndValueGradeText="true" :letterGradeText="letterGradeText" :valueGradeText="valueGradeText" :valueGradeTextColor="valueGradeTextColor"></CustomPieChart>
      </div>
    </div>
    <div class="col-xl-6 col-lg-6 pr-0">
      <div class="d-flex flex-column justify-content-center h-100 pb-4">
        <div class="d-flex flex-column">
          <div class="d-flex justify-content-center align-items-center"><span class="chart_title text-left">{{ $t('home.entityCard.offering.dataDepth') }}</span>
            <CalculumInfoButton class="ml-2" :infoText="'The materiality of spend in comparison to the supplier’s total sales revenue reflects the buyer leverage.'" :size="15"></CalculumInfoButton>
          </div>
          <CalculumChartLine class="mt-2" colorBase="#E9EAEC" :colorResult="dataDepth.color" :size-result="dataDepth.value +'%'" :title="dataDepth.description"></CalculumChartLine>
        </div>
        <div class="d-flex flex-column mt-4">
          <div class="d-flex justify-content-center align-items-center"><span class="chart_title text-center">{{ $t('home.entityCard.offering.frequency') }}</span>
            <CalculumInfoButton class="ml-2" :infoText="'The amount of data that is available on the supplier organization.'" :size="15"></CalculumInfoButton>
          </div>
          <CalculumChartLine class="mt-2" colorBase="#E9EAEC" :colorResult="dataFrequency.color" :size-result="dataFrequency.value +'%'" :title="dataFrequency.description"></CalculumChartLine>
        </div>
      </div>
    </div>
  </div>
  <div class="d-flex flex align-items-baseline justify-content-between mt-4" v-if="source">
    <div class="col-6 d-flex align-items-center"><span class="text-gray-400 text-sm font-normal source" style="text-transform: capitalize">{{ $t('home.entityCard.source') }}: {{ source }}</span></div>
    <div class="col-6">
      <div class="d-flex justify-content-end align-items-center"><img class="icon-svg" :src="fontIcons.informationCircle"/><span class="ml-1 bottom_row_style pointer text-snormal text-gray-500" @click="$emit('displayEntityCreditScoreModal', false)">{{ $t('home.entityCard.showDetails') }}</span></div>
    </div>
  </div>
</div>
</template>
<script lang="ts">
import CalculumChartLine from '@/modules/components/charts/CalculumChartLine.vue'
import CalculumInfoButton from '@/modules/components/CalculumInfoButton.vue'
import { CalculumLoading } from '@ada/design-system'
import CustomPieChart from '@/modules/components/charts/CustomPieChart.vue'
import { defineComponent } from 'vue'
import { fontIcons } from '@/resources/assets/assets'

export default defineComponent({
  name: 'EntityCardCreditScoreAndOthers',
  components: {
    CalculumChartLine,
    CalculumInfoButton,
    CalculumLoading,
    CustomPieChart
  },
  emits: ['displayEntityCreditScoreModal'],
  props: {
    title: { type: String, required: true },
    letterGradeText: { type: String, required: true },
    valueGradeText: { type: String, required: true },
    valueGradeTextColor: { type: String, required: false },
    noRatingForSupplier: { type: Boolean, required: true },    
    spanTitleForBottomChartLine: { type: String, required: false, default: 'FREQUENCY' },
    widthPieRing: { type: String, required: true },
    percentPie: { type: String, required: true },
    colorPie: { type: String, required: true },
    dataDepth: { type: Object, required: true },
    dataFrequency: { type: Object, required: true },
    source: { type: String, required: true }
  },
  setup(props, emits) {
    return {
      emits,
      fontIcons,
      props,
      CalculumChartLine,
      CalculumInfoButton,
      CalculumLoading,
      CustomPieChart
    }
  }
})
</script>
<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

.bottom_row_style{
  font-size: 14px;
  color: $color-gray-500;
  font-weight: 500;
}

.bold_text{
  font-weight: 600;
}

.chart_title{
  font-size: 1em;
  color: $color-gray-500;
  font-weight: 500 !important;
  text-transform: capitalize;
}

.chart_title:hover{
  color: $color-gray-500 !important;
}

.centered{
  text-align: center !important;
}

.estimated_position{
  position: relative;
  left: 100px;
}

.entity_card_title {
    font-size: 1em;
    font-weight: 600;
}

.icon-svg{
  height: 15px;
  margin-right: -5px;
}

span.estimated:hover, span.pointer:hover{
  color: $color-gray-500 !important;
}

.source, .source:hover{
    color: $color-gray-400 !important;
    text-transform: capitalize !important;    
  }

.top_bar_title{
    text-transform: capitalize;
}
</style>
