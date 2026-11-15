<template>
  <td>
    <Tooltip class='ellipsis_tooltip' :open-delay="100" :anchor-element="'target'" :position="'top'" v-if="dataItem.couponRateDescription.length > 0">
      <p class="ellipsis pointer" :title="dataItem.couponRateDescription"> {{ dataItem.couponRateDescription }} </p>
    </Tooltip>
  </td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'CouponRateDescription',
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
 p.ellipsis.pointer {
  margin: 0 ;
 }
</style>