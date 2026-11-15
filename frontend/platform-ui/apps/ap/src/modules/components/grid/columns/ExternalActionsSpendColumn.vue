<!-- 
  ButtonColumn variant
 -->
<template>
<td>
  <div class="col-12 text-center">
    <button class="btn-text text-gray-900" @click="onClick" :class="isEnabled ? `is-enabled` : `opacity-50 cursor-not-allowed`" :disabled="!isEnabled">{{ $t('adminBackend.adminUploadData.table.denominatorMatch') }}</button>
  </div>
</td>
</template>

<script lang='ts'>

import { StringUtils, isNullOrUndefined } from '@/utils'
import { computed, defineComponent } from 'vue'

export default defineComponent({
  name: 'ExternalActionsSpendColumn',
  props: {
    dataItem: { type: Object, required: true },
    text: { type: String, required: true },
    enabled: { type: Boolean, required: true, default: true }
  },
  emits: ['click'],
  setup(props, { emit }) {
    const onClick = function () {
      emit('click', props.dataItem)
    }

    const isEnabled = computed(() => {
      try {// Validate
        if (isNullOrUndefined(props.dataItem)) {
          throw new Error('dataItem is null or undefined')
        }

        if (isNullOrUndefined(props.dataItem.status)) {
          throw new Error('dataItem.status is null or undefined')
        }

        if (StringUtils.isNullUndefinedOrEmpty(props.dataItem.status)) {
          throw new Error('dataItem.status is null or undefined or empty')
        }

        // True if status is ready
        return ['ready'].includes(props.dataItem.status)

      } catch (error) {
        if (import.meta.env.DEV) { console.error("** (isEnabled)", error); }

        return false
      }
    })

    return {
      onClick,
      isEnabled
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