<template>
<td class="text-capitalize custom-font-weight text-center">
  <div class="probability-of-success-cell">
    <Skeleton class="skeletons-bg" v-if="programInrecalculation" :shape="'text'" :style="{ width: '100%', height: '25px' }"></Skeleton><span v-else :class="levelClassColor">{{ levelItem ?? '-' }} </span>
  </div>
</td>
</template>
<script lang="ts">
import { defineComponent, computed } from 'vue'
import { Skeleton } from '@progress/kendo-vue-indicators';

export default defineComponent({
  name: "ProbabilityOfSuccessLabel",
  components: {
    Skeleton
  },
  props: {
     dataItem: { type: Object, required: true },
     programInrecalculation: { type: Boolean, required: false, default: false },
     field: { type: String, required: true },
  },
  setup(props) {

    const LEVEL_FIELDS = ['successProbabilityLabel', 'scaleFinancingValueToSupplier', 'scaleUsingFinancing','probabilityTier','cashFlowImpactTier']

    const levelClassColor = computed(() => {
      const value = String(props.dataItem[props.field] ?? '').toLowerCase()
      if (!LEVEL_FIELDS.includes(props.field)) return 'empty-level'
      if (value === 'high') return 'high-level'
      if (value === 'medium') return 'medium-level'
      if (value === 'low') return 'low-level'
      return 'empty-level'
    })

    const levelItem = computed(() => {
      // if (!LEVEL_FIELDS.includes(props.field)) return '-'
      return props.dataItem[props.field] ?? null
    })


    return {
      levelClassColor,
      levelItem
    }
  },
})
</script>

<style lang="scss" scoped>
  // Self-contained on purpose: the original apps/ap component (NineBoxesProbabilityOfSuccess)
  // had no colors of its own - .high-level/.medium-level/.low-level/.empty-level only worked
  // because apps/ap's global _front_overrides.scss happened to define them app-wide. A shared
  // design-system component can't depend on a host app's global stylesheet, so those same colors
  // (apps/ap's $color-green-500/$color-warning-500/$color-primary-500/$color-gray-400) are
  // hardcoded here instead, preserving the exact look this component already had in apps/ap.
  .custom-font-weight {
    font-weight: 600;
  }

  .high-level {
    color: #16b364;
  }
  .medium-level {
    color: #f79009;
  }
  .low-level {
    color: #ff2c4f;
  }
  .empty-level {
    color: #98a2b3;
  }

  // AB#20356: no wrapper at all before this - relied purely on the <td>'s own vertical-align:middle.
  .probability-of-success-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }
</style>
