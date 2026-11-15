<template>
  <td class="text-center">
    <div class="d-flex align-items-center justify-content-center" v-if="dataItem.primaryColor.length > 1">
      <div class="square" :style="{background: dataItem.primaryColor }"></div>
      <div class="color-hex">{{dataItem.primaryColor}}</div>
    </div>
    <div class="d-flex align-items-center justify-content-center" v-if="dataItem.primaryColor.length === 0"> - </div>
  </td>
</template>

<script lang="ts">
export default {
  name: 'ColorsUiGroup',
  props: {
    dataItem: { type: Object, required: true }
  }
}
</script>

<style lang="scss" scoped>
.color-hex{
  font-weight: 600;
  margin-left: 10px;
}
.square {
  width: 15px;
  height: 15px;
}
</style>
