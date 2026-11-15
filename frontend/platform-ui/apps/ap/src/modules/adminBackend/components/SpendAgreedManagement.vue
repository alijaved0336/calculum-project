<template>
<CalculumLoading v-if="loadingData" :modal="true"></CalculumLoading>
<h3><span class="mr-2">{{ $t('global.spendAgreedManagement') }}</span></h3>
<div class="row">
  <div class="col-12">
    <div class="card" style="min-height: auto; height: auto">
      <div class="card-body">
        <div class="row mb-2">
          <div class="col-8 d-flex align-items-center">
            <h5 class="m-0">{{ $t('global.createCSV') }}</h5>
          </div>
          <div class="col-4 d-flex align-items-center">
            <div class="d-flex w-100 justify-content-end">
              <button class="btn btn-primary font-md" @click="downloadCSV()">{{ $t('global.download') }}                    </button>
            </div>
          </div>
        </div>
        <hr/>
        <div class="row mb-2">
          <div class="col-8 d-flex align-items-center">
            <h5 class="m-0">{{ $t('global.uploadCSV') }}    </h5>
          </div>
          <div class="col-4 d-flex align-items-center">
            <div class="d-flex w-100 justify-content-end">
              <input id="fileInputCSV" type="file" style="display: none" ref="fileInputCSV" accept=".xls, .xlsx, .csv" @change="addFiles" @click="inputResetFile"/>
              <button class="btn btn-primary font-md" @click="newFileCSV()">{{ $t('adminBackend.adminUploadData.uploadFile') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">

import { defineComponent, ref, toRefs, reactive } from "vue";
import { CalculumLoading } from '@ada/design-system'
import { useToast } from "vue-toastification";
import { useI18n } from "vue-i18n";
import { useSpendFilesStore } from '@/stores/spendFiles'

export default defineComponent({
    name: "SpendAgreedManagement",
    components: {
        CalculumLoading
    },
    setup() {
        const spendFilesStore = useSpendFilesStore();
        const fileInputCSV = ref();
        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });


        interface DataInterface{
            loadingData: boolean,
        }

        const data = reactive<DataInterface>({
            loadingData: false,
        })



        function inputResetFile() {
            if (fileInputCSV.value !== null) {
                fileInputCSV.value.value = "";
            }
            }

            function newFileCSV() {
      if (fileInputCSV.value !== null) {
        fileInputCSV.value.click();
      }
    }


    function addFiles(event: any): void {
        data.loadingData = true
        const params = {
        newFile: event.target.files[0],
        callbackSuccess: () => {
            data.loadingData = false
            useToast().success(translate.t("global.noty.success.upload.file"));
        },
        callbackError: () => {
            data.loadingData = false
            useToast().error(translate.t("global.modal.uploadFile.error"));
        },
      };

      spendFilesStore.postCSVFile(params);
    }


    function downloadCSV() {
      data.loadingData = true;
      const params = {        
        callbackSuccess: (response: any) => {
          data.loadingData = false;
          useToast().success(translate.t("global.noty.success.request.file"));
        },
        callbackError: () => {
          data.loadingData = false;
          useToast().error(translate.t("global.noty.error.download.file"));
        },
      };
      spendFilesStore.downloadCSVFile(params);
    }

    return {
        ...toRefs(data),
        addFiles,
        inputResetFile,
        newFileCSV,
        fileInputCSV,
        downloadCSV
    }
}
})
</script>

<style lang="scss" scoped>

</style>
