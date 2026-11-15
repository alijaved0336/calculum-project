<template>
<div style="margin-top: 60px;" v-if="router.currentRoute.value.name === Routing.admin.adminCompanySpendFiles"></div>
<CalculumModal v-if="showModalUploadFile" :size="'lg'" :showClose="true" :title="'Upload File'" @close="closeModalNReset">
  <template v-slot:modalContent>
    <p>{{ $t('global.selectAndUploadFileDate') }}</p>
    <div class="row container-form">
      <div class="col-6">
        <div class="form-group">
          <label for="startDateToFile">
            <input class="form-control" id="startDateToFile" type="date" name="startDateToFile" v-model="startDateToFile" @change="checkDate"/><span>* {{ $t('home.plan.startDate') }}</span>
          </label>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label for="endDateToFile">
            <input class="form-control" id="endDateToFile" type="date" name="endDateToFile" v-model="endDateToFile" @change="checkDate"/><span>* {{ $t('home.plan.programToPlan1.endDate') }}</span>
          </label><span class="error text-left errors-days" v-if="!validationDate && endDateToFile !== null">{{ $t("global.uploadFilesDateValidation") }}</span>
        </div>
      </div>
      <div class="col-12"><span class="text-sm"> {{ $t('global.beginningData') }}        </span></div>
      <div class="col-12 mt-3">
        <div class="d-flex flex-column"><span class="text-sm font-semibold">{{ $t('global.uploadFileInfo.sizeLimit', { size: maxSpendFileMb }) }}</span><span class="text-sm">{{ $t('global.uploadFileInfo.formats') }}</span><span class="text-sm mt-2">{{ $t('global.uploadFileInfo.splitAdvice', { size: maxSpendFileMb }) }}</span><span class="text-sm">{{ $t('global.uploadFileInfo.oneFileAtATime') }}</span></div>
      </div>
      <div class="col-8 mt-4"><span>{{ $t('home.entityCard.results.comments') }}</span>
        <textarea class="w-100 border border-gray-300" v-model="message" name="message" placeholder="Write some comments..." aria-label="Message" @keyup="checkDate"></textarea>
      </div>
      <div class="col-4 mt-2">
        <input class="form-control form-control-lg" id="fileInput" type="file" style="display: none" accept=".xls, .xlsx, .csv" @change="addFilesNValidate" @click="inputResetNewSpendFile"/>
        <div class="mt-2"><span class="upload-files-calculum mt-4" @click="newSpendFile()"><i class="fa-solid fa-upload"></i><span class="text-sm">{{ $t('global.chooseAFile') }}</span></span></div>
        <div class="d-flex"><span class="text-base">{{ fileName }}</span></div>
        <div class="d-flex flex-column"><span class="error text-left errors-days" v-if="errorSize">{{ $t("global.fileTooLargeMb", { size: maxSpendFileMb }) }}</span><span class="error text-left errors-days" v-if="errorMime">{{ $t("global.invalidFileType") }}</span></div>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="closeModalNReset" style="z-index: 1; width: fit-content"> <span>{{ $t('button.cancel') }} </span></button>
    <button class="btn btn-primary font-md" @click="submitForm()" :disabled="setStatusbutton" style="z-index: 1; width: fit-content"> <span>{{ $t('home.homeAllSpendFiles.buttons.selectSpendFile') }}</span></button>
  </template>
