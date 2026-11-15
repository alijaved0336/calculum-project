<template>
<td>
  <div class="text-center no-decimals-cell">
    <Skeleton class="skeletons-bg" :shape="'text'" :style="{ width: '100%', height: '25px' }" v-if="showSkeleton && programInrecalculation"> </Skeleton><span v-else>{{ formatedValue() }}</span>
  </div>
</td>
</template>

<script lang='ts'>
import { defineComponent, computed, ref } from 'vue'
import { getNestedValue } from '@progress/kendo-vue-grid'
import { Skeleton } from '@progress/kendo-vue-indicators';
import { getNumberWithDecimals } from '../../../utils';

export default defineComponent({
  name: 'NoDecimalsColumn',
  components: {
    Skeleton
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
    function formatedValue() {
      const value = getNestedValue(props.field, props.dataItem)
      if (value == null || value === undefined || isNaN(value)) {
        return '-'
      }

      if (value >= 0) {
        return getNumberWithDecimals(value, 0, props.locale)
      } else {
        return '-'
      }
    }

    const listOfFields = ref(['modelPaymentTerms','targetPaymentTerms','financingStrategy']) // AB#19878: the Target column also needs the recalculation skeleton

    const showSkeleton = computed(() => {
      if (listOfFields.value.includes(props.field)){
        return true
      }
      return false
    })


    return {
      formatedValue,
      showSkeleton
    }
  }
})
</script>

<style scoped>
/* AB#20356: defensive centering - the inherited `<td>` `vertical-align: middle` wasn't reading as
   centered once the row height shrank. `.text-center` (Bootstrap's own utility, left in the
   template) only sets `text-align`, which flexbox ignores, so `justify-content: center` here
   keeps the same horizontal centering once this div becomes a flex container. */
.no-decimals-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
