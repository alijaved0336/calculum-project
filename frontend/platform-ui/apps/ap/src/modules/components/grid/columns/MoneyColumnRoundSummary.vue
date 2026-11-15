<template>
    <span>{{ operation }}</span>
</template>

<script lang='ts'>
import * as formatData from '@/utils/FormatData'

export default {
  name: 'MoneyColumnRoundSummary',
  inject: {
    kendoIntlService: { default: null }
  },
  props: {
    field: { type: String, required: true },
    dataSet: { type: Object, required: true }
  },
  computed: {
    operation: function(props: any) {
      if (props.dataSet == null || props.dataSet.length <= 0) {
        return '-'
      }

      const result = props.dataSet.reduce((acc: any, current: any) => current[props.field] == null || isNaN(current[props.field]) ? acc : Number(acc) + Number(current[props.field]), 0)
      if (result === 0) {
        return '-'
      }

      return formatData.getNumberWithDecimals(result, 1)
    }
  }
}

</script>

<style lang="scss" scoped>

</style>
