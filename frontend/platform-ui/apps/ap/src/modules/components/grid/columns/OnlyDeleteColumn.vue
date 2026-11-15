<template>
<CalculumModal v-if="showModal" @close="showModal = false" :size="'md'" :showClose="true" :title="$t('global.addSpendFile')">
  <template v-slot:modalContent>
    <div v-if="!isSupplier"><span>Uploading the updated Spend File to the current</span><span class="mx-2 font-semibold">{{ dataItem.spendFileName }}</span><span>will replace existing matching data, add unmatched data, and initiate recalculation.</span>
      <div class="row w-100 mt-2">
        <div class="col-12">
          <div class="d-flex">
            <input class="radio-btn mr-2 cursor-pointer" id="update-upload-type" v-model="uploadType" type="radio" name="access" value="smallFix"/>
            <div class="d-flex align-items-center"><span class="cursor-pointer" @click="uploadType = 'smallFix'">{{ $t('global.smallFix') }}</span></div>
          </div>
          <div class="d-flex">
            <input class="radio-btn mr-2 cursor-pointer" id="update-upload-type-full" v-model="uploadType" type="radio" name="access" value="fullUpdate"/>
            <div class="d-flex align-items-center"><span class="cursor-pointer" @click="uploadType = 'fullUpdate'">{{ $t('global.fullUpdate') }}</span></div>
          </div>
        </div>
      </div>
    </div>
    <p v-if="isSupplier"><span>This will update and recalculate the Potential Suppliers of the Spend File.</span><span class="mx-2 font-semibold">{{ dataItem.spendFileName }}      </span></p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="inputResetNewSpendFile" style="z-index: 1; width: fit-content"><span>{{ $t('button.cancel') }}</span></button>
    <button class="btn btn-primary font-md" @click="postSpendFile" style="z-index: 1; width: fit-content"><span>{{ $t('button.uploadandRecalculate') }}    </span></button>
  </template>
</CalculumModal>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<td>
  <div class="row d-flex align-items-center">
    <div class="col text-center" v-if="forSpend && dataItem.status === 'ready' && canDownloadSpendFile"><a @click="downloadSpendFile">{{ $t('global.download') }}</a></div>
    <div class="col text-center" v-if="dataItem.mediaIdForClean"><a @click="cleanFile">{{ $t('global.clean') }}</a></div>
    <div class="col text-center" v-if="canDelete"><a :id="'delete-spend-file-' + removeIRI(dataItem.iri)" @click="onDelete">{{ $t('button.delete') }}</a></div>
    <div class="col text-center" v-else><a class="ghost-text">{{ $t('button.delete') }}            </a></div>
    <div class="col text-center" v-if="forSpend && dataItem.status === 'ready'">
      <input :id="`fileInputSpendAdd${dataItem.companyName}${dataItem.uuid}${dataItem.version}`" type="file" style="display: none" @change="addSpendFiles" @click="inputResetNewSpendFile"/><a @click="addFile()">{{ $t('button.update') }}</a>
    </div>
    <div class="col text-center" v-if="forSpend && dataItem.status === 'ready'">
      <input :id="`fileInputSpendAdd${dataItem.companyName}${dataItem.uuid}${dataItem.version}`" type="file" style="display: none" @change="addSpendFiles" @click="inputResetNewSpendFile"/><a @click="addFile(true)">{{ $t('button.uploadPotential') }}      </a>
    </div>
  </div>
</td>
</template>

<script lang='ts'>
import { defineComponent, reactive, toRefs, computed } from 'vue'

import { StringUtils, removeIRI, NumberUtils } from '@/utils'

import { Tooltip } from '@progress/kendo-vue-tooltip'
import { useI18n } from "vue-i18n";
import { CalculumLoading } from '@ada/design-system'
import { useSpendFilesStore } from '@/stores/spendFiles'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { useToast } from "vue-toastification";
import KendoCheckbox from "@/modules/components/checkbox/KendoCheckbox.vue";
import { useUser } from '@/composables';


