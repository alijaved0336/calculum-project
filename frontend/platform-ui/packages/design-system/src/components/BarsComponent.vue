<template>
<div class="row">
  <div class="col-12">
    <div class="line-chart d-flex align-items-center" :class="hideElement">
      <!-- Left column: Value-->
      <div class="value-container me-2">
        <SkeletonRectangle v-if="showSkeletonComputed || activeSkeletonComputed" size="sm"></SkeletonRectangle><span class="font-semibold text-gray-600" v-else :class="mainValue !== null ? 'text-2xl' : 'na-font-size'">{{ mainValue ?? 'N/A' }}</span>
      </div>
      <!-- Right column: Title, line bar, and bottom value-->
      <div class="content-container flex-grow-1 d-flex flex-column">
        <div class="d-flex align-items-center gap-1 title-container">
          <div class="d-flex titles-bars"><span class="font-semibold text-gray-500 title" v-if="title">{{ title }}<span class="font-semibold title" v-if="type === 'contractual'">{{  ':' }}</span><span class="font-semibold title ms-2" v-if="type === 'contractual'">{{ contractualValue ?? 'N/A' }}</span></span><span class="font-semibold text-gray-400 title ms-2 avg-days-paid" v-if="type === 'contractual' && extraValue && (!showSkeletonComputed && !activeSkeletonComputed) && extraValue > 0 && !hideAverageDaysPaid">{{ '/ ' + $t('global.averageDaysPaidAcronym') }}:<span class="font-semibold avg-days-paid-value">{{ extraValue }}</span></span><span class="font-semibold text-gray-400 title ms-2 payment-float" v-if="type === 'opportunity' && extraValue && (!showSkeletonComputed && !activeSkeletonComputed) && extraValue > 0">{{ '/ ' + $t('global.paymentFloat') }}: <span class="font-semibold payment-float-value">{{ extraValue }}</span></span>
            <div class="d-flex align-items-center gap-1 tooltip-container">
            </div>
          </div>
        </div>
        <!-- Line bar-->
        <ChartHorizontalSingleBar :lineColor="getLineColorForMainChartLine" :maxValue="maxValue" :value="mainValue"></ChartHorizontalSingleBar>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import ChartHorizontalSingleBar from "./charts/ChartHorizontalSingleBar.vue";
import SkeletonRectangle from "./skeletons/SkeletonRectangle.vue";
import { getStrategyBarColor } from "../utils/strategyBarColors";


export default defineComponent({
  name: "BarsComponent",
  components: {
    ChartHorizontalSingleBar,
    SkeletonRectangle
  },
  props: {
    activeSkeleton: { type: Boolean, required: false, default: false },
    extraValue: { type: Number, required: false, default: 0 },
    mainValue: { type: Number, required: false, default: 0 },
    contractualValue: { type: Number, required: false, default: null },
    maxValue: { type: String, required: false, default: "0" },
    showSkeleton: { type: Boolean, required: false, default: false },
    title: { type: String, required: false, default: "" },
    tooltipText: { type: String, required: false, default: "" },
    topLabel: { type: Boolean, required: false, default: false },
    valueForTopLabel: { type: Number, required: false, default: 0 },
    type: { type: String, required: false, default: "" },
    // A strategy/term key (e.g. "contractualTerms", "BuyerMin") - when set, the line takes that
    // key's drill-down color (getStrategyBarColor) instead of the one `type` picks.
    strategyKey: { type: String, required: false, default: "" }
  },
  setup(props) {
    const hideAverageDaysPaid = false
    const hideElement = ref("");

    const showSkeletonComputed = computed(() => {
      return props.showSkeleton
    })

    const activeSkeletonComputed = computed(() => {
      return props.activeSkeleton;
    })

    const actualValueComputed = computed(() => {
      return props.extraValue;
    })

    const contractualValueComputed = computed(() => {
      return props.mainValue;
    })




    const valueForTopLabelGet = computed(() => {
      return props.valueForTopLabel;
    });



    const getLineColorForMainChartLine = computed(() => {
      if (showSkeletonComputed.value || activeSkeletonComputed.value) {
        return "#EBECF0";
      }

      return getStrategyBarColor(props.strategyKey);
      

  
    });



    return {
      activeSkeletonComputed,
      actualValueComputed,
      contractualValueComputed,
      getLineColorForMainChartLine,
      hideAverageDaysPaid,
      hideElement,
      showSkeletonComputed,
      valueForTopLabelGet,
    };
  },
});
</script>

<style scoped>
.hideElements {
  display: none !important;
}

.extra-section {
  height: 20px;
}


.value-container {
  width: 50px; 
  height: 55px;
  text-align: right;
  align-content: end;

  &-contractual {
    height: 65px;
    align-content: center !important;
  }

  &-opportunity {
    height: 65px;
    align-content: center !important;
  }


}


</style>
