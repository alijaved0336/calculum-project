<template>
   <td>
        <div class="text-left">
            <span :style="'float: left; margin-left: 2px; text-transform: capitalize;'"> {{ dataItem.countryName ?? '-' }} </span>
            <img :src="getFlag()" alt="dataItem.countryName" :style="'width: 2.2rem; float: right; margin-right: 2px;'" v-if="('flagUrl' in dataItem) && dataItem.countryName" />
        </div>
    </td>
</template>


<script lang="ts">
import { getNestedValue } from '@progress/kendo-vue-grid'
export default {
  name: 'FlagColumns',
  props: {
    forCompareAddCompanies: {type: Boolean, required: false},
    dataItem: { type: Object, required: true },
    field: { type: String, required: true }
  },
  setup (props: { dataItem: any }) {

    function getFlag () {
      return getNestedValue('flagUrl', props.dataItem)
    }

    return {
      getFlag
    }
  }
}
</script>

<style lang="scss" scoped>

</style>