</CalculumModal>
<CalculumLoading v-if="loading || loadingNewSpendFile" :modal="true"></CalculumLoading>
<CalculumLayout :containerClass="'wizard-programs'">
  <template v-slot:slotContent>
    <div class="sub-main-sections">
      <div class="row">
        <div class="col">
          <div class="card">
            <div class="card-body">
              <div class="row">
                <div class="col-lg-3 col-xl-2 border-right">
                  <AdminMenuCompany :currentPage="'ManageFiles'" v-if="router.currentRoute.value.name === Routing.admin.adminCompanySpendFiles"></AdminMenuCompany>
                  <HomeMenuAccount :currentPage="'ManageFiles'" v-else></HomeMenuAccount>
                </div>
                <div class="col-lg-9 col-xl-10 p-5">
                  <div class="row">
                    <div class="col-lg-12 col-xl-12">
                      <h3 v-if="router.currentRoute.value.name === Routing.admin.adminCompanySpendFiles">{{ companyName }}</h3>
                      <div class="h6 font-weight-bold mb-5">{{ $t('home.components.menuAccount.manageSpendFile') }}
                        <CalculumTooltipIcon :infoText="$t('home.components.menuAccount.manageSpendFileTooltipDefault')" :advancedTooltipClass="true" :uniqueIdentifier="'popover-preferences-managefile'" :keyPopOver="'preferencesManageFile'"></CalculumTooltipIcon>
                      </div>
                      <div class="d-flex gap-2">
                        <button class="btn btn-primary font-md" @click="showModalUploadFile = true"> <span>{{ $t('global.uploadFile') }}</span></button><a class="btn btn-file-actions font-md" :href="urlSpendTemplate" download="download"><span>{{ $t('button.downloadSpendFileTemplate') }}</span></a>
                      </div>
                    </div>
                  </div>
                  <div class="row mt-4" v-if="isAdminUser">
                    <div class="col-12">
                      <div class="card" style="min-height: auto; height: auto">
                        <div class="card-body">
                          <div class="d-flex justify-content-between align-items-center mb-3">
                            <h5 class="m-0 d-flex gap-2 align-items-center"><span>{{ $t('adminBackend.adminUploadData.spendFile') }}                              </span></h5>
                          </div>
                          <div class="row">
                            <div class="col-12" id="company-files-grid">
                              <CalculumGrid :gridColumns="defaultSpendFilesGridColumns" :gridData="spendFilesVersionsGridData" :hideColumnSelector="true" :selectable="false" :showToolbar="false" :allowExportExcel="false" :defaultPageSize="5" :pagingSizeCustomArray="[5, 10, 25, 50, 100, 150, 175]"></CalculumGrid>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="row" v-if="spendFileErrorMessage.length > 0">
                    <div class="col-12">
                      <div class="alert alert-danger"><span>{{ spendFileErrorMessage }}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  <button id="waitingEmailButton" data-toggle="modal" data-target="#waitingEmail" style="display: none"></button>
  <div class="modal fade" id="waitingEmail" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <h4 class="m-0">{{ $t('home.homeAllSpendFiles.modalTitle') }}</h4>
          <svg class="icon-svg__button-18" data-dismiss="modal" aria-label="Close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M22.664,5.578a1.5,1.5,0,0,0,0-2.121L20.543,1.336a1.5,1.5,0,0,0-2.122,0L12.177,7.581a.251.251,0,0,1-.354,0L5.579,1.336a1.5,1.5,0,0,0-2.122,0L1.336,3.457a1.5,1.5,0,0,0,0,2.121l6.245,6.245a.252.252,0,0,1,0,.354L1.336,18.422a1.5,1.5,0,0,0,0,2.121l2.121,2.121a1.5,1.5,0,0,0,2.122,0l6.244-6.245a.251.251,0,0,1,.354,0l6.244,6.245a1.5,1.5,0,0,0,2.122,0l2.121-2.121a1.5,1.5,0,0,0,0-2.121l-6.245-6.245a.252.252,0,0,1,0-.354Z"></path>
          </svg>
        </div>
        <div class="modal-body">
          <div class="alert alert-success alertTextCenter" role="alert">
            <h6>{{ isNecessaryRemoveAdaReferences ? $t('home.homeAllSpendFiles.modalBodyWithoutADA') : $t('home.homeAllSpendFiles.modalBody') }}</h6>
          </div>
        </div>
      </div>
    </div>
  </div>
</CalculumLayout>
</template>

