<template>
<body class="sidebar-show">
  <MenuAdmin :showItems="false"></MenuAdmin>
  <main class="main-content">
    <NavbarAdmin :normalLogout="false"></NavbarAdmin>
    <section class="page-content">
      <CalculumLoading v-if="loading || loadingValidation" :modal="true"></CalculumLoading>
      <div class="row px-4 mb-4 mt-12">
        <div class="col-12 d-flex align-items-center">
          <CalculumModal v-if="showModalUploadFile" :size="'lg'" :showClose="true" :title="$t('global.uploadFile')" @close="closeModalNReset">
            <template v-slot:modalContent>
              <p>{{  $t('global.selectAndUploadFileDate') }}</p>
              <div class="row container-form">
                <div class="col-6">
                  <div class="form-group">
                    <label for="userName">
                      <input class="form-control" id="userName" type="text" name="userName" v-model="userName" :placeholder="$t('home.homeHelpSupport.enterYourName')" @keyup="checkFields"/><span>* {{ $t('global.name') }}</span>
                    </label>
                  </div>
                </div>
                <div class="col-6">
                  <div class="form-group">
                    <label for="email">
                      <input class="form-control" id="email" type="email" name="email" v-model="email" :placeholder="$t('home.homeHelpSupport.emailPlaceholder')" @keyup="checkFields"/><span>* {{ $t('global.email') }}</span>
                    </label><span class="error text-left errors-days" v-if="!Validator.isValidEmail(email) && email !== null ">{{ $t("global.validEmail") }}</span>
                  </div>
                </div>
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
                    </label><span class="error text-left errors-days" v-if="!validationDate && endDateToFile !== null ">{{ $t("global.uploadFilesDateValidation") }}</span>
                  </div>
                </div>
                <div class="col-12">
                  <div class="d-flex flex-column">                   <span class="text-sm"> {{ $t('global.beginningData') }}</span></div>
                </div>
                <div class="col-12 mt-3">
                  <div class="d-flex flex-column"><span class="text-sm font-semibold">{{ $t('global.uploadFileInfo.sizeLimit', { size: maxSpendFileMb }) }}</span><span class="text-sm">{{ $t('global.uploadFileInfo.formats') }}</span><span class="text-sm mt-2">{{ $t('global.uploadFileInfo.splitAdvice', { size: maxSpendFileMb }) }}</span><span class="text-sm">{{ $t('global.uploadFileInfo.oneFileAtATimeLink') }}</span></div>
                </div>
                <div class="col-8 mt-4"><span>{{ $t('home.entityCard.results.comments') }}</span>
                  <textarea class="w-100 border border-gray-300" v-model="message" name="message" :placeholder="$t('global.writeSomeComments')" aria-label="Message" @keyup="checkDate"></textarea>
                </div>
                <div class="col-4 mt-2">
                  <input class="form-control form-control-lg" id="fileInput" type="file" style="display: none" accept=".xls, .xlsx, .csv" @change="addFilesNValidate" @click="inputResetNewSpendFile"/>
                  <div class="mt-2"><span class="upload-files-calculum mt-4" @click="newSpendFile()"><i class="fa-solid fa-upload"></i><span class="text-sm">{{ $t('global.chooseAFile') }}</span></span></div>
                  <div class="d-flex"><span class="text-base">{{ fileName  }}</span></div>
                  <div class="d-flex flex-column"><span class="error text-left errors-days" v-if="errorSize">{{ $t("global.fileTooLargeMb", { size: maxSpendFileMb }) }}</span><span class="error text-left errors-days" v-if="errorMime">{{ $t("global.invalidFileType") }}</span></div>
                </div>
              </div>
            </template>
            <template v-slot:modalButtons>
              <button class="btn outline-secondary-btn font-md" @click="closeModalNReset" style="z-index: 1; width: fit-content"> <span>{{$t('button.cancel')}} </span></button>
              <button class="btn btn-primary font-md" @click="submitForm()" :disabled="setStatusbutton" style="z-index: 1; width: fit-content"> <span>{{ $t('home.homeAllSpendFiles.buttons.selectSpendFile') }}</span></button>
            </template>
          </CalculumModal>
        </div>
      </div>
      <div class="row w-100">
        <div class="flexbox-container" v-if="!showContent && !loadingValidation">
          <div class="w-50 text-center d-flex flex-column center-items"><span class="text-xl font-semibold mb-5">{{  $t('global.invalidInvitationCodeAlert') }}</span></div>
        </div>
        <div class="flexbox-container" v-if="showContent && !loadingValidation">
          <div class="w-50 text-center d-flex flex-column center-items"><span class="text-5xl font-semibold mb-5">{{ $t('home.homeAllSpendFiles.modalTitle') }}</span><span class="text-xl mb-5">{{  $t('welcome.paragraph1') }}</span><span class="text-xl mb-5">{{  $t('global.selectNUploadYourFileInstructions') }}</span>
            <button class="btn btn-primary font-md mt-2" @click="showModalUploadFile = true" style=" width: fit-content"> <span>{{$t('global.selectAndUploadFile')}}                  </span></button>
          </div>
          <div class="row" v-if="spendFileErrorMessage.length > 0">
            <div class="col-12">
              <div class="alert alert-danger"><span>{{ spendFileErrorMessage }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</body>
</template>

<script lang='ts'>
import MenuAdmin from '@/modules/adminBackend/components/MenuAdmin.vue'
import NavbarAdmin from '@/modules/adminBackend/components/NavbarAdmin.vue'
import { reactive, toRefs, onMounted, computed, ref } from 'vue'
import { useSpendFilesStore } from '@/stores/spendFiles'
import { CalculumLoading, CalculumLayout } from '@ada/design-system'
import { fontIcons, images } from '@/resources/assets/assets'
import * as formatData from '@/utils/FormatData'
import * as Routing from '@/services/router/Routing'
import CalculumGrid from '@/modules/components/grid/CalculumGrid.vue'
import router from '@/services/router/index'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import { useCompany, useSpendFile } from '@/composables'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import * as Validator from "@/utils/validators";
import { StringUtils, DateUtils, ObjectUtils } from "@/utils";
import { useI18n } from "vue-i18n";
import { useToast } from 'vue-toastification'
import * as CompanyApi from '@/api/companyApi'
import { ApiResponse } from '@/services/api/response'
import { useUserStore } from '@/stores/user'
import { MAX_SPEND_FILE_BYTES, MAX_SPEND_FILE_MB } from '@/utils/uploadLimits'

export default {
  name: 'AdminBackend',
  components: {
    MenuAdmin,
    NavbarAdmin,
    CalculumLoading,
    CalculumGrid,
    CalculumLayout,
    CalculumTooltipIcon,
    CalculumModal
  },
  props: {
    invitationId: { type: String, required: false, default: '' }
  },
  setup(props: any) {

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const spendFilesStore = useSpendFilesStore();
    const toast = useToast()
    const { companyActiveName } = useCompany();
    const { spendFileVersionActiveName, spendFileVersionActiveIri } = useSpendFile();
    const userStore = useUserStore()

    const companyName = ref('')

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
      userName: string | null,
      email: string | null,
      message: string | null,
      allowedMimeTypes: Array<any>,
      showContent: boolean,
      maxFileSize: number,
      isAValidFile: boolean,
      file: any | null,
      errorSize: boolean,
      errorMime: boolean,
      fileName: string,
      loadingValidation: boolean,
      validationFields: boolean
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
      userName: null,
      email: null,
      message: null,
      allowedMimeTypes: [
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'text/csv', // .csv
        'application/csv'
      ],
      showContent: false,
      maxFileSize: MAX_SPEND_FILE_BYTES,
      isAValidFile: false,
      file: null,
      errorSize: false,
      errorMime: false,
      fileName: '',
      loadingValidation: true,
      validationFields: false
    })


    onMounted(() => {
      if (props.invitationId === '') {
        data.showContent = false
        data.loadingValidation = false
        userStore.setBatchUpdate({
          setUserInvitation: false,
          setUserInvitationId: null
        });
        return
      }

      if (props.invitationId !== '') {
        userStore.setUserInvitationId(props.invitationId);
      }
      validateInvitation()
    })


    function validateInvitation() {

      CompanyApi.validateInvitation(
        userStore.getUserInvitationId
      ).then(async (response: ApiResponse) => {
        if (response.success) {
          data.showContent = true
          userStore.setBatchUpdate({
            setUserInvitation: true,
            setUserInvitationId: props.invitationId
          });
          data.loadingValidation = false
          companyName.value = response.data.companyName

        } else {

          toast.error(response.data);

          userStore.setBatchUpdate({
            setUserInvitation: false,
            setUserInvitationId: null
          });

          data.showContent = false
          data.loadingValidation = false
        }
      }).catch(() => {
        data.showContent = false
        data.loadingValidation = false

      })

    }


    async function addFilesNValidate(event: any) {
      const file = event.target.files[0];
      data.errorMime = false
      data.errorSize = false

      if (!file) return;

      data.fileName = file.name
      const isValid = await ObjectUtils.validateFileType(file, data.allowedMimeTypes);

      if (!isValid) {
        data.isAValidFile = false
        data.errorMime = true
        return
      }

      if (file.size > data.maxFileSize) {
        data.errorSize = true
        data.isAValidFile = false
        return
      }

      //- If is a valida file we set the file to file variable
      data.isAValidFile = true
      data.file = event.target.files[0]
    }

    function submitForm() {


      data.showModalUploadFile = false;
      data.spendFileErrorMessage = '';
      data.loading = true

      CompanyApi.uploadFile(
        data.file,
        import.meta.env.VITE_COMPANY_UUID, //companyUUID
        data.startDateToFile,
        data.endDateToFile,
        data.userName,
        data.email,
        data.message,
        companyName.value, //companyName
        userStore.getUserInvitationId
      ).then(async (response: ApiResponse) => {
        if (response.success) {
          toast.success(translate.t('global.successUploadSpend'));
          data.loading = false
          closeModalNReset()

        } else {
          toast.error(translate.t('global.errorUploadSpend'));
          data.loading = false

        }
      }).catch(() => {
        toast.error(translate.t('global.errorUploadSpend'));
        data.loading = false

      })
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

          data.loadingDownloadFile = null
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



    function checkFields() {
      if (
        (data.userName === null || StringUtils.isNullUndefinedOrEmpty(data.userName)) ||
        (data.email === null || StringUtils.isNullUndefinedOrEmpty(data.email) || !Validator.isValidEmail(data.email))
      ) {
        data.validationFields = false
      } else {

        data.validationFields = true
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
      data.userName = null
      data.email = null
      data.message = null
      data.showModalUploadFile = false
      data.fileName = ''
      data.isAValidFile = false
      data.validationDate = false
      inputResetNewSpendFile()
    }


    const setStatusbutton = computed(() => {
      return !data.isAValidFile || !data.validationDate || !data.validationFields
    })


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
      checkDate,
      closeModalNReset,
      submitForm,
      setStatusbutton,
      Validator,
      checkFields,
      maxSpendFileMb: MAX_SPEND_FILE_MB
    }
  }
}
</script>

<style lang="scss" scoped>
.center-items {
  align-items: center;
}

textarea {
  overflow: auto;
  resize: vertical;
  height: 100px;
}
</style>