<template >
 <td class="custom-td-cell-for-grid">
  <span class="custom_cursor_pointer" @click="dataItem && $emit('show-modal', dataItem)"> {{getApprovedValue(dataItem?.status)}}</span>
</td> 
</template>
<script lang="ts">

import { defineComponent } from 'vue'
import { useI18n } from "vue-i18n";
export default defineComponent({
  name: "ActionDataColumn",
  props: {
    dataItem: {type: Object, required: false, default: undefined}
  },
  emits: ['show-modal'],
  setup(props) {
     const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    function getApprovedValue(item: any) {
        if (!item) {
          return '-'
        }
        const status = item.toLowerCase()
        if (status === 'pending') {
          return translate.t('global.pending')
        } else if (status === 'solved') {
          return translate.t('adminBackend.dataChange.solved')
        } else {
          return translate.t('global.rejected')
        }
    }
    return {
      getApprovedValue
    }
  },
})
</script>


<style lang="scss" scoped>

</style>