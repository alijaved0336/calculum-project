<template>
<ChartHorizontalSingleBar :barBgColorClass="getBgColorForMainChartLine" :maxValue="MAX_TERMS_DAYS_CHARTS.toString()" :value="getMainValueForChartLine"></ChartHorizontalSingleBar>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType } from "vue";
import { MAX_TERMS_DAYS_CHARTS } from "@/utils";
import ChartHorizontalSingleBar from "@/modules/components/charts/ChartHorizontalSingleBar.vue";
import useContractualActual from "@/composables/useContracualActual";

export default defineComponent({
  name: "ChartContractualActualBarComponent",
  components: {
    ChartHorizontalSingleBar,
  },
  props: {
    actualValue: { type: Number as PropType<number | null>, required: false, default: null },
    contractualValue: { type: Number as PropType<number | null>, required: false, default: null },
  },
  setup(props) {
    const getMainValueForChartLine = computed(() => {
      // Contractual first, Avg Days Paid as the fallback (US 10259 EF 3.3 / US 10813 2.h).
      // 0 only when neither term is known, which paints an empty bar.
      return contractualValueComputed.value ?? actualValueComputed.value ?? 0
    });

    const getBgColorForMainChartLine = computed(() => {
      return useContractualActual().getBgColorForMainChartLineResult();
    });

    const actualValueComputed = computed(() => props.actualValue)
    const contractualValueComputed = computed(() => props.contractualValue)

        
    return {
      getBgColorForMainChartLine,
      getMainValueForChartLine,
      MAX_TERMS_DAYS_CHARTS
    };
  },
});
</script>
