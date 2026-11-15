<template>
<div class="row">
  <div class="col-12">
    <div class="line-chart d-flex align-items-center" :class="hideElement">
      <!-- Left column: Value-->
      <div class="value-container mr-2">
        <SkeletonRectangle v-if="showSkeletonComputed || activeSkeletonComputed" size="sm"></SkeletonRectangle><span class="font-semibold text-gray-600" v-else :class="mainValue !== null ? 'text-2xl' : 'na-font-size'">{{ mainValue ?? 'N/A' }}</span>
      </div>
      <!-- Right column: Title, line bar, and bottom value-->
      <div class="content-container flex-grow-1 d-flex flex-column">
        <div class="d-flex align-items-center gap-1 title-container">
          <div class="d-flex titles-bars"><span class="font-medium text-gray-500 title" v-if="title">{{ title }}<span class="font-medium title" v-if="type === 'contractual'">{{  ':' }}</span><span class="font-medium title ml-2" v-if="type === 'contractual'">{{ contractualValue ?? 'N/A' }}</span></span><span class="font-medium text-gray-400 title ml-2 avg-days-paid" v-if="type === 'contractual' && extraValue && (!showSkeletonComputed && !activeSkeletonComputed) && extraValue > 0 && !hideAverageDaysPaid">{{ '/ ' + $t('global.averageDaysPaidAcronym') }}:<span class="font-medium avg-days-paid-value">{{ extraValue }}</span></span><span class="font-medium text-gray-400 title ml-2 payment-float" v-if="type === 'opportunity' && extraValue && (!showSkeletonComputed && !activeSkeletonComputed) && extraValue > 0">{{ '/ ' + $t('global.paymentFloat') }}: <span class="font-medium payment-float-value">{{ extraValue }}              </span></span><span class="font-medium text-gray-400 title ml-2 payment-float-expected" v-if="type === 'expected' && extraValue && (!showSkeletonComputed && !activeSkeletonComputed) && extraValue > 0">{{ '/ ' + $t('global.paymentFloat') }}: <span class="font-medium payment-float-expected-value">{{ extraValue }}    </span></span>
            <div class="d-flex align-items-center gap-1 tooltip-container">
              <CalculumTooltipIcon :infoText="tooltipText"></CalculumTooltipIcon>
            </div>
          </div>
        </div>
        <!-- Line bar-->
        <ChartHorizontalSingleBar :barBgColorClass="getBgColorForMainChartLine" :maxValue="maxValue" :value="mainValue"></ChartHorizontalSingleBar>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { Card,CardHeader,CardTitle,CardFooter,} from "@progress/kendo-vue-layout";
import { computed, defineComponent, ref } from "vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import ChartHorizontalSingleBar from "@/modules/components/charts/ChartHorizontalSingleBar.vue";
import useContractualActual from "@/composables/useContracualActual";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";
import { useUserStore } from "@/stores/user";

export default defineComponent({
  name: "BarsComponent",
  components: {
    CalculumTooltipIcon,
    Card,
    CardFooter,
    CardHeader,
    CardTitle,
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
    type: { type: String, required: false, default: "" }

  },
  setup(props) {
    const userStore = useUserStore()
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid)
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

    

    // Compute the background color for the main chart line
    const getBgColorForMainChartLine = computed(() => {


      if (showSkeletonComputed.value || activeSkeletonComputed.value) {
        return "rgb(235, 236, 240);";
      }

      
      switch (props.type) {
        case 'contractual':
          return "bg-coolgray-600";
          
        case 'actual':
          return "bg-cyan-500";
        
        case 'opportunity':
          return "bg-teal-500";
        
        case 'expected':
          return "bg-teal-700";

        default:
          return "rgb(235, 236, 240);";
      }


      
      
    });

   

    return {
      activeSkeletonComputed,
      actualValueComputed,
      contractualValueComputed,
      getBgColorForMainChartLine,
      hideAverageDaysPaid,
      hideElement,
      showSkeletonComputed,
      useContractualActual,
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



</style>
