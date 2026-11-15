<template>
  <td>
    <Tooltip  v-if="dataItem.companyNames && dataItem.companyNames.length > 0" class='ellipsis_tooltip' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <span class="ellipsis_custom pointer" :title="dataItem.companyNames" @click="showModalForCompanies">{{ dataItem.companyNames }}</span>
    </Tooltip>
    <p class="pl-2 " @click="showModalForCompanies" v-else> - </p>
  </td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
export default defineComponent({
  name: 'CompanyNamesColumn',
  components: {
    Tooltip
  },
  props: {
    dataItem: { type: Object, required: true }
  },
  emits: ['showModalForCompanies'],
  setup(props, { emit }) {
    function showModalForCompanies() {
      emit('showModalForCompanies', props.dataItem)
    }
    return {
      showModalForCompanies
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
  width: calc(100vw - 66vw);
}

.ellipsis_custom{
  width: calc(100% - 10px);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  display: inline-block;
  vertical-align: middle;
}
</style>