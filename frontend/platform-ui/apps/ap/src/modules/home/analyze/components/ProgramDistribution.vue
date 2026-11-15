<template>
<div class="row">
  <div class="col-12 mt-2" id="barTricolorSpendVolumeId"><span class="mb-0 font-medium text-gray-400 title font-bold">{{ $t('home.analyze.analyzeProgramOverview.programDistribution.spendVolume') }}</span>
    <Skeleton class="skeletons-bg" v-if="loading" :shape="'text'" :style="{ width: '100%', height: '50px' }"></Skeleton>
    <BarsTricolor v-if="!loading" :firstSection="spendVolume.termExtScf" :secondSection="spendVolume.vcard" :thirdSection="spendVolume.excluded" :firstSectionTotal="spendVolume.termExtScfTotal" :secondSectionTotal="spendVolume.vcardTotal" :thirdSectionTotal="spendVolume.excludedTotal" name="spendVolume"></BarsTricolor>
  </div>
  <div class="col-12 mt-2" id="barTricolorNumberSupplierId"><span class="mb-0 font-medium text-gray-400 title font-bold">{{ $t('home.analyze.analyzeProgramOverview.programDistribution.numberSuppliers') }}</span>
    <Skeleton class="skeletons-bg" v-if="loading" :shape="'text'" :style="{ width: '100%', height: '50px' }"></Skeleton>
    <BarsTricolor v-if="!loading" :firstSection="countSuppliers.termExtScf" :secondSection="countSuppliers.vcard" :thirdSection="countSuppliers.excluded" :firstSectionTotal="countSuppliers.termExtScfTotal" :secondSectionTotal="countSuppliers.vcardTotal" :thirdSectionTotal="countSuppliers.excludedTotal" :decimals="0" name="countSuppliers"></BarsTricolor>
  </div>
  <div class="col-12 mt-2" id="barTricolorCashFlowId">   <span class="mb-0 font-medium text-gray-400 title font-bold">{{ $t('home.analyze.analyzeProgramOverview.programDistribution.cashFlow') }}</span>
    <Skeleton class="skeletons-bg" v-if="loading" :shape="'text'" :style="{ width: '100%', height: '50px' }"></Skeleton>
    <BarsTricolor v-if="!loading" :firstSection="cashFlow.termExtScf" :secondSection="cashFlow.vcard" :thirdSection="cashFlow.excluded" :firstSectionTotal="cashFlow.termExtScfTotal" :secondSectionTotal="cashFlow.vcardTotal" :thirdSectionTotal="cashFlow.excludedTotal" name="cashFlow"></BarsTricolor>
  </div>
  <div class="col-12 mt-2" id="barTricolorEconomicProfitId"><span class="mb-0 font-medium text-gray-400 title font-bold">{{ $t('home.analyze.analyzeProgramOverview.programDistribution.economicProfit') }}</span>
    <Skeleton class="skeletons-bg" v-if="loading" :shape="'text'" :style="{ width: '100%', height: '50px' }"></Skeleton>
    <BarsTricolor v-if="!loading" :firstSection="economicProfit.termExtScf" :secondSection="economicProfit.vcard" :thirdSection="economicProfit.excluded" :firstSectionTotal="economicProfit.termExtScfTotal" :secondSectionTotal="economicProfit.vcardTotal" :thirdSectionTotal="economicProfit.excludedTotal" name="economicProfit"></BarsTricolor>
  </div>
  <div class="col-12 mt-2">
    <!-- Leyenda con puntos (en una fila)-->
    <div class="legend mt-3 d-flex flex-row align-content-center justify-content-center">
      <div class="d-flex align-items-center me-4 mr-5" id="legendTermExtSFCId" v-if="showTermExtLegend"><span class="me-4 first-bar">●</span><span class="ml-1">{{ $t(hasFinancing ? 'home.analyze.analyzeProgramOverview.programDistribution.termExtSFC' : 'home.analyze.analyzeProgramOverview.programDistribution.termExt') }}</span></div>
      <div class="d-flex align-items-center me-4 mr-5" id="legendVcardId" v-if="showVcardLegend"><span class="me-5 second-bar">●</span><span class="ml-1">{{ $t('home.analyze.analyzeProgramOverview.programDistribution.vCard') }}</span></div>
      <div class="d-flex align-items-center mr-5" id="legendExcludedId" v-if="showExcludedLegend"><span class="me-5 last-bar">●</span><span class="ml-1">{{ $t('home.analyze.analyzeProgramOverview.programDistribution.excluded') }}</span></div>
    </div>
  </div>
</div>
</template>
<script lang="ts">
import { Skeleton } from '@progress/kendo-vue-indicators';
import BarsTricolor from "@/modules/components/BarsTricolor.vue";

import { computed, defineComponent } from 'vue';
import type { PropType } from 'vue';


interface Data {
  termExtScf: number,
  vcard: number,
  excluded: number,
  termExtScfTotal: number,
  vcardTotal: number,
  excludedTotal: number
}

export default defineComponent({
  name: 'ProgramDistribution',
  components: {
    Skeleton,
    BarsTricolor
  },
  props: {
    spendVolume: { type: Object as PropType<Data>, required: true },
    countSuppliers: { type: Object as PropType<Data>, required: true },
    cashFlow: { type: Object as PropType<Data>, required: true },
    economicProfit: { type: Object as PropType<Data>, required: true },
    loading: { type: Boolean, required: true },
    hasFinancing: { type: Boolean, required: true }
  },
  setup(props) {
    const propsToCheck = {
      spendVolume: props.spendVolume,
      countSuppliers: props.countSuppliers,
      cashFlow: props.cashFlow,
      economicProfit: props.economicProfit
    };
    const showTermExtLegend = computed(() => Object.values(propsToCheck).some(prop => prop?.termExtScfTotal > 0));
    const showVcardLegend = computed(() => Object.values(propsToCheck).some(prop => prop?.vcard > 0));
    const showExcludedLegend = computed(() => Object.values(propsToCheck).some(prop => prop?.excluded > 0));
    return {
      showTermExtLegend,
      showVcardLegend, showExcludedLegend
    }
  }
})

</script>



<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

.legend {
  font-size: 16px;
}

.first-bar {
  color: $color-blue-dark-800;
}

.second-bar {
  color: $color-teal-600;
}

.last-bar {
  color: $color-gray-700;
}
</style>
