<template>
    <td>
        <div class="text-right percent-column-cell">
            <span>{{ formatedCurrency }}</span>
        </div>
    </td>
</template>

<script lang='ts'>
import { defineComponent, computed } from 'vue'
import { getNestedValue } from '@progress/kendo-vue-grid'
import { getNumberWithDecimals } from '../../../utils';

export default defineComponent({
  name: 'PercentColumn',
  inject: {
    kendoIntlService: { default: null }
  },
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
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
      return getNumberWithDecimals(value, 2, props.locale) + '%'
    })

    return {
      formatedCurrency
    }
  }
})
</script>

<style scoped>
/* AB#20356: `.text-right` (global, defined once in MoneyColumn.vue - left untouched here) only
   sets text-align, which flexbox ignores - same fix already applied there. */
.percent-column-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}
</style>
