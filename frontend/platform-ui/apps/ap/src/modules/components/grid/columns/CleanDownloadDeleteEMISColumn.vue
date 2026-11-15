<template>
<td>
  <div class="row" v-if="canClean">
    <div class="col-4 text-center"><a @click="cleanFile">{{ $t('global.clean') }}</a></div>
    <div class="col-4 text-center" v-if="canDownload && dataItem.status === 'ready'"><a @click="onDownload">{{ $t('global.download') }}</a></div>
    <div class="col-4 text-center" v-else><a class="ghost-text">{{ $t('global.download') }}</a></div>
    <div class="col-4 text-center" v-if="canDelete"><a @click="onDelete">{{ $t('button.delete') }}  </a></div>
    <div class="col-4 text-center" v-else><a class="ghost-text">{{ $t('button.delete') }}  </a></div>
  </div>
  <div class="row" v-else>
    <div class="col-4 text-center"><a class="ghost-text">{{ $t('global.clean') }}</a></div>
    <div class="col-4 text-center" v-if="canDownload && dataItem.status === 'ready'"><a @click="onDownload">{{ $t('global.download') }}</a></div>
    <div class="col-4 text-center" v-else><a class="ghost-text">{{ $t('global.download') }}</a></div>
    <div class="col-4 text-center" v-if="canDelete"><a @click="onDelete">{{ $t('button.delete') }}</a></div>
    <div class="col-4 text-center" v-else><a class="ghost-text">{{ $t('button.delete') }}</a></div>
  </div>
</td>
</template>

<script lang='ts'>

import { defineComponent, onMounted, ref } from 'vue'
export default defineComponent({
  name: 'CleanDownloadDeleteEMISColumn',
  props: {
    dataItem: { type: Object, required: true },
    forEMIS: { type: Boolean, required: false},
    forSpend: { type: Boolean, required: false}
  },
  emits: ['clean-file','delete', 'download'],
  setup(props, { emit }) {
    const canDelete = ref(false)
    const canClean = ref(false)
    const canDownload = ref(false)
    onMounted(() => {
      
      // cant clean and download if processing status
      canClean.value = (props.dataItem.mediaResult?.['@id'] ?? props.dataItem.media?.['@id'] ??  false) && checkIfCanClean(props.dataItem)
      canDownload.value = props.dataItem.mediaResult?.['@id'] ?? props.dataItem.media?.['@id'] ??  false
      canDelete.value = checkIfCanDeleteFile(props.dataItem)
    })

    const cleanFile = function() {
      emit('clean-file', props.dataItem.mediaResult?.['@id'] ?? props.dataItem.media?.['@id'], typeOfFile())
    }
    
    const onDownload = function() {
      emit('download', props.dataItem)
    }

    const onDelete = function() {
      emit('delete', props.dataItem, typeOfFile() )
    }
    function checkIfCanClean(data : any) {
      if (data.status === 'ready' || data.status === 'errorProcessing' ||  data.status === 'errorReCalculating') {
        return true
      } else { return false }
    }

    function checkIfCanDeleteFile(data: any) {
      if (data.status === 'ready' || data.status === 'loaded' || data.status === 'errorProcessing' ||  data.status === 'errorReCalculating') {
        return true
      } else { return false }
    }

    function typeOfFile() {
      if (props.forEMIS) {
        return 'emis'
      } else {
        return props.forSpend ? 'spend' : 'compare'
      }
    }

    return {
      canClean,
      canDownload,
      canDelete,
      checkIfCanDeleteFile,
      cleanFile,
      checkIfCanClean,
      onDelete,
      onDownload,
      typeOfFile
    }
  }
})
</script>

<style lang="scss" scoped>

</style>
