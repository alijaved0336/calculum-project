<template>
  <td class="text-left">
    <span class="custom-class-for-grid-manage-team">{{dataItem.enabled ? "Enabled" : "Disabled"}}</span>
  </td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'AdminUserEnabledStatus',
  props: {
    dataItem: { type: Object, required: true }
  },
  setup( props ) {
    
    return {
      
    }
  }
})
</script>

<style lang="scss" scoped>

</style>
