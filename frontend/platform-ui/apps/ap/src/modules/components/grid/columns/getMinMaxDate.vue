<template>
  <span>{{ operation }}</span>
</template>
<script lang='ts'>
import * as formatData from '@/utils/FormatData'
export default {
name: 'getMinMaxDate',
inject: {
  kendoIntlService: { default: null }
},
props: {
  field: { type: String, required: true },
  dataSet: { type: Object, required: true },
  getMax: { type: Boolean, required: true, default: true }
},
  computed: {
    operation: function(props: any) {
      let getDate = null
      if (props.getMax){
        getDate = new Date(Math.max(...props.dataSet.map((item: any) => new Date(item.endDate.date).getTime())));
      } else {
        getDate = new Date(Math.min(...props.dataSet.map((item: any) => new Date(item.startDate.date).getTime())));
      }
      
      if (props.dataSet.length > 0){
        const year = getDate.getFullYear();
        const month = String(getDate.getMonth() + 1).padStart(2, '0');
        const day = String(getDate.getDate()).padStart(2, '0');    
        return formatData.getDate(`${year}-${month}-${day}`)
      } else {
        return "-"
      }    
    }
  }
}
</script>