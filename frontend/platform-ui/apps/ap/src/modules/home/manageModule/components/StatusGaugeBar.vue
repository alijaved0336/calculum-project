<template>
<ArcGauge :value="percentage" :colors="colors" :center-render="'percentData'"></ArcGauge>
<div class="d-flex row-100 text-center data-gauge">
  <div class="col-2 d-flex flex-column row-100 text-left"><span class="text-sm font-semibold text-gray-700"> {{ result }}</span><span class="text-sm font-medium text-gray-500">{{ $t('global.contractual') }}  </span></div>
  <div class="col-8 rate-gauge">
    <div class="d-flex percentage-text"><span class="text-sm font-medium text-gray-500"> {{ $t('home.manageModule.all_agreed') }}</span><span class="text-sm font-semibold text-gray-700"> {{ percentage }}%</span></div><span class="text-gray-700 text-3xl font-semibold">{{ middleNumber }}</span>
  </div>
  <div class="col-2 d-flex flex-column row-100 text-right"><span class="text-sm font-semibold text-gray-700">{{ target }}</span><span class="text-sm font-medium text-gray-500">{{ $t('home.plan.planPhase.target') }}  </span></div>
</div>
</template>

  <script lang="ts">
  
  import { defineComponent, ref,  onMounted, reactive, toRefs } from 'vue'
  import { ArcGauge } from "@progress/kendo-vue-gauges";
  
  export default defineComponent({
    name: 'StatusGaugeBar',
    components: { ArcGauge },
    props: {
      result: { type: Number, required: true, default: 0 },
      target: { type: Number, required: true, default: 0 },
      percentage: { type: Number, required: true, default: 0 },
      middleNumber: { type: Number, required: true, default: 0 }
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
         color: '#875BF7'
        }
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
    width: 100% !important;
    margin-top: -2.3rem !important;
  }
  .rate-gauge {    
    margin-top: -50px;
    justify-content: center;
    gap: 5px;
  }
  
  .text-left {
    text-wrap: nowrap;
    text-align: left;
  }

  .text-right {
    text-wrap: nowrap;
    text-align: right;
  }

  .percentage-text {
    justify-content: center;
    gap: 3px;
  }
</style>