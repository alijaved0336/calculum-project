<template>
<td>
  <div class="col-12 text-center"><a @click="onDownload">{{ $t('global.download') }}</a></div>
</td>
</template>

<script lang='ts'>

import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DownloadColumn',
  props: {
    dataItem: { type: Object, required: true }
  },
  emits: ['download'],
  setup(props, { emit }) {
    const onDownload = function() {
      emit('download', props.dataItem)
    }

    return {
      onDownload
    }
  }
})
</script>

<style lang="scss" scoped>

</style>