<script lang='ts'>
import { computed, reactive, toRefs, watch, ref } from 'vue'
import { useSpendFilesStore } from '@/stores/spendFiles'
import { CalculumLoading, CalculumLayout } from '@ada/design-system'
import { fontIcons, images } from '@/resources/assets/assets'
import HomeMenuAccount from '../components/HomeMenuAccount.vue'
import * as formatData from '@/utils/FormatData'
import * as Routing from '@/services/router/Routing'
import CalculumGrid from '@/modules/components/grid/CalculumGrid.vue'
import AdminMenuCompany from '@/modules/adminBackend/components/AdminMenuCompany.vue'
import router from '@/services/router/index'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import { useCompany, useSpendFile, useUser } from '@/composables'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import * as Validator from "@/utils/validators";
import { useI18n } from "vue-i18n";
import { DateUtils, ObjectUtils, StringUtils, NumberUtils, isNullOrUndefined } from "@/utils";
import { useToast } from "vue-toastification";
import IconSync from "@/resources/assets/images/icons/IconSync.vue";
import ButtonIconStandard from "@/modules/components/ButtonIconStandard.vue";
import { defaultSpendFilesVersionsGridColumns } from "@/modules/adminBackend/data/columns";
import * as cacheGrid from "@/utils/dataGridClear";
import { useAdminBackendStore } from '@/stores/adminBackend'
import { MAX_SPEND_FILE_BYTES, MAX_SPEND_FILE_MB } from '@/utils/uploadLimits'

