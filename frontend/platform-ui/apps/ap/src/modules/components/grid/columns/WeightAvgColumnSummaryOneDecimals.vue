<template>
<span>{{ operation }}</span>
</template>

<script lang='ts'>
import * as formatData from '@/utils/FormatData'

export default {
  name: 'WeightAvgColumnSummaryOneDecimals',
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
      let x = 0
      const searchingInCount = props.dataSet.length
      let Cumul1 = 0
      let Cumul2 = 0
      let sum = 0
      let atLeastOneValue = false
      while (x < searchingInCount) {
        const element = props.dataSet[x]
        x++
        const lookingFor = element[props.field]
        const lookingVolume = element.spend_volume

        if (lookingFor == null || lookingVolume == null || isNaN(lookingVolume) || isNaN(lookingFor)) {
          continue
        }
        atLeastOneValue = true
        Cumul1 += lookingFor * lookingVolume
        Cumul2 += lookingVolume
      }
      if (!atLeastOneValue) {
        return '-'
      }
      if (Cumul2 !== 0) {
        sum = Cumul1 / Cumul2
      }
      return formatData.getNumberWithDecimals(sum, 1)
    }
  }
}

</script>
