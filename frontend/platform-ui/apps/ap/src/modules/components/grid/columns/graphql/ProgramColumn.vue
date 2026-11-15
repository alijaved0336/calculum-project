<template>
  <td class="text-center">
    <tooltip class="ellipsis_tooltip_custom_text pointer" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
      <p :title="dataItem.isActive ? dataItem.activeProgram : returnEntityType(dataItem.entityType)" class="pt-3 ml-2 ellipsis_custom active-program-cell" v-if="dataItem.activeProgram !== $t('tableStatus.multiple')">
        {{ dataItem.activeProgram }}
      </p>
      <p :title="dataItem.isActive ? dataItem.activeProgram : $t('tableStatus.notAssignedHoverMultiple')" v-else class="pt-3 ml-2 ellipsis_custom active-program-cell">
        {{ dataItem.activeProgram }}
      </p>
    </tooltip>
  </td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { useI18n } from 'vue-i18n'

export default defineComponent({
  name: 'ProgramColumn',
  components: { Tooltip },
  props: {
    dataItem: { type: Object, required: true }
  },
  setup( props ) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    function returnEntityType(entityType: string) {
      if (entityType === 'supplier') {
        return translate.t('tableStatus.notAssignedHover')
      } else if (entityType === 'parent') {
        return translate.t('tableStatus.notAssignedHoverParent')
      } else {
        return translate.t('tableStatus.notAssignedHover')
      }
    }
    return {
      returnEntityType
    }
  }
})
</script>
