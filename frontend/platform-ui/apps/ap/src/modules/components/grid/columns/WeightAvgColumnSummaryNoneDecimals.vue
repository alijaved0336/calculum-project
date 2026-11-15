<template>
<span>{{ operation }}</span>
</template>

<script lang='ts'>
import * as formatData from '@/utils/FormatData'
import { computed, defineComponent,inject } from 'vue'

export default defineComponent({
  name: 'WeightAvgColumnSummaryNoneDecimals',
  props: {
    field: { type: String, required: true },
    dataSet: { type: Object, required: true },
    // Optional column to weight by (WI#20545: each file's terms by that file's own volume).
    // Unset keeps the spend_volume / volume weighting every other grid uses.
    weightField: { type: String, required: false, default: undefined }
  },
  setup(props){
    const intl = inject('kendoIntlService')
    const operation = computed(() => {
      if (props.dataSet == null || props.dataSet.length <= 0) {
        return '-'
      }
      const searchingInCount = props.dataSet.length
      let [x, Cumul1, Cumul2, sum] = [0, 0, 0, 0];
      let atLeastOneValue = false
      while (x < searchingInCount) {
        const element = props.dataSet[x]
        x++
        const lookingFor = element[props.field]
        const lookingVolume = props.weightField ? element[props.weightField] : (element.spend_volume ?? element.volume)

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
      return formatData.getNumberWithDecimals(Math.ceil(Math.round(sum * 1000) / 1000).toString(), 0)
    })
    return { operation }
  }
})
</script>
