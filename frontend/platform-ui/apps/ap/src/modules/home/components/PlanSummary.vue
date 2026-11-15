<template>
<div class="d-flex flex-column text-center gap-2" v-if="showSkeleton">
  <NoDataAvailable :icon="'icon-plan'" :title="null"></NoDataAvailable>
  <div class="d-flex text-center gap-2 w-100 skeletons-showing">
    <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '10%', height: '20px' }"></Skeleton>
  </div>
  <div class="d-flex text-center gap-2 w-100 skeletons-showing">
    <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '20%', height: '20px' }"></Skeleton>
  </div>
</div>
<div class="d-flex flex-column text-center gap-2" v-else-if="!showSkeleton && activeSkeleton">
  <NoDataAvailable :icon="'icon-plan'" :message="$t('home.homePage.planSummaryProgramRecalculating')"></NoDataAvailable>
</div>
<div class="w-100" v-else>
  <div class="d-flex flex-column" v-if="summaryData && summaryData.length > 0">
    <PlanSummaryCards v-for="(plan, index) in summaryData" :plan-data="plan" :number="index + 1" :key="index"></PlanSummaryCards>
  </div>
  <div class="d-flex flex-column text-center gap-2 w-100" v-else>
    <NoDataAvailable :icon="'icon-plan'" :title="$t('home.homePage.noPlansCreatedYet')" :message="$t('home.homePage.startCreatePlan')"></NoDataAvailable>
    <div class="d-flex w-100 text-center">
      <button class="btn outline-secondary-btn font-md" @click="$emit('close')" style="z-index: 1; width: fit-content"> <span @click="Routing.home.analyze.openHomeAnalyzeProgramToPlan1()">{{$t('home.homePage.createAPlan')}} </span></button>
    </div>
  </div>
</div>
</template>

<script lang="ts">

import { defineComponent, ref,  onMounted, reactive, toRefs } from 'vue'
import { Skeleton } from '@progress/kendo-vue-indicators';
import NoDataAvailable from '@/modules/components/NoDataAvailable.vue'
import PlanSummaryCards from '@/modules/home/components/PlanSummaryCards.vue'
import * as Routing from '@/services/router/Routing'

export default defineComponent({
name: 'PlanSummary',
components: { Skeleton, NoDataAvailable, PlanSummaryCards },
props: {
    summaryData: { type: Array, required: true, default: null },
    showSkeleton: { type: Boolean, required: true, default: true },
    activeSkeleton: { type: Boolean, required: true, default: true }
},
setup( props ) {
    
    interface DataInterface {        
    }

    const data = reactive<DataInterface>({ 
        
    })  

    
    return {
        ...toRefs(data),
        Routing
    }
}
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.skeletons-showing {
    justify-content: center;
}

.d-flex.w-100.text-center {
    justify-content: center;
}



</style>