<template>
    <td>
        <div class="text-center">
            <span>{{ formatedCurrency }}</span>
        </div>
    </td>
</template>

<script lang='ts'>
import * as formatData from '@/utils/FormatData'
import { getNestedValue } from '@progress/kendo-vue-grid'

export default {
  name: 'MoneyColumnRound',
  inject: {
    kendoIntlService: { default: null }
  },
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
    decimals: { type: Number, required: false, default: 0 }
  },
  computed: {
    formatedCurrency: function(props: any) {
      const value = getNestedValue(props.field, props.dataItem)      
      if (value === null || value === undefined || isNaN(value)) {
        return '-'
      }
      return formatData.getNumberWithDecimals(value, props.decimals)
    }
  }
}
</script>

<style lang="scss" scoped>

</style>
