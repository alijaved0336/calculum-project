<template>
<td class="custom-td-cell-for-grid"><span>{{dataItem.entityName}}</span></td>
</template>

<script lang='ts'>

import { defineComponent } from 'vue'
export default defineComponent({
  name: 'EntityNameColumn',
  props: {
    dataItem: { type: Object, required: true }
  },
  setup(props) {
    
    return {
    }
  }
})
</script>

