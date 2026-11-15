<template>
<td>
  <div class="row" v-if="dataItem.mediaIdForClean">
    <div class="col-4 text-center"><a @click="cleanFile">{{ $t('global.clean') }}</a></div>
    <div class="col-4 text-center" v-if="canDownload"><a @click="onDownload">{{ $t('global.download') }}</a></div>
    <div class="col-4 text-center" v-else><a class="ghost-text" @click="onDownload">{{ $t('global.download') }}</a></div>
    <div class="col-4 text-center" v-if="canDelete"><a @click="onDelete">{{ $t('button.delete') }}  </a></div>
    <div class="col-4 text-center" v-else><a class="ghost-text">{{ $t('button.delete') }}  </a></div>
  </div>
  <div class="row" v-else>
    <div class="col-6 text-center" v-if="canDownload"><a @click="onDownload">{{ $t('global.download') }}</a></div>
    <div class="col-6 text-center" v-else><a class="ghost-text" @click="onDownload">{{ $t('global.download') }}</a></div>
    <div class="col-6 text-center" v-if="canDelete"><a @click="onDelete">{{ $t('button.delete') }}</a></div>
    <div class="col-6 text-center" v-else><a class="ghost-text">{{ $t('button.delete') }}</a></div>
  </div>
</td>
</template>

<script lang='ts'>

import { defineComponent, onMounted, ref } from 'vue'
export default defineComponent({
  name: 'DownloadDeleteColumn',
  props: {
    dataItem: { type: Object, required: true },
    forEMIS: { type: Boolean, required: false},
    forSpend: { type: Boolean, required: false}
  },
  emits: ['clean-file','delete', 'download'],
  setup(props, { emit }) {
    const canDelete = ref(false)
    const canDownload = ref(false)
    onMounted(() => {
      canDownload.value = props.dataItem.mediaResult?.['@id'] ?? props.dataItem.media?.['@id'] ??  false
      canDelete.value = checkIfCanDeleteFile(props.dataItem)
      
    })

    const cleanFile = function() {
      emit('clean-file', props.dataItem.mediaIdForClean, typeOfFile())
    }
    
    const onDownload = function() {
      emit('download', props.dataItem)
    }

    const onDelete = function() {
      emit('delete', props.dataItem, typeOfFile() )
    }

    function checkIfCanDeleteFile(data: any) {
      if (data.status === 'ready' || data.status === 'loaded' || data.status === 'errorProcessing' ||  data.status === 'errorReCalculating' ) {
        return true
      } else { return false }
    }

    function typeOfFile(): "spend" | "compare" | "emis" {
      if (props.forEMIS) {
        return 'emis'
      } else {
        return props.forSpend ? 'spend' : 'compare'
      }
    }

    return {
      canDownload,
      canDelete,
      checkIfCanDeleteFile,
      cleanFile,
      onDelete,
      onDownload,
      typeOfFile
    }
  }
})
</script>

<style lang="scss" scoped>

</style>
