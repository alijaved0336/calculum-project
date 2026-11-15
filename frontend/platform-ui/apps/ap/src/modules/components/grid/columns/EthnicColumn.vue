<template>
  <td class="text-center">
    <span v-if="'ethnicMinorityOwnedBusiness' in dataItem.spend.provider">
      <span :style="'display: none;'">{{
        dataItem.spend.provider.ethnicMinorityOwnedBusiness
      }}</span>
      {{ dataItem.spend.provider.ethnicMinorityOwnedBusiness ? "Yes" : "No" }}
    </span>
    <span v-else>
      <span :style="'display: none;'">{{
        dataItem.spend.provider.ethnicMinorityOwnedBusiness
      }}</span>
      -
    </span>
  </td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'EthnicColumn',
  props: {
    dataItem: { type: Object, required: true }
  },
  emits: ['update-row-data'],
  setup() {
    return {}
  }
})
</script>