<template>
  <span>{{ operation }}</span>
</template>
<script lang='ts'>
import * as formatData from '@/utils/FormatData'
export default {
  name: 'ExecutionFooter',
  inject: {
    kendoIntlService: { default: null }
  },
  props: {
    field: { type: String, required: true },
    dataSet: { type: Object, required: true }
  },
  computed: {
    operation: function(props: any) {
      let sumExecutionVolume = 0
      let volumeTotal = 0
      props.dataSet.forEach((element:any) => {
        sumExecutionVolume += (element.execution * element.volume)
        volumeTotal += element.volume
      })
      let finalResult = sumExecutionVolume /  volumeTotal
      if (isNaN(finalResult)){
        return '-'
      } else {
        return formatData.getNumberWithDecimals(finalResult,0)+'%'
      }      
    }
  }
}
</script>