<template>
  <td>
    <p class="pl-2 custom-text ellipsis pointer">{{dataItem.yield === '0.00' ? '-' : dataItem.yield }}</p>
  </td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'YieldColumnFundingCost',
  props: {
    dataItem: { type: Object, required: true }
  },
  setup(props) {
    return {
    }
  }
})
</script>

<style lang="scss" scoped>
 .custom-text{
  text-align: center !important;
 }
 .ellipsis_tooltip {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  width: calc(100vw - 61vw);
}
 .ellipsis_p{
  font-size: 16px !important;
 }
 p.ellipsis.pointer{
  margin: 0;
 }
</style>