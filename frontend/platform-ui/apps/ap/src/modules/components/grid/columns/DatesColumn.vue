<template>
<td>
  <div class="text-center"><span> {{ formatedDates() }}</span></div>
</td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import * as formatData from '@/utils/FormatData'
import { getNestedValue } from '@progress/kendo-vue-grid'
import { useI18n } from 'vue-i18n'

export default defineComponent({
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true }
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    function formatedDates() {
      const getDate = getNestedValue(props.field, props.dataItem)
      if (getDate !== null && getDate !== undefined){        
        let splitDate = getNestedValue(props.field, props.dataItem).split(',')
        if (splitDate.length > 1) {
            return translate.t('tableStatus.multiple')
        } else {
          return formatData.getISODate(getNestedValue(props.field, props.dataItem))
        }
      } else {
        return '-'
      }      
    }

    return {
      formatedDates
    }
  }
})
</script>

<style lang="scss" scoped></style>
