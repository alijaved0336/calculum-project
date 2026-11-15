<template>
  <td class="custom-class-for-grid-manage-team text-left" role="gridcell">
    {{ dataItem.lastActivity }}
  </td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'AdminUserLastAccess',
  props: {
    dataItem: { type: Object, required: true }
  },
  setup() {
    return {}
  }
})
</script>
