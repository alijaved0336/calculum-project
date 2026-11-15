<template>
<ArcGauge :value="resultPercent" :colors="colors" :center-render="'percentData'"></ArcGauge>
<div class="d-flex row-100 text-center data-gauge">
  <div class="col-2 d-flex flex-column row-100"><span class="semi-circle"></span><span class="text-gray-600 text-xs font-medium">{{ result }}</span><span class="text-gray-400 text-xxs font-medium">{{ $t('home.entityCard.negotiated') }}</span></div>
  <div class="col-8 rate-gauge"><span class="text-gray-700 text-3xl font-semibold" :style="{color: colorResult}">{{ isNaN(resultPercent) || !isFinite(resultPercent) ? 0 : parseFloat(resultPercent.toString()).toFixed(0) }}%</span></div>
  <div class="col-2 d-flex flex-column row-100"><span class="text-gray-600 text-xs font-medium">{{ target }}</span><span class="text-gray-400 text-xxs font-medium">{{ $t('home.plan.planPhase.target') }}</span></div>
</div>
</template>

  <script lang="ts">
  
  import { defineComponent, ref,  onMounted, reactive, toRefs } from 'vue'
  import { ArcGauge } from "@progress/kendo-vue-gauges";
  import * as colorsGroups from '@/utils/ColorsGroups'

  export default defineComponent({
    name: 'SemiGaugebar',
    components: { ArcGauge },
    props: {
      result: { type: Number, required: true, default: 0 },
      start: { type: Number, required: true, default: 0 },
      target: { type: Number, required: true, default: 0 },
      widthContainer: {type: String, required: false, default: '100%'},
    },
    setup( props ) {
      const colorResult = ref('')  
      const resultPercent = ref(0)

    interface DataInterface {
      colors: Array<any>
      
    }
    
    const data = reactive<DataInterface>({ 
      colors: [
        {
          to: 20,
          color: colorsGroups.veryLow
        },
        {
          from: 21,
          to: 40,
          color: colorsGroups.low
        },
        {
          from: 41,
          to: 60,
          color: colorsGroups.medium
        },
        {
          from: 61,
          to: 80,
          color: colorsGroups.high
        },
        {
          from: 81,
          color: colorsGroups.veryHigh
        },
      ]      
    })  
    
    onMounted(() => {
      resultPercent.value = ((props.result) / props.target) * 100
    })
  
      return {
        ...toRefs(data),
        colorResult,
        resultPercent,
        
      }
    }
  })
  </script>
  
<style lang="scss" scoped>
  @import "src/resources/assets/styles/variables/colors";
  
  .data-gauge {
    width: 210px !important;
    margin-top: -3rem !important;
  }
  .rate-gauge {    
    margin-top: -30px;
  }

</style>