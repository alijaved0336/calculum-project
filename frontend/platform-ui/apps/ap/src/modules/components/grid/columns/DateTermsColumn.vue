<template>
    <td>
        <div class="text-center">
            <span v-if="dataItem.spend && ('dateOfLastTermNegotiation' in dataItem.spend)">
               {{ formatedDates() }}
            </span>
            <span v-else>
                -
            </span>
        </div>
    </td>
</template>

<script lang='ts'>
import { defineComponent } from 'vue'
import * as formatData from '@/utils/FormatData'
import { getNestedValue } from '@progress/kendo-vue-grid'

export default defineComponent({
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true }
  },
  setup(props) {
    function formatedDates() {
      return formatData.getISODate(getNestedValue(props.field, props.dataItem))
    }

    return {
      formatedDates
    }
  }
})
</script>

<style lang="scss" scoped>

</style>
