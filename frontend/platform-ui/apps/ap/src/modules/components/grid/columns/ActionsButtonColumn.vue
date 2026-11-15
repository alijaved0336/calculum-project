<!-- 
  ActionsButtonColumn component that shows Recalculate button based on file status
 -->
<template>
<td>
  <div class="col-12 text-center">
    <button class="btn-text text-gray-900" @click="onRecalculateClick" :class="isButtonEnabled ? `is-enabled` : `opacity-50 cursor-not-allowed`" :disabled="!isButtonEnabled">{{ $t('button.recalculate') }}</button>
  </div>
</td>
</template>

<script lang='ts'>
import { StringUtils, isNullOrUndefined } from '@/utils'
import { computed, defineComponent } from 'vue'

export default defineComponent({
  name: 'ActionsButtonColumn',
  props: {
    dataItem: { type: Object, required: true },
    text: { type: String, default: 'Actions' },
    enabled: { type: Boolean, default: true }
  },
  emits: ['click'],
  setup(props, { emit }) {

    function onRecalculateClick() {
      emit('click', { action: 'recalculate', dataItem: props.dataItem })
    }

    const isButtonEnabled = computed(() => {
      try {
        // Validate
        if (isNullOrUndefined(props.dataItem)) {
          throw new Error('dataItem is null or undefined')
        }

        if (isNullOrUndefined(props.dataItem.status)) {
          throw new Error('dataItem.status is null or undefined')
        }

        if (StringUtils.isNullUndefinedOrEmpty(props.dataItem.status)) {
          throw new Error('dataItem.status is null or undefined or empty')
        }

        // Show Recalculate if status is ready, errorCalculating, or errorReCalculating
        return ['ready', 'errorCalculating', 'errorReCalculating'].includes(props.dataItem.status)

      } catch (error) {
        if (import.meta.env.DEV) { console.error("** (isButtonEnabled)", error); }

        return false
      }
    })

    return {
      onRecalculateClick,
      isButtonEnabled
    }
  }
})
</script>

<style lang="scss" scoped>
button.is-enabled {
  &:hover {
    text-underline-position: under;
    text-decoration: underline;
  }
}
</style>

