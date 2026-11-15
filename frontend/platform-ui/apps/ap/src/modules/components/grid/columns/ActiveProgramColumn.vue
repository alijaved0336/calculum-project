<template>
  <td class="text-center">
    <tooltip class="ellipsis_tooltip_custom_text pointer" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
      <p :title="dataItem.isActive ? dataItem.nameProgramActive : returnEntityType(dataItem.entityType)" class="pt-3 ml-2 ellipsis_custom active-program-cell" v-if="dataItem.nameProgramActive !== $t('tableStatus.multiple')">
        {{ dataItem.nameProgramActive }}
      </p>
      <p :title="dataItem.isActive ? dataItem.nameProgramActive : $t('tableStatus.notAssignedHoverMultiple')" v-else class="pt-3 ml-2 ellipsis_custom active-program-cell">
        {{ dataItem.nameProgramActive }}
      </p>
    </tooltip>
  </td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { useI18n } from 'vue-i18n'

export default defineComponent({
  name: 'ActiveProgramColumn',
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
