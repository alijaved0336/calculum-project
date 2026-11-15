<template>
  <td>
    <Tooltip class='ellipsis_tooltip' :open-delay="100" :anchor-element="'target'" :position="'top'" v-if="dataItem.stockExchanges?.length > 0 && dataItem.stockExchanges[0]!== '' ">
      <p class="ellipsis pointer" :title="dataItem.stockExchanges.toString()">  {{dataItem.stockExchanges.toString()}} {{showList()}}  </p>
    </Tooltip>
    <p v-else class="pl-2 custom-text ellipsis pointer"> - </p>
  </td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'StockExchange',
  props: {
    dataItem: { type: Object, required: true }
  },
  setup(props) {
    function showList() {
      // /return props.dataItem.StockExchanges.split(' ').join(',')
      // let stockExchangeList = ''
      // if (typeof props.dataItem.StockExchanges === 'undefined') {
      //   return '-'
      // } else {
      //   props.dataItem.dataItem.StockExchanges.forEach(function(stock:any) {
      //     stockExchangeList += stock + ','
      //   })
      // }
      // stockExchangeList = stockExchangeList.substring(0, stockExchangeList.length - 1)
      // return stockExchangeList
    }
    return {
      showList
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
