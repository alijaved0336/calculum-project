<template>
  <td>
    <Tooltip
      v-if="showTooltip"
      class="ellipsis_tooltip_custom_text"
      :open-delay="100"
      :anchor-element="'target'"
      :position="'bottom'"
    >
      <span :title="dataItem.sourceReference">{{ label }}</span>
    </Tooltip>
    <span v-else>{{ label }}</span>
  </td>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { useI18n } from 'vue-i18n'

export default defineComponent({
  name: 'HistoricalSourceColumn',
  components: { Tooltip },
  props: {
    dataItem: { type: Object, required: true },
  },
  setup(props) {
    const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    const label = computed(() => {
      const source = props.dataItem.source
      if (source === 'spend_file') return t('home.entityCard.historicalData.source.spend_file')
      if (source === 'user_input') return t('home.entityCard.historicalData.source.user_input')
      if (source === 'api') return t('home.entityCard.historicalData.source.api')
      return source ?? '-'
    })

    const showTooltip = computed(() => {
      const source = props.dataItem.source
      return (source === 'spend_file' || source === 'user_input') && !!props.dataItem.sourceReference
    })

    return { label, showTooltip }
  },
})
</script>
