<template>
<td class="text-capitalize custom-font-weight text-center">
  <Skeleton class="skeletons-bg" v-if="programInrecalculation" :shape="'text'" :style="{ width: '100%', height: '25px' }"></Skeleton><span v-else :class="levelClassColor">{{ levelItem ?? '-' }}</span>
</td>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { Skeleton } from '@progress/kendo-vue-indicators';

export default defineComponent({
  name: "NineBoxesCashFlowImpact",
  components: {
    Skeleton
  },
  props: {
     dataItem: { type: Object, required: true },
     programInrecalculation: { type: Boolean, required: false, default: false },
     field: { type: String, required: true },
  },
  setup(props) {
    


    const levelClassColor = computed(() => {      
        if (levelItem.value === 'high') {
          return 'high-level'
        }
        else if (levelItem.value === 'medium') {
          return 'medium-level'
        }
        else  if(levelItem.value === 'low') {
          return 'low-level'
        }
        else {
          return 'empty-level'
        }
    })


    const levelItem = computed(() => {
      if (props.field === 'cashFlowImpactLabel') {
        return props.dataItem.cashFlowImpactLabel
      }
      else if (props.field === 'scalePotentialSCFRevenue') {
        return props.dataItem.scalePotentialSCFRevenue
      }
      else if (props.field === 'vCardEconomicProfitImpactLabel') {
        return props.dataItem.vCardEconomicProfitImpactLabel
      }
      else if (props.field === 'cashFlowImpactLabelSCF') {
        return props.dataItem.cashFlowImpactLabel
      }
      else {
        return '-'
      }
    })


    return {
      // displayColors,
      levelClassColor,
      levelItem
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";

 
  .custom-font-weight{
    font-weight: 600;
  }
</style>