export default defineComponent({
  name: 'OnlyDeleteColumn',
  components: { Tooltip, CalculumModal, CalculumLoading, KendoCheckbox },
  props: {
    dataItem: { type: Object, required: true },
    forSpend: { type: Boolean, required: false },
    forCompare: { type: Boolean, required: false }
  },
  emits: [
    'delete',
    'download',
    'clean-file',
    'reload-spendfiles'
  ],
  setup(props, { emit }) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const spendFilesStore = useSpendFilesStore();
    const toast = useToast();    
    const { userIsSuperAdmin } = useUser();

    const canDownloadSpendFile = computed(() => {      
      return userIsSuperAdmin.value
    })

    interface DataUploadData {
      file: any,
      showModal: boolean,
      loading: boolean,
      isSupplier: boolean,
      keyReactive: number,
      uploadType: string
    }

    const data = reactive<DataUploadData>({
      file: '',
      showModal: false,
      loading: false,
      isSupplier: false,
      keyReactive: NumberUtils.getRandomInt(),
      uploadType: 'smallFix'
    })


    const spendFileVersion = computed(() => {
      if ("@id" in props.dataItem) {
        return props.dataItem['@id'];
      } else {
        return props.dataItem.iri;
      }
    })

    // *** Delete ***

    const canDelete = computed(() => {
      const status = props.dataItem.status;

      return status === 'ready'
        || status === 'loaded'
        || status === 'errorProcessing'
        || status === 'errorReCalculating'
        || status === 'errorUpdating'
        || status === 'errorCalculating'
        || status === 'errorUpdating'
        || status === 'updateClaimed'
        || status === 'recalculateClaimed'
        || status === 'deleteClaimed'
    })

    const onDelete = function () {
      emit('delete', props.dataItem, props.forSpend ? 'spend' : 'compare')
    }

    // *** END Delete ***

    // *** Add ***

    function addFile(action: boolean = false) {
      /** Use the company name + uuid + version, to create an unique id for the correct input */
      data.isSupplier = action

      const stringInputFile = 'fileInputSpendAdd' + props.dataItem.companyName + props.dataItem.uuid + props.dataItem.version
      const fileDOM: any | null = document.getElementById(stringInputFile)

      if (fileDOM !== null) {
        fileDOM.click()
      }
    }

    function inputResetNewSpendFile() {
      data.showModal = false
      data.uploadType = 'smallFix'
      const stringInputFile = 'fileInputSpendAdd' + props.dataItem.companyName + props.dataItem.uuid + props.dataItem.version
      const fileDOM: any | null = document.getElementById(stringInputFile)

      if (fileDOM !== null) {
        fileDOM.value = ''
      }
    }

    function addSpendFiles(event: any) {
      data.file = event.target.files[0]

      data.showModal = true
    }

    function postSpendFile(): void {
      try {
        data.showModal = false

        data.loading = true

        const companyUUID = StringUtils.removeIRI(props.dataItem.company)

        // Validate
        if (StringUtils.isNullUndefinedOrEmpty(companyUUID)) {
          throw new Error("companyUUID is null, undefined or empty")
        }

        const newFile = data.file

       

        const params = {
          file: newFile,
          companyUUID,
          spendFileVersion: spendFileVersion.value,
          isSupplier: data.isSupplier,
          uploadType: data.isSupplier ? null : data.uploadType,
          callbackSuccess: () => {
            data.loading = false
            toast.success(translate.t('global.successfullySaved'));
            emit('reload-spendfiles')
          },
          callbackError: (callbackErrorData: any) => {
            data.loading = false;

            toast.error(translate.t('global.noty.errorUpdatingData'));
            emit('reload-spendfiles')
          }
        }

        spendFilesStore.postSpendFile(params as any)
      } catch (error) {
        if (import.meta.env.DEV) console.error("** (postSpendFile)", error)
      }
    }

    // *** END Add ***

    const onDownload = function () {
      emit('download', props.dataItem)
    }

    const cleanFile = function () {
      emit('clean-file', props.dataItem.mediaIdForClean, props.forSpend ? 'spend' : 'compare')
    }

    const downloadSpendFile = function () {
      data.loading = true      
      const params = {
          actualFile: spendFileVersion.value,          
          callbackSuccess: () => {
            data.loading = false
            toast.success(translate.t('global.exportedSuccessfully'));            
          },
          callbackError: (callbackErrorData: any) => {
            data.loading = false;
            toast.error(translate.t('global.errorExportingData'));
          }
        }
      spendFilesStore.getSpendFileUploadableFormat(params as any)
      
    }

    return {
      ...toRefs(data),
      addFile,
      addSpendFiles,
      canDelete,
      canDownloadSpendFile,
      cleanFile,
      inputResetNewSpendFile,
      onDelete,
      onDownload,
      postSpendFile,
      removeIRI,
      downloadSpendFile,
      userIsSuperAdmin
    }
  }
})
</script>

<style lang="scss" scoped>
.ghost-text {
  opacity: 0.2;
  cursor: default;
}
</style>
