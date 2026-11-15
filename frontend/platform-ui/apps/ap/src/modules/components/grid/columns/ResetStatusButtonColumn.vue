<!-- 
  ResetStatusButtonColumn component that shows Reset Status button based on file status
 -->
<template>
<td>
  <div class="col-12 text-center">
    <button class="btn-text text-gray-900" @click="onResetStatusClick" :class="isButtonEnabled ? `is-enabled` : `opacity-50 cursor-not-allowed`" :disabled="!isButtonEnabled">{{ $t('button.resetStatus') }}</button>
  </div>
</td>
</template>

<script lang='ts'>
import { StringUtils, isNullOrUndefined } from '@/utils'
import { computed, defineComponent } from 'vue'

export default defineComponent({
  name: 'ResetStatusButtonColumn',
  props: {
    dataItem: { type: Object, required: true },
    text: { type: String, default: 'Reset Status' },
    enabled: { type: Boolean, default: true }
  },
  emits: ['click'],
  setup(props, { emit }) {

    function onResetStatusClick() {
      emit('click', { action: 'reset-status', dataItem: props.dataItem })
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

        const status = props.dataItem.status
        
        // Check if Recalculate is available (statuses where Reset Status should also be available)
        const isRecalculateAvailable = ['ready', 'errorCalculating', 'errorReCalculating'].includes(status)
        
        if (isRecalculateAvailable) {
          // Show Reset Status when Recalculate is available
          return true
        }
        
        // Show Reset Status for other statuses (except excluded ones)
        return !['ready', 'deleteClaimed', 'errorProcessing', 'processing'].includes(status)

      } catch (error) {
        if (import.meta.env.DEV) { console.error("** (isButtonEnabled)", error); }

        return false
      }
    })

    return {
      onResetStatusClick,
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

