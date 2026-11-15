<template>
<td>
  <div class="text-right">
    <span>{{ formattedValue }}</span>
  </div>
</td>
</template>

<script lang='ts'>
import { defineComponent, computed } from 'vue'
import { getNumberWithDecimals } from '@/utils/FormatData'
import { getNestedValue } from '@progress/kendo-vue-grid'
import { useAnalyzeStore } from '@/stores/analyze'

export default defineComponent({
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
  },
  setup(props) {
    const analyzeStore = useAnalyzeStore()

    const formattedValue = computed(() => {
      const value = getNestedValue(props.field, props.dataItem)
      if (value == null || value === undefined || isNaN(value)) {
        return '-'
      }
      const type = analyzeStore.customDataPointTypes[props.field] ?? 'number'
      return type === 'days'
        ? getNumberWithDecimals(value, 0)
        : getNumberWithDecimals(value, 1)
    })

    return { formattedValue }
  },
})
</script>
