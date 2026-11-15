<template>
<td>
  <div class="text-center money-column-round-cell">
    <span>{{ formatedCurrency }}</span>
  </div>
</td>
</template>

<script lang='ts'>
import { defineComponent, computed } from 'vue'
import { getNestedValue } from '@progress/kendo-vue-grid'
import { getNumberWithDecimals } from '../../../utils';

/**
 * MoneyColumn's rounded sibling - same shape as NoDecimalsColumn, but with a caller-supplied
 * `decimals` instead of a hardcoded 0. Ported from apps/ap's own MoneyColumnRound.vue (its own
 * `@/utils/FormatData` doesn't resolve outside apps/ap; this uses design-system's own
 * getNumberWithDecimals, same as NoDecimalsColumn/PercentColumn already do).
 */
export default defineComponent({
  name: 'MoneyColumnRound',
  inject: {
    kendoIntlService: { default: null }
  },
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
    decimals: { type: Number, required: false, default: 0 },
    // Per-user number-formatting locale (e.g. from the host app's user store). Defaults
    // to "en-US" for hosts with no such preference.
    locale: { type: String, required: false, default: "en-US" }
  },
  setup(props) {
    const formatedCurrency = computed(() => {
      const value = getNestedValue(props.field, props.dataItem)
      if (value === null || value === undefined || isNaN(value)) {
        return '-'
      }
      return getNumberWithDecimals(value, props.decimals, props.locale)
    })

    return {
      formatedCurrency
    }
  }
})
</script>

<style scoped>
/* AB#20356: same fix already applied to NoDecimalsColumn.vue/MoneyColumn.vue - `.text-center`
   (Bootstrap) only sets text-align, which flexbox ignores. */
.money-column-round-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
