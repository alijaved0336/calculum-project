<template>
<td>
  <div class="row">
    <div class="col-6 text-center"><a @click="onDownload">{{ $t('global.download') }}</a></div>
    <div class="col-6 text-center"><a @click="onDelete">{{ $t('button.delete') }}</a></div>
  </div>
</td>
</template>

<script lang='ts'>

import { defineComponent} from 'vue'
export default defineComponent({
  name: 'DownloadDeleteColumn',
  props: {
    dataItem: { type: Object, required: true }
  },
  emits: ['delete', 'download'],
  setup(props, { emit }) {
    
    const onDownload = function() {
      emit('download', props.dataItem)
    }

    const onDelete = function() {
      emit('delete', props.dataItem)
    }

    return {
      onDownload,
      onDelete
    }
  }
})
</script>

<style lang="scss" scoped>

</style>
