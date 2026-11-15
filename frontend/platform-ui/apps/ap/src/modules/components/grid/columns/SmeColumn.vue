<template>
  <td>    
    <Tooltip class='ellipsis_tooltip_custom_text' :open-delay='100' :anchor-element="'target'" :position="'bottom'">
      <div v-if="dataItem?.isSME" class="d-flex align-items-center justify-content-center text-center">
        <smeBadge class="sme-badge-icon column-icon" :title=" $t(`global.smeSource.tooltip${setSMESource}`) " />        
      </div>    
      
      <div v-else class="d-flex align-items-center justify-content-center text-center">
        <span class="type-company text-sm text-capitalize text-center">-</span>     
      </div>  
  </Tooltip>
  </td>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import smeBadge from "@/resources/assets/images/icons/smeBadge.vue";
import { IsSMEUtils } from "@/utils";
export default defineComponent({
  name: 'SmeColumn',
  components: {
    Tooltip, smeBadge
  },
  props: {
    dataItem: { type: Object, required: true }
  },
  setup( props ) {

    const setSMESource = computed(() => {
      return IsSMEUtils.generateSMESourceKey(props.dataItem.smeSource)
    })

    return {
      setSMESource
    }
  }
})

</script>