export default {
  name: 'HomeAllSpendFiles',
  components: {
    CalculumLoading,
    HomeMenuAccount,
    CalculumGrid,
    AdminMenuCompany,
    CalculumLayout,
    CalculumTooltipIcon,
    CalculumModal,
    IconSync,
    ButtonIconStandard
  },
  props: {
    spendFileId: { type: String, required: false, default: '' }
  },
  setup(props: any) {
    const adminBackendStore = useAdminBackendStore()
    const spendFilesStore = useSpendFilesStore()

    const { user, userIsSuperAdmin, userIsAdmin } = useUser();

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    const { companyActiveId, companyActiveName, isNecessaryRemoveAdaReferences } = useCompany();

    const { spendFileVersionActiveName, spendFileVersionActiveIri } = useSpendFile();

    const toast = useToast();

    const isAdminUser = computed(() => {

      return userIsSuperAdmin.value || userIsAdmin.value
    })

    interface HomeAllSpendFiles {
      files: Array<any>,
      fileInput: Array<any>,
      fileID: string,
      filesVersions: Array<any>,
      selectFile: string,
      selectFileName: string,
      companyTitle: string,
      versionToDelete: any,
      loading: boolean,
      loadingNewSpendFile: boolean,
      spendFileErrorMessage: string,
      loadingDownloadFile: any,
      alertMessage: string,
      urlSpendTemplate: string,
      filesGrid: Array<any>,
      companyName: string,
      showModalUploadFile: boolean,
      endDateToFile: string | null,
      startDateToFile: string | null,
      validationDate: boolean,
      message: string | null,
      allowedMimeTypes: Array<any>,
      maxFileSize: number,
      isAValidFile: boolean,
      file: any | null,
      errorSize: boolean,
      errorMime: boolean,
      fileName: string,
      // Propiedades adicionales para el grid
      spendFilesVersionsRecalculateTrackingNumber: number,
      spendFilesVersionsGridDataSelectedItems: Array<any>,
      defaultSpendFilesGridColumns: Array<any>
    }

    const data = reactive<HomeAllSpendFiles>({
      files: [],
      fileInput: [],
      fileID: '',
      filesVersions: [],
      selectFile: spendFileVersionActiveIri.value,
      selectFileName: spendFileVersionActiveName.value,
      companyTitle: companyActiveName.value,
      versionToDelete: '',
      loading: false,
      loadingNewSpendFile: false,
      spendFileErrorMessage: '',
      loadingDownloadFile: null,
      alertMessage: '',
      urlSpendTemplate: spendFilesStore.getUrlSpendTemplateDownload,
      filesGrid: [],
      companyName: companyActiveName.value,
      showModalUploadFile: false,
      endDateToFile: null,
      startDateToFile: null,
      validationDate: false,
      message: null,
      allowedMimeTypes: [
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'text/csv', // .csv
        'application/csv'
      ],
      maxFileSize: MAX_SPEND_FILE_BYTES,
      isAValidFile: false,
      file: null,
      errorSize: false,
      errorMime: false,
      fileName: '',
      // Propiedades adicionales para el grid
      spendFilesVersionsRecalculateTrackingNumber: NumberUtils.getRandomInt(),
      spendFilesVersionsGridDataSelectedItems: [],
      defaultSpendFilesGridColumns: getGridSpendFilesColumns()
    })

    const filesComputed = computed(() => {
      return data.files.filter(file => file.processing === false)
    })
    const fileVersionsComputed = computed(() => {
      return data.filesVersions.filter(file => file.processing === false && file.isProcessedWithNoErrors === true)
    })



    async function addFilesNValidate(event: any) {

      const file = event.target.files[0];
      data.errorMime = false
      data.errorSize = false

      if (!file) return;

      data.fileName = file.name
      const isValid = await ObjectUtils.validateFileType(file, data.allowedMimeTypes);

      if (!isValid) {
        data.loadingNewSpendFile = false;
        data.isAValidFile = false
        data.errorMime = true
        return
      }

      if (file.size > data.maxFileSize) {
        data.loadingNewSpendFile = false;
        data.errorSize = true
        data.isAValidFile = false
        return
      }

      //- If is a valida file we set the file to file variable
      data.isAValidFile = true
      data.file = event.target.files[0]
    }


    function submitForm() {

      data.loadingNewSpendFile = true;
      data.showModalUploadFile = false;
      data.spendFileErrorMessage = '';

      const params = {
        file: data.file,
        companyUUID: companyActiveId.value,
        endDate: data.endDateToFile,
        startDate: data.startDateToFile,
        message: data.message,
        userName: user.value?.firstName + ' ' + user.value?.lastName,
        email: user.value?.email,
        companyName: companyActiveName.value,
        invitationId: null,
        callbackSuccess: () => {
          data.loadingNewSpendFile = false
          closeModalNReset()
          const fileDOM: any | null = document.getElementById('waitingEmailButton')
          if (fileDOM !== null) {
            fileDOM.click()
          }
          toast.success(translate.t('global.successUpdatingSpendFile'));
          spendFilesVersionsGridDataRefresh()
        },
        callbackError: () => {
          toast.error(translate.t('global.errorUpdatingSpendFile'));
        }
      }

      spendFilesStore.postSpendFileCompany(params)
    }

    function download(version: any) {
      data.loadingDownloadFile = version
      const params = {
        mediaID: version.media['@id'],
        callbackSuccess: (response: any) => {
          const url = window.URL.createObjectURL(new Blob([response]))
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', `${version.media.originalFileName}`)
          document.body.appendChild(link)
          link.click()
          data.loadingDownloadFile = null
        },
        callbackError: () => {
          toast.error(translate.t('global.errorUpdatingSpendFile'));
        }
      }
      spendFilesStore.getMediaFileVersion(params)
    }

    function inputResetNewSpendFile() {
      const fileDOM: any | null = document.getElementById('fileInput')
      if (fileDOM !== null) {
        fileDOM.value = ''
      }
    }


    function newSpendFile() {
      inputResetNewSpendFile()
      const fileDOM: any | null = document.getElementById('fileInput')
      if (fileDOM !== null) {
        fileDOM.click()
      }
    }


    function checkDate() {
      if (
        (data.endDateToFile === null || !Validator.isValidString(data.endDateToFile)) ||
        (data.startDateToFile === null || !Validator.isValidString(data.startDateToFile))
      ) {
        data.validationDate = false
      } else {
        const startDate: Date | null = DateUtils.parseDateValidation(data.startDateToFile);
        const endDate: Date | null = DateUtils.parseDateValidation(data.endDateToFile);

        if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          data.validationDate = false;
          return;
        }

        const minValidEndDate = new Date(startDate);
        minValidEndDate.setFullYear(minValidEndDate.getFullYear());
        data.validationDate = endDate > minValidEndDate;
      }
    }

    function closeModalNReset() {
      data.endDateToFile = null
      data.startDateToFile = null
      data.message = null
      data.showModalUploadFile = false
      data.fileName = ''
      data.isAValidFile = false
      data.validationDate = false

    }

    const setStatusbutton = computed(() => {
      return !data.isAValidFile || !data.validationDate
    })


    const spendFilesVersionsByCompany = ref<any[]>([]);

    const spendFilesVersionsGridData = computed(() => {
      try {
        if (isNullOrUndefined(spendFilesVersionsByCompany.value)) {
          throw new Error("spendFilesVersionsByCompany is null or undefined");
        }

        let filesToProcess = [...spendFilesVersionsByCompany.value];

        filesToProcess.sort((a, b) => {
          return new Date(b.created).getTime() - new Date(a.created).getTime();
        });

        return filesToProcess

      } catch (error) {
        if (import.meta.env.DEV) console.error("** (spendFilesVersionsGridData)", error);
        return [];
      }
    });

    function getGridSpendFilesColumns() {
      let resetcolumns = [];
      const gridCache = JSON.parse(
        localStorage.getItem("HomeAllSpendFiles") ?? "[]"
      );

      if (
        gridCache.length &&
        JSON.stringify(defaultSpendFilesVersionsGridColumns) !== JSON.stringify(gridCache)
      ) {
        resetcolumns = cacheGrid.clearCache(
          defaultSpendFilesVersionsGridColumns,
          gridCache
        );
        localStorage.setItem("HomeAllSpendFiles", JSON.stringify(resetcolumns));
      } else {
        resetcolumns = defaultSpendFilesVersionsGridColumns;
      }
      return resetcolumns;
    }

    function spendFilesVersionsGridDataRefresh() {
      if (companyActiveId.value && isAdminUser.value) {
        spendFilesVersionsByCompanyAPIReadAll();
      }
    }


    function spendFilesVersionsByCompanyAPIReadAll() {
      try {
        if (StringUtils.isNullUndefinedOrEmpty(companyActiveId.value)) {
          throw new Error("companyActiveId is null, undefined or empty");
        }

        data.loading = true;

        const params = {
          companyId: StringUtils.removeIRI(companyActiveId.value),
          callbackSuccess: (response: any) => {
            spendFilesVersionsByCompany.value = response['hydra:member'];
            data.loading = false;
          },
          callbackError: (callbackErrorData: unknown) => {
            if (import.meta.env.DEV) console.error("** (spendFilesVersionsByCompanyAPIReadAll) callbackErrorData:", callbackErrorData);
            data.loading = false;
          },
        };

        adminBackendStore.getCompanyFiles(params);
      } catch (error) {
        if (import.meta.env.DEV) console.error("** (spendFilesVersionsByCompanyAPIReadAll)", error);
      }
    }

    watch(() => companyActiveId.value, () => {
      if (companyActiveId.value) {
        spendFilesVersionsGridDataRefresh();
      }
    });

    if (companyActiveId.value) {
      spendFilesVersionsGridDataRefresh();
    }

    return {
      ...toRefs(data),
      fontIcons,
      images,
      formatData,
      addFilesNValidate,
      download,
      inputResetNewSpendFile,
      newSpendFile,
      Routing,
      router,
      filesComputed,
      fileVersionsComputed,
      checkDate,
      closeModalNReset,
      submitForm,
      setStatusbutton,
      // Grid
      spendFilesVersionsGridData,
      spendFilesVersionsGridDataRefresh,
      isAdminUser,
      isNecessaryRemoveAdaReferences,
      maxSpendFileMb: MAX_SPEND_FILE_MB
    }
  }

}
</script>

<style lang="scss" scoped>
.card {
  height: 100% !important;
}

.card--full .card__body {
  margin-bottom: 0 !important;
}

.container-table.show-scroll.show-scroll--auto {
  overflow: scroll;
  height: calc(20em - 5em) !important;
}

textarea {
  overflow: auto;
  resize: vertical;
  height: 100px;
}
</style>
