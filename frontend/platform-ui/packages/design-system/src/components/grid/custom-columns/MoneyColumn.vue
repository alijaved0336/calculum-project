<template>
<td>
  <div class="text-right money-column-cell">
    <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '100%', height: '25px' }" v-if="showSkeleton && programInrecalculation"> </Skeleton><span v-else>{{ formatedCurrency }}</span>
  </div>
</td>
</template>

<script lang='ts'>
import { defineComponent, computed } from 'vue'
import { getNestedValue } from '@progress/kendo-vue-grid'
import { Skeleton } from '@progress/kendo-vue-indicators';
import { getNumberWithDecimals } from '../../../utils';

export default defineComponent({
  name: 'MoneyColumn',
  components: {
    Skeleton
  },
  inject: {
    kendoIntlService: { default: null }
  },
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
    programInrecalculation: { type: Boolean, required: false, default: false },
    // Per-user number-formatting locale (e.g. from the host app's user store). Defaults
    // to "en-US" for hosts with no such preference.
    locale: { type: String, required: false, default: "en-US" }
  },
  setup(props) {
    const formatedCurrency = computed(() => {
      const value = getNestedValue(props.field, props.dataItem)
      if (value == null || value === undefined || isNaN(value)) {
        return '-'
      }
      return getNumberWithDecimals(value, 1, props.locale)
    })

    const showSkeleton = computed(() => {
      const listOfFields = ['modelCashFlow', 'expectedCashFlow']
      return listOfFields.includes(props.field)
    })

    return {
      formatedCurrency,
      showSkeleton
    }
  }
})
</script>
<style lang="css">
.text-right {
  text-align: right;
}

</style>

<style scoped>
/* AB#20356: defensive centering - the inherited `<td>` `vertical-align: middle` wasn't reading as
   centered once the row height shrank. `.text-right` (above, left untouched - it's a shared
   global class other components also rely on) only sets `text-align`, which flexbox ignores, so
   `justify-content: flex-end` here keeps the same right alignment once this div becomes a flex
   container. */
.money-column-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}
</style>